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
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.api.v1.deps import get_owned_website
from src.api.v1.waf_api import verify_api_key
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
        "api_key": api_key,
        "site_token": site_token,
        "wordpress_connection": {
            "connected": True,
            "connected_at": now,
            "site_token": _hash_token(site_token),
            "raw_site_token": site_token,
            "api_key": api_key,
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
            "api_key": api_key,
            "site_token": site_token,
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

    website = auth_data.get("website") or {}
    website_id = auth_data.get("website_id")
    user_id = auth_data.get("user_id")

    stored = db.wordpress_sites.find_one({"website_id": website_id})
    if not stored:
        db.wordpress_sites.update_one(
            {"website_id": website_id},
            {"$set": {
                "website_id": website_id,
                "user_id": user_id,
                "domain": body.domain,
                "connected": True,
                "connected_at": datetime.now(),
                "last_heartbeat": datetime.now(),
                "plugin_version": body.plugin_version,
                "status": "online",
            }},
            upsert=True
        )

    updates = {
        "status": body.status,
        "last_heartbeat": datetime.now(),
    }
    if body.plugin_version:
        updates["plugin_version"] = body.plugin_version
    if body.stats:
        updates["last_stats"] = body.stats
        today_str = datetime.now().strftime("%Y-%m-%d")
        now_dt = datetime.now()
        
        req_blocked = int(body.stats.get("requests_blocked", 0) or 0)
        req_allowed = int(body.stats.get("requests_allowed", 0) or 0)
        total_site_reqs = req_blocked + req_allowed

        # Check if date changed for today's counter reset
        last_date = website.get("requests_today_date", "")
        site_prev_today = 0 if last_date != today_str else website.get("requests_today", 0)
        site_prev_blocked_today = 0 if last_date != today_str else website.get("blocked_today", 0)

        # Delta computation
        old_lifetime_reqs = website.get("total_requests", 0)
        old_lifetime_blocked = website.get("total_blocked", 0)
        new_lifetime_reqs = max(total_site_reqs, old_lifetime_reqs)
        new_lifetime_blocked = max(req_blocked, old_lifetime_blocked)
        
        delta_reqs = max(0, new_lifetime_reqs - old_lifetime_reqs)
        delta_blocked = max(0, new_lifetime_blocked - old_lifetime_blocked)

        new_today_reqs = site_prev_today + delta_reqs
        new_today_blocked = site_prev_blocked_today + delta_blocked

        db.websites.update_one(
            {"_id": website_id},
            {
                "$set": {
                    "total_requests": new_lifetime_reqs,
                    "total_blocked": new_lifetime_blocked,
                    "requests_today": new_today_reqs,
                    "blocked_today": new_today_blocked,
                    "requests_today_date": today_str,
                    "last_activity": now_dt,
                }
            }
        )
        try:
            from bson import ObjectId
            u_id = auth_data.get("user_id")
            u_matches = [{"_id": u_id}, {"id": u_id}]
            if ObjectId.is_valid(str(u_id)):
                u_matches.append({"_id": ObjectId(str(u_id))})
            
            db.users.update_one(
                {"$or": u_matches},
                {
                    "$set": {
                        "total_requests": new_lifetime_reqs,
                        "total_blocked": new_lifetime_blocked,
                        "requests_today_date": today_str,
                        "updated_at": now_dt,
                    },
                    "$inc": {
                        "requests_today": delta_reqs
                    } if last_date == today_str else {
                        "requests_today": new_today_reqs
                    }
                }
            )
        except Exception:
            pass
        
    db.websites.update_one(
        {"_id": website_id},
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

    from src.security.attack_blocker import AttackBlocker
    u_cfg = AttackBlocker(db).get_user_settings(auth_data.get("user_id"))

    # Fetch configuration settings
    config = {
        "waf_mode": website.get("waf_mode", "protect"),
        "learning_mode": website.get("learning_mode", False),
        "confidence_threshold": website.get("confidence_threshold", 0.7),
        "disable_xmlrpc": website.get("disable_xmlrpc", False),
        "disable_directory_listing": website.get("disable_directory_listing", False),
        "prevent_user_enumeration": website.get("prevent_user_enumeration", False),
        "disable_file_editing": website.get("disable_file_editing", False),
        "rate_limit": u_cfg.get("rate_limit_per_minute", 120),
        "auto_block_enabled": u_cfg.get("auto_block_enabled", True),
        "auto_block_threshold": u_cfg.get("auto_block_threshold", 10),
        "auto_block_window": u_cfg.get("auto_block_window_hours", 24) * 3600,
        "auto_block_duration": (u_cfg.get("auto_block_duration_hours", 24) or 24) * 3600,
        "ddos_enabled": u_cfg.get("ddos_mitigation_enabled", True),
    }

    # Fetch active blacklisted IPs for local firewall cache (scoped to user)
    user_id = str(auth_data.get("user_id") or "")
    user_doc = None
    from bson import ObjectId
    if user_id:
        u_find = [{"_id": user_id}, {"id": user_id}]
        if ObjectId.is_valid(user_id):
            u_find.append({"_id": ObjectId(user_id)})
        user_doc = db.users.find_one({"$or": u_find})
    user_email = user_doc.get("email", "") if user_doc else ""

    now = datetime.now()
    user_or_conditions = [
        {"added_by_user_id": user_id},
        {"user_id": user_id},
        {"added_by_user_id": {"$exists": False}},
        {"added_by_user_id": None},
        {"is_global": True},
    ]
    if user_email:
        user_or_conditions.append({"added_by": user_email})
    if ObjectId.is_valid(user_id):
        user_or_conditions.append({"added_by_user_id": ObjectId(user_id)})
        user_or_conditions.append({"user_id": ObjectId(user_id)})

    find_conditions = [
        {"$or": user_or_conditions},
        {
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$exists": False}},
                {"expires_at": {"$gt": now}},
            ]
        }
    ]
    blacklist_cursor = db.blacklist.find({"$and": find_conditions})
    raw_blacklist = [item["ip"].strip() for item in blacklist_cursor if item.get("ip")]
    bl_set = set(raw_blacklist)
    if "127.0.0.1" in bl_set or "::1" in bl_set:
        bl_set.add("127.0.0.1")
        bl_set.add("::1")
        bl_set.add("0.0.0.0")
    blacklist = list(bl_set)

    # Fetch active country blocks (strictly scoped to user or is_global)
    country_query = []
    if user_id:
        u_str = str(user_id)
        country_query.extend([
            {"user_id": u_str},
            {"added_by_user_id": u_str},
        ])
        if ObjectId.is_valid(u_str):
            country_query.append({"user_id": ObjectId(u_str)})
            country_query.append({"added_by_user_id": ObjectId(u_str)})
    if user_email:
        country_query.append({"added_by": user_email})
    country_query.append({"is_global": True})

    country_cursor = db.country_blocks.find({"$or": country_query}) if country_query else []
    blocked_countries = list(set([item["country_code"].strip().upper() for item in country_cursor if item.get("country_code")]))

    # Fetch custom firewall rules (scoped to user)
    rules_query = [{"user_id": user_id}]
    if ObjectId.is_valid(user_id):
        rules_query.append({"user_id": ObjectId(user_id)})
    rules_cursor = db.user_rules.find({"$or": rules_query})
    user_rules = []
    for r in rules_cursor:
        user_rules.append({
            "id": str(r.get("_id", "")),
            "name": r.get("name", ""),
            "pattern": r.get("pattern", ""),
            "action": r.get("action", "block"),
            "severity": r.get("severity", "high"),
            "enabled": bool(r.get("enabled", True)),
        })

    return success({
        "status": "ok",
        "config": config,
        "command": command,
        "blacklist": blacklist,
        "blocked_countries": blocked_countries,
        "user_rules": user_rules,
    })


def push_instant_sync_to_wordpress(user_id=None, website_id=None):
    """Background fire-and-forget sync notification with full payload to all connected WordPress sites."""
    import threading
    import requests

    def _do_sync():
        try:
            db = MongoDB()
            from bson import ObjectId
            u_str = str(user_id) if user_id else ""
            
            # Fetch active user doc for fallback keys & email
            user_doc = None
            if u_str:
                u_find = [{"_id": u_str}, {"id": u_str}]
                if ObjectId.is_valid(u_str):
                    u_find.append({"_id": ObjectId(u_str)})
                user_doc = db.users.find_one({"$or": u_find})
            user_email = user_doc.get("email", "") if user_doc else ""
            user_master_key = user_doc.get("api_key", "") if user_doc else ""

            # Build fresh active Blacklist
            now = datetime.now()
            user_or_conds = [
                {"added_by_user_id": u_str},
                {"user_id": u_str},
                {"added_by_user_id": {"$exists": False}},
                {"added_by_user_id": None},
                {"is_global": True},
            ]
            if user_email:
                user_or_conds.append({"added_by": user_email})
            if ObjectId.is_valid(u_str):
                user_or_conds.append({"added_by_user_id": ObjectId(u_str)})
                user_or_conds.append({"user_id": ObjectId(u_str)})

            bl_cur = db.blacklist.find({
                "$and": [
                    {"$or": user_or_conds},
                    {
                        "$or": [
                            {"expires_at": None},
                            {"expires_at": {"$exists": False}},
                            {"expires_at": {"$gt": now}},
                        ]
                    }
                ]
            })
            raw_bl = [item["ip"].strip() for item in bl_cur if item.get("ip")]
            bl_set = set(raw_bl)
            if "127.0.0.1" in bl_set or "::1" in bl_set:
                bl_set.add("127.0.0.1")
                bl_set.add("::1")
                bl_set.add("0.0.0.0")
            blacklist = list(bl_set)

            # Build fresh Country Blocks
            c_query = [{"is_global": True}]
            if u_str:
                c_query.extend([
                    {"user_id": u_str},
                    {"added_by_user_id": u_str},
                ])
                if ObjectId.is_valid(u_str):
                    c_query.append({"user_id": ObjectId(u_str)})
                    c_query.append({"added_by_user_id": ObjectId(u_str)})
            if user_email:
                c_query.append({"added_by": user_email})
            c_cur = db.country_blocks.find({"$or": c_query})
            blocked_countries = list(set([item["country_code"].strip().upper() for item in c_cur if item.get("country_code")]))

            # Build custom rules
            r_query = [{"user_id": u_str}] if u_str else []
            if ObjectId.is_valid(u_str):
                r_query.append({"user_id": ObjectId(u_str)})
            user_rules = []
            if r_query:
                for r in db.user_rules.find({"$or": r_query}):
                    user_rules.append({
                        "id": str(r.get("_id", "")),
                        "name": r.get("name", ""),
                        "pattern": r.get("pattern", ""),
                        "action": r.get("action", "block"),
                        "severity": r.get("severity", "high"),
                        "enabled": bool(r.get("enabled", True)),
                    })

            query = {}
            if u_str:
                conds = [{"user_id": u_str}, {"added_by_user_id": u_str}, {"created_by": u_str}]
                if ObjectId.is_valid(u_str):
                    conds.append({"user_id": ObjectId(u_str)})
                query["$or"] = conds
            if website_id:
                query["website_id"] = str(website_id)

            w_sites = list(db.websites.find(query if query else {}))
            wp_sites = list(db.wordpress_sites.find(query if query else {}))

            # Target URLs list: (url, api_key, site_token)
            targets = []
            for ws in w_sites:
                domain = (ws.get("domain") or "").strip().rstrip("/")
                raw_url = (ws.get("url") or "").strip().rstrip("/")
                k = ws.get("api_key") or user_master_key or ""
                tok = ws.get("site_token") or (ws.get("wordpress_connection") or {}).get("raw_site_token") or ""
                
                if raw_url:
                    targets.append((raw_url, k, tok))
                    if raw_url.startswith("https://"):
                        targets.append((raw_url.replace("https://", "http://", 1), k, tok))
                    elif raw_url.startswith("http://"):
                        targets.append((raw_url.replace("http://", "https://", 1), k, tok))
                elif domain:
                    targets.append((f"https://{domain}", k, tok))
                    targets.append((f"http://{domain}", k, tok))

            for wp in wp_sites:
                domain = (wp.get("domain") or "").strip().rstrip("/")
                if domain:
                    ws_match = db.websites.find_one({"_id": wp.get("website_id")}) or db.websites.find_one({"domain": domain})
                    k = wp.get("api_key") or (ws_match.get("api_key") if ws_match else "") or user_master_key or ""
                    tok = wp.get("site_token") or ""
                    targets.append((f"https://{domain}", k, tok))
                    targets.append((f"http://{domain}", k, tok))

            # Also ensure local development WordPress installations receive instant push
            local_keys = [k for (_, k, _) in targets if k] or ([user_master_key] if user_master_key else [""])
            for lk in local_keys:
                targets.append(("http://localhost/mahabub", lk, ""))
                targets.append(("http://127.0.0.1/mahabub", lk, ""))
                targets.append(("http://localhost", lk, ""))
                targets.append(("http://127.0.0.1", lk, ""))

            # Deduplicate targets by normalized URL
            seen = set()
            unique_targets = []
            for u, k, tok in targets:
                clean_u = u.rstrip("/")
                if clean_u and clean_u not in seen:
                    seen.add(clean_u)
                    unique_targets.append((clean_u, k, tok))

            from src.security.attack_blocker import AttackBlocker
            u_cfg = AttackBlocker(db).get_user_settings(u_str)

            sync_payload = {
                "status": "ok",
                "blacklist": blacklist,
                "blocked_countries": blocked_countries,
                "user_rules": user_rules,
                "config": {
                    "rate_limit": u_cfg.get("rate_limit_per_minute", 120),
                    "auto_block_enabled": u_cfg.get("auto_block_enabled", True),
                    "auto_block_threshold": u_cfg.get("auto_block_threshold", 10),
                    "auto_block_window": u_cfg.get("auto_block_window_hours", 24) * 3600,
                    "auto_block_duration": (u_cfg.get("auto_block_duration_hours", 24) or 24) * 3600,
                    "ddos_enabled": u_cfg.get("ddos_mitigation_enabled", True),
                },
                "synced_at": datetime.now().isoformat(),
            }

            # Direct local disk fast-cache synchronization for 0ms zero-latency updates
            try:
                import json
                bl_map = {}
                for bip in blacklist:
                    if bip:
                        cip = str(bip).strip()
                        bl_map[cip] = True
                        if cip == "127.0.0.1":
                            bl_map["::1"] = True
                            bl_map["0.0.0.0"] = True
                        elif cip == "::1":
                            bl_map["127.0.0.1"] = True
                            bl_map["0.0.0.0"] = True

                fast_cache_json = {
                    "enabled": True,
                    "updated_at": int(datetime.now().timestamp()),
                    "blacklist_ips": bl_map,
                    "blocked_countries": blocked_countries,
                    "local_server_country": "BD",
                }

                disk_paths = [
                    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "plugin_source", "mdefender-pro", "includes", "data", "waf_fast_cache.json")),
                    r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro\includes\data\waf_fast_cache.json",
                ]
                for dp in disk_paths:
                    try:
                        os.makedirs(os.path.dirname(dp), exist_ok=True)
                        with open(dp, "w", encoding="utf-8") as f:
                            json.dump(fast_cache_json, f, indent=2)
                    except Exception:
                        pass

                # Direct MySQL option sync for local XAMPP WordPress database if accessible
                try:
                    import phpserialize
                except Exception:
                    phpserialize = None

                # Fallback to PHP helper script to update WordPress options via mysqli
                try:
                    import subprocess
                    php_exe = r"C:\xampp\php\php.exe"
                    if os.path.exists(php_exe):
                        b_str = json.dumps(blacklist)
                        c_str = ",".join(blocked_countries)
                        php_code = f"""
                        $c = @mysqli_connect('127.0.0.1', 'root', '', 'mahabub');
                        if ($c) {{
                            $bl = json_decode('{b_str}', true);
                            $bl_ser = serialize($bl);
                            $c_val = '{c_str}';
                            mysqli_query($c, "UPDATE wp_options SET option_value = '" . mysqli_real_escape_string($c, $bl_ser) . "' WHERE option_name = 'waf_fw_local_blacklist_cache'");
                            mysqli_query($c, "UPDATE wp_options SET option_value = '" . mysqli_real_escape_string($c, $c_val) . "' WHERE option_name = 'waf_fw_blocked_countries'");
                            
                            // Synchronize wp_waf_blacklist MySQL table
                            if (empty($bl)) {{
                                mysqli_query($c, "DELETE FROM wp_waf_blacklist");
                            }} else {{
                                $escaped = array_map(function($ip) use ($c) {{ return "'" . mysqli_real_escape_string($c, $ip) . "'"; }}, $bl);
                                $in_clause = implode(',', $escaped);
                                mysqli_query($c, "DELETE FROM wp_waf_blacklist WHERE ip NOT IN ($in_clause)");
                            }}
                            mysqli_query($c, "DELETE FROM wp_options WHERE option_name LIKE '_transient_waf_attack_cnt_%' OR option_name LIKE '_transient_timeout_waf_attack_cnt_%'");
                            mysqli_close($c);
                        }}
                        """
                        subprocess.run([php_exe, "-r", php_code], capture_output=True, timeout=2)
                except Exception:
                    pass
            except Exception:
                pass

            for clean_url, api_key, site_token in unique_targets:
                if not clean_url:
                    continue
                try:
                    headers = {"Content-Type": "application/json"}
                    if api_key:
                        headers["Authorization"] = f"Bearer {api_key}"
                        headers["X-API-Key"] = api_key
                    if site_token:
                        headers["X-Site-Token"] = site_token

                    sep = "&" if "?" in clean_url else "?"
                    url_params = f"waf_cloud_sync=1"
                    if api_key:
                        url_params += f"&api_key={api_key}"
                    if site_token:
                        url_params += f"&site_token={site_token}"

                    target_endpoint = f"{clean_url}{sep}{url_params}"

                    # 1. First attempt POST with rich JSON payload for 0-latency instant cache update
                    try:
                        requests.post(
                            target_endpoint,
                            json=sync_payload,
                            headers=headers,
                            timeout=4,
                            verify=False
                        )
                    except Exception:
                        pass

                    # 2. Fallback GET notification
                    try:
                        requests.get(
                            target_endpoint,
                            headers=headers,
                            timeout=3,
                            verify=False
                        )
                    except Exception:
                        pass
                except Exception:
                    pass
        except Exception:
            pass

    threading.Thread(target=_do_sync, daemon=True).start()


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
