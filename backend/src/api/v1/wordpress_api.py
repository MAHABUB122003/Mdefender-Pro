"""v1 API: WordPress site connection.

The WordPress plugin authenticates with its API key + a generated site token
and calls this endpoint to register/refresh its status. All data is stored
under the owning user's namespace - never trust the plugin's claims about
account ownership.

Endpoints:
  - POST /wordpress/connect   (plugin) register a WP site with connection token
  - POST /wordpress/heartbeat (plugin) periodic status + stats push
  - GET  /wordpress/site/{website_id}  (user) connection details + WP status
"""

import os
import re
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.services.notification_service import NotificationService
from src.utils.api_response import serialize, success

router = APIRouter(prefix="/wordpress", tags=["WordPress"])

PLUGIN_ZIP_PATH = Path(os.getenv(
    "WAF_PLUGIN_ZIP_PATH",
    str(Path(__file__).resolve().parents[3] / "downloads" / "mdefender-pro.zip"),
)).resolve()


def _plugin_info():
    if not PLUGIN_ZIP_PATH.is_file():
        return None
    info = {
        "filename": PLUGIN_ZIP_PATH.name,
        "size": PLUGIN_ZIP_PATH.stat().st_size,
        "modified": datetime.fromtimestamp(PLUGIN_ZIP_PATH.stat().st_mtime).isoformat(timespec="seconds"),
        "version": None,
        "files": 0,
    }
    try:
        with zipfile.ZipFile(PLUGIN_ZIP_PATH) as zf:
            names = zf.namelist()
            info["files"] = len(names)
            main = next((n for n in names if n.endswith("waf-firewall.php")), None)
            if main:
                header = zf.read(main).decode("utf-8", errors="replace")[:2000]
                m = re.search(r"Version:\s*([0-9][^\s]*)", header)
                if m:
                    info["version"] = m.group(1)
    except Exception:
        pass
    return info


@router.get("/plugin/meta")
async def plugin_meta():
    info = _plugin_info()
    if not info:
        raise HTTPException(status_code=404, detail="Plugin package not built yet")
    return success(info)


@router.get("/plugin")
async def download_plugin():
    info = _plugin_info()
    if not info:
        raise HTTPException(status_code=404, detail="Plugin package not built yet")
    return FileResponse(
        PLUGIN_ZIP_PATH,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{info["filename"]}"'},
    )

from src.api.v1.waf_api import verify_api_key


class ConnectRequest(BaseModel):
    api_key: str | None = None
    domain: str
    site_token: str | None = None
    plugin_version: str | None = None
    php_version: str | None = None
    wp_version: str | None = None


class HeartbeatRequest(BaseModel):
    api_key: str | None = None
    domain: str
    site_token: str | None = None
    plugin_version: str | None = None
    status: str = "online"
    stats: dict | None = None  # e.g. {requests_blocked, requests_allowed, last_scan, uptime}


@router.post("/connect")
async def connect_wordpress(body: ConnectRequest, request: Request):
    db = MongoDB()
    auth_header = request.headers.get("Authorization", "")
    bearer_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    api_key = body.api_key or bearer_key
    auth_data = verify_api_key(db, api_key, body.domain)
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid API key or domain mismatch")

    website = auth_data["website"]
    site_token = _generate_site_token()
    now = datetime.now()
    
    update_fields = {
        "platform": "wordpress",
        "verified": True,
        "wordpress_connection": {
            "connected": True,
            "connected_at": now,
            "site_token": _hash_token(site_token),
            "plugin_version": body.plugin_version,
            "php_version": body.php_version,
            "wp_version": body.wp_version,
        },
        "updated_at": now,
    }
    
    if not website.get("verified") or website.get("domain") in ("localhost", "127.0.0.1", "", None):
        update_fields["domain"] = body.domain
        if body.domain != "localhost":
            update_fields["url"] = f"https://{body.domain}"
        else:
            update_fields["url"] = "http://localhost"

    try:
        db.websites.update_one(
            {"_id": auth_data["website_id"]},
            {"$set": update_fields},
        )
    except Exception as e:
        if "E11000 duplicate key error" in str(e) and body.domain == "localhost":
            # Ignore duplicate key for localhost
            update_fields.pop("domain", None)
            update_fields.pop("url", None)
            db.websites.update_one(
                {"_id": auth_data["website_id"]},
                {"$set": update_fields},
            )
        else:
            raise
    db.wordpress_sites.update_one(
        {"website_id": auth_data["website_id"]},
        {"$set": {
            "website_id": auth_data["website_id"],
            "user_id": auth_data["user_id"],
            "domain": body.domain,
            "connected": True,
            "connected_at": now,
            "last_heartbeat": now,
            "plugin_version": body.plugin_version,
            "php_version": body.php_version,
            "wp_version": body.wp_version,
            "status": "online",
        }},
        upsert=True,
    )
    return success({
        "site_token": site_token,
        "website_id": auth_data["website_id"],
        "mode": website.get("waf_mode", "protect"),
        "message": "WordPress site connected",
    })


