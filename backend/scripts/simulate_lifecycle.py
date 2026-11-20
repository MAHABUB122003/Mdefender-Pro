"""
MDefender Pro - Subscription & Billing Lifecycle & Paddle Gateway Tool
Allows instant testing of Day 10, Day 15 (Hard Paywall), Day 30 (Monthly Expiration),
Auto-Renewal Cancellation, Real Paddle API Synchronization, and Real Paddle Charges.

Usage:
    # --- Check Status ---
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action status

    # --- 100% REAL Paddle Sandbox Integration (No Mock Data) ---
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action sync-paddle
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action real-renew
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action real-charge

    # --- Free Trial Lifecycle (Days 1 to 15) ---
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day1
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day9
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day10
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day14
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action day15
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action reset-trial

    # --- Pro Subscription Day-by-Day Lifecycle (Days 1 to 31+) ---
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day1
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day10
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day20 --auto-renew off
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day27
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day30
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day31 --auto-renew on
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action pro-day31 --auto-renew off

    # --- Quick Actions ---
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action cancel-renew
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action renew-success
    python backend/scripts/simulate_lifecycle.py --email <user_email> --action expire-paid
"""

import sys
import os
import re
import math
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
from src.services.paddle_service import PaddleService


def get_user(db, email):
    u = db.users.find_one({"email": email.strip().lower()})
    if not u:
        # Fallback search by username
        u = db.users.find_one({"username": email.strip().lower()})
    return u


def print_status(db, user):
    # Always fetch freshest user doc from DB
    fresh_user = db.users.find_one({"_id": user["_id"]})
    if fresh_user:
        user = fresh_user

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

    print("\n" + "=" * 68)
    print(f"  MDefender Pro — User Billing & Fleet Status: {user.get('email')}")
    print("=" * 68)
    print(f"User ID:               {uid_str}")
    print(f"Role:                  {user.get('role', 'user')}")
    print(f"Plan:                  {user.get('plan', 'free')} (Effective: {state.get('plan')})")
    print(f"Payment Status:        {user.get('payment_status', 'none')}")
    print(f"Is Paid:               {state.get('is_paid')}")
    print(f"Is Trial Active:       {state.get('is_trial_active')} ({state.get('trial_days_remaining')} days left)")
    print(f"Plan Expires:          {user.get('plan_expires')}")
    print(f"Auto-Renew:            {user.get('auto_renew', True)}")
    print(f"Cancel at Period End:  {user.get('cancel_at_period_end', False)}")
    print("-" * 68)
    print(f"Fleet Slots:           Total: {slots_summary.get('total_slots')} | Used: {slots_summary.get('used_slots')} | Available: {slots_summary.get('available_slots')}")
    print(f"Connected Websites:    {len(sites)} total")
    for s in sites:
        lic_txt = "LICENSED (Active WAF)" if s.get("is_licensed") else "UNLICENSED (WAF Dormant)"
        pause_txt = "[PAUSED]" if s.get("protection_paused") else "[ACTIVE]"
        print(f"  * {s.get('domain')} -> {lic_txt} {pause_txt}")

    print("-" * 68)
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
    print("=" * 68 + "\n")


