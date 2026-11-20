"""
MDefender Pro - Subscription & Billing Lifecycle Simulation Tool
Allows instant testing of Day 10, Day 15 (Hard Paywall), Day 30 (Monthly Expiration),
Auto-Renewal Cancellation, and WordPress Live WAF protection without waiting real-world days.

Usage:
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action status
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day10
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day15
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action cancel-renew
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action expire-paid
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action reset-trial
"""

import sys
import os
import argparse
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService, _normalize_to_utc
from src.services.subscription_service import SubscriptionService
from src.services.plan_service import PlanService


def get_user(db, email):
    u = db.users.find_one({"email": email.strip().lower()})
    if not u:
        # Fallback search by username
        u = db.users.find_one({"username": email.strip().lower()})
    return u


def print_status(db, user):
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]

    # Auto-deduplicate any race duplicate paddle transactions
    try:
        user_txns = list(db.paddle_transactions.find({"user_id": {"$in": target_uids}}))
        seen_tids = {}
        for t in user_txns:
            tid = t.get("transaction_id")
            if tid:
                if tid not in seen_tids:
                    seen_tids[tid] = t["_id"]
                else:
                    db.paddle_transactions.delete_one({"_id": t["_id"]})
    except Exception:
        pass

    slot_svc = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)

    state = slot_svc.resolve_user_license_state(user)
    slots_summary = slot_svc.get_slots_summary(uid_str)
    active_sub = db.subscriptions.find_one({"user_id": {"$in": target_uids}}, sort=[("created_at", -1)])
    txns = list(db.paddle_transactions.find({"user_id": {"$in": target_uids}}).sort("created_at", -1).limit(5))
    sites = list(db.websites.find({"user_id": {"$in": target_uids}}))

    print("\n" + "=" * 65)
    print(f"  MDefender Pro — User Billing & Fleet Status: {user.get('email')}")
    print("=" * 65)
    print(f"User ID:               {uid_str}")
    print(f"Role:                  {user.get('role', 'user')}")
    print(f"Plan:                  {user.get('plan', 'free')} (Effective: {state.get('plan')})")
    print(f"Payment Status:        {user.get('payment_status', 'none')}")
    print(f"Is Paid:               {state.get('is_paid')}")
    print(f"Is Trial Active:       {state.get('is_trial_active')} ({state.get('trial_days_remaining')} days left)")
    print(f"Plan Expires:          {user.get('plan_expires')}")
    print(f"Auto-Renew:            {user.get('auto_renew', True)}")
    print(f"Cancel at Period End:  {user.get('cancel_at_period_end', False)}")
    print("-" * 65)
    print(f"Fleet Slots:           Total: {slots_summary.get('total_slots')} | Used: {slots_summary.get('used_slots')} | Available: {slots_summary.get('available_slots')}")
    print(f"Connected Websites:    {len(sites)} total")
    for s in sites:
        lic_txt = "LICENSED (Active WAF)" if s.get("is_licensed") else "UNLICENSED (WAF Dormant)"
        pause_txt = "[PAUSED]" if s.get("protection_paused") else "[ACTIVE]"
        print(f"  * {s.get('domain')} -> {lic_txt} {pause_txt}")

    print("-" * 65)
    if active_sub:
        print(f"Subscription ID:       {active_sub.get('paddle_subscription_id')}")
        print(f"Subscription Status:   {active_sub.get('status')}")
        print(f"Billing Cycle:         {active_sub.get('billing_cycle', 'monthly')}")
        print(f"Period End:            {active_sub.get('current_period_end')}")
        print(f"Next Billed At:        {active_sub.get('next_billed_at')}")
    else:
        print("Subscription:          No active Paddle subscription found.")

    print(f"Recent Transactions:   {len(txns)} recorded")
    for t in txns:
        amt = t.get("amount")
        amt_str = f"${int(amt)/100:.2f}" if amt else "$0.00"
        print(f"  * {t.get('transaction_id')} | {amt_str} {t.get('currency_code')} | Status: {t.get('status')} | Date: {t.get('created_at')}")
    print("=" * 65 + "\n")


