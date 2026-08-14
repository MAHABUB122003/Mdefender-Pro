"""v1 API: websites + API keys.

Multi-tenant website management:
  - add / list / update / remove websites
  - generate scoped API keys (only displayed once, plaintext, prefix mdf_live_)
  - rotate / revoke API keys
  - pause / resume protection
  - plan limits enforced server-side

Tenant isolation: every operation is scoped to the authenticated user.
"""

import hashlib
import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.services.plan_service import PlanService
from src.services.subscription_service import SubscriptionService
from src.utils.api_response import parse_object_id, serialize, success
from src.utils.logger import Logger

router = APIRouter(prefix="/websites", tags=["Websites"])

PLATFORMS = ["wordpress", "node", "express", "react", "laravel", "python", "php", "other"]


class WebsiteCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    url: str = Field(..., min_length=3, max_length=500)
    platform: str = Field("other")


class WebsiteUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    platform: str | None = None


class ApiKeyCreate(BaseModel):
    label: str | None = None


def _key_hash(raw_key):
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _generate_raw_key():
    return "mdf_live_" + secrets.token_hex(24)


def _website_out(doc):
    return serialize({
        "_id": doc["_id"],
        "name": doc.get("name", doc.get("domain", "")),
        "url": doc.get("url", doc.get("domain", "")),
        "platform": doc.get("platform", "other"),
        "status": doc.get("status", "active"),
        "protection_enabled": doc.get("protection_enabled", True),
        "waf_mode": doc.get("waf_mode", "protect"),
        "malware_scanner": doc.get("malware_scanner", True),
        "threat_level": doc.get("threat_level", "LOW"),
        "last_activity": doc.get("last_activity"),
        "connected_at": doc.get("connected_at", doc.get("added_at")),
        "verified": doc.get("verified", False),
    })


@router.get("")
async def list_websites(user=Depends(get_current_user)):
    db = MongoDB()
    docs = list(db.websites.find({"user_id": str(user["id"])}).sort("connected_at", -1))
    return success({"websites": [_website_out(d) for d in docs]})


@router.post("")
async def add_website(body: WebsiteCreate, user=Depends(get_current_user)):
    db = MongoDB()
    subs = SubscriptionService(db)
    plan_id = subs.effective_plan(user)
    check = subs.check_website_limit(user, plan_id)
    if not check["allowed"]:
        raise HTTPException(status_code=403, detail=check["message"])

    url = body.url.strip().rstrip("/")
    if body.platform not in PLATFORMS:
        raise HTTPException(status_code=400,
                            detail="Platform must be one of: " + ", ".join(PLATFORMS))

    existing = db.websites.find_one({"$or": [{"url": url}, {"domain": url}]})
    if existing:
        raise HTTPException(status_code=409, detail="This website is already registered")

    website_id = str(uuid.uuid4())
    now = datetime.now()
    website = {
        "_id": website_id,
        "user_id": str(user["id"]),
        "name": body.name.strip(),
        "url": url,
        "domain": url,
        "platform": body.platform,
        "status": "active",
        "protection_enabled": True,
        "waf_mode": "protect",
        "malware_scanner": True,
        "threat_level": "LOW",
        "verified": False,
        "connected_at": now,
        "last_activity": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        db.websites.insert_one(website)
    except Exception:
        raise HTTPException(status_code=409, detail="This website is already registered")

    raw_key = _generate_raw_key()
    db.api_keys.insert_one({
        "website_id": website_id,
        "user_id": str(user["id"]),
        "key_hash": _key_hash(raw_key),
        "label": body.platform,
        "created_at": now,
        "status": "active",
        "last_used": None,
    })

    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="website_added",
                           ip_address="system", details={"website_id": website_id, "url": url})
    except Exception:
        pass

    return success({
        "website": _website_out(website),
        "api_key": raw_key,
        "message": "Website added. Store the API key now - it is shown only once.",
    })


