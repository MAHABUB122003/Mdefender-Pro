import sys
import os
import unittest
import uuid
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from src.database.mongodb_connection import MongoDB
from src.auth.jwt_service import JWTService
from src.services.license_slot_service import LicenseSlotService


class TestPhase5OperationalEndpointsLicensing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = MongoDB()
        cls.jwt_svc = JWTService()
        cls.slot_svc = LicenseSlotService(cls.db)

    def setUp(self):
        self.suffix = uuid.uuid4().hex[:8]

    def test_01_paid_2_slots_10_sites_enforcement(self):
        """
        Verify:
        - User connects 10 sites.
        - User has paid for 2 slots ('go' or 2 slots).
        - Exactly 2 sites are licensed, 8 sites are unlicensed.
        - Triggering scan on unlicensed site raises HTTP 403.
        - Triggering scan on licensed site succeeds (HTTP 200).
        """
        uid = f"user_phase5_{self.suffix}"
        user_doc = {
            "_id": ObjectId(),
            "email": f"phase5_{self.suffix}@mdefender.io",
            "name": "Phase5 User",
            "role": "user",
            "plan": "go",
            "payment_status": "active",
            "purchased_slots": 2,
            "created_at": datetime.now(timezone.utc) - timedelta(days=20),
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=6),
            "licensed_website_ids": []
        }
        self.db.users.insert_one(user_doc)
        token = self.jwt_svc.create_access_token(user_id=str(user_doc["_id"]), email=user_doc["email"], role="user")
        headers = {"Authorization": f"Bearer {token}"}

        # Create 10 websites
        site_ids = []
        for i in range(10):
            sid = f"site_p5_{self.suffix}_{i}"
            w_doc = {
                "_id": sid,
                "user_id": str(user_doc["_id"]),
                "domain": f"testsite{i}-{self.suffix}.com",
                "name": f"Test Site {i}",
                "platform": "wordpress",
                "status": "active",
                "is_active": True,
                "api_key": f"key_site_phase5_{self.suffix}_{i}_long_key",
                "site_token": f"token_site_phase5_{self.suffix}_{i}",
                "created_at": datetime.now(timezone.utc)
            }
            self.db.websites.insert_one(w_doc)
            site_ids.append(sid)

        # Explicitly assign slots to the first 2 websites
        ok1, _ = self.slot_svc.assign_slot(user_doc["_id"], site_ids[0])
        ok2, _ = self.slot_svc.assign_slot(user_doc["_id"], site_ids[1])
        self.assertTrue(ok1)
        self.assertTrue(ok2)

        # Trying to assign a 3rd website without releasing should fail
        ok3, msg3 = self.slot_svc.assign_slot(user_doc["_id"], site_ids[2])
        self.assertFalse(ok3)
        self.assertIn("All 2 license slot(s) are currently in use", msg3)

        # 1. Trigger scan on site 0 (licensed) -> should pass licensing gate
        resp_licensed = self.client.post(
            f"/api/v1/websites/{site_ids[0]}/scan",
            headers=headers,
            json={"scan_type": "quick"}
        )
        self.assertEqual(resp_licensed.status_code, 200)

        # 2. Trigger scan on site 2 (unlicensed) -> should receive 403 Forbidden
        resp_unlicensed = self.client.post(
            f"/api/v1/websites/{site_ids[2]}/scan",
            headers=headers,
            json={"scan_type": "quick"}
        )
        self.assertEqual(resp_unlicensed.status_code, 403)
        self.assertIn("License slot required", resp_unlicensed.json().get("detail", ""))

        # 3. Test WAF /analyze on unlicensed website (site 2)
        waf_payload = {
            "api_key": f"key_site_phase5_{self.suffix}_2_long_key",
            "domain": f"testsite2-{self.suffix}.com",
            "request": {"ip": "1.2.3.4", "method": "GET", "uri": "/"}
        }
        resp_waf = self.client.post("/api/v1/waf/analyze", json=waf_payload)
        self.assertEqual(resp_waf.status_code, 200)
        waf_data = resp_waf.json().get("data", {})
        self.assertEqual(waf_data.get("decision"), "ALLOW")
        self.assertTrue(waf_data.get("license_required"))
        self.assertIn("Protection paused", waf_data.get("reason", ""))

        # Cleanup
        self.db.users.delete_one({"_id": user_doc["_id"]})
        self.db.websites.delete_many({"_id": {"$in": site_ids}})

    def test_02_expired_trial_user_blocked_from_protected_operations(self):
        """
        Verify that an expired user (day 15+, no payment) is rejected with 403
        when attempting operational endpoints like backup, restore, repair.
        """
        user_doc = {
            "_id": ObjectId(),
            "email": f"expired_op_{self.suffix}@mdefender.io",
            "name": "Expired User",
            "role": "user",
            "plan": "free",
            "payment_status": "trial_expired",
            "created_at": datetime.now(timezone.utc) - timedelta(days=16),
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=2),
            "licensed_website_ids": []
        }
        self.db.users.insert_one(user_doc)
        token = self.jwt_svc.create_access_token(user_id=str(user_doc["_id"]), email=user_doc["email"], role="user")
        headers = {"Authorization": f"Bearer {token}"}

        sid = f"site_exp_{self.suffix}"
        self.db.websites.insert_one({
            "_id": sid,
            "user_id": str(user_doc["_id"]),
            "domain": f"expired-{self.suffix}.com",
            "platform": "wordpress",
            "status": "active",
            "api_key": f"key_exp_{self.suffix}_long_key",
            "site_token": f"tok_exp_{self.suffix}"
        })

        # 1. Attempt backup creation
        resp_backup = self.client.post(
            f"/api/v1/websites/{sid}/backups",
            headers=headers,
            json={"type": "full", "notes": "test"}
        )
        self.assertEqual(resp_backup.status_code, 403)
        self.assertIn("License slot required", resp_backup.json().get("detail", ""))

        # 2. Attempt core file repair
        resp_repair = self.client.post(
            f"/api/v1/websites/{sid}/scan/repair-core",
            headers=headers,
            json={"file": "wp-includes/version.php"}
        )
        self.assertEqual(resp_repair.status_code, 403)

        # 3. Attempt core checksum verification
        resp_checksum = self.client.post(
            f"/api/v1/wordpress/core/{sid}/verify-checksums",
            headers=headers
        )
        self.assertEqual(resp_checksum.status_code, 403)

        # Cleanup
        self.db.users.delete_one({"_id": user_doc["_id"]})
        self.db.websites.delete_one({"_id": sid})

    def test_03_slot_reassignment_dynamically_transfers_protection(self):
        """
        Verify that releasing a slot from site A and assigning to site B
        immediately transfers protection entitlement: site A becomes 403, site B becomes 200.
        """
        user_doc = {
            "_id": ObjectId(),
            "email": f"reassign_{self.suffix}@mdefender.io",
            "name": "Reassign User",
            "role": "user",
            "plan": "go",
            "payment_status": "active",
            "purchased_slots": 1,
            "created_at": datetime.now(timezone.utc) - timedelta(days=5),
            "licensed_website_ids": []
        }
        self.db.users.insert_one(user_doc)
        token = self.jwt_svc.create_access_token(user_id=str(user_doc["_id"]), email=user_doc["email"], role="user")
        headers = {"Authorization": f"Bearer {token}"}

        site_a = f"site_a_{self.suffix}"
        site_b = f"site_b_{self.suffix}"
        for sid, dom in [(site_a, "site-a.com"), (site_b, "site-b.com")]:
            self.db.websites.insert_one({
                "_id": sid,
                "user_id": str(user_doc["_id"]),
                "domain": dom,
                "platform": "wordpress",
                "status": "active",
                "api_key": f"key_{sid}_long_key",
                "site_token": f"tok_{sid}"
            })

        # Initially assign slot to site_a
        self.slot_svc.assign_slot(user_doc["_id"], site_a)

        # site_a can scan (200), site_b cannot (403)
        self.assertEqual(self.client.post(f"/api/v1/websites/{site_a}/scan", headers=headers, json={"scan_type": "quick"}).status_code, 200)
        self.assertEqual(self.client.post(f"/api/v1/websites/{site_b}/scan", headers=headers, json={"scan_type": "quick"}).status_code, 403)

        # Release site_a and assign site_b
        rel_ok, _ = self.slot_svc.release_slot(user_doc["_id"], site_a)
        self.assertTrue(rel_ok)
        as_ok, _ = self.slot_svc.assign_slot(user_doc["_id"], site_b)
        self.assertTrue(as_ok)

        # Now site_a cannot scan (403), site_b can scan (200)!
        self.assertEqual(self.client.post(f"/api/v1/websites/{site_a}/scan", headers=headers, json={"scan_type": "quick"}).status_code, 403)
        self.assertEqual(self.client.post(f"/api/v1/websites/{site_b}/scan", headers=headers, json={"scan_type": "quick"}).status_code, 200)

        # Cleanup
        self.db.users.delete_one({"_id": user_doc["_id"]})
        self.db.websites.delete_many({"_id": {"$in": [site_a, site_b]}})


if __name__ == "__main__":
    unittest.main()
