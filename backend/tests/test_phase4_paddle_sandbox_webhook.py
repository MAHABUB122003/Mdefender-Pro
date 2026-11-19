"""
Phase 4 Paddle Sandbox, Webhook Security & Subscription Lifecycle Test Suite.
Tests:
1. Reject forged webhook requests (invalid HMAC-SHA256).
2. Replay attack rejection (> 300 seconds old timestamp).
3. Webhook idempotency (prevent duplicate subscription activation & double events).
4. Subscription activation fulfillment via transaction.completed & subscription.created.
5. Subscription cancellation event handling.
"""

import sys
import os
import time
import json
import hmac
import hashlib
import unittest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB
from src.services.paddle_service import PaddleService
from src.services.subscription_service import SubscriptionService
from fastapi.testclient import TestClient
from main import app


class TestPhase4PaddleWebhookSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.test_secret = "pdl_ntfset_test_secret_key_12345"
        cls.paddle = PaddleService(
            api_key="pdl_sdbx_test_key",
            webhook_secret=cls.test_secret,
            environment="sandbox"
        )
        cls.client = TestClient(app)

    def _sign_payload(self, body_bytes: bytes, secret: str, ts: int = None) -> str:
        if ts is None:
            ts = int(time.time())
        signed_payload = f"{ts}:".encode("utf-8") + body_bytes
        h1 = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return f"ts={ts};h1={h1}"

    def test_01_reject_forged_webhook_signature(self):
        """Forged or incorrect webhook signatures must be rejected immediately."""
        raw_body = b'{"event_type": "transaction.completed", "data": {}}'
        bad_sig = "ts=1234567890;h1=0000000000000000000000000000000000000000000000000000000000000000"
        
        valid = self.paddle.verify_webhook_signature(raw_body, bad_sig, self.test_secret)
        self.assertFalse(valid, "Forged signature must be rejected")

    def test_02_replay_attack_prevention(self):
        """Events older than 5 minutes (300s) must be rejected to prevent replay attacks."""
        raw_body = b'{"event_type": "transaction.completed", "data": {}}'
        old_ts = int(time.time()) - 360  # 6 minutes old!
        old_sig = self._sign_payload(raw_body, self.test_secret, ts=old_ts)

        valid = self.paddle.verify_webhook_signature(raw_body, old_sig, self.test_secret)
        self.assertFalse(valid, "Expired/Replayed webhook timestamp must be rejected")

    def test_03_valid_hmac_signature_accepted(self):
        """Valid HMAC-SHA256 signature with fresh timestamp must be accepted."""
        raw_body = b'{"event_type": "transaction.completed", "data": {}}'
        good_sig = self._sign_payload(raw_body, self.test_secret)

        valid = self.paddle.verify_webhook_signature(raw_body, good_sig, self.test_secret)
        self.assertTrue(valid, "Authentic HMAC-SHA256 signature must be verified successfully")

    def test_04_webhook_fulfillment_and_idempotency(self):
        """Valid transaction.completed webhook fulfills Pro subscription with exact slots, duplicate delivery is idempotent."""
        uid = str(ObjectId())
        email = f"paddle_user_{uid[:6]}@test.io"
        now_utc = datetime.now(timezone.utc)

        # Insert user as free
        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": email,
            "plan": "free",
            "payment_status": "trialing",
            "purchased_slots": 0,
            "created_at": now_utc - timedelta(days=5),
            "trial_ends_at": now_utc + timedelta(days=9)
        })

        sub_service = SubscriptionService(self.db)
        event_id = f"evt_{ObjectId()}"
        event_payload = {
            "event_id": event_id,
            "event_type": "transaction.completed",
            "occurred_at": datetime.now().isoformat(),
            "data": {
                "id": f"txn_{ObjectId()}",
                "status": "completed",
                "custom_data": {
                    "user_id": uid,
                    "plan": "pro",
                    "billing_cycle": "monthly",
                    "sites_count": 5
                },
                "totals": {"total": 2000},
                "currency_code": "USD"
            }
        }

        # 1. Process first webhook event
        sub_service.record_transaction(uid, event_payload)

        # User in DB must now be Pro with 5 purchased slots
        user_after = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_after.get("plan"), "pro")
        self.assertEqual(user_after.get("payment_status"), "active")
        self.assertEqual(user_after.get("purchased_slots"), 5)

        # 2. Idempotency test: Process same event a second time
        sub_service.record_transaction(uid, event_payload)
        user_after_2 = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_after_2.get("purchased_slots"), 5, "Slots must not be doubled on duplicate event")

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        self.db.paddle_transactions.delete_many({"user_id": uid})

    def test_05_subscription_cancellation_webhook(self):
        """subscription.canceled webhook updates user payment_status and revokes active subscription."""
        uid = str(ObjectId())
        sub_id = f"sub_{ObjectId()}"
        now_utc = datetime.now(timezone.utc)

        self.db.users.insert_one({
            "_id": ObjectId(uid),
            "email": f"canc_{uid[:6]}@test.io",
            "plan": "pro",
            "payment_status": "active",
            "purchased_slots": 2,
            "created_at": now_utc - timedelta(days=30)
        })

        self.db.subscriptions.insert_one({
            "user_id": uid,
            "paddle_subscription_id": sub_id,
            "status": "active",
            "plan": "pro"
        })

        sub_service = SubscriptionService(self.db)
        cancel_event = {
            "event_id": f"evt_canc_{ObjectId()}",
            "event_type": "subscription.canceled",
            "subscription_id": sub_id,
            "status": "canceled",
            "data": {
                "id": sub_id,
                "status": "canceled",
                "custom_data": {"user_id": uid, "plan": "pro"}
            }
        }

        sub_service.upsert_paddle_subscription(uid, cancel_event)

        # Verify in DB: subscription status is canceled
        sub_doc = self.db.subscriptions.find_one({"paddle_subscription_id": sub_id})
        self.assertEqual(sub_doc.get("status"), "canceled")

        # User in DB must have payment_status canceled
        user_doc = self.db.users.find_one({"_id": ObjectId(uid)})
        self.assertEqual(user_doc.get("payment_status"), "canceled")

        # Cleanup
        self.db.users.delete_one({"_id": ObjectId(uid)})
        self.db.subscriptions.delete_one({"paddle_subscription_id": sub_id})


if __name__ == "__main__":
    unittest.main()
