"""
MDefender Pro - Trial Lifecycle Simulator for Live Testing
Allows instant time-travel testing of:
  - Day 1: Fresh 14-day free trial (Full fleet protection active)
  - Day 10: Payment reminder trigger (4 days remaining, warning badge & reminder notification)
  - Day 15: Trial expired (Protection suspended, paywall redirects to /user/pricing)
  - Paid: Active paid subscription with 2 purchased slots

Usage:
  python backend/simulate_trial.py <email> <day_or_mode>

Examples:
  python backend/simulate_trial.py user@example.com 10      # Simulate Day 10
  python backend/simulate_trial.py user@example.com 15      # Simulate Day 15 (Expired)
  python backend/simulate_trial.py user@example.com 1       # Reset to Day 1
  python backend/simulate_trial.py user@example.com paid    # Simulate Paid Pro with 2 slots
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService


def simulate(email: str, mode: str):
    db = MongoDB()
    user = db.users.find_one({"email": email})
    if not user:
        print(f"[-] User with email '{email}' not found in database.")
        sys.exit(1)

    uid = user["_id"]
    u_query = {"_id": uid}
    now_utc = datetime.now(timezone.utc)

    mode_str = str(mode).strip().lower()

    if mode_str in ("10", "day10", "day-10"):
        # Day 10: 10 days elapsed, 4 days remaining
        trial_started = now_utc - timedelta(days=10)
        trial_ends = now_utc + timedelta(days=4)
        db.users.update_one(u_query, {
            "$set": {
                "created_at": trial_started,
                "trial_started_at": trial_started,
                "trial_ends_at": trial_ends,
                "payment_status": "trialing",
                "plan": "free"
            }
        })
        # Run watchdog lifecycle check to dispatch reminder
        sub_svc = SubscriptionService(db)
        sub_svc.check_and_process_subscription_lifecycle()
        print(f"\n[+] SUCCESS: Simulated Day 10 for {email}!")
        print(f"    - Trial Days Remaining: 4 days")
        print(f"    - Header Badge: Will display '⏳ 4d Trial Left' (Red Alert)")
        print(f"    - Notification: 'Free Trial Notice: 4 Days Remaining' dispatched")
        print(f"    - Access: Full dashboard and websites remain active")

    elif mode_str in ("15", "day15", "expired", "trial_expired"):
        # Day 15: 15 days elapsed, trial concluded 1 day ago
        trial_started = now_utc - timedelta(days=15)
        trial_ends = now_utc - timedelta(days=1)
        db.users.update_one(u_query, {
            "$set": {
                "created_at": trial_started,
                "trial_started_at": trial_started,
                "trial_ends_at": trial_ends,
                "payment_status": "trial_expired",
                "purchased_slots": 0,
                "licensed_website_ids": []
            }
        })
        # Mark user websites as trial_expired
        uid_str = str(uid)
        db.websites.update_many(
            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
            {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False}}
        )
        db.wordpress_sites.update_many(
            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
            {"$set": {"status": "unlicensed", "license_status": "trial_expired", "is_licensed": False}}
        )
        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception as e:
            print(f"    - Instant Sync Notice: {e}")
        print(f"\n[+] SUCCESS: Simulated Day 15 (Expired) for {email}!")
        print(f"    - Trial Days Remaining: 0")
        print(f"    - Status: trial_expired")
        print(f"    - Paywall: Navigating to any dashboard page will auto-redirect to /user/pricing")
        print(f"    - APIs: Protected endpoints will return HTTP 402/403")
        print(f"    - Websites: Protection paused across all connected sites (WAF fail-open dormant)")

    elif mode_str in ("1", "day1", "reset", "fresh"):
        # Reset to Day 1: 14 days remaining
        trial_started = now_utc
        trial_ends = now_utc + timedelta(days=14)
        db.users.update_one(u_query, {
            "$set": {
                "created_at": trial_started,
                "trial_started_at": trial_started,
                "trial_ends_at": trial_ends,
                "payment_status": "trialing",
                "plan": "free",
                "purchased_slots": 50
            }
        })
        uid_str = str(uid)
        db.websites.update_many(
            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
            {"$set": {"is_licensed": True, "license_status": "trial", "is_protected": True}}
        )
        db.wordpress_sites.update_many(
            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
            {"$set": {"status": "online", "license_status": "active", "is_licensed": True}}
        )
        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception as e:
            print(f"    - Instant Sync Notice: {e}")
        print(f"\n[+] SUCCESS: Reset to Day 1 (Fresh 14-Day Free Trial) for {email}!")
        print(f"    - Trial Days Remaining: 14 days")
        print(f"    - Header Badge: '⏳ 14d Trial Left' (Green)")
        print(f"    - Protection: All connected websites active")

    elif mode_str in ("paid", "pro", "active"):
        # Simulate active paid plan with 2 purchased slots
        uid_str = str(uid)
        user_sites = list(db.websites.find({"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}}))
        licensed_ids = [str(s["_id"]) for s in user_sites[:2]]
        db.users.update_one(u_query, {
            "$set": {
                "payment_status": "active",
                "plan": "go",
                "purchased_slots": 2,
                "licensed_website_ids": licensed_ids
            }
        })
        for i, s in enumerate(user_sites):
            is_lic = (i < 2)
            db.websites.update_one(
                {"_id": s["_id"]},
                {"$set": {"is_licensed": is_lic, "license_status": "active" if is_lic else "unlicensed", "is_protected": is_lic}}
            )
        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception as e:
            print(f"    - Instant Sync Notice: {e}")
        print(f"\n[+] SUCCESS: Simulated Paid Pro Subscription for {email}!")
        print(f"    - Plan: Go (2 Website Slots)")
        print(f"    - Payment Status: active")
        print(f"    - 2-of-10 Invariant: User can assign exactly 2 websites; remainder paused")

    else:
        print(f"[-] Invalid mode '{mode}'. Choose from: 1, 10, 15, paid")
        sys.exit(1)

    # Show resolved state
    updated_user = db.users.find_one(u_query)
    state = LicenseSlotService(db).resolve_user_license_state(updated_user)
    print("\n--- Current Resolved State ---")
    print(f"  Plan:                 {state.get('plan')}")
    print(f"  Payment Status:       {state.get('payment_status')}")
    print(f"  Is Trial Active:      {state.get('is_trial_active')}")
    print(f"  Trial Days Remaining: {state.get('trial_days_remaining')}")
    print(f"  Purchased Slots:      {state.get('purchased_slots')}")
    print(f"  Is Paid:              {state.get('is_paid')}")
    print("------------------------------\n")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python backend/simulate_trial.py <user_email> <1|10|15|paid>")
        sys.exit(1)
    simulate(sys.argv[1], sys.argv[2])
