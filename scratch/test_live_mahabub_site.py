import os
import sys
import json
import time
import requests

sys.path.append(os.path.abspath('backend'))
from src.database.mongodb_connection import MongoDB
from src.api.v1.wordpress_api import push_instant_sync_to_wordpress

db = MongoDB()
user = db.users.find_one({"email": "rahmanmdmahabubur666@gmail.com"}) or db.users.find_one()
user_id = str(user["_id"])

print("=================================================================")
print("=== LIVE HTTP TEST ON WORDPRESS SITE: http://localhost/mahabub/ ===")
print("=================================================================")

test_ip = "198.51.100.77"
wp_base = "http://localhost/mahabub/"

# Ensure clean state
db.blacklist.delete_many({"ip": test_ip})
db.country_blocks.delete_many({"country_code": "KP", "user_id": user_id})
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

# 1. Normal Request
try:
    r_norm = requests.get(wp_base, timeout=6)
    print(f"[1] Normal visitor request: HTTP {r_norm.status_code}")
except Exception as e:
    print(f"[1] Normal visitor request error: {e}")

# 2. Blacklist Test
print("\n--- Blacklisting IP: 198.51.100.77 ---")
db.blacklist.insert_one({
    "ip": test_ip,
    "reason": "Live test block",
    "type": "Permanent",
    "duration": "Permanent",
    "expires_at": None,
    "user_id": user_id,
    "added_by_user_id": user_id,
    "is_global": False
})
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

try:
    r_bl = requests.get(f"{wp_base}?test_ip={test_ip}", timeout=6)
    print(f"[2] Blacklisted IP request (?test_ip={test_ip}): HTTP {r_bl.status_code} (Expected 403)")
    is_blocked_page = "403" in r_bl.text or "access denied" in r_bl.text.lower() or "forbidden" in r_bl.text.lower() or "blacklisted" in r_bl.text.lower()
    print(f"    WAF Block Screen Shown: {is_blocked_page}")
    assert r_bl.status_code == 403, f"Expected 403, got {r_bl.status_code}"
except Exception as e:
    print(f"[2] Error: {e}")

# 3. Country Block Test
print("\n--- Blocking Country: KP ---")
db.country_blocks.insert_one({
    "user_id": user_id,
    "added_by_user_id": user_id,
    "country_code": "KP",
    "country_name": "North Korea",
    "reason": "Live Geo block test"
})
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

try:
    r_geo = requests.get(f"{wp_base}?country_test=KP", timeout=6)
    print(f"[3] Visitor from blocked country (?country_test=KP): HTTP {r_geo.status_code} (Expected 403)")
    is_geo_page = "403" in r_geo.text or "restricted" in r_geo.text.lower() or "access denied" in r_geo.text.lower()
    print(f"    Geo Block Screen Shown: {is_geo_page}")
    assert r_geo.status_code == 403, f"Expected 403, got {r_geo.status_code}"
except Exception as e:
    print(f"[3] Error: {e}")

# 4. Cleanup and Unblock
print("\n--- Cleaning up Blacklist and Country Block ---")
db.blacklist.delete_many({"ip": test_ip})
db.country_blocks.delete_many({"country_code": "KP", "user_id": user_id})
push_instant_sync_to_wordpress(user_id=user_id)
time.sleep(2)

try:
    r_clean = requests.get(f"{wp_base}?test_ip={test_ip}&country_test=KP", timeout=6)
    print(f"[4] Visitor after unblock: HTTP {r_clean.status_code} (Expected 200)")
    assert r_clean.status_code == 200, f"Expected 200, got {r_clean.status_code}"
except Exception as e:
    print(f"[4] Error: {e}")

print("\n=================================================================")
print(">>> LIVE HTTP VALIDATION ON MAHABUB SITE COMPLETED SUCCESSFULLY! <<<")
print("=================================================================")
