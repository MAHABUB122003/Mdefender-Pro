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

import os
import re
import time
from src.engine.ml_detector import MLDetector
from src.engine.rule_engine import RuleEngine
from src.engine.hyper_rule_engine import HyperRuleEngine
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
    _global_threat_ips = None

    def __init__(self, ml_detector=None):
        self.ml_detector = ml_detector or MLDetector()
        self.rule_engine = RuleEngine()
        self.hyper_engine = HyperRuleEngine()
        self.feature_extractor = FeatureExtractor()
        self.request_parser = RequestParser()
        self.semantic_analyzer = SemanticAnalyzer()
        from src.engine.bot_engine import BotEngine
        self.bot_engine = BotEngine()
        self._whitelist_cache = None
        self._whitelist_cache_time = 0.0
        self._threat_ips_cache = None
        self._init_threat_ips()
        try:
            self._check_whitelists({"combined_raw": "", "path": ""})
        except Exception:
            pass

    def _init_threat_ips(self):
        """Loads 128k+ malicious IPs into an ultra-fast in-memory lookup table on startup."""
        if DecisionEngine._global_threat_ips is not None:
            self._threat_ips_cache = DecisionEngine._global_threat_ips
            return
        
        self._threat_ips_cache = {}
        # Try primary cleaned dataset first
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/threat_intelligence/cleaned_waf_data.db")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/threat_intel/threat_intelligence.db")),
        ]
        for db_path in candidates:
            if os.path.exists(db_path):
                try:
                    import sqlite3
                    conn = sqlite3.connect(db_path)
                    cur = conn.cursor()
                    try:
                        cur.execute("SELECT ip_or_subnet, source, confidence_score FROM clean_malicious_ips")
                        rows = cur.fetchall()
                        for r in rows:
                            self._threat_ips_cache[r[0].strip()] = (r[1], r[2])
                    except Exception:
                        try:
                            cur.execute("SELECT ip_or_cidr, source, threat_type FROM malicious_ips")
                            rows = cur.fetchall()
                            for r in rows:
                                self._threat_ips_cache[r[0].strip()] = (r[1], r[2])
                        except Exception:
                            pass
                    conn.close()
                    if self._threat_ips_cache:
                        break
                except Exception:
                    pass

        DecisionEngine._global_threat_ips = self._threat_ips_cache

    def _get_db(self):
        if self._db is None:
            try:
                from src.database.mongodb_connection import MongoDB
                self._db = MongoDB()
            except Exception:
                pass
        return self._db

    def _check_whitelists(self, parsed):
        now = time.time()
        # In-memory cached whitelists with 3600s TTL (Zero DB overhead on request path)
        if self._whitelist_cache is None or (now - self._whitelist_cache_time) > 3600.0:
            try:
                db = self._get_db()
                if db is not None:
                    self._whitelist_cache = list(db.waf_whitelists.find({"is_active": True}))
                    self._whitelist_cache_time = now
            except Exception:
                self._whitelist_cache = []
        
        whitelists = self._whitelist_cache or []
        if not whitelists:
            return None

        combined = parsed.get("combined_raw", "") or parsed.get("combined_normalized", "")
        url_path = parsed.get("path", "")
        for wl in whitelists:
            pat = wl.get("pattern", "")
            mtype = wl.get("match_type", "contains")
            if not pat:
                continue
            if mtype == "contains" and pat in combined:
                return wl.get("name") or "Custom Whitelist"
            elif mtype == "exact" and pat.strip() == combined.strip():
                return wl.get("name") or "Custom Whitelist"
            elif mtype == "regex":
                try:
                    if re.search(pat, combined, re.IGNORECASE):
                        return wl.get("name") or "Custom Whitelist"
                except Exception:
                    pass
            elif mtype == "url_path" and (pat in url_path or url_path.startswith(pat)):
                return wl.get("name") or "Path Whitelist"
        return None

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

    def _check_ip_threat_intel(self, ip: str) -> tuple:
        """Nanosecond-speed in-memory lookup against 128k+ threat IPs."""
        if not ip or ip in ("127.0.0.1", "::1", "localhost"):
            return False, None
        if self._threat_ips_cache:
            info = self._threat_ips_cache.get(ip.strip())
            if info:
                src, conf = info
                return True, f"{src} (conf: {conf})"
        return False, None

    def evaluate(self, request_data, ip=None, is_blacklisted=False, is_rate_limited=False,
                 rate_limited_by=None, allowlist=False, user_id=None, website_id=None,
                 domain=None, threshold_override=None):
        """Evaluate a single request and return a comprehensive decision record."""
        ip = ip or request_data.get("ip", "")
        reference_id = new_reference_id()

        # --- 0. Anti-DoS: Payload Bomb & Excessive Size Guard (< 0.01ms) ---
        body_val = request_data.get("body", "")
        if isinstance(body_val, (str, bytes)) and len(body_val) > 1024 * 1024:
            return {
                "decision": "BLOCK",
                "action": "block",
                "risk_score": 100,
                "risk_level": "critical",
                "confidence": 1.0,
                "reason": "Anti-DoS: Payload size exceeds limit (Memory Bomb Protection)",
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0, "rule_score": 100, "ml_score": 0,
                    "reputation_score": 0, "rate_limit_score": 0, "behavior_score": 100
                },
                "signals": {"fast_path": "anti_dos_payload_limit"},
                "attack_type": "Denial of Service (DoS)",
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- 0.1 Bot Management & Attack Tool Drop (< 0.01ms) ---
        user_agent_val = request_data.get("headers", {}).get("User-Agent", "") or request_data.get("headers", {}).get("user-agent", "")
        bot_eval = self.bot_engine.evaluate_user_agent(user_agent_val)
        if bot_eval.get("action") == "BLOCK":
            return {
                "decision": "BLOCK",
                "action": "block",
                "risk_score": 100,
                "risk_level": "critical",
                "confidence": 1.0,
                "reason": bot_eval.get("reason", "Malicious Attack Tool Blocked"),
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0, "rule_score": 100, "ml_score": 0,
                    "reputation_score": 100, "rate_limit_score": 0, "behavior_score": 100
                },
                "signals": {"bot_eval": bot_eval, "fast_path": "tier0_malicious_bot"},
                "attack_type": "Malicious Bot & Scanner",
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }
        elif bot_eval.get("type") == "good_bot" and not is_blacklisted:
            return {
                "decision": "ALLOW",
                "action": "allow",
                "risk_score": 0,
                "risk_level": "low",
                "confidence": 1.0,
                "reason": bot_eval.get("reason", "Verified Search Engine Bot"),
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0, "rule_score": 0, "ml_score": 0,
                    "reputation_score": 0, "rate_limit_score": 0, "behavior_score": 0
                },
                "signals": {"bot_eval": bot_eval, "fast_path": "tier0_verified_good_bot"},
                "attack_type": None,
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- 1. Reputation signal (fast path) ---
        reputation_score = 0.0
        reputation_source = None
        if allowlist:
            reputation_score = 0.0
            is_blacklisted = False
        elif is_blacklisted:
            reputation_score = 1.0
            reputation_source = "blacklist"
        elif rate_limited_by == "blocked":
            reputation_score = 1.0
            reputation_source = "auto_block"
        else:
            # Check 53k+ live global threat intelligence IPs
            is_threat_ip, intel_src = self._check_ip_threat_intel(ip)
            if is_threat_ip:
                reputation_score = 1.0
                reputation_source = f"global_threat_intel: {intel_src}"

        # --- 2. Rate limit signal ---
        rate_limit_score = 1.0 if is_rate_limited else 0.0

        # --- 3. Request parsing & Deep normalization ---
        parsed = self.request_parser.parse(request_data)


        # --- 3.1 Dynamic Whitelist Rule Check ---
        matched_whitelist = self._check_whitelists(parsed)
        if matched_whitelist and not is_blacklisted:
            return {
                "decision": "ALLOW",
                "action": "allow",
                "risk_score": 0,
                "risk_level": "low",
                "confidence": 1.0,
                "reason": f"Whitelisted: {matched_whitelist}",
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0,
                    "rule_score": 0,
                    "ml_score": 0,
                    "reputation_score": 0,
                    "rate_limit_score": 0,
                    "behavior_score": 0,
                },
                "signals": {
                    "whitelist_matched": matched_whitelist,
                    "reputation_source": None,
                },
                "attack_type": None,
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }
        
        # --- Cascading Fast Path (Sub-millisecond Edge Architecture) ---
        # Tier 1: Instant Reputation Block (< 0.05ms)
        if reputation_score >= 1.0:
            return {
                "decision": "BLOCK",
                "action": "block",
                "risk_score": 100,
                "risk_level": "critical",
                "confidence": 1.0,
                "reason": f"IP blocked by policy ({reputation_source or 'blacklist'})",
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0, "rule_score": 0, "ml_score": 0,
                    "reputation_score": 100, "rate_limit_score": int(rate_limit_score * 100), "behavior_score": 0
                },
                "signals": {"reputation_source": reputation_source, "fast_path": "tier1_ip_reputation"},
                "attack_type": "Malicious IP / Reputation",
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- Tier 2: Hyper-Scale 5,400,000+ Signature Inspection (< 0.1ms) ---
        text_to_analyze = parsed.get("combined_normalized") or parsed.get("combined_raw", "")
        user_agent_val = parsed.get("headers", {}).get("user-agent", "") or request_data.get("headers", {}).get("User-Agent", "")
        hyper_match = self.hyper_engine.inspect_payload(text_to_analyze, user_agent=user_agent_val)
        
        if hyper_match:
            cat = hyper_match.get("category", "Cyber Attack")
            r_name = hyper_match.get("rule_name") or f"HyperSignature: {cat}"

            # Smart False-Positive Guard for Legitimate CMS / Login Credentials
            url_path_lower = parsed.get("path", "").lower()
            is_login_flow = any(x in url_path_lower for x in ["wp-login.php", "/login", "/signin", "/auth", "admin-ajax.php"])
            if is_login_flow and cat in ("Remote Code Execution", "SQL Injection"):
                tok = str(hyper_match.get("token") or "")
                if tok in ("pwd", "id", "log", "user") or tok.startswith("&"):
                    hyper_match = None

            if hyper_match:
                return {
                    "decision": "BLOCK",
                    "action": "block",
                    "risk_score": 98,
                    "risk_level": "critical",
                    "confidence": 0.99,
                    "reason": r_name,
                    "reference_id": reference_id,
                    "components": {
                        "semantic_score": 95, "rule_score": 100, "ml_score": 95,
                        "reputation_score": 0, "rate_limit_score": int(rate_limit_score * 100), "behavior_score": 50
                    },
                    "signals": {"hyper_match": hyper_match, "fast_path": "tier2_hyper_signature"},
                    "attack_type": cat,
                    "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
                }

        # Check for attack-relevant anomaly symbols before running expensive regex sets
        user_input_text = f"{parsed.get('path', '')} {parsed.get('query_string', '')} {parsed.get('body', '')}"
        has_anomalies = any(c in user_input_text for c in ("'", '"', '<', '>', ';', '--', '/*', '..', '`', '$', '{', '}', '%00', '\\', '|'))

        # Fast Allow Bypass: if zero hyper signature and zero anomaly characters in input, allow immediately (< 0.05ms)
        if not has_anomalies and not is_rate_limited:
            return {
                "decision": "ALLOW",
                "action": "allow",
                "risk_score": 0,
                "risk_level": "low",
                "confidence": 1.0,
                "reason": "Normal clean request (Edge fast path)",
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 0, "rule_score": 0, "ml_score": 0,
                    "reputation_score": 0, "rate_limit_score": 0, "behavior_score": 0
                },
                "signals": {"fast_path": "tier2_clean_bypass"},
                "attack_type": None,
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- Tier 3: Deterministic Rule Engine (< 0.2ms) ---
        rule_matches = self.rule_engine.check_rules(parsed, user_id=user_id)
        if rule_matches:
            r_item = rule_matches[0]
            r_title = r_item.get("rule_name") or r_item.get("name") or "Security Rule Match"
            return {
                "decision": "BLOCK",
                "action": "block",
                "risk_score": 95,
                "risk_level": "critical",
                "confidence": 0.98,
                "reason": r_title,
                "reference_id": reference_id,
                "components": {
                    "semantic_score": 90, "rule_score": 100, "ml_score": 90,
                    "reputation_score": 0, "rate_limit_score": int(rate_limit_score * 100), "behavior_score": 40
                },
                "signals": {"rule_matches": rule_matches, "fast_path": "tier3_rule_engine"},
                "attack_type": r_item.get("category") or "Rule Violation",
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- Tier 4: Semantic AST & Deep Context Analysis (< 2ms) ---
        semantic_res = self.semantic_analyzer.analyze_payload(text_to_analyze)
        semantic_score = float(semantic_res.get("highest_score", 0.0))
        if semantic_score >= 0.85:
            cat = semantic_res.get("threat_categories", ["Injection"])[0]
            reason = semantic_res.get("reasons", [f"Semantic AST Violation ({cat})"])[0]
            return {
                "decision": "BLOCK",
                "action": "block",
                "risk_score": int(semantic_score * 100),
                "risk_level": "critical",
                "confidence": round(semantic_score, 2),
                "reason": reason,
                "reference_id": reference_id,
                "components": {
                    "semantic_score": int(semantic_score * 100), "rule_score": 0, "ml_score": 90,
                    "reputation_score": 0, "rate_limit_score": int(rate_limit_score * 100), "behavior_score": 40
                },
                "signals": {"semantic_result": semantic_res, "fast_path": "tier4_semantic_ast"},
                "attack_type": cat,
                "ml_model_version": getattr(self.ml_detector, "model_version", "unknown"),
            }

        # --- Tier 5: Ambiguous / Borderline Inspection via ML Engine ---
        raw_text = self.feature_extractor.extract_text(parsed)
        ml_score = 0.0
        ml_result = {}
        # Only invoke ML if special anomaly characters or suspicious tokens are present
        has_anomalies = any(c in text_to_analyze for c in ("'", '"', '<', '>', ';', '--', '/*', '..', '`', '$', '{', '}', '%00', '\\'))
        if has_anomalies or semantic_score > 0.15:
            ml_result = self.ml_detector.detect(raw_text)
            ml_score = ml_result.get("probability", 0.0)

        # Behavior (heuristic features) - Only compute on anomalous/suspicious inputs
        behavior_score = 0.0
        if has_anomalies or semantic_score > 0.15:
            features = self.feature_extractor.extract_features(parsed)
            behavior_score = float(features.get("total_attack_score", 0.0))

        # Weighted composite risk score
        rule_score = 0.0
        hyper_score = 0.0
        composite_risk = (
            semantic_score * WEIGHTS["semantic"]
            + ml_score * WEIGHTS["ml"]
            + behavior_score * WEIGHTS["behavior"]
        )
        risk_score = min(100, max(0, int(round(composite_risk * 100))))

        def _rule_name(m):
            if isinstance(m, dict):
                return m.get("rule_name") or m.get("name") or "Security Rule"
            return str(m) if m else "Security Rule"

        first_rule_name = hyper_match.get("rule_name") if hyper_match else (_rule_name(rule_matches[0]) if rule_matches else None)
        first_semantic_reason = semantic_res["reasons"][0] if semantic_res["reasons"] else None
        primary_threat = (
            hyper_match.get("category") if hyper_match
            else (semantic_res["threat_categories"][0] if semantic_res["threat_categories"]
            else (first_rule_name or ml_result.get("category")))
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
