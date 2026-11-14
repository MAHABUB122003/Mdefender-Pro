#!/usr/bin/env python3
"""
MDefender SaaS Live Trial & Subscription Simulator for VPS / Local Testing.
Usage:
    # 1. Simulate Day 10 (Soft prompt modal with 4 days remaining):
    python backend/scripts/simulate_trial_days.py --email user@example.com --days 4

    # 2. Simulate Day 15+ (Hard Lockout Paywall, 0 days remaining, 100% services paused):
    python backend/scripts/simulate_trial_days.py --email user@example.com --days 0

    # 3. Simulate Day 1 (Fresh 14-day trial, silent UI):
    python backend/scripts/simulate_trial_days.py --email user@example.com --days 14

    # 4. Simulate Paid PRO Subscription (Gemini glow ring, all banners vanished):
    python backend/scripts/simulate_trial_days.py --email user@example.com --pro
"""

import sys
import argparse
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mdefender")

def simulate():
    parser = argparse.ArgumentParser(description="Simulate MDefender trial and subscription states")
    parser.add_argument("--email", required=True, help="User email address to simulate")
    parser.add_argument("--days", type=int, default=None, help="Trial days remaining (e.g. 14 for Day 1, 4 for Day 10, 0 for Day 15)")
    parser.add_argument("--pro", action="store_true", help="Set user to active PRO subscription")
    parser.add_argument("--free", action="store_true", help="Set user back to free trial")
    args = parser.parse_args()

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    user = db.users.find_one({"email": args.email})
    if not user:
        print(f"❌ User with email '{args.email}' not found in database '{DB_NAME}'!")
        sys.exit(1)

    user_id = str(user["_id"])
    now_utc = datetime.now(timezone.utc)

    if args.pro:
        # Update user to active PRO
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "plan": "pro",
                "payment_status": "active",
                "updated_at": now_utc
            }}
        )
        # Also ensure subscription record exists
        db.subscriptions.update_one(
            {"$or": [{"user_id": user_id}, {"user_id": user["_id"]}]},
            {"$set": {
                "user_id": user_id,
                "plan_id": "pro",
                "status": "active",
                "current_period_end": now_utc + timedelta(days=365),
                "updated_at": now_utc
            }},
            upsert=True
        )
        # Update user's websites to pro
        db.websites.update_many(
            {"$or": [{"user_id": user_id}, {"user_id": user["_id"]}]},
            {"$set": {"subscription_status": "pro", "plan": "pro"}}
        )
        print(f"🌟 SUCCESS: User '{args.email}' updated to ACTIVE PRO SUBSCRIPTION!")
        print("   - All trial countdowns permanently vanish.")
        print("   - Luxury Gemini-style PRO avatar glow ring & micro-badge active.")
        print("   - WordPress agent sync will now return '★ Enterprise Pro'.")
        return

    if args.days is not None:
        target_days = max(0, args.days)
        simulated_trial_ends = now_utc + timedelta(days=target_days)
        # If target is 0, make sure it is in the past
        if target_days == 0:
            simulated_trial_ends = now_utc - timedelta(hours=2)

        update_fields = {
            "trial_ends_at": simulated_trial_ends,
            "plan": "free",
            "payment_status": "trial",
            "updated_at": now_utc
        }
        if args.free:
            update_fields["payment_status"] = "trial"

        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": update_fields}
        )
        # Update subscription status in websites
        website_status = "trial_expired" if target_days == 0 else "trial_active"
        db.websites.update_many(
            {"$or": [{"user_id": user_id}, {"user_id": user["_id"]}]},
            {"$set": {"subscription_status": website_status}}
        )

        print(f"⏱️ SUCCESS: User '{args.email}' trial time-traveled to {target_days} DAYS REMAINING!")
        if target_days > 4:
            print("   - Stage: Day 1-9 Silent Exploration (Header pill visible, full access).")
        elif target_days > 0:
            print("   - Stage: Day 10-14 Pre-Auth Soft Prompt (Skippable with 'Remind Me Later').")
        else:
            print("   - Stage: Day 15+ Hard Lockout Paywall (Unskippable, 100% services paused).")

if __name__ == "__main__":
    simulate()
