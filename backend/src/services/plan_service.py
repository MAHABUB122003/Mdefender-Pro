"""MDefender Pro plan definitions and limits.

Plans are configurable at runtime: an optional `plans` document in MongoDB
overrides these defaults (see `get_plan`). Never hardcode business rules in
API modules — always resolve through this service.
"""

from src.database.mongodb_connection import MongoDB

DEFAULT_PLANS = {
    "free": {
        "name": "Starter Free",
        "display_name": "Starter",
        "badge": "Free Forever",
        "price_id": "",
        "monthly_price": 0,
        "yearly_price": 0,
        "website_limit": 1,
        "requests_per_day": 10000,
        "scans_per_day": 5,
        "max_scan_size_mb": 2,
        "waf_mode": "basic",
        "ml_waf": False,
        "malware_scanner": True,
        "analytics": False,
        "notifications": False,
        "priority_support": False,
        "team_seats": 1,
    },
    "go": {
        "name": "Developer Go",
        "display_name": "Developer Go",
        "badge": "Growing Apps",
        "price_id": "",
        "monthly_price": 9,
        "yearly_price": 90,
        "website_limit": 5,
        "requests_per_day": 100000,
        "scans_per_day": 50,
        "max_scan_size_mb": 10,
        "waf_mode": "advanced",
        "ml_waf": True,
        "malware_scanner": True,
        "analytics": True,
        "notifications": True,
        "priority_support": False,
        "team_seats": 3,
    },
    "pro": {
        "name": "Enterprise Pro",
        "display_name": "Enterprise Pro",
        "badge": "Most Popular",
        "price_id": "",
        "monthly_price": 29,
        "yearly_price": 290,
        "website_limit": 25,
        "requests_per_day": 1000000,
        "scans_per_day": 200,
        "max_scan_size_mb": 25,
        "waf_mode": "advanced",
        "ml_waf": True,
        "malware_scanner": True,
        "analytics": True,
        "notifications": True,
        "priority_support": True,
        "team_seats": 10,
    },
    "enterprise": {
        "name": "Dedicated Enterprise",
        "display_name": "Enterprise Ultimate",
        "badge": "Maximum Scale",
        "price_id": "",
        "monthly_price": 99,
        "yearly_price": 990,
        "website_limit": 500,
        "requests_per_day": 10000000,
        "scans_per_day": 10000,
        "max_scan_size_mb": 100,
        "waf_mode": "advanced",
        "ml_waf": True,
        "malware_scanner": True,
        "analytics": True,
        "notifications": True,
        "priority_support": True,
        "team_seats": 100,
    },
}

PLAN_KEYS = [
    "name",
    "display_name",
    "badge",
    "price_id",
    "monthly_price",
    "yearly_price",
    "website_limit",
    "requests_per_day",
    "scans_per_day",
    "max_scan_size_mb",
    "waf_mode",
    "ml_waf",
    "malware_scanner",
    "analytics",
    "notifications",
    "priority_support",
    "team_seats",
]


class PlanService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def get_plan(self, plan_id):
        """Resolve a plan config. DB override wins; falls back to defaults."""
        plan_id = (plan_id or "free").lower()
        if plan_key_alias := {"premium": "pro", "business": "go"}.get(plan_id):
            plan_id = plan_key_alias
        stored = {}
        try:
            doc = self.db.settings.find_one({"_type": "plans"})
            if doc:
                stored = doc.get("plans", {})
        except Exception:
            stored = {}
        config = dict(DEFAULT_PLANS.get(plan_id, DEFAULT_PLANS["free"]))
        if plan_id in stored and isinstance(stored[plan_id], dict):
            config.update(stored[plan_id])
        config["id"] = plan_id
        return config

    def all_plans(self):
        """Return ordered list of plans with id + name + limits + pricing."""
        result = []
        stored = {}
        try:
            doc = self.db.settings.find_one({"_type": "plans"})
            if doc:
                stored = doc.get("plans", {})
        except Exception:
            stored = {}
        for pid in ["free", "go", "pro", "enterprise"]:
            config = dict(DEFAULT_PLANS.get(pid, {}))
            if pid in stored and isinstance(stored[pid], dict):
                config.update(stored[pid])
            config["id"] = pid
            result.append(config)
        return result

    def save_plans(self, plans):
        """Admin override of plan limits and pricing (stored in settings)."""
        sanitized = {}
        for pid in ["free", "go", "pro", "enterprise"]:
            raw = plans.get(pid, {})
            cleaned = {}
            for key in PLAN_KEYS:
                if key in raw:
                    cleaned[key] = raw[key]
            sanitized[pid] = cleaned
        try:
            self.db.settings.update_one(
                {"_type": "plans"},
                {"$set": {"plans": sanitized, "updated_at": __import__("datetime").datetime.now()}},
                upsert=True,
            )
            return True
        except Exception:
            return False
