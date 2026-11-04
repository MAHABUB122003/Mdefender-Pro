"""MDefender Pro — Mega Cloud Intelligence Service.

High-performance, stateless intelligence engine operating over the 5.32M
record dataset (wp_checksums.db). Designed for multi-tenant SaaS serving
hundreds of thousands of WordPress websites with zero database bloat in MongoDB.

Core capabilities:
1. check_bulk_hashes: Ultra-fast batch lookup (up to 1,000 files/call) in sub-milliseconds.
2. scan_file_stateless: Multi-signal AST, ML, YARA, and Polyglot analysis without storing files.
3. scan_db_content_stateless: High-speed detection of SEO Spam, Japanese Hack & C2 Redirects.
"""

import os
import re
import sqlite3
import hashlib
import time
from functools import lru_cache

from src.engine.signature_detector import SignatureDetector
from src.engine.malware_detector import MalwareDetector

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DB_PATH = os.path.join(WORKSPACE_ROOT, "datasets", "wordpress_malware", "database", "wp_checksums.db")

class IntelligenceService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self, db_path=None):
        self.db_path = db_path or DB_PATH
        self.sig_detector = SignatureDetector()
        self.ml_detector = MalwareDetector()
        self._compiled_db_patterns = None
        self._init_compiled_patterns()

    def _get_ro_connection(self):
        """Open an optimized read-only connection with WAL mode."""
        uri = f"file:{self.db_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=30, check_same_thread=False)
        conn.execute("PRAGMA cache_size = -32000;")  # 32MB RAM cache
        return conn

    def _init_compiled_patterns(self):
        """Precompile common database and SEO spam regexes for sub-millisecond execution."""
        patterns = [
            {
                "target_type": "wp_posts",
                "regex": re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{4,}.*?(?:激安|通販|送料無料|人気|正規品|割引|特価|限定|専門店|購入)", re.UNICODE | re.IGNORECASE),
                "threat_name": "Japanese Keyword SEO Hack Spam",
                "severity": "HIGH"
            },
            {
                "target_type": "wp_posts",
                "regex": re.compile(r"(?:display\s*:\s*none|position\s*:\s*absolute\s*;\s*left\s*:\s*-9999px|font-size\s*:\s*0|opacity\s*:\s*0|visibility\s*:\s*hidden)[\s\S]{0,150}?(?:viagra|cialis|levitra|online-casino|payday\s+loans|replica\s+rolex|tramadol|kamagra|slot\s+machine|poker\s+online)", re.IGNORECASE),
                "threat_name": "Hidden Blackhat Pharma/Casino Spam Injection",
                "severity": "HIGH"
            },
            {
                "target_type": "wp_options",
                "regex": re.compile(r"https?://[^\"']*(?:baladainjector|trafficdelivery|clicksor|freshclick|jquery-code\.su|wp-stream\.online|cloudcdn\.bid)", re.IGNORECASE),
                "threat_name": "Malicious Redirect C2 URL in Database Options",
                "severity": "CRITICAL"
            }
        ]
        if os.path.exists(self.db_path):
            try:
                conn = self._get_ro_connection()
                c = conn.cursor()
                # Prioritize real regex rules and SEO/C2 patterns over synthetic hashes
                c.execute("""
                    SELECT target_type, pattern, threat_name, severity 
                    FROM db_and_config_signatures 
                    ORDER BY id DESC 
                    LIMIT 2000
                """)
                for target_type, pat, threat_name, sev in c.fetchall():
                    try:
                        cpat = re.compile(pat, re.IGNORECASE)
                        patterns.append({
                            "target_type": target_type,
                            "regex": cpat,
                            "threat_name": threat_name,
                            "severity": sev
                        })
                    except Exception:
                        continue
                conn.close()
            except Exception as e:
                print(f"[IntelligenceService] Warning loading db patterns: {e}")
        self._compiled_db_patterns = patterns

    def check_bulk_hashes(self, file_items: list[dict]) -> dict:
        """Batch-check up to 1,000 file hashes against 5.32M records.
        
        Args:
            file_items: list of dicts with keys: 'path', 'sha256', and optionally 'md5'.
            
        Returns:
            dict containing clean, malicious, and unknown file lists with metrics.
        """
        start_time = time.time()
        clean_paths = []
        malicious_findings = []
        unknown_paths = []

        if not os.path.exists(self.db_path) or not file_items:
            return {
                "total": len(file_items),
                "clean_count": 0,
                "malicious_count": 0,
                "unknown_count": len(file_items),
                "clean": [],
                "malicious": [],
                "unknown": [item.get("path") for item in file_items],
                "lookup_time_ms": 0.0
            }

        conn = self._get_ro_connection()
        c = conn.cursor()

        try:
            # 1. Check known malicious signatures by SHA-256
            sha_map = {item["sha256"].lower(): item["path"] for item in file_items if item.get("sha256")}
            md5_map = {item["md5"].lower(): item["path"] for item in file_items if item.get("md5")}

            detected_malicious = set()
            if sha_map:
                sha_list = list(sha_map.keys())
                # Chunk into groups of 500 for SQLite IN parameter limit
                for i in range(0, len(sha_list), 500):
                    chunk = sha_list[i:i+500]
                    placeholders = ",".join("?" * len(chunk))
                    c.execute(f"""
                        SELECT pattern_or_hash, category, severity, description
                        FROM malicious_signatures 
                        WHERE pattern_or_hash IN ({placeholders})
                    """, chunk)
                    for sh, cat, sev, desc in c.fetchall():
                        m_path = sha_map.get(sh)
                        if m_path and m_path not in detected_malicious:
                            detected_malicious.add(m_path)
                            malicious_findings.append({
                                "file_path": m_path,
                                "sha256": sh,
                                "verdict": "malicious",
                                "risk_score": 100,
                                "confidence": 1.0,
                                "threat_family": cat,
                                "severity": sev,
                                "description": desc,
                                "detection_source": "known_malware_hash_intelligence"
                            })

            # 2. Check Official Core Checksums (by MD5)
            detected_clean = set()
            remaining_for_clean = [item for item in file_items if item.get("path") not in detected_malicious]

            if remaining_for_clean:
                md5_candidates = list({item["md5"].lower() for item in remaining_for_clean if item.get("md5")})
                for i in range(0, len(md5_candidates), 500):
                    chunk = md5_candidates[i:i+500]
                    placeholders = ",".join("?" * len(chunk))
                    c.execute(f"""
                        SELECT DISTINCT md5 
                        FROM core_checksums 
                        WHERE md5 IN ({placeholders})
                    """, chunk)
                    for (md,) in c.fetchall():
                        orig_path = md5_map.get(md)
                        if orig_path and orig_path not in detected_clean:
                            detected_clean.add(orig_path)
                            clean_paths.append(orig_path)

            # 3. Check Official Plugin & Theme Checksums (by SHA-256 or MD5)
            remaining_for_plugins = [item for item in remaining_for_clean if item.get("path") not in detected_clean]
            if remaining_for_plugins:
                plugin_sha = list({item["sha256"].lower() for item in remaining_for_plugins if item.get("sha256")})
                for i in range(0, len(plugin_sha), 500):
                    chunk = plugin_sha[i:i+500]
                    placeholders = ",".join("?" * len(chunk))
                    c.execute(f"""
                        SELECT DISTINCT sha256 
                        FROM plugin_checksums 
                        WHERE sha256 IN ({placeholders})
                    """, chunk)
                    for (sh,) in c.fetchall():
                        orig_path = sha_map.get(sh)
                        if orig_path and orig_path not in detected_clean:
                            detected_clean.add(orig_path)
                            clean_paths.append(orig_path)

            # 4. Any item not malicious and not clean is unknown (needs inspection)
            for item in file_items:
                p = item.get("path")
                if p not in detected_malicious and p not in detected_clean:
                    unknown_paths.append(p)

        finally:
            conn.close()

        elapsed_ms = (time.time() - start_time) * 1000
        return {
            "total": len(file_items),
            "clean_count": len(clean_paths),
            "malicious_count": len(malicious_findings),
            "unknown_count": len(unknown_paths),
            "clean": clean_paths,
            "malicious": malicious_findings,
            "unknown": unknown_paths,
            "lookup_time_ms": round(elapsed_ms, 2)
        }

    def scan_file_stateless(self, filename: str, content: bytes, source: str = None) -> dict:
        """Complete, multi-signal in-memory inspection of a file.
        
        Zero database writes to MongoDB. Returns full verdict and actionable details.
        """
        sha256 = hashlib.sha256(content).hexdigest()
        md5 = hashlib.md5(content).hexdigest()
        
        # 1. Fast Hash Lookup in 5.32M Database
        bulk_res = self.check_bulk_hashes([{"path": filename, "sha256": sha256, "md5": md5}])
        if bulk_res["malicious_count"] > 0:
            finding = bulk_res["malicious"][0]
            return {
                "file_path": filename,
                "verdict": "malicious",
                "risk_score": 100,
                "confidence": 1.0,
                "family": finding.get("threat_family", "malware"),
                "reasons": [finding.get("description", "Known malware hash match")],
                "detection_sources": ["threat_intelligence_hash"],
                "sha256": sha256,
                "md5": md5,
                "is_clean": False
            }
            
        if bulk_res["clean_count"] > 0:
            return {
                "file_path": filename,
                "verdict": "clean",
                "risk_score": 0,
                "confidence": 1.0,
                "family": None,
                "reasons": ["Verified official WordPress core/plugin checksum match"],
                "detection_sources": ["official_checksum_whitelist"],
                "sha256": sha256,
                "md5": md5,
                "is_clean": True
            }

        # 2. Polyglot & Media Steganography Check
        poly_finding = self._check_polyglot_and_media(filename, content)
        if poly_finding:
            return {
                "file_path": filename,
                "verdict": "malicious",
                "risk_score": 95,
                "confidence": 0.98,
                "family": poly_finding["family"],
                "reasons": [poly_finding["reason"]],
                "detection_sources": ["polyglot_steganography_analyzer"],
                "sha256": sha256,
                "md5": md5,
                "is_clean": False
            }

        # 3. Signature & YARA Pattern Detection
        sig_result = self.sig_detector.detect(content)

        # 4. Machine Learning & Feature Extractor
        ml_result = self.ml_detector.scan(filename, content)

        # 5. Consensus Scoring & Evidence Formulation
        reasons = list(ml_result.get("reasons", []))
        if sig_result:
            reasons.extend(sig_result.get("reasons", []))

        risk_score = ml_result.get("risk_score", 0)
        verdict = ml_result.get("verdict", "clean")

        if sig_result and sig_result.get("signature_verdict") == "malicious":
            verdict = "malicious"
            risk_score = max(risk_score, 90)
        elif risk_score >= 70:
            verdict = "malicious"
        elif risk_score >= 45:
            verdict = "suspicious"

        family = ml_result.get("family")
        if sig_result and not family:
            family = sig_result.get("rule_name")

        return {
            "file_path": filename,
            "source": source,
            "verdict": verdict,
            "risk_score": risk_score,
            "confidence": ml_result.get("confidence", 0.0),
            "family": family,
            "reasons": reasons[:10],
            "detection_sources": (["signature"] if sig_result else []) + ["ml"],
            "sha256": sha256,
            "md5": md5,
            "is_clean": verdict == "clean"
        }

    def _check_polyglot_and_media(self, filename: str, content: bytes) -> dict | None:
        """Inspect media files for embedded PHP code, SVG scripts, and header traps."""
        lower_name = filename.lower()
        media_exts = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".ico")
        
        if not lower_name.endswith(media_exts):
            return None

        # Double extension check: e.g. logo.php.jpg or backdoor.jpg.php
        if re.search(r"\.(?:php|phtml|phar|inc)\.(?:jpg|jpeg|png|gif|webp|svg|pdf)$", lower_name):
            return {"family": "double_extension_webshell", "reason": "Dangerous double extension disguise detected"}

        # SVG script check
        if lower_name.endswith(".svg"):
            try:
                svg_str = content.decode("utf-8", errors="ignore")
                if re.search(r"<svg[\s\S]*?(?:<script|onload\s*=|onerror\s*=|xlink:href\s*=\s*['\"]javascript:)", svg_str, re.IGNORECASE):
                    return {"family": "malicious_svg_xss", "reason": "SVG vector image contains embedded JavaScript/XSS execution"}
                if re.search(r"<\?(?:php|=)", svg_str, re.IGNORECASE):
                    return {"family": "svg_php_webshell", "reason": "SVG image contains embedded executable PHP code"}
            except Exception:
                pass

        # Image Polyglot Check: Check magic bytes + embedded PHP open tags
        has_php_tag = bool(re.search(b"<\\?(?:php|=)", content, re.IGNORECASE))
        if has_php_tag:
            # JPEG (FF D8 FF)
            if content.startswith(b"\xff\xd8\xff"):
                return {"family": "polyglot_jpeg_shell", "reason": "Polyglot JPEG file containing embedded PHP code"}
            # PNG (89 50 4E 47)
            if content.startswith(b"\x89PNG\r\n\x1a\n"):
                return {"family": "polyglot_png_shell", "reason": "Polyglot PNG file containing embedded PHP chunk payload"}
            # GIF (GIF87a / GIF89a)
            if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
                return {"family": "polyglot_gif_shell", "reason": "Polyglot GIF file containing embedded PHP code"}
            # WebP (RIFF....WEBP)
            if content.startswith(b"RIFF") and b"WEBP" in content[:16]:
                return {"family": "polyglot_webp_shell", "reason": "Polyglot WebP file containing embedded PHP payload"}

        return None

    def scan_db_content_stateless(self, rows: list[dict]) -> list[dict]:
        """Scan WordPress database rows (wp_posts / wp_options) for SEO Spam, C2 redirects.
        
        Args:
            rows: list of dicts: {'id': 123, 'target_type': 'wp_posts', 'column': 'post_content', 'value': '...'}
        """
        findings = []
        if not rows or not self._compiled_db_patterns:
            return findings

        for row in rows:
            target = row.get("target_type", "wp_posts")
            val = str(row.get("value", ""))
            if len(val) < 5:
                continue

            for pat in self._compiled_db_patterns:
                if pat["target_type"] == target or pat["target_type"] == "wp_options_and_htaccess":
                    if pat["regex"].search(val):
                        findings.append({
                            "row_id": row.get("id"),
                            "column": row.get("column"),
                            "target_type": target,
                            "threat_name": pat["threat_name"],
                            "severity": pat["severity"],
                            "match_snippet": val[:100] + "..." if len(val) > 100 else val
                        })
                        break  # One finding per row is sufficient
        return findings
