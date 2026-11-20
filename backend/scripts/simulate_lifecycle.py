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


def simulate_trial_day(db, user, day_number: int):
    now_utc = datetime.now(timezone.utc)
    day_number = max(1, int(day_number))
    started = now_utc - timedelta(days=day_number)
    # Total trial is 14 full days
    ends = started + timedelta(days=14)
    days_left = max(0, 14 - day_number)

    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    # Delete any conflicting paid subscription docs
    db.subscriptions.delete_many({"user_id": {"$in": target_uids}})

    db.users.update_one({"_id": uid}, {
        "$set": {
            "created_at": started,
            "trial_started_at": started,
            "trial_ends_at": ends,
            "payment_status": "trialing",
            "plan": "free",
            "plan_tier": "free",
            "effective_plan": "free",
            "purchased_slots": 1,
            "auto_renew": True,
            "cancel_at_period_end": False
        },
        "$unset": {"plan_expires": ""}
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()

    print("\n" + "=" * 65)
    print(f"  [SUCCESS] Simulated Day {day_number} of 14-Day Free Trial!")
    print("=" * 65)
    print(f"  * Current Day:       Day {day_number}")
    print(f"  * Trial Started:     {started.strftime('%Y-%m-%d %H:%M:%S UTC')} ({day_number} days ago)")
    print(f"  * Trial Ends:        {ends.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  * Days Remaining:    {days_left} Day(s) Left")

    if day_number >= 15:
        # Day 15+: Trial Expired (Hard Lockout)
        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception:
            pass
        print(f"  * State Classification: [HARD PAYWALL LOCKOUT]")
        print(f"  * Payment Status:       'trial_expired'")
        print(f"  * Purchased Slots:      0 website slots (Revoked)")
        print(f"  * WordPress WAF Status: PAUSED / DORMANT (Unlicensed)")
        print(f"  * What to verify in UI:")
        print("    1. Refresh user dashboard (Ctrl+F5).")
        print("    2. Non-dismissible Hard Paywall blocks all routes except '/user/pricing'.")
        print("    3. No bypass permitted until user purchases a subscription.")
    elif day_number >= 10:
        # Days 10 to 14: Soft Pre-Expiration Paywall
        print(f"  * State Classification: [SOFT PRE-EXPIRATION REMINDER]")
        print(f"  * Header Badge:         '⏳ {days_left} Days Left' (Warning Accent)")
        print(f"  * WordPress WAF Status: 100% FULLY ACTIVE (Layer-7 Protection Running)")
        print(f"  * What to verify in UI:")
        print("    1. Refresh dashboard or open in new tab.")
        print(f"    2. Top header badge shows: '⏳ {days_left} Days Left'.")
        print("    3. Soft Paywall modal shows Zero-Downtime Guarantee with $0 hold.")
        print("    4. Click 'Continue to dashboard' to dismiss and use dashboard freely.")
    else:
        # Days 1 to 9: Silent Active Trial
        print(f"  * State Classification: [SILENT ACTIVE TRIAL]")
        print(f"  * Header Badge:         '⏳ {days_left} Days Left' (Active Green)")
        print(f"  * WordPress WAF Status: 100% FULLY ACTIVE")
        print(f"  * What to verify in UI:")
        print("    1. Refresh user dashboard.")
        print(f"    2. Header badge shows: '⏳ {days_left} Days'.")
        print("    3. ZERO intrusive paywall popups. Full unrestricted dashboard access.")
    print("=" * 65 + "\n")


def simulate_day10(db, user):
    simulate_trial_day(db, user, 10)


def simulate_day14(db, user):
    simulate_trial_day(db, user, 14)


def simulate_day15(db, user):
    simulate_trial_day(db, user, 15)


def simulate_paid_subscription(db, user, cycle="monthly", sites=5):
    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    is_yearly = cycle in ("yearly", "annual", "annually")
    days_add = 365 if is_yearly else 30
    period_end = now_utc + timedelta(days=days_add)

    # Upsert clean subscription doc
    db.subscriptions.update_one(
        {"user_id": {"$in": target_uids}},
        {"$set": {
            "user_id": uid_str,
            "paddle_subscription_id": f"sub_sim_{str(uid_str)[-8:]}",
            "status": "active",
            "billing_cycle": "yearly" if is_yearly else "monthly",
            "current_period_start": now_utc,
            "current_period_end": period_end,
            "next_billed_at": period_end,
            "auto_renew": True,
            "cancel_at_period_end": False,
            "created_at": now_utc,
            "updated_at": now_utc
        }},
        upsert=True
    )

    db.users.update_one({"_id": uid}, {
        "$set": {
            "plan": "pro",
            "plan_tier": "pro",
            "effective_plan": "pro",
            "payment_status": "active",
            "purchased_slots": sites,
            "website_slots": sites,
            "billing_cycle": "yearly" if is_yearly else "monthly",
            "plan_expires": period_end,
            "auto_renew": True,
            "cancel_at_period_end": False,
            "last_payment_date": now_utc,
            "updated_at": now_utc
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()
    LicenseSlotService(db).get_slots_summary(uid_str)

    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print(f"  [SUCCESS] Simulated Active Pro Subscription ({cycle.capitalize()})!")
    print("=" * 65)
    print(f"  * Plan:               Pro Fleet ({sites} Website Slots)")
    print(f"  * Billing Cycle:      {cycle.capitalize()}")
    print(f"  * Payment Status:     'active'")
    print(f"  * Auto-Renew:         ON (recurring enabled)")
    print(f"  * Valid Until:        {period_end.strftime('%B %d, %Y')} ({days_add} days from now)")
    print(f"  * WordPress WAF:      100% Fully Licensed & Active")
    print(f"  * What to verify in UI:")
    print("    1. Refresh user dashboard (Ctrl+F5).")
    print("    2. Banner shows: 'PRO FLEET • Rate: $4/mo • Auto-Renew: ON'.")
    print("    3. Zero paywall interruptions.")
    print("=" * 65 + "\n")


def simulate_cancel_renew(db, user):
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]

    now_utc = datetime.now(timezone.utc)
    user_doc = db.users.find_one({"_id": user["_id"]})
    # Keep current expiration date, or set to 15 days remaining if unset
    cur_exp = user_doc.get("plan_expires")
    if cur_exp and isinstance(cur_exp, datetime) and cur_exp > now_utc:
        period_end = cur_exp
    else:
        period_end = now_utc + timedelta(days=15)

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

    SubscriptionService(db).check_and_process_subscription_lifecycle()

    print("\n" + "=" * 65)
    print("  [SUCCESS] Auto-Renewal has been CANCELED!")
    print("=" * 65)
    print(f"  * cancel_at_period_end: True")
    print(f"  * auto_renew:           False (Off)")
    print(f"  * Protected Until:      {period_end.strftime('%B %d, %Y')}")
    print(f"  * What to verify in UI:")
    print("    1. Refresh user dashboard or /user/pricing.")
    print("    2. Banner shows: 'Auto-Renew: OFF' with green button 'Turn Auto-Renew Back ON'.")
    print("    3. Protection remains 100% ACTIVE (no premature cut-off).")
    print("    4. No automatic charge will occur when period ends.")
    print("=" * 65 + "\n")


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
            "auto_renew": False,
            "updated_at": now_utc
        }}
    )

    db.users.update_one({"_id": user["_id"]}, {
        "$set": {
            "plan_expires": ended,
            "payment_status": "expired",
            "purchased_slots": 0,
            "auto_renew": False,
            "cancel_at_period_end": True,
            "updated_at": now_utc
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()
    LicenseSlotService(db).get_slots_summary(uid_str)

    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("  [SUCCESS] Paid Subscription has EXPIRED (Time Reached End of Period)!")
    print("=" * 65)
    print(f"  * Subscription Period Ended: Yesterday ({ended.strftime('%Y-%m-%d')})")
    print(f"  * User Payment Status:       'expired'")
    print(f"  * Purchased Slots:           0 (All slots paused)")
    print(f"  * WordPress WAF Status:      PAUSED / DORMANT (Unlicensed)")
    print(f"  * What to verify in UI:")
    print("    1. Hard Paywall lock is active.")
    print("    2. All dashboard routes are restricted except '/user/pricing'.")
    print("    3. User can click 'Renew / Upgrade' to reactivate.")
    print("    4. All billing receipts and transaction history remain 100% preserved.")
    print("=" * 65 + "\n")


def simulate_day14(db, user):
    now_utc = datetime.now(timezone.utc)
    started = now_utc - timedelta(days=13, hours=12)
    ends = now_utc + timedelta(hours=12)

    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]
    db.subscriptions.delete_many({"user_id": {"$in": target_uids}})
    db.users.update_one({"_id": uid}, {
        "$set": {
            "created_at": started,
            "trial_started_at": started,
            "trial_ends_at": ends,
            "payment_status": "trialing",
            "plan": "free",
            "plan_tier": "free",
            "effective_plan": "free"
        },
        "$unset": {"plan_expires": ""}
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()
    print("\n[SUCCESS] User has been put into Day 14 (Final Trial Day - 1 Day Left)!")
    print(f"  * Trial Started: 13.5 days ago")
    print(f"  * Days Remaining: 1 Day Left")
    print(f"  * What to verify in UI:")
    print("    1. Refresh user dashboard.")
    print("    2. Observe top header badge: '⏳ 1 Day Left'.")
    print("    3. Soft Paywall modal shows urgent continuity alert.")
    print("    4. Full Layer-7 WAF protection remains 100% active.\n")


def simulate_renew_success(db, user):
    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    user_doc = db.users.find_one({"_id": uid})
    cycle = user_doc.get("billing_cycle", "monthly")
    is_yearly = cycle in ("yearly", "annual", "annually")
    days_add = 365 if is_yearly else 30

    current_expires = user_doc.get("plan_expires")
    if current_expires and isinstance(current_expires, datetime) and current_expires > now_utc:
        new_expires = current_expires + timedelta(days=days_add)
    else:
        new_expires = now_utc + timedelta(days=days_add)

    db.users.update_one({"_id": uid}, {
        "$set": {
            "plan": "pro",
            "plan_tier": "pro",
            "payment_status": "active",
            "plan_expires": new_expires,
            "auto_renew": True,
            "cancel_at_period_end": False,
            "last_payment_date": now_utc,
            "updated_at": now_utc
        }
    })

    db.subscriptions.update_many({"user_id": {"$in": target_uids}}, {
        "$set": {
            "status": "active",
            "current_period_end": new_expires,
            "auto_renew": True,
            "cancel_at_period_end": False,
            "updated_at": now_utc
        }
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()

    print(f"\n[SUCCESS] Subscription Successfully Renewed for another {days_add} Days!")
    print(f"  * New Expiration Date: {new_expires.strftime('%B %d, %Y')}")
    print(f"  * Payment Status: 'active'")
    print(f"  * Auto-Renew: True")
    print(f"  * All protected websites remain continuously active with Zero Downtime.\n")


def simulate_reset_trial(db, user):
    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]
    # Delete active subscription records for clean trial reset
    db.subscriptions.delete_many({"user_id": {"$in": target_uids}})

    db.users.update_one({"_id": uid}, {
        "$set": {
            "created_at": now_utc,
            "trial_started_at": now_utc,
            "trial_ends_at": now_utc + timedelta(days=14),
            "payment_status": "trialing",
            "plan": "free",
            "plan_tier": "free",
            "effective_plan": "free",
            "purchased_slots": 1,
            "website_slots": 1,
            "auto_renew": True,
            "cancel_at_period_end": False
        },
        "$unset": {"plan_expires": ""}
    })

    SubscriptionService(db).check_and_process_subscription_lifecycle()
    LicenseSlotService(db).get_slots_summary(uid_str)
    print("\n[SUCCESS] User account reset to fresh Day-1 (14-Day Free Trial)!")
    print("  * 14 full days remaining.")
    print("  * Plan: Starter Free Trial (1 site slot).")
    print("  * Unrestricted access restored.\n")


def main():
    parser = argparse.ArgumentParser(description="MDefender Pro Subscription Lifecycle Simulator")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--action", required=False, default="status", help="Simulation action (e.g. status, day1, day7, day9, day10, day14, day15, cancel-renew, expire-paid, renew-success, reset-trial)")
    parser.add_argument("--day", required=False, type=int, default=None, help="Explicit day number to simulate (e.g. --day 9)")

    args = parser.parse_args()
    db = MongoDB()

    user = get_user(db, args.email)
    if not user:
        print(f"[ERROR] User with email/username '{args.email}' not found in MongoDB.")
        sys.exit(1)

    act = (args.action or "").strip().lower()

    # Handle explicit --day <N> or --action day<N>
    import re
    if args.day is not None:
        simulate_trial_day(db, user, args.day)
        print_status(db, user)
        return

    day_match = re.match(r"^day-?(\d+)$", act)
    if day_match:
        day_num = int(day_match.group(1))
        simulate_trial_day(db, user, day_num)
        print_status(db, user)
        return

    if act == "status":
        print_status(db, user)
    elif act in ("paid-monthly", "monthly", "pro-monthly"):
        simulate_paid_subscription(db, user, cycle="monthly", sites=5)
        print_status(db, user)
    elif act in ("paid-yearly", "yearly", "pro-yearly"):
        simulate_paid_subscription(db, user, cycle="yearly", sites=5)
        print_status(db, user)
    elif act == "cancel-renew":
        simulate_cancel_renew(db, user)
        print_status(db, user)
    elif act == "expire-paid":
        simulate_expire_paid(db, user)
        print_status(db, user)
    elif act == "renew-success":
        simulate_renew_success(db, user)
        print_status(db, user)
    elif act == "reset-trial":
        simulate_reset_trial(db, user)
        print_status(db, user)
    else:
        print(f"[ERROR] Unknown action '{args.action}'.")
        print("Available actions:")
        print("  - Any trial day: day1, day2, ..., day7, day8, day9, day10, ..., day14, day15 (or --day <N>)")
        print("  - Paid Lifecycle: paid-monthly, paid-yearly, cancel-renew, expire-paid, renew-success")
        print("  - General: status, reset-trial")
        sys.exit(1)


if __name__ == "__main__":
    main()
