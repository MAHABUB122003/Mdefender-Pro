"""v1 API: admin control center.

Server-side truth for all administrative operations:
  - User management & 1-click issue resolution (unlock brute force, verify email, reset API key/MFA, force logout, delete)
  - Subscription tier pricing & quota configuration (Free, Go, Pro, Enterprise)
  - Multi-tenant connected websites monitoring
  - Grant & revoke plan entitlements
  - Audit log browsing & system health diagnostics
  - Model registry & platform overview statistics

Every mutation is recorded in the audit log.
"""

import json
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.api.v1.deps import get_db, require_super_admin
from src.auth.audit_service import AuditService
from src.auth.dependencies import get_current_admin
from src.database.mongodb_connection import MongoDB
from src.engine.ml_detector import MLDetector
from src.engine.malware_detector import MalwareDetector
from src.features.feature_flags import FeatureFlagService
from src.services.plan_service import PlanService
from src.services.subscription_service import SubscriptionService
from src.utils.api_response import serialize, success

router = APIRouter(prefix="/admin", tags=["Admin"])

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODEL_META = {
    "waf": os.path.join(BACKEND_ROOT, "models", "waf_meta.json"),
    "malware": os.path.join(BACKEND_ROOT, "models", "malware_meta.json"),
}


class UserActionBody(BaseModel):
    user_id: str


class GrantPlanBody(BaseModel):
    user_id: str
    plan: str
    duration_days: Optional[int] = None
    expires_at: Optional[str] = None


class RoleChangeBody(BaseModel):
    user_id: str
    role: str


class FlagUpdateBody(BaseModel):
    name: str
    enabled: bool


class PricingUpdateBody(BaseModel):
    plans: dict


def _resolve_user_doc(db, identifier: str):
    """Finds user by ObjectId, string _id, or email."""
    if not identifier:
        return None
    try:
        doc = db.users.find_one({"_id": ObjectId(identifier)})
        if doc:
            return doc
    except Exception:
        pass
    doc = db.users.find_one({"_id": identifier})
    if doc:
        return doc
    return db.users.find_one({"email": identifier.strip().lower()})


# ==================== USER MANAGEMENT & SUPPORT SUITE ====================

