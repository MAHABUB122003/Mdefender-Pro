"""
Phase 1 Security & Audit Validation Test Suite for MDefender Pro.
Tests:
1. Registration & Timezone math safety (No naive/aware TypeError).
2. Trial initialization (14 days, UTC).
3. Anti-Bypass: Unauthorized Plan Escalation via /change-plan blocked without payment.
4. Anti-Bypass: Fake/Unverified transaction bypass in /verify-transaction blocked.
5. Zero-Trust API Guard: require_active_subscription blocks expired unpaid users.
6. Website Licensing: Unlicensed sites rejected by get_licensed_website.
"""

import sys
import os
import unittest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService
from src.auth.dependencies import require_active_subscription
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app


class TestPhase1Security(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.slot_service = LicenseSlotService(cls.db)
        cls.sub_service = SubscriptionService(cls.db)
        cls.client = TestClient(app)

    def test_01_timezone_math_safety(self):
        """Verify that UTC timezone-aware datetimes do not cause TypeError during license resolution."""
        now_utc = datetime.now(timezone.utc)
        test_user = {
            "_id": str(ObjectId()),
            "email": "tz_test@mdefender.test",
            "created_at": now_utc,  # Offset-aware
            "trial_ends_at": now_utc + timedelta(days=14),  # Offset-aware
            "plan": "free",
            "payment_status": "trialing"
        }
        
        # This must not raise TypeError: can't subtract offset-naive and offset-aware datetimes
        try:
            state = self.slot_service.resolve_user_license_state(test_user)
            self.assertTrue(state["is_trial_active"])
            self.assertEqual(state["trial_days_remaining"], 14)
        except TypeError as e:
            self.fail(f"resolve_user_license_state crashed with TypeError: {e}")

    def test_02_require_active_subscription_blocks_expired_user(self):
        """Expired unpaid user must receive HTTP 402 from require_active_subscription."""
        expired_user = {
            "id": str(ObjectId()),
            "role": "user",
            "is_admin": False,
            "is_paid": False,
            "is_trial_active": False,
            "trial_days_remaining": 0,
            "plan": "free"
        }

        import asyncio
        with self.assertRaises(HTTPException) as cm:
            asyncio.run(require_active_subscription(expired_user))
        self.assertEqual(cm.exception.status_code, 402)
        self.assertIn("Subscription required", cm.exception.detail)

    def test_03_require_active_subscription_allows_active_trial(self):
        """Active trial user must pass require_active_subscription."""
        active_trial_user = {
            "id": str(ObjectId()),
            "role": "user",
            "is_admin": False,
            "is_paid": False,
            "is_trial_active": True,
            "trial_days_remaining": 10,
            "plan": "free"
        }
        import asyncio
        res = asyncio.run(require_active_subscription(active_trial_user))
        self.assertEqual(res, active_trial_user)

    def test_04_require_active_subscription_allows_paid_user(self):
        """Active paid user must pass require_active_subscription."""
        paid_user = {
            "id": str(ObjectId()),
            "role": "user",
            "is_admin": False,
            "is_paid": True,
            "is_trial_active": False,
            "trial_days_remaining": 0,
            "plan": "pro"
        }
        import asyncio
        res = asyncio.run(require_active_subscription(paid_user))
        self.assertEqual(res, paid_user)

    def test_05_unauthorized_plan_escalation_blocked(self):
        """A user without an active paid subscription cannot escalate plan via /change-plan."""
        # Create a test free user
        uid = str(ObjectId())
        email = f"free_{uid[:6]}@test.io"
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "free",
            "payment_status": "none",
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=20),
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=6)
        })

        from src.auth.jwt_service import JWTService
        token = JWTService().create_access_token(uid, email, role="user")

        response = self.client.post(
            "/api/v1/billing/change-plan",
            json={"plan": "enterprise"},
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # User in database must STILL be 'free'
        user_after = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_after.get("plan"), "free", "User plan in database must not be escalated to enterprise without payment")
        
        # Response must indicate payment/checkout required
        self.assertFalse(data.get("success", False), "Escalation without payment must fail")
        self.db.users.delete_one({"_id": ObjectId(uid)})

    def test_06_verify_transaction_without_valid_txn_does_not_grant_pro(self):
        """Calling /verify-transaction with fake or missing txn_id must NOT grant Pro or extra slots."""
        uid = str(ObjectId())
        email = f"attacker_{uid[:6]}@test.io"
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "free",
            "payment_status": "none",
            "purchased_slots": 0,
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=20),
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=6)
        })

        from src.auth.jwt_service import JWTService
        token = JWTService().create_access_token(uid, email, role="user")

        # Attacker tries to self-verify 50 sites yearly with fake txn_id
        response = self.client.get(
            "/api/v1/billing/verify-transaction?txn_id=fake_txn_12345&sites=50&cycle=yearly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # User in database must NOT be Pro and must NOT have 50 slots!
        user_after = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_after.get("plan"), "free", "User must not be upgraded to Pro with fake transaction")
        self.assertEqual(user_after.get("purchased_slots", 0), 0, "User must not receive 50 slots with fake transaction")
        
        self.db.users.delete_one({"_id": ObjectId(uid)})

    def test_07_unlicensed_website_blocked_from_security_operations(self):
        """User with 2 slots cannot access operational security on an unlicensed site."""
        from src.api.v1.deps import get_licensed_website
        uid = str(ObjectId())
        email = f"two_slots_{uid[:6]}@test.io"
        
        # Insert user with 2 purchased slots and trial expired
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "pro",
            "payment_status": "active",
            "purchased_slots": 2,
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=20),
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=6),
            "licensed_website_ids": []
        })

        # Insert 3 sites: site1, site2, site3
        s1_id = str(ObjectId())
        s2_id = str(ObjectId())
        s3_id = str(ObjectId())

        for sid, domain in [(s1_id, "lic1.com"), (s2_id, "lic2.com"), (s3_id, "unlic3.com")]:
            self.db.websites.insert_one({
                "_id": ObjectId(sid),
                "user_id": uid,
                "domain": domain,
                "name": domain,
                "is_active": True,
                "is_licensed": False
            })

        user_doc = self.db.users.find_one({"_id": ObjectId(uid)})
        user_dict = {
            "id": uid,
            "_id": uid,
            "email": email,
            "role": "user",
            "is_admin": False
        }

        # Assign slots to site 1 and site 2
        ok1, _ = self.slot_service.assign_slot(uid, s1_id)
        ok2, _ = self.slot_service.assign_slot(uid, s2_id)
        self.assertTrue(ok1)
        self.assertTrue(ok2)

        # site 1 must pass get_licensed_website
        site1 = get_licensed_website(user_dict, s1_id)
        self.assertIsNotNone(site1)

        # site 3 (unlicensed) must be REJECTED with HTTP 403
        with self.assertRaises(HTTPException) as cm:
            get_licensed_website(user_dict, s3_id)
        self.assertEqual(cm.exception.status_code, 403)
        self.assertIn("License slot required", cm.exception.detail)

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        for sid in [s1_id, s2_id, s3_id]:
            self.db.websites.delete_one({"_id": ObjectId(sid)})

    def test_08_full_registration_otp_and_trial_lifecycle(self):
        """Test full user registration lifecycle: register -> OTP verification -> active 14-day trial -> login."""
        from src.auth.registration_service import RegistrationService
        from src.auth.login_service import LoginService

        reg_service = RegistrationService()
        login_service = LoginService()

        test_email = f"audit_user_{ObjectId()}@mdefender.io"
        test_pw = "SecureP@ssw0rd!2026"
        test_name = "Audit Test User"

        # 1. Registration
        reg_res = reg_service.register(
            full_name=test_name,
            email=test_email,
            password=test_pw,
            ip_address="127.0.0.1"
        )
        self.assertTrue(reg_res["success"], f"Registration failed: {reg_res}")
        otp_code = reg_res.get("otp_code")
        self.assertIsNotNone(otp_code)
        self.assertEqual(len(otp_code), 6)

        # 2. Login before OTP verification must be rejected
        pre_login = login_service.login(test_email, test_pw, ip_address="127.0.0.1")
        self.assertFalse(pre_login["success"])
        self.assertTrue(pre_login.get("email_not_verified"))

        # 3. Invalid OTP must be rejected
        bad_otp_res = reg_service.verify_email(token="000000", email=test_email, ip_address="127.0.0.1")
        self.assertFalse(bad_otp_res["success"])

        # 4. Correct OTP verification activates account
        verify_res = reg_service.verify_email(token=otp_code, email=test_email, ip_address="127.0.0.1")
        self.assertTrue(verify_res["success"], f"OTP verification failed: {verify_res}")

        # 5. Database user doc must have 14-day trial set
        user_in_db = self.db.users.find_one({"email": test_email})
        self.assertIsNotNone(user_in_db)
        self.assertEqual(user_in_db.get("payment_status"), "trialing")
        self.assertIsNotNone(user_in_db.get("trial_ends_at"))

        # 6. Login now succeeds and returns dynamic trial days remaining matching admin config
        login_res = login_service.login(test_email, test_pw, ip_address="127.0.0.1")
        self.assertTrue(login_res["success"], f"Login failed: {login_res}")
        self.assertIsNotNone(login_res.get("access_token"))
        self.assertIsNotNone(login_res.get("refresh_token"))
        from src.services.plan_service import PlanService
        expected_trial_days = int(PlanService(self.db).get_dynamic_pricing_config().get("trial_days") or 14)
        self.assertEqual(login_res["user"]["trial_days_remaining"], expected_trial_days)

        # Cleanup
        self.db.users.delete_one({"email": test_email})


if __name__ == "__main__":
    unittest.main()