def sync_paddle_account(db, user):
    """
    Syncs 100% authentic live data from Paddle Sandbox/Production API.
    - Purges any simulated/mock test receipts (txn_sim_*)
    - Pulls real Customer ID (ctm_*)
    - Pulls real Subscription (sub_*) with real billing periods
    - Pulls real Transactions (txn_*) with official Paddle receipts
    - Synchronizes Fleet Slots and live WordPress WAF
    """
    now_utc = datetime.now(timezone.utc)
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]

    # 1. Purge all mock/simulated transactions from DB
    purged = db.paddle_transactions.delete_many({
        "user_id": {"$in": target_uids},
        "transaction_id": {"$regex": "^txn_sim_"}
    })
    if purged.deleted_count > 0:
        print(f"[*] Cleaned up {purged.deleted_count} mock/simulated test receipt(s).")

    paddle = PaddleService(db=db)
    if not paddle.configured:
        print("[ERROR] Paddle API Key or Webhook Secret is not configured.")
        return

    import httpx
    headers = paddle._headers()
    email = user.get("email", "").strip().lower()

    print(f"\n[*] Querying Real Paddle API ({paddle.environment}) for customer: {email}...")

    # 2. Find real customer in Paddle
    try:
        r_cust = httpx.get(f"{paddle.base_url}/customers?email={email}", headers=headers, timeout=15)
        cust_data = r_cust.json().get("data", [])
    except Exception as e:
        print(f"[ERROR] Failed to connect to Paddle API: {e}")
        return

    if not cust_data:
        print(f"[WARNING] No customer found in Paddle Sandbox with email '{email}'.")
        return

    customer = cust_data[0]
    customer_id = customer["id"]
    print(f"[+] Real Paddle Customer ID: {customer_id}")

    # 3. Pull real subscriptions
    r_subs = httpx.get(f"{paddle.base_url}/subscriptions?customer_id={customer_id}", headers=headers, timeout=15)
    subs = r_subs.json().get("data", [])
    active_sub = None
    for s in subs:
        if s.get("status") in ("active", "trialing", "past_due"):
            active_sub = s
            break
    if not active_sub and subs:
        active_sub = subs[0]

    # 4. Pull real transactions
    r_txns = httpx.get(f"{paddle.base_url}/transactions?customer_id={customer_id}", headers=headers, timeout=15)
    all_txns = r_txns.json().get("data", [])
    completed_txns = [t for t in all_txns if t.get("status") in ("completed", "paid", "billed")]

    print(f"[+] Found {len(completed_txns)} Real Completed Transactions in Paddle:")
    for t in completed_txns:
        tid = t["id"]
        total = t.get("details", {}).get("totals", {}).get("total")
        curr = t.get("currency_code", "USD")
        rec = {
            "user_id": uid_str,
            "customer_email": email,
            "transaction_id": tid,
            "paddle_transaction_id": tid,
            "status": "paid",
            "amount": total,
            "currency_code": curr,
            "billed_at": t.get("billed_at") or t.get("created_at"),
            "created_at": _normalize_to_utc(t.get("created_at"), now_utc),
            "updated_at": now_utc,
            "receipt_url": f"https://sandbox-receipts.paddle.com/{tid}" if paddle.environment == "sandbox" else f"https://receipts.paddle.com/{tid}"
        }
        db.paddle_transactions.update_one({"transaction_id": tid}, {"$set": rec}, upsert=True)
        amt_str = f"${int(total)/100:.2f}" if total else "$0.00"
        print(f"    * {tid} | Amount: {amt_str} {curr} | Date: {t.get('created_at')}")

    # 5. Update user and subscription record with real Paddle data
    if active_sub:
        sub_id = active_sub["id"]
        sub_status = active_sub.get("status", "active")
        billing_period = active_sub.get("current_billing_period") or {}
        p_start = _normalize_to_utc(billing_period.get("starts_at"), now_utc)
        p_end = _normalize_to_utc(billing_period.get("ends_at"), now_utc + timedelta(days=30))

        scheduled_change = active_sub.get("scheduled_change")
        is_cancelled = bool(scheduled_change and scheduled_change.get("action") == "cancel")
        auto_renew = not is_cancelled

        items = active_sub.get("items") or []
        first_item = items[0] if items and isinstance(items[0], dict) else {}
        slots_count = int(first_item.get("quantity") or 5)

        cycle_raw = (active_sub.get("billing_cycle") or {}).get("interval") or "month"
        cycle = "yearly" if cycle_raw == "year" else "monthly"

        db.subscriptions.update_one(
            {"user_id": {"$in": target_uids}},
            {"$set": {
                "user_id": uid_str,
                "paddle_subscription_id": sub_id,
                "customer_id": customer_id,
                "status": sub_status,
                "billing_cycle": cycle,
                "purchased_slots": slots_count,
                "current_period_start": p_start,
                "current_period_end": p_end,
                "next_billed_at": active_sub.get("next_billed_at") or p_end,
                "auto_renew": auto_renew,
                "cancel_at_period_end": is_cancelled,
                "scheduled_change": scheduled_change,
                "updated_at": now_utc
            }},
            upsert=True
        )

        db.users.update_one({"_id": user["_id"]}, {
            "$set": {
                "plan": "pro",
                "plan_tier": "pro",
                "effective_plan": "pro",
                "payment_status": "active" if sub_status == "active" else sub_status,
                "paddle_subscription_id": sub_id,
                "paddle_customer_id": customer_id,
                "purchased_slots": slots_count,
                "website_slots": slots_count,
                "billing_cycle": cycle,
                "plan_expires": p_end,
                "auto_renew": auto_renew,
                "cancel_at_period_end": is_cancelled,
                "last_payment_date": p_start,
                "updated_at": now_utc
            }
        })
        print(f"\n[+] Real Active Subscription Synced: {sub_id}")
        print(f"    * Period End:   {p_end.strftime('%Y-%m-%d %H:%M UTC')}")
        print(f"    * Auto-Renew:   {'ON' if auto_renew else 'OFF (Scheduled to conclude at period end)'}")
        print(f"    * Fleet Slots:  {slots_count} Website Slots")

    LicenseSlotService(db).get_slots_summary(uid_str)
    SubscriptionService(db).check_and_process_subscription_lifecycle()

    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print("\n[SUCCESS] Local database is now 100% synchronized with Real Paddle Sandbox!")


