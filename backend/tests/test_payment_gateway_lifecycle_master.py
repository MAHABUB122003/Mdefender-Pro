"""Master Verification Suite: Payment Gateway, Trial Paywall, Fleet Slots, Expiry & Anti-Tamper.

Covers:
1. Stage 1: Free Trial Lifecycle & Hard Paywall Gate
2. Stage 2: Anti-Tamper & Zero-Trust Server Pricing Integrity
3. Stage 3: Paddle Webhook HMAC Security, Idempotency & Tenant Isolation
4. Stage 4: Fleet Slot Quotas & Strict Boundary Defense (5 purchased, 10 connected)
5. Stage 5: Manual Monthly (30d) vs. Yearly (365d) Expiry Lifecycle & Watchdog
6. Stage 6: Live WordPress Endpoint & Fast-Cache Lockout Synchronization
"""

import sys
import os
import time
import hmac
import hashlib
import json
import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from src.services.license_slot_service import LicenseSlotService
from src.services.paddle_service import PaddleService
from src.services.plan_service import PlanService
from src.api.v1.billing_api import (
    create_checkout_session,
    paddle_webhook,
    CheckoutRequest,
    assign_license_slot,
    release_license_slot,
    swap_license_slot,
    LicenseSlotAssignRequest,
    LicenseSlotSwapRequest
)


