"""MDefender Pro subscription + entitlement service.

Two independent concepts that must never be conflated:

1. Paddle-managed subscription  (source: Paddle webhooks / API)
2. Admin-granted entitlement     (source: admin panel)

Effective entitlement for a user:
    admin grant (if active) > paddle subscription (if active) > plan defaults

Webhook events update the Paddle subscription record. Admin actions update the
entitlement record. The plan limits themselves live in the PlanService.
"""

import secrets
from datetime import datetime, timedelta
from bson import ObjectId

from src.database.mongodb_connection import MongoDB
from src.services.plan_service import PlanService
from src.utils.api_response import parse_object_id


class SubscriptionService:
    def __init__(self, db=None):
        self.db = db or MongoDB()
        self.plan_service = PlanService(self.db)

    # ---------- helpers ----------

    @staticmethod
    def _user_id(user):
        """Normalize user identity: auth dict (id), mongo doc (_id), or raw string."""
        if isinstance(user, dict):
            if "_id" in user:
                return str(user["_id"])
            if "id" in user:
                return str(user["id"])
            if "email" in user:
                return str(user["email"])
            return str(user)
        return str(user)

    def _user_plan(self, user):
        if isinstance(user, dict):
            return user.get("plan", "free") or "free"
        return "free"

    def _ensure_indexes(self):
        try:
            self.db.subscriptions.create_index("user_id")
            self.db.subscriptions.create_index("paddle_subscription_id", unique=True, sparse=True)
            self.db.entitlements.create_index("user_id", unique=True)
        except Exception:
            pass

    # ---------- Paddle subscription records ----------

    def upsert_paddle_subscription(self, user_id, event):
        """Create or update the paddle-managed subscription record from a webhook event."""
        subscription_id = event.get("subscription_id") or (event.get("data") or {}).get("id")
        status = event.get("status") or (event.get("data") or {}).get("status")
        data = event.get("data", {})
        custom = data.get("custom_data") or event.get("custom_data") or {}
        plan = custom.get("plan") or custom.get("plan_id") or "pro"

        record = {
            "user_id": str(user_id),
            "paddle_subscription_id": subscription_id,
            "customer_id": event.get("customer_id") or data.get("customer_id"),
            "status": status,
            "plan": plan,
            "source": "paddle",
            "updated_at": datetime.now(),
            "event_type": event.get("event_type"),
            "scheduled_change": data.get("scheduled_change"),
            "raw": {k: v for k, v in data.items() if k in (
                "billing_cycle", "current_billing_period", "items", "started_at",
                "next_billed_at", "paused_at", "canceled_at",
            )},
        }
        if status in ("canceled", "paused"):
            record["ended_at"] = datetime.now()

        query = {}
        if subscription_id:
            query["paddle_subscription_id"] = subscription_id
        if not query:
            query["user_id"] = str(user_id)
        try:
            self.db.subscriptions.update_one(query, {"$set": record}, upsert=True)
        except Exception:
            # Duplicate key fallback: unique constraint on paddle_subscription_id
            self.db.subscriptions.update_one(
                {"user_id": str(user_id), "paddle_subscription_id": subscription_id},
                {"$set": record},
                upsert=True,
            )

    def record_transaction(self, user_id, event):
        """Record a completed/failed Paddle transaction (invoice-like record)."""
        data = event.get("data", {})
        status = data.get("status")
        rec = {
            "user_id": str(user_id),
            "transaction_id": data.get("id"),
            "status": status,
            "event_type": event.get("event_type"),
            "occurred_at": event.get("occurred_at"),
            "amount": (data.get("totals") or {}).get("total"),
            "currency_code": (data.get("currency_code") or {}),
            "billed_at": data.get("billed_at") or data.get("created_at"),
            "created_at": datetime.now(),
        }
        try:
            self.db.paddle_transactions.insert_one(rec)
        except Exception:
            pass

    # ---------- Admin-granted entitlement ----------

    def get_entitlement(self, user_id):
        return self.db.entitlements.find_one({"user_id": str(user_id)})

    def grant_entitlement(self, user_id, plan, days=30, note=None):
        """Admin grants a plan. Returns updated entitlement record."""
        expiry = datetime.now() + timedelta(days=int(days or 30))
        doc = {
            "user_id": str(user_id),
            "plan": plan,
            "status": "active",
            "granted_by": note.get("granted_by") if note else None,
            "note": note.get("note") if note else None,
            "expires_at": expiry,
            "granted_at": datetime.now(),
        }
        self.db.entitlements.update_one({"user_id": str(user_id)}, {"$set": doc}, upsert=True)
        return doc

    def revoke_entitlement(self, user_id):
        result = self.db.entitlements.update_one(
            {"user_id": str(user_id)},
            {"$set": {"status": "revoked", "revoked_at": datetime.now()}},
        )
        return result.modified_count > 0

    def suspend_entitlement(self, user_id):
        result = self.db.entitlements.update_one(
            {"user_id": str(user_id)},
            {"$set": {"status": "suspended", "suspended_at": datetime.now()}},
        )
        return result.modified_count > 0

    def reactivate_entitlement(self, user_id):
        result = self.db.entitlements.update_one(
            {"user_id": str(user_id)},
            {"$set": {"status": "active", "reactivated_at": datetime.now()}},
        )
        return result.modified_count > 0

    # ---------- Effective entitlement resolution ----------

    def effective_plan(self, user):
        """Resolve the effective plan id for a user."""
        user_id = self._user_id(user)
        ent = self.get_entitlement(user_id)
        now = datetime.now()
        if ent and ent.get("status") == "active":
            expires = ent.get("expires_at")
            if expires is None or expires > now:
                return ent.get("plan", "free")
        sub = self.db.subscriptions.find_one({"user_id": user_id, "status": {"$in": ["active", "trialing"]}})
        if sub:
            return sub.get("plan", "pro")
        return self._user_plan(user)

    def entitlement(self, user):
        """Full entitlement object for a user (plan config + source + usage limits)."""
        user_id = self._user_id(user)
        plan_id = self.effective_plan(user)
        plan = self.plan_service.get_plan(plan_id)

        ent = self.get_entitlement(user_id)
        sub = self.db.subscriptions.find_one({"user_id": user_id, "status": {"$in": ["active", "trialing"]}})

        source = "free"
        if ent and ent.get("status") == "active":
            source = "admin_grant"
        elif sub:
            source = "paddle"

        usage = self.usage(user)

        return {
            "plan": plan,
            "plan_id": plan_id,
            "source": source,
            "admin_entitlement": {
                "status": ent.get("status") if ent else None,
                "expires_at": ent.get("expires_at").isoformat() if ent and ent.get("expires_at") else None,
            } if ent else None,
            "paddle_subscription": {
                "id": sub.get("paddle_subscription_id") if sub else None,
                "status": sub.get("status") if sub else None,
                "next_billed_at": sub.get("raw", {}).get("next_billed_at") if sub else None,
            } if sub else None,
            "usage": usage,
        }

    # ---------- Usage + limits ----------

    def usage(self, user):
        user_id = self._user_id(user)
        today = datetime.now().strftime("%Y-%m-%d")
        websites = self.db.websites.count_documents({"user_id": user_id})
        requests = self.db.usage_metrics.count_documents({"user_id": user_id, "date": today, "type": "request"})
        scans = self.db.usage_metrics.count_documents({"user_id": user_id, "date": today, "type": "scan"})
        return {
            "websites": websites,
            "requests_today": requests,
            "scans_today": scans,
            "date": today,
        }

    def increment_usage(self, user_id, metric_type):
        today = datetime.now().strftime("%Y-%m-%d")
        try:
            self.db.usage_metrics.update_one(
                {"user_id": str(user_id), "date": today, "type": metric_type},
                {"$inc": {"count": 1}, "$setOnInsert": {"created_at": datetime.now()}},
                upsert=True,
            )
        except Exception:
            pass

    def check_website_limit(self, user, plan=None):
        plan_id = plan or self.effective_plan(user)
        config = self.plan_service.get_plan(plan_id)
        limit = config.get("website_limit", 1)
        user_id = self._user_id(user)
        current = self.db.websites.count_documents({"user_id": user_id})
        return {
            "allowed": current < limit,
            "limit": limit,
            "current": current,
            "plan": plan_id,
            "message": f"Your {config.get('name', plan_id)} plan allows up to {limit} website(s)."
            if current >= limit else None,
        }

    def check_scan_limit(self, user):
        plan_id = self.effective_plan(user)
        config = self.plan_service.get_plan(plan_id)
        limit = config.get("scans_per_day", 5)
        user_id = self._user_id(user)
        today = datetime.now().strftime("%Y-%m-%d")
        current = self.db.usage_metrics.count_documents({"user_id": user_id, "date": today, "type": "scan"})
        return {
            "allowed": current < limit,
            "limit": limit,
            "current": current,
            "plan": plan_id,
        }

    # ---------- Billing dashboard ----------

    def billing_dashboard(self, user):
        user_id = self._user_id(user)
        ent = self.get_entitlement(user_id)
        sub = self.db.subscriptions.find_one({"user_id": user_id})
        transactions = list(self.db.paddle_transactions.find({"user_id": user_id}).sort("created_at", -1).limit(20))
        return {
            "current_plan": self.effective_plan(user),
            "entitlement_source": ent.get("status") if ent else None,
            "subscription": {
                "status": sub.get("status") if sub else None,
                "paddle_id": sub.get("paddle_subscription_id") if sub else None,
                "next_billed_at": sub.get("raw", {}).get("next_billed_at") if sub else None,
            } if sub else None,
            "admin_entitlement": {
                "plan": ent.get("plan") if ent else None,
                "status": ent.get("status") if ent else None,
                "expires_at": ent.get("expires_at").isoformat() if ent and ent.get("expires_at") else None,
            } if ent else None,
            "transactions": [
                {
                    "id": t.get("transaction_id"),
                    "status": t.get("status"),
                    "amount": t.get("amount"),
                    "currency_code": t.get("currency_code"),
                    "billed_at": t.get("billed_at"),
                } for t in transactions
            ],
        }

    # ---------- subscription state machine for admin ----------

    def admin_subscription_summary(self):
        total_subs = self.db.subscriptions.count_documents({})
        active_subs = self.db.subscriptions.count_documents({"status": {"$in": ["active", "trialing"]}})
        paused = self.db.subscriptions.count_documents({"status": "paused"})
        canceled = self.db.subscriptions.count_documents({"status": "canceled"})
        admin_grants = self.db.entitlements.count_documents({"status": "active"})
        revenue_pipeline = list(self.db.paddle_transactions.find(
            {"status": {"$in": ["completed", "paid", "billed"]}}
        ))
        total_revenue = sum(float(t.get("amount") or 0) for t in revenue_pipeline) / 100.0
        return {
            "total_subscriptions": total_subs,
            "active_subscriptions": active_subs,
            "paused_subscriptions": paused,
            "canceled_subscriptions": canceled,
            "admin_grants": admin_grants,
            "paid_transactions": len(revenue_pipeline),
            "total_revenue_usd": round(total_revenue, 2),
        }

    # ---------- v1 API support methods ----------

    def get_active_subscription(self, user):
        """Return the active Paddle subscription record for a user, or None."""
        user_id = self._user_id(user)
        return self.db.subscriptions.find_one(
            {"user_id": user_id, "status": {"$in": ["active", "trialing"]}}
        )

    async def change_plan(self, user, plan):
        """Change the user's plan. Persists on the user record; if a Paddle
        subscription exists, requests a scheduled change (best-effort)."""
        user_id = self._user_id(user)
        from bson import ObjectId
        now = datetime.now()
        try:
            oid = ObjectId(user_id)
            result = self.db.users.update_one(
                {"_id": oid}, {"$set": {"plan": plan, "updated_at": now}}
            )
        except Exception:
            result = self.db.users.update_one(
                {"email": user_id}, {"$set": {"plan": plan, "updated_at": now}}
            )
        changed = result.modified_count > 0
        sub = self.get_active_subscription(user)
        scheduled = None
        if sub:
            from src.services.paddle_service import PaddleService
            try:
                scheduled = await PaddleService().update_subscription_scheduled_change(
                    sub.get("paddle_subscription_id")
                )
            except Exception:
                scheduled = None
        return {
            "plan": plan,
            "applied": changed,
            "scheduled_on_paddle": scheduled is not None,
            "message": f"Plan set to {plan}." if changed
                       else f"Plan already set to {plan}.",
        }

    def admin_grant_plan(self, user_id, plan, expires_at=None, granted_by=None):
        """Admin grants a plan entitlement with optional explicit expiry."""
        doc = {
            "user_id": str(user_id),
            "plan": plan,
            "status": "active",
            "granted_by": granted_by,
            "note": {"granted_by": granted_by} if granted_by else None,
            "expires_at": None,
            "granted_at": datetime.now(),
        }
        if expires_at:
            try:
                parsed = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if parsed.tzinfo is not None:
                    parsed = parsed.replace(tzinfo=None)
                doc["expires_at"] = parsed
            except Exception:
                pass
        self.db.entitlements.update_one({"user_id": str(user_id)}, {"$set": doc}, upsert=True)
        return doc