def real_charge_paddle(db, user, amount_in_cents=400):
    """
    Executes a 100% REAL charge on the user's active Paddle subscription in Paddle Sandbox/Production!
    - Calls POST https://sandbox-api.paddle.com/subscriptions/{sub_id}/charge
    - Paddle charges the saved card in Paddle's vault
    - Returns official completed Paddle Transaction ID (txn_*)
    - Creates authentic receipt in MongoDB and extends subscription
    """
    paddle = PaddleService(db=db)
    if not paddle.configured:
        print("[ERROR] Paddle API is not configured.")
        return

    import httpx
    headers = paddle._headers()

    user_doc = db.users.find_one({"_id": user["_id"]}) or user
    sub_id = user_doc.get("paddle_subscription_id")
    if not sub_id:
        sub = db.subscriptions.find_one({"user_id": {"$in": [str(user["_id"]), user["_id"]]}})
        if sub:
            sub_id = sub.get("paddle_subscription_id")

    if not sub_id:
        # Fallback query from Paddle customer
        email = user_doc.get("email", "").strip().lower()
        r_cust = httpx.get(f"{paddle.base_url}/customers?email={email}", headers=headers, timeout=15)
        custs = r_cust.json().get("data", [])
        if custs:
            cid = custs[0]["id"]
            r_subs = httpx.get(f"{paddle.base_url}/subscriptions?customer_id={cid}", headers=headers, timeout=15)
            subs = r_subs.json().get("data", [])
            if subs:
                sub_id = subs[0]["id"]

    if not sub_id:
        print("[ERROR] No real Paddle Subscription ID found for this user.")
        print("  Please complete a checkout via Paddle first to establish a subscription.")
        return

    print(f"\n[*] Requesting REAL Charge from Paddle API for Subscription: {sub_id}...")

    payload = {
        "items": [
            {
                "price": {
                    "description": "MDefender Pro - Monthly Auto-Renewal",
                    "product_id": "pro_01m7r3fnmwga2hzeyat6m1p90s",
                    "unit_price": {"amount": str(amount_in_cents), "currency_code": "USD"}
                },
                "quantity": 1
            }
        ],
        "effective_from": "immediately"
    }

    try:
        r = httpx.post(f"{paddle.base_url}/subscriptions/{sub_id}/charge", headers=headers, json=payload, timeout=20)
        if r.status_code not in (200, 201):
            print(f"[ERROR] Paddle charge failed (HTTP {r.status_code}): {r.text}")
            return

        # Fetch the newly generated transaction
        r_txns = httpx.get(f"{paddle.base_url}/transactions?subscription_id={sub_id}", headers=headers, timeout=15)
        txns = r_txns.json().get("data", [])
        latest_txn = txns[0] if txns else None

        if latest_txn:
            real_txn_id = latest_txn["id"]
            tot = latest_txn.get("details", {}).get("totals", {}).get("total") or amount_in_cents
            now_utc = datetime.now(timezone.utc)
            uid_str = str(user["_id"])

            rec = {
                "user_id": uid_str,
                "customer_email": user.get("email"),
                "transaction_id": real_txn_id,
                "paddle_transaction_id": real_txn_id,
                "status": "paid",
                "amount": tot,
                "currency_code": "USD",
                "billed_at": latest_txn.get("billed_at") or now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "created_at": now_utc,
                "updated_at": now_utc,
                "receipt_url": f"https://sandbox-receipts.paddle.com/{real_txn_id}" if paddle.environment == "sandbox" else f"https://receipts.paddle.com/{real_txn_id}"
            }
            db.paddle_transactions.update_one({"transaction_id": real_txn_id}, {"$set": rec}, upsert=True)

            cur_exp = _normalize_to_utc(user_doc.get("plan_expires"), None)
            if cur_exp and cur_exp > now_utc:
                new_exp = cur_exp + timedelta(days=30)
            else:
                new_exp = now_utc + timedelta(days=30)

            db.users.update_one({"_id": user["_id"]}, {
                "$set": {
                    "plan": "pro",
                    "payment_status": "active",
                    "plan_expires": new_exp,
                    "last_payment_date": now_utc,
                    "auto_renew": True,
                    "cancel_at_period_end": False,
                    "updated_at": now_utc
                }
            })

            db.subscriptions.update_one({"user_id": {"$in": [uid_str, user["_id"]]}}, {
                "$set": {
                    "current_period_end": new_exp,
                    "status": "active",
                    "auto_renew": True,
                    "cancel_at_period_end": False,
                    "updated_at": now_utc
                }
            })

            print("\n" + "=" * 68)
            print("  [SUCCESS] 100% REAL PADDLE REVENUE CHARGE EXECUTED!")
            print("=" * 68)
            print(f"  * Real Paddle Txn ID: {real_txn_id}")
            print(f"  * Status:              {latest_txn.get('status')}")
            print(f"  * Amount Charged:      ${int(tot)/100:.2f} USD")
            print(f"  * Official Receipt:    https://sandbox-receipts.paddle.com/{real_txn_id}")
            print(f"  * New Expiration Date: {new_exp.strftime('%B %d, %Y')}")
            print(f"  * What to verify in Paddle Dashboard:")
            print(f"    1. Log into https://sandbox-vendors.paddle.com")
            print(f"    2. Go to Transactions Menu -> Search for '{real_txn_id}'.")
            print(f"    3. Observe the live completed payment record directly inside Paddle!")
            print("=" * 68 + "\n")

    except Exception as e:
        print(f"[ERROR] Exception during Paddle charge: {e}")


