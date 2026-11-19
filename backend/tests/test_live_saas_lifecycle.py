"""
Comprehensive Enterprise SaaS Multi-Tenant Live Lifecycle Verification Suite
Tests the real running WordPress site (http://localhost/mahabub) and backend API.
"""

import os
import sys
import json
import requests
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService
from src.api.v1.wordpress_api import push_instant_sync_to_wordpress

WP_URL = "http://localhost/mahabub"
TEST_EMAIL = "rahmanmdmahabubur575@gmail.com"
WP_FAST_CACHE = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro\includes\data\waf_fast_cache.json"

class TestReporter:
    def __init__(self):
        self.results = []

    def log(self, step, passed, detail):
        status = "PASS [OK]" if passed else "FAIL [X]"
        print(f"  [{status}] Step {step}: {detail}")
        self.results.append({"step": step, "passed": passed, "detail": detail})

    def summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        print("\n" + "="*70)
        print(f"  LIVE E2E TEST SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
        print("="*70)
        return passed == total


def run_all_tests():
    db = MongoDB()
    user = db.users.find_one({"email": TEST_EMAIL})
    if not user:
        print(f"[-] Test user {TEST_EMAIL} not found.")
        sys.exit(1)

    uid = user["_id"]
    uid_str = str(uid)
    u_query = {"_id": uid}
    now_utc = datetime.now(timezone.utc)
    reporter = TestReporter()

    # Find the mahabub website document
    mahabub_site = db.websites.find_one({"$or": [{"url": {"$regex": "mahabub"}}, {"domain": {"$regex": "mahabub"}}]})
    if not mahabub_site:
        print("[-] Website document for mahabub not found in db.websites.")
        sys.exit(1)
    wid_str = str(mahabub_site["_id"])

    print("\n" + "="*70)
    print("  STARTING COMPREHENSIVE LIVE SAAS MULTI-TENANT LIFECYCLE TEST")
    print(f"  Target WordPress: {WP_URL}")
    print(f"  User:             {TEST_EMAIL} (UID: {uid_str})")
    print(f"  Website ID:       {wid_str}")
    print("="*70 + "\n")

    # =========================================================================
    # SCENARIO 1: Day 1 - Fresh 14-Day Free Trial
    # =========================================================================
    print("--- [SCENARIO 1] Fresh 14-Day Free Trial (Day 1) ---")
    db.users.update_one(u_query, {
        "$set": {
            "created_at": now_utc,
            "trial_started_at": now_utc,
            "trial_ends_at": now_utc + timedelta(days=14),
            "payment_status": "trialing",
            "plan": "free",
            "purchased_slots": 50
        }
    })
    db.websites.update_one({"_id": mahabub_site["_id"]}, {
        "$set": {"is_licensed": True, "license_status": "trial", "is_protected": True}
    })
    from src.services.license_slot_service import _invalidate_cache
    _invalidate_cache(user_id=uid_str, website_id=wid_str)
    push_instant_sync_to_wordpress(user_id=uid_str, website_id=wid_str, wait=True)

    state = LicenseSlotService(db).resolve_user_license_state(db.users.find_one(u_query))
    reporter.log("1.1", state.get("is_trial_active") is True and state.get("trial_days_remaining") == 14,
                 f"Trial resolved active with {state.get('trial_days_remaining')} days left")

    # Check fast cache on disk
    with open(WP_FAST_CACHE, "r", encoding="utf-8") as f:
        fc = json.load(f)
    reporter.log("1.2", fc.get("enabled") is True and fc.get("is_licensed") is True,
                 f"Fast Cache enabled={fc.get('enabled')}, is_licensed={fc.get('is_licensed')}")

    # Test benign request
    r_benign = requests.get(f"{WP_URL}/?test=normal", timeout=5)
    reporter.log("1.3", r_benign.status_code == 200, f"Benign traffic HTTP {r_benign.status_code} (OK)")

    # Test attack request (should be BLOCKED with 403)
    r_attack = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("1.4", r_attack.status_code == 403, f"Attack blocked HTTP {r_attack.status_code} (Forbidden)")

    # =========================================================================
    # SCENARIO 2: Day 10 - Payment Warning Reminder (4 Days Left)
    # =========================================================================
    print("\n--- [SCENARIO 2] Day 10 Reminder Trigger (4 Days Left) ---")
    d10_started = now_utc - timedelta(days=10)
    d10_ends = now_utc + timedelta(days=4)
    db.users.update_one(u_query, {
        "$set": {
            "created_at": d10_started,
            "trial_started_at": d10_started,
            "trial_ends_at": d10_ends,
            "payment_status": "trialing",
            "plan": "free"
        }
    })
    sub_svc = SubscriptionService(db)
    sub_svc.check_and_process_subscription_lifecycle()
    state_d10 = LicenseSlotService(db).resolve_user_license_state(db.users.find_one(u_query))
    reporter.log("2.1", state_d10.get("is_trial_active") is True and state_d10.get("trial_days_remaining") == 4,
                 f"Trial days remaining correctly resolved to {state_d10.get('trial_days_remaining')}")

    # Protection remains active during warning period
    r_attack_d10 = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("2.2", r_attack_d10.status_code == 403, f"Attack blocked on Day 10 HTTP {r_attack_d10.status_code}")

    # =========================================================================
    # SCENARIO 3: Day 15 - Free Trial Concluded / Expired
    # =========================================================================
    print("\n--- [SCENARIO 3] Day 15 Free Trial Concluded (Fail-Open Dormant) ---")
    d15_started = now_utc - timedelta(days=15)
    d15_ends = now_utc - timedelta(days=1)
    db.users.update_one(u_query, {
        "$set": {
            "created_at": d15_started,
            "trial_started_at": d15_started,
            "trial_ends_at": d15_ends,
            "payment_status": "trial_expired",
            "purchased_slots": 0,
            "licensed_website_ids": []
        }
    })
    db.websites.update_many(
        {"user_id": {"$in": [uid_str, ObjectId(uid_str)]}},
        {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False}}
    )
    db.wordpress_sites.update_many(
        {"user_id": {"$in": [uid_str, ObjectId(uid_str)]}},
        {"$set": {"status": "unlicensed", "license_status": "trial_expired", "is_licensed": False}}
    )
    from src.services.license_slot_service import _invalidate_cache
    _invalidate_cache(user_id=uid_str, website_id=wid_str)
    push_instant_sync_to_wordpress(user_id=uid_str, website_id=wid_str, wait=True)

    state_d15 = LicenseSlotService(db).resolve_user_license_state(db.users.find_one(u_query))
    reporter.log("3.1", state_d15.get("is_trial_active") is False and state_d15.get("payment_status") == "trial_expired",
                 f"User state resolved to payment_status={state_d15.get('payment_status')}")

    # Verify fast cache disabled
    with open(WP_FAST_CACHE, "r", encoding="utf-8") as f:
        fc_exp = json.load(f)
    reporter.log("3.2", fc_exp.get("enabled") is False and fc_exp.get("is_licensed") is False,
                 f"Fast Cache disabled: enabled={fc_exp.get('enabled')}, is_licensed={fc_exp.get('is_licensed')}")

    # Benign traffic MUST continue with 200 (Website is NOT broken)
    r_benign_exp = requests.get(f"{WP_URL}/?test=normal", timeout=5)
    reporter.log("3.3", r_benign_exp.status_code == 200, f"Website operational: HTTP {r_benign_exp.status_code}")

    # Attack traffic MUST pass through with 200 (WAF is dormant, no protection without payment!)
    r_attack_exp = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("3.4", r_attack_exp.status_code == 200,
                 f"WAF dormant (fail-open): HTTP {r_attack_exp.status_code} (No blocking without payment)")

    # =========================================================================
    # SCENARIO 4: Multi-Site Slot Management (e.g. 2 Slots for 5 Sites)
    # =========================================================================
    print("\n--- [SCENARIO 4] Paid Plan with Selective Slot Allocation ---")
    slot_svc = LicenseSlotService(db)

    # User purchases 2 slots
    db.users.update_one(u_query, {
        "$set": {
            "payment_status": "active",
            "plan": "pro",
            "purchased_slots": 2,
            "licensed_website_ids": []
        }
    })
    # Reset websites to unlicensed
    db.websites.update_many(
        {"user_id": {"$in": [uid_str, ObjectId(uid_str)]}},
        {"$set": {"is_licensed": False, "license_status": "unlicensed", "is_protected": False}}
    )

    # 4.1 Assign slot to mahabub
    ok_assign, msg_assign = slot_svc.assign_slot(uid_str, wid_str)
    reporter.log("4.1", ok_assign is True, f"Assign Slot 1 to mahabub: {msg_assign}")

    # Check that protection reactivates on mahabub
    with open(WP_FAST_CACHE, "r", encoding="utf-8") as f:
        fc_assigned = json.load(f)
    reporter.log("4.2", fc_assigned.get("enabled") is True and fc_assigned.get("is_licensed") is True,
                 f"Fast cache reactivated: enabled={fc_assigned.get('enabled')}")

    r_attack_assigned = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("4.3", r_attack_assigned.status_code == 403,
                 f"Attack BLOCKED on assigned site HTTP {r_attack_assigned.status_code} (Forbidden)")

    # 4.4 Release slot from mahabub
    ok_release, msg_release = slot_svc.release_slot(uid_str, wid_str)
    reporter.log("4.4", ok_release is True, f"Release Slot 1 from mahabub: {msg_release}")

    # Check that protection turns OFF on released site
    with open(WP_FAST_CACHE, "r", encoding="utf-8") as f:
        fc_released = json.load(f)
    reporter.log("4.5", fc_released.get("enabled") is False and fc_released.get("is_licensed") is False,
                 f"Fast cache dormant on release: enabled={fc_released.get('enabled')}")

    r_attack_released = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("4.6", r_attack_released.status_code == 200,
                 f"Attack ALLOWED on released site HTTP {r_attack_released.status_code} (Dormant)")

    # 4.7 Re-assign slot to restore protection
    ok_reassign, msg_reassign = slot_svc.assign_slot(uid_str, wid_str)
    reporter.log("4.7", ok_reassign is True, f"Re-assign Slot 1 to mahabub: {msg_reassign}")

    r_attack_reassign = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("4.8", r_attack_reassign.status_code == 403,
                 f"Attack BLOCKED on re-assigned site HTTP {r_attack_reassign.status_code} (Forbidden)")

    # =========================================================================
    # SCENARIO 5: Slot Capacity Invariant (Cannot exceed purchased slots)
    # =========================================================================
    print("\n--- [SCENARIO 5] Slot Capacity Invariant (Enforce Slot Limit) ---")
    other_sites = list(db.websites.find({"user_id": {"$in": [uid_str, ObjectId(uid_str)]}, "_id": {"$ne": mahabub_site["_id"]}}))
    if len(other_sites) >= 2:
        site_b = str(other_sites[0]["_id"])
        site_c = str(other_sites[1]["_id"])

        # Assign 2nd slot (fills 2/2 slots)
        ok_b, _ = slot_svc.assign_slot(uid_str, site_b)
        reporter.log("5.1", ok_b is True, f"Filled slot 2/2 with {other_sites[0].get('domain')}")

        # Attempt to assign 3rd slot when only 2 purchased (MUST FAIL)
        ok_c, msg_c = slot_svc.assign_slot(uid_str, site_c)
        reporter.log("5.2", ok_c is False, f"3rd slot assignment blocked: '{msg_c}'")

    # =========================================================================
    # SCENARIO 6: Monthly/Yearly Recurring Billing Expiration & Renewal
    # =========================================================================
    print("\n--- [SCENARIO 6] Recurring Renewal & Expiration Verification ---")
    # Simulate past due / subscription expiration
    db.users.update_one(u_query, {
        "$set": {
            "payment_status": "past_due",
            "plan_expires": now_utc - timedelta(days=2)
        }
    })
    sub_svc.check_and_process_subscription_lifecycle()
    state_expired = slot_svc.resolve_user_license_state(db.users.find_one(u_query))
    reporter.log("6.1", state_expired.get("is_paid") is False,
                 f"Expired plan correctly resolved is_paid={state_expired.get('is_paid')}")

    # Simulate successful monthly/yearly renewal payment
    renewal_expiry = now_utc + timedelta(days=365) # 1 year
    db.users.update_one(u_query, {
        "$set": {
            "payment_status": "active",
            "plan": "pro",
            "plan_expires": renewal_expiry,
            "purchased_slots": 3,
            "licensed_website_ids": [wid_str]
        }
    })
    from src.services.license_slot_service import _invalidate_cache
    _invalidate_cache(user_id=uid_str, website_id=wid_str)
    push_instant_sync_to_wordpress(user_id=uid_str, website_id=wid_str, wait=True)
    state_renewed = slot_svc.resolve_user_license_state(db.users.find_one(u_query))
    reporter.log("6.2", state_renewed.get("is_paid") is True and state_renewed.get("purchased_slots") == 3,
                 f"Renewal successful: is_paid={state_renewed.get('is_paid')}, slots={state_renewed.get('purchased_slots')}")

    # Verify live attack is blocked once again
    r_attack_renewed = requests.get(f"{WP_URL}/?id=1'%20UNION%20SELECT%201,2,3--", timeout=5)
    reporter.log("6.3", r_attack_renewed.status_code == 403,
                 f"Protection confirmed active after renewal HTTP {r_attack_renewed.status_code} (Forbidden)")

    print()
    return reporter.summary()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