@router.get("/{website_id}")
async def get_website(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    return success({"website": _website_out(website)})


@router.patch("/{website_id}")
async def update_website(website_id: str, body: WebsiteUpdate, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    updates = {}
    if body.name:
        updates["name"] = body.name.strip()
    if body.url:
        updates["url"] = body.url.strip().rstrip("/")
        updates["domain"] = updates["url"]
    if body.platform:
        if body.platform not in PLATFORMS:
            raise HTTPException(status_code=400, detail="Invalid platform")
        updates["platform"] = body.platform
    updates["updated_at"] = datetime.now()
    db.websites.update_one({"_id": website["_id"]}, {"$set": updates})
    return success({"website": _website_out(db.websites.find_one({"_id": website["_id"]}))})


@router.delete("/{website_id}")
async def remove_website(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    db.websites.delete_one({"_id": website["_id"]})
    db.api_keys.delete_many({"website_id": website_id})
    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="website_removed",
                           ip_address="system", details={"website_id": website_id})
    except Exception:
        pass
    return success(message="Website removed")


@router.post("/{website_id}/pause")
async def pause_website(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    db.websites.update_one({"_id": website["_id"]},
                           {"$set": {"protection_enabled": False, "updated_at": datetime.now()}})
    return success({"website_id": website_id, "protection_enabled": False})


@router.post("/{website_id}/resume")
async def resume_website(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    db.websites.update_one({"_id": website["_id"]},
                           {"$set": {"protection_enabled": True, "updated_at": datetime.now()}})
    return success({"website_id": website_id, "protection_enabled": True})


@router.post("/{website_id}/verify")
async def verify_website(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    key = db.api_keys.find_one({"website_id": website_id, "status": "active"})
    if not key:
        raise HTTPException(status_code=404, detail="This website has no active API key")
    db.websites.update_one({"_id": website["_id"]},
                           {"$set": {"verified": True, "last_activity": datetime.now(),
                                     "updated_at": datetime.now()}})
    return success({"website_id": website_id, "verified": True})


# ---------- API keys ----------

@router.get("/{website_id}/api-keys")
async def list_api_keys(website_id: str, user=Depends(get_current_user)):
    get_owned_website(user, website_id)
    db = MongoDB()
    keys = list(db.api_keys.find({"website_id": website_id}))
    return success({"api_keys": [
        {
            "id": str(k["_id"]),
            "label": k.get("label"),
            "status": k.get("status"),
            "prefix": "mdf_live_",
            "created_at": k.get("created_at").isoformat() if k.get("created_at") else None,
            "last_used": k.get("last_used"),
        } for k in keys
    ]})


@router.post("/{website_id}/api-keys")
async def create_api_key(website_id: str, body: ApiKeyCreate, user=Depends(get_current_user)):
    get_owned_website(user, website_id)
    db = MongoDB()
    raw_key = _generate_raw_key()
    db.api_keys.insert_one({
        "website_id": website_id,
        "user_id": str(user["id"]),
        "key_hash": _key_hash(raw_key),
        "label": body.label,
        "created_at": datetime.now(),
        "status": "active",
        "last_used": None,
    })
    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="api_key_created",
                           ip_address="system", details={"website_id": website_id})
    except Exception:
        pass
    return success({"api_key": raw_key,
                    "message": "Store this key now - it is shown only once."})


@router.post("/{website_id}/api-keys/rotate")
async def rotate_api_key(website_id: str, user=Depends(get_current_user)):
    get_owned_website(user, website_id)
    db = MongoDB()
    db.api_keys.update_many({"website_id": website_id}, {"$set": {"status": "revoked"}})
    raw_key = _generate_raw_key()
    db.api_keys.insert_one({
        "website_id": website_id,
        "user_id": str(user["id"]),
        "key_hash": _key_hash(raw_key),
        "label": "rotated",
        "created_at": datetime.now(),
        "status": "active",
        "last_used": None,
    })
    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="api_key_rotated",
                           ip_address="system", details={"website_id": website_id})
    except Exception:
        pass
    return success({"api_key": raw_key, "message": "Old keys revoked. New key shown once."})


@router.post("/{website_id}/api-keys/revoke")
async def revoke_api_key(website_id: str, user=Depends(get_current_user)):
    get_owned_website(user, website_id)
    db = MongoDB()
    db.api_keys.update_many({"website_id": website_id}, {"$set": {"status": "revoked"}})
    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="api_key_revoked",
                           ip_address="system", details={"website_id": website_id})
    except Exception:
        pass
    return success(message="All API keys for this website revoked")


@router.get("/{website_id}/installation")
async def installation_instructions(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    platform = website.get("platform", "node")
    instructions = {
        "wordpress": {
            "title": "WordPress Plugin",
            "steps": [
                "Install the MDefender Pro WordPress plugin",
                "Activate the plugin",
                "Open the MDefender Pro setup screen",
                "Connect your MDefender account to this website",
                "Protection is enabled automatically",
            ],
        },
        "node": {
            "title": "Node.js / Express",
            "steps": [
                "npm install mdefender",
                "Create mdefender.config.js with your API key",
                "Attach the middleware to your app",
            ],
        },
        "express": {
            "title": "Express",
            "steps": [
                "npm install mdefender",
                "Create mdefender.config.js with your API key",
                "Attach the middleware to your app",
            ],
        },
        "python": {
            "title": "Python / FastAPI / Django",
            "steps": [
                "pip install mdefender",
                "Set MDEFENDER_API_KEY",
                "Wrap your app with the MDefender middleware",
            ],
        },
        "laravel": {
            "title": "Laravel",
            "steps": [
                "composer require mdefender/mdefender",
                "Configure the MDefender service",
                "Register the middleware",
            ],
        },
        "php": {
            "title": "PHP",
            "steps": [
                "composer require mdefender/mdefender",
                "Create the MDefender client",
                "Wrap your entry point",
            ],
        },
        "react": {
            "title": "React",
            "steps": [
                "Protect the API behind MDefender via the Node/Express SDK",
                "npm install mdefender",
                "Attach the middleware to your API server",
            ],
        },
        "other": {
            "title": "API",
            "steps": [
                "Call POST /api/v1/waf/analyze with your API key",
                "Send request metadata as JSON",
                "Apply the returned decision",
            ],
        },
    }
    cfg = instructions.get(platform, instructions["other"])
    return success({"website_id": website_id, "platform": platform, **cfg})