@router.get("/users")
async def list_users(request: Request, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    params = dict(request.query_params)
    query = {}
    role = params.get("role")
    status = params.get("status")
    plan = params.get("plan")
    search = params.get("q")
    limit = min(int(params.get("limit", 100)), 500)

    if role and role != "all":
        query["role"] = role
    if status == "active":
        query["is_active"] = True
    elif status == "suspended":
        query["$or"] = [{"is_active": False}, {"status": "suspended"}]
    elif status == "unverified":
        query["email_verified"] = False
    elif status == "verified":
        query["email_verified"] = True
    if plan and plan != "all":
        query["plan"] = plan

    if search:
        import re
        rx = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [{"email": rx}, {"name": rx}, {"full_name": rx}, {"username": rx}]

    users = list(db.users.find(query).sort("created_at", -1).limit(limit))

    # Fetch locked accounts to flag users
    locked_emails = set()
    try:
        for lk in db.locked_accounts.find({"locked_until": {"$gt": datetime.now()}}):
            ident = lk.get("identifier") or lk.get("email")
            if ident:
                locked_emails.add(str(ident).lower())
    except Exception:
        pass

    user_list = []
    for u in users:
        uid = str(u.get("_id"))
        u_email = str(u.get("email", "")).lower()
        websites_count = len(u.get("websites", []))
        if websites_count == 0:
            try:
                websites_count = db.clients.count_documents({"$or": [{"user_id": uid}, {"user_email": u_email}]})
            except Exception:
                pass

        user_list.append({
            "id": uid,
            "name": u.get("name") or u.get("full_name") or u.get("username") or "User",
            "full_name": u.get("full_name") or u.get("name") or "",
            "username": u.get("username") or "",
            "email": u.get("email"),
            "role": u.get("role", "user"),
            "status": "suspended" if u.get("is_active") is False or u.get("status") == "suspended" else "active",
            "is_active": u.get("is_active", True),
            "email_verified": u.get("email_verified", False),
            "mfa_enabled": u.get("mfa_enabled", False),
            "is_locked": u_email in locked_emails,
            "plan": u.get("plan", "free"),
            "plan_tier": u.get("plan_tier") or u.get("plan", "free"),
            "plan_expires": u.get("plan_expires").strftime("%Y-%m-%d") if isinstance(u.get("plan_expires"), datetime) else str(u.get("plan_expires") or ""),
            "api_key": u.get("api_key", ""),
            "websites_count": websites_count,
            "created_at": u.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if isinstance(u.get("created_at"), datetime) else str(u.get("created_at") or ""),
            "last_login": u.get("last_login").strftime("%Y-%m-%d %H:%M:%S") if isinstance(u.get("last_login"), datetime) else str(u.get("last_login") or ""),
        })

    return success({
        "users": user_list,
        "total": db.users.count_documents(query),
        "metrics": {
            "total_users": db.users.count_documents({}),
            "verified_users": db.users.count_documents({"email_verified": True}),
            "pro_users": db.users.count_documents({"plan": {"$in": ["pro", "premium", "go", "enterprise"]}}),
            "locked_users": len(locked_emails),
            "suspended_users": db.users.count_documents({"$or": [{"is_active": False}, {"status": "suspended"}]}),
        }
    })


@router.post("/users/unlock")
async def unlock_user_account(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    """Instantly clears brute-force lockouts and failed login attempts for a user."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    u_email = str(user.get("email", "")).lower()
    u_username = str(user.get("username", "")).lower()

    # Clear lockout tracking collections
    db.locked_accounts.delete_many({"identifier": {"$in": [u_email, u_username, str(user["_id"])]}})
    db.login_attempts.delete_many({"identifier": {"$in": [u_email, u_username, str(user["_id"])]}})
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_locked": False, "locked_until": None, "failed_login_attempts": 0, "updated_at": datetime.now()}}
    )

    AuditService().log(user_id=admin_email, action="user_unlocked", ip_address="admin_panel",
                       details={"unlocked_user": u_email, "user_id": str(user["_id"])})
    return success(message=f"Account for {u_email} has been completely unlocked.")


@router.post("/users/verify-email")
async def verify_user_email(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    """Forces email verification for user whose activation email was lost or delayed."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True, "updated_at": datetime.now()}}
    )

    AuditService().log(user_id=admin_email, action="user_email_force_verified", ip_address="admin_panel",
                       details={"target_email": user.get("email"), "user_id": str(user["_id"])})
    return success(message=f"Email for {user.get('email')} marked as verified.")


@router.post("/users/reset-key")
async def reset_user_api_key(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    """Regenerates the platform API Key for a user and updates default website."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_api_key = secrets.token_urlsafe(48)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"api_key": new_api_key, "updated_at": datetime.now()}}
    )
    # Sync with api_keys or clients collection if exists
    db.api_keys.update_many(
        {"user_id": str(user["_id"])},
        {"$set": {"key": new_api_key, "updated_at": datetime.now()}}
    )

    AuditService().log(user_id=admin_email, action="user_api_key_reset", ip_address="admin_panel",
                       details={"user_email": user.get("email"), "user_id": str(user["_id"])})
    return success({"api_key": new_api_key}, message="User API key regenerated successfully.")


@router.post("/users/reset-mfa")
async def reset_user_mfa(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    """Disables 2FA/MFA for a user who lost access to their authenticator app."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    uid = str(user["_id"])
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"mfa_enabled": False, "mfa_secret": None, "updated_at": datetime.now()}}
    )
    db.mfa_secrets.delete_many({"user_id": uid})

    AuditService().log(user_id=admin_email, action="user_mfa_reset", ip_address="admin_panel",
                       details={"user_email": user.get("email"), "user_id": uid})
    return success(message=f"Two-factor authentication disabled for {user.get('email')}.")


