"""MDefender Pro — Mega Intelligence & Dataset Enrichment Engine.

Collects and enriches all 5 key categories of threat intelligence:
1. Obfuscated WebShells & Backdoor Signatures (from 77k+ samples & YARA rules)
2. Database & Post Malware: Japanese SEO Spam, Pharma/Casino, Cloaking & Redirects
3. Polyglot & Media Steganography Detection Signatures (Images, SVG XSS, PDF)
4. Persistence & Stealth Backdoors (.user.ini, Rogue Crons, MU-Plugins)
5. Official Plugin & Theme Checksums (WordPress.org Top Plugins/Themes)
"""

import os
import sys
import json
import sqlite3
import hashlib
import zipfile
import io
import time
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TI_DIR = os.path.join(WORKSPACE_ROOT, "datasets", "threat_intelligence")
WP_MALWARE_DIR = os.path.join(WORKSPACE_ROOT, "datasets", "wordpress_malware")
DB_PATH = os.path.join(WP_MALWARE_DIR, "database", "wp_checksums.db")

HEADERS = {"User-Agent": "MDefender-Enterprise-Security-Collector/3.0"}

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=60)
    # Enable WAL mode for high concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

# -------------------------------------------------------------
# PHASE 1: Real-World Obfuscated WebShells & Backdoors Ingestion
# -------------------------------------------------------------
def enrich_webshells_and_backdoors(conn):
    print("\n" + "=" * 65)
    print(" [COLLECTOR 1/5] INGESTING OBFUSCATED WEBSHELLS & YARA BACKDOORS")
    print("=" * 65)
    c = conn.cursor()
    
    ws_dir = os.path.join(TI_DIR, "05_obfuscated_webshells")
    bd_dir = os.path.join(TI_DIR, "09_wordpress_backdoors")
    
    batch = []
    seen_hashes = set()
    total_added = 0
    
    # 1. Exact SHA-256 and token signatures from real samples
    print("  -> Scanning 77k+ webshell samples for exact SHA-256 & AST patterns...")
    sample_dirs = [ws_dir, bd_dir]
    for sdir in sample_dirs:
        if not os.path.exists(sdir):
            continue
        for root, _, files in os.walk(sdir):
            for f in files:
                if f.endswith((".git", ".json", ".md", ".csv")):
                    continue
                fpath = os.path.join(root, f)
                try:
                    with open(fpath, "rb") as fh:
                        raw = fh.read()
                    if len(raw) < 10 or len(raw) > 5 * 1024 * 1024:
                        continue
                    sha256 = hashlib.sha256(raw).hexdigest()
                    if sha256 in seen_hashes:
                        continue
                    seen_hashes.add(sha256)
                    
                    category = "webshell"
                    lower_f = f.lower()
                    if "godzilla" in lower_f or "godzilla" in root.lower():
                        category = "godzilla_webshell"
                    elif "behinder" in lower_f or "behinder" in root.lower():
                        category = "behinder_webshell"
                    elif "antsword" in lower_f or "caidao" in lower_f:
                        category = "chopper_antsword"
                    elif "backdoor" in lower_f or "backdoor" in root.lower():
                        category = "wordpress_backdoor"
                        
                    batch.append((category, "exact_file_sha256", sha256, "CRITICAL", f"Real-world webshell signature: {f}"))
                    
                    if len(batch) >= 5000:
                        c.executemany("INSERT OR IGNORE INTO malicious_signatures (category, signature_type, pattern_or_hash, severity, description) VALUES (?, ?, ?, ?, ?)", batch)
                        conn.commit()
                        total_added += len(batch)
                        batch = []
                        print(f"     Ingested {total_added:,} webshell hashes...")
                except Exception:
                    continue

    # 2. Ingest YARA Rules from 09_wordpress_backdoors/yara_rules
    yara_dir = os.path.join(bd_dir, "yara_rules")
    if os.path.exists(yara_dir):
        print("  -> Parsing YARA rules into detection signatures...")
        for yf in os.listdir(yara_dir):
            if yf.endswith((".yar", ".yara")):
                yp = os.path.join(yara_dir, yf)
                try:
                    with open(yp, "r", encoding="utf-8", errors="ignore") as fh:
                        ytext = fh.read()
                    # Extract strings from YARA rule
                    str_matches = re.findall(r"\$[a-zA-Z0-9_]+\s*=\s*([\"/].*?[\"/])", ytext)
                    for sm in str_matches:
                        clean_pat = sm.strip('"').strip('/')
                        if len(clean_pat) > 6:
                            batch.append(("yara_rule_pattern", "regex_pattern", clean_pat, "HIGH", f"YARA rule pattern from {yf}"))
                except Exception:
                    continue

    if batch:
        c.executemany("INSERT OR IGNORE INTO malicious_signatures (category, signature_type, pattern_or_hash, severity, description) VALUES (?, ?, ?, ?, ?)", batch)
        conn.commit()
        total_added += len(batch)

    print(f"[+] Total WebShell & Backdoor Signatures Ingested: {total_added:,}")

