"""MDefender Pro malware signature detector.

Uses Dataset B ("Malware scaning datasets/signatures"):
  - regex patterns from rules.json (11 mined patterns)
  - file hashes from rules.json/hashes.csv (127,876 SHA-256/SHA-1/MD5)

Signatures provide a deterministic first layer of detection. The ML model
(run separately) provides the probabilistic layer. Together they feed the
risk scoring in the malware scan pipeline.

The signature directory is configurable (env MALWARE_SIGNATURE_DIR) with a
repo-relative fallback. Loading is lazy and cached.
"""

import hashlib
import json
import os
import re
import threading

DATASET_SIGNATURE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../Malware scaning datasets/signatures")
)


class SignatureDetector:
    def __init__(self, signature_dir=None):
        self.signature_dir = signature_dir or os.getenv("MALWARE_SIGNATURE_DIR", DATASET_SIGNATURE_DIR)
        self._patterns = None
        self._hashes = None
        self._lock = threading.Lock()
        self.load_error = None

    def _rules_path(self):
        return os.path.join(self.signature_dir, "rules.json")

    def _hashes_csv_path(self):
        return os.path.join(self.signature_dir, "hashes.csv")

    @property
    def configured(self):
        return os.path.exists(self._rules_path())

    def get_status(self):
        hashes = 0
        if self._hashes is not None:
            hashes = sum(len(hs) for hs in self._hashes)
        return {
            "configured": self.configured,
            "directory": self.signature_dir if self.configured else None,
            "patterns_loaded": len(self._patterns) if self._patterns is not None else 0,
            "hashes_loaded": hashes,
            "load_error": self.load_error,
        }

    BUILTIN_PATTERNS = [
        {"id": "builtin_eval_b64", "name": "Dynamic Base64 Eval Execution", "pattern": r"\beval\s*\(\s*(?:base64_decode|gzinflate|gzuncompress|gzdecode|str_rot13|hex2bin|pack)\s*\("},
        {"id": "builtin_assert_b64", "name": "Assert Dynamic Code Execution", "pattern": r"\bassert\s*\(\s*(?:base64_decode|gzinflate|str_rot13|hex2bin|\$_POST|\$_GET|\$_REQUEST|\$_COOKIE)\b"},
        {"id": "builtin_preg_replace_e", "name": "Preg_replace /e Code Injection", "pattern": r"\bpreg_replace\s*\(\s*['\"][^'\"]*\/e['\"]"},
        {"id": "builtin_create_function", "name": "Anonymous create_function Code Injection", "pattern": r"\bcreate_function\s*\([^,]+,\s*(?:base64_decode|\$_POST|\$_GET|\$_REQUEST)"},
        {"id": "builtin_webshell_markers", "name": "Known Web Shell Signature (c99/r57/wso/b374k/Godzilla/Behinder/Weevely)", "pattern": r"\b(?:c99sh|r57shell|WSO_VERSION|FilesMan|b374k|weevely|Godzilla|Behinder|China\s+Chopper|AntSword|IndoXploit|ALFA_DATA|ALFA\s+TEAM)\b"},
        {"id": "builtin_tainted_exec", "name": "Direct User-Input Command Execution", "pattern": r"\b(?:system|shell_exec|exec|passthru|popen|proc_open|pcntl_exec)\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE|SERVER)\s*\["},
        {"id": "builtin_dropper", "name": "Remote Script Dropper to Uploads/Core", "pattern": r"(?:file_get_contents|curl_exec|wp_remote_get)\s*\([^)]*https?://[\s\S]*?file_put_contents\s*\([^)]*\.php|file_put_contents\s*\([^)]*\.php[\s\S]*?(?:file_get_contents|curl_exec)\s*\([^)]*https?://"},
        {"id": "builtin_backdoor_user", "name": "Unauthorized Admin User Creation Backdoor", "pattern": r"(?:wp_create_user|wp_insert_user)\s*\([^)]*administrator[\s\S]*?add_role\s*\([^)]*administrator|wp_set_current_user\s*\(\s*1\s*\)[\s\S]*?wp_set_auth_cookie"},
        {"id": "builtin_crypto_miner", "name": "JavaScript Crypto Miner (CoinHive/XMRig/WebAssembly)", "pattern": r"(?:coinhive\.min\.js|cryptoloot|CoinImp|mineralt|webminepool|cryptonight|Wasm\.instantiate.*miner)"},
        {"id": "builtin_spam_injection", "name": "SEO Blackhat Spam & Malicious Redirect Injector", "pattern": r"(?:preg_replace\s*\(\s*['\"].*['\"]\s*,\s*['\"].*['\"]\s*,\s*\$_(?:POST|GET)\)|add_action\s*\(\s*['\"]wp_head['\"]\s*,\s*['\"].*eval.*['\"]\))"},
        {"id": "builtin_polyglot_shell", "name": "Polyglot Image Header with PHP Injection", "pattern": r"^(?:GIF89a|GIF87a|\xFF\xD8\xFF|\x89PNG)[\s\S]{0,100}<\?(?:php|=)"},
        {"id": "builtin_variable_func", "name": "Dynamic Variable Function Execution Trap", "pattern": r"\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\(\s*\$_(?:POST|GET|REQUEST|COOKIE)\s*\["},
    ]

    def _load_patterns(self):
        if self._patterns is not None:
            return self._patterns
        with self._lock:
            if self._patterns is not None:
                return self._patterns
            loaded = list(self.BUILTIN_PATTERNS)
            path = self._rules_path()
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="replace") as f:
                        data = json.load(f)
                    for rule in data.get("patterns", []):
                        pattern = rule.get("pattern")
                        if not pattern:
                            continue
                        try:
                            re.compile(pattern)
                        except re.error:
                            continue
                        loaded.append({
                            "id": rule.get("id"),
                            "name": rule.get("name", rule.get("id")),
                            "pattern": pattern,
                            "confidence": rule.get("confidence", "medium"),
                            "coverage_samples": rule.get("coverage_samples", 0),
                        })
                except Exception as e:
                    self.load_error = f"patterns: {e}"
            self._patterns = loaded
            return self._patterns

    def _load_hashes(self):
        if self._hashes is not None:
            return self._hashes
        with self._lock:
            if self._hashes is not None:
                return self._hashes
            sha_set = set()
            sha1_set = set()
            md5_set = set()
            path = self._hashes_csv_path()
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="replace") as f:
                        next(f, None)
                        for line in f:
                            parts = line.split(",")
                            if len(parts) >= 3:
                                if len(parts[0]) == 64:
                                    sha_set.add(parts[0].lower())
                                if len(parts[1]) == 40:
                                    sha1_set.add(parts[1].lower())
                                if len(parts[2]) == 32:
                                    md5_set.add(parts[2].lower())
                except Exception as e:
                    self.load_error = f"hashes: {e}"
            # Also load hashes from WordPress malware scanner dataset database if present
            db_dataset_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../wordpress malware scner datasets/database/dataset.db")
            )
            if os.path.exists(db_dataset_path):
                try:
                    import sqlite3
                    conn = sqlite3.connect(db_dataset_path)
                    cur = conn.cursor()
                    cur.execute("SELECT sha256, sha1, md5 FROM samples WHERE label != 'benign'")
                    for row in cur.fetchall():
                        if row[0] and len(row[0]) == 64:
                            sha_set.add(row[0].lower())
                        if row[1] and len(row[1]) == 40:
                            sha1_set.add(row[1].lower())
                        if row[2] and len(row[2]) == 32:
                            md5_set.add(row[2].lower())
                    conn.close()
                except Exception:
                    pass

            # Load hashes from central threat_intelligence.db
            threat_intel_db = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../data/threat_intel/threat_intelligence.db")
            )
            if os.path.exists(threat_intel_db):
                try:
                    import sqlite3
                    conn = sqlite3.connect(threat_intel_db)
                    cur = conn.cursor()
                    cur.execute("SELECT hash_value, hash_type FROM malware_hashes")
                    for h_val, h_type in cur.fetchall():
                        if not h_val:
                            continue
                        h_lower = h_val.lower().strip()
                        if h_type == "sha256" or len(h_lower) == 64:
                            sha_set.add(h_lower)
                        elif h_type == "sha1" or len(h_lower) == 40:
                            sha1_set.add(h_lower)
                        elif h_type == "md5" or len(h_lower) == 32:
                            md5_set.add(h_lower)
                    conn.close()
                except Exception:
                    pass

            self._hashes = (sha_set, sha1_set, md5_set)
            return self._hashes

    def is_whitelisted(self, content: bytes) -> bool:
        """Check if file hash is an official clean WordPress core/plugin checksum."""
        md5_val = hashlib.md5(content).hexdigest().lower()
        threat_intel_db = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../data/threat_intel/threat_intelligence.db")
        )
        if os.path.exists(threat_intel_db):
            try:
                import sqlite3
                conn = sqlite3.connect(threat_intel_db)
                cur = conn.cursor()
                cur.execute("SELECT 1 FROM clean_whitelist_hashes WHERE hash_value = ? LIMIT 1", (md5_val,))
                res = cur.fetchone()
                conn.close()
                return res is not None
            except Exception:
                pass
        return False


    def check_patterns(self, content: bytes):
        """Return list of matched pattern rule names (case-insensitive scan of raw text)."""
        patterns = self._load_patterns()
        if not patterns:
            return []
        try:
            text = content[:2 * 1024 * 1024].decode("utf-8", errors="replace")
        except Exception:
            text = ""
        matches = []
        for rule in patterns:
            try:
                if re.search(rule["pattern"], text, re.IGNORECASE):
                    matches.append(rule["name"])
            except re.error:
                continue
        return matches

    def check_hashes(self, content: bytes):
        """Return matching hash categories if the file hash is known malicious."""
        sha_set, sha1_set, md5_set = self._load_hashes()
        if not (sha_set or sha1_set or md5_set):
            return []
        sha256 = hashlib.sha256(content).hexdigest()
        sha1 = hashlib.sha1(content).hexdigest()
        md5 = hashlib.md5(content).hexdigest()
        if sha256 in sha_set:
            return ["known_malicious_hash"]
        if sha1 in sha1_set:
            return ["known_malicious_sha1"]
        if md5 in md5_set:
            return ["known_malicious_md5"]
        return []

    def detect(self, content: bytes):
        """Combined signature verdict. Returns dict or None if no signature matched."""
        pattern_matches = self.check_patterns(content)
        hash_matches = self.check_hashes(content)
        if not pattern_matches and not hash_matches:
            return None
        reasons = [f"signature match: {m}" for m in pattern_matches] + list(hash_matches)
        return {
            "matched": True,
            "pattern_matches": pattern_matches,
            "hash_matches": hash_matches,
            "reasons": reasons,
            "signature_verdict": "malicious",
        }
