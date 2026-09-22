"""MDefender Pro unified security decision engine (WAF 3.0).

Combines independent multi-stage detection signals into a single risk score and decision:
    semantic_score        - AST lexers (SQL, XSS DOM context, SSRF shield, Prompt Injection, RCE)
    rule_score            - deterministic compiled regex rule matches (raw + normalized)
    ml_score              - ML WAF model v2.0 inference probability
    ip_reputation_score   - blacklist / auto-block / cloud reputation status
    rate_limit_score      - request rate against sliding window thresholds
    behavior_score        - heuristic feature extractor signals

Signals are weighted into `risk_score` (0-100) which maps to an actionable decision:
    ALLOW / CHALLENGE / RATE_LIMIT / BLOCK / MONITOR

The engine is deterministic, auditable, and sub-millisecond optimized: every decision
carries contributing components and a safe, non-sensitive `reason` string with full telemetry.
"""

from src.engine.ml_detector import MLDetector
from src.engine.rule_engine import RuleEngine
from src.engine.feature_extractor import FeatureExtractor
from src.engine.request_parser import RequestParser
from src.engine.semantic_analyzer import SemanticAnalyzer
from src.utils.api_response import new_reference_id

WEIGHTS = {
    "semantic": 0.35,
    "rule": 0.30,
    "ml": 0.20,
    "reputation": 0.10,
    "behavior": 0.05,
}

# Decision thresholds (risk score 0-100)
DECISION_THRESHOLDS = [
    (90, "BLOCK"),
    (70, "BLOCK"),
    (50, "CHALLENGE"),
    (30, "MONITOR"),
]


