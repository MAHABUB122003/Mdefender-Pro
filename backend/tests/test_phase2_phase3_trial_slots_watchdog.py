"""
Phase 2 & Phase 3 Security & Lifecycle Test Suite for MDefender Pro.
Tests:
1. Day-10 Free Trial Payment Reminder Dispatch & Deduplication.
2. Automatic 14-Day Free Trial Expiration & Service Revocation.
3. Website Selection & 2-out-of-10 Slots Licensing Engine.
4. Slot Swap (Release & Reassign) Quota Enforcement.
5. PCI-DSS Compliance: Verify no raw card numbers or CVVs stored in DB collections.
"""

import sys
import os
import unittest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.subscription_service import SubscriptionService
from src.services.license_slot_service import LicenseSlotService
from src.services.notification_service import NotificationService


class TestPhase2Phase3TrialAndSlots(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.sub_service = SubscriptionService(cls.db)
        cls.slot_service = LicenseSlotService(cls.db)
        cls.notif_service = NotificationService(cls.db)

    def test_01_day_10_payment_reminder_watchdog(self):
        """User on Day 10 (4 days remaining) must receive a Day-10 payment reminder notification."""
        uid = str(ObjectId())
        email = f"day10_{uid[:6]}@test.io"
        now_utc = datetime.now(timezone.utc)
        
        # User created 10 days ago (4 days left in 14-day trial)
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "free",
            "payment_status": "trialing",
            "role": "user",
            "created_at": now_utc - timedelta(days=10),
            "trial_ends_at": now_utc + timedelta(days=4)
        })

        results = self.sub_service.check_and_process_subscription_lifecycle(batch_limit=100)
        
        # Verify notification was sent
        notif = self.db.notifications.find_one({"user_id": uid, "category": "trial_reminder"})
        self.assertIsNotNone(notif, "Day 10 reminder notification must be dispatched to user")
        self.assertIn("4 Days Remaining", notif["title"])

        # Run watchdog again: deduplication must prevent duplicate reminder
        results2 = self.sub_service.check_and_process_subscription_lifecycle(batch_limit=100)
        notif_count = self.db.notifications.count_documents({"user_id": uid, "category": "trial_reminder"})
        self.assertEqual(notif_count, 1, "Duplicate reminder must not be sent on same day")

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        self.db.notifications.delete_many({"user_id": uid})

    def test_02_trial_expiration_auto_revocation(self):
        """When 14 days expire, watchdog marks user as trial_expired and deactivates protection on all sites."""
        uid = str(ObjectId())
        email = f"expired_{uid[:6]}@test.io"
        now_utc = datetime.now(timezone.utc)
        
        # User created 15 days ago (trial expired 1 day ago)
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "free",
            "payment_status": "trialing",
            "role": "user",
            "created_at": now_utc - timedelta(days=15),
            "trial_ends_at": now_utc - timedelta(days=1),
            "licensed_website_ids": []
        })

        # Connect 3 websites during trial
        s_ids = []
        for i in range(1, 4):
            sid = str(ObjectId())
            s_ids.append(sid)
            self.db.websites.insert_one({
                "_id": ObjectId(sid),
                "user_id": uid,
                "domain": f"site{i}-exp.com",
                "is_active": True,
                "is_licensed": True,
                "is_protected": True
            })

        # Run watchdog
        results = self.sub_service.check_and_process_subscription_lifecycle(batch_limit=100)

        # 1. User status in DB must be trial_expired
        user_after = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_after.get("payment_status"), "trial_expired")
        self.assertEqual(user_after.get("purchased_slots"), 0)

        # 2. All 3 websites must be marked unlicensed and unprotected
        unlicensed_sites = list(self.db.websites.find({"user_id": uid, "is_licensed": False, "is_protected": False}))
        self.assertEqual(len(unlicensed_sites), 3, "All websites must have protection paused upon trial expiration")

        # 3. Notification must be sent
        notif = self.db.notifications.find_one({"user_id": uid, "category": "trial_expired"})
        self.assertIsNotNone(notif, "Trial expired notification must be dispatched")

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        self.db.websites.delete_many({"user_id": uid})
        self.db.notifications.delete_many({"user_id": uid})

    def test_03_ten_sites_trial_to_two_sites_paid_selection(self):
        """User connects 10 sites in trial, pays for 2 slots. Exactly 2 get active slots, 8 are paused."""
        uid = str(ObjectId())
        email = f"ten_to_two_{uid[:6]}@test.io"
        now_utc = datetime.now(timezone.utc)

        # User connected 10 sites during trial, now purchased 2 slots
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "pro",
            "payment_status": "active",
            "purchased_slots": 2,  # Exactly 2 slots purchased!
            "created_at": now_utc - timedelta(days=16),
            "trial_ends_at": now_utc - timedelta(days=2),
            "licensed_website_ids": []
        })

        site_ids = []
        for i in range(1, 11):
            sid = str(ObjectId())
            site_ids.append(sid)
            self.db.websites.insert_one({
                "_id": ObjectId(sid),
                "user_id": uid,
                "domain": f"site{i}-fleet.com",
                "name": f"Site {i}",
                "is_active": True,
                "is_licensed": True, # Previously in trial
                "created_at": now_utc - timedelta(days=10)
            })

        summary = self.slot_service.get_slots_summary(uid)
        
        # Total purchased slots must be 2
        self.assertEqual(summary["total_slots"], 2)
        self.assertEqual(summary["used_slots"], 2)
        self.assertEqual(summary["available_slots"], 0)

        # Database state: exactly 2 are licensed, 8 are unlicensed
        licensed = list(self.db.websites.find({"user_id": uid, "is_licensed": True}))
        unlicensed = list(self.db.websites.find({"user_id": uid, "is_licensed": False}))
        self.assertEqual(len(licensed), 2, "Only 2 websites must receive active license slots")
        self.assertEqual(len(unlicensed), 8, "Remaining 8 websites must have protection disabled")

        # Edge WAF verification test
        lic_site_id = str(licensed[0]["_id"])
        unlic_site_id = str(unlicensed[0]["_id"])

        is_lic, _ = self.slot_service.verify_edge_license(website_id=lic_site_id, user_id=uid)
        self.assertTrue(is_lic, "Purchased site must pass edge verification")

        is_unlic, reason = self.slot_service.verify_edge_license(website_id=unlic_site_id, user_id=uid)
        self.assertFalse(is_unlic, "Unpurchased site must be rejected at edge")
        self.assertIn("not covered by an active license slot", reason)

        # Quota overflow test: Attempting to assign a 3rd site must fail
        ok, msg = self.slot_service.assign_slot(uid, unlic_site_id)
        self.assertFalse(ok, "Cannot activate more websites than purchased quota")
        self.assertIn("All 2 license slot(s) are currently in use", msg)

        # Slot Swap test: Release site 1 slot, and assign to previously unlicensed site
        rel_ok, _ = self.slot_service.release_slot(uid, lic_site_id)
        self.assertTrue(rel_ok, "Must be able to release an assigned slot")

        assign_ok, _ = self.slot_service.assign_slot(uid, unlic_site_id)
        self.assertTrue(assign_ok, "Must be able to assign freed slot to new site")

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        self.db.websites.delete_many({"user_id": uid})

    def test_04_pci_dss_no_raw_card_or_cvv_in_db(self):
        """Verify that raw credit card numbers and CVVs are NEVER stored anywhere in the application database."""
        # Query users, subscriptions, and transactions collections for raw card fields
        prohibited_fields = ["card_number", "cvv", "cvc", "security_code", "pan", "card_cvv"]

        for coll_name in ["users", "subscriptions", "paddle_transactions", "audit_logs"]:
            if hasattr(self.db, coll_name):
                coll = getattr(self.db, coll_name)
                for field in prohibited_fields:
                    count = coll.count_documents({field: {"$exists": True}})
                    self.assertEqual(count, 0, f"Prohibited raw card field '{field}' must never exist in collection '{coll_name}'")


if __name__ == "__main__":
    unittest.main()