def simulate_day10(db, user):
    now_utc = datetime.now(timezone.utc)
    started = now_utc - timedelta(days=10)
    ends = now_utc + timedelta(days=4)

    uid = user["_id"]
    db.users.update_one({"_id": uid}, {
        "$set": {
            "created_at": started,
            "trial_started_at": started,
            "trial_ends_at": ends,
            "payment_status": "trialing",
            "plan": "free"
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()
    print("\n[SUCCESS] User has been put into Day 10 of Free Trial!")
    print(f"  * Trial Started: 10 days ago ({started.strftime('%Y-%m-%d')})")
    print(f"  * Days Remaining: 4 Days Left")
    print(f"  * What to verify in UI:")
    print("    1. Refresh user dashboard (http://localhost:5173 or VPS URL).")
    print("    2. Observe top header badge: '⏳ 4 Days Left'.")
    print("    3. Check Notifications bell icon: 'Free Trial Notice: 4 Days Remaining' alert received.")
    print("    4. Full Layer-7 WAF protection remains active.\n")


def simulate_day15(db, user):
    now_utc = datetime.now(timezone.utc)
    started = now_utc - timedelta(days=15)
    ends = now_utc - timedelta(days=1)

    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    db.users.update_one({"_id": uid}, {
        "$set": {
            "created_at": started,
            "trial_started_at": started,
            "trial_ends_at": ends,
            "payment_status": "trialing",
            "plan": "free"
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()

    # Instant WordPress WAF sync push
    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print("\n[SUCCESS] User has been put into Day 15 (Free Trial Expired)!")
    print(f"  * Payment Status: 'trial_expired'")
    print(f"  * Purchased Slots: 0")
    print(f"  * Protection on all websites: PAUSED (Dormant)")
    print(f"  * What to verify in UI:")
    print("    1. Refresh user dashboard.")
    print("    2. Non-dismissible Hard Paywall Modal pops up immediately.")
    print("    3. All dashboard routes are blocked except '/user/pricing'.")
    print("    4. Live WordPress site receives dormant WAF response (Unlicensed).\n")


def simulate_cancel_renew(db, user):
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]

    now_utc = datetime.now(timezone.utc)
    # Give 20 days remaining in prepaid cycle
    period_end = now_utc + timedelta(days=20)

    db.subscriptions.update_many(
        {"user_id": {"$in": target_uids}},
        {"$set": {
            "cancel_at_period_end": True,
            "auto_renew": False,
            "current_period_end": period_end,
            "updated_at": now_utc
        }}
    )

    db.users.update_one({"_id": user["_id"]}, {
        "$set": {
            "cancel_at_period_end": True,
            "auto_renew": False,
            "plan_expires": period_end,
            "updated_at": now_utc
        }
    })

    print("\n[SUCCESS] Auto-Renewal has been CANCELED!")
    print(f"  * cancel_at_period_end: True")
    print(f"  * auto_renew: False")
    print(f"  * Current Prepaid Period Ends: {period_end.strftime('%Y-%m-%d')} (20 days remaining)")
    print(f"  * What to verify in UI:")
    print("    1. Go to '/user/pricing' or User Dashboard.")
    print("    2. Protection remains 100% ACTIVE (no premature cut-off).")
    print("    3. Status shows 'Auto-Renewal: Disabled (Protected until period end)'.")
    print("    4. No automatic charge will be billed next month.\n")


def simulate_expire_paid(db, user):
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]
    now_utc = datetime.now(timezone.utc)
    ended = now_utc - timedelta(days=1)

    db.subscriptions.update_many(
        {"user_id": {"$in": target_uids}},
        {"$set": {
            "current_period_end": ended,
            "status": "canceled",
            "updated_at": now_utc
        }}
    )

    db.users.update_one({"_id": user["_id"]}, {
        "$set": {
            "plan_expires": ended,
            "payment_status": "active",  # Watchdog will catch and process it cleanly!
            "updated_at": now_utc
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()

    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print("\n[SUCCESS] Paid Subscription has EXPIRED (Simulated Day 31 or Year End)!")
    print(f"  * Subscription Period Ended: Yesterday ({ended.strftime('%Y-%m-%d')})")
    print(f"  * User Payment Status: 'expired'")
    print(f"  * Purchased Slots: 0")
    print(f"  * All websites protection: PAUSED safely with zero data loss")
    print(f"  * What to verify in UI:")
    print("    1. Hard Paywall lock active.")
    print("    2. User can click 'Renew Plan' or go to '/user/pricing' to reactivate anytime.")
    print("    3. Previous transactions remain 100% saved in history.\n")


def simulate_reset_trial(db, user):
    now_utc = datetime.now(timezone.utc)
    db.users.update_one({"_id": user["_id"]}, {
        "$set": {
            "created_at": now_utc,
            "trial_started_at": now_utc,
            "trial_ends_at": now_utc + timedelta(days=14),
            "payment_status": "trialing",
            "plan": "free",
            "purchased_slots": 1,
            "auto_renew": True,
            "cancel_at_period_end": False
        },
        "$unset": {"plan_expires": ""}
    })

    LicenseSlotService(db).get_slots_summary(str(user["_id"]))
    print("\n[SUCCESS] User account reset to fresh Day-1 (14-Day Free Trial)!")
    print("  * 14 full days remaining.")
    print("  * Unrestricted access restored.\n")


def main():
    parser = argparse.ArgumentParser(description="MDefender Pro Subscription Lifecycle Simulator")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--action", required=True, choices=["status", "day10", "day15", "cancel-renew", "expire-paid", "reset-trial"], help="Simulation action")

    args = parser.parse_args()
    db = MongoDB()

    user = get_user(db, args.email)
    if not user:
        print(f"[ERROR] User with email/username '{args.email}' not found in MongoDB.")
        sys.exit(1)

    if args.action == "status":
        print_status(db, user)
    elif args.action == "day10":
        simulate_day10(db, user)
        print_status(db, user)
    elif args.action == "day15":
        simulate_day15(db, user)
        print_status(db, user)
    elif args.action == "cancel-renew":
        simulate_cancel_renew(db, user)
        print_status(db, user)
    elif args.action == "expire-paid":
        simulate_expire_paid(db, user)
        print_status(db, user)
    elif args.action == "reset-trial":
        simulate_reset_trial(db, user)
        print_status(db, user)


if __name__ == "__main__":
    main()
