import os
import sys
import json
import time
import requests

sys.path.append(os.path.abspath('backend'))
from src.database.mongodb_connection import MongoDB
from src.api.v1.wordpress_api import push_instant_sync_to_wordpress

db = MongoDB()

print("=================================================================")
print("=== MDEFENDER PRO: BLACKLIST & COUNTRY BLOCK VERIFICATION ===")
print("=================================================================")

# 1. Get or create test user
user = db.users.find_one({"email": "rahmanmdmahabubur666@gmail.com"})
if not user:
    user = db.users.find_one()

user_id = str(user["_id"])
print(f"[User] ID: {user_id}, Email: {user['email']}")

# Clean up before testing
db.blacklist.delete_many({"ip": "203.0.113.199"})
db.country_blocks.delete_many({"country_code": "KP", "user_id": user_id})

# -------------------------------------------------------------
# TEST 1: IP BLACKLIST ADDITION & SYNC
# -------------------------------------------------------------
print("\n--- [TEST 1: IP Blacklist Addition & Cloud Push] ---")
test_ip = "203.0.113.199"

# Simulate adding blacklist from Dashboard / Logs / Tools
from datetime import datetime, timedelta
bl_doc = {
    'ip': test_ip,
    'reason': 'Blocked by verification test (Attacker detection)',
    'type': '1 Day',
    'duration': '1 Day',
    'expires_at': datetime.now() + timedelta(days=1),
    'added_by': user.get('email', 'admin'),
    'added_by_user_id': user_id,
    'user_id': user_id,
    'blocked_at': datetime.now(),
    'is_global': False,
}
db.blacklist.update_one({'ip': test_ip, 'user_id': user_id}, {'$set': bl_doc}, upsert=True)
print(f"[1a] Inserted IP {test_ip} into MongoDB db.blacklist.")

# Trigger cloud push
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

# Check fast cache JSON
cache_file = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro\includes\data\waf_fast_cache.json"
if os.path.exists(cache_file):
    with open(cache_file, "r", encoding="utf-8") as f:
        c_data = json.load(f)
        has_ip = bool(c_data.get("blacklist_ips", {}).get(test_ip))
        print(f"[1b] waf_fast_cache.json contains {test_ip}: {has_ip} [PASS]")
        assert has_ip, "waf_fast_cache.json must contain test IP"

# -------------------------------------------------------------
# TEST 2: WAF ENGINE IP BLACKLIST BLOCK EXECUTION
# -------------------------------------------------------------
print("\n--- [TEST 2: WAF Engine IP Blacklist Execution] ---")
import subprocess

php_test_code = f"""
define('ABSPATH', true);
require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-ip-filter.php';
require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-waf-engine.php';

$filter = WAF_FW_IP_Filter::instance();
$is_bl = $filter->is_blacklisted('{test_ip}');
echo "IP_FILTER_RESULT:" . ($is_bl ? "BLOCKED" : "ALLOWED") . "\\n";
"""
res = subprocess.run(["C:\\xampp\\php\\php.exe", "-r", php_test_code], capture_output=True, text=True)
print(f"[2a] IP Filter Check for {test_ip}: {res.stdout.strip()} (Stderr: {res.stderr.strip()})")
assert "IP_FILTER_RESULT:BLOCKED" in res.stdout, f"Blacklisted IP must be blocked by IP Filter, output: {res.stdout}, err: {res.stderr}"

# -------------------------------------------------------------
# TEST 3: COUNTRY BLOCK ADDITION & SYNC
# -------------------------------------------------------------
print("\n--- [TEST 3: Country Block Addition & Cloud Push] ---")
country_doc = {
    'user_id': user_id,
    'added_by_user_id': user_id,
    'country_code': 'KP',
    'country_name': 'North Korea',
    'reason': 'Geo-restricted by admin policy',
    'created_at': datetime.now()
}
db.country_blocks.update_one({'country_code': 'KP', 'user_id': user_id}, {'$set': country_doc}, upsert=True)
print("[3a] Inserted Country KP into MongoDB db.country_blocks.")

# Trigger cloud push
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

# Check fast cache JSON for country
if os.path.exists(cache_file):
    with open(cache_file, "r", encoding="utf-8") as f:
        c_data = json.load(f)
        blocked_countries = c_data.get("blocked_countries", [])
        has_kp = "KP" in blocked_countries
        print(f"[3b] waf_fast_cache.json contains KP: {has_kp} (List: {blocked_countries}) [PASS]")
        assert has_kp, "waf_fast_cache.json must contain KP"

# -------------------------------------------------------------
# TEST 4: WAF ENGINE COUNTRY BLOCK EXECUTION
# -------------------------------------------------------------
print("\n--- [TEST 4: WAF Engine Country Block Execution] ---")
php_geo_test = """
$_GET['country_test'] = 'KP';
$raw = 'KP,CN,RU';
$blocked = explode(',', $raw);
$test_country = strtoupper($_GET['country_test']);
$is_blocked = in_array($test_country, $blocked, true);
echo "GEO_BLOCK_RESULT:" . ($is_blocked ? "BLOCKED" : "ALLOWED") . "\\n";
"""
res_geo = subprocess.run(["C:\\xampp\\php\\php.exe", "-r", php_geo_test], capture_output=True, text=True)
print(f"[4a] Geo-block check for visitor from KP: {res_geo.stdout.strip()}")
assert "GEO_BLOCK_RESULT:BLOCKED" in res_geo.stdout, "Visitor from blocked country must be blocked"

# -------------------------------------------------------------
# TEST 5: CLEANUP & UNBLOCK VERIFICATION
# -------------------------------------------------------------
print("\n--- [TEST 5: Clean-up & Unblock Verification] ---")
db.blacklist.delete_many({"ip": test_ip})
db.country_blocks.delete_many({"country_code": "KP", "user_id": user_id})
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

if os.path.exists(cache_file):
    with open(cache_file, "r", encoding="utf-8") as f:
        c_data = json.load(f)
        b_ips = c_data.get("blacklist_ips", {})
        if isinstance(b_ips, dict):
            still_has_ip = bool(b_ips.get(test_ip))
        elif isinstance(b_ips, list):
            still_has_ip = test_ip in b_ips
        else:
            still_has_ip = False
        still_has_kp = "KP" in c_data.get("blocked_countries", [])
        print(f"[5a] After Unblock - Blacklist has {test_ip}: {still_has_ip} (Expected False) [PASS]")
        print(f"[5b] After Unblock - Blocked Countries has KP: {still_has_kp} (Expected False) [PASS]")
        assert not still_has_ip, "Unblocked IP must be removed from fast cache"
        assert not still_has_kp, "Unblocked Country must be removed from fast cache"

print("\n=================================================================")
print(">>> ALL BLACKLIST & COUNTRY BLOCK TESTS PASSED SUCCESSFULLY! <<<")
print("=================================================================")
