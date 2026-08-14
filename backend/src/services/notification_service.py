"""MDefender Pro notification service.

Channels: dashboard + email + webhook (per-user preferences).
Security notifications: critical attack, malware detected, website
disconnected, API key revoked, subscription expired, scan completed, etc.
"""

from datetime import datetime
from bson import ObjectId

from src.database.mongodb_connection import MongoDB

DEFAULT_PREFERENCES = {
    "email": True,
    "dashboard": True,
    "webhook": False,
    "webhook_url": "",
    "critical_attack": True,
    "malware_detected": True,
    "website_disconnected": True,
    "api_key_revoked": True,
    "subscription_expired": True,
    "scan_completed": False,
    "config_issue": True,
}

SEVERITY = {
    "critical_attack": "critical",
    "malware_detected": "critical",
    "website_disconnected": "warning",
    "api_key_revoked": "warning",
    "subscription_expired": "warning",
    "scan_completed": "info",
    "config_issue": "critical",
}


class NotificationService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def _ensure_indexes(self):
        try:
            self.db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        except Exception:
            pass

    def get_preferences(self, user_id):
        doc = self.db.settings.find_one({"_type": "notification_prefs", "user_id": str(user_id)})
        prefs = dict(DEFAULT_PREFERENCES)
        if doc:
            prefs.update(doc.get("prefs", {}))
        return prefs

    def save_preferences(self, user_id, prefs):
        cleaned = {}
        for key in DEFAULT_PREFERENCES:
            if key in prefs:
                cleaned[key] = prefs[key]
        self.db.settings.update_one(
            {"_type": "notification_prefs", "user_id": str(user_id)},
            {"$set": {"prefs": cleaned, "updated_at": datetime.now()}},
            upsert=True,
        )
        return cleaned

    def notify(self, user_id, title, message, category="general", data=None, website_id=None):
        """Create a dashboard notification if the user's prefs allow it."""
        user_id = str(user_id)
        prefs = self.get_preferences(user_id)
        if category in prefs and not prefs.get(category):
            return False
        if not prefs.get("dashboard", True):
            return False
        notification = {
            "user_id": user_id,
            "website_id": website_id,
            "title": title,
            "message": message,
            "category": category,
            "severity": SEVERITY.get(category, "info"),
            "data": data or {},
            "read": False,
            "created_at": datetime.now(),
        }
        try:
            self.db.notifications.insert_one(notification)
        except Exception:
            return False
        if prefs.get("webhook") and prefs.get("webhook_url"):
            self._send_webhook(prefs["webhook_url"], notification)
        return True

    def _send_webhook(self, url, notification):
        try:
            import httpx
            payload = {
                "event": "notification",
                "type": notification["category"],
                "title": notification["title"],
                "message": notification["message"],
                "severity": notification["severity"],
                "website_id": notification.get("website_id"),
                "timestamp": notification["created_at"].isoformat(),
            }
            httpx.post(url, json=payload, timeout=5)
        except Exception:
            pass

    def list(self, user_id, limit=50, unread_only=False):
        query = {"user_id": str(user_id)}
        if unread_only:
            query["read"] = False
        items = list(self.db.notifications.find(query).sort("created_at", -1).limit(int(limit)))
        return [
            {
                "id": str(n["_id"]),
                "title": n.get("title"),
                "message": n.get("message"),
                "category": n.get("category"),
                "severity": n.get("severity"),
                "read": n.get("read", False),
                "website_id": n.get("website_id"),
                "created_at": n.get("created_at").isoformat() if n.get("created_at") else None,
            }
            for n in items
        ]

    def unread_count(self, user_id):
        try:
            return self.db.notifications.count_documents({"user_id": str(user_id), "read": False})
        except Exception:
            return 0

    def mark_read(self, user_id, notification_id=None, all_read=False):
        user_id = str(user_id)
        if all_read:
            return self.db.notifications.update_many({"user_id": user_id}, {"$set": {"read": True}})
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None
        return self.db.notifications.update_one(
            {"_id": oid, "user_id": user_id}, {"$set": {"read": True}}
        )

    def delete(self, user_id, notification_id):
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None
        return self.db.notifications.delete_one({"_id": oid, "user_id": str(user_id)})
