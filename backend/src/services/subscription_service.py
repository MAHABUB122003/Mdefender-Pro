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

        # Synchronize plan & status directly to the users collection for instant app-wide recognition
        try:
            user_query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(str(user_id)) else {"_id": str(user_id)}
            if status in ("active", "trialing"):
                self.db.users.update_one(
                    user_query,
                    {"$set": {
                        "plan": plan,
                        "plan_tier": plan,
                        "payment_status": "active",
                        "paddle_subscription_id": subscription_id,
                        "paddle_customer_id": record["customer_id"],
                        "last_payment_date": datetime.now()
                    }}
                )
            elif status in ("canceled", "past_due"):
                self.db.users.update_one(
                    user_query,
                    {"$set": {
                        "payment_status": status
                    }}
                )
        except Exception:
            pass

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

        # Real-time automated fulfillment on completed transaction
        if str(status).lower() in ("paid", "completed"):
            try:
                from bson import ObjectId
                from datetime import timedelta
                u_id = ObjectId(user_id) if ObjectId.is_valid(str(user_id)) else str(user_id)
                custom = data.get("custom_data") or event.get("custom_data") or {}
                plan = custom.get("plan") or "pro"
                cycle = custom.get("billing_cycle") or "monthly"
                duration = 365 if cycle == "yearly" else 30
                sites = int(custom.get("sites_count") or custom.get("quantity") or 1)
                self.db.users.update_one(
                    {"_id": u_id},
                    {"$set": {
                        "plan": plan,
                        "plan_tier": plan,
                        "payment_status": "active",
                        "purchased_slots": sites,
                        "last_payment_date": datetime.now(),
                        "plan_expires": datetime.now() + timedelta(days=duration)
                    }}
                )
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
            "website_limit": note.get("website_limit") if (note and note.get("website_limit") is not None) else None,
            "expires_at": expiry,
            "granted_at": datetime.now(),
        }
        self.db.entitlements.update_one({"user_id": str(user_id)}, {"$set": doc}, upsert=True)
        return doc

    def check_and_process_subscription_lifecycle(self, batch_limit=50):
        """Automated background watchdog for subscription lifecycles, Day-10 reminders, and trial expiration."""
        from src.services.license_slot_service import LicenseSlotService
        from src.services.notification_service import NotificationService
        slot_service = LicenseSlotService(self.db)
        notif_service = NotificationService(self.db)

        users = list(self.db.users.find(
            {"role": {"$ne": "super_admin"}},
            {"_id": 1, "email": 1, "plan": 1, "payment_status": 1, "trial_ends_at": 1, "created_at": 1, "plan_expires": 1, "licensed_website_ids": 1}
        ).limit(batch_limit))

        results = {"reminders_sent": 0, "expirations_handled": 0, "renewals_reminded": 0}

        for user_doc in users:
            try:
                uid_str = str(user_doc["_id"])
                state = slot_service.resolve_user_license_state(user_doc)

                # 1. Day-10 Free Trial Payment Reminder (4 days remaining)
                if state.get("is_trial_active") and state.get("trial_days_remaining") <= 4 and state.get("trial_days_remaining") > 0:
                    days_left = state["trial_days_remaining"]
                    sent = notif_service.notify(
                        uid_str,
                        title=f"Free Trial Notice: {days_left} Days Remaining",
                        message=f"Your 14-day MDefender fleet free trial has {days_left} day(s) remaining. Add your payment method to ensure continuous zero-downtime edge protection.",
                        category="trial_reminder",
                        dedupe_key=f"day10_{uid_str}",
                        cooldown_seconds=86400
                    )
                    if sent:
                        results["reminders_sent"] += 1

                # 2. Trial Expiration Execution
                elif not state.get("is_paid") and state.get("trial_days_remaining", 0) <= 0:
                    current_payment_status = str(user_doc.get("payment_status") or "").lower()
                    if current_payment_status in ("trialing", "trial_active", "none", ""):
                        # Mark user as expired and revoke website protections
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {"payment_status": "trial_expired", "purchased_slots": 0, "licensed_website_ids": []}})

                        # Deactivate website active status
                        self.db.websites.update_many(
                            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
                            {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False, "updated_at": datetime.now()}}
                        )

                        notif_service.notify(
                            uid_str,
                            title="14-Day Free Trial Concluded: Edge Protection Paused",
                            message="Your 14-day free trial has concluded. Upgrade to an active fleet subscription to reactivate autonomous edge WAF filtering and malware protection.",
                            category="trial_expired",
                            dedupe_key=f"expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1

                # 3. Upcoming Renewal Reminder (within 3 days of expiration)
                elif state.get("is_paid") and user_doc.get("plan_expires"):
                    from src.services.license_slot_service import _normalize_to_utc
                    exp_dt = _normalize_to_utc(user_doc.get("plan_expires"), None)
                    now_utc = datetime.now(timezone.utc)
                    if exp_dt and exp_dt > now_utc:
                        days_to_exp = int(math.ceil((exp_dt - now_utc).total_seconds() / 86400))
                        if 0 < days_to_exp <= 3:
                            sent = notif_service.notify(
                                uid_str,
                                title=f"Upcoming Renewal Notice: {days_to_exp} Days",
                                message=f"Your MDefender subscription will automatically renew in {days_to_exp} day(s). Please verify your payment details remain up to date.",
                                category="subscription_renewal",
                                dedupe_key=f"renewal_{uid_str}_{exp_dt.strftime('%Y%m')}",
                                cooldown_seconds=86400
                            )
                            if sent:
                                results["renewals_reminded"] += 1

            except Exception:
                pass

        return results

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

        # Check explicit user plan expiration timestamp
        if user_id:
            try:
                from bson import ObjectId
                u_doc = self.db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(str(user_id)) else self.db.users.find_one({"_id": str(user_id)})
                if u_doc:
                    exp = u_doc.get("plan_expires")
                    if isinstance(exp, str):
                        try:
                            exp = datetime.fromisoformat(exp)
                        except Exception:
                            exp = None
                    if exp and exp < now:
                        return "free"
            except Exception:
                pass

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
        user_ids = [str(user_id)]
        try:
            from bson import ObjectId
            if ObjectId.is_valid(str(user_id)):
                user_ids.append(ObjectId(str(user_id)))
        except Exception:
            pass
        current = self.db.websites.count_documents({"user_id": {"$in": user_ids}})
        return {
            "allowed": current < limit,
            "limit": limit,
            "current": current,
            "plan": plan_id,
            "message": f"Your {config.get('name', plan_id)} plan allows up to {limit} website(s). You currently have {current}/{limit}."
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
        """Change the user's plan. Only allowed if user is admin, downgrading to free, or has an active Paddle subscription."""
        user_id = self._user_id(user)
        sub = self.get_active_subscription(user)
        is_admin = isinstance(user, dict) and (user.get("is_admin") or user.get("role") in ("admin", "super_admin"))

        if plan != "free" and not sub and not is_admin:
            return {
                "plan": plan,
                "applied": False,
                "error": "CHECKOUT_REQUIRED",
                "message": "An active subscription or checkout is required to activate a paid plan."
            }

        now = datetime.now()
        # If downgrading to free and an active subscription exists, schedule cancellation on Paddle
        if plan == "free" and sub:
            from src.services.paddle_service import PaddleService
            try:
                await PaddleService(db=self.db).cancel_subscription(sub.get("paddle_subscription_id"))
            except Exception:
                pass

        from bson import ObjectId
        u_cond = [{"_id": str(user_id)}, {"email": str(user_id)}]
        try:
            if ObjectId.is_valid(str(user_id)):
                u_cond.append({"_id": ObjectId(str(user_id))})
        except Exception:
            pass
        result = self.db.users.update_one(
            {"$or": u_cond}, {"$set": {"plan": plan, "updated_at": now}}
        )
        self.db.entitlements.update_one(
            {"user_id": str(user_id)},
            {"$set": {"plan": plan, "status": "active", "updated_at": now}}
        )
        changed = result.modified_count > 0
        scheduled = None
        if sub and plan != "free":
            from src.services.paddle_service import PaddleService
            try:
                scheduled = await PaddleService(db=self.db).update_subscription_scheduled_change(
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

    def check_and_process_subscription_lifecycle(self, batch_limit=50):
        """Automated background watchdog for subscription lifecycles, Day-10 reminders, and trial expiration."""
        from src.services.license_slot_service import LicenseSlotService
        from src.services.notification_service import NotificationService
        slot_service = LicenseSlotService(self.db)
        notif_service = NotificationService(self.db)

        users = list(self.db.users.find(
            {"role": {"$ne": "super_admin"}},
            {"_id": 1, "email": 1, "plan": 1, "payment_status": 1, "trial_ends_at": 1, "created_at": 1, "plan_expires": 1, "licensed_website_ids": 1}
        ).limit(batch_limit))

        results = {"reminders_sent": 0, "expirations_handled": 0, "renewals_reminded": 0}

        for user_doc in users:
            try:
                uid_str = str(user_doc["_id"])
                state = slot_service.resolve_user_license_state(user_doc)

                # 1. Day-10 Free Trial Payment Reminder (4 days remaining)
                if state.get("is_trial_active") and state.get("trial_days_remaining") <= 4 and state.get("trial_days_remaining") > 0:
                    days_left = state["trial_days_remaining"]
                    sent = notif_service.notify(
                        uid_str,
                        title=f"Free Trial Notice: {days_left} Days Remaining",
                        message=f"Your 14-day MDefender fleet free trial has {days_left} day(s) remaining. Add your payment method to ensure continuous zero-downtime edge protection.",
                        category="trial_reminder",
                        dedupe_key=f"day10_{uid_str}",
                        cooldown_seconds=86400
                    )
                    if sent:
                        results["reminders_sent"] += 1

                # 2. Trial Expiration Execution
                elif not state.get("is_paid") and state.get("trial_days_remaining", 0) <= 0:
                    current_payment_status = str(user_doc.get("payment_status") or "").lower()
                    if current_payment_status in ("trialing", "trial_active", "none", ""):
                        # Mark user as expired and revoke website protections
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {"payment_status": "trial_expired", "purchased_slots": 0, "licensed_website_ids": []}})

                        # Deactivate website active status
                        self.db.websites.update_many(
                            {"user_id": {"$in": [uid_str, ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str]}},
                            {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False, "updated_at": datetime.now()}}
                        )

                        notif_service.notify(
                            uid_str,
                            title="14-Day Free Trial Concluded: Edge Protection Paused",
                            message="Your 14-day free trial has concluded. Upgrade to an active fleet subscription to reactivate autonomous edge WAF filtering and malware protection.",
                            category="trial_expired",
                            dedupe_key=f"expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1

                # 3. Upcoming Renewal Reminder (within 3 days of expiration)
                elif state.get("is_paid") and user_doc.get("plan_expires"):
                    from src.services.license_slot_service import _normalize_to_utc
                    exp_dt = _normalize_to_utc(user_doc.get("plan_expires"), None)
                    now_utc = datetime.now(timezone.utc)
                    if exp_dt and exp_dt > now_utc:
                        days_to_exp = int(math.ceil((exp_dt - now_utc).total_seconds() / 86400))
                        if 0 < days_to_exp <= 3:
                            sent = notif_service.notify(
                                uid_str,
                                title=f"Upcoming Renewal Notice: {days_to_exp} Days",
                                message=f"Your MDefender subscription will automatically renew in {days_to_exp} day(s). Please verify your payment details remain up to date.",
                                category="subscription_renewal",
                                dedupe_key=f"renewal_{uid_str}_{exp_dt.strftime('%Y%m')}",
                                cooldown_seconds=86400
                            )
                            if sent:
                                results["renewals_reminded"] += 1

            except Exception:
                pass

        return results
