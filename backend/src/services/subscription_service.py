"""MDefender Pro subscription + entitlement service.

Two independent concepts that must never be conflated:

1. Paddle-managed subscription  (source: Paddle webhooks / API)
2. Admin-granted entitlement     (source: admin panel)

Effective entitlement for a user:
    admin grant (if active) > paddle subscription (if active) > plan defaults

Webhook events update the Paddle subscription record. Admin actions update the
entitlement record. The plan limits themselves live in the PlanService.
"""

import math
import secrets
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from src.database.mongodb_connection import MongoDB
from src.services.plan_service import PlanService
from src.utils.api_response import parse_object_id
from src.services.license_slot_service import _normalize_to_utc


class SubscriptionService:
    def __init__(self, db=None):
        self.db = db or MongoDB()
        self.plan_service = PlanService(self.db)
        self._ensure_indexes()

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

    def _deduplicate_paddle_transactions(self):
        try:
            pipeline = [
                {"$match": {"transaction_id": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$transaction_id", "ids": {"$push": "$_id"}, "count": {"$sum": 1}}},
                {"$match": {"count": {"$gt": 1}}}
            ]
            dups = list(self.db.paddle_transactions.aggregate(pipeline))
            for item in dups:
                ids_to_del = item["ids"][1:]
                self.db.paddle_transactions.delete_many({"_id": {"$in": ids_to_del}})
        except Exception:
            pass

    def _ensure_indexes(self):
        self._deduplicate_paddle_transactions()
        index_specs = [
            (self.db.subscriptions, "user_id", {}),
            (self.db.subscriptions, "paddle_subscription_id", {"unique": True, "sparse": True}),
            (self.db.entitlements, "user_id", {"unique": True}),
            (self.db.paddle_events, "event_id", {"unique": True, "sparse": True}),
            (self.db.paddle_transactions, "transaction_id", {"unique": True, "sparse": True}),
            (self.db.paddle_transactions, "user_id", {}),
            (self.db.paddle_transactions, "customer_email", {}),
        ]
        for coll, field, kwargs in index_specs:
            try:
                coll.create_index(field, **kwargs)
            except Exception:
                pass

    # ---------- Paddle subscription records ----------

    def upsert_paddle_subscription(self, user_id, event):
        """Create or update the paddle-managed subscription record from a webhook event.
        Guarantees strict synchronization across db.subscriptions, db.users, and fleet slots.
        """
        data = event.get("data", {})
        subscription_id = event.get("subscription_id") or data.get("id")
        status = str(event.get("status") or data.get("status") or "").lower()
        custom = data.get("custom_data") or event.get("custom_data") or {}
        plan = custom.get("plan") or custom.get("plan_id") or "pro"

        # Billing periods & renewal timestamps
        billing_period = data.get("current_billing_period") or {}
        starts_at_raw = billing_period.get("starts_at") or data.get("started_at")
        ends_at_raw = billing_period.get("ends_at") or data.get("next_billed_at")
        next_billed_raw = data.get("next_billed_at") or ends_at_raw

        from src.services.license_slot_service import _normalize_to_utc
        now_utc = datetime.now(timezone.utc)
        period_start = _normalize_to_utc(starts_at_raw, now_utc)
        period_end = _normalize_to_utc(ends_at_raw, now_utc + timedelta(days=30))
        next_billed_at = _normalize_to_utc(next_billed_raw, period_end)

        # Quantity / Site slots
        items = data.get("items") or []
        first_item = items[0] if items and isinstance(items[0], dict) else {}
        item_qty = first_item.get("quantity")
        sites_count = int(custom.get("sites_count") or custom.get("quantity") or item_qty or 1)

        # Billing cycle
        cycle_raw = str(custom.get("billing_cycle") or (data.get("billing_cycle") or {}).get("interval") or "month").lower()
        is_yearly = cycle_raw in ("yearly", "annual", "annually", "year")
        billing_cycle = "yearly" if is_yearly else "monthly"

        # Scheduled change / Cancellation
        scheduled_change = data.get("scheduled_change")
        cancel_at_period_end = bool(
            (scheduled_change and scheduled_change.get("action") == "cancel") or
            status in ("canceled", "cancelled")
        )

        record = {
            "user_id": str(user_id),
            "paddle_subscription_id": subscription_id,
            "customer_id": event.get("customer_id") or data.get("customer_id"),
            "status": status,
            "plan": plan,
            "purchased_slots": sites_count,
            "billing_cycle": billing_cycle,
            "current_period_start": period_start,
            "current_period_end": period_end,
            "next_billed_at": next_billed_at,
            "cancel_at_period_end": cancel_at_period_end,
            "auto_renew": not cancel_at_period_end,
            "source": "paddle",
            "updated_at": now_utc,
            "event_type": event.get("event_type"),
            "scheduled_change": scheduled_change,
            "raw": {k: v for k, v in data.items() if k in (
                "billing_cycle", "current_billing_period", "items", "started_at",
                "next_billed_at", "paused_at", "canceled_at",
            )},
        }
        if status in ("canceled", "paused"):
            record["ended_at"] = now_utc

        query = {}
        if subscription_id:
            query["paddle_subscription_id"] = subscription_id
        if not query:
            query["user_id"] = str(user_id)
        try:
            self.db.subscriptions.update_one(query, {"$set": record}, upsert=True)
        except Exception:
            self.db.subscriptions.update_one(
                {"user_id": str(user_id), "paddle_subscription_id": subscription_id},
                {"$set": record},
                upsert=True,
            )

        # Synchronize plan & status directly to the users collection
        try:
            user_query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(str(user_id)) else {"_id": str(user_id)}
            if status in ("active", "trialing"):
                self.db.users.update_one(
                    user_query,
                    {"$set": {
                        "plan": plan,
                        "plan_tier": plan,
                        "payment_status": "active",
                        "purchased_slots": sites_count,
                        "billing_cycle": billing_cycle,
                        "paddle_subscription_id": subscription_id,
                        "paddle_customer_id": record["customer_id"],
                        "last_payment_date": now_utc,
                        "plan_expires": period_end,
                        "cancel_at_period_end": cancel_at_period_end,
                        "auto_renew": not cancel_at_period_end,
                        "updated_at": now_utc
                    }}
                )
                # Reconcile license allocations for immediate fleet protection
                from src.services.license_slot_service import LicenseSlotService
                LicenseSlotService(self.db).get_slots_summary(user_id)

            elif status in ("canceled", "cancelled"):
                if period_end and period_end > now_utc:
                    # User cancelled auto-renew, but still holds active protection until prepaid period end!
                    self.db.users.update_one(user_query, {"$set": {
                        "auto_renew": False,
                        "cancel_at_period_end": True,
                        "plan_expires": period_end,
                        "updated_at": now_utc
                    }})
                else:
                    # Period has concluded -> safely pause protection
                    self.db.users.update_one(user_query, {"$set": {
                        "payment_status": "expired",
                        "auto_renew": False,
                        "cancel_at_period_end": True,
                        "purchased_slots": 0,
                        "licensed_website_ids": [],
                        "updated_at": now_utc
                    }})
                    self.db.websites.update_many(
                        {"user_id": {"$in": [str(user_id), ObjectId(user_id) if ObjectId.is_valid(str(user_id)) else str(user_id)]}},
                        {"$set": {"is_licensed": False, "license_status": "expired", "protection_paused": True, "updated_at": now_utc}}
                    )

            elif status in ("past_due", "paused"):
                self.db.users.update_one(user_query, {"$set": {
                    "payment_status": status,
                    "updated_at": now_utc
                }})
        except Exception:
            pass

    def record_transaction(self, user_id, event):
        """Record a completed, failed, or refunded Paddle transaction."""
        data = event.get("data", {})
        status = str(data.get("status") or event.get("status") or "").lower()
        details = data.get("details") or {}
        totals = details.get("totals") or data.get("totals") or {}
        total_amount = totals.get("total")
        curr_code = data.get("currency_code") or "USD"
        if isinstance(curr_code, dict):
            curr_code = "USD"

        now_utc = datetime.now(timezone.utc)
        txn_id = data.get("id") or event.get("transaction_id")

        rec = {
            "user_id": str(user_id),
            "transaction_id": txn_id,
            "paddle_transaction_id": txn_id,
            "status": status,
            "event_type": event.get("event_type"),
            "occurred_at": event.get("occurred_at"),
            "amount": total_amount,
            "currency_code": curr_code,
            "billed_at": data.get("billed_at") or data.get("created_at"),
            "created_at": now_utc,
            "updated_at": now_utc,
            "receipt_url": data.get("receipt_url") or (f"https://sandbox-receipts.paddle.com/{txn_id}" if txn_id else "#")
        }

        # Idempotent upsert on transaction_id with anti-race deduplication
        if txn_id:
            try:
                # Deduplicate any concurrent race entries
                existing = list(self.db.paddle_transactions.find({"transaction_id": txn_id}))
                if len(existing) > 1:
                    ids_to_del = [doc["_id"] for doc in existing[1:]]
                    self.db.paddle_transactions.delete_many({"_id": {"$in": ids_to_del}})

                self.db.paddle_transactions.update_one(
                    {"transaction_id": txn_id},
                    {"$set": rec},
                    upsert=True
                )
            except Exception:
                try:
                    self.db.paddle_transactions.update_one(
                        {"transaction_id": txn_id},
                        {"$set": rec}
                    )
                except Exception:
                    pass
        else:
            try:
                self.db.paddle_transactions.insert_one(rec)
            except Exception:
                pass

        # Real-time automated fulfillment on completed transaction
        if status in ("paid", "completed", "billed"):
            try:
                u_id = ObjectId(user_id) if ObjectId.is_valid(str(user_id)) else str(user_id)
                custom = data.get("custom_data") or event.get("custom_data") or {}
                plan = custom.get("plan") or "pro"
                cycle = str(custom.get("billing_cycle") or "monthly").lower()
                is_yearly = cycle in ("yearly", "annual", "annually")
                duration = 365 if is_yearly else 30
                sites = int(custom.get("sites_count") or custom.get("quantity") or 1)

                # Software License Extension: If current license is still active, extend seamlessly!
                current_user = self.db.users.find_one({"_id": u_id}) or {}
                current_exp = _normalize_to_utc(current_user.get("plan_expires"), None)
                if current_exp and current_exp > now_utc:
                    new_expires = current_exp + timedelta(days=duration)
                else:
                    new_expires = now_utc + timedelta(days=duration)

                self.db.users.update_one(
                    {"_id": u_id},
                    {"$set": {
                        "plan": plan,
                        "plan_tier": plan,
                        "is_paid": True,
                        "payment_status": "active",
                        "purchased_slots": sites,
                        "billing_cycle": "yearly" if is_yearly else "monthly",
                        "auto_renew": False,
                        "cancel_at_period_end": False,
                        "last_payment_date": now_utc,
                        "plan_expires": new_expires,
                        "updated_at": now_utc
                    }}
                )

                # Reconcile license slots for immediate fleet protection
                from src.services.license_slot_service import LicenseSlotService
                LicenseSlotService(self.db).get_slots_summary(user_id)

                # In-app confirmation notification
                from src.services.notification_service import NotificationService
                formatted_amt = f"${int(total_amount)/100:.2f}" if total_amount else f"${36 if sites==10 else sites*4:.2f}"
                NotificationService(self.db).notify(
                    str(user_id),
                    title="Payment Confirmed",
                    message=f"Thank you! Your payment of {formatted_amt} {curr_code} was successful. {sites} website license slot(s) are active.",
                    category="billing"
                )
            except Exception:
                pass

        elif status in ("refunded", "partially_refunded"):
            try:
                u_id = ObjectId(user_id) if ObjectId.is_valid(str(user_id)) else str(user_id)
                self.db.users.update_one(
                    {"_id": u_id},
                    {"$set": {
                        "payment_status": "refunded",
                        "purchased_slots": 0,
                        "licensed_website_ids": [],
                        "updated_at": now_utc
                    }}
                )
                self.db.websites.update_many(
                    {"user_id": {"$in": [str(user_id), u_id]}},
                    {"$set": {"is_licensed": False, "license_status": "refunded", "protection_paused": True, "updated_at": now_utc}}
                )
                from src.services.notification_service import NotificationService
                NotificationService(self.db).notify(
                    str(user_id),
                    title="Subscription Refund Processed",
                    message="Your payment has been refunded. Protection slots have been safely paused.",
                    category="billing"
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
        from src.services.plan_service import PlanService
        slot_service = LicenseSlotService(self.db)
        notif_service = NotificationService(self.db)
        dyn_pricing = PlanService(self.db).get_dynamic_pricing_config() or {}
        total_trial = int(dyn_pricing.get("trial_days") or 14)
        reminder_window = min(10, max(3, int(math.ceil(total_trial * 0.25))))

        users = list(self.db.users.find(
            {"role": {"$ne": "super_admin"}}
        ).limit(batch_limit))

        results = {"reminders_sent": 0, "expirations_handled": 0, "renewals_reminded": 0}

        for user_doc in users:
            try:
                uid_str = str(user_doc["_id"])
                target_uids = [uid_str]
                if ObjectId.is_valid(uid_str):
                    target_uids.append(ObjectId(uid_str))

                state = slot_service.resolve_user_license_state(user_doc)
                current_plan = str(user_doc.get("plan") or "free").lower()
                current_payment_status = str(user_doc.get("payment_status") or "").lower()

                from src.services.license_slot_service import _normalize_to_utc
                now_utc = datetime.now(timezone.utc)
                exp_dt = _normalize_to_utc(user_doc.get("plan_expires"), None)

                # Check active or canceled subscription in db.subscriptions
                latest_sub = self.db.subscriptions.find_one(
                    {"user_id": {"$in": target_uids}},
                    sort=[("created_at", -1)]
                )
                sub_end = _normalize_to_utc(latest_sub.get("current_period_end"), None) if latest_sub else None
                sub_status = str(latest_sub.get("status") or "").lower() if latest_sub else ""

                effective_exp_dt = exp_dt or sub_end

                is_sub_expired = False
                if latest_sub:
                    if sub_status in ("canceled", "cancelled", "expired", "past_due") and (not sub_end or sub_end <= now_utc):
                        is_sub_expired = True
                    elif effective_exp_dt and effective_exp_dt <= now_utc and sub_status not in ("active", "trialing"):
                        is_sub_expired = True
                    elif effective_exp_dt and effective_exp_dt <= now_utc and bool(latest_sub.get("cancel_at_period_end")):
                        is_sub_expired = True
                elif exp_dt and exp_dt <= now_utc:
                    is_sub_expired = True

                # 1. Paid Subscription Expiration Check (Safe pause on expiry, zero debt)
                if is_sub_expired and (current_plan != "free" or current_payment_status == "active"):
                    if current_payment_status != "expired":
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {
                            "payment_status": "expired",
                            "purchased_slots": 0,
                            "licensed_website_ids": [],
                            "updated_at": datetime.now()
                        }})

                        # Pause protection on user websites safely (no deletion)
                        self.db.websites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"is_licensed": False, "license_status": "expired", "protection_paused": True, "updated_at": datetime.now()}}
                        )
                        self.db.wordpress_sites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"status": "unlicensed", "license_status": "expired", "is_licensed": False}}
                        )
                        try:
                            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                            push_instant_sync_to_wordpress(user_id=uid_str)
                        except Exception:
                            pass

                        notif_service.notify(
                            uid_str,
                            title="Subscription Concluded: Fleet Protection Paused",
                            message="Your prepaid subscription period has concluded. Protection is safely paused with zero data loss. Renew anytime to immediately restore full Layer-7 WAF protection.",
                            category="subscription_expired",
                            dedupe_key=f"paid_expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1
                        continue

                # 2. Upcoming Renewal Reminder (within 3 days of expiration)
                if effective_exp_dt and effective_exp_dt > now_utc and current_plan != "free":
                    days_to_exp = int(math.ceil((effective_exp_dt - now_utc).total_seconds() / 86400))
                    if 0 < days_to_exp <= 3:
                        sent = notif_service.notify(
                            uid_str,
                            title=f"Upcoming Renewal Notice: {days_to_exp} Days",
                            message=f"Your MDefender subscription will renew in {days_to_exp} day(s). Verify your payment details remain active.",
                            category="subscription_renewal",
                            dedupe_key=f"renewal_{uid_str}_{effective_exp_dt.strftime('%Y%m')}",
                            cooldown_seconds=86400
                        )
                        if sent:
                            results["renewals_reminded"] += 1

                # 3. Dynamic Free Trial Payment Reminder
                if state.get("is_trial_active") and state.get("trial_days_remaining") <= reminder_window and state.get("trial_days_remaining") > 0:
                    days_left = state["trial_days_remaining"]
                    sent = notif_service.notify(
                        uid_str,
                        title=f"Free Trial Notice: {days_left} Days Remaining",
                        message=f"Your {total_trial}-day MDefender fleet free trial has {days_left} day(s) remaining. Add your payment method to ensure continuous zero-downtime edge protection.",
                        category="trial_reminder",
                        dedupe_key=f"trial_remind_{uid_str}",
                        cooldown_seconds=86400
                    )
                    if sent:
                        results["reminders_sent"] += 1

                # 4. Trial Expiration Execution
                elif not state.get("is_paid") and state.get("trial_days_remaining", 0) <= 0 and current_plan == "free":
                    if current_payment_status in ("trialing", "trial_active", "none", ""):
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {"payment_status": "trial_expired", "purchased_slots": 0, "licensed_website_ids": []}})

                        self.db.websites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False, "updated_at": datetime.now()}}
                        )
                        self.db.wordpress_sites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"status": "unlicensed", "license_status": "trial_expired", "is_licensed": False}}
                        )
                        try:
                            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                            push_instant_sync_to_wordpress(user_id=uid_str)
                        except Exception:
                            pass

                        notif_service.notify(
                            uid_str,
                            title="14-Day Free Trial Concluded: Edge Protection Paused",
                            message="Your 14-day free trial has concluded. Upgrade to an active fleet subscription to reactivate autonomous edge WAF filtering and malware protection.",
                            category="trial_expired",
                            dedupe_key=f"expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1
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
        from bson import ObjectId
        from src.services.plan_service import PlanService

        user_id = self._user_id(user)
        u_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        user_doc = self.db.users.find_one({"_id": u_oid}) or (user if isinstance(user, dict) else {})

        ent = self.get_entitlement(user_id)
        sub = self.db.subscriptions.find_one({"user_id": user_id})
        
        # Aggregate transactions from paddle_transactions and payments with fallback
        q_user = {"$or": [{"user_id": user_id}, {"user_id": u_oid}]}
        if user_doc.get("email"):
            q_user["$or"].append({"customer_email": user_doc["email"]})
            q_user["$or"].append({"email": user_doc["email"]})

        transactions = list(self.db.paddle_transactions.find(q_user).sort("created_at", -1).limit(50))
        if not transactions:
            transactions = list(self.db.payments.find(q_user).sort("created_at", -1).limit(50))

        # Format transactions cleanly with strict deduplication
        formatted_txns = []
        seen_txns = set()
        for t in transactions:
            tid = t.get("transaction_id") or t.get("invoice_id") or f"TXN-{str(t.get('_id', ''))[-8:]}"
            if tid and tid in seen_txns:
                continue
            if tid:
                seen_txns.add(tid)

            raw_amt = t.get("amount")
            # Paddle stores amounts in cents in raw details, or dollars in payments
            if raw_amt is not None:
                try:
                    f_amt = float(raw_amt)
                    amt_str = f"{f_amt / 100.0:.2f}" if f_amt >= 100 else f"{f_amt:.2f}"
                except Exception:
                    amt_str = str(raw_amt)
            else:
                amt_str = "36.00"

            billed_date = t.get("created_at") or t.get("billed_at")
            if hasattr(billed_date, "isoformat"):
                billed_date = billed_date.isoformat()

            formatted_txns.append({
                "_id": str(t.get("_id", "")),
                "id": tid,
                "transaction_id": tid,
                "status": t.get("status", "completed"),
                "amount": amt_str,
                "currency_code": t.get("currency_code") or "USD",
                "billed_at": billed_date,
                "created_at": billed_date,
                "receipt_url": t.get("receipt_url") or t.get("invoice_url") or t.get("invoice_pdf") or "#",
            })

        plan_id = user_doc.get("plan") or self.effective_plan(user)
        slots = int(user_doc.get("purchased_slots") or user_doc.get("website_slots") or (10 if plan_id != "free" else 1))
        cycle = user_doc.get("billing_cycle", "monthly")
        is_paid = (plan_id != "free" and user_doc.get("payment_status") == "active")
        auto_renew = False if (user_doc.get("cancel_at_period_end") or user_doc.get("auto_renew") is False) else True

        fleet_calc = PlanService(self.db).calculate_fleet_pricing(slots, cycle)

        exp_dt = user_doc.get("plan_expires")
        exp_str = exp_dt.isoformat() if hasattr(exp_dt, "isoformat") else str(exp_dt) if exp_dt else None

        return {
            "current_plan": plan_id,
            "plan_name": "MDefender Pro Security Fleet" if plan_id != "free" else "Starter Free Trial",
            "payment_status": user_doc.get("payment_status", "trialing"),
            "is_paid": is_paid,
            "purchased_slots": slots,
            "allocated_slots": slots,
            "billing_cycle": cycle,
            "auto_renew": auto_renew,
            "cancel_at_period_end": bool(user_doc.get("cancel_at_period_end", False)),
            "plan_expires": exp_str,
            "fleet_pricing": fleet_calc,
            "current_rate": fleet_calc["final_total"],
            "unit_price": fleet_calc["unit_price"],
            "tier_label": fleet_calc["tier_label"],
            "entitlement_source": ent.get("status") if ent else None,
            "subscription": {
                "status": sub.get("status") if sub else ("active" if is_paid else None),
                "paddle_id": sub.get("paddle_subscription_id") if sub else None,
                "next_billed_at": sub.get("raw", {}).get("next_billed_at") if sub else exp_str,
                "auto_renew": auto_renew,
            } if (sub or is_paid) else None,
            "admin_entitlement": {
                "plan": ent.get("plan") if ent else None,
                "status": ent.get("status") if ent else None,
                "expires_at": ent.get("expires_at").isoformat() if ent and ent.get("expires_at") else None,
            } if ent else None,
            "transactions": formatted_txns,
            "payments": formatted_txns,
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
        from src.services.plan_service import PlanService
        slot_service = LicenseSlotService(self.db)
        notif_service = NotificationService(self.db)
        dyn_pricing = PlanService(self.db).get_dynamic_pricing_config() or {}
        total_trial = int(dyn_pricing.get("trial_days") or 14)
        reminder_window = min(10, max(3, int(math.ceil(total_trial * 0.25))))

        users = list(self.db.users.find(
            {"role": {"$ne": "super_admin"}}
        ).limit(batch_limit))

        results = {"reminders_sent": 0, "expirations_handled": 0, "renewals_reminded": 0}

        for user_doc in users:
            try:
                uid_str = str(user_doc["_id"])
                target_uids = [uid_str]
                if ObjectId.is_valid(uid_str):
                    target_uids.append(ObjectId(uid_str))

                state = slot_service.resolve_user_license_state(user_doc)
                current_plan = str(user_doc.get("plan") or "free").lower()
                current_payment_status = str(user_doc.get("payment_status") or "").lower()

                from src.services.license_slot_service import _normalize_to_utc
                now_utc = datetime.now(timezone.utc)
                exp_dt = _normalize_to_utc(user_doc.get("plan_expires"), None)

                # Check active or canceled subscription in db.subscriptions
                latest_sub = self.db.subscriptions.find_one(
                    {"user_id": {"$in": target_uids}},
                    sort=[("created_at", -1)]
                )
                sub_end = _normalize_to_utc(latest_sub.get("current_period_end"), None) if latest_sub else None
                sub_status = str(latest_sub.get("status") or "").lower() if latest_sub else ""

                effective_exp_dt = exp_dt or sub_end

                is_sub_expired = False
                if latest_sub:
                    if sub_status in ("canceled", "cancelled", "expired", "past_due") and (not sub_end or sub_end <= now_utc):
                        is_sub_expired = True
                    elif effective_exp_dt and effective_exp_dt <= now_utc and sub_status not in ("active", "trialing"):
                        is_sub_expired = True
                    elif effective_exp_dt and effective_exp_dt <= now_utc and bool(latest_sub.get("cancel_at_period_end")):
                        is_sub_expired = True
                elif exp_dt and exp_dt <= now_utc:
                    is_sub_expired = True

                # 1. Paid Subscription Expiration Check (Safe pause on expiry, zero debt)
                if is_sub_expired and (current_plan != "free" or current_payment_status == "active"):
                    if current_payment_status != "expired":
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {
                            "payment_status": "expired",
                            "purchased_slots": 0,
                            "licensed_website_ids": [],
                            "updated_at": datetime.now()
                        }})

                        # Pause protection on user websites safely (no deletion)
                        self.db.websites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"is_licensed": False, "license_status": "expired", "protection_paused": True, "updated_at": datetime.now()}}
                        )
                        self.db.wordpress_sites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"status": "unlicensed", "license_status": "expired", "is_licensed": False}}
                        )
                        try:
                            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                            push_instant_sync_to_wordpress(user_id=uid_str)
                        except Exception:
                            pass

                        notif_service.notify(
                            uid_str,
                            title="Subscription Concluded: Fleet Protection Paused",
                            message="Your prepaid subscription period has concluded. Protection is safely paused with zero data loss. Renew anytime to immediately restore full Layer-7 WAF protection.",
                            category="subscription_expired",
                            dedupe_key=f"paid_expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1
                        continue

                # 2. Upcoming Renewal Reminder (within 3 days of expiration)
                if effective_exp_dt and effective_exp_dt > now_utc and current_plan != "free":
                    days_to_exp = int(math.ceil((effective_exp_dt - now_utc).total_seconds() / 86400))
                    if 0 < days_to_exp <= 3:
                        sent = notif_service.notify(
                            uid_str,
                            title=f"Upcoming Renewal Notice: {days_to_exp} Days",
                            message=f"Your MDefender subscription will renew in {days_to_exp} day(s). Verify your payment details remain active.",
                            category="subscription_renewal",
                            dedupe_key=f"renewal_{uid_str}_{effective_exp_dt.strftime('%Y%m')}",
                            cooldown_seconds=86400
                        )
                        if sent:
                            results["renewals_reminded"] += 1

                # 3. Dynamic Free Trial Payment Reminder
                if state.get("is_trial_active") and state.get("trial_days_remaining") <= reminder_window and state.get("trial_days_remaining") > 0:
                    days_left = state["trial_days_remaining"]
                    sent = notif_service.notify(
                        uid_str,
                        title=f"Free Trial Notice: {days_left} Days Remaining",
                        message=f"Your {total_trial}-day MDefender fleet free trial has {days_left} day(s) remaining. Add your payment method to ensure continuous zero-downtime edge protection.",
                        category="trial_reminder",
                        dedupe_key=f"trial_remind_{uid_str}",
                        cooldown_seconds=86400
                    )
                    if sent:
                        results["reminders_sent"] += 1

                # 4. Trial Expiration Execution
                elif not state.get("is_paid") and state.get("trial_days_remaining", 0) <= 0 and current_plan == "free":
                    if current_payment_status in ("trialing", "trial_active", "none", ""):
                        u_query = {"_id": ObjectId(uid_str)} if ObjectId.is_valid(uid_str) else {"_id": uid_str}
                        self.db.users.update_one(u_query, {"$set": {"payment_status": "trial_expired", "purchased_slots": 0, "licensed_website_ids": []}})

                        self.db.websites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"is_licensed": False, "license_status": "trial_expired", "is_protected": False, "updated_at": datetime.now()}}
                        )
                        self.db.wordpress_sites.update_many(
                            {"user_id": {"$in": target_uids}},
                            {"$set": {"status": "unlicensed", "license_status": "trial_expired", "is_licensed": False}}
                        )
                        try:
                            from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                            push_instant_sync_to_wordpress(user_id=uid_str)
                        except Exception:
                            pass

                        notif_service.notify(
                            uid_str,
                            title="14-Day Free Trial Concluded: Edge Protection Paused",
                            message="Your 14-day free trial has concluded. Upgrade to an active fleet subscription to reactivate autonomous edge WAF filtering and malware protection.",
                            category="trial_expired",
                            dedupe_key=f"expired_{uid_str}",
                            cooldown_seconds=86400
                        )
                        results["expirations_handled"] += 1
            except Exception:
                pass

        return results


