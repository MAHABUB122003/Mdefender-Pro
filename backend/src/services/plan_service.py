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
        "badge": "14-Day Free Trial",
        "price_id": "",
        "price_id_monthly": "",
        "price_id_yearly": "",
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
        "price_id_monthly": "",
        "price_id_yearly": "",
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
        "price_id_monthly": "",
        "price_id_yearly": "",
        "monthly_price": 20,
        "yearly_price": 190,
        "website_limit": 10,
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
        "name": "Business & Agency",
        "display_name": "Business & Agency",
        "badge": "Agency & Scale",
        "price_id": "",
        "price_id_monthly": "",
        "price_id_yearly": "",
        "monthly_price": 49,
        "yearly_price": 470,
        "website_limit": 20,
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

PLAN_LIMITS = DEFAULT_PLANS

PLAN_KEYS = [
    "name",
    "display_name",
    "badge",
    "price_id",
    "price_id_monthly",
    "price_id_yearly",
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

DEFAULT_DYNAMIC_PRICING = {
    "base_monthly_rate": 4.0,
    "base_yearly_rate": 40.0,
    "currency": "USD",
    "currency_symbol": "$",
    "trial_days": 14,
    "price_id_monthly": "",
    "price_id_yearly": "",
    "bulk_tiers": [
        {"min_sites": 1, "max_sites": 9, "discount_percent": 0, "label": "Starter Fleet"},
        {"min_sites": 10, "max_sites": 24, "discount_percent": 10, "label": "Growth Agency"},
        {"min_sites": 25, "max_sites": 49, "discount_percent": 15, "label": "Scale Partner"},
        {"min_sites": 50, "max_sites": 500, "discount_percent": 25, "label": "Enterprise MSP"}
    ],
    "features_included": [
        "Sub-millisecond (<0.12ms) Edge WAF Inspection",
        "AST Heuristics + Machine Learning Threat Classifier",
        "5.32M+ Checksum Malware Scanner (SQLite B-Tree)",
        "Layer-7 DDoS Mitigation & Anti-Bot PoW Challenge",
        "1-Click Post-Hack Disinfection & Salts Rotation",
        "Zero-Day Real-Time Virtual Patching Engine",
        "WordPress RASP Lockdown & Stealth Gateway",
        "Centralized Multi-Site Fleet Safe Updates",
        "Automated White-Label PDF Audit Reports",
        "24/7 Priority Emergency Security Response SLA"
    ]
}


class PlanService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def get_price_id(self, plan_id, billing_cycle="monthly"):
        """Get the specific Paddle price ID for a plan and billing cycle."""
        plan = self.get_plan(plan_id)
        is_yearly = str(billing_cycle or "").lower() in ("yearly", "annually", "annual")
        if is_yearly:
            return plan.get("price_id_yearly") or plan.get("price_id") or ""
        return plan.get("price_id_monthly") or plan.get("price_id") or ""

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

        # Read environment variable fallbacks if not explicitly overridden in DB
        import os
        env_m = os.getenv(f"PADDLE_PRICE_{plan_id.upper()}_MONTHLY", "").strip()
        env_y = os.getenv(f"PADDLE_PRICE_{plan_id.upper()}_YEARLY", "").strip()
        if env_m and not config.get("price_id_monthly"):
            config["price_id_monthly"] = env_m
        if env_y and not config.get("price_id_yearly"):
            config["price_id_yearly"] = env_y

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
            result.append(self.get_plan(pid))
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

    def get_dynamic_pricing_config(self):
        """Resolve dynamic per-site pricing configuration. DB override wins; falls back to defaults."""
        stored = {}
        try:
            doc = self.db.settings.find_one({"_type": "dynamic_pricing"})
            if doc and isinstance(doc.get("config"), dict):
                stored = doc.get("config", {})
        except Exception:
            stored = {}

        config = dict(DEFAULT_DYNAMIC_PRICING)
        if stored:
            config.update(stored)

        import os
        env_m = os.getenv("PADDLE_PRICE_PER_SITE_MONTHLY", "").strip()
        env_y = os.getenv("PADDLE_PRICE_PER_SITE_YEARLY", "").strip()
        if env_m and not config.get("price_id_monthly"):
            config["price_id_monthly"] = env_m
        if env_y and not config.get("price_id_yearly"):
            config["price_id_yearly"] = env_y

        return config

    def save_dynamic_pricing_config(self, new_config: dict):
        """Admin override of dynamic per-site pricing and tiers."""
        try:
            clean = dict(DEFAULT_DYNAMIC_PRICING)
            for k in [
                "base_monthly_rate",
                "base_yearly_rate",
                "currency",
                "currency_symbol",
                "trial_days",
                "price_id_monthly",
                "price_id_yearly",
                "bulk_tiers",
                "features_included",
            ]:
                if k in new_config and new_config[k] is not None:
                    clean[k] = new_config[k]

            self.db.settings.update_one(
                {"_type": "dynamic_pricing"},
                {"$set": {"config": clean, "updated_at": __import__("datetime").datetime.now()}},
                upsert=True,
            )
            return True
        except Exception:
            return False
