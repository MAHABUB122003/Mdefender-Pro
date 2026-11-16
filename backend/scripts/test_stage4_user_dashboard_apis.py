"""
MDefender Pro Enterprise: Stage 4 User Dashboard Suite API & Data Integrity Verification
Tests all endpoints consumed by UserHeader, UserDashboard, UserLogs, UserWebsites, UserBlacklist, UserTools, and Bulk Fleet.
"""
import sys
import os
import requests

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from src.database.mongodb_connection import MongoDB
from src.auth.jwt_service import JWTService
from src.api.user_api import UserAPI

def test_stage4_user_dashboard_suite():
    print("\n" + "=" * 70)
    print("   STAGE 4: USER DASHBOARD MASTER SUITE API & INTEGRITY AUDIT")
    print("=" * 70)

    db = MongoDB()
    # 1. Authenticate as owner of localhost/mahabub
    user = db.users.find_one({"email": "rahmanmdmahabubur575@gmail.com"})
    if not user:
        # Fallback to demo user
        user = db.users.find_one({"email": "user@gmail.com"})
        
    user_id = str(user["_id"])
    jwt = JWTService()
    token = jwt.create_access_token(user_id, user["email"], role=user.get("role", "user"))
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"[+] Authenticated Context: {user.get('name', 'Operator')} ({user.get('email')}) [Plan: {user.get('plan')}]")
    results = {}

    # Endpoint 1: Dashboard Stats
    print("\n[1] Testing Dashboard Overview Data (/api/user/dashboard)...")
    try:
        uapi = UserAPI()
        dash = uapi.get_dashboard_stats(user, website_id="all", force_refresh=True)
        total_req = dash.get("total_requests", 0)
        total_blk = dash.get("total_blocked", 0)
        sites_cnt = dash.get("websites_count", 0)
        is_ok = total_req > 0 and sites_cnt > 0
        status = "PASS" if is_ok else "INFO"
        print(f"  * [{status}] Total Requests: {total_req} | Total Blocked: {total_blk} | Fleet Sites: {sites_cnt}")
        print(f"    - Attack Categories: {dash.get('attack_types')}")
        print(f"    - Attack Counts: {dash.get('attack_counts')}")
        results["dash_stats"] = is_ok
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["dash_stats"] = False

    # Endpoint 2: Live Threat Logs
    print("\n[2] Testing Live Threat Logs Feed (/api/user/logs)...")
    try:
        logs_res = uapi.get_user_logs(user, {"limit": 10, "page": 1})
        total_logs = logs_res.get("total", 0)
        logs = logs_res.get("logs", [])
        is_ok = total_logs > 0 and len(logs) > 0
        status = "PASS" if is_ok else "FAIL"
        print(f"  * [{status}] Total Logs Available: {total_logs} | Page Size: {len(logs)}")
        if logs:
            l = logs[0]
            print(f"    - Sample Log: [{l.get('status').upper()}] {l.get('attack_type')} on {l.get('url')} (IP: {l.get('ip')})")
        results["threat_logs"] = is_ok
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["threat_logs"] = False

    # Endpoint 3: Fleet Websites API
    print("\n[3] Testing Fleet Websites Listing via Backend HTTP API...")
    try:
        res = requests.get("http://localhost:8000/api/v1/websites/list", headers=headers, timeout=5)
        is_ok = (res.status_code == 200)
        sites = res.json().get("websites", res.json().get("data", [])) if is_ok else []
        status = "PASS" if is_ok else "FAIL"
        print(f"  * [{status}] Status: {res.status_code} | Discovered Sites: {len(sites)}")
        for s in sites[:3]:
            print(f"    - Domain: {s.get('domain')} | WAF Mode: {s.get('waf_mode')} | Status: {s.get('status')}")
        results["websites_api"] = is_ok
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["websites_api"] = False

    # Endpoint 4: Blacklist & Access Control
    print("\n[4] Testing Blacklist & Perimeter Rules...")
    try:
        res = requests.get("http://localhost:8000/api/v1/blacklist", headers=headers, timeout=5)
        is_ok = (res.status_code == 200)
        status = "PASS" if is_ok else "FAIL"
        print(f"  * [{status}] Status: {res.status_code} | Blacklist Data: {res.json() if is_ok else res.text}")
        results["blacklist_api"] = is_ok
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["blacklist_api"] = False

    # Endpoint 5: Notice Board Notifications
    print("\n[5] Testing User Notification & Notice Board (/api/v1/notices)...")
    try:
        res = requests.get("http://localhost:8000/api/v1/notices", headers=headers, timeout=5)
        is_ok = (res.status_code == 200)
        notices = res.json() if is_ok else []
        status = "PASS" if is_ok else "FAIL"
        print(f"  * [{status}] Status: {res.status_code} | Notices Count: {len(notices) if isinstance(notices, list) else 'Dict'}")
        results["notices_api"] = is_ok
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["notices_api"] = False

    # Endpoint 6: User Profile & API Key
    print("\n[6] Testing User Profile & Security Credentials...")
    try:
        res = requests.get("http://localhost:8000/api/auth/profile", headers=headers, timeout=5)
        is_ok = (res.status_code == 200)
        p_data = res.json() if is_ok else {}
        u_obj = p_data.get("user", p_data)
        has_key = bool(u_obj.get("api_key"))
        status = "PASS" if (is_ok and has_key) else "FAIL"
        print(f"  * [{status}] Status: {res.status_code} | Email: {u_obj.get('email')} | Has API Key: {has_key}")
        results["profile_api"] = is_ok and has_key
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["profile_api"] = False

    print("\n" + "=" * 70)
    passed_count = sum(1 for v in results.values() if v)
    print(f" [✓] STAGE 4 SUMMARY: {passed_count}/{len(results)} USER DASHBOARD APIS PASSED")
    print("=" * 70)
    return passed_count == len(results)

if __name__ == "__main__":
    test_stage4_user_dashboard_suite()