@router.post("/users/force-logout")
async def force_logout_user(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    """Terminates all active sessions and revokes refresh tokens for a user."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    uid = str(user["_id"])
    db.sessions.update_many({"user_id": uid}, {"$set": {"is_active": False, "terminated_at": datetime.now()}})
    db.refresh_tokens.update_many({"user_id": uid}, {"$set": {"revoked": True}})

    AuditService().log(user_id=admin_email, action="user_force_logout", ip_address="admin_panel",
                       details={"user_email": user.get("email"), "user_id": uid})
    return success(message=f"All active sessions terminated for {user.get('email')}.")


@router.post("/users/plan")
async def update_user_plan_tier(body: GrantPlanBody, admin_email: str = Depends(get_current_admin)):
    """Directly sets a user's subscription plan tier and expiration."""
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_key = body.plan.lower()
    valid_plans = [p["id"] for p in PlanService(db).all_plans()]
    if plan_key not in valid_plans and plan_key != "free":
        raise HTTPException(status_code=400, detail=f"Invalid plan '{body.plan}'. Valid plans: {valid_plans}")

    now = datetime.now()
    if body.duration_days and body.duration_days > 0:
        expires_at = now + timedelta(days=body.duration_days)
    elif body.expires_at:
        try:
            expires_at = datetime.fromisoformat(body.expires_at.replace("Z", "+00:00"))
        except Exception:
            expires_at = now + timedelta(days=365)
    elif plan_key == "free":
        expires_at = None
    else:
        expires_at = now + timedelta(days=365)

    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "plan": plan_key,
                "plan_tier": plan_key,
                "plan_expires": expires_at,
                "payment_status": "active" if plan_key != "free" else "free",
                "updated_at": now,
            }
        }
    )

    AuditService().log(user_id=admin_email, action="user_plan_updated", ip_address="admin_panel",
                       details={"target_user": user.get("email"), "plan": plan_key, "expires_at": str(expires_at)})
    return success(message=f"User plan updated to {plan_key.upper()} (Expires: {expires_at.strftime('%Y-%m-%d') if expires_at else 'Never'}).")


@router.post("/users/suspend")
async def suspend_user(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.get("email")).lower() == str(admin_email).lower():
        raise HTTPException(status_code=400, detail="You cannot suspend yourself")

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": False, "status": "suspended", "updated_at": datetime.now()}},
    )
    # Terminate sessions on suspend
    db.sessions.update_many({"user_id": str(user["_id"])}, {"$set": {"is_active": False}})

    AuditService().log(user_id=admin_email, action="user_suspended",
                       ip_address="admin_panel", details={"user_email": user.get("email")})
    return success(message="User suspended")


@router.post("/users/restore")
async def restore_user(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": True, "status": "active", "updated_at": datetime.now()}},
    )

    AuditService().log(user_id=admin_email, action="user_restored",
                       ip_address="admin_panel", details={"user_email": user.get("email")})
    return success(message="User restored to active state")


