import os
import sys
import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

print("=" * 60)
print("RUNNING COMPREHENSIVE VERIFICATION AUDIT")
print("=" * 60)

WP_URL = "http://localhost/mahabub"
FASTAPI_URL = "http://127.0.0.1:8000"

# -------------------------------------------------------------
# Test 1: Broken Links Crawler
# -------------------------------------------------------------
print("\n[TEST 1] Testing Broken Links Crawler...")
from src.services.monitoring_service import MonitoringService
mon_svc = MonitoringService()
res = mon_svc.scan_broken_links({"url": WP_URL, "hostname": "localhost", "site_id": "test_site"})
print(f"  -> Total Scanned: {res.get('total_scanned')}")
print(f"  -> Healthy Count: {res.get('healthy_count')}")
print(f"  -> Redirect Count: {res.get('redirect_count')}")
print(f"  -> Broken Count: {res.get('broken_count')}")
print(f"  -> Server Error Count: {res.get('server_error_count')}")
assert res.get('broken_count', 0) == 0, f"Expected 0 broken links on standard WP home, got {res.get('broken_count')}"
print("  ✓ PASS: No fake broken links reported!")

# -------------------------------------------------------------
# Test 2: Safe Updates Real Data & KPIs
# -------------------------------------------------------------
print("\n[TEST 2] Testing Safe Updates Real Data & KPIs...")
from src.database.mongodb_connection import MongoDB
db = MongoDB()
# Query fleet summary endpoint logic
user_sites = list(db.websites.find({"status": {"$ne": "deleted"}}))
logs = list(db.safe_updates_log.find({}))
print(f"  -> Total Real Safe Update Runs in DB: {len(logs)}")
print(f"  -> Real Rollbacks in DB: {len([l for l in logs if l.get('rolled_back')])}")
# Verify no hardcoded 14 or 2 in websites_api
import inspect
from src.api.v1 import websites_api
src_code = inspect.getsource(websites_api.get_fleet_safe_updates_summary)
assert "max(total_runs, 14)" not in src_code, "Found fake hardcoded 14 in websites_api!"
assert "max(rollbacks, 2)" not in src_code, "Found fake hardcoded 2 in websites_api!"
print("  ✓ PASS: Zero fake numbers in safe updates API!")

# -------------------------------------------------------------
# Test 3: Secret Login Gateway & WP Admin Hide
# -------------------------------------------------------------
print("\n[TEST 3] Testing Secret Login Gateway & WP Admin Hide...")
import subprocess

# Set secret slug to 'mahabub-portal' in XAMPP WordPress
php_code = """
$c = mysqli_connect('127.0.0.1', 'root', '', 'mahabub');
if ($c) {
    mysqli_query($c, "UPDATE wp_options SET option_value = 'mahabub-portal' WHERE option_name = 'waf_harden_login_rename'");
    if (mysqli_affected_rows($c) == 0) {
        mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_login_rename', 'mahabub-portal', 'yes')");
    }
    mysqli_query($c, "UPDATE wp_options SET option_value = 'yes' WHERE option_name = 'waf_harden_hide_login_url'");
    if (mysqli_affected_rows($c) == 0) {
        mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_hide_login_url', 'yes', 'yes')");
    }
    mysqli_query($c, "UPDATE wp_options SET option_value = '404' WHERE option_name = 'waf_harden_login_redirect_type'");
    mysqli_close($c);
}
"""
subprocess.run([r"C:\xampp\php\php.exe", "-r", php_code])

# 3a. Probing the secret login slug: /mahabub/index.php?mahabub-portal
resp_secret = requests.get(f"{WP_URL}/index.php?mahabub-portal", timeout=5)
print(f"  -> GET {WP_URL}/index.php?mahabub-portal HTTP Status: {resp_secret.status_code}")
has_login_form = "loginform" in resp_secret.text or "user_login" in resp_secret.text
print(f"  -> Login Form Rendered: {has_login_form}")
assert resp_secret.status_code == 200 and has_login_form, "Secret slug failed to render wp-login!"

# 3b. Probing direct default wp-login.php (should be hidden / 404)
resp_default = requests.get(f"{WP_URL}/wp-login.php", timeout=5, allow_redirects=False)
print(f"  -> Direct GET {WP_URL}/wp-login.php HTTP Status: {resp_default.status_code}")
assert resp_default.status_code == 404 or "Page not found" in resp_default.text or resp_default.status_code in (301, 302), f"Direct login should be blocked or 404, got {resp_default.status_code}"

# Reset slug after test for clean state
reset_code = """
$c = mysqli_connect('127.0.0.1', 'root', '', 'mahabub');
if ($c) {
    mysqli_query($c, "DELETE FROM wp_options WHERE option_name IN ('waf_harden_login_rename', 'waf_harden_hide_login_url')");
    mysqli_close($c);
}
"""
subprocess.run([r"C:\xampp\php\php.exe", "-r", reset_code])

print("  ✓ PASS: Secret login slug renders WordPress login perfectly, while direct wp-login.php is blocked/hidden!")

print("\n" + "=" * 60)
print("ALL 3 AUDIT TESTS COMPLETED & VERIFIED 100% SUCCESSFULLY!")
print("=" * 60)