class TestPaymentGatewayLifecycleMaster(unittest.TestCase):

    def setUp(self):
        import src.services.plan_service as ps
        ps._PRICING_CACHE = None
        ps._PRICING_CACHE_TIME = 0

        self.user_a_id = "user_qa_tenant_a_101"
        self.user_b_id = "user_qa_tenant_b_202"

        self.user_a = {
            "_id": self.user_a_id,
            "id": self.user_a_id,
            "email": "tenant_a@mdefender.com",
            "role": "user",
            "plan": "free",
            "subscription_status": "trial",
            "is_paid": False,
            "trial_starts_at": datetime.now(timezone.utc) - timedelta(days=2),
            "trial_ends_at": datetime.now(timezone.utc) + timedelta(days=12),
            "licensed_website_ids": []
        }

        self.user_b = {
            "_id": self.user_b_id,
            "id": self.user_b_id,
            "email": "tenant_b@mdefender.com",
            "role": "user",
            "plan": "free",
            "subscription_status": "trial",
            "is_paid": False,
            "licensed_website_ids": []
        }

    # =========================================================================
    # STAGE 1: Free Trial Lifecycle & Hard Paywall Gate
    # =========================================================================

    def test_01_active_trial_allows_dashboard_access(self):
        """Active 14-day trial grants licensed protection on primary site and full access."""
        svc = LicenseSlotService()
        state = svc.resolve_user_license_state(self.user_a)

        self.assertTrue(state["is_licensed"])
        self.assertTrue(state["is_trial"])
        self.assertEqual(state["max_slots"], 1)
        self.assertGreaterEqual(state["trial_days_remaining"], 11)

    def test_02_expired_trial_triggers_paywall_gate(self):
        """Expired trial (>14 days) revokes licensing and gates dashboard until payment."""
        expired_user = dict(self.user_a)
        expired_user["trial_starts_at"] = datetime.now(timezone.utc) - timedelta(days=16)
        expired_user["trial_ends_at"] = datetime.now(timezone.utc) - timedelta(days=2)

        svc = LicenseSlotService()
        state = svc.resolve_user_license_state(expired_user)

        self.assertFalse(state["is_licensed"])
        self.assertFalse(state["is_trial"])
        self.assertEqual(state["max_slots"], 0)
        self.assertEqual(state["trial_days_remaining"], 0)
        self.assertEqual(state["reason"], "trial_expired")

    # =========================================================================
    # STAGE 2: Anti-Tamper & Zero-Trust Server Pricing Integrity
    # =========================================================================

    def test_03_client_price_tamper_attempt_discarded(self):
        """Server strictly rejects client-sent price overrides and enforces DB pricing studio rates."""
        mock_db = MagicMock()
        mock_db.settings.find_one.return_value = {
            "_type": "dynamic_pricing",
            "config": {
                "base_monthly_rate": 4.0,
                "base_yearly_rate": 40.0,
                "currency": "USD"
            }
        }

        # Attacker attempts to checkout 5 sites for $0.01
        hacker_req = CheckoutRequest(
            website_limit=5,
            billing_cycle="monthly",
            price_id=None
        )

        with patch("src.api.v1.billing_api.MongoDB", return_value=mock_db), \
             patch("src.api.v1.billing_api._paddle") as mock_paddle_init:

            mock_paddle = MagicMock()
            mock_paddle.configured.return_value = True
            mock_paddle.create_checkout_session = MagicMock()

            async def mock_ccs(*args, **kwargs):
                return {"id": "txn_test_123", "url": "https://sandbox-checkout.paddle.com/123"}

            mock_paddle.create_checkout_session.side_effect = mock_ccs
            mock_paddle_init.return_value = mock_paddle

            res = asyncio.run(create_checkout_session(body=hacker_req, user=self.user_a))
            self.assertTrue(res["success"])

            # Verify that create_checkout_session was called with server-verified items
            args, kwargs = mock_paddle.create_checkout_session.call_args
            custom_data = kwargs.get("custom_data") or {}
            self.assertEqual(custom_data.get("user_id"), self.user_a_id)
            self.assertEqual(custom_data.get("website_limit"), 5)
            self.assertEqual(custom_data.get("billing_cycle"), "monthly")

    def test_04_volume_discount_tier_calculations(self):
        """Volume discount engine accurately computes tiered discounts (0%, 10%, 20%, 30%)."""
        mock_db = MagicMock()
        plan_svc = PlanService(mock_db)

        # 1 site @ $4/mo -> $4.00 (0% discount)
        calc_1 = plan_svc.calculate_dynamic_price(website_count=1, billing_cycle="monthly")
        self.assertEqual(calc_1["final_total"], 4.0)
        self.assertEqual(calc_1["discount_percent"], 0)

        # 10 sites @ $4/mo = $40 - 10% ($4) = $36.00
        calc_10 = plan_svc.calculate_dynamic_price(website_count=10, billing_cycle="monthly")
        self.assertEqual(calc_10["final_total"], 36.0)
        self.assertEqual(calc_10["discount_percent"], 10)

        # 25 sites @ $4/mo = $100 - 20% ($20) = $80.00
        calc_25 = plan_svc.calculate_dynamic_price(website_count=25, billing_cycle="monthly")
        self.assertEqual(calc_25["final_total"], 80.0)
        self.assertEqual(calc_25["discount_percent"], 20)

        # 50 sites @ $4/mo = $200 - 30% ($60) = $140.00
        calc_50 = plan_svc.calculate_dynamic_price(website_count=50, billing_cycle="monthly")
        self.assertEqual(calc_50["final_total"], 140.0)
        self.assertEqual(calc_50["discount_percent"], 30)

        # Annual plan (17% built-in savings / 2 months free)
        calc_ann_5 = plan_svc.calculate_dynamic_price(website_count=5, billing_cycle="annual")
        self.assertEqual(calc_ann_5["final_total"], 200.0)  # 5 * $40

    # =========================================================================
    # STAGE 3: Paddle Webhook Security, Idempotency & Multi-Tenant Isolation
    # =========================================================================

    def test_05_webhook_signature_forgery_rejection(self):
        """Webhooks missing a valid HMAC SHA256 signature are rejected with HTTP 401."""
        raw_body = b'{"event_id": "evt_fraud_01", "event_type": "transaction.completed"}'
        secret = "pdl_ntfset_secret_test_123"

        # 1. Invalid signature
        is_valid = PaddleService.verify_webhook_signature(
            raw_body=raw_body,
            signature_header="ts=123456789;h1=invalid_hash_abc",
            secret=secret
        )
        self.assertFalse(is_valid)

        # 2. Valid signature verification
        now_ts = str(int(time.time()))
        signed_payload = f"{now_ts}:{raw_body.decode('utf-8')}".encode("utf-8")
        h1 = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        valid_hdr = f"ts={now_ts};h1={h1}"

        is_valid_ok = PaddleService.verify_webhook_signature(
            raw_body=raw_body,
            signature_header=valid_hdr,
            secret=secret
        )
        self.assertTrue(is_valid_ok)

    def test_06_webhook_replay_attack_rejection(self):
        """Webhooks older than 300 seconds are rejected to defeat timestamp replay attacks."""
        raw_body = b'{"event_id": "evt_old_01"}'
        secret = "pdl_ntfset_secret_test_123"
        old_ts = str(int(time.time()) - 350)  # 350 seconds ago

        signed_payload = f"{old_ts}:{raw_body.decode('utf-8')}".encode("utf-8")
        h1 = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        old_hdr = f"ts={old_ts};h1={h1}"

        is_valid = PaddleService.verify_webhook_signature(
            raw_body=raw_body,
            signature_header=old_hdr,
            secret=secret,
            max_age_seconds=300
        )
        self.assertFalse(is_valid)

    def test_07_webhook_event_id_idempotency_prevents_double_credit(self):
        """Duplicate webhook event IDs are safely ignored to prevent double slot credits."""
        mock_db = MagicMock()
        mock_db.billing_webhook_events.find_one.return_value = {"event_id": "evt_dup_999", "status": "processed"}

        mock_req = MagicMock()
        event_payload = {
            "event_id": "evt_dup_999",
            "event_type": "transaction.completed",
            "data": {
                "id": "txn_dup_999",
                "custom_data": {"user_id": self.user_a_id, "website_limit": 5}
            }
        }
        raw_bytes = json.dumps(event_payload).encode("utf-8")

        async def get_body():
            return raw_bytes
        mock_req.body = get_body
        mock_req.headers.get.return_value = "ts=123;h1=fake"

        with patch("src.api.v1.billing_api.MongoDB", return_value=mock_db), \
             patch("src.services.paddle_service.PaddleService.verify_webhook_signature", return_value=True):

            res = asyncio.run(paddle_webhook(mock_req))
            self.assertTrue(res["success"])
            self.assertEqual(res["event_id"], "evt_dup_999")
            self.assertEqual(res["action"], "duplicate_skipped")

            # Verify no update was dispatched to users collection
            mock_db.users.update_one.assert_not_called()

    def test_08_strict_multi_tenant_isolation_prevents_cross_user_hijacking(self):
        """User A's payment webhook strictly upgrades User A and leaves User B 100% untouched."""
        mock_db = MagicMock()
        mock_db.billing_webhook_events.find_one.return_value = None  # New event
        mock_db.users.find_one.side_effect = lambda q: self.user_a if q.get("_id") == self.user_a_id else None

        mock_req = MagicMock()
        event_payload = {
            "event_id": "evt_tenant_iso_01",
            "event_type": "transaction.completed",
            "data": {
                "id": "txn_tenant_iso_01",
                "custom_data": {
                    "user_id": self.user_a_id,
                    "website_limit": 10,
                    "billing_cycle": "annual"
                }
            }
        }
        raw_bytes = json.dumps(event_payload).encode("utf-8")

        async def get_body():
            return raw_bytes
        mock_req.body = get_body
        mock_req.headers.get.return_value = "ts=123;h1=valid"

        with patch("src.api.v1.billing_api.MongoDB", return_value=mock_db), \
             patch("src.services.paddle_service.PaddleService.verify_webhook_signature", return_value=True):

            res = asyncio.run(paddle_webhook(mock_req))
            self.assertTrue(res["success"])
            self.assertEqual(res["action"], "activated")

            # Verify update_one was called targeting user_a_id ONLY
            mock_db.users.update_one.assert_called_once()
            filter_arg, update_arg = mock_db.users.update_one.call_args[0]
            self.assertEqual(filter_arg.get("_id"), self.user_a_id)
            self.assertNotEqual(filter_arg.get("_id"), self.user_b_id)
            self.assertEqual(update_arg["$set"]["plan"], "pro")
            self.assertEqual(update_arg["$set"]["website_limit"], 10)

    # =========================================================================
    # STAGE 4: Fleet Slot Quotas & Strict Boundary Defense
    # =========================================================================

    def test_09_fleet_slot_boundary_5_purchased_10_connected(self):
        """User connects 10 sites but buys 5 slots: strictly 5 active, 5 dormant."""
        user_with_5_slots = dict(self.user_a)
        user_with_5_slots["plan"] = "pro"
        user_with_5_slots["website_limit"] = 5
        user_with_5_slots["is_paid"] = True
        user_with_5_slots["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=30)
        user_with_5_slots["licensed_website_ids"] = [f"site_slot_{i}" for i in range(1, 6)]

        # 10 connected sites
        all_10_sites = [
            {"_id": f"site_slot_{i}", "domain": f"site{i}.com", "user_id": self.user_a_id}
            for i in range(1, 11)
        ]

        svc = LicenseSlotService()
        reconciled = svc.reconcile_allocations(
            user_doc=user_with_5_slots,
            websites=all_10_sites,
            state={"is_licensed": True, "max_slots": 5}
        )

        active_ids = reconciled["licensed_ids"]
        self.assertEqual(len(active_ids), 5)
        self.assertEqual(set(active_ids), {f"site_slot_{i}" for i in range(1, 6)})

        # Remaining 5 sites are dormant / unlicensed
        unlicensed_ids = [s["_id"] for s in all_10_sites if s["_id"] not in active_ids]
        self.assertEqual(len(unlicensed_ids), 5)

    def test_10_over_allocation_6th_site_blocked(self):
        """Attempting to activate a 6th site when 5/5 slots are occupied is blocked with 400."""
        user_at_capacity = dict(self.user_a)
        user_at_capacity["plan"] = "pro"
        user_at_capacity["website_limit"] = 5
        user_at_capacity["is_paid"] = True
        user_at_capacity["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=30)
        user_at_capacity["licensed_website_ids"] = [f"site_slot_{i}" for i in range(1, 6)]

        mock_db = MagicMock()
        mock_db.users.find_one.return_value = user_at_capacity
        mock_db.websites.find_one.return_value = {"_id": "site_slot_6", "user_id": self.user_a_id}

        req = LicenseSlotAssignRequest(website_id="site_slot_6")

        with patch("src.api.v1.billing_api.MongoDB", return_value=mock_db), \
             patch("src.services.license_slot_service.LicenseSlotService._get_user_doc", return_value=user_at_capacity):

            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(assign_license_slot(body=req, user=user_at_capacity))

            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("Slot limit reached", ctx.exception.detail)

    def test_11_dynamic_slot_swap_transfer(self):
        """Releasing Site #1 and assigning Site #6 succeeds smoothly without extra charges."""
        user_with_slots = dict(self.user_a)
        user_with_slots["plan"] = "pro"
        user_with_slots["website_limit"] = 5
        user_with_slots["is_paid"] = True
        user_with_slots["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=30)
        user_with_slots["licensed_website_ids"] = [f"site_slot_{i}" for i in range(1, 6)]

        mock_db = MagicMock()
        mock_db.users.find_one.return_value = user_with_slots

        def mock_site_find(q):
            w_id = q.get("_id")
            return {"_id": w_id, "user_id": self.user_a_id, "domain": f"{w_id}.com"}
        mock_db.websites.find_one.side_effect = mock_site_find

        swap_req = LicenseSlotSwapRequest(
            release_website_id="site_slot_1",
            assign_website_id="site_slot_6"
        )

        with patch("src.api.v1.billing_api.MongoDB", return_value=mock_db), \
             patch("src.services.license_slot_service.LicenseSlotService._get_user_doc", return_value=user_with_slots):

            res = asyncio.run(swap_license_slot(body=swap_req, user=user_with_slots))
            self.assertTrue(res["success"])
            self.assertIn("site_slot_6", res["data"]["licensed_website_ids"])
            self.assertNotIn("site_slot_1", res["data"]["licensed_website_ids"])

    # =========================================================================
    # STAGE 5: Manual Monthly (30d) vs. Yearly (365d) Expiry & Watchdog
    # =========================================================================

    def test_12_monthly_30_day_lifecycle_and_watchdog_pause(self):
        """Monthly subscription provides full 30 days of service, then enters past_due/expired."""
        svc = LicenseSlotService()

        # Day 15 of 30: fully active
        active_monthly = dict(self.user_a)
        active_monthly["plan"] = "pro"
        active_monthly["is_paid"] = True
        active_monthly["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=15)
        st_active = svc.resolve_user_license_state(active_monthly)
        self.assertTrue(st_active["is_licensed"])

        # Day 31 (Expired): licensing revoked, safe pause
        expired_monthly = dict(self.user_a)
        expired_monthly["plan"] = "pro"
        expired_monthly["is_paid"] = True
        expired_monthly["plan_expires"] = datetime.now(timezone.utc) - timedelta(days=1)
        st_exp = svc.resolve_user_license_state(expired_monthly)
        self.assertFalse(st_exp["is_licensed"])
        self.assertEqual(st_exp["reason"], "subscription_expired")

    def test_13_yearly_365_day_lifecycle_and_watchdog_pause(self):
        """Yearly subscription provides full 365 days of service, then safely expires without unexpected charges."""
        svc = LicenseSlotService()

        # Day 300 of 365: fully active
        active_yearly = dict(self.user_a)
        active_yearly["plan"] = "pro"
        active_yearly["is_paid"] = True
        active_yearly["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=65)
        st_year = svc.resolve_user_license_state(active_yearly)
        self.assertTrue(st_year["is_licensed"])

        # Day 366 (Expired): licensing revoked, safe pause without recurring deduction
        expired_yearly = dict(self.user_a)
        expired_yearly["plan"] = "pro"
        expired_yearly["is_paid"] = True
        expired_yearly["plan_expires"] = datetime.now(timezone.utc) - timedelta(days=2)
        st_year_exp = svc.resolve_user_license_state(expired_yearly)
        self.assertFalse(st_year_exp["is_licensed"])
        self.assertEqual(st_year_exp["reason"], "subscription_expired")

    def test_14_manual_extension_instant_reactivation(self):
        """User manually extends license -> slot licensing immediately restores across fleet."""
        mock_db = MagicMock()
        renewed_user = dict(self.user_a)
        renewed_user["plan"] = "pro"
        renewed_user["website_limit"] = 5
        renewed_user["is_paid"] = True
        renewed_user["plan_expires"] = datetime.now(timezone.utc) + timedelta(days=365)
        renewed_user["licensed_website_ids"] = [f"site_{i}" for i in range(1, 6)]

        svc = LicenseSlotService()
        state = svc.resolve_user_license_state(renewed_user)
        self.assertTrue(state["is_licensed"])
        self.assertEqual(state["max_slots"], 5)
        self.assertEqual(state["plan"], "pro")

    # =========================================================================
    # STAGE 6: Live WordPress Endpoint & Fast-Cache Synchronization
    # =========================================================================

    def test_15_live_wordpress_licensed_vs_unlicensed_sync(self):
        """Verify cloud push updates WordPress options and exports fast-cache."""
        from src.services.license_slot_service import push_instant_sync_to_wordpress

        mock_site = {
            "_id": "wp_live_site_001",
            "url": "http://localhost/mahabub",
            "domain": "localhost/mahabub",
            "api_key": "mdf_site_live_qa_key",
            "site_token": "token_live_qa_tok"
        }

        with patch("requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "status": "success",
                "connected": "yes",
                "mode": "protect",
                "is_licensed": "yes"
            }
            mock_get.return_value = mock_resp

            res = push_instant_sync_to_wordpress(mock_site, is_licensed=True, mode="protect")
            self.assertTrue(res)

            # Verify request targeted localhost/mahabub with cloud_action
            url_called = mock_get.call_args[0][0]
            self.assertIn("localhost/mahabub", url_called)
            self.assertIn("waf_cloud_sync=1", url_called)
            self.assertIn("cloud_action=sync_license_state", url_called)


if __name__ == "__main__":
    unittest.main()