class DecisionEngine:
    def __init__(self, ml_detector=None):
        self.ml_detector = ml_detector or MLDetector()
        self.rule_engine = RuleEngine()
        self.feature_extractor = FeatureExtractor()
        self.request_parser = RequestParser()
        self.semantic_analyzer = SemanticAnalyzer()

    def _risk_level(self, score: int) -> str:
        if score >= 80:
            return "critical"
        if score >= 60:
            return "high"
        if score >= 30:
            return "medium"
        return "low"

    def _component_score(self, score: float) -> int:
        return min(100, max(0, int(round(score * 100))))

    def evaluate(self, request_data, ip=None, is_blacklisted=False, is_rate_limited=False,
                 rate_limited_by=None, allowlist=False, user_id=None, website_id=None,
                 domain=None, threshold_override=None):
        """Evaluate a single request and return a comprehensive decision record."""
        ip = ip or request_data.get("ip", "")
        reference_id = new_reference_id()

        # --- 1. Reputation signal (fast path) ---
        reputation_score = 0.0
        reputation_source = None
        if allowlist:
            reputation_score = 0.0
        elif is_blacklisted:
            reputation_score = 1.0
            reputation_source = "blacklist"
        elif rate_limited_by == "blocked":
            reputation_score = 1.0
            reputation_source = "auto_block"

        # --- 2. Rate limit signal ---
        rate_limit_score = 1.0 if is_rate_limited else 0.0

        # --- 3. Request parsing & Deep normalization ---
        parsed = self.request_parser.parse(request_data)
        
        # --- 4. Semantic AST & Context Analysis (WAF 3.0) ---
        # Analyze raw combined and normalized strings
        text_to_analyze = parsed.get("combined_normalized") or parsed.get("combined_raw", "")
        semantic_res = self.semantic_analyzer.analyze_payload(text_to_analyze)
        semantic_score = float(semantic_res.get("highest_score", 0.0))

        # --- 5. Rule engine matching (raw + normalized variants) ---
        rule_matches = self.rule_engine.check_rules(parsed, user_id=user_id)
        rule_score = 1.0 if rule_matches else 0.0

        # --- 6. ML signal (WAF Model v2.0) ---
        raw_text = self.feature_extractor.extract_text(parsed)
        ml_result = self.ml_detector.detect(raw_text)
        ml_score = ml_result.get("probability", 0.0)

        # --- 7. Behavior (heuristic features) ---
        features = self.feature_extractor.extract_features(parsed)
        behavior_score = float(features.get("total_attack_score", 0.0))

        # --- 8. Weighted composite risk score ---
        composite_risk = (
            semantic_score * WEIGHTS["semantic"]
            + rule_score * WEIGHTS["rule"]
            + ml_score * WEIGHTS["ml"]
            + reputation_score * WEIGHTS["reputation"]
            + behavior_score * WEIGHTS["behavior"]
        )

        # Immediate escalation if critical semantic threat, rule match, or reputation match
        if semantic_score >= 0.90 or rule_score >= 1.0 or reputation_score >= 1.0:
            composite_risk = max(composite_risk, semantic_score, 0.95)

        risk_score = min(100, max(0, int(round(composite_risk * 100))))

        def _rule_name(m):
            if isinstance(m, dict):
                return m.get("rule_name") or m.get("name") or "Security Rule"
            return str(m) if m else "Security Rule"

        first_rule_name = _rule_name(rule_matches[0]) if rule_matches else None
        first_semantic_reason = semantic_res["reasons"][0] if semantic_res["reasons"] else None
        primary_threat = (
            semantic_res["threat_categories"][0] if semantic_res["threat_categories"]
            else (first_rule_name or ml_result.get("category"))
        )

        # --- 9. Decision Evaluation ---
        url_path = parsed.get("path", "").lower()
        is_auth_path = any(x in url_path for x in ['login', 'register', 'auth', 'signin', 'signup', 'logout', 'wp-admin', 'admin-ajax'])
        is_wp_admin_path = any(x in url_path for x in ['wp-login.php', 'wp-admin', 'admin-ajax.php'])

        decision = "ALLOW"
        if reputation_score >= 1.0:
            decision = "BLOCK"
            confidence = 1.0
            reason = "IP blocked by security policy"
        elif semantic_score >= 0.90:
            decision = "BLOCK"
            confidence = max(0.98, semantic_score)
            reason = f"Semantic threat detected: {first_semantic_reason or primary_threat}"
        elif is_wp_admin_path and semantic_score < 0.85:
            # Always whitelist legitimate WordPress login and admin dashboard visits
            decision = "ALLOW"
            confidence = 0.05
            reason = "WordPress login/admin path allowed"
        elif rule_score >= 1.0:
            decision = "BLOCK"
            confidence = max(0.95, ml_score)
            reason = f"Security rule matched: {first_rule_name}"
        elif ml_score >= 0.95 and risk_score >= 50 and not is_auth_path:
            decision = "BLOCK"
            confidence = ml_score
            reason = f"ML WAF detected {ml_result.get('category') or 'malicious'} request"
        elif risk_score >= 70 and not is_auth_path:
            decision = "BLOCK"
            confidence = max(ml_score, 0.75)
            reason = "Combined risk score exceeded block threshold"
        elif risk_score >= 50:
            decision = "CHALLENGE"
            confidence = max(ml_score, 0.6)
            reason = "Elevated risk - verification required"
        elif is_rate_limited:
            decision = "RATE_LIMIT"
            confidence = 0.9
            reason = "Request rate exceeded configured limit"
        elif risk_score >= 30:
            decision = "MONITOR"
            confidence = ml_score
            reason = "Elevated risk - request monitored"
        else:
            decision = "ALLOW"
            confidence = round(1.0 - max(ml_score, semantic_score), 4)
            reason = "Request appears safe"

        # If caller overrides (e.g., monitor mode from SDK), downgrade BLOCK
        if threshold_override and decision == "BLOCK":
            decision = "ALLOW"

        return {
            "decision": decision,
            "action": decision.lower(),
            "risk_score": risk_score,
            "risk_level": self._risk_level(risk_score),
            "confidence": round(confidence, 4),
            "reason": reason,
            "reference_id": reference_id,
            "components": {
                "semantic_score": self._component_score(semantic_score),
                "rule_score": self._component_score(rule_score),
                "ml_score": self._component_score(ml_score),
                "reputation_score": self._component_score(reputation_score),
                "rate_limit_score": self._component_score(rate_limit_score),
                "behavior_score": self._component_score(behavior_score),
            },
            "signals": {
                "semantic_threats": semantic_res["threat_categories"],
                "semantic_reasons": semantic_res["reasons"][:5],
                "rule_matches": [_rule_name(m) for m in rule_matches][:5],
                "ml_category": ml_result.get("category"),
                "ml_probability": round(ml_score, 4),
                "ml_model_version": ml_result.get("model_version"),
                "reputation_source": reputation_source,
            },
            "attack_type": primary_threat,
            "ml_model_version": ml_result.get("model_version"),
        }
