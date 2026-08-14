"""MDefender Pro feature flags.

Flags can be toggled at runtime by admins through the settings collection.
Defaults are conservative: billing + real-time monitoring are gated until
explicitly configured. Consumers should always read flags through here and
show honest status ("ML WAF: Not configured") instead of fake "Active".
"""

from src.database.mongodb_connection import MongoDB

DEFAULT_FLAGS = {
    "ml_waf_enabled": True,
    "wordpress_scanner_enabled": True,
    "technical_dashboard_enabled": True,
    "wordpress_dashboard_enabled": True,
    "paddle_billing_enabled": False,
    "real_time_monitoring_enabled": False,
    "maintenance_mode": False,
    "public_registration": True,
}

DEFAULT_FLAG_NAMES = [
    "ml_waf_enabled",
    "wordpress_scanner_enabled",
    "technical_dashboard_enabled",
    "wordpress_dashboard_enabled",
    "paddle_billing_enabled",
    "real_time_monitoring_enabled",
    "maintenance_mode",
    "public_registration",
]


class FeatureFlagService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def _flags(self):
        try:
            doc = self.db.settings.find_one({"_type": "feature_flags"})
            if doc:
                flags = dict(DEFAULT_FLAGS)
                flags.update(doc.get("flags", {}))
                return flags
        except Exception:
            pass
        return dict(DEFAULT_FLAGS)

    def get_all(self):
        flags = self._flags()
        return {name: flags.get(name, DEFAULT_FLAGS.get(name, False)) for name in DEFAULT_FLAG_NAMES}

    def is_enabled(self, flag):
        return bool(self._flags().get(flag, False))

    def set_flag(self, flag, value):
        if flag not in DEFAULT_FLAG_NAMES:
            return False
        flags = self._flags()
        flags[flag] = bool(value)
        self.db.settings.update_one(
            {"_type": "feature_flags"},
            {"$set": {"flags": flags, "updated_at": __import__("datetime").datetime.now()}},
            upsert=True,
        )
        return True

    def update_many(self, updates):
        flags = self._flags()
        for key, value in updates.items():
            if key in DEFAULT_FLAG_NAMES:
                flags[key] = bool(value)
        self.db.settings.update_one(
            {"_type": "feature_flags"},
            {"$set": {"flags": flags, "updated_at": __import__("datetime").datetime.now()}},
            upsert=True,
        )