@router.post("/users/role")
async def change_role(body: RoleChangeBody, admin_email: str = Depends(get_current_admin)):
    allowed_roles = ("user", "admin", "super_admin")
    if body.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    db = get_db()
    user = _resolve_user_doc(db, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.users.update_one({"_id": user["_id"]}, {"$set": {"role": body.role, "updated_at": datetime.now()}})
    AuditService().log(user_id=admin_email, action="role_changed",
                       ip_address="admin_panel",
                       details={"user_email": user.get("email"), "role": body.role})
    return success(message=f"Role for {user.get('email')} updated to {body.role}")


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    user = _resolve_user_doc(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.get("email")).lower() == str(admin_email).lower():
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    uid = str(user["_id"])
    u_email = user.get("email")

    db.users.delete_one({"_id": user["_id"]})
    db.sessions.delete_many({"user_id": uid})
    db.clients.delete_many({"$or": [{"user_id": uid}, {"user_email": u_email}]})
    db.api_keys.delete_many({"user_id": uid})
    db.entitlements.delete_many({"user_id": uid})

    AuditService().log(user_id=admin_email, action="user_deleted",
                       ip_address="admin_panel", details={"deleted_user": u_email})
    return success(message=f"User {u_email} and associated resources deleted successfully.")


# ==================== PRICING & PLAN CONFIGURATION ====================

@router.get("/pricing")
async def get_pricing_configuration(admin_email: str = Depends(get_current_admin)):
    """Returns dynamic plan tiers, pricing ($ monthly & yearly), and quota settings."""
    db = get_db()
    plans = PlanService(db).all_plans()
    return success({"plans": plans})


@router.post("/pricing")
async def update_pricing_configuration(body: PricingUpdateBody, admin_email: str = Depends(get_current_admin)):
    """Updates plan tiers, monthly/yearly pricing, and quotas."""
    db = get_db()
    if not isinstance(body.plans, dict):
        raise HTTPException(status_code=400, detail="Plans object is required")

    saved = PlanService(db).save_plans(body.plans)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save plan pricing")

    AuditService().log(user_id=admin_email, action="pricing_plans_updated",
                       ip_address="admin_panel", details={"plans_updated": list(body.plans.keys())})
    return success({"plans": PlanService(db).all_plans()}, message="Plan pricing & quotas updated successfully.")


# ==================== MULTI-TENANT WEBSITES ====================

@router.get("/websites")
async def list_tenant_websites(request: Request, admin_email: str = Depends(get_current_admin)):
    """Returns all protected websites registered across all platform tenants."""
    db = get_db()
    websites = list(db.clients.find().sort("created_at", -1))
    result = []
    for w in websites:
        uid = str(w.get("user_id") or "")
        u_email = w.get("user_email")
        if not u_email and uid:
            u_doc = db.users.find_one({"_id": ObjectId(uid) if ObjectId.is_valid(uid) else uid})
            if u_doc:
                u_email = u_doc.get("email")

        result.append({
            "id": str(w["_id"]),
            "domain": w.get("domain", ""),
            "origin_server": w.get("origin_server", ""),
            "security_level": w.get("security_level", "high"),
            "status": w.get("status", "active"),
            "api_key": w.get("api_key", ""),
            "user_email": u_email or "Platform System",
            "created_at": w.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if isinstance(w.get("created_at"), datetime) else str(w.get("created_at") or ""),
        })

    return success({"websites": result, "total": len(result)})


@router.delete("/websites/{website_id}")
async def delete_tenant_website(website_id: str, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    try:
        oid = ObjectId(website_id)
        res = db.clients.delete_one({"_id": oid})
    except Exception:
        res = db.clients.delete_one({"_id": website_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Website not found")

    AuditService().log(user_id=admin_email, action="admin_deleted_website", ip_address="admin_panel", details={"website_id": website_id})
    return success(message="Website deleted successfully.")


# ==================== ENTITLEMENTS & AUDIT LOGS ====================

@router.get("/entitlements")
async def list_entitlements(admin_email: str = Depends(get_current_admin)):
    db = get_db()
    items = list(db.entitlements.find({}).limit(200))
    return success({"entitlements": [serialize(e) for e in items]})


@router.post("/entitlements/grant")
async def grant_entitlement(body: GrantPlanBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    valid = [p["id"] for p in PlanService(db).all_plans()]
    if body.plan not in valid:
        return {"success": False, "error": {"code": "INVALID_PLAN", "message": "Unknown plan"}}
    service = SubscriptionService(db)
    record = service.admin_grant_plan(user_id=body.user_id, plan=body.plan,
                                      expires_at=body.expires_at, granted_by=admin_email)
    AuditService().log(user_id=admin_email, action="plan_granted",
                       ip_address="system",
                       details={"user_id": body.user_id, "plan": body.plan})
    return success({"entitlement": serialize(record)})


@router.post("/entitlements/revoke")
async def revoke_entitlement(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    result = db.entitlements.delete_one({"user_id": body.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No entitlement for this user")
    AuditService().log(user_id=admin_email, action="plan_revoked",
                       ip_address="system", details={"user_id": body.user_id})
    return success(message="Entitlement revoked")


@router.get("/audit-log")
async def audit_log(request: Request, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    params = dict(request.query_params)
    limit = min(int(params.get("limit", 100)), 500)
    query = {}
    action = params.get("action")
    user = params.get("user_id")
    if action:
        query["action"] = action
    if user:
        query["user_id"] = user
    logs = list(db.audit_logs.find(query).sort("created_at", -1).limit(limit))
    return success({"logs": [serialize(l) for l in logs]})


@router.get("/overview")
async def admin_overview(admin_email: str = Depends(get_current_admin)):
    db = get_db()
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    def _count(collection, query):
        coll = db[collection]
        if coll is None:
            return 0
        try:
            return coll.count_documents(query)
        except Exception:
            return 0

    return success({
        "users": _count("users", {}),
        "users_today": _count("users", {"created_at": {"$gte": today_start}}),
        "verified_users": _count("users", {"email_verified": True}),
        "unverified_users": _count("users", {"email_verified": False}),
        "pro_subscribers": _count("users", {"plan": {"$in": ["pro", "premium", "go", "enterprise"]}}),
        "websites": _count("clients", {}),
        "active_websites": _count("clients", {"status": "active"}),
        "events_today": _count("attacks", {"timestamp": {"$gte": today_start}}),
        "events_blocked_today": _count("attacks", {"timestamp": {"$gte": today_start}, "status": "blocked"}),
        "malware_scans": _count("malware_scans", {}),
        "quarantine_items": _count("quarantine_files", {"status": "quarantined"}),
        "revenue_attempts": _count("payments", {}),
        "blacklisted_ips": _count("blacklist", {}),
        "api_keys": _count("api_keys", {}),
    })


@router.get("/system-health")
async def system_health(admin_email: str = Depends(get_current_admin)):
    checks = {
        "mongo": {"ok": True, "label": "MongoDB Database"},
        "waf_model": {"ok": True, "label": "WAF ML Core"},
        "malware_model": {"ok": True, "label": "Malware Classifier"},
        "signature_rules": {"ok": True, "label": "Rule Signatures Engine"},
    }
    try:
        mongo = MongoDB()
        if getattr(mongo, "_client", None) is not None:
            mongo._client.admin.command("ping")
        else:
            raise RuntimeError("MongoDB client not connected")
    except Exception as exc:
        checks["mongo"] = {"ok": False, "error": str(exc), "label": "MongoDB Database"}
    try:
        ml = MLDetector()
        checks["waf_model"] = {"ok": True, "version": getattr(ml, "model_version", "unknown"), "label": "WAF ML Core"}
    except Exception as exc:
        checks["waf_model"] = {"ok": False, "error": str(exc), "label": "WAF ML Core"}
    try:
        md = MalwareDetector()
        checks["malware_model"] = {"ok": True, "version": getattr(md, "model_version", "unknown"), "label": "Malware Classifier"}
    except Exception as exc:
        checks["malware_model"] = {"ok": False, "error": str(exc), "label": "Malware Classifier"}
    try:
        from src.engine.signature_detector import SignatureDetector
        sd = SignatureDetector()
        sd._load_patterns()
        sd._load_hashes()
        status = sd.get_status()
        checks["signature_rules"] = {
            "ok": status.get("configured", False) and status.get("patterns_loaded", 0) > 0,
            "patterns": status.get("patterns_loaded", 0),
            "hashes": status.get("hashes_loaded", 0),
            "directory": status.get("directory"),
            "error": status.get("load_error"),
            "label": "Rule Signatures Engine"
        }
    except Exception as exc:
        checks["signature_rules"] = {"ok": False, "error": str(exc), "label": "Rule Signatures Engine"}
    overall = all(v.get("ok") for v in checks.values())
    return success({"status": "healthy" if overall else "degraded", "checks": checks})


@router.get("/model-registry")
async def model_registry(admin_email: str = Depends(get_current_admin)):
    registry = {}
    for key, path in MODEL_META.items():
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    registry[key] = json.load(f)
            else:
                registry[key] = {"loaded": False, "path": path, "error": "meta file not found"}
        except Exception as exc:
            registry[key] = {"loaded": False, "error": str(exc)}
    return success({"models": registry})


@router.get("/flags")
async def list_flags(admin_email: str = Depends(get_current_admin)):
    return success({"flags": FeatureFlagService().get_all()})


@router.put("/flags")
async def update_flag(body: FlagUpdateBody, admin_email: str = Depends(get_current_admin)):
    service = FeatureFlagService()
    if body.name not in service.get_all():
        return {"success": False, "error": {"code": "UNKNOWN_FLAG", "message": "Unknown flag"}}
    service.set_flag(body.name, body.enabled)
    AuditService().log(user_id=admin_email, action="feature_flag_updated",
                       ip_address="system",
                       details={"flag": body.name, "enabled": body.enabled})
    return success({"flags": service.get_all()})

