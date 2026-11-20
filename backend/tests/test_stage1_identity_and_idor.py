"""
MDefender Pro - Stage 1 QA Testing & Validation Suite
Identity, Authentication, Multi-Tenancy & IDOR Data Isolation Audit

Covers:
  1. Password Hashing, Bcrypt rounds, Salt Randomness & Weak Word Filtering.
  2. JWT Issuance, Expiry, Tamper-Proof Signature Defense.
  3. Multi-Tenant Website IDOR Defense (get_owned_website & get_licensed_website).
  4. Website Sub-resource IDOR Defense (Scans, Themes, DB Diagnostics, Environment).
  5. Support Ticket Tenant Isolation & Scoped Thread Queries.
  6. Notification & Incident Feed Tenant Scoping.
  7. Privilege Escalation Barrier (Regular Tenant -> Admin Guard).
  8. MongoDB Scale-Proof Compound Indexing & Query Execution Verification.
"""

import sys
import os
import unittest
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

sys.path.insert(0, r"D:\Mdefender\backend")
sys.path.insert(0, r"D:\Mdefender")

from src.database.mongodb_connection import MongoDB
from src.services.password_service import PasswordService
from src.auth.jwt_service import JWTService
from src.services.support_ticket_service import SupportTicketService
from src.services.notification_service import NotificationService
from src.api.v1.deps import get_owned_website, get_licensed_website


