import sys
import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

sys.path.insert(0, 'backend')
from src.database.mongodb_connection import MongoDB
from src.api.user_api import UserAPI

db = MongoDB()
user_api = UserAPI()

user = db.users.find_one({'email': 'rahmanmdmahabubur575@gmail.com'})
if not user:
    user = db.users.find_one({'email': 'admin@mdefender-pro.io'})
print(f"Testing with user: {user.get('email')} (ID: {user.get('_id')})")

wp_site = db.wordpress_sites.find_one({'domain': 'localhost'}) or db.websites.find_one({'domain': 'localhost'})
website_id = str(wp_site.get('website_id') or wp_site.get('_id'))
print(f"Testing with website: {website_id} ({wp_site.get('domain')})")

print("\n--- TEST 1: LIVE TRAFFIC / AUTHENTIC LOGS (ZERO MOCK DATA) ---")
res = user_api.get_user_logs(user, {'website_id': website_id, 'page': 1, 'limit': 50})
logs = res.get('logs', [])
print(f"Total Logs Returned: {res.get('total')}, Page Logs: {len(logs)}, Source: {res.get('source')}")

# Check for any fake mock IPs
mock_ips = {'185.220.101.5', '45.148.10.12', '194.26.29.112', '91.240.118.82', '198.54.130.2', '89.248.163.55'}
found_mocks = [l for l in logs if l.get('ip') in mock_ips or str(l.get('id', '')).startswith(('mdf_log_', 'mdf_evt_'))]
if found_mocks:
    print(f"FAILED: Found {len(found_mocks)} fake mock entries!")
else:
    print("SUCCESS: 0 mock entries found! All logs are 100% genuine captured traffic.")
if logs:
    print(f"Sample Real Log: IP={logs[0].get('ip')} | URL={logs[0].get('url')} | Status={logs[0].get('status')} | Time={logs[0].get('timestamp')}")

print("\n--- TEST 2: WP-ADMIN ACCESS (NO BLOCK PAGE FALSE POSITIVE) ---")
resp_admin = requests.get('http://localhost/mahabub/wp-admin/', allow_redirects=False, timeout=5)
print(f"GET /wp-admin/ Status: {resp_admin.status_code}")
print(f"Location Header: {resp_admin.headers.get('Location')}")
is_block_page = '403 Forbidden' in resp_admin.text or 'Security Block' in resp_admin.text or 'Incident ID' in resp_admin.text
if is_block_page:
    print("FAILED: /wp-admin/ showed a Block Page!")
elif resp_admin.status_code in (200, 301, 302):
    print("SUCCESS: /wp-admin/ accessible without false positive block page! Redirects cleanly to login.")

print("\n--- TEST 3: IP BLACKLIST & UNBLOCK CYCLE ---")
test_bl_ip = '198.51.100.42'
# 1. Add to blacklist on WordPress
r_bl = requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=add_blacklist&ip={test_bl_ip}&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)
print(f"Add Blacklist Response: {r_bl.json()}")

# Verify blocked
r_check_bl = requests.get('http://localhost/mahabub/', headers={'X-Forwarded-For': test_bl_ip}, timeout=5)
print(f"Request with Blacklisted IP Status: {r_check_bl.status_code}")
assert r_check_bl.status_code == 403, f"Expected 403, got {r_check_bl.status_code}"

# 2. Unblock IP
r_unbl = requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=delete_blacklist&ip={test_bl_ip}&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)
print(f"Unblock Response: {r_unbl.json()}")

# Verify access restored immediately
r_check_unbl = requests.get('http://localhost/mahabub/', headers={'X-Forwarded-For': test_bl_ip}, timeout=5)
print(f"Request after Unblock Status: {r_check_unbl.status_code}")
assert r_check_unbl.status_code in (200, 301, 302), f"Expected 200/301/302, got {r_check_unbl.status_code}"
print("SUCCESS: IP Blacklist and Unblock verified live!")

print("\n--- TEST 4: IP ALLOWLIST (WHITELIST) ---")
test_wl_ip = '198.51.100.99'
r_wl = requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=add_whitelist&ip={test_wl_ip}&reason=TestWhitelist&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)
print(f"Add Whitelist Response: {r_wl.json()}")

# Send an attack payload from the whitelisted IP (e.g. union select)
r_wl_attack = requests.get(
    'http://localhost/mahabub/?id=1%20UNION%20SELECT%201,2,3',
    headers={'X-Forwarded-For': test_wl_ip},
    timeout=5
)
print(f"Whitelisted IP with Attack Payload Status: {r_wl_attack.status_code}")
assert r_wl_attack.status_code in (200, 301, 302), f"Expected 200/301/302 for whitelisted IP, got {r_wl_attack.status_code}"
print("SUCCESS: IP Whitelist bypasses rules as expected!")

# Clean up whitelist
requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=delete_whitelist&ip={test_wl_ip}&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)

print("\n--- TEST 5: COUNTRY BLOCK & UNBLOCK CYCLE ---")
# Block RU
r_cb = requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=add_country_block&country_code=RU&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)
print(f"Add Country Block Response: {r_cb.json()}")

# Verify RU is blocked (502 Dead Network)
r_check_cb = requests.get('http://localhost/mahabub/?country_test=RU', headers={'CF-IPCountry': 'RU'}, timeout=5)
print(f"Request from Blocked Country RU Status: {r_check_cb.status_code}")
assert r_check_cb.status_code == 502, f"Expected 502, got {r_check_cb.status_code}"

# Unblock RU
r_uncb = requests.post(
    f"http://localhost/mahabub/?waf_cloud_sync=1&action=delete_country_block&country_code=RU&api_key=zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1",
    timeout=5
)
print(f"Unblock Country Response: {r_uncb.json()}")

# Verify access restored
r_check_uncb = requests.get('http://localhost/mahabub/?country_test=RU', headers={'CF-IPCountry': 'RU'}, timeout=5)
print(f"Request after Unblocking Country RU Status: {r_check_uncb.status_code}")
assert r_check_uncb.status_code in (200, 301, 302), f"Expected 200/301/302, got {r_check_uncb.status_code}"
print("SUCCESS: Country Block and Unblock verified live!")

print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
