import json
import os
import sys
import time
import requests
import urllib.parse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from src.database.mongodb_connection import MongoDB

def main():
    print("=" * 60)
    print("MDEFENDER PRO - COMPREHENSIVE VERIFICATION & TEST SUITE")
    print("=" * 60)

    db = MongoDB()
    backend_url = "http://localhost:8000"
    wp_url = "http://localhost/mahabub"

    # Step 1: Get or create test user
    user = db.users.find_one({"email": "testuser@mdefender.pro"})
    if not user:
        from src.security.auth import Auth
        auth = Auth()
        user_id = str(db.users.insert_one({
            "email": "testuser@mdefender.pro",
            "name": "Mahabub Test",
            "password": auth.hash_password("Password123!"),
            "role": "user",
            "api_key": "mdf_live_test_api_key_8492048102948201",
            "email_verified": True,
            "is_active": True,
            "plan": "enterprise",
            "created_at": "2026-10-02 00:00:00"
        }).inserted_id)
        user = db.users.find_one({"_id": user_id}) or db.users.find_one({"email": "testuser@mdefender.pro"})
    
    api_key = user.get("api_key")
    if not api_key:
        api_key = "mdf_live_test_api_key_8492048102948201"
        db.users.update_one({"_id": user["_id"]}, {"$set": {"api_key": api_key}})
    
    print(f"[1] Test User: {user.get('email')} | API Key: {api_key[:12]}...")

    # Step 2: Register / Connect WordPress Website in MongoDB & API
    domain = "localhost"
    existing_ws = db.websites.find_one({"$or": [{"user_id": str(user["_id"])}, {"domain": domain}]})
    if not existing_ws:
        import uuid
        site_id = str(uuid.uuid4())
        db.websites.insert_one({
            "_id": site_id,
            "user_id": str(user["_id"]),
            "name": "Mahabub WordPress",
            "url": "http://localhost/mahabub",
            "domain": "localhost",
            "platform": "wordpress",
            "status": "active",
            "protection_enabled": True,
            "waf_mode": "protect",
            "malware_scanner": True,
            "threat_level": "LOW",
            "api_key": api_key,
            "verified": True,
            "connected_at": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        existing_ws = db.websites.find_one({"_id": site_id})
    else:
        db.websites.update_one({"_id": existing_ws["_id"]}, {"$set": {"user_id": str(user["_id"]), "api_key": api_key, "protection_enabled": True, "waf_mode": "protect"}})
        existing_ws = db.websites.find_one({"_id": existing_ws["_id"]})

    print(f"[2] Website Record: {existing_ws['_id']} | Name: {existing_ws.get('name')}")

    # Step 3: Call /api/v1/wordpress/connect
    connect_resp = requests.post(f"{backend_url}/api/v1/wordpress/connect", json={
        "api_key": api_key,
        "domain": "localhost",
        "plugin_version": "4.2.2",
        "php_version": "8.0.30",
        "wp_version": "6.5"
    })
    print(f"[3] /wordpress/connect Response: {connect_resp.status_code} -> {connect_resp.json()}")

    # Step 4: Sync cloud settings to WordPress plugin via webhook
    sync_resp = requests.get(f"{wp_url}/?waf_cloud_sync=1&api_key={api_key}")
    print(f"[4] WordPress cloud sync webhook status: {sync_resp.status_code}")

    # Step 5: Test WAF Attack Detection on WordPress
    # Clean request
    r_clean = requests.get(f"{wp_url}/")
    print(f"[5a] Clean request: Status {r_clean.status_code} (Expected 200)")

    # SQL Injection request
    r_sqli = requests.get(f"{wp_url}/?id=1%27%20UNION%20SELECT%20user_login,user_pass%20FROM%20wp_users--")
    print(f"[5b] SQL Injection request: Status {r_sqli.status_code} (Expected 403)")
    is_mdefender_blocked = "MDefender" in r_sqli.text or "Protected By" in str(r_sqli.headers)
    print(f"     Blocked by MDefender template: {is_mdefender_blocked}")

    # XSS Injection request
    r_xss = requests.get(f"{wp_url}/?q=%3Cscript%3Ealert(%27MDefender%27)%3C/script%3E")
    print(f"[5c] XSS Injection request: Status {r_xss.status_code} (Expected 403)")

    # Step 6: Test IP Blacklist
    test_ip = "198.51.100.77"
    # Push blacklist via cloud
    bl_sync_payload = {
        "blacklist": [test_ip],
        "blocked_countries": ["KP"],
        "user_rules": []
    }
    r_push = requests.post(f"{wp_url}/?waf_cloud_sync=1&api_key={api_key}", json=bl_sync_payload)
    print(f"[6a] Push Blacklist {test_ip} & Country KP to WP: Status {r_push.status_code}")

    # Test request from blacklisted IP
    r_bl = requests.get(f"{wp_url}/?test_ip={test_ip}")
    print(f"[6b] Blacklisted IP request (?test_ip={test_ip}): Status {r_bl.status_code} (Expected 403)")
    print(f"     Contains Blacklist message: {'blacklisted' in r_bl.text.lower() or 'access denied' in r_bl.text.lower()}")

    # Step 7: Test Country Block
    r_geo = requests.get(f"{wp_url}/?country_test=KP")
    print(f"[7] Blocked Country request (?country_test=KP): Status {r_geo.status_code} (Expected 403)")
    print(f"    Contains Country/Geo message: {'country' in r_geo.text.lower() or 'access denied' in r_geo.text.lower()}")

    # Step 8: Clean up test blacklist
    requests.post(f"{wp_url}/?waf_cloud_sync=1&api_key={api_key}", json={"blacklist": [], "blocked_countries": []})

    print("=" * 60)
    print("VERIFICATION COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()
