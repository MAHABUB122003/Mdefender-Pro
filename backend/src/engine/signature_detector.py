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
        {"id": "builtin_webshell_markers", "name": "Known Web Shell Signature (c99/r57/wso/b374k/Godzilla/Behinder/Weevely/Alfa/FilesMan)", "pattern": r"\b(?:c99sh|r57shell|WSO_VERSION|FilesMan|b374k|weevely|Godzilla|Behinder|China\s+Chopper|AntSword|IndoXploit|ALFA_DATA|ALFA\s+TEAM|p3rl|Ani-Shell|SimAttacker|G-Force|c100|IronShell)\b"},
        {"id": "builtin_tainted_exec", "name": "Direct User-Input Command Execution", "pattern": r"\b(?:system|shell_exec|exec|passthru|popen|proc_open|pcntl_exec)\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE|SERVER)\s*\["},
        {"id": "builtin_dropper", "name": "Remote Script Dropper to Uploads/Core", "pattern": r"(?:file_get_contents|curl_exec|wp_remote_get)\s*\([^)]*https?://[\s\S]*?file_put_contents\s*\([^)]*\.php|file_put_contents\s*\([^)]*\.php[\s\S]*?(?:file_get_contents|curl_exec)\s*\([^)]*https?://"},
        {"id": "builtin_backdoor_user", "name": "Unauthorized Admin User Creation Backdoor", "pattern": r"(?:wp_create_user|wp_insert_user)\s*\([^)]*administrator[\s\S]*?add_role\s*\([^)]*administrator|wp_set_current_user\s*\(\s*1\s*\)[\s\S]*?wp_set_auth_cookie"},
        {"id": "builtin_crypto_miner", "name": "JavaScript Crypto Miner (CoinHive/XMRig/WebAssembly)", "pattern": r"(?:coinhive\.min\.js|cryptoloot|CoinImp|mineralt|webminepool|cryptonight|Wasm\.instantiate.*miner)"},
        {"id": "builtin_spam_injection", "name": "SEO Blackhat Spam & Malicious Redirect Injector", "pattern": r"(?:preg_replace\s*\(\s*['\"].*['\"]\s*,\s*['\"].*['\"]\s*,\s*\$_(?:POST|GET)\)|add_action\s*\(\s*['\"]wp_head['\"]\s*,\s*['\"].*eval.*['\"]\))"},
        {"id": "builtin_polyglot_shell", "name": "Polyglot Image Header with PHP Injection", "pattern": r"^(?:GIF89a|GIF87a|\xFF\xD8\xFF|\x89PNG)[\s\S]{0,100}<\?(?:php|=)"},
        {"id": "builtin_variable_func", "name": "Dynamic Variable Function Execution Trap", "pattern": r"\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\(\s*\$_(?:POST|GET|REQUEST|COOKIE)\s*\["},
        {"id": "builtin_xor_obfuscation", "name": "XOR Cipher WebShell Payload Decryptor", "pattern": r"(?:\$[a-zA-Z0-9_]+\[\$[a-zA-Z0-9_]+\]\s*\^\s*\$[a-zA-Z0-9_]+\[\$[a-zA-Z0-9_]+\]|\$[a-zA-Z0-9_]+\s*\^\s*['\"][a-zA-Z0-9_]{3,}['\"])"},
        {"id": "builtin_chr_concat_chain", "name": "Polymorphic chr() Byte Concatenation String Assembler", "pattern": r"(?:chr\s*\(\s*\d+\s*\)\s*\.\s*){5,}chr\s*\(\s*\d+\s*\)"},
        {"id": "builtin_hex_obfuscation", "name": "Obfuscated Hexadecimal Byte Sequence String", "pattern": r"(?:\\x[0-9a-fA-F]{2}){8,}"},
        {"id": "builtin_backdoor_auth_bypass", "name": "MD5/SHA1 Parameter Authentication Bypass Backdoor", "pattern": r"if\s*\(\s*(?:md5|sha1)\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)\[[^\]]+\]\s*\)\s*===?\s*['\"][0-9a-f]{32,40}['\"]"},
        {"id": "builtin_raw_socket_tunnel", "name": "Reverse Shell / Raw Socket Tunnel Connector", "pattern": r"\b(?:fsockopen|pfsockopen|socket_create)\s*\([^,]+,\s*(?:4444|1337|31337|8888|9999|8080|9001|4445|6666|7777)\b"},
        {"id": "builtin_malicious_plugin_installer", "name": "Stealth Remote Plugin Installer / Unzipper", "pattern": r"(?:download_url|wp_remote_get)\s*\([^)]*https?://[\s\S]*?(?:unzip_file|PclZip|ZipArchive)[\s\S]*?wp-content/plugins"},
        {"id": "builtin_database_credential_dumper", "name": "Unauthorized Database Credential / User Dumper", "pattern": r"\$wpdb->(?:get_results|get_row)\s*\(\s*['\"]SELECT\s+.*FROM\s+\{\$?wpdb->(?:prefix)?users\}?[\s\S]*?(?:base64_encode|gzcompress|mail|curl_exec)"},
        {"id": "builtin_stealth_admin_gate", "name": "Stealth Backdoor Authentication Gateway (Cookie / Header Injection)", "pattern": r"(?:HTTP_USER_AGENT|HTTP_ACCEPT_LANGUAGE|HTTP_COOKIE)[\s\S]{1,60}(?:eval|assert|passthru|system|shell_exec)\s*\("},
        {"id": "builtin_godzilla_webshell", "name": "Godzilla Enterprise WebShell (AES/XOR/Raw Dispatcher)", "pattern": r"(?:openssl_decrypt\s*\(\s*\$_(?:POST|COOKIE|SERVER|REQUEST)[\s\S]{0,100}AES|\$_(?:POST|REQUEST|COOKIE)\[[^\]]+\]\s*\^\s*[\'\"\$]|@session_start\(\);[\s\S]{0,80}openssl_decrypt)"},
        {"id": "builtin_behinder_webshell", "name": "Behinder Multi-Layer Encrypted WebShell (AES-128/256 Dynamic Sink)", "pattern": r"(?:openssl_decrypt\s*\([^,]+,\s*['\"]AES(?:-128|-256)?-(?:CBC|ECB|CFB)['\"]|@eval\s*\(\s*openssl_decrypt|\$post\s*=\s*file_get_contents\s*\(\s*['\"]php:\/\/input['\"]\s*\)[\s\S]{0,80}openssl_decrypt)"},
        {"id": "builtin_chinasword_webshell", "name": "China Chopper / AntSword Dynamic WebShell Sinks", "pattern": r"(?:@eval\s*\(\s*(?:base64_decode|gzinflate|str_rot13)?\s*\(\s*\$_(?:POST|GET|REQUEST|COOKIE)\[|array_map\s*\(\s*['\"]assert['\"]\s*,\s*\(array\)\$_(?:POST|GET|REQUEST))"},
        {"id": "builtin_seo_pharma_spam", "name": "SEO Blackhat Pharma/Gambling/Counterfeit Spam Injection", "pattern": r"(?:display\s*:\s*none|position\s*:\s*absolute\s*;\s*left\s*:\s*-9999px|font-size\s*:\s*(?:0px|1px)|text-indent\s*:\s*-9999px|opacity\s*:\s*0|visibility\s*:\s*hidden)[\s\S]{0,150}?(?:viagra|cialis|levitra|online-casino|payday\s+loans|replica\s+rolex|fake\s+bags|tramadol|buy\s+cheap|kamagra|phentermine|ambien|modafinil|xanax|slot\s+machine|baccarat|poker\s+online|porn|escort)"},
        {"id": "builtin_search_engine_cloaking", "name": "Search Engine Crawler Cloaking & Doorway Redirect Hijacker", "pattern": r"(?:(?:\$_SERVER\[['\"]HTTP_USER_AGENT['\"]]|\$_SERVER\[['\"]HTTP_REFERER['\"]])[\s\S]{0,100}(?:googlebot|bingbot|yahoo|baiduspider|yandex|crawler|duckduckbot|sogou|exabot|facebookexternalhit|ia_archiver)|(?:googlebot|bingbot|yahoo|baiduspider|yandex|crawler|duckduckbot|sogou|exabot)[\s\S]{0,100}(?:\$_SERVER\[['\"]HTTP_USER_AGENT['\"]]|\$_SERVER\[['\"]HTTP_REFERER['\"]]))[\s\S]{0,150}(?:header\s*\(\s*['\"]Location:|wp_redirect|exit\s*\(\s*\)|die\s*\(\s*\)|window\.location|document\.location)"},
        {"id": "builtin_japanese_keyword_hack", "name": "Japanese Keyword SEO Hack / Injected Kanji-Hiragana Spam Pages", "pattern": r"(?:[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{8,}.*?(?:激安|通販|送料無料|人気|正規品|割引|特価|限定|専門店|購入))"},
        {"id": "builtin_rogue_admin_creation", "name": "Stealth Rogue Administrator Account Injector Hook", "pattern": r"(?:wp_create_user|wp_insert_user|wp_set_current_user)[\s\S]{0,100}(?:administrator|add_cap\s*\(\s*['\"]administrator['\"]\)|add_role\s*\(\s*['\"]administrator['\"]\)|set_role\s*\(\s*['\"]administrator['\"]\))"},
        {"id": "builtin_htaccess_malicious_rewrite", "name": "Malicious .htaccess Search Engine Redirection Rule", "pattern": r"(?:RewriteCond\s+%{HTTP_USER_AGENT}\s+.*(?:googlebot|bingbot|yahoo|baiduspider|crawler)|RewriteCond\s+%{HTTP_REFERER}\s+.*(?:google|bing|yahoo|yandex|duckduckgo)|RewriteRule\s+.*\s+https?:\/\/[^\s]+\s+\[R=(?:301|302))"},
        {"id": "builtin_cron_eval_injector", "name": "Malicious WordPress Cron Job Scheduled Injection Hook", "pattern": r"(?:wp_schedule_event|wp_schedule_single_event)[\s\S]{0,100}(?:base64_decode|eval|assert|curl_exec|wp_remote_get)[\s\S]{0,150}https?:\/\/"},
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
