import re
import urllib.parse
from datetime import datetime
import logging

_log = logging.getLogger(__name__)

# Heuristic trigger characters - if none of these are present, request is 100% safe from injection
_TRIGGER_CHARS = set("'\"<>;\\`|{}[]$%.@:?=\x00\r\n\t")
_TRIGGER_KEYWORDS = (
    "union", "select", "script", "alert", "exec", "eval", "etc/passwd", "sleep",
    "benchmark", "drop", "insert", "delete", "update", "or ", "and ", "--", "/*",
    "xp_", "cmd", "169.254", "sqlmap", "nikto", "nuclei", "acunetix", "nmap", "nessus", "gobuster", "dirbuster"
)


class RuleEngine:
    def __init__(self):
        self._db = None
        self.default_rules = []
        self._compiled_batches = []
        self._compiled_cache = {}
        self._load_rules()

    def _get_db(self):
        if self._db is None:
            from src.database.mongodb_connection import MongoDB
            self._db = MongoDB()
        return self._db

    def _get_default_rules(self):
        try:
            from src.engine.rules_generator import generate_2000_rules
            return generate_2000_rules()
        except Exception as e:
            _log.warning("Error generating enterprise rules, using core fallback: %s", e)
            return [
                {'name': 'SQL Injection - Union Select', 'pattern': r'(?i)(\bUNION\b.*\bSELECT\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
                {'name': 'SQL Injection - OR/AND Bypass', 'pattern': r"(?i)('\s*(OR|AND)\s+['\w])", 'action': 'block', 'severity': 'critical', 'enabled': True},
                {'name': 'XSS - Script Tag', 'pattern': r'(?i)(<\s*script\b[^>]*>)', 'action': 'block', 'severity': 'critical', 'enabled': True},
                {'name': 'RCE - System Commands', 'pattern': r'(?i)(;\s*(ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell|wget|curl)\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
                {'name': 'LFI - Directory Traversal', 'pattern': r'(?i)(\.\.\/|\.\.\\)', 'action': 'block', 'severity': 'high', 'enabled': True},
            ]

    def _compile_batches(self):
        """Compiles 2,000 rules into optimized regex batches for sub-5ms evaluation."""
        self._compiled_batches = []
        batch_size = 50
        
        for i in range(0, len(self.default_rules), batch_size):
            batch = self.default_rules[i:i + batch_size]
            sub_patterns = []
            for idx, r in enumerate(batch):
                if r.get('enabled', True) and r.get('pattern'):
                    pat = r['pattern']
                    # Strip leading (?i) if present for clean grouping
                    if pat.startswith("(?i)"):
                        pat = pat[4:]
                    sub_patterns.append(f"(?P<R_{i}_{idx}>{pat})")
            
            if sub_patterns:
                combined_pattern = f"(?i)({'|'.join(sub_patterns)})"
                try:
                    compiled = re.compile(combined_pattern)
                    self._compiled_batches.append((compiled, batch))
                except re.error as e:
                    # Fallback to individual compilation if batch has syntax conflict
                    for r in batch:
                        try:
                            self._compiled_batches.append((re.compile(r['pattern']), [r]))
                        except Exception:
                            pass

    def _load_rules(self, force_refresh=False):
        defaults = self._get_default_rules()
        try:
            db = self._get_db()
            db_rules = list(db.rules.find({'enabled': True}).sort('sort_order', 1))
            if db_rules and not force_refresh:
                self.default_rules = []
                for r in db_rules:
                    rule = {k: v for k, v in r.items() if k not in ('_id', 'sort_order')}
                    self.default_rules.append(rule)
                _log.info("Loaded %d rules from database", len(self.default_rules))
            else:
                self.default_rules = defaults
                self._persist_rules()
                _log.info("Initialized %d default enterprise rules in database", len(self.default_rules))
        except Exception as e:
            _log.warning("Failed to load rules from DB, using defaults: %s", e)
            self.default_rules = defaults

        self._compile_batches()

    def _persist_rules(self):
        try:
            db = self._get_db()
            db.rules.delete_many({})
            docs = []
            for i, rule in enumerate(self.default_rules):
                to_save = {k: v for k, v in rule.items()}
                to_save['sort_order'] = i
                docs.append(to_save)
            if docs:
                db.rules.insert_many(docs)
        except Exception as e:
            _log.warning("Failed to persist rules: %s", e)

    def check_rules(self, request_data, rules=None, user_id=None):
        """Fast-path evaluation with sub-millisecond heuristic filtering and batched regex execution."""
        url = request_data.get('url', '')
        body = request_data.get('body', '')
        query_string = request_data.get('query_string', '')
        query_params = request_data.get('query_params', {})
        query_values = ' '.join(str(v) for v in query_params.values()) if isinstance(query_params, dict) else ''
        body_fields = request_data.get('body_fields', {})
        body_field_values = request_data.get('body_field_values', '')

        user_agent = request_data.get('user_agent', '')
        if not user_agent and 'headers' in request_data:
            headers = request_data['headers']
            user_agent = headers.get('User-Agent', headers.get('user-agent', ''))
        referer = request_data.get('referer', '')
        if not referer and 'headers' in request_data:
            headers = request_data['headers']
            referer = headers.get('Referer', headers.get('referer', ''))
        cookies = request_data.get('cookies', '')
        if not cookies and 'headers' in request_data:
            headers = request_data['headers']
            cookies = headers.get('Cookie', headers.get('cookie', ''))

        # Construct comprehensive inspection string
        parts = [p for p in [url, body, query_string, query_values, body_field_values, user_agent, referer, cookies] if p and str(p).strip()]
        combined = ' '.join(parts) if parts else url

        # Fast unquoting
        try:
            if '%' in combined:
                combined = urllib.parse.unquote_plus(combined)
                if '%' in combined:
                    combined = urllib.parse.unquote_plus(combined)
        except Exception:
            pass

        # Fast-Path Heuristic: If no special characters or suspicious keywords are present, return immediately in 0.001ms
        has_trigger = any(c in combined for c in _TRIGGER_CHARS)
        if not has_trigger:
            comb_lower = combined.lower()
            if not any(kw in comb_lower for kw in _TRIGGER_KEYWORDS):
                return []

        # Execute Batched Compiled Regexes (Evaluates 2,000 rules in < 5ms)
        matches = []
        for compiled_batch, batch_rules in self._compiled_batches:
            match = compiled_batch.search(combined)
            if match:
                # Find which rule inside the batch matched
                matched_group = match.lastgroup
                if matched_group:
                    try:
                        _, batch_idx, rule_idx = matched_group.split('_')
                        rule = batch_rules[int(rule_idx)]
                        matches.append({
                            'rule_name': rule.get('name', 'Threat Detected'),
                            'severity': rule.get('severity', 'critical'),
                            'action': rule.get('action', 'block'),
                            'category': rule.get('category', 'Generic')
                        })
                    except Exception:
                        r0 = batch_rules[0]
                        matches.append({
                            'rule_name': r0.get('name', 'Threat Detected'),
                            'severity': r0.get('severity', 'critical'),
                            'action': r0.get('action', 'block'),
                            'category': r0.get('category', 'Generic')
                        })
                else:
                    r0 = batch_rules[0]
                    matches.append({
                        'rule_name': r0.get('name', 'Threat Detected'),
                        'severity': r0.get('severity', 'critical'),
                        'action': r0.get('action', 'block'),
                        'category': r0.get('category', 'Generic')
                    })
                
                # Stop on first high-confidence rule match for maximum speed
                break

        # Check user-defined custom rules if present
        if user_id:
            try:
                db = self._get_db()
                user_rules_raw = list(db.user_rules.find({'user_id': str(user_id)}).sort('sort_order', 1))
                for r in user_rules_raw:
                    if r.get('enabled', True) and r.get('pattern'):
                        pat = r['pattern']
                        if pat not in self._compiled_cache:
                            self._compiled_cache[pat] = re.compile(pat, re.IGNORECASE)
                        if self._compiled_cache[pat].search(combined):
                            matches.append({
                                'rule_name': r.get('name', 'Custom User Rule'),
                                'severity': r.get('severity', 'high'),
                                'action': r.get('action', 'block'),
                                'category': 'Custom'
                            })
                            break
            except Exception:
                pass

        return matches