def simulate_trial_day(db, user, day_number: int):
    now_utc = datetime.now(timezone.utc)
    day_number = max(1, int(day_number))
    started = now_utc - timedelta(days=day_number)
    ends = started + timedelta(days=14)
    days_left = max(0, 14 - day_number)

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

    print("\n" + "=" * 68)
    print(f"  [SUCCESS] Simulated Day {day_number} of 14-Day Free Trial!")
    print("=" * 68)
    print(f"  * Current Day:       Day {day_number}")
    print(f"  * Trial Started:     {started.strftime('%Y-%m-%d %H:%M:%S UTC')} ({day_number} days ago)")
    print(f"  * Trial Ends:        {ends.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  * Days Remaining:    {days_left} Day(s) Left")

    if day_number >= 15:
        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception:
            pass
        print(f"  * State Classification: [HARD PAYWALL LOCKOUT]")
        print(f"  * Payment Status:       'trial_expired'")
        print(f"  * Purchased Slots:      0 website slots (Revoked)")
        print(f"  * WordPress WAF Status: PAUSED / DORMANT (Unlicensed)")
    elif day_number >= 10:
        print(f"  * State Classification: [SOFT PRE-EXPIRATION REMINDER]")
        print(f"  * Header Badge:         '⏳ {days_left} Days Left' (Warning Accent)")
        print(f"  * WordPress WAF Status: 100% FULLY ACTIVE (Layer-7 Protection Running)")
    else:
        print(f"  * State Classification: [SILENT ACTIVE TRIAL]")
        print(f"  * Header Badge:         '⏳ {days_left} Days Left' (Active Green)")
        print(f"  * WordPress WAF Status: 100% FULLY ACTIVE")
    print("=" * 68 + "\n")


