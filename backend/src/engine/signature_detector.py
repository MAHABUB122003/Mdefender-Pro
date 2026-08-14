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

    def _load_patterns(self):
        if self._patterns is not None:
            return self._patterns
        with self._lock:
            if self._patterns is not None:
                return self._patterns
            loaded = []
            path = self._rules_path()
            if not os.path.exists(path):
                self._patterns = []
                return self._patterns
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
                self._patterns = loaded
            except Exception as e:
                self.load_error = f"patterns: {e}"
                self._patterns = []
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
            elif os.path.exists(self._rules_path()):
                # Fallback: load hashes embedded in rules.json
                try:
                    with open(self._rules_path(), "r", encoding="utf-8", errors="replace") as f:
                        data = json.load(f)
                    for h in data.get("hashes", []):
                        s = h.get("sha256", "")
                        if len(s) == 64:
                            sha_set.add(s.lower())
                        s1 = h.get("sha1", "")
                        if len(s1) == 40:
                            sha1_set.add(s1.lower())
                        m = h.get("md5", "")
                        if len(m) == 32:
                            md5_set.add(m.lower())
                except Exception as e:
                    self.load_error = f"hashes(fallback): {e}"
            self._hashes = (sha_set, sha1_set, md5_set)
            return self._hashes

    def check_patterns(self, content: bytes):
        """Return list of matched pattern rule names (case-insensitive scan of raw text)."""
        if not self.configured:
            return []
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
