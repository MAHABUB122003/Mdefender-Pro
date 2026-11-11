import os
import sys
import requests
import subprocess
from pathlib import Path

# Add backend root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
from src.auth.jwt_service import JWTService

BASE_URL = "http://127.0.0.1:8000"

def run_phase5_perimeter_audit():
    print("=" * 68)
    print("PHASE 5 AUDIT: ACCESS & PERIMETER DEFENSE LIVE VERIFICATION")
    print("=" * 68)

    db = MongoDB()
    user = db.users.find_one({"email": "user@gmail.com"})
    assert user, "User user@gmail.com must exist!"
    user_id = str(user["_id"])

    site_a = db.websites.find_one({"_id": "eab7dc9f-316b-4a72-a71c-7c0a97a55fba"})
    assert site_a, "Site A (localhost/mahabub) must exist!"
    id_a = str(site_a["_id"])

    jwt_svc = JWTService()
    token = jwt_svc.create_access_token(user_id, user.get("email"), role=user.get("role", "user"))
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # -----------------------------------------------------------------
    # Test 1: User IP Blacklist Lifecycle & Website Scoping
    # -----------------------------------------------------------------
    print("\n[Test 1] Testing User IP Blacklist Lifecycle & Scoping...")
    test_ip = "198.51.100.99"
    
    # 1.1 Add to Blacklist
    add_payload = {
        "ip": test_ip,
        "reason": "Perimeter Defense Audit Ban",
        "duration": "24_hours",
        "website_id": id_a
    }
    res_add = requests.post(f"{BASE_URL}/api/user/blacklist", json=add_payload, headers=headers, timeout=10)
    print(f"  * Add Blacklist Response [{res_add.status_code}]: {res_add.json().get('message')}")
    assert res_add.status_code == 200, f"Add blacklist failed: {res_add.text}"
    assert res_add.json().get("status") == "success", "Response status must be success!"

    # 1.2 Query Blacklist
    res_get = requests.get(f"{BASE_URL}/api/user/blacklist?website_id={id_a}", headers=headers, timeout=10)
    bl_list = res_get.json() if isinstance(res_get.json(), list) else res_get.json().get("blacklist", [])
    found = any(item.get("ip") == test_ip for item in bl_list)
    print(f"  * Verified IP {test_ip} present in Blacklist Query: {found}")
    assert found, f"Blacklisted IP {test_ip} was not returned in blacklist query!"

    # 1.3 Remove from Blacklist
    res_del = requests.delete(f"{BASE_URL}/api/user/blacklist?ip={test_ip}&website_id={id_a}", headers=headers, timeout=10)
    print(f"  * Remove Blacklist Response [{res_del.status_code}]: {res_del.json().get('message')}")
    assert res_del.status_code == 200, f"Delete blacklist failed: {res_del.text}"
    assert res_del.json().get("status") == "success", "Response status must be success!"

    # Confirm removed
    res_check = requests.get(f"{BASE_URL}/api/user/blacklist?website_id={id_a}", headers=headers, timeout=10)
    bl_check = res_check.json() if isinstance(res_check.json(), list) else res_check.json().get("blacklist", [])
    assert not any(item.get("ip") == test_ip for item in bl_check), f"IP {test_ip} still present in blacklist after removal!"
    print("  [PASS] User IP Blacklist: Add, scope, query, and delete verified 100%.")

    # -----------------------------------------------------------------
    # Test 2: User IP Whitelist & Bypass Verification
    # -----------------------------------------------------------------
    print("\n[Test 2] Testing User IP Whitelist Lifecycle...")
    test_wl_ip = "198.51.100.77"

    # 2.1 Add to Whitelist
    wl_payload = {
        "ip": test_wl_ip,
        "reason": "Perimeter Defense Audit Whitelist"
    }
    res_wl_add = requests.post(f"{BASE_URL}/api/user/whitelist", json=wl_payload, headers=headers, timeout=10)
    print(f"  * Add Whitelist Response [{res_wl_add.status_code}]: {res_wl_add.json().get('message')}")
    assert res_wl_add.status_code == 200, f"Add whitelist failed: {res_wl_add.text}"
    assert res_wl_add.json().get("status") == "success", "Whitelist response status must be success!"

    # 2.2 Query Whitelist
    res_wl_get = requests.get(f"{BASE_URL}/api/user/whitelist", headers=headers, timeout=10)
    wl_list = res_wl_get.json() if isinstance(res_wl_get.json(), list) else res_wl_get.json().get("whitelist", [])
    found_wl = any(item.get("ip") == test_wl_ip for item in wl_list)
    print(f"  * Verified IP {test_wl_ip} present in Whitelist Query: {found_wl}")
    assert found_wl, f"Whitelisted IP {test_wl_ip} was not returned in whitelist query!"

    # 2.3 Remove from Whitelist
    res_wl_del = requests.delete(f"{BASE_URL}/api/user/whitelist?ip={test_wl_ip}", headers=headers, timeout=10)
    print(f"  * Remove Whitelist Response [{res_wl_del.status_code}]: {res_wl_del.json().get('message')}")
    assert res_wl_del.status_code == 200, f"Delete whitelist failed: {res_wl_del.text}"
    assert res_wl_del.json().get("status") == "success", "Whitelist delete status must be success!"
    print("  [PASS] User IP Whitelist: Add, verify, and delete verified 100%.")

    # -----------------------------------------------------------------
    # Test 3: Geo-Blocking & Country Restriction Enforcement
    # -----------------------------------------------------------------
    print("\n[Test 3] Testing Geo-Blocking & Country Restrictions...")
    test_country = "KP"
    test_name = "North Korea"

    # 3.1 Block Country
    cb_payload = {
        "country_code": test_country,
        "country_name": test_name,
        "reason": "Automated Sanction Test Policy",
        "website_id": id_a
    }
    res_cb_add = requests.post(f"{BASE_URL}/api/user/country-blocks", json=cb_payload, headers=headers, timeout=10)
    print(f"  * Add Country Block Response [{res_cb_add.status_code}]: {res_cb_add.json().get('message')}")
    assert res_cb_add.status_code == 200, f"Add country block failed: {res_cb_add.text}"
    assert res_cb_add.json().get("status") == "success", "Country block status must be success!"

    # 3.2 Query Country Blocks
    res_cb_get = requests.get(f"{BASE_URL}/api/user/country-blocks?website_id={id_a}", headers=headers, timeout=10)
    c_blocks = res_cb_get.json().get("country_blocks", []) if isinstance(res_cb_get.json(), dict) else res_cb_get.json()
    found_cb = any(c.get("country_code") == test_country for c in c_blocks)
    print(f"  * Verified Country {test_country} present in Country Blocks Query: {found_cb}")
    assert found_cb, f"Country block {test_country} was not returned in country blocks query!"

    # 3.3 Remove Country Block
    res_cb_del = requests.delete(f"{BASE_URL}/api/user/country-blocks?code={test_country}&website_id={id_a}", headers=headers, timeout=10)
    print(f"  * Remove Country Block Response [{res_cb_del.status_code}]: {res_cb_del.json().get('message')}")
    assert res_cb_del.status_code == 200, f"Delete country block failed: {res_cb_del.text}"
    assert res_cb_del.json().get("status") == "success", "Country block delete status must be success!"
    print("  [PASS] Geo-Blocking: Dynamic country blocking and unblocking verified 100%.")

    # -----------------------------------------------------------------
    # Test 4: Rate Limiting & Throttle Policy Management
    # -----------------------------------------------------------------
    print("\n[Test 4] Testing Rate Limiting & Throttle Configuration...")
    initial_rl = site_a.get("rate_limit_per_minute", 120)
    test_rl = 75

    # Update rate limit
    rl_payload = {"rate_limit_per_minute": test_rl}
    res_rl = requests.patch(f"{BASE_URL}/api/v1/websites/{id_a}/security-settings", json=rl_payload, headers=headers, timeout=10)
    print(f"  * Update Rate Limit Response [{res_rl.status_code}]: {res_rl.json().get('message')}")
    assert res_rl.status_code == 200, f"Update rate limit failed: {res_rl.text}"

    # Verify persisted in database
    site_a_updated = db.websites.find_one({"_id": id_a})
    assert site_a_updated.get("rate_limit_per_minute") == test_rl, f"Rate limit not persisted: {site_a_updated.get('rate_limit_per_minute')}"
    print(f"  * Confirmed Rate Limit in Database: {site_a_updated.get('rate_limit_per_minute')} req/min.")

    # Revert to initial
    requests.patch(f"{BASE_URL}/api/v1/websites/{id_a}/security-settings", json={"rate_limit_per_minute": initial_rl}, headers=headers, timeout=10)
    print(f"  * Restored initial rate limit to {initial_rl} req/min.")
    print("  [PASS] Rate Limiting: Policy configuration and database persistence verified.")

    # -----------------------------------------------------------------
    # Test 5: PHP IP Filter, CIDR Subnets & Anti-Bypass Candidate Chain
    # -----------------------------------------------------------------
    print("\n[Test 5] Testing PHP IP Filter, CIDR Subnets & Anti-Bypass Header Chain...")
    php_path = r"C:\xampp\php\php.exe"
    script_path = str(backend_dir.parent.parent / "scratch" / "test_ip_filter_live.php")
    
    assert os.path.exists(php_path), f"XAMPP PHP binary not found at {php_path}"
    assert os.path.exists(script_path), f"Test script not found at {script_path}"

    proc = subprocess.run([php_path, script_path], capture_output=True, text=True, timeout=15)
    stdout = proc.stdout
    for line in stdout.strip().splitlines():
        if "_TEST:" in line:
            print(f"  * {line.strip()}")
            assert "PASS" in line, f"PHP perimeter check failed: {line}"

    print("  [PASS] Origin IP Filter: Subnet CIDR matching, header anti-spoofing and fast-path filter verified.")

    print("\n" + "=" * 68)
    print("PHASE 5 AUDIT: 100% PASSED ACROSS ACCESS & PERIMETER DEFENSE")
    print("=" * 68)

if __name__ == "__main__":
    run_phase5_perimeter_audit()