def simulate_pro_day(db, user, day_number: int, auto_renew: bool = None, cycle: str = "monthly", sites: int = None):
    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    user_doc = db.users.find_one({"_id": uid}) or user
    existing_slots = user_doc.get("purchased_slots") or user_doc.get("website_slots") or 5
    if sites is None or sites <= 0:
        sites = existing_slots if existing_slots > 0 else 5

    if auto_renew is None:
        cur_ar = user_doc.get("auto_renew")
        auto_renew = True if cur_ar is None else bool(cur_ar)

    is_yearly = str(cycle).lower() in ("yearly", "annual", "annually")
    period_days = 365 if is_yearly else 30
    billing_cycle = "yearly" if is_yearly else "monthly"

    day_num = max(1, int(day_number))
    days_passed = day_num - 1
    started = now_utc - timedelta(days=days_passed)
    period_end = started + timedelta(days=period_days)
    days_left = max(0, int(math.ceil((period_end - now_utc).total_seconds() / 86400)))

    # CASE A: WITHIN PREPAID PERIOD (Day 1 to 30)
    if day_num <= period_days:
        cancel_at_period_end = not auto_renew

        sub_doc = {
            "user_id": uid_str,
            "paddle_subscription_id": user_doc.get("paddle_subscription_id") or f"sub_sim_{str(uid_str)[-8:]}",
            "status": "active",
            "billing_cycle": billing_cycle,
            "purchased_slots": sites,
            "current_period_start": started,
            "current_period_end": period_end,
            "next_billed_at": period_end,
            "auto_renew": auto_renew,
            "cancel_at_period_end": cancel_at_period_end,
            "updated_at": now_utc
        }
        db.subscriptions.update_one(
            {"user_id": {"$in": target_uids}},
            {"$set": sub_doc},
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
                "billing_cycle": billing_cycle,
                "plan_expires": period_end,
                "auto_renew": auto_renew,
                "cancel_at_period_end": cancel_at_period_end,
                "last_payment_date": started,
                "updated_at": now_utc
            }
        })

        LicenseSlotService(db).get_slots_summary(uid_str)
        SubscriptionService(db).check_and_process_subscription_lifecycle()

        try:
            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
            push_instant_sync_to_wordpress(user_id=uid_str)
        except Exception:
            pass

        print("\n" + "=" * 68)
        print(f"  [SUCCESS] Simulated Day {day_num} of {period_days}-Day Pro Subscription ({billing_cycle.capitalize()})!")
        print("=" * 68)
        print(f"  * Plan:                 Pro Fleet ({sites} Website Slots)")
        print(f"  * Current Day:          Day {day_num} of {period_days}")
        print(f"  * Subscription Started: {started.strftime('%Y-%m-%d %H:%M UTC')} ({days_passed} day(s) ago)")
        print(f"  * Period Renews/Ends:   {period_end.strftime('%Y-%m-%d %H:%M UTC')}")
        print(f"  * Days Remaining:       {days_left} Day(s) Left")
        print(f"  * Auto-Renew:           {'ON (Recurring Billing Active)' if auto_renew else 'OFF (Prepaid ends without renewal)'}")
        print(f"  * Payment Status:       'active'")
        print(f"  * Fleet Slots:          {sites} Website Slots Active")
        print(f"  * WordPress WAF Status: 100% FULLY ACTIVE (Zero-Interruption Layer-7 AST)")

        if days_left <= 3:
            print("\n  [LIFECYCLE EVENT: UPCOMING RENEWAL REMINDER (3 Days or Less)]")
            if auto_renew:
                print("  * System Status: Notification sent: 'Upcoming Renewal in X Days'.")
                print("  * Auto-billing will run at period end. Fleet protection continues without interruption.")
            else:
                print("  * System Status: Auto-renew is OFF. Notification sent: 'Subscription concluding soon'.")
                print("  * User can click 'Turn Auto-Renew Back ON' or renew manually before period ends.")
        else:
            print("\n  [LIFECYCLE EVENT: NORMAL ACTIVE FLEET]")
            print(f"  * Unrestricted access to all dashboard routes and WAF features.")
            print(f"  * Auto-Renew toggle on /user/pricing shows: {'Auto-Renew: ON' if auto_renew else 'Auto-Renew: OFF'}.")

        print("=" * 68 + "\n")

    # CASE B: PERIOD EXCEEDED (Day 31+)
    else:
        if auto_renew:
            # Check if user has a real Paddle subscription; if so, execute a REAL charge on Paddle!
            real_sub_id = user_doc.get("paddle_subscription_id")
            if real_sub_id and str(real_sub_id).startswith("sub_01"):
                print("[*] Active real Paddle Subscription detected. Triggering REAL charge on Paddle API...")
                real_charge_paddle(db, user, amount_in_cents=400)
                return

            # Otherwise, extend cycle locally
            new_period_start = period_end
            new_period_end = period_end + timedelta(days=period_days)
            new_days_left = max(0, int(math.ceil((new_period_end - now_utc).total_seconds() / 86400)))

            db.subscriptions.update_one(
                {"user_id": {"$in": target_uids}},
                {"$set": {
                    "status": "active",
                    "billing_cycle": billing_cycle,
                    "purchased_slots": sites,
                    "current_period_start": new_period_start,
                    "current_period_end": new_period_end,
                    "next_billed_at": new_period_end,
                    "auto_renew": True,
                    "cancel_at_period_end": False,
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
                    "billing_cycle": billing_cycle,
                    "plan_expires": new_period_end,
                    "auto_renew": True,
                    "cancel_at_period_end": False,
                    "last_payment_date": period_end,
                    "updated_at": now_utc
                }
            })

            LicenseSlotService(db).get_slots_summary(uid_str)
            SubscriptionService(db).check_and_process_subscription_lifecycle()

            print("\n" + "=" * 68)
            print(f"  [SUCCESS] Day {day_num}: AUTO-RENEWAL EXECUTED WITH ZERO DOWNTIME!")
            print("=" * 68)
            print(f"  * Scenario:             Auto-Renew was ON on Day 30")
            print(f"  * Previous Period Concluded: {period_end.strftime('%Y-%m-%d %H:%M UTC')}")
            print(f"  * New Period Valid:     {new_period_start.strftime('%Y-%m-%d')} to {new_period_end.strftime('%Y-%m-%d %H:%M UTC')}")
            print(f"  * Days Remaining:       {new_days_left} Day(s) in NEW Billing Cycle")
            print(f"  * Payment Status:       'active'")
            print(f"  * WordPress WAF Status: 100% UNINTERRUPTED PROTECTION (Zero Downtime)")
            print("=" * 68 + "\n")

        else:
            # Auto-Renew was OFF -> EXPIRED
            db.subscriptions.update_many(
                {"user_id": {"$in": target_uids}},
                {"$set": {
                    "current_period_end": period_end,
                    "status": "canceled",
                    "auto_renew": False,
                    "cancel_at_period_end": True,
                    "updated_at": now_utc
                }}
            )

            db.users.update_one({"_id": uid}, {
                "$set": {
                    "plan_expires": period_end,
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

            print("\n" + "=" * 68)
            print(f"  [SUCCESS] Day {day_num}: PRO SUBSCRIPTION HAS EXPIRED (Auto-Renew was OFF)!")
            print("=" * 68)
            print(f"  * Scenario:             Auto-Renew was OFF when 30-Day Period ended")
            print(f"  * Period Ended On:      {period_end.strftime('%Y-%m-%d %H:%M UTC')} ({day_num - period_days} day(s) ago)")
            print(f"  * Payment Status:       'expired'")
            print(f"  * State Classification: [HARD PAYWALL LOCKOUT - PRO EXPIRED]")
            print(f"  * Fleet Slots:          0 Website Slots (Protection Paused)")
            print(f"  * WordPress WAF Status: PAUSED / DORMANT (Unlicensed)")
            print("=" * 68 + "\n")


def simulate_cancel_renew(db, user):
    uid_str = str(user["_id"])
    target_uids = [uid_str, user["_id"]]

    now_utc = datetime.now(timezone.utc)
    user_doc = db.users.find_one({"_id": user["_id"]})
    cur_exp = _normalize_to_utc(user_doc.get("plan_expires"), None)
    if cur_exp and cur_exp > now_utc:
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

    print("\n" + "=" * 68)
    print("  [SUCCESS] Auto-Renewal has been CANCELED!")
    print("=" * 68)
    print(f"  * cancel_at_period_end: True")
    print(f"  * auto_renew:           False (Off)")
    print(f"  * Protected Until:      {period_end.strftime('%B %d, %Y')}")
    print("=" * 68 + "\n")


def simulate_expire_paid(db, user):
    simulate_pro_day(db, user, day_number=31, auto_renew=False)


def simulate_renew_success(db, user):
    # Check if user has real Paddle sub; if so, trigger real charge!
    user_doc = db.users.find_one({"_id": user["_id"]}) or user
    sub_id = user_doc.get("paddle_subscription_id")
    if sub_id and str(sub_id).startswith("sub_01"):
        real_charge_paddle(db, user)
        return

    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]

    cycle = user_doc.get("billing_cycle", "monthly")
    is_yearly = cycle in ("yearly", "annual", "annually")
    days_add = 365 if is_yearly else 30
    sites = user_doc.get("purchased_slots") or user_doc.get("website_slots") or 5

    current_expires = _normalize_to_utc(user_doc.get("plan_expires"), None)
    if current_expires and current_expires > now_utc:
        new_expires = current_expires + timedelta(days=days_add)
    else:
        new_expires = now_utc + timedelta(days=days_add)

    db.users.update_one({"_id": uid}, {
        "$set": {
            "plan": "pro",
            "plan_tier": "pro",
            "payment_status": "active",
            "purchased_slots": sites,
            "website_slots": sites,
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
    LicenseSlotService(db).get_slots_summary(uid_str)

    try:
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=uid_str)
    except Exception:
        pass

    print(f"\n[SUCCESS] Subscription Successfully Renewed for another {days_add} Days!")
    print(f"  * New Expiration Date: {new_expires.strftime('%B %d, %Y')}")
    print(f"  * Payment Status: 'active'")
    print(f"  * Auto-Renew: True\n")


def simulate_reset_trial(db, user):
    now_utc = datetime.now(timezone.utc)
    uid = user["_id"]
    uid_str = str(uid)
    target_uids = [uid_str, uid]
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
    print("\n[SUCCESS] User account reset to fresh Day-1 (14-Day Free Trial)!\n")


def main():
    parser = argparse.ArgumentParser(description="MDefender Pro Subscription Lifecycle & Paddle Gateway Simulator")
    parser.add_argument("--email", required=True, help="User email address or username")
    parser.add_argument("--action", required=False, default="status", help="Simulation action")
    parser.add_argument("--day", required=False, type=int, default=None, help="Explicit day number to simulate (e.g. --day 10)")
    parser.add_argument("--plan", required=False, default=None, choices=["trial", "pro", "free"], help="Target plan context")
    parser.add_argument("--auto-renew", required=False, default=None, choices=["on", "off", "true", "false", "cancel"], help="Toggle auto-renewal state (on/off)")
    parser.add_argument("--cycle", required=False, default="monthly", choices=["monthly", "yearly"], help="Billing cycle")
    parser.add_argument("--sites", required=False, type=int, default=None, help="Number of website slots")

    args = parser.parse_args()
    db = MongoDB()

    user = get_user(db, args.email)
    if not user:
        print(f"[ERROR] User with email/username '{args.email}' not found in MongoDB.")
        sys.exit(1)

    act = (args.action or "").strip().lower()

    # Determine auto-renew flag override if provided
    auto_renew_override = None
    if args.auto_renew:
        ar_str = str(args.auto_renew).strip().lower()
        if ar_str in ("on", "true", "1", "yes"):
            auto_renew_override = True
        elif ar_str in ("off", "false", "0", "no", "cancel"):
            auto_renew_override = False

    # 1. REAL PADDLE ACTIONS
    if act in ("sync-paddle", "sync_paddle", "sync"):
        sync_paddle_account(db, user)
        print_status(db, user)
        return

    if act in ("real-renew", "real-charge", "paddle-charge", "paddle-renew"):
        real_charge_paddle(db, user, amount_in_cents=400)
        print_status(db, user)
        return

    # 2. PRO DAY MATCHING
    pro_day_match = (
        re.match(r"^pro-?day-?(\d+)$", act) or
        re.match(r"^paid-?day-?(\d+)$", act) or
        re.match(r"^pro-(\d+)$", act)
    )
    if pro_day_match:
        day_num = int(pro_day_match.group(1))
        simulate_pro_day(db, user, day_number=day_num, auto_renew=auto_renew_override, cycle=args.cycle, sites=args.sites)
        print_status(db, user)
        return

    if act in ("pro-day", "pro_day", "paid-day", "paid_day", "pro"):
        day_num = args.day if args.day is not None else 1
        simulate_pro_day(db, user, day_number=day_num, auto_renew=auto_renew_override, cycle=args.cycle, sites=args.sites)
        print_status(db, user)
        return

    # 3. TRIAL DAY MATCHING
    trial_day_match = (
        re.match(r"^day-?(\d+)$", act) or
        re.match(r"^trial-?day-?(\d+)$", act)
    )
    if trial_day_match:
        day_num = int(trial_day_match.group(1))
        if args.plan == "pro":
            simulate_pro_day(db, user, day_number=day_num, auto_renew=auto_renew_override, cycle=args.cycle, sites=args.sites)
        else:
            simulate_trial_day(db, user, day_num)
        print_status(db, user)
        return

    if args.day is not None:
        if args.plan == "pro" or act in ("pro", "paid"):
            simulate_pro_day(db, user, day_number=args.day, auto_renew=auto_renew_override, cycle=args.cycle, sites=args.sites)
        elif args.plan in ("trial", "free"):
            simulate_trial_day(db, user, args.day)
        else:
            cur_plan = str(user.get("plan") or "free").lower()
            if cur_plan == "pro" and user.get("payment_status") in ("active", "expired"):
                simulate_pro_day(db, user, day_number=args.day, auto_renew=auto_renew_override, cycle=args.cycle, sites=args.sites)
            else:
                simulate_trial_day(db, user, args.day)
        print_status(db, user)
        return

    if act == "status":
        print_status(db, user)
    elif act in ("paid-monthly", "monthly", "pro-monthly"):
        simulate_pro_day(db, user, day_number=1, auto_renew=True, cycle="monthly", sites=args.sites or 5)
        print_status(db, user)
    elif act in ("paid-yearly", "yearly", "pro-yearly"):
        simulate_pro_day(db, user, day_number=1, auto_renew=True, cycle="yearly", sites=args.sites or 5)
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
        print("\nAvailable Lifecycle & Paddle Actions:")
        print("  1. REAL Paddle Sandbox:        sync-paddle, real-renew, real-charge")
        print("  2. Free Trial Lifecycle:       day1, day7, day9, day10, day14, day15, reset-trial")
        print("  3. Pro Subscription Lifecycle: pro-day1, pro-day10, pro-day20, pro-day27, pro-day30, pro-day31")
        print("  4. Auto-Renew Flags:           --auto-renew on / --auto-renew off")
        print("  5. Quick Actions:              cancel-renew, expire-paid, renew-success, status")
        sys.exit(1)


if __name__ == "__main__":
    main()
