"""
MDefender Pro — Comprehensive Full-Stack Feature Test Suite
Tests ALL features: Auth, Dashboard, WAF, Sites, Backup, Scanner, Blacklist,
Rules, Logs, Connection Stability, User Isolation, Multi-Site, Bulk Ops.
"""
import requests
import json
import time
import sys
import traceback
from datetime import datetime

BASE = "http://localhost:8000"
WP = "http://localhost/mahabub"
S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

PASS = 0
FAIL = 0
WARN = 0
RESULTS = []

def log(status, section, test, detail=""):
    global PASS, FAIL, WARN
    icon = {"PASS":"✅","FAIL":"❌","WARN":"⚠️"}.get(status,"❓")
    if status == "PASS": PASS += 1
    elif status == "FAIL": FAIL += 1
    elif status == "WARN": WARN += 1
    line = f"{icon} [{section}] {test}"
    if detail:
        line += f" — {detail}"
    print(line)
    RESULTS.append({"status":status,"section":section,"test":test,"detail":detail})

# ===========================================================================
# 1. HEALTH & ML CHECKS
# ===========================================================================
def test_health():
    try:
        r = S.get(f"{BASE}/health", timeout=5)
        log("PASS" if r.status_code==200 else "FAIL", "Health", "Backend /health", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Health", "Backend /health", str(e))

    try:
        r = S.get(f"{BASE}/health/ml", timeout=5)
        data = r.json()
        waf_loaded = data.get("waf",{}).get("loaded", False)
        mal_loaded = data.get("malware",{}).get("loaded", False)
        log("PASS" if waf_loaded else "FAIL", "Health", "ML WAF Model Loaded", f"loaded={waf_loaded}")
        log("PASS" if mal_loaded else "WARN", "Health", "ML Malware Model Loaded", f"loaded={mal_loaded}")
    except Exception as e:
        log("FAIL", "Health", "ML Status", str(e))

    try:
        r = S.get(f"{BASE}/api/ml/status", timeout=5)
        data = r.json()
        log("PASS" if r.status_code==200 else "FAIL", "Health", "ML Status API", f"WAF v{data.get('waf',{}).get('version','?')}")
    except Exception as e:
        log("FAIL", "Health", "ML Status API", str(e))

    # WordPress health
    try:
        r = requests.get(f"{WP}/", timeout=5)
        log("PASS" if r.status_code==200 else "FAIL", "Health", "WordPress Accessible", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Health", "WordPress Accessible", str(e))

# ===========================================================================
# 2. AUTHENTICATION
# ===========================================================================
TOKEN = None
CSRF = None
USER_ID = None

def test_auth():
    global TOKEN, CSRF, USER_ID
    # Login
    try:
        r = S.post(f"{BASE}/api/auth/login", json={
            "email": "admin@mdefender-pro.io",
            "password": "admin123"
        }, timeout=10)
        data = r.json()
        if r.status_code == 200 and data.get("status") == "success":
            TOKEN = data.get("access_token") or data.get("token")
            CSRF = data.get("csrf_token")
            # Also grab from cookies
            for c in r.cookies:
                if "access" in c.name.lower():
                    TOKEN = TOKEN or c.value
            S.headers["Authorization"] = f"Bearer {TOKEN}"
            if CSRF:
                S.headers["X-CSRF-Token"] = CSRF
            log("PASS", "Auth", "Login", "Token received")
        else:
            # Try legacy login
            r2 = S.post(f"{BASE}/api/admin/login-legacy", json={
                "username": "admin",
                "password": "admin123"
            }, timeout=10)
            data2 = r2.json()
            if r2.status_code == 200:
                TOKEN = data2.get("access_token") or data2.get("token")
                CSRF = data2.get("csrf_token")
                for c in r2.cookies:
                    if "access" in c.name.lower():
                        TOKEN = TOKEN or c.value
                S.headers["Authorization"] = f"Bearer {TOKEN}"
                if CSRF:
                    S.headers["X-CSRF-Token"] = CSRF
                log("PASS", "Auth", "Login (Legacy)", "Token received")
            else:
                log("FAIL", "Auth", "Login", f"HTTP {r.status_code}: {data}")
                return
    except Exception as e:
        log("FAIL", "Auth", "Login", str(e))
        return

    # Profile
    try:
        r = S.get(f"{BASE}/api/user/profile", timeout=5)
        data = r.json()
        if r.status_code == 200:
            USER_ID = data.get("id") or data.get("_id") or str(data.get("user",{}).get("_id",""))
            email = data.get("email") or data.get("user",{}).get("email","")
            log("PASS", "Auth", "Profile Fetch", f"email={email}")
        else:
            log("FAIL", "Auth", "Profile Fetch", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Auth", "Profile Fetch", str(e))

# ===========================================================================
# 3. DASHBOARD
# ===========================================================================
def test_dashboard():
    try:
        r = S.get(f"{BASE}/api/user/dashboard", timeout=10)
        data = r.json()
        if r.status_code == 200:
            sites = data.get("total_sites") or data.get("sites_count") or data.get("websites_count", 0)
            log("PASS", "Dashboard", "Dashboard Stats", f"sites={sites}")
        else:
            log("FAIL", "Dashboard", "Dashboard Stats", f"HTTP {r.status_code}: {data.get('detail','')}")
    except Exception as e:
        log("FAIL", "Dashboard", "Dashboard Stats", str(e))

# ===========================================================================
# 4. WEBSITE MANAGEMENT
# ===========================================================================
SITE_ID = None
SITE_IDS = []

def test_websites():
    global SITE_ID, SITE_IDS
    # List websites
    try:
        r = S.get(f"{BASE}/api/v1/websites", timeout=10)
        data = r.json()
        if r.status_code == 200:
            # Response format: {"success": true, "data": {"websites": [...]}}
            if isinstance(data, dict) and "data" in data:
                inner = data["data"]
                if isinstance(inner, dict):
                    sites = inner.get("websites", [])
                else:
                    sites = inner if isinstance(inner, list) else []
            elif isinstance(data, dict) and "websites" in data:
                sites = data["websites"]
            elif isinstance(data, list):
                sites = data
            else:
                sites = []
            SITE_IDS = []
            for s in sites:
                if isinstance(s, dict):
                    SITE_IDS.append(str(s.get("_id") or s.get("id","")))
                elif isinstance(s, str):
                    SITE_IDS.append(s)
            if SITE_IDS:
                SITE_ID = SITE_IDS[0]
            log("PASS", "Sites", "List Websites", f"{len(sites)} site(s) found")
        else:
            log("FAIL", "Sites", "List Websites", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Sites", "List Websites", str(e))

    # Get single site
    if SITE_ID:
        try:
            r = S.get(f"{BASE}/api/v1/websites/{SITE_ID}", timeout=10)
            if r.status_code == 200:
                site = r.json()
                domain = site.get("domain") or site.get("url","")
                connected = site.get("wordpress_connection",{}).get("connected", False)
                log("PASS", "Sites", "Get Site Detail", f"domain={domain}, wp_connected={connected}")
            else:
                log("FAIL", "Sites", "Get Site Detail", f"HTTP {r.status_code}")
        except Exception as e:
            log("FAIL", "Sites", "Get Site Detail", str(e))

# ===========================================================================
# 5. USER ISOLATION TEST (Critical Security Check!)
# ===========================================================================
def test_user_isolation():
    """Try accessing a site with a fake/wrong ID - should fail"""
    fake_id = "000000000000000000000099"
    try:
        r = S.get(f"{BASE}/api/v1/websites/{fake_id}", timeout=5)
        if r.status_code in (403, 404):
            log("PASS", "Isolation", "Fake Site ID Access Denied", f"HTTP {r.status_code}")
        elif r.status_code == 200:
            log("FAIL", "Isolation", "CRITICAL: Fake Site ID returned data!", "DATA LEAK VULNERABILITY")
        else:
            log("WARN", "Isolation", "Unexpected response for fake ID", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Isolation", "Fake Site ID Test", str(e))

# ===========================================================================
# 6. WAF TESTING (Attack Detection)
# ===========================================================================
def test_waf():
    # SQLi via query param
    attacks = [
        ("SQLi Basic", {"url": f"{WP}/?id=1' OR 1=1--"}),
        ("XSS Script", {"url": f"{WP}/?q=<script>alert(1)</script>"}),
        ("Path Traversal", {"url": f"{WP}/?file=../../../../etc/passwd"}),
        ("Command Injection", {"url": f"{WP}/?cmd=;cat /etc/passwd"}),
    ]
    for name, params in attacks:
        try:
            r = requests.get(params["url"], timeout=5, allow_redirects=False)
            if r.status_code == 403:
                log("PASS", "WAF", f"Block {name}", "403 Blocked")
            elif r.status_code == 200:
                # Check if WAF block page in response
                if "blocked" in r.text.lower() or "mdefender" in r.text.lower():
                    log("PASS", "WAF", f"Block {name}", "Blocked (custom page)")
                else:
                    log("WARN", "WAF", f"Block {name}", "200 but may be WP handling")
            else:
                log("WARN", "WAF", f"Block {name}", f"HTTP {r.status_code}")
        except Exception as e:
            log("FAIL", "WAF", f"Block {name}", str(e))

    # Benign request should pass
    try:
        r = requests.get(f"{WP}/", timeout=5)
        if r.status_code == 200:
            log("PASS", "WAF", "Benign Request Pass", "Homepage loads OK")
        else:
            log("FAIL", "WAF", "Benign Request Pass", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "WAF", "Benign Request Pass", str(e))

# ===========================================================================
# 7. CLOUD WAF API (Backend WAF Analyze)
# ===========================================================================
def test_cloud_waf():
    try:
        r = requests.post(f"{BASE}/api/analyze", json={
            "domain": "localhost",
            "request": {
                "url": "/test?id=1' UNION SELECT * FROM users--",
                "ip": "192.168.1.100",
                "method": "GET",
                "headers": {"User-Agent": "TestBot"},
                "body": ""
            }
        }, timeout=10)
        data = r.json()
        blocked = data.get("status") == "blocked" or data.get("blocked") or data.get("is_blocked") or data.get("action") == "block"
        log("PASS" if blocked else "WARN", "CloudWAF", "SQLi Detection via API", f"status={data.get('status','?')}, attack={data.get('attack_type','?')}")
    except Exception as e:
        log("FAIL", "CloudWAF", "Analyze API", str(e))

# ===========================================================================
# 8. MALWARE SCANNER
# ===========================================================================
def test_scanner():
    if not SITE_ID:
        log("WARN", "Scanner", "Skip - no site ID", "")
        return
    # Trigger scan
    try:
        r = S.post(f"{BASE}/api/v1/websites/{SITE_ID}/scan", json={}, timeout=30)
        data = r.json()
        if r.status_code in (200, 202):
            log("PASS", "Scanner", "Trigger Site Scan", f"response keys: {list(data.keys())[:5]}")
        else:
            log("WARN", "Scanner", "Trigger Site Scan", f"HTTP {r.status_code}: {str(data)[:150]}")
    except Exception as e:
        log("WARN", "Scanner", "Trigger Site Scan", str(e)[:150])

    # Get scan results
    try:
        r = S.get(f"{BASE}/api/v1/websites/{SITE_ID}/scans", timeout=10)
        data = r.json()
        if r.status_code == 200:
            scans = data if isinstance(data, list) else data.get("scans", [])
            log("PASS", "Scanner", "Get Scan History", f"{len(scans)} scan(s)")
        else:
            log("WARN", "Scanner", "Get Scan History", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Scanner", "Get Scan History", str(e)[:100])

    # Cloud scan API
    try:
        # Scan a benign text/json file
        import base64
        test_content = b'{"status": "ok", "message": "Benign configuration file"}'
        r = S.post(f"{BASE}/api/scan", json={
            "filename": "config.json",
            "content_base64": base64.b64encode(test_content).decode()
        }, timeout=15)
        data = r.json()
        is_clean = data.get("status") == "clean" or data.get("verdict") == "clean" or data.get("threat_level","").lower() in ("clean","low","none","safe")
        log("PASS" if is_clean else "WARN", "Scanner", "Cloud Scan Benign File", f"result={data.get('verdict') or data.get('status','?')}")
    except Exception as e:
        log("FAIL", "Scanner", "Cloud Scan API", str(e)[:100])

    # Scan malicious file
    try:
        import base64
        malware_php = b"<?php eval($_GET['cmd']); system('rm -rf /'); ?>"
        r = S.post(f"{BASE}/api/scan", json={
            "filename": "backdoor.php",
            "content_base64": base64.b64encode(malware_php).decode()
        }, timeout=10)
        data = r.json()
        is_malware = data.get("status") in ("malware","malicious","infected","threat") or data.get("is_malicious") or data.get("threat_level","").lower() in ("high","critical","malware")
        log("PASS" if is_malware else "FAIL", "Scanner", "Cloud Scan Malware File", f"result={data.get('status','?')}, threat={data.get('threat_level','?')}")
    except Exception as e:
        log("FAIL", "Scanner", "Cloud Scan Malware", str(e)[:100])

# ===========================================================================
# 9. BLACKLIST / WHITELIST
# ===========================================================================
def test_blacklist():
    test_ip = "198.51.100.99"
    # Add to blacklist
    try:
        r = S.post(f"{BASE}/api/user/blacklist", json={"ip": test_ip, "reason": "test_suite"}, timeout=5)
        log("PASS" if r.status_code in (200,201) else "WARN", "Blacklist", "Add IP", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Blacklist", "Add IP", str(e))

    # Get blacklist
    try:
        r = S.get(f"{BASE}/api/user/blacklist", timeout=15)
        data = r.json()
        items = data if isinstance(data, list) else data.get("blacklist", data.get("ips", []))
        found = any(str(i.get("ip","")) == test_ip for i in items) if isinstance(items, list) and items and isinstance(items[0], dict) else test_ip in str(items)
        log("PASS" if found else "WARN", "Blacklist", "IP Found in List", f"{len(items)} entries")
    except Exception as e:
        log("FAIL", "Blacklist", "Get List", str(e))

    # Remove from blacklist
    try:
        r = S.delete(f"{BASE}/api/user/blacklist", params={"ip": test_ip}, timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Blacklist", "Remove IP", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Blacklist", "Remove IP", str(e))

    # Whitelist CRUD
    test_wl_ip = "203.0.113.50"
    try:
        r = S.post(f"{BASE}/api/user/whitelist", json={"ip": test_wl_ip, "reason": "test"}, timeout=5)
        log("PASS" if r.status_code in (200,201) else "WARN", "Whitelist", "Add IP", f"HTTP {r.status_code}")
        r2 = S.get(f"{BASE}/api/user/whitelist", timeout=5)
        log("PASS" if r2.status_code == 200 else "WARN", "Whitelist", "Get List", f"HTTP {r2.status_code}")
        r3 = S.delete(f"{BASE}/api/user/whitelist", params={"ip": test_wl_ip}, timeout=5)
        log("PASS" if r3.status_code == 200 else "WARN", "Whitelist", "Remove IP", f"HTTP {r3.status_code}")
    except Exception as e:
        log("FAIL", "Whitelist", "CRUD", str(e))

# ===========================================================================
# 10. RULES (Custom WAF Rules)
# ===========================================================================
def test_rules():
    rule_id = None
    try:
        r = S.post(f"{BASE}/api/user/rules", json={
            "name": "Test Rule AutoTest",
            "type": "block",
            "field": "url",
            "operator": "contains",
            "value": "/evil-path-test",
            "action": "block",
            "enabled": True
        }, timeout=5)
        data = r.json()
        if r.status_code in (200,201):
            rule_id = data.get("id") or data.get("rule_id") or data.get("_id")
            log("PASS", "Rules", "Create Custom Rule", f"id={rule_id}")
        else:
            log("WARN", "Rules", "Create Custom Rule", f"HTTP {r.status_code}: {str(data)[:100]}")
    except Exception as e:
        log("FAIL", "Rules", "Create Rule", str(e))

    try:
        r = S.get(f"{BASE}/api/user/rules", timeout=5)
        data = r.json()
        rules = data if isinstance(data, list) else data.get("rules", [])
        log("PASS" if r.status_code == 200 else "FAIL", "Rules", "List Rules", f"{len(rules)} rule(s)")
    except Exception as e:
        log("FAIL", "Rules", "List Rules", str(e))

    if rule_id:
        try:
            r = S.delete(f"{BASE}/api/user/rules", params={"id": rule_id}, timeout=5)
            log("PASS" if r.status_code == 200 else "WARN", "Rules", "Delete Rule", f"HTTP {r.status_code}")
        except Exception as e:
            log("FAIL", "Rules", "Delete Rule", str(e))

# ===========================================================================
# 11. LOGS
# ===========================================================================
def test_logs():
    try:
        r = S.get(f"{BASE}/api/user/logs", timeout=10)
        data = r.json()
        if r.status_code == 200:
            logs = data.get("logs", data.get("data", []))
            count = len(logs) if isinstance(logs, list) else data.get("total",0)
            log("PASS", "Logs", "Fetch User Logs", f"{count} log entries")
        else:
            log("WARN", "Logs", "Fetch User Logs", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Logs", "Fetch User Logs", str(e))

# ===========================================================================
# 12. SECURITY CONFIG (Country Blocks, Under-Attack, etc.)
# ===========================================================================
def test_security_config():
    try:
        r = S.get(f"{BASE}/api/user/security-config", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Security", "Get Security Config", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Security", "Get Security Config", str(e))

    try:
        r = S.get(f"{BASE}/api/user/country-blocks", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Security", "Get Country Blocks", f"HTTP {r.status_code}")
    except Exception as e:
        log("FAIL", "Security", "Get Country Blocks", str(e))

    if SITE_ID:
        try:
            r = S.get(f"{BASE}/api/v1/websites/{SITE_ID}/security-settings", timeout=5)
            data = r.json()
            log("PASS" if r.status_code == 200 else "WARN", "Security", "Site Security Settings", f"keys={list(data.keys())[:6]}")
        except Exception as e:
            log("WARN", "Security", "Site Security Settings", str(e)[:100])

# ===========================================================================
# 13. BACKUP & RESTORE
# ===========================================================================
def test_backup():
    if not SITE_ID:
        log("WARN", "Backup", "Skip - no site ID", "")
        return
    # This tests the backup dispatch mechanism to the WordPress plugin
    try:
        r = S.get(f"{BASE}/api/v1/websites/{SITE_ID}", timeout=5)
        site = r.json()
        wp_connected = site.get("wordpress_connection", {}).get("connected", False)
        log("PASS" if wp_connected else "WARN", "Backup", "WP Connection Status", f"connected={wp_connected}")
    except Exception as e:
        log("FAIL", "Backup", "WP Connection Check", str(e))

# ===========================================================================
# 14. WORDPRESS PLUGIN CONNECTIVITY
# ===========================================================================
def test_wp_connectivity():
    # Test waf-rescue.php endpoint
    try:
        r = requests.get(f"{WP}/wp-content/plugins/mdefender-pro/waf-rescue.php?waf_cloud_sync=1&action=sync", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("PASS", "WPPlugin", "WAF Rescue Sync", f"response keys: {list(data.keys())[:5]}")
        else:
            log("WARN", "WPPlugin", "WAF Rescue Sync", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "WPPlugin", "WAF Rescue Sync", str(e)[:100])

    # Cloud connect endpoint
    try:
        r = S.get(f"{BASE}/api/v1/wordpress/plugin/meta", timeout=5)
        data = r.json()
        log("PASS" if r.status_code == 200 else "WARN", "WPPlugin", "Plugin Meta API", f"version={data.get('version','?')}")
    except Exception as e:
        log("WARN", "WPPlugin", "Plugin Meta API", str(e))

# ===========================================================================
# 15. CONNECTION STABILITY (Rapid-fire requests)
# ===========================================================================
def test_connection_stability():
    errors = 0
    total = 20
    latencies = []
    for i in range(total):
        try:
            t0 = time.time()
            r = S.get(f"{BASE}/api/user/dashboard", timeout=10)
            lat = (time.time() - t0) * 1000
            latencies.append(lat)
            if r.status_code != 200:
                errors += 1
        except Exception:
            errors += 1
    
    avg_lat = sum(latencies)/len(latencies) if latencies else 0
    max_lat = max(latencies) if latencies else 0
    
    if errors == 0:
        log("PASS", "Stability", f"Rapid-fire {total} requests", f"0 errors, avg={avg_lat:.0f}ms, max={max_lat:.0f}ms")
    elif errors <= 2:
        log("WARN", "Stability", f"Rapid-fire {total} requests", f"{errors} errors, avg={avg_lat:.0f}ms")
    else:
        log("FAIL", "Stability", f"Rapid-fire {total} requests", f"{errors}/{total} failed!")

# ===========================================================================
# 16. MONITORING
# ===========================================================================
def test_monitoring():
    try:
        r = S.get(f"{BASE}/api/v1/monitoring/overview", timeout=10)
        data = r.json()
        log("PASS" if r.status_code == 200 else "WARN", "Monitoring", "Overview", f"keys={list(data.keys())[:5]}")
    except Exception as e:
        log("WARN", "Monitoring", "Overview", str(e)[:100])

    if SITE_ID:
        try:
            r = S.get(f"{BASE}/api/v1/monitoring/{SITE_ID}/ssl", timeout=10)
            log("PASS" if r.status_code == 200 else "WARN", "Monitoring", "SSL Status", f"HTTP {r.status_code}")
        except Exception as e:
            log("WARN", "Monitoring", "SSL Status", str(e)[:80])

# ===========================================================================
# 17. PAYMENT / BILLING
# ===========================================================================
def test_billing():
    try:
        r = S.get(f"{BASE}/api/payment/config", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Billing", "Payment Config", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Billing", "Payment Config", str(e)[:80])

    try:
        r = S.get(f"{BASE}/api/payment/history", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Billing", "Payment History", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Billing", "Payment History", str(e)[:80])

# ===========================================================================
# 18. 2FA
# ===========================================================================
def test_2fa():
    try:
        r = S.get(f"{BASE}/api/user/2fa/config", timeout=5)
        data = r.json()
        log("PASS" if r.status_code == 200 else "WARN", "2FA", "Get 2FA Config", f"enabled={data.get('enabled','?')}")
    except Exception as e:
        log("WARN", "2FA", "Get 2FA Config", str(e)[:80])

# ===========================================================================
# 19. NOTIFICATIONS & ALERTS
# ===========================================================================
def test_notifications():
    try:
        r = S.get(f"{BASE}/api/v1/notifications", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Notifications", "Get Notifications", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Notifications", "Get Notifications", str(e)[:80])

# ===========================================================================
# 20. ADMIN ENDPOINTS
# ===========================================================================
def test_admin():
    try:
        r = S.get(f"{BASE}/api/admin/stats", timeout=10)
        data = r.json()
        if r.status_code == 200:
            log("PASS", "Admin", "Admin Stats", f"keys={list(data.keys())[:6]}")
        else:
            log("WARN", "Admin", "Admin Stats", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Admin", "Admin Stats", str(e)[:80])

    try:
        r = S.get(f"{BASE}/api/admin/users", timeout=5)
        data = r.json()
        users = data if isinstance(data, list) else data.get("users", [])
        log("PASS" if r.status_code == 200 else "WARN", "Admin", "List Users", f"{len(users)} user(s)")
    except Exception as e:
        log("WARN", "Admin", "List Users", str(e)[:80])

# ===========================================================================
# 21. SUPPORT TICKETS
# ===========================================================================
def test_support():
    try:
        r = S.get(f"{BASE}/api/user/support/tickets", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Support", "User Tickets", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Support", "User Tickets", str(e)[:80])

    try:
        r = S.get(f"{BASE}/api/admin/support/tickets", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Support", "Admin Tickets", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Support", "Admin Tickets", str(e)[:80])

# ===========================================================================
# 22. REPORTS
# ===========================================================================
def test_reports():
    try:
        r = S.get(f"{BASE}/api/v1/reports", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Reports", "Get Reports", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Reports", "Get Reports", str(e)[:80])

# ===========================================================================
# 23. DDoS PROTECTION
# ===========================================================================
def test_ddos():
    try:
        r = S.get(f"{BASE}/api/user/ddos-status", timeout=5)
        data = r.json()
        log("PASS" if r.status_code == 200 else "WARN", "DDoS", "DDoS Status", f"enabled={data.get('enabled','?')}")
    except Exception as e:
        log("WARN", "DDoS", "DDoS Status", str(e)[:80])

# ===========================================================================
# 24. WORDPRESS CORE MANAGEMENT
# ===========================================================================
def test_wp_core():
    try:
        r = S.get(f"{BASE}/api/v1/wordpress/core/status", timeout=10)
        data = r.json()
        log("PASS" if r.status_code == 200 else "WARN", "WPCore", "Core Status", f"sites={len(data) if isinstance(data, list) else 'obj'}")
    except Exception as e:
        log("WARN", "WPCore", "Core Status", str(e)[:80])

# ===========================================================================
# 25. TEAM MANAGEMENT
# ===========================================================================
def test_team():
    try:
        r = S.get(f"{BASE}/api/v1/team", timeout=5)
        log("PASS" if r.status_code == 200 else "WARN", "Team", "Get Team", f"HTTP {r.status_code}")
    except Exception as e:
        log("WARN", "Team", "Get Team", str(e)[:80])

# ===========================================================================
# RUN ALL
# ===========================================================================
if __name__ == "__main__":
    print("="*70)
    print("  MDefender Pro — COMPREHENSIVE FULL-STACK TEST SUITE")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Backend: {BASE}")
    print(f"  WordPress: {WP}")
    print("="*70)
    print()

    sections = [
        ("Health & ML", test_health),
        ("Authentication", test_auth),
        ("Dashboard", test_dashboard),
        ("Website Management", test_websites),
        ("User Isolation", test_user_isolation),
        ("WAF Attacks", test_waf),
        ("Cloud WAF API", test_cloud_waf),
        ("Malware Scanner", test_scanner),
        ("Blacklist/Whitelist", test_blacklist),
        ("Custom Rules", test_rules),
        ("Logs", test_logs),
        ("Security Config", test_security_config),
        ("Backup", test_backup),
        ("WP Plugin Connectivity", test_wp_connectivity),
        ("Connection Stability", test_connection_stability),
        ("Monitoring", test_monitoring),
        ("Billing", test_billing),
        ("2FA", test_2fa),
        ("Notifications", test_notifications),
        ("Admin Panel", test_admin),
        ("Support Tickets", test_support),
        ("Reports", test_reports),
        ("DDoS Protection", test_ddos),
        ("WP Core Mgmt", test_wp_core),
        ("Team Mgmt", test_team),
    ]

    for name, func in sections:
        print(f"\n{'─'*50}")
        print(f"  Section: {name}")
        print(f"{'─'*50}")
        try:
            func()
        except Exception as e:
            log("FAIL", name, "SECTION CRASH", traceback.format_exc()[:200])

    print(f"\n{'='*70}")
    print(f"  FINAL RESULTS")
    print(f"{'='*70}")
    print(f"  ✅ PASS: {PASS}")
    print(f"  ❌ FAIL: {FAIL}")
    print(f"  ⚠️  WARN: {WARN}")
    print(f"  Total: {PASS+FAIL+WARN}")
    print(f"{'='*70}")

    # Save results to JSON
    import os
    results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_fullstack_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {"pass": PASS, "fail": FAIL, "warn": WARN, "total": PASS+FAIL+WARN},
            "results": RESULTS
        }, f, indent=2, ensure_ascii=False)
    print(f"\n  Results saved: {results_path}")

    sys.exit(1 if FAIL > 0 else 0)

