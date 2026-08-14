"""v1 API: admin control center.

Server-side truth for all administrative operations:
  - manage users (suspend / restore / role change)
  - grant & revoke plan entitlements
  - audit log browsing
  - system health (services, DB, feature flags)
  - model registry (metadata from waf_meta.json / malware_meta.json)
  - platform overview statistics (aggregated, no raw payloads)

Every mutation is recorded in the audit log.
"""

import json
import os
from datetime import datetime

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
    expires_at: str | None = None


class RoleChangeBody(BaseModel):
    user_id: str
    role: str


class FlagUpdateBody(BaseModel):
    name: str
    enabled: bool


@router.get("/users")
async def list_users(request: Request, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    params = dict(request.query_params)
    query = {}
    role = params.get("role")
    search = params.get("q")
    limit = min(int(params.get("limit", 50)), 200)
    if role:
        query["role"] = role
    if search:
        import re
        rx = re.compile(search, re.IGNORECASE)
        query["$or"] = [{"email": rx}, {"name": rx}]
    users = list(db.users.find(query).sort("created_at", -1).limit(limit))
    return success({"users": [
        {
            "id": str(u.get("_id")),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role"),
            "status": u.get("status", "active"),
            "plan": u.get("plan", "free"),
            "created_at": u.get("created_at"),
        } for u in users
    ], "total": db.users.count_documents(query)})


@router.post("/users/suspend")
async def suspend_user(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    if str(body.user_id) == str(admin_email):
        raise HTTPException(status_code=400, detail="You cannot suspend yourself")
    result = db.users.update_one(
        {"email": body.user_id},
        {"$set": {"is_active": False, "status": "suspended", "updated_at": datetime.now()}},
    )
    if result.matched_count == 0:
        try:
            from bson import ObjectId
            result = db.users.update_one(
                {"_id": ObjectId(body.user_id)},
                {"$set": {"is_active": False, "status": "suspended", "updated_at": datetime.now()}},
            )
        except Exception:
            pass
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService().log(user_id=admin_email, action="user_suspended",
                       ip_address="system", details={"user_id": body.user_id})
    return success(message="User suspended")


@router.post("/users/restore")
async def restore_user(body: UserActionBody, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    try:
        from bson import ObjectId
        result = db.users.update_one(
            {"_id": ObjectId(body.user_id)},
            {"$set": {"is_active": True, "status": "active", "updated_at": datetime.now()}},
        )
    except Exception:
        result = db.users.update_one(
            {"email": body.user_id},
            {"$set": {"is_active": True, "status": "active", "updated_at": datetime.now()}},
        )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService().log(user_id=admin_email, action="user_restored",
                       ip_address="system", details={"user_id": body.user_id})
    return success(message="User restored")


@router.post("/users/role")
async def change_role(body: RoleChangeBody, admin_email: str = Depends(get_current_admin)):
    allowed_roles = ("user", "admin", "super_admin")
    if body.role not in allowed_roles:
        return {"success": False, "error": {"code": "INVALID_ROLE", "message": "Invalid role"}}
    db = get_db()
    try:
        from bson import ObjectId
        result = db.users.update_one(
            {"_id": ObjectId(body.user_id)}, {"$set": {"role": body.role}},
        )
    except Exception:
        result = db.users.update_one({"email": body.user_id}, {"$set": {"role": body.role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService().log(user_id=admin_email, action="role_changed",
                       ip_address="system",
                       details={"user_id": body.user_id, "role": body.role})
    return success(message="Role updated")


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
        "websites": _count("websites", {}),
        "active_websites": _count("websites", {"status": "active"}),
        "events_today": _count("security_events", {"timestamp": {"$gte": today_start}}),
        "events_blocked_today": _count("security_events",
                                       {"timestamp": {"$gte": today_start}, "action": "blocked"}),
        "malware_scans": _count("malware_scans", {}),
        "quarantine_items": _count("quarantine_files", {"status": "quarantined"}),
        "revenue_attempts": _count("paddle_transactions", {}),
        "api_keys": _count("api_keys", {}),
    })


@router.get("/system-health")
async def system_health(admin_email: str = Depends(get_current_admin)):
    checks = {
        "mongo": {"ok": True},
        "waf_model": {"ok": True},
        "malware_model": {"ok": True},
        "signature_rules": {"ok": True},
    }
    try:
        mongo = MongoDB()
        if getattr(mongo, "_client", None) is not None:
            mongo._client.admin.command("ping")
        else:
            raise RuntimeError("MongoDB client not connected")
    except Exception as exc:
        checks["mongo"] = {"ok": False, "error": str(exc)}
    try:
        ml = MLDetector()
        checks["waf_model"] = {"ok": True, "version": getattr(ml, "model_version", "unknown")}
    except Exception as exc:
        checks["waf_model"] = {"ok": False, "error": str(exc)}
    try:
        md = MalwareDetector()
        checks["malware_model"] = {"ok": True, "version": getattr(md, "model_version", "unknown")}
    except Exception as exc:
        checks["malware_model"] = {"ok": False, "error": str(exc)}
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
        }
    except Exception as exc:
        checks["signature_rules"] = {"ok": False, "error": str(exc)}
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
