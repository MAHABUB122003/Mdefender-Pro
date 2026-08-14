"""MDefender Pro unified security decision engine.

Combines independent detection signals into a single risk score and decision:

    rule_score            - deterministic rule engine matches
    ml_score              - ML WAF model probability
    ip_reputation_score   - blacklist / auto-block status
    rate_limit_score      - request rate against thresholds
    behavior_score        - heuristic feature extractor signals

Signals are weighted into `risk_score` (0-100) which maps to a decision:
    ALLOW / CHALLENGE / RATE_LIMIT / BLOCK

The engine is deliberate and auditable: every decision carries the
contributing components and a safe, non-sensitive `reason` string. Internal
scores are NEVER echoed to blocked clients by the block page - only the
reference ID and a generic reason.
"""

from src.engine.ml_detector import MLDetector
from src.engine.rule_engine import RuleEngine
from src.engine.feature_extractor import FeatureExtractor
from src.engine.request_parser import RequestParser
from src.utils.api_response import new_reference_id

WEIGHTS = {
    "rule": 0.40,
    "ml": 0.35,
    "reputation": 0.10,
    "behavior": 0.15,
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

    def _risk_level(self, score):
        if score >= 80:
            return "critical"
        if score >= 60:
            return "high"
        if score >= 30:
            return "medium"
        return "low"

    def _component_score(self, score):
        return min(100, max(0, int(round(score * 100))))

    def evaluate(self, request_data, ip=None, is_blacklisted=False, is_rate_limited=False,
                 rate_limited_by=None, allowlist=False, user_id=None, website_id=None,
                 domain=None, threshold_override=None):
        """Evaluate a single request and return a full decision record."""
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

        # --- 3. Parse + rule engine ---
        parsed = self.request_parser.parse(request_data)
        rule_matches = self.rule_engine.check_rules(parsed)
        rule_score = 1.0 if rule_matches else 0.0

        # --- 4. ML signal ---
        raw_text = self.feature_extractor.extract_text(parsed)
        ml_result = self.ml_detector.detect(raw_text)
        ml_score = ml_result.get("probability", 0.0)

        # --- 5. Behavior (heuristic features) ---
        features = self.feature_extractor.extract_features(parsed)
        behavior_score = float(features.get("total_attack_score", 0.0))

        # --- 6. Weighted composite risk score ---
        risk_score = (
            rule_score * WEIGHTS["rule"]
            + ml_score * WEIGHTS["ml"]
            + reputation_score * WEIGHTS["reputation"]
            + behavior_score * WEIGHTS["behavior"]
        )
        risk_score = min(100, max(0, int(round(risk_score * 100))))

        # --- 7. Decision ---
        decision = "ALLOW"
        if reputation_score >= 1.0:
            decision = "BLOCK"
            confidence = 1.0
            reason = "IP blocked by security policy"
        elif rule_score >= 1.0:
            decision = "BLOCK"
            confidence = max(0.95, ml_score)
            reason = f"Security rule matched: {rule_matches[0]['rule_name']}"
        elif ml_score >= 0.85:
            decision = "BLOCK"
            confidence = ml_score
            reason = f"ML WAF detected {ml_result.get('category') or 'malicious'} request"
        elif risk_score >= 70:
            decision = "BLOCK"
            confidence = max(ml_score, 0.7)
            reason = "Combined risk score exceeded block threshold"
        elif risk_score >= 50:
            decision = "CHALLENGE"
            confidence = ml_score
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
            confidence = 1 - ml_score
            reason = "Request appears safe"

        # If caller overrides (e.g., monitor mode from SDK), downgrade BLOCK.
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
                "rule_score": self._component_score(rule_score),
                "ml_score": self._component_score(ml_score),
                "reputation_score": self._component_score(reputation_score),
                "rate_limit_score": self._component_score(rate_limit_score),
                "behavior_score": self._component_score(behavior_score),
            },
            "signals": {
                "rule_matches": [m["rule_name"] for m in rule_matches][:5],
                "ml_category": ml_result.get("category"),
                "ml_probability": round(ml_score, 4),
                "ml_model_version": ml_result.get("model_version"),
                "reputation_source": reputation_source,
            },
            "attack_type": (rule_matches[0]["rule_name"] if rule_matches else None)
                          or ml_result.get("category"),
            "ml_model_version": ml_result.get("model_version"),
        }