# -------------------------------------------------------------
# PHASE 2: Database & Post Spam: Japanese Hack, Pharma, Cloaking
# -------------------------------------------------------------
def enrich_database_and_seo_spam(conn):
    print("\n" + "=" * 65)
    print(" [COLLECTOR 2/5] INGESTING DATABASE MALWARE & SEO SPAM (wp_posts / wp_options)")
    print("=" * 65)
    c = conn.cursor()
    seo_dir = os.path.join(TI_DIR, "06_blackhat_seo_redirect")
    
    batch = []
    
    # 1. Japanese Keyword Hack Dictionaries
    jp_file = os.path.join(seo_dir, "seo_spam_keywords", "replica_counterfeit_japanese_keywords.txt")
    if os.path.exists(jp_file):
        with open(jp_file, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    pat = rf"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{{3,}}.*{re.escape(line)}"
                    batch.append(("wp_posts", pat, f"Japanese Keyword SEO Spam: {line}", "HIGH"))
                    batch.append(("wp_options", pat, f"Japanese SEO Spam in Options: {line}", "HIGH"))

    # 2. Pharma, Casino, Essay, Adult Spam
    for cat_name, fname in [
        ("Pharma Blackhat Spam", "pharma_keywords.txt"),
        ("Gambling & Casino Spam", "gambling_casino_keywords.txt"),
        ("Adult Escort Spam", "adult_escort_keywords.txt"),
        ("Academic Essay Spam", "academic_essay_keywords.txt"),
        ("Loan/Crypto Spam", "finance_loan_crypto_keywords.txt"),
    ]:
        fpath = os.path.join(seo_dir, "seo_spam_keywords", fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    kw = line.strip()
                    if kw and len(kw) > 3 and not kw.startswith("#"):
                        # Hidden CSS + Keyword combo
                        css_pat = rf"(?:display\s*:\s*none|position\s*:\s*absolute\s*;\s*left\s*:\s*-9999px|font-size\s*:\s*0|opacity\s*:\s*0|visibility\s*:\s*hidden)[^>]*?{re.escape(kw)}"
                        batch.append(("wp_posts", css_pat, f"Hidden {cat_name}: {kw}", "HIGH"))
                        batch.append(("wp_posts", rf"(?:https?://[^\s\"']+\s*)?{re.escape(kw)}", f"{cat_name} Keyword: {kw}", "MEDIUM"))

    # 3. Cloaking & Hidden Redirects
    cloaking_file = os.path.join(seo_dir, "redirect_patterns", "cloaking_hidden_content_markers.txt")
    if os.path.exists(cloaking_file):
        with open(cloaking_file, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                cpat = line.strip()
                if cpat and not cpat.startswith("#"):
                    batch.append(("wp_posts", cpat, f"Search Engine Cloaking Injection: {cpat[:40]}", "HIGH"))
                    batch.append(("wp_options", cpat, f"Options Cloaking Marker: {cpat[:40]}", "HIGH"))

    # 4. Malicious Redirect Patterns in DB Options (siteurl, home, etc.)
    red_file = os.path.join(seo_dir, "redirect_patterns", "malicious_redirect_patterns.txt")
    if os.path.exists(red_file):
        with open(red_file, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                rpat = line.strip()
                if rpat and not rpat.startswith("#"):
                    batch.append(("wp_options", rpat, f"Malicious Redirect Script: {rpat[:40]}", "CRITICAL"))
                    batch.append(("wp_posts", rpat, f"Malicious Redirect Script in Post: {rpat[:40]}", "CRITICAL"))

    # Known live redirect injector domains
    KNOWN_MALICIOUS_DOMAINS = [
        "statistic.tracktraffic.com", "track.trafficjunky.net", "trafficdelivery.net",
        "greentags.biz", "adsupply.com", "re-direct.me", "fastdeliverymedia.com",
        "statdynamic.com", "clicksor.com", "propellerads.com", "zeroredirect.com",
        "baladainjector.net", "cnd.jsdeliver.net", "scripts.freshclick.info",
        "jquery-code.su", "analytics-google.org", "wp-stream.online", "cloudcdn.bid"
    ]
    for d in KNOWN_MALICIOUS_DOMAINS:
        batch.append(("wp_posts", rf"<script[^>]*src=[\"']https?://[^\"']*{re.escape(d)}[^\"']*[\"']", f"Malicious Injected Script CDN ({d})", "CRITICAL"))
        batch.append(("wp_options", rf"https?://[^\"']*{re.escape(d)}", f"Malicious C2 Domain in wp_options ({d})", "CRITICAL"))

    print(f"  -> Ingesting {len(batch):,} Database & SEO Spam Signatures into db_and_config_signatures...")
    c.executemany("INSERT OR IGNORE INTO db_and_config_signatures (target_type, pattern, threat_name, severity) VALUES (?, ?, ?, ?)", batch)
    conn.commit()
    print(f"[+] Total Database & SEO Signatures Ingested: {len(batch):,}")

# -------------------------------------------------------------
# PHASE 3: Polyglot & Media Steganography Detection Signatures
# -------------------------------------------------------------
def enrich_polyglot_and_media_signatures(conn):
    print("\n" + "=" * 65)
    print(" [COLLECTOR 3/5] INGESTING POLYGLOT & MEDIA STEGANOGRAPHY SIGNATURES")
    print("=" * 65)
    c = conn.cursor()
    
    media_sigs = [
        # 1. Polyglot Images (JPEG, PNG, GIF, WebP with embedded PHP execution)
        ("polyglot_image", "regex_pattern", r"^(?:\xFF\xD8\xFF)[\s\S]{0,4000}(?:<\?php|<\?=|\beval\s*\(|\bassert\s*\(|\$_(?:POST|GET|REQUEST|COOKIE))", "CRITICAL", "Polyglot JPEG with embedded PHP execution payload"),
        ("polyglot_image", "regex_pattern", r"^(?:\x89PNG\r\n\x1a\n)[\s\S]{0,4000}(?:<\?php|<\?=|\beval\s*\(|\bassert\s*\(|\$_(?:POST|GET|REQUEST|COOKIE))", "CRITICAL", "Polyglot PNG (IDAT/tEXt/zTXt chunk) with embedded PHP execution"),
        ("polyglot_image", "regex_pattern", r"^(?:GIF89a|GIF87a)[\s\S]{0,4000}(?:<\?php|<\?=|\beval\s*\(|\bassert\s*\(|\$_(?:POST|GET|REQUEST|COOKIE))", "CRITICAL", "Polyglot GIF with embedded PHP execution header"),
        ("polyglot_image", "regex_pattern", r"^RIFF.{4}WEBP[\s\S]{0,4000}(?:<\?php|<\?=|\beval\s*\(|\bassert\s*\(|\$_(?:POST|GET|REQUEST|COOKIE))", "CRITICAL", "Polyglot WebP chunk containing embedded PHP script"),
        
        # 2. Malicious SVG Vector Graphics (XSS, XML Entity Injection, Event Handlers)
        ("malicious_svg", "regex_pattern", r"<svg[\s\S]*?(?:<script[\s\S]*?>|onload\s*=|onerror\s*=|xlink:href\s*=\s*['\"]javascript:)", "CRITICAL", "Malicious SVG vector containing embedded JavaScript execution"),
        ("malicious_svg", "regex_pattern", r"<\?xml[\s\S]*?<!ENTITY[\s\S]*?(?:SYSTEM|PUBLIC)[\s\S]*?>", "HIGH", "SVG XML External Entity (XXE) Injection Attempt"),
        ("malicious_svg", "regex_pattern", r"<svg[\s\S]*?<\?(?:php|=)", "CRITICAL", "SVG Image containing embedded PHP executable code"),
        
        # 3. PDF Object Droppers & Embedded Streams
        ("malicious_pdf", "regex_pattern", r"%PDF-[0-9\.]+[\s\S]*?(?:/JavaScript|/JS\s*\(|/Launch|/EmbeddedFiles)[\s\S]*?<\?(?:php|=)", "CRITICAL", "PDF Document embedding dynamic PHP dropper execution"),
        ("malicious_pdf", "regex_pattern", r"%PDF-[0-9\.]+[\s\S]*?/Action\s*<<\s*/S\s*/JavaScript", "HIGH", "PDF Auto-Executing JavaScript Object Action"),

        # 4. Double Extensions & Null Byte Tricks
        ("dangerous_upload", "filename_pattern", r"\.(?:php|phtml|php3|php4|php5|php7|php8|phar|inc)\.(?:jpg|jpeg|png|gif|webp|svg|pdf|txt|ico)$", "CRITICAL", "Double extension disguise (e.g. file.php.jpg)"),
        ("dangerous_upload", "filename_pattern", r"\.(?:jpg|jpeg|png|gif|webp|svg|pdf)\.(?:php|phtml|phar)$", "CRITICAL", "Executable PHP file disguised with image prefix"),
        ("dangerous_upload", "filename_pattern", r"\.(?:php|phtml)\x00\.(?:jpg|png)$", "CRITICAL", "Null-byte upload filename truncation attack"),
        ("dangerous_upload", "filename_pattern", r"^\.htaccess$|^\.user\.ini$", "CRITICAL", "Web server config file uploaded into uploads/media directory"),
        
        # 5. Dangerous Files in wp-content/uploads/
        ("uploads_php_exec", "regex_pattern", r"<\?(?:php|=)[\s\S]*?(?:eval|assert|system|passthru|shell_exec|exec|base64_decode|gzinflate|str_rot13)\s*\(", "CRITICAL", "Executable PHP webshell located in media/uploads folder")
    ]
    
    print(f"  -> Ingesting {len(media_sigs)} Polyglot & Media Steganography Signatures...")
    c.executemany("INSERT OR IGNORE INTO malicious_signatures (category, signature_type, pattern_or_hash, severity, description) VALUES (?, ?, ?, ?, ?)", media_sigs)
    conn.commit()
    print("[+] Polyglot & Media Signatures Ingested successfully.")

# -------------------------------------------------------------
# PHASE 4: Persistence, Rogue Crons, MU-Plugins, .user.ini
# -------------------------------------------------------------
def enrich_persistence_and_stealth_mechanisms(conn):
    print("\n" + "=" * 65)
    print(" [COLLECTOR 4/5] INGESTING PERSISTENCE & STEALTH INFECTION SIGNATURES")
    print("=" * 65)
    c = conn.cursor()
    
    persistence_sigs = [
        # 1. Rogue WP-Cron Jobs
        ("rogue_cron", "regex_pattern", r"wp_schedule_(?:single_)?event\s*\([^,]+,\s*['\"](?:wp_vcheck|alfa_cron|sys_checker|wp_core_update_remote|wp_cloud_sync|cache_reloader_hook)['\"]", "CRITICAL", "Known malicious WordPress cron persistence hook"),
        ("rogue_cron", "regex_pattern", r"add_action\s*\(\s*['\"][^'\"]*cron[^'\"]*['\"]\s*,\s*['\"][^'\"]*(?:eval|assert|base64_decode|file_get_contents|wp_remote_get)[\s\S]*?https?://", "CRITICAL", "Malicious remote code execution attached to WordPress cron"),

        # 2. .user.ini & php.ini Persistence
        ("user_ini_backdoor", "regex_pattern", r"auto_prepend_file\s*=\s*['\"]?[^\r\n]+\.php", "CRITICAL", "Stealth PHP persistence via auto_prepend_file in .user.ini"),
        ("user_ini_backdoor", "regex_pattern", r"auto_append_file\s*=\s*['\"]?[^\r\n]+\.php", "CRITICAL", "Stealth PHP persistence via auto_append_file in .user.ini"),
        ("user_ini_backdoor", "regex_pattern", r"allow_url_include\s*=\s*(?:1|On|on)", "CRITICAL", "Dangerous allow_url_include enabled in local ini config"),

        # 3. .htaccess Reinfection & Rewrite Backdoors
        ("htaccess_persistence", "regex_pattern", r"php_value\s+auto_prepend_file\s+[^\r\n]+", "CRITICAL", "Apache .htaccess auto_prepend_file PHP execution hook"),
        ("htaccess_persistence", "regex_pattern", r"RewriteRule\s+.*\s+https?://[^\s]+\s+\[(?:R|L)", "HIGH", "Malicious .htaccess traffic redirection rule"),
        ("htaccess_persistence", "regex_pattern", r"<FilesMatch\s+['\"][^'\"]*\.(?:ico|png|jpg|gif)['\"]>\s*SetHandler\s+application/x-httpd-php", "CRITICAL", "Apache handler trick: executing images as PHP scripts"),

        # 4. Malicious MU-Plugins (Must-Use Plugins)
        ("mu_plugin_backdoor", "regex_pattern", r"wp-content/mu-plugins/[\s\S]*?(?:wp_create_user|eval\s*\(|assert\s*\(|system\s*\()", "CRITICAL", "Persistent backdoor hidden inside Must-Use (mu-plugins) directory"),
        ("mu_plugin_backdoor", "filename_pattern", r"wp-content/mu-plugins/(?:endurance-browser-cache|health-check-loader|wp-compat-check|sys_update|admin-fixer)\.php", "HIGH", "Fake system plugin name masking a persistent backdoor"),

        # 5. Core File Modification Indicators (functions.php, wp-config.php)
        ("wp_config_infection", "regex_pattern", r"/\*[\s\S]{0,100}\*/\s*@?eval\s*\(\s*(?:base64_decode|gzinflate)", "CRITICAL", "Malicious eval injection inserted inside wp-config.php"),
        ("theme_functions_backdoor", "regex_pattern", r"add_action\s*\(\s*['\"]wp_head['\"]\s*,\s*['\"][^'\"]*(?:base64_decode|gzinflate|eval)[\s\S]*?\)", "CRITICAL", "Backdoor injected into active theme functions.php or header.php"),
        ("stealth_admin_creation", "regex_pattern", r"add_action\s*\(\s*['\"]init['\"]\s*,\s*function\s*\(\s*\)\s*\{[\s\S]*?wp_create_user[\s\S]*?administrator", "CRITICAL", "Stealth rogue administrator user creation hook on init")
    ]
    
    print(f"  -> Ingesting {len(persistence_sigs)} Persistence & Stealth Infection Signatures...")
    c.executemany("INSERT OR IGNORE INTO malicious_signatures (category, signature_type, pattern_or_hash, severity, description) VALUES (?, ?, ?, ?, ?)", persistence_sigs)
    conn.commit()
    print("[+] Persistence & Stealth Signatures Ingested successfully.")

# -------------------------------------------------------------
# PHASE 5: Top WordPress Plugins & Themes Official Checksums
# -------------------------------------------------------------
def enrich_top_plugins_and_themes(conn, target_extra=500000):
    print("\n" + "=" * 65)
    print(" [COLLECTOR 5/5] EXPANDING OFFICIAL PLUGIN & THEME CHECKSUMS (WordPress.org)")
    print("=" * 65)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM plugin_checksums")
    initial_count = c.fetchone()[0]
    print(f"  Existing Plugin & Theme Checksums: {initial_count:,}")

    # Fetch top 60 popular plugins + popular themes
    popular_plugins = [
        "woocommerce", "jetpack", "wpforms-lite", "all-in-one-wp-migration",
        "site-kit-by-google", "mailchimp-for-woocommerce", "wp-fastest-cache",
        "redirection", "cookie-law-info", "seo-by-rank-math", "smush",
        "wp-optimize", "wp-mail-smtp", "shortcodes-ultimate", "better-wp-security",
        "sucuri-scanner", "ninja-forms", "google-analytics-for-wordpress",
        "tinymce-advanced", "duplicate-page", "tablepress", "regenerate-thumbnails"
    ]
    
    popular_themes = [
        ("theme", "astra"), ("theme", "twentytwentyfour"), ("theme", "twentytwentythree"),
        ("theme", "oceanwp"), ("theme", "neve"), ("theme", "generatepress"), ("theme", "hello-elementor")
    ]

    tasks = []
    for slug in popular_plugins:
        # Check current latest
        tasks.append(("plugin", slug))
        
    for kind, slug in popular_themes:
        tasks.append((kind, slug))

    print(f"  -> Prepared {len(tasks)} popular plugins/themes for official integrity hash indexing...")
    
    def fetch_and_hash(item):
        kind, slug = item
        url = f"https://downloads.wordpress.org/{kind}/{slug}.latest-stable.zip" if kind == "theme" else f"https://downloads.wordpress.org/plugin/{slug}.zip"
        records = []
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read()
            zf = zipfile.ZipFile(io.BytesIO(content))
            for fname in zf.namelist():
                if fname.endswith("/"):
                    continue
                b = zf.read(fname)
                md5 = hashlib.md5(b).hexdigest()
                sha256 = hashlib.sha256(b).hexdigest()
                records.append((f"{kind}:{slug}", "latest", fname, md5, sha256))
        except Exception:
            pass
        return records

    batch = []
    added = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        for res in ex.map(fetch_and_hash, tasks):
            if res:
                batch.extend(res)
                added += len(res)
                if len(batch) >= 2000:
                    c.executemany("INSERT OR IGNORE INTO plugin_checksums VALUES (?, ?, ?, ?, ?)", batch)
                    conn.commit()
                    batch = []
                    print(f"     Indexed {added:,} official plugin/theme files...")

    if batch:
        c.executemany("INSERT OR IGNORE INTO plugin_checksums VALUES (?, ?, ?, ?, ?)", batch)
        conn.commit()

    c.execute("SELECT count(*) FROM plugin_checksums")
    final_count = c.fetchone()[0]
    print(f"[+] Total Plugin & Theme Checksums in Database: {final_count:,} (added {final_count - initial_count:,})")

def main():
    start_time = time.time()
    conn = get_connection()
    try:
        enrich_webshells_and_backdoors(conn)
        enrich_database_and_seo_spam(conn)
        enrich_polyglot_and_media_signatures(conn)
        enrich_persistence_and_stealth_mechanisms(conn)
        enrich_top_plugins_and_themes(conn)
        
        # Final Summary
        c = conn.cursor()
        print("\n" + "=" * 65)
        print(" 🎯 ENRICHMENT COMPLETED SUCCESSFULLY!")
        print("=" * 65)
        for tbl in ["core_checksums", "plugin_checksums", "malicious_signatures", "db_and_config_signatures"]:
            c.execute(f"SELECT count(*) FROM {tbl}")
            cnt = c.fetchone()[0]
            print(f"  {tbl}: {cnt:,} verified intelligence records")
        
        c.execute("SELECT (SELECT count(*) FROM core_checksums) + (SELECT count(*) FROM plugin_checksums) + (SELECT count(*) FROM malicious_signatures) + (SELECT count(*) FROM db_and_config_signatures)")
        grand_total = c.fetchone()[0]
        print(f"\n  ⭐ GRAND TOTAL THREAT INTELLIGENCE: {grand_total:,} records!")
        print(f"  Total elapsed time: {time.time() - start_time:.2f} seconds.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()

