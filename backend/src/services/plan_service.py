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
        {"min_sites": 25, "max_sites": 49, "discount_percent": 20, "label": "Scale Partner"},
        {"min_sites": 50, "max_sites": 500, "discount_percent": 30, "label": "Enterprise MSP"}
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


# In-memory ultra-lightweight pricing cache (zero MongoDB overhead on hot paths)
_PRICING_CACHE = None
_PRICING_CACHE_TIME = 0
_PRICING_CACHE_TTL = 300  # 5 minutes


class PlanService:
    def __init__(self, db=None):
        self.db = db if db is not None else MongoDB()

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
        """Resolve dynamic per-site pricing configuration directly from database.
        Always reads authoritative database state to eliminate cross-worker Gunicorn desync.
        """
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

        # Fallback to paddle_gateway settings if dynamic_pricing doesn't have explicit price IDs
        if not config.get("price_id_monthly") or not config.get("price_id_yearly"):
            try:
                gw_doc = self.db.settings.find_one({"_type": "paddle_gateway"})
                if gw_doc and isinstance(gw_doc.get("config"), dict):
                    gw_cfg = gw_doc["config"]
                    if not config.get("price_id_monthly"):
                        config["price_id_monthly"] = gw_cfg.get("price_id_monthly", "")
                    if not config.get("price_id_yearly"):
                        config["price_id_yearly"] = gw_cfg.get("price_id_yearly", "")
            except Exception:
                pass

        import os
        env_m = os.getenv("PADDLE_PRICE_PER_SITE_MONTHLY", "").strip()
        env_y = os.getenv("PADDLE_PRICE_PER_SITE_YEARLY", "").strip()
        if env_m and not config.get("price_id_monthly"):
            config["price_id_monthly"] = env_m
        if env_y and not config.get("price_id_yearly"):
            config["price_id_yearly"] = env_y

        return config

    def calculate_fleet_pricing(self, sites_count: int, billing_cycle: str = "monthly") -> dict:
        """Computes exact dynamic price and bulk discount tier based on Admin settings.
        Zero gateway manual updates needed — mathematically deterministic.
        """
        config = self.get_dynamic_pricing_config()
        cycle_clean = str(billing_cycle or "monthly").lower()
        is_yearly = cycle_clean in ("yearly", "annual", "annually", "1 year")

        count = max(1, int(sites_count or 1))
        monthly_rate = float(config.get("base_monthly_rate") or 4.0)
        yearly_rate = float(config.get("base_yearly_rate") or 40.0)
        base_rate = yearly_rate if is_yearly else monthly_rate

        tiers = config.get("bulk_tiers") or DEFAULT_DYNAMIC_PRICING["bulk_tiers"]
        active_tier = {"discount_percent": 0, "label": "Starter Fleet"}
        for t in sorted(tiers, key=lambda x: int(x.get("min_sites", 0)), reverse=True):
            if count >= int(t.get("min_sites", 0)):
                active_tier = t
                break

        discount_percent = int(active_tier.get("discount_percent", 0))
        raw_total = count * base_rate
        discount_amount = (raw_total * discount_percent) / 100.0
        final_total = max(0.0, raw_total - discount_amount)
        unit_price = round(final_total / count, 2)
        effective_monthly = round(final_total / 12.0, 2) if is_yearly else round(final_total, 2)

        import os
        product_id = os.getenv("PADDLE_PRODUCT_ID", "pro_01m7r3fnmwga2hzeyat6m1p90s")

        return {
            "sites_count": count,
            "billing_cycle": "yearly" if is_yearly else "monthly",
            "is_yearly": is_yearly,
            "base_rate": base_rate,
            "monthly_rate": monthly_rate,
            "yearly_rate": yearly_rate,
            "tier_label": active_tier.get("label", "Standard"),
            "discount_percent": discount_percent,
            "raw_total": round(raw_total, 2),
            "discount_amount": round(discount_amount, 2),
            "final_total": round(final_total, 2),
            "unit_price": unit_price,
            "effective_monthly": effective_monthly,
            "amount_in_cents": int(round(final_total * 100)),
            "unit_amount_in_cents": int(round(unit_price * 100)),
            "currency": config.get("currency", "USD"),
            "currency_symbol": config.get("currency_symbol", "$"),
            "product_id": product_id,
            "price_id": config.get("price_id_yearly" if is_yearly else "price_id_monthly", "")
        }

    def calculate_dynamic_price(self, website_count: int = 1, billing_cycle: str = "monthly") -> dict:
        """Alias for calculate_fleet_pricing with website_count parameter."""
        return self.calculate_fleet_pricing(sites_count=website_count, billing_cycle=billing_cycle)

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
            try:
                # Invalidate in-memory cache on update
                global _PRICING_CACHE, _PRICING_CACHE_TIME
                _PRICING_CACHE = None
                _PRICING_CACHE_TIME = 0

                # Also keep Pro plan pricing synchronized with dynamic per-site base rate
                if "base_monthly_rate" in clean and "base_yearly_rate" in clean:
                    self.db.settings.update_one(
                        {"_type": "plans"},
                        {"$set": {
                            "plans.pro.monthly_price": clean["base_monthly_rate"],
                            "plans.pro.yearly_price": clean["base_yearly_rate"],
                            "plans.free.badge": f"{clean.get('trial_days', 14)}-Day Free Trial",
                            "updated_at": __import__("datetime").datetime.now()
                        }}
                    )

                # Dynamically synchronize all non-admin, non-paid trial users with new trial duration
                new_trial_days = int(clean.get("trial_days") or 14)
                from datetime import datetime, timezone, timedelta
                import math
                now_utc = datetime.now(timezone.utc)
                trial_users = list(self.db.users.find({
                    "role": {"$nin": ["admin", "super_admin"]},
                    "is_paid": {"$ne": True}
                }))
                for u in trial_users:
                    current_ends = u.get("custom_trial_ends_at") or u.get("trial_ends_at")
                    if current_ends:
                        if isinstance(current_ends, str):
                            try:
                                current_ends = datetime.fromisoformat(current_ends)
                            except Exception:
                                current_ends = None
                        if current_ends and hasattr(current_ends, "tzinfo") and current_ends.tzinfo is None:
                            current_ends = current_ends.replace(tzinfo=timezone.utc)

                    # STRICT ANTI-RESURRECTION RULE (International SaaS Standard):
                    # If a user's free trial has ALREADY concluded, expired, or been exhausted,
                    # a global promotional trial duration change MUST NEVER resurrect their account or grant free protection.
                    # Expired users must remain expired and can only regain protection by purchasing a Pro subscription.
                    is_already_expired = bool(
                        u.get("trial_exhausted") is True or
                        u.get("payment_status") in ("trial_expired", "expired", "unlicensed") or
                        (current_ends and current_ends <= now_utc)
                    )
                    if is_already_expired:
                        self.db.users.update_one(
                            {"_id": u["_id"]},
                            {"$set": {
                                "trial_exhausted": True,
                                "trial_days_remaining": 0,
                                "payment_status": "trial_expired" if u.get("payment_status") != "expired" else "expired"
                            }}
                        )
                        continue

                    # For currently active trial users only:
                    u_created = u.get("created_at") or now_utc
                    if isinstance(u_created, str):
                        try:
                            u_created = datetime.fromisoformat(u_created)
                        except Exception:
                            u_created = now_utc
                    if hasattr(u_created, "tzinfo") and u_created.tzinfo is None:
                        u_created = u_created.replace(tzinfo=timezone.utc)

                    new_ends = u_created + timedelta(days=new_trial_days)

                    # Grandfathering & Entitlement Protection Rule (International SaaS Standard):
                    # Never shorten, truncate, or downgrade a previously granted promotional trial!
                    if current_ends and current_ends > new_ends:
                        new_ends = current_ends

                    rem_days = max(0, int(math.ceil((new_ends - now_utc).total_seconds() / 86400)))
                    new_status = "trialing" if rem_days > 0 else "trial_expired"

                    self.db.users.update_one(
                        {"_id": u["_id"]},
                        {"$set": {
                            "trial_ends_at": new_ends,
                            "trial_days_remaining": rem_days,
                            "payment_status": new_status if u.get("payment_status") in ("trialing", "trial_expired", "unlicensed", None) else u.get("payment_status")
                        }}
                    )
                    self.db.websites.update_many(
                        {"user_id": {"$in": [str(u["_id"]), u["_id"]]}},
                        {"$set": {"trial_ends_at": new_ends}}
                    )
            except Exception:
                pass
            return True
        except Exception:
            return False
