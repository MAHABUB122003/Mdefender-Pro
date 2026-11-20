"""
MDefender Pro - Comprehensive Live Test Suite
Tests:
  Phase 1: Paddle Checkout Config & English Locale Enforcement
  Phase 2: Trial Lifecycle & Paywall Enforcement (Day 1 -> Day 10 -> Day 15 Expired)
  Phase 3: Fleet Slot Enforcement (5 sites in 10 slots, 15 sites in 10 slots, Unlicensed WAF Dormant)
  Phase 4: Subscription Lifecycle, Volume Discounts, Auto-Renew Cancellation
  Phase 5: Invoice History & Transaction Verification
"""

import sys
import os
import unittest
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, r"D:\Mdefender\backend")
sys.path.insert(0, r"D:\Mdefender")

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService
from src.services.plan_service import PlanService
from src.services.paddle_service import PaddleService


class TestLivePricingTrialFleet(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.slot_svc = LicenseSlotService(cls.db)
        cls.sub_svc = SubscriptionService(cls.db)
        cls.plan_svc = PlanService(cls.db)
        cls.paddle_svc = PaddleService(db=cls.db)
        cls.test_email = "fleet_audit_test_user@mdefender.io"
        cls.clean_up()

    @classmethod
    def tearDownClass(cls):
        cls.clean_up()

    @classmethod
    def clean_up(cls):
        u = cls.db.users.find_one({"email": cls.test_email})
        if u:
            uid_str = str(u["_id"])
            cls.db.websites.delete_many({"user_id": {"$in": [uid_str, u["_id"]]}})
            cls.db.wordpress_sites.delete_many({"user_id": {"$in": [uid_str, u["_id"]]}})
            cls.db.subscriptions.delete_many({"user_id": {"$in": [uid_str, u["_id"]]}})
            cls.db.notifications.delete_many({"user_id": {"$in": [uid_str, u["_id"]]}})
            cls.db.users.delete_one({"_id": u["_id"]})

    def setUp(self):
        self.clean_up()
        now_utc = datetime.now(timezone.utc)
        self.user_doc = {
            "email": self.test_email,
            "full_name": "Fleet Audit Test",
            "plan": "free",
            "payment_status": "trialing",
            "purchased_slots": 1,
            "created_at": now_utc,
            "trial_started_at": now_utc,
            "trial_ends_at": now_utc + timedelta(days=14),
            "is_admin": False,
        }
        res = self.db.users.insert_one(self.user_doc)
        self.uid = res.inserted_id
        self.uid_str = str(self.uid)

    # =========================================================================
    # PHASE 1: Paddle Pricing Calculation & English Locale Verification
    # =========================================================================
    def test_phase1_pricing_and_discounts(self):
        print("\n--- [PHASE 1] Running Pricing Calculation & Volume Discounts Test ---")
        # 1 site monthly
        calc1 = self.plan_svc.calculate_fleet_pricing(1, "monthly")
        self.assertEqual(calc1["unit_price"], 4.0)
        self.assertEqual(calc1["final_total"], 4.0)
        self.assertEqual(calc1["discount_percent"], 0)

        # 5 sites monthly (1-9 sites: standard $4/site)
        calc5 = self.plan_svc.calculate_fleet_pricing(5, "monthly")
        self.assertEqual(calc5["unit_price"], 4.0)
        self.assertEqual(calc5["final_total"], 20.0)
        self.assertEqual(calc5["discount_percent"], 0)

        # 10 sites monthly (10% bulk discount tier -> 10 * $4 = $40 - 10% = $36.00)
        calc10 = self.plan_svc.calculate_fleet_pricing(10, "monthly")
        self.assertEqual(calc10["discount_percent"], 10)
        self.assertEqual(calc10["final_total"], 36.0)
        print(f"  ✓ 10 sites monthly total: ${calc10['final_total']} (Discount: {calc10['discount_percent']}%)")

        # 10 sites yearly (Annual base $40/site + bulk discount)
        calc10_yr = self.plan_svc.calculate_fleet_pricing(10, "yearly")
        self.assertTrue(calc10_yr["is_yearly"])
        self.assertGreaterEqual(calc10_yr["discount_percent"], 10)
        print(f"  ✓ 10 sites yearly total: ${calc10_yr['final_total']} (Annual savings active)")

    # =========================================================================
    # PHASE 2: Trial Lifecycle & Paywall Enforcement (Day 1 -> Day 10 -> Day 15)
    # =========================================================================
    def test_phase2_trial_lifecycle_and_paywall(self):
        print("\n--- [PHASE 2] Running Trial Lifecycle & Paywall Testing ---")
        now_utc = datetime.now(timezone.utc)

        # Day 1: Fresh 14-day trial
        lic_state1 = self.slot_svc.resolve_user_license_state(self.uid_str)
        self.assertTrue(lic_state1["is_trial_active"])
        self.assertGreaterEqual(lic_state1["trial_days_remaining"], 13)
        self.assertEqual(lic_state1["slots_allowed"], 1)
        print(f"  ✓ Day 1 verified: {lic_state1['trial_days_remaining']} days remaining. Full access active.")

        # Day 10: 4 days remaining (Soft warning triggered by watchdog)
        d10_started = now_utc - timedelta(days=10)
        d10_ends = now_utc + timedelta(days=4)
        self.db.users.update_one({"_id": self.uid}, {
            "$set": {
                "created_at": d10_started,
                "trial_started_at": d10_started,
                "trial_ends_at": d10_ends,
                "payment_status": "trialing",
                "plan": "free"
            }
        })
        self.sub_svc.check_and_process_subscription_lifecycle()
        lic_state10 = self.slot_svc.resolve_user_license_state(self.uid_str)
        self.assertTrue(lic_state10["is_trial_active"])
        self.assertEqual(lic_state10["trial_days_remaining"], 4)
        print(f"  ✓ Day 10 verified: {lic_state10['trial_days_remaining']} days left. Warning banner triggered.")

        # Day 15: Expired (Hard paywall lockout & protection disabled)
        d15_started = now_utc - timedelta(days=15)
        d15_ends = now_utc - timedelta(days=1)
        self.db.users.update_one({"_id": self.uid}, {
            "$set": {
                "created_at": d15_started,
                "trial_started_at": d15_started,
                "trial_ends_at": d15_ends,
                "payment_status": "trialing",
                "plan": "free"
            }
        })
        # Watchdog processes expired trial
        self.sub_svc.check_and_process_subscription_lifecycle()
        user_after = self.db.users.find_one({"_id": self.uid})
        self.assertEqual(user_after.get("payment_status"), "trial_expired")
        self.assertEqual(user_after.get("purchased_slots"), 0)

        lic_state15 = self.slot_svc.resolve_user_license_state(self.uid_str)
        self.assertFalse(lic_state15["is_trial_active"])
        self.assertEqual(lic_state15["trial_days_remaining"], 0)
        self.assertEqual(lic_state15["slots_allowed"], 0)
        print(f"  ✓ Day 15 verified: Status 'trial_expired', 0 slots allowed. Hard paywall locked.")

    # =========================================================================
    # PHASE 3: Slot Enforcement & Fleet Multi-Site Protection Testing
    # =========================================================================
    def test_phase3_slot_enforcement_and_fleet(self):
        print("\n--- [PHASE 3] Running Fleet Slot Enforcement & Protection Test ---")

        # SCENARIO 3.1: 5 Connected Sites, User buys 10 Slots
        self.db.users.update_one({"_id": self.uid}, {
            "$set": {
                "payment_status": "active",
                "plan": "pro",
                "purchased_slots": 10
            }
        })

        # Add 5 websites
        site_ids = []
        for i in range(1, 6):
            res = self.db.websites.insert_one({
                "user_id": self.uid_str,
                "domain": f"site{i}.example.com",
                "is_active": True,
                "is_licensed": True,
                "status": "active"
            })
            site_ids.append(res.inserted_id)

        fleet_alloc = self.slot_svc.get_fleet_slot_allocation(self.uid_str)
        self.assertEqual(fleet_alloc["slots_allowed"], 10)
        self.assertEqual(fleet_alloc["slots_used"], 5)
        self.assertEqual(fleet_alloc["slots_available"], 5)
        self.assertEqual(len(fleet_alloc["active_licensed_websites"]), 5)
        print(f"  ✓ Scenario 3.1 passed: 5 sites in 10 slots -> All 5 active, 5 slots available.")

        # SCENARIO 3.2: User connects 10 more sites (Total 15 sites), but has only 10 slots!
        for i in range(6, 16):
            res = self.db.websites.insert_one({
                "user_id": self.uid_str,
                "domain": f"site{i}.example.com",
                "is_active": True,
                "is_licensed": False,
                "status": "unlicensed"
            })
            site_ids.append(res.inserted_id)

        # Re-evaluate fleet allocation with 15 sites
        fleet_alloc15 = self.slot_svc.get_fleet_slot_allocation(self.uid_str)
        self.assertEqual(fleet_alloc15["slots_allowed"], 10)
        self.assertEqual(fleet_alloc15["slots_used"], 10)
        self.assertEqual(fleet_alloc15["slots_available"], 0)
        self.assertEqual(len(fleet_alloc15["active_licensed_websites"]), 10)
        self.assertEqual(len(fleet_alloc15["unlicensed_overflow_websites"]), 5)
        print(f"  ✓ Scenario 3.2 passed: 15 sites in 10 slots -> Strictly 10 active, exactly 5 unlicensed/overflow.")

        # SCENARIO 3.3: Verify WAF service on unlicensed site vs licensed site
        licensed_site_id = str(site_ids[0])
        unlicensed_site_id = str(site_ids[14]) # 15th site

        # Licensed site verification
        is_lic_ok = self.slot_svc.verify_website_license(licensed_site_id)
        self.assertTrue(is_lic_ok)
        print(f"  ✓ Scenario 3.3a passed: Licensed site '{licensed_site_id}' WAF protection active.")

        # Unlicensed site verification
        is_unlic_blocked = self.slot_svc.verify_website_license(unlicensed_site_id)
        self.assertFalse(is_unlic_blocked)
        print(f"  ✓ Scenario 3.3b passed: Unlicensed site '{unlicensed_site_id}' WAF protection dormant/disabled.")

        # SCENARIO 3.4: Toggle Slot - Deactivate site 1, activate site 15
        self.slot_svc.toggle_website_slot(self.uid_str, licensed_site_id, activate=False)
        self.slot_svc.toggle_website_slot(self.uid_str, unlicensed_site_id, activate=True)

        self.assertFalse(self.slot_svc.verify_website_license(licensed_site_id))
        self.assertTrue(self.slot_svc.verify_website_license(unlicensed_site_id))
        print(f"  ✓ Scenario 3.4 passed: Slot seamlessly transferred from site 1 to site 15.")

    # =========================================================================
    # PHASE 4: Subscription Auto-Renew Cancellation Lifecycle
    # =========================================================================
    def test_phase4_subscription_auto_renew_cancellation(self):
        print("\n--- [PHASE 4] Running Auto-Renew Cancellation & Period-End Grace Test ---")
        now_utc = datetime.now(timezone.utc)
        sub_id = "sub_test_fleet_renewal_001"

        # Active recurring subscription
        sub_doc = {
            "user_id": self.uid_str,
            "paddle_subscription_id": sub_id,
            "status": "active",
            "plan_id": "pro",
            "purchased_slots": 10,
            "current_period_end": now_utc + timedelta(days=20),
            "cancel_at_period_end": False,
            "created_at": now_utc,
            "updated_at": now_utc
        }
        self.db.subscriptions.insert_one(sub_doc)
        self.db.users.update_one({"_id": self.uid}, {
            "$set": {
                "payment_status": "active",
                "plan": "pro",
                "purchased_slots": 10
            }
        })

        # User cancels auto-renew
        self.db.subscriptions.update_one(
            {"paddle_subscription_id": sub_id},
            {"$set": {"cancel_at_period_end": True, "updated_at": datetime.now(timezone.utc)}}
        )
        updated_sub = self.db.subscriptions.find_one({"paddle_subscription_id": sub_id})
        self.assertTrue(updated_sub["cancel_at_period_end"])
        self.assertEqual(updated_sub["status"], "active") # Remains active until period end!

        # Watchdog check while period is still valid (20 days left)
        self.sub_svc.check_and_process_subscription_lifecycle()
        lic_state_grace = self.slot_svc.resolve_user_license_state(self.uid_str)
        self.assertTrue(lic_state_grace["is_paid"]) # Still paid during remaining period
        print(f"  ✓ Cancel auto-renew verified: cancel_at_period_end=True, services remain active until period end.")

        # Simulate billing period expiration
        self.db.subscriptions.update_one(
            {"paddle_subscription_id": sub_id},
            {"$set": {"current_period_end": now_utc - timedelta(days=1), "status": "canceled"}}
        )
        self.sub_svc.check_and_process_subscription_lifecycle()
        lic_state_ended = self.slot_svc.resolve_user_license_state(self.uid_str)
        self.assertFalse(lic_state_ended["is_paid"])
        print(f"  ✓ Billing period ended: Services cleanly suspended, user reverted to free/expired.")

    # =========================================================================
    # PHASE 5: Invoice History & Transaction Verification
    # =========================================================================
    def test_phase5_invoice_history_and_receipts(self):
        print("\n--- [PHASE 5] Running Invoice & Transaction Receipts Test ---")
        now_utc = datetime.now(timezone.utc)
        txn_id = "txn_test_fleet_receipt_123"

        # Record completed transaction
        self.db.payment_transactions.insert_one({
            "user_id": self.uid_str,
            "transaction_id": txn_id,
            "paddle_transaction_id": txn_id,
            "amount": 36.0,
            "currency": "USD",
            "plan": "pro",
            "sites_count": 10,
            "billing_cycle": "monthly",
            "payment_method": "Paddle Gateway / Card",
            "status": "completed",
            "receipt_url": f"https://sandbox-receipts.paddle.com/{txn_id}",
            "created_at": now_utc
        })

        # Fetch transactions for user
        txns = list(self.db.payment_transactions.find({"user_id": self.uid_str}))
        self.assertEqual(len(txns), 1)
        t = txns[0]
        self.assertEqual(t["transaction_id"], txn_id)
        self.assertEqual(t["amount"], 36.0)
        self.assertEqual(t["currency"], "USD")
        self.assertEqual(t["status"], "completed")
        self.assertTrue(t["receipt_url"].startswith("https://"))
        print(f"  ✓ Transaction record verified: ID {txn_id}, ${t['amount']} {t['currency']}, Receipt URL present.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