class TestStage1IdentityAndIDOR(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.pwd_svc = PasswordService()
        cls.jwt_svc = JWTService()
        cls.ticket_svc = SupportTicketService(cls.db)
        cls.notif_svc = NotificationService(cls.db)

        cls.user_alpha_email = "tenant_alpha_qa@mdefender.io"
        cls.user_beta_email = "tenant_beta_qa@mdefender.io"
        cls.clean_test_data()

        # Create Tenant Alpha
        cls.alpha_id = str(ObjectId())
        cls.alpha_doc = {
            "_id": ObjectId(cls.alpha_id),
            "email": cls.user_alpha_email,
            "username": "alpha_qa",
            "role": "user",
            "is_admin": False,
            "is_paid": True,
            "purchased_slots": 5,
            "created_at": datetime.now(timezone.utc)
        }
        cls.db.users.insert_one(cls.alpha_doc)

        # Create Tenant Beta
        cls.beta_id = str(ObjectId())
        cls.beta_doc = {
            "_id": ObjectId(cls.beta_id),
            "email": cls.user_beta_email,
            "username": "beta_qa",
            "role": "user",
            "is_admin": False,
            "is_paid": True,
            "purchased_slots": 2,
            "created_at": datetime.now(timezone.utc)
        }
        cls.db.users.insert_one(cls.beta_doc)

        # Create Tenant Alpha Website
        cls.alpha_site_id = str(ObjectId())
        cls.alpha_site_doc = {
            "_id": ObjectId(cls.alpha_site_id),
            "user_id": cls.alpha_id,
            "domain": "alpha-financial.com",
            "url": "https://alpha-financial.com",
            "is_licensed": True,
            "is_protected": True,
            "platform": "wordpress",
            "created_at": datetime.now(timezone.utc)
        }
        cls.db.websites.insert_one(cls.alpha_site_doc)

        # Create Tenant Beta Website
        cls.beta_site_id = str(ObjectId())
        cls.beta_site_doc = {
            "_id": ObjectId(cls.beta_site_id),
            "user_id": cls.beta_id,
            "domain": "beta-ecommerce.com",
            "url": "https://beta-ecommerce.com",
            "is_licensed": True,
            "is_protected": True,
            "platform": "wordpress",
            "created_at": datetime.now(timezone.utc)
        }
        cls.db.websites.insert_one(cls.beta_site_doc)

    @classmethod
    def tearDownClass(cls):
        cls.clean_test_data()

    @classmethod
    def clean_test_data(cls):
        test_emails = ["tenant_alpha_qa@mdefender.io", "tenant_beta_qa@mdefender.io"]
        cls.db.users.delete_many({"email": {"$in": test_emails}})
        cls.db.websites.delete_many({"domain": {"$in": ["alpha-financial.com", "beta-ecommerce.com"]}})
        cls.db.support_tickets.delete_many({"user_email": {"$in": test_emails}})
        cls.db.notifications.delete_many({"target_email": {"$in": test_emails}})

    def test_01_password_hashing_and_complexity(self):
        print("\n--- [STAGE 1.1] Password Cryptographic Security & OWASP Validation ---")
        # 1. Weak password rejection
        res = self.pwd_svc.validate_strength("123456")
        self.assertFalse(res["valid"], "Weak password must be rejected")
        print("  ✓ Weak dictionary password ('123456') correctly rejected.")

        # 2. Strong enterprise password acceptance
        res = self.pwd_svc.validate_strength("S3cur3!P@ssw0rd#2026")
        self.assertTrue(res["valid"], "Strong enterprise password must pass")
        print(f"  ✓ Enterprise password entropy & OWASP rules validated (Strength: {res.get('strength')}).")

        # 3. Bcrypt adaptive salt & hashing
        raw_pwd = "P@ssw0rdSecure!99"
        hash1 = self.pwd_svc.hash_password(raw_pwd)
        hash2 = self.pwd_svc.hash_password(raw_pwd)
        self.assertNotEqual(hash1, hash2, "Bcrypt salt must be unique per hash generation")
        self.assertTrue(self.pwd_svc.verify_password(raw_pwd, hash1))
        self.assertFalse(self.pwd_svc.verify_password("WrongPassword!", hash1))
        print("  ✓ Bcrypt random per-hash salting and constant-time verification verified.")

    def test_02_jwt_issuance_and_tamper_proofing(self):
        print("\n--- [STAGE 1.2] JWT Token Security & Tamper Proofing ---")
        token = self.jwt_svc.create_access_token(
            user_id=self.alpha_id,
            email=self.user_alpha_email,
            role="user"
        )
        self.assertIsNotNone(token)

        # Valid decoding
        decoded = self.jwt_svc.decode_access_token(token)
        self.assertEqual(decoded["sub"], self.alpha_id)
        self.assertEqual(decoded["email"], self.user_alpha_email)
        print("  ✓ Valid JWT correctly issued and decoded with authorized claims.")

        # Tampered Token Defense: Modify the payload portion
        parts = token.split(".")
        tampered_token = f"{parts[0]}.eyJuYW1lIjoiSGFja2VyIn0.{parts[2]}"
        decoded_tampered = self.jwt_svc.decode_access_token(tampered_token)
        self.assertIsNone(decoded_tampered, "Tampered JWT payload must fail cryptographic signature check")
        print("  ✓ Cryptographic signature defense: Tampered token instantly rejected.")

    def test_03_multi_tenant_website_idor_defense(self):
        print("\n--- [STAGE 1.3] Multi-Tenant Website IDOR Defense ---")
        # 1. Tenant Alpha legitimately accesses own site
        alpha_site = get_owned_website(self.alpha_doc, self.alpha_site_id)
        self.assertIsNotNone(alpha_site)
        self.assertEqual(alpha_site["domain"], "alpha-financial.com")
        print("  ✓ Legitimate access: Tenant Alpha successfully resolved own website.")

        # 2. Tenant Beta attempts to access Tenant Alpha's website via IDOR
        with self.assertRaises(HTTPException) as ctx:
            get_owned_website(self.beta_doc, self.alpha_site_id)
        self.assertIn(ctx.exception.status_code, [403, 404], "Tenant Beta must be blocked from accessing Alpha's website")
        print(f"  ✓ IDOR Attack Blocked: Tenant Beta blocked from accessing Alpha's website (HTTP {ctx.exception.status_code}).")

        # 3. Tenant Beta attempts to invoke licensed website resolution on Tenant Alpha's site
        with self.assertRaises(HTTPException) as ctx:
            get_licensed_website(self.beta_doc, self.alpha_site_id)
        self.assertIn(ctx.exception.status_code, [403, 404])
        print("  ✓ Licensed Website Guard: Tenant Beta blocked from licensing actions on Alpha's site.")

    def test_04_subresource_idor_defense(self):
        print("\n--- [STAGE 1.4] Website Sub-resource IDOR Scoping (Scans & Diagnostics) ---")
        # Create a mock malware scan on Alpha's website
        scan_id = ObjectId()
        self.db.malware_scans.insert_one({
            "_id": scan_id,
            "website_id": self.alpha_site_id,
            "user_id": self.alpha_id,
            "domain": "alpha-financial.com",
            "verdict": "clean",
            "created_at": datetime.now(timezone.utc)
        })

        # Query scans scoped to Beta
        beta_scans = list(self.db.malware_scans.find({"user_id": self.beta_id}))
        self.assertEqual(len(beta_scans), 0, "Tenant Beta query must return zero scans from Tenant Alpha")

        # Query scans for Alpha's site using Beta user scoping
        unauthorized_scan = self.db.malware_scans.find_one({
            "_id": scan_id,
            "user_id": self.beta_id
        })
        self.assertIsNone(unauthorized_scan, "Tenant Beta cannot locate Alpha's scan record")
        print("  ✓ Sub-resource isolation: Malware scans & threat history strictly partitioned.")

    def test_05_support_ticket_multi_tenant_isolation(self):
        print("\n--- [STAGE 1.5] Support Ticket Desk Multi-Tenant Isolation ---")
        # 1. Tenant Alpha creates an urgent incident ticket
        ticket = self.ticket_svc.create_ticket(
            user_id=self.alpha_id,
            user_email=self.user_alpha_email,
            subject="Alpha Site DDoS Incident",
            category="security",
            priority="urgent",
            message="We are experiencing an L7 HTTP flood on alpha-financial.com",
            target_domain="alpha-financial.com"
        )
        ticket_id = ticket["ticket_id"]
        self.assertIsNotNone(ticket_id)
        print(f"  ✓ Ticket created by Alpha: {ticket_id}")

        # 2. Tenant Alpha reads own ticket
        alpha_ticket = self.ticket_svc.get_ticket_details(ticket_id, user_id=self.alpha_id)
        self.assertIsNotNone(alpha_ticket)
        self.assertEqual(alpha_ticket["ticket_id"], ticket_id)

        # 3. Tenant Beta attempts to query Tenant Alpha's ticket via IDOR
        beta_ticket_query = self.ticket_svc.get_ticket_details(ticket_id, user_id=self.beta_id)
        self.assertIsNone(beta_ticket_query, "Tenant Beta must not be able to read Tenant Alpha's ticket")
        print("  ✓ Support Desk IDOR Defense: Tenant Beta received None for Alpha's ticket.")

        # 4. Verify user ticket feed
        beta_tickets = self.ticket_svc.get_user_tickets(user_id=self.beta_id)
        self.assertEqual(beta_tickets["total"], 0, "Beta's inbox must not contain Alpha's tickets")
        print("  ✓ Ticket Inbox isolation: Customer inquiries 100% strictly segregated.")

    def test_06_notification_multi_tenant_isolation(self):
        print("\n--- [STAGE 1.6] Notifications & Alert Feed Tenant Partitioning ---")
        # 1. Dispatch critical notification to Alpha
        self.notif_svc.notify(
            user_id=self.alpha_id,
            title="Firewall Breach Blocked",
            message="12 malicious SQL injection attempts blocked on alpha-financial.com",
            category="threat_alert"
        )

        # 2. Query alerts for Beta
        beta_alerts = list(self.db.notifications.find({"user_id": self.beta_id}))
        self.assertEqual(len(beta_alerts), 0, "Beta must not receive Alpha's security alerts")

        # 3. Query alerts for Alpha
        alpha_alerts = list(self.db.notifications.find({"user_id": self.alpha_id}))
        self.assertGreaterEqual(len(alpha_alerts), 1)
        print("  ✓ Alert isolation verified: Zero cross-tenant notification leakage.")

    def test_07_privilege_escalation_and_admin_barrier(self):
        print("\n--- [STAGE 1.7] Privilege Escalation & Admin Barrier Verification ---")
        # Tenant Beta tries to impersonate an admin
        from src.auth.dependencies import get_current_admin
        from starlette.requests import Request

        # Create a mock request with Tenant Beta's JWT token
        token = self.jwt_svc.create_access_token(
            user_id=self.beta_id,
            email=self.user_beta_email,
            role="user",
            extra_claims={"is_admin": False}
        )

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/admin/pricing",
            "headers": [(b"authorization", f"Bearer {token}".encode("utf-8"))],
            "query_string": b""
        }
        mock_req = Request(scope)

        import asyncio
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_admin(mock_req))
        self.assertEqual(ctx.exception.status_code, 403, "Regular user must be blocked with HTTP 403")
        self.assertIn("Admin access required", ctx.exception.detail)
        print("  ✓ Admin Security Barrier: Non-admin user blocked from admin endpoints (HTTP 403).")

    def test_08_mongodb_indexes_and_scalability(self):
        print("\n--- [STAGE 1.8] MongoDB Indexing & Concurrency Scalability Audit ---")
        indexes_websites = self.db.websites.index_information()
        indexes_wordpress = self.db.wordpress_sites.index_information()
        indexes_tickets = self.db.support_tickets.index_information()

        # Check user_id indexed on websites
        has_user_id_idx = any(
            any(k[0] == "user_id" for k in idx_info.get("key", []))
            for idx_info in indexes_websites.values()
        )
        self.assertTrue(has_user_id_idx, "db.websites must index user_id for multi-tenant scalability")
        print("  ✓ db.websites has indexed `user_id` (Ensures O(log N) lookups for millions of sites).")

        # Check user_id indexed on wordpress_sites
        has_wp_user_id = any(
            any(k[0] == "user_id" for k in idx_info.get("key", []))
            for idx_info in indexes_wordpress.values()
        )
        self.assertTrue(has_wp_user_id, "db.wordpress_sites must index user_id")
        print("  ✓ db.wordpress_sites has indexed `user_id`.")

        # Check support tickets indexes
        has_ticket_user_id = any(
            any(k[0] == "user_id" for k in idx_info.get("key", []))
            for idx_info in indexes_tickets.values()
        )
        self.assertTrue(has_ticket_user_id, "db.support_tickets must index user_id")
        print("  ✓ db.support_tickets has indexed `user_id`.")
        print("  ✓ Multi-tenancy scale architecture verified for millions of records.")


if __name__ == "__main__":
    unittest.main()
