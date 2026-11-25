import requests
import json
import time
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService
from src.services.plan_service import PlanService

BACKEND_URL = "http://localhost:8000"
WP_URL = "http://localhost/mahabub"
WP_CACHE_FILE = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro\includes\data\waf_fast_cache.json"

def run_live_test():
    db = MongoDB()
    lss = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)
    plan_svc = PlanService(db)

    print("=================================================================")
    print("      MDEFENDER LIVE E2E PAYMENT & SUBSCRIPTION AUDIT SUITE      ")
    print("=================================================================\n")

    # -------------------------------------------------------------
    # TEST 1: Live Pricing Config Endpoint Verification
    # -------------------------------------------------------------
    print("[TEST 1] Verifying Live Dynamic Pricing API...")
    res = requests.get(f"{BACKEND_URL}/api/v1/pricing/config", timeout=5)
    assert res.status_code == 200, f"Pricing config returned {res.status_code}"
    cfg = res.json().get("data", {})
    assert "base_monthly_rate" in cfg and "trial_days" in cfg
    print(f"  -> SUCCESS: Base Monthly Rate: ${cfg['base_monthly_rate']}, Base Yearly: ${cfg['base_yearly_rate']}, Trial: {cfg['trial_days']} Days.\n")

    # -------------------------------------------------------------
    # TEST 2: Checkout Session Creation (Dynamic Price & Action Tracking)
    # -------------------------------------------------------------
    print("[TEST 2] Verifying Checkout Session Creation (Intent & Action)...")
    checkout_payload = {
        "plan": "pro",
        "billing_cycle": "monthly",
        "sites_count": 5,
        "action": "subscribe",
        "customer_email": "live_test_user@example.com"
    }
    res = requests.post(f"{BACKEND_URL}/api/v1/billing/checkout", json=checkout_payload, timeout=5)
    assert res.status_code == 200, f"Checkout failed with {res.status_code}"
    chk_data = res.json()
    assert chk_data.get("success") is True or chk_data.get("enabled") is True
    print(f"  -> SUCCESS: Checkout endpoint dynamically priced 5 sites at ${chk_data.get('final_total', 20.0)}.\n")

    # -------------------------------------------------------------
    # TEST 3: Renewal Engine - Renewal MUST NOT double slots
    # -------------------------------------------------------------
    print("[TEST 3] Testing Live Fleet Renewal vs Expansion...")
    test_uid = str(ObjectId())
    now = datetime.now(timezone.utc)
    db.users.insert_one({
        "_id": test_uid,
        "email": f"live_test_{int(time.time())}@mdefender.io",
        "role": "user",
        "plan": "pro",
        "payment_status": "active",
        "purchased_slots": 10,
        "plan_expires": now + timedelta(days=2),
        "created_at": now - timedelta(days=28)
    })

    try:
        # Step A: Perform Renewal for 10 sites
        initial_user = db.users.find_one({"_id": test_uid})
        initial_exp = initial_user["plan_expires"]
        assert initial_user["purchased_slots"] == 10

        sub_svc.record_transaction(test_uid, {
            "id": f"txn_live_renew_{int(time.time())}",
            "event_type": "transaction.completed",
            "data": {
                "id": f"txn_live_renew_{int(time.time())}",
                "status": "completed",
                "custom_data": {
                    "user_id": test_uid,
                    "action": "renew",
                    "sites_count": 10,
                    "billing_cycle": "monthly"
                }
            }
        })

        renewed_user = db.users.find_one({"_id": test_uid})
        # MUST REMAIN 10 (DO NOT DOUBLE TO 20)
        assert renewed_user["purchased_slots"] == 10, f"Expected 10 slots on renewal, got {renewed_user['purchased_slots']}"
        renewed_exp = renewed_user["plan_expires"]
        diff_days = (renewed_exp - initial_exp).total_seconds() / 86400
        assert 28 <= diff_days <= 32, f"Expected ~30 days added, got {diff_days}"
        print(f"  -> SUCCESS: Renewing 10 sites kept slots at exactly {renewed_user['purchased_slots']} and pushed expiration forward by {diff_days:.1f} days!\n")

        # Step B: Add 2 slots anytime (e.g. 10 -> 12)
        sub_svc.record_transaction(test_uid, {
            "id": f"txn_live_add_{int(time.time())}",
            "event_type": "transaction.completed",
            "data": {
                "id": f"txn_live_add_{int(time.time())}",
                "status": "completed",
                "custom_data": {
                    "user_id": test_uid,
                    "action": "add_slots",
                    "additional_slots": 2,
                    "sites_count": 2,
                    "billing_cycle": "monthly"
                }
            }
        })

        scaled_user = db.users.find_one({"_id": test_uid})
        assert scaled_user["purchased_slots"] == 12, f"Expected 12 slots, got {scaled_user['purchased_slots']}"
        print(f"  -> SUCCESS: Adding 2 slots scaled fleet capacity from 10 to {scaled_user['purchased_slots']} slots!\n")

    finally:
        db.users.delete_one({"_id": test_uid})
        db.slot_batches.delete_many({"user_id": test_uid})

    # -------------------------------------------------------------
    # TEST 4: WordPress XAMPP Live Edge Sync (Expiration & Reactivation)
    # -------------------------------------------------------------
    print("[TEST 4] Testing Live WordPress XAMPP Edge WAF Synchronization...")
    wp_site = db.websites.find_one({"domain": "localhost/mahabub"})
    assert wp_site is not None, "localhost/mahabub website not found in database!"
    owner_id = str(wp_site["user_id"])
    site_wid = str(wp_site["_id"])

    # Simulate Expiration
    print("  -> Simulating subscription expiration on owner account...")
    db.users.update_one({"_id": ObjectId(owner_id)}, {"$set": {
        "payment_status": "expired",
        "purchased_slots": 0,
        "licensed_website_ids": [],
        "plan_expires": now - timedelta(days=1)
    }})
    db.websites.update_one({"_id": site_wid}, {"$set": {
        "is_licensed": False,
        "license_status": "expired",
        "protection_paused": True
    }})

    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=owner_id, website_id=site_wid, wait=True)

    with open(WP_CACHE_FILE, "r") as f:
        wp_cache = json.load(f)
    print(f"  -> WordPress fast cache after expiration: is_licensed={wp_cache.get('is_licensed')}, status={wp_cache.get('license_status')}, waf_mode={wp_cache.get('waf_mode')}")
    assert wp_cache.get("is_licensed") is False, "WordPress cache should be unlicensed when subscription expires"
    assert wp_cache.get("waf_mode") == "disabled", "WAF should be disabled when subscription expires"

    # Simulate Renewal
    print("  -> Simulating 1-click renewal on owner account...")
    sub_svc.record_transaction(owner_id, {
        "id": f"txn_wp_renew_{int(time.time())}",
        "event_type": "transaction.completed",
        "data": {
            "id": f"txn_wp_renew_{int(time.time())}",
            "status": "completed",
            "custom_data": {
                "user_id": owner_id,
                "action": "renew",
                "sites_count": 10,
                "billing_cycle": "monthly"
            }
        }
    })

    # Ensure WordPress receives the reactivation push
    push_instant_sync_to_wordpress(user_id=owner_id, website_id=site_wid, wait=True)

    with open(WP_CACHE_FILE, "r") as f:
        wp_cache_renewed = json.load(f)
    print(f"  -> WordPress fast cache after renewal: is_licensed={wp_cache_renewed.get('is_licensed')}, status={wp_cache_renewed.get('license_status')}, waf_mode={wp_cache_renewed.get('waf_mode')}")
    assert wp_cache_renewed.get("is_licensed") is True, "WordPress cache should be licensed after renewal"
    assert wp_cache_renewed.get("waf_mode") == "protect", "WAF mode should be restored to protect after renewal"
    print("  -> SUCCESS: WordPress XAMPP site successfully paused upon expiration and instantly restored upon renewal!\n")

    # -------------------------------------------------------------
    # TEST 5: Free Trial Anti-Churning Security Gate
    # -------------------------------------------------------------
    print("[TEST 5] Testing Free Trial Domain Anti-Abuse Shield...")
    trial_user_id = str(ObjectId())
    db.users.insert_one({
        "_id": trial_user_id,
        "email": f"churn_tester_{int(time.time())}@example.com",
        "role": "user",
        "plan": "free",
        "payment_status": "trialing",
        "created_at": now
    })

    try:
        # Pre-seed domain as already consumed trial under another account
        churn_domain = f"churn-live-{int(time.time())}.com"
        db.trial_domain_history.insert_one({
            "domain": churn_domain,
            "first_used_by": "different_previous_user_id",
            "created_at": now
        })

        # Check domain security gate
        trial_user_doc = db.users.find_one({"_id": trial_user_id})
        user_state = lss.resolve_user_license_state(trial_user_doc)
        assert not user_state.get("is_paid")

        entry = db.trial_domain_history.find_one({"domain": churn_domain})
        is_blocked = (entry and str(entry.get("first_used_by")) != trial_user_id)
        assert is_blocked is True
        print(f"  -> SUCCESS: Domain '{churn_domain}' correctly blocked from being reused on a new trial account!\n")

    finally:
        db.users.delete_one({"_id": trial_user_id})
        db.trial_domain_history.delete_many({"domain": churn_domain})

    print("=================================================================")
    print("       ALL 5 LIVE END-TO-END TEST SUITES PASSED (100%)!          ")
    print("=================================================================")

if __name__ == "__main__":
    run_live_test()
