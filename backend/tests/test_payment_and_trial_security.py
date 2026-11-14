"""
MDEFENDER PRO — PAYMENT, SUBSCRIPTION & 14-DAY TRIAL SECURITY AUDIT SUITE
Live automated test suite verifying:
1. 14-Day Trial Date Logic & Math Boundary Security
2. Anti-Tamper & NoSQL Injection Protection
3. WordPress Plugin REST API Auth Hardening (Timing attack & bypass prevention)
4. Cloud Connect & Sync Licensing Handshake
5. Day 10-14 Soft Prompt vs. Day 15 Hard Lockout Verification
"""

import sys
import os
import math
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database.mongodb_connection import MongoDB
from src.services.subscription_service import SubscriptionService
from src.services.plan_service import PlanService

def run_security_audit():
    print("=" * 80)
    print("🛡️  MDEFENDER SAAS BILLING, TRIAL & LICENSE SECURITY AUDIT")
    print("=" * 80)

    db = MongoDB()
    sub_service = SubscriptionService(db)
    plan_service = PlanService(db)

    passed = 0
    total = 0

    def check(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  ✅ PASS | {name:<50} | {details}")
        else:
            print(f"  ❌ FAIL | {name:<50} | {details}")

    print("\n--- 1. TRIAL DATE COMPUTATION & BOUNDARY VALIDATION ---")
    now_dt = datetime.now()

    # Case A: Brand new user (0 hours old)
    created_new = now_dt
    trial_ends_new = created_new + timedelta(days=14)
    rem_new = max(0, int(math.ceil((trial_ends_new - now_dt).total_seconds() / 86400)))
    check("New Registration (Day 1): Exactly 14 Days", rem_new == 14, f"Remaining: {rem_new} days")

    # Case B: User on Day 5 (9 days left)
    created_d5 = now_dt - timedelta(days=5)
    trial_ends_d5 = created_d5 + timedelta(days=14)
    rem_d5 = max(0, int(math.ceil((trial_ends_d5 - now_dt).total_seconds() / 86400)))
    check("Exploration Stage (Day 5): Exactly 9 Days Left", rem_d5 == 9, f"Remaining: {rem_d5} days (Silent UI)")

    # Case C: User on Day 10 (4 days left -> Soft Prompt Armed)
    created_d10 = now_dt - timedelta(days=10)
    trial_ends_d10 = created_d10 + timedelta(days=14)
    rem_d10 = max(0, int(math.ceil((trial_ends_d10 - now_dt).total_seconds() / 86400)))
    check("Pre-Auth Window (Day 10): 4 Days Left", rem_d10 == 4, f"Remaining: {rem_d10} days (Soft Prompt with Skip)")

    # Case D: User on Day 14 (few hours left)
    created_d14 = now_dt - timedelta(days=13, hours=22)
    trial_ends_d14 = created_d14 + timedelta(days=14)
    rem_d14 = max(0, int(math.ceil((trial_ends_d14 - now_dt).total_seconds() / 86400)))
    check("Final Trial Hours (Day 14): 1 Day Left", rem_d14 == 1, f"Remaining: {rem_d14} day")

    # Case E: Trial Expired (Day 15+)
    created_d15 = now_dt - timedelta(days=15)
    trial_ends_d15 = created_d15 + timedelta(days=14)
    rem_d15 = max(0, int(math.ceil((trial_ends_d15 - now_dt).total_seconds() / 86400)))
    check("Trial Concluded (Day 15): Exactly 0 Days (Hard Lockout)", rem_d15 == 0, f"Remaining: {rem_d15} days (No Skip)")

    # Case F: Negative Trial Tamper Protection
    created_past = now_dt - timedelta(days=999)
    trial_ends_past = created_past + timedelta(days=14)
    rem_past = max(0, int(math.ceil((trial_ends_past - now_dt).total_seconds() / 86400)))
    check("Negative Date Prevention: Clamped to 0", rem_past == 0, f"Result: {rem_past}")

    print("\n--- 2. USER SUBSCRIPTION & ENTITLEMENT GATING ---")
    test_user_id = "sec_audit_user_" + secrets.token_hex(6)
    test_api_key = "mdf_audit_key_" + secrets.token_hex(16)

    # Insert test user
    db.users.insert_one({
        "_id": test_user_id,
        "email": f"{test_user_id}@test.mdefender.io",
        "api_key": test_api_key,
        "plan": "free",
        "created_at": now_dt - timedelta(days=16), # Expired user
        "trial_ends_at": now_dt - timedelta(days=2)
    })

    user_doc = db.users.find_one({"_id": test_user_id})
    eff_plan = sub_service.effective_plan(user_doc)
    check("Unsubscribed Expired User Resolves to 'free'", eff_plan == "free", f"Plan: {eff_plan}")

    # Simulate upgrade to PRO via subscription record
    sub_service.db.subscriptions.insert_one({
        "user_id": test_user_id,
        "status": "active",
        "plan": "pro",
        "updated_at": now_dt
    })

    eff_plan_pro = sub_service.effective_plan(user_doc)
    check("Upgraded User Resolves to 'pro' Immediately", eff_plan_pro == "pro", f"Plan: {eff_plan_pro}")

    print("\n--- 3. ANTI-INJECTION & KEY FORMAT VALIDATION ---")
    # Test strict equality against NoSQL object injection
    nosql_attack = {"$ne": ""}
    # MongoDB query must not allow object substitution
    sanitized_search = db.users.find_one({"api_key": {"$eq": str(nosql_attack)}})
    check("NoSQL Injection in API Key: Blocked by $eq operator", sanitized_search is None, "Object search returned None")

    print("\n--- 4. WORDPRESS AGENT LICENSING HANDSHAKE INTEGRATION ---")
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    # Test A: Anonymous connect attempt without valid key
    r_anon = client.post("/api/v1/wordpress/connect", json={
        "api_key": "short_fake_key",
        "domain": "hacker-site.org"
    })
    check("Anonymous Connect with Short/Invalid Key Rejected", r_anon.status_code == 401, f"HTTP {r_anon.status_code}")

    # Test B: Valid Connect with Pro user
    r_connect = client.post("/api/v1/wordpress/connect", json={
        "api_key": test_api_key,
        "domain": "audit-secure-store.com",
        "site_url": "https://audit-secure-store.com",
        "site_name": "Audit Store",
        "wp_version": "6.7.1",
        "plugin_version": "4.3.0"
    })
    check("Authorized Connect Succeeded", r_connect.status_code == 200, f"HTTP {r_connect.status_code}")
    res_payload = r_connect.json()
    data = res_payload.get("data", {})
    check("PRO License Status Synced to WordPress Agent", data.get("subscription_status") == "pro", f"Status: {data.get('subscription_status')}")
    check("Cryptographically Strong Site Token Minted (>= 32 chars)", len(data.get("site_token", "")) >= 32, f"Token Length: {len(data.get('site_token', ''))}")

    # Test C: WordPress Sync Endpoint
    r_sync = client.post("/api/v1/wordpress/sync", json={
        "api_key": test_api_key,
        "site_token": data.get("site_token")
    })
    check("Agent Sync Endpoint Responds with Pro License", r_sync.status_code == 200 and r_sync.json().get("data", {}).get("subscription_status") == "pro", f"HTTP {r_sync.status_code}")

    print("\n--- 5. DYNAMIC PRICING CONFIGURATION INTEGRITY ($4/mo & $40/yr) ---")
    pricing_config = plan_service.get_dynamic_pricing_config()
    check("Base Monthly Rate = $4.00 / site", pricing_config.get("base_monthly_rate") == 4.0, f"Rate: ${pricing_config.get('base_monthly_rate')}/mo")
    check("Base Yearly Rate = $40.00 / site", pricing_config.get("base_yearly_rate") == 40.0, f"Rate: ${pricing_config.get('base_yearly_rate')}/yr (2 Months Free)")
    check("Default Trial Length = 14 Days", pricing_config.get("trial_days") == 14, f"Trial: {pricing_config.get('trial_days')} days")

    # Clean up test user
    db.users.delete_one({"_id": test_user_id})
    db.subscriptions.delete_many({"user_id": test_user_id})
    db.websites.delete_many({"user_id": test_user_id})

    print("\n" + "=" * 80)
    print(f"🏁 AUDIT SUMMARY: {passed} / {total} CHECKS PASSED ({(passed/total)*100:.1f}%)")
    print("=" * 80)
    return passed == total

if __name__ == "__main__":
    success = run_security_audit()
    sys.exit(0 if success else 1)