@router.post("/heartbeat")
async def heartbeat(body: HeartbeatRequest, request: Request):
    db = MongoDB()
    auth_header = request.headers.get("Authorization", "")
    bearer_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    api_key = body.api_key or bearer_key
    auth_data = verify_api_key(db, api_key, body.domain)
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid API key or domain mismatch")

    stored = db.wordpress_sites.find_one({"website_id": auth_data["website_id"]})
    if not stored:
        raise HTTPException(status_code=403, detail="Website not connected to WordPress")

    updates = {
        "status": body.status,
        "last_heartbeat": datetime.now(),
    }
    if body.plugin_version:
        updates["plugin_version"] = body.plugin_version
    if body.stats:
        updates["last_stats"] = body.stats
        
    website = auth_data["website"]
    db.websites.update_one(
        {"_id": auth_data["website_id"]},
        {"$set": {"last_activity": datetime.now()}},
    )

    db.wordpress_sites.update_one(
        {"website_id": auth_data["website_id"]},
        {"$set": updates},
    )

    # Check for queued scan command
    queued_scan = db.malware_scans.find_one({
        "website_id": auth_data["website_id"],
        "status": "queued"
    })
    command = None
    if queued_scan:
        command = {
            "type": "scan",
            "scan_id": queued_scan["_id"],
            "scan_type": queued_scan.get("scan_type", "file")
        }

    # Fetch configuration settings
    config = {
        "waf_mode": website.get("waf_mode", "protect"),
        "learning_mode": website.get("learning_mode", False),
        "confidence_threshold": website.get("confidence_threshold", 0.7),
        "disable_xmlrpc": website.get("disable_xmlrpc", False),
        "disable_directory_listing": website.get("disable_directory_listing", False),
        "prevent_user_enumeration": website.get("prevent_user_enumeration", False),
        "disable_file_editing": website.get("disable_file_editing", False),
    }

    # Fetch active blacklisted IPs for local firewall cache
    blacklist_cursor = db.blacklist.find()
    blacklist = [item["ip"] for item in blacklist_cursor if "ip" in item]

    return success({
        "status": "ok",
        "config": config,
        "command": command,
        "blacklist": blacklist
    })


@router.get("/site/{website_id}")
async def wordpress_site_status(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    wp = db.wordpress_sites.find_one({"website_id": website_id})
    if not wp or not wp.get("connected"):
        return success({
            "connected": False,
            "message": "WordPress plugin not connected yet. See installation instructions.",
            "installation": "/api/v1/websites/{id}/installation",
        })
    return success({
        "connected": True,
        "domain": wp.get("domain"),
        "plugin_version": wp.get("plugin_version"),
        "php_version": wp.get("php_version"),
        "wp_version": wp.get("wp_version"),
        "status": wp.get("status"),
        "connected_at": wp.get("connected_at").isoformat() if wp.get("connected_at") else None,
        "last_heartbeat": wp.get("last_heartbeat").isoformat() if wp.get("last_heartbeat") else None,
        "last_stats": wp.get("last_stats"),
    })


@router.post("/site/{website_id}/disconnect")
async def disconnect_wordpress(website_id: str, user=Depends(get_current_user)):
    website = get_owned_website(user, website_id)
    db = MongoDB()
    db.websites.update_one(
        {"_id": website_id},
        {"$set": {"wordpress_connection": {"connected": False}, "updated_at": datetime.now()}},
    )
    db.wordpress_sites.update_one(
        {"website_id": website_id},
        {"$set": {"connected": False, "status": "offline"}},
    )
    try:
        NotificationService(db).notify(
            user["id"],
            title="WordPress site disconnected",
            message=f"{website.get('url')} is no longer protected by the plugin",
            category="website_disconnected",
            website_id=website_id,
        )
    except Exception:
        pass
    return success(message="WordPress connection removed")


def _generate_site_token():
    return uuid.uuid4().hex + uuid.uuid4().hex


def _hash_token(token):
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()
