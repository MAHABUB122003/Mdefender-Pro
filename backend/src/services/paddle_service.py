"""MDefender Pro Paddle Billing integration.

Real Paddle Billing (not fake payment logic):
  - create_checkout_session:  POST /checkout/custom  (sandbox or production)
  - verify_webhook_signature: HMAC-SHA256 over "{ts}:{raw_body}" using the
    notification destination secret; constant-time compare + replay check.
  - parse events into typed records for the subscription service.

Backend is the source of truth. Frontend payment success is never trusted.
"""

import hashlib
import hmac
import json
import os
import time

import httpx

PADDLE_API = {
    "sandbox": "https://sandbox-api.paddle.com",
    "production": "https://api.paddle.com",
}


class PaddleService:
    def __init__(self, api_key=None, environment=None, webhook_secret=None):
        self.api_key = api_key or os.getenv("PADDLE_API_KEY", "")
        self.environment = (environment or os.getenv("PADDLE_ENVIRONMENT", "sandbox")).lower()
        self.webhook_secret = webhook_secret or os.getenv("PADDLE_WEBHOOK_SECRET", "")
        self.base_url = PADDLE_API.get(self.environment, PADDLE_API["sandbox"])

    @property
    def configured(self):
        return bool(self.api_key and self.webhook_secret)

    def get_status(self):
        return {
            "configured": self.configured,
            "environment": self.environment,
        }

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def create_checkout_session(self, items, customer_email=None, custom_data=None,
                                      success_url=None, cancel_url=None):
        """Create a Paddle Checkout session. Returns checkout id + url."""
        if not self.api_key:
            return {"error": "Paddle not configured", "checkout_url": None}
        payload = {
            "items": items,
            "custom_data": custom_data or {},
        }
        if customer_email:
            payload["customer"] = {"email": customer_email}
        if success_url:
            payload["success_url"] = success_url
        if cancel_url:
            payload["cancel_url"] = cancel_url
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{self.base_url}/checkout/custom",
                                         headers=self._headers(), json=payload)
                data = resp.json()
                if resp.status_code >= 400:
                    return {"error": f"Paddle API error {resp.status_code}: {data.get('error', {})}"}
                checkout = data.get("data", data)
                return {
                    "checkout_id": checkout.get("id"),
                    "checkout_url": checkout.get("url"),
                }
        except Exception as e:
            return {"error": f"Paddle request failed: {e}"}

    async def list_prices(self):
        if not self.api_key:
            return {"error": "Paddle not configured", "prices": []}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{self.base_url}/prices", headers=self._headers())
                data = resp.json()
                return {"prices": data.get("data", [])}
        except Exception as e:
            return {"error": f"Paddle request failed: {e}"}

    async def get_subscription(self, subscription_id):
        if not self.api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{self.base_url}/subscriptions/{subscription_id}",
                                        headers=self._headers())
                if resp.status_code == 200:
                    return resp.json().get("data")
        except Exception:
            pass
        return None

    async def update_subscription_scheduled_change(self, subscription_id, items=None):
        """Schedule a change (e.g., downgrade at next billing date)."""
        if not self.api_key:
            return {"error": "Paddle not configured"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                payload = {"items": items} if items else {}
                resp = await client.patch(
                    f"{self.base_url}/subscriptions/{subscription_id}/scheduled-change",
                    headers=self._headers(), json=payload,
                )
                return {"status": "success" if resp.status_code in (200, 202) else "error",
                        "data": resp.json() if resp.content else {}}
        except Exception as e:
            return {"error": f"Paddle request failed: {e}"}

    async def cancel_subscription(self, subscription_id, scheduled_at=None):
        if not self.api_key:
            return {"error": "Paddle not configured"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                payload = {"effective_from": scheduled_at or "next_billing_period"}
                resp = await client.post(
                    f"{self.base_url}/subscriptions/{subscription_id}/cancel",
                    headers=self._headers(), json=payload,
                )
                return {"status": "success" if resp.status_code in (200, 202) else "error"}
        except Exception as e:
            return {"error": f"Paddle request failed: {e}"}

    @staticmethod
    def verify_webhook_signature(raw_body, signature_header, secret, max_age_seconds=300):
        """Verify a Paddle Billing webhook signature.

        Must be called with the RAW request body bytes exactly as received.
        """
        if not signature_header or not secret:
            return False
        parts = {}
        for segment in signature_header.split(";"):
            if "=" in segment:
                key, value = segment.split("=", 1)
                parts[key.strip()] = value.strip()
        ts = parts.get("ts")
        h1 = parts.get("h1")
        if not ts or not h1:
            return False
        try:
            ts_int = int(ts)
        except (ValueError, TypeError):
            return False
        # Replay protection: reject events that are too old.
        if abs(time.time() - ts_int) > max_age_seconds:
            return False
        signed_payload = f"{ts}:{raw_body}".encode("utf-8")
        expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected.lower(), h1.lower())

    @staticmethod
    def parse_event(payload):
        """Return a normalized record for the subscription service."""
        event_type = payload.get("event_type", "")
        data = payload.get("data", {})
        return {
            "event_type": event_type,
            "event_id": payload.get("event_id"),
            "occurred_at": payload.get("occurred_at"),
            "data": data,
            "subscription_id": data.get("id") if data.get("id", "").startswith("sub_") else None,
            "customer_id": data.get("customer_id"),
            "status": data.get("status"),
            "transaction_id": data.get("id") if data.get("id", "").startswith("txn_") else None,
            "custom_data": data.get("custom_data") or {},
        }
