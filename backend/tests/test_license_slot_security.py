"""
High-Security Automated Verification for MDefender License Slot & Anti-Bypass Engine.
Tests:
1. 14-day trial full fleet access.
2. Trial conclusion transition (10 sites connected, only 2 paid).
3. Anti-Bypass: Unlicensed sites rejected by verify_edge_license.
4. Quota overflow prevention: Cannot activate > purchased_slots.
5. Slot swap / release and re-assignment.
6. Domain cryptographic binding check (prevent API key sharing).
"""

import sys
import os
import unittest
from bson import ObjectId
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService


class TestLicenseSlotSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.slot_service = LicenseSlotService(cls.db)
        cls.test_user_id = str(ObjectId())

        # Create a mock user who signed up 15 days ago (trial expired)
        cls.db.users.delete_many({"_id": {"$in": [cls.test_user_id, ObjectId(cls.test_user_id)]}})
        cls.db.users.insert_one({
            "_id": ObjectId(cls.test_user_id),
            "email": f"test_license_{cls.test_user_id[:8]}@mdefender.test",
            "plan": "pro",
            "payment_status": "active",
            "purchased_slots": 2,  # User paid for only 2 slots!
            "trial_ends_at": datetime.now() - timedelta(days=1), # Trial is over!
            "created_at": datetime.now() - timedelta(days=15),
            "licensed_website_ids": []
        })

        # Create 10 connected websites for this user
        cls.site_ids = []
        for i in range(1, 11):
            wid = str(ObjectId())
            cls.site_ids.append(wid)
            cls.db.websites.insert_one({
                "_id": ObjectId(wid),
                "user_id": cls.test_user_id,
                "domain": f"site{i}-test.com",
                "name": f"Test Site {i}",
                "is_active": True,
                "is_licensed": True, # Previously active in trial
                "license_status": "trial",
                "created_at": datetime.now() - timedelta(days=10)
            })

    @classmethod
    def tearDownClass(cls):
        # Cleanup mock test data
        cls.db.users.delete_one({"_id": ObjectId(cls.test_user_id)})
        for wid in cls.site_ids:
            cls.db.websites.delete_one({"_id": ObjectId(wid)})

    def test_01_reconcile_limits_to_exact_purchased_slots(self):
        """User has 10 sites, paid for 2. System must lock exactly 2 and pause 8."""
        summary = self.slot_service.get_slots_summary(self.test_user_id)
        
        self.assertEqual(summary["total_slots"], 2, "Purchased slots should be 2")
        self.assertEqual(summary["used_slots"], 2, "Used slots should be exactly 2")
        self.assertEqual(summary["available_slots"], 0, "Available slots should be 0")

        # Verify in websites collection: exactly 2 are licensed, 8 are unlicensed
        licensed_sites = list(self.db.websites.find({"user_id": self.test_user_id, "is_licensed": True}))
        unlicensed_sites = list(self.db.websites.find({"user_id": self.test_user_id, "is_licensed": False}))
        
        self.assertEqual(len(licensed_sites), 2, "Exactly 2 websites must be marked is_licensed=True")
        self.assertEqual(len(unlicensed_sites), 8, "Exactly 8 websites must be marked is_licensed=False")
        for u in unlicensed_sites:
            self.assertEqual(u.get("license_status"), "unlicensed", "Unlicensed site must have license_status=unlicensed")
            self.assertFalse(u.get("is_protected"), "Unlicensed site must have is_protected=False")

    def test_02_anti_bypass_unlicensed_site_access_blocked(self):
        """Unlicensed sites cannot receive edge protection or bypass."""
        unlicensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": False})
        wid = str(unlicensed_site["_id"])
        dom = unlicensed_site["domain"]

        is_lic, reason = self.slot_service.verify_edge_license(
            website_id=wid,
            domain=dom,
            user_id=self.test_user_id
        )
        self.assertFalse(is_lic, "Unlicensed site must be rejected")
        self.assertIn("not covered by an active license slot", reason)

    def test_03_licensed_site_access_granted(self):
        """Licensed sites must pass edge verification."""
        licensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": True})
        wid = str(licensed_site["_id"])
        dom = licensed_site["domain"]

        is_lic, reason = self.slot_service.verify_edge_license(
            website_id=wid,
            domain=dom,
            user_id=self.test_user_id
        )
        self.assertTrue(is_lic, "Licensed site must be accepted")

    def test_04_quota_overflow_exploit_prevented(self):
        """Attacker tries to assign a 3rd site when only 2 are purchased."""
        unlicensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": False})
        wid = str(unlicensed_site["_id"])

        ok, msg = self.slot_service.assign_slot(self.test_user_id, wid)
        self.assertFalse(ok, "Assigning beyond purchased quota must fail")
        self.assertIn("All 2 license slot(s) are currently in use", msg)

    def test_05_slot_swap_release_and_reassign(self):
        """User releases Site 1 and activates Site 3 (1-Click Reassignment)."""
        # Step 1: Release licensed site
        licensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": True})
        old_wid = str(licensed_site["_id"])

        ok, msg = self.slot_service.release_slot(self.test_user_id, old_wid)
        self.assertTrue(ok, "Release slot must succeed")

        # Now available slots should be 1
        summary = self.slot_service.get_slots_summary(self.test_user_id)
        self.assertEqual(summary["used_slots"], 1)
        self.assertEqual(summary["available_slots"], 1)

        # Step 2: Assign an unlicensed site
        unlicensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": False})
        new_wid = str(unlicensed_site["_id"])

        ok2, msg2 = self.slot_service.assign_slot(self.test_user_id, new_wid)
        self.assertTrue(ok2, "Assigning to freed slot must succeed")

        # Verify old site is now unlicensed and new site is licensed
        old_check = self.db.websites.find_one({"_id": ObjectId(old_wid)})
        new_check = self.db.websites.find_one({"_id": ObjectId(new_wid)})
        self.assertFalse(old_check.get("is_licensed"), "Old site must now be unlicensed")
        self.assertTrue(new_check.get("is_licensed"), "New site must now be licensed")

    def test_06_domain_spoofing_prevented(self):
        """Attacker tries to use licensed website_id with an unlicensed domain name."""
        licensed_site = self.db.websites.find_one({"user_id": self.test_user_id, "is_licensed": True})
        wid = str(licensed_site["_id"])
        fake_domain = "hacker-unlicensed-domain.com"

        is_lic, reason = self.slot_service.verify_edge_license(
            website_id=wid,
            domain=fake_domain,
            user_id=self.test_user_id
        )
        self.assertFalse(is_lic, "Spoofed domain must be rejected")
        self.assertIn("mismatch", reason.lower())


if __name__ == "__main__":
    unittest.main()
