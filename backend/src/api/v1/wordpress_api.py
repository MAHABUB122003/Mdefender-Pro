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



import concurrent.futures

import hashlib

import json

import os

import re

import subprocess

import threading

import uuid

import zipfile

from datetime import datetime

from pathlib import Path



import requests

from bson import ObjectId

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

            main = next((n for n in names if n.endswith("mdefender-pro.php") or n.endswith("waf-firewall.php")), None)

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





@router.get("/download")

@router.get("/plugin")

@router.get("/plugin/download")

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

    site_url: str | None = None

    home_url: str | None = None

    plugins: list | None = None

    themes: list | None = None

    theme: str | None = None

    hardening: dict | None = None

    backups: list | None = None

    stats: dict | None = None





class HeartbeatRequest(BaseModel):

    api_key: str | None = None

    domain: str

    site_token: str | None = None

    plugin_version: str | None = None

    status: str = "online"

    stats: dict | None = None  # e.g. {requests_blocked, requests_allowed, last_scan, uptime}

    plugins: list | None = None

    themes: list | None = None

    theme: str | None = None

    hardening: dict | None = None

    backups: list | None = None





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



    clean_target_url = body.site_url or body.home_url or ""

    if not clean_target_url and body.domain:

        clean_target_url = f"https://{body.domain}" if body.domain not in ("localhost", "127.0.0.1") else "http://localhost"

    

    update_fields = {

        "user_id": str(auth_data["user_id"]),

        "platform": "wordpress",

        "verified": True,

        "api_key": api_key,

        "site_token": site_token,

        "url": clean_target_url,

        "wordpress_connection": {

            "connected": True,

            "connected_at": now,

            "site_token": _hash_token(site_token),

            "raw_site_token": site_token,

            "api_key": api_key,

            "site_url": clean_target_url,

            "plugin_version": body.plugin_version,

            "php_version": body.php_version,

            "wp_version": body.wp_version,

        },

        "updated_at": now,

    }

    

    if body.plugins is not None:

        update_fields["plugins"] = body.plugins

    if body.themes is not None:

        update_fields["themes"] = body.themes

    if body.theme is not None:

        update_fields["theme"] = body.theme

    if body.hardening is not None:

        update_fields["hardening"] = body.hardening

        for hk, hv in body.hardening.items():

            if hk in ("disable_xmlrpc", "block_uploads_php", "disable_file_editing", "hide_wp_version", "prevent_user_enumeration", "security_headers", "file_permissions_check", "login_two_factor", "disable_directory_listing"):

                update_fields[hk] = bool(hv)

    if body.backups is not None:

        update_fields["backups"] = body.backups



    if body.stats:

        today_str = datetime.now().strftime("%Y-%m-%d")

        b_cnt = int(body.stats.get("requests_blocked", 0) or 0)

        a_cnt = int(body.stats.get("requests_allowed", 0) or 0)

        tot_cnt = b_cnt + a_cnt

        update_fields["total_requests"] = tot_cnt

        update_fields["total_blocked"] = b_cnt

        update_fields["requests_today"] = tot_cnt

        update_fields["blocked_today"] = b_cnt

        update_fields["requests_today_date"] = today_str

        update_fields["last_activity"] = now



    if not website.get("verified") or website.get("domain") in ("localhost", "127.0.0.1", "", None):

        update_fields["domain"] = body.domain



    w_cond = {"$or": [{"_id": auth_data["website_id"]}]}

    if ObjectId.is_valid(str(auth_data["website_id"])):

        w_cond["$or"].append({"_id": ObjectId(str(auth_data["website_id"]))})



    try:

        db.websites.update_one(

            w_cond,

            {"$set": update_fields},

        )

    except Exception as e:

        if "E11000 duplicate key error" in str(e) and body.domain == "localhost":

            # Ignore duplicate key for localhost

            update_fields.pop("domain", None)

            update_fields.pop("url", None)

            db.websites.update_one(

                w_cond,

                {"$set": update_fields},

            )

        else:

            raise



    wp_site_cond = {"$or": [{"website_id": str(auth_data["website_id"])}]}

    if ObjectId.is_valid(str(auth_data["website_id"])):

        wp_site_cond["$or"].append({"website_id": ObjectId(str(auth_data["website_id"]))})



    db.wordpress_sites.update_one(

        wp_site_cond,

        {"$set": {

            "website_id": auth_data["website_id"],

            "user_id": auth_data["user_id"],

            "domain": body.domain,

            "url": clean_target_url,

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

    # Immediately push current blacklist, country blocks & rules upon connection

    try:

        push_instant_sync_to_wordpress(user_id=auth_data["user_id"], website_id=auth_data["website_id"])

    except Exception:

        pass



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

    site_updates = {"last_activity": datetime.now()}

    if body.plugins is not None:

        updates["plugins"] = body.plugins

        site_updates["plugins"] = body.plugins

    if body.themes is not None:

        updates["themes"] = body.themes

        site_updates["themes"] = body.themes

    if body.theme is not None:

        updates["theme"] = body.theme

        site_updates["theme"] = body.theme

    if body.hardening is not None:

        updates["hardening"] = body.hardening

        site_updates["hardening"] = body.hardening

        for hk, hv in body.hardening.items():

            if hk in ("disable_xmlrpc", "block_uploads_php", "disable_file_editing", "hide_wp_version", "prevent_user_enumeration", "security_headers", "file_permissions_check", "login_two_factor", "disable_directory_listing"):

                site_updates[hk] = bool(hv)

    if body.backups is not None:

        updates["backups"] = body.backups

        site_updates["backups"] = body.backups



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



        w_cond = {"$or": [{"_id": website_id}]}

        if ObjectId.is_valid(str(website_id)):

            w_cond["$or"].append({"_id": ObjectId(str(website_id))})



        db.websites.update_one(

            w_cond,

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

            u_id = auth_data.get("user_id")

            u_matches = [{"_id": u_id}, {"id": u_id}]

            if ObjectId.is_valid(str(u_id)):

                u_matches.append({"_id": ObjectId(str(u_id))})

            

            # Aggregate totals across all websites owned by this user

            all_user_sites = list(db.websites.find({"$or": [{"user_id": str(u_id)}, {"user_id": ObjectId(str(u_id))}] if ObjectId.is_valid(str(u_id)) else [{"user_id": str(u_id)}]}))

            user_tot_req = sum(s.get("total_requests", 0) for s in all_user_sites)

            user_tot_blk = sum(s.get("total_blocked", 0) for s in all_user_sites)

            user_today_req = sum(s.get("requests_today", 0) for s in all_user_sites if s.get("requests_today_date") == today_str)

            user_tot_req = max(user_tot_req, user_today_req)



            db.users.update_one(

                {"$or": u_matches},

                {

                    "$set": {

                        "total_requests": user_tot_req,

                        "total_blocked": user_tot_blk,

                        "requests_today": user_today_req,

                        "requests_today_date": today_str,

                        "updated_at": now_dt,

                    }

                }

            )

        except Exception:

            pass

        

    w_cond = {"$or": [{"_id": website_id}]}

    if ObjectId.is_valid(str(website_id)):

        w_cond["$or"].append({"_id": ObjectId(str(website_id))})



    wp_site_cond = {"$or": [{"website_id": str(auth_data["website_id"])}]}

    if ObjectId.is_valid(str(auth_data["website_id"])):

        wp_site_cond["$or"].append({"website_id": ObjectId(str(auth_data["website_id"]))})



    db.websites.update_one(

        w_cond,

        {"$set": site_updates},

    )



    db.wordpress_sites.update_one(

        wp_site_cond,

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

        "confidence_threshold": float(website.get("confidence_threshold") or 0.7),

        "disable_xmlrpc": bool(website.get("disable_xmlrpc", True)),

        "block_uploads_php": bool(website.get("block_uploads_php", True)),

        "disable_directory_listing": bool(website.get("disable_directory_listing", True)),

        "prevent_user_enumeration": bool(website.get("prevent_user_enumeration", True)),

        "disable_file_editing": bool(website.get("disable_file_editing", True)),

        "hide_wp_version": bool(website.get("hide_wp_version", True)),

        "security_headers": bool(website.get("security_headers", True)),

        "file_permissions_check": bool(website.get("file_permissions_check", True)),

        "login_two_factor": bool(website.get("login_two_factor", True)),

        "rate_limit": int(website.get("rate_limit_per_minute") or u_cfg.get("rate_limit_per_minute", 120)),

        "auto_block_enabled": bool(website.get("auto_block_enabled", u_cfg.get("auto_block_enabled", True))),

        "auto_block_threshold": u_cfg.get("auto_block_threshold", 10),

        "auto_block_window": u_cfg.get("auto_block_window_hours", 24) * 3600,

        "auto_block_duration": (u_cfg.get("auto_block_duration_hours", 24) or 24) * 3600,

        "ddos_enabled": u_cfg.get("ddos_mitigation_enabled", True),

        "under_attack_mode": bool(website.get("under_attack_mode", False)),

    }



    # Fetch active blacklisted IPs for local firewall cache (scoped to user)

    user_id = str(auth_data.get("user_id") or "")

    user_doc = None

    # ObjectId imported at module top

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



    raw_blacklist = []

    for item in db.blacklist.find():

        ip_val = (item.get("ip") or "").strip()

        if not ip_val or ip_val in ("127.0.0.1", "::1", "0.0.0.0", "localhost"):

            continue

        exp = item.get("expires_at")

        if exp:

            if isinstance(exp, str):

                try:

                    exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))

                except Exception:

                    try:

                        exp = datetime.strptime(exp, "%Y-%m-%d %H:%M:%S")

                    except Exception:

                        exp = None

            if isinstance(exp, datetime) and exp <= now:

                continue

        

        item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

        item_email = item.get("added_by", "")

        is_global = item.get("is_global", False)

        if not user_id or is_global or not item_u or item_u == str(user_id) or (user_email and item_email == user_email):

            raw_blacklist.append(ip_val)

    blacklist = list(set(raw_blacklist))



    # Fetch active whitelisted IPs (scoped to user or is_global)

    raw_whitelist = []

    for item in db.whitelist.find():

        ip_val = (item.get("ip") or "").strip()

        if not ip_val:

            continue

        item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

        item_email = item.get("added_by", "")

        is_global = item.get("is_global", False)

        if not user_id or is_global or not item_u or item_u == str(user_id) or (user_email and item_email == user_email):

            raw_whitelist.append(ip_val)

    whitelist = list(set(raw_whitelist))



    # Fetch active country blocks (strictly scoped to user or is_global)

    country_set = set()

    for item in db.country_blocks.find():

        c_code = (item.get("country_code") or "").strip().upper()

        if not c_code or len(c_code) != 2:

            continue

        item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

        item_email = item.get("added_by", "")

        is_global = item.get("is_global", False)

        if not user_id or is_global or not item_u or item_u == str(user_id) or (user_email and item_email == user_email):

            country_set.add(c_code)

    # Merge website-specific blocked countries

    for site_cc in website.get("blocked_countries", []):

        if site_cc and len(str(site_cc).strip()) == 2:

            country_set.add(str(site_cc).strip().upper())

    blocked_countries = list(country_set)



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



    resp = {

        "status": "ok",

        "config": config,

        "command": command,

        "blacklist": blacklist,

        "whitelist": whitelist,

        "blocked_countries": blocked_countries,

        "user_rules": user_rules,

    }

    return {

        "status": "success",

        "data": resp,

        "blacklist": blacklist,

        "whitelist": whitelist,

        "blocked_countries": blocked_countries,

        "user_rules": user_rules,

        "config": config,

        "command": command,

    }





def push_instant_sync_to_wordpress(user_id=None, website_id=None):

    """Background fire-and-forget sync notification with full payload to all connected WordPress sites."""

    import threading

    import requests



    def _do_sync():

        try:

            db = MongoDB()

            # ObjectId imported at module top

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



            # Build fresh active Blacklist with robust date parsing

            now = datetime.now()

            raw_bl = []

            for item in db.blacklist.find():

                ip_val = (item.get("ip") or "").strip()

                if not ip_val or ip_val in ("127.0.0.1", "::1", "0.0.0.0", "localhost"):

                    continue

                exp = item.get("expires_at")

                if exp:

                    if isinstance(exp, str):

                        try:

                            exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))

                        except Exception:

                            try:

                                exp = datetime.strptime(exp, "%Y-%m-%d %H:%M:%S")

                            except Exception:

                                exp = None

                    if isinstance(exp, datetime) and exp <= now:

                        continue

                

                item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

                item_email = item.get("added_by", "")

                is_global = item.get("is_global", False)

                if not u_str or is_global or not item_u or item_u == u_str or (user_email and item_email == user_email):

                    raw_bl.append(ip_val)

            

            blacklist = list(set(raw_bl))



            # Build fresh active Whitelist

            raw_wl = []

            for item in db.whitelist.find():

                ip_val = (item.get("ip") or "").strip()

                if not ip_val:

                    continue

                item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

                item_email = item.get("added_by", "")

                is_global = item.get("is_global", False)

                if not u_str or is_global or not item_u or item_u == u_str or (user_email and item_email == user_email):

                    raw_wl.append(ip_val)

            whitelist = list(set(raw_wl))



            # Build fresh Country Blocks with robust parsing

            country_set = set()

            for item in db.country_blocks.find():

                c_code = (item.get("country_code") or "").strip().upper()

                if not c_code or len(c_code) != 2:

                    continue

                item_u = str(item.get("user_id") or item.get("added_by_user_id") or "")

                item_email = item.get("added_by", "")

                is_global = item.get("is_global", False)

                if not u_str or is_global or not item_u or item_u == u_str or (user_email and item_email == user_email):

                    country_set.add(c_code)

            blocked_countries = list(country_set)



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

                w_id_str = str(website_id)

                w_cond = [{"_id": w_id_str}, {"id": w_id_str}, {"domain": w_id_str}, {"website_id": w_id_str}]

                # ObjectId imported at module top

                if ObjectId.is_valid(w_id_str):

                    w_cond.append({"_id": ObjectId(w_id_str)})

                if "$or" in query:

                    query = {"$and": [{"$or": query["$or"]}, {"$or": w_cond}]}

                else:

                    query["$or"] = w_cond



            w_sites = list(db.websites.find(query if query else {}))

            if not w_sites and website_id:

                w_id_str = str(website_id)

                w_fallback = [{"_id": w_id_str}, {"id": w_id_str}, {"domain": w_id_str}, {"website_id": w_id_str}]

                if ObjectId.is_valid(w_id_str):

                    w_fallback.append({"_id": ObjectId(w_id_str)})

                w_sites = list(db.websites.find({"$or": w_fallback}))

            if not w_sites and user_email:

                w_sites = list(db.websites.find({"$or": [{"owner_email": user_email}, {"email": user_email}]}))

            if not w_sites:

                w_sites = list(db.websites.find({"status": {"$ne": "deleted"}}))



            wp_sites = list(db.wordpress_sites.find(query if query else {}))

            if not wp_sites:

                wp_sites = list(db.wordpress_sites.find({}))



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



            if website_id:

                matched_ws = [ws for ws in w_sites if str(ws.get("_id")) == str(website_id) or str(ws.get("id")) == str(website_id) or ws.get("domain") == str(website_id)]

                ref_ws = matched_ws[0] if matched_ws else (w_sites[0] if w_sites else (ws_match or {}))

            else:

                ref_ws = w_sites[0] if w_sites else (ws_match or {})

            sync_payload = {

                "status": "ok",

                "blacklist": blacklist,

                "whitelist": whitelist,

                "blocked_countries": blocked_countries,

                "user_rules": user_rules,

                "config": {

                    "waf_mode": ref_ws.get("waf_mode", "protect"),

                    "learning_mode": bool(ref_ws.get("learning_mode", False)),

                    "confidence_threshold": float(ref_ws.get("confidence_threshold") or 0.7),

                    "disable_xmlrpc": bool(ref_ws.get("disable_xmlrpc", True)),

                    "block_uploads_php": bool(ref_ws.get("block_uploads_php", True)),

                    "disable_directory_listing": bool(ref_ws.get("disable_directory_listing", True)),

                    "prevent_user_enumeration": bool(ref_ws.get("prevent_user_enumeration", True)),

                    "disable_file_editing": bool(ref_ws.get("disable_file_editing", True)),

                    "hide_wp_version": bool(ref_ws.get("hide_wp_version", True)),

                    "security_headers": bool(ref_ws.get("security_headers", True)),

                    "file_permissions_check": bool(ref_ws.get("file_permissions_check", True)),

                    "login_two_factor": bool(ref_ws.get("login_two_factor", u_cfg.get("two_factor_enabled", True))),

                    "two_factor_enabled": bool(ref_ws.get("login_two_factor", u_cfg.get("two_factor_enabled", True))),

                    "two_factor_roles": str(u_cfg.get("two_factor_roles", "admins")),

                    "two_factor_method_totp": bool(u_cfg.get("two_factor_method_totp", True)),

                    "two_factor_method_email": bool(u_cfg.get("two_factor_method_email", True)),

                    "two_factor_method_backup": bool(u_cfg.get("two_factor_method_backup", True)),

                    "two_factor_max_attempts": int(u_cfg.get("two_factor_max_attempts", 3)),

                    "two_factor_lockout_hours": int(u_cfg.get("two_factor_lockout_hours", 24)),

                    "two_factor_remember_days": int(u_cfg.get("two_factor_remember_days", 0)),

                    "rate_limit": int(ref_ws.get("rate_limit_per_minute") or u_cfg.get("rate_limit_per_minute", 120)),

                    "auto_block_enabled": bool(ref_ws.get("auto_block_enabled", u_cfg.get("auto_block_enabled", True))),

                    "auto_block_threshold": u_cfg.get("auto_block_threshold", 10),

                    "auto_block_window": u_cfg.get("auto_block_window_hours", 24) * 3600,

                    "auto_block_duration": (u_cfg.get("auto_block_duration_hours", 24) or 24) * 3600,

                    "ddos_enabled": u_cfg.get("ddos_mitigation_enabled", True),

                    "under_attack_mode": bool(ref_ws.get("under_attack_mode", False)),

                    "custom_login_slug": ref_ws.get("custom_login_slug", ""),

                    "hide_login_url": bool(ref_ws.get("hide_login_url", False)),

                    "login_redirect_type": ref_ws.get("login_redirect_type", "404"),

                    "bot_challenge_mode": ref_ws.get("bot_challenge_mode", "hold_press"),

                    "max_login_attempts": int(ref_ws.get("max_login_attempts", 5)),

                    "login_lockout_duration": int(ref_ws.get("login_lockout_duration", 60)),

                    "hold_press_enabled": bool(ref_ws.get("hold_press_enabled", u_cfg.get("hold_press_enabled", True))),

                    "hold_press_duration_ms": int(ref_ws.get("hold_press_duration_ms") or u_cfg.get("hold_press_duration_ms", 2000)),

                    "turnstile_enabled": bool(ref_ws.get("turnstile_enabled", u_cfg.get("turnstile_enabled", True))),

                    "turnstile_mode": ref_ws.get("turnstile_mode") or u_cfg.get("turnstile_mode", "forms"),

                    "turnstile_theme": ref_ws.get("turnstile_theme") or u_cfg.get("turnstile_theme", "auto"),

                    "turnstile_site_key": ref_ws.get("turnstile_site_key") or u_cfg.get("turnstile_site_key", ""),

                    "turnstile_secret_key": ref_ws.get("turnstile_secret_key") or u_cfg.get("turnstile_secret_key", ""),

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

                        uam_val = "yes" if sync_payload["config"].get("under_attack_mode") else "no"

                        rate_limit_val = str(sync_payload["config"].get("rate_limit", 120))

                        hold_en = "yes" if sync_payload["config"].get("hold_press_enabled") else "no"

                        hold_ms = str(sync_payload["config"].get("hold_press_duration_ms", 2000))

                        turn_en = "yes" if sync_payload["config"].get("turnstile_enabled") else "no"

                        turn_mode = str(sync_payload["config"].get("turnstile_mode", "forms"))

                        turn_theme = str(sync_payload["config"].get("turnstile_theme", "auto"))

                        xmlrpc_val = "yes" if sync_payload["config"].get("disable_xmlrpc") else "no"

                        xmlrpc_mode = "complete" if sync_payload["config"].get("disable_xmlrpc") else "off"

                        file_edit_val = "yes" if sync_payload["config"].get("disable_file_editing") else "no"

                        user_enum_val = "yes" if sync_payload["config"].get("prevent_user_enumeration") else "no"

                        wp_ver_val = "yes" if sync_payload["config"].get("hide_wp_version") else "no"

                        uploads_php_val = "yes" if sync_payload["config"].get("block_uploads_php") else "no"

                        sec_headers_val = "enabled" if sync_payload["config"].get("security_headers") else "disabled"

                        login_slug_val = str(sync_payload["config"].get("custom_login_slug", "")).strip()

                        hide_login_val = "yes" if sync_payload["config"].get("hide_login_url") else "no" 

                        php_code = f"""

                        $c = @mysqli_connect('127.0.0.1', 'root', '', 'mahabub');

                        if ($c) {{

                            $bl = json_decode('{b_str}', true);

                            $bl_ser = serialize($bl);

                            $c_val = '{c_str}';

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_local_blacklist_cache', '" . mysqli_real_escape_string($c, $bl_ser) . "', 'yes') ON DUPLICATE KEY UPDATE option_value = '" . mysqli_real_escape_string($c, $bl_ser) . "'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_blocked_countries', '" . mysqli_real_escape_string($c, $c_val) . "', 'yes') ON DUPLICATE KEY UPDATE option_value = '" . mysqli_real_escape_string($c, $c_val) . "'");

                            

                            $uam = '{uam_val}';

                            $rate_limit_val = '{rate_limit_val}';

                            $hold_en = '{hold_en}';

                            $hold_ms = '{hold_ms}';

                            $turn_en = '{turn_en}';

                            $turn_mode = '{turn_mode}';



                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_under_attack_mode', '$uam', 'yes') ON DUPLICATE KEY UPDATE option_value = '$uam'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_under_attack_mode', '$uam', 'yes') ON DUPLICATE KEY UPDATE option_value = '$uam'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_rate_limit', '$rate_limit_val', 'yes') ON DUPLICATE KEY UPDATE option_value = '$rate_limit_val'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_hold_press_enabled', '$hold_en', 'yes') ON DUPLICATE KEY UPDATE option_value = '$hold_en'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_hold_press_duration_ms', '$hold_ms', 'yes') ON DUPLICATE KEY UPDATE option_value = '$hold_ms'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_turnstile_enabled', '$turn_en', 'yes') ON DUPLICATE KEY UPDATE option_value = '$turn_en'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_turnstile_mode', '$turn_mode', 'yes') ON DUPLICATE KEY UPDATE option_value = '$turn_mode'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_turnstile_mode', '$turn_mode', 'yes') ON DUPLICATE KEY UPDATE option_value = '$turn_mode'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_turnstile_theme', '$turn_theme', 'yes') ON DUPLICATE KEY UPDATE option_value = '$turn_theme'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_turnstile_theme', '$turn_theme', 'yes') ON DUPLICATE KEY UPDATE option_value = '$turn_theme'");

                            

                            // Security Hardening Suite Options Sync

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_disable_xmlrpc', '{xmlrpc_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{xmlrpc_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_xmlrpc_mode', '{xmlrpc_mode}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{xmlrpc_mode}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_disable_file_editing', '{file_edit_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{file_edit_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_disable_file_editor', '{file_edit_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{file_edit_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_fw_prevent_user_enumeration', '{user_enum_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{user_enum_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_user_enumeration', '{'enabled' if xmlrpc_val == 'yes' else 'disabled'}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{'enabled' if xmlrpc_val == 'yes' else 'disabled'}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_hide_wp_version', '{wp_ver_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{wp_ver_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_block_uploads_php', '{uploads_php_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{uploads_php_val}'");

                            mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_security_headers', '{sec_headers_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{sec_headers_val}'");

                            if (!empty('{login_slug_val}') && '{hide_login_val}' === 'yes') {{

                                mysqli_query($c, "INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('waf_harden_login_rename', '{login_slug_val}', 'yes') ON DUPLICATE KEY UPDATE option_value = '{login_slug_val}'");

                            }} else {{

                                mysqli_query($c, "DELETE FROM wp_options WHERE option_name = 'waf_harden_login_rename'");

                            }}

                            

                            // Synchronize wp_waf_blacklist MySQL table

                            if (empty($bl)) {{

                                mysqli_query($c, "DELETE FROM wp_waf_blacklist");

                            }} else {{

                                $escaped = array_map(function($ip) use ($c) {{ return "'" . mysqli_real_escape_string($c, $ip) . "'"; }}, $bl);

                                $in_clause = implode(',', $escaped);

                                mysqli_query($c, "DELETE FROM wp_waf_blacklist WHERE ip NOT IN ($in_clause)");

                                foreach ($bl as $b_ip) {{

                                    $b_esc = mysqli_real_escape_string($c, $b_ip);

                                    $chk = mysqli_query($c, "SELECT id FROM wp_waf_blacklist WHERE ip = '$b_esc' LIMIT 1");

                                    if (mysqli_num_rows($chk) == 0) {{

                                        mysqli_query($c, "INSERT INTO wp_waf_blacklist (ip, reason, type, auto_blocked, blocked_at) VALUES ('$b_esc', 'Synced from MDefender-Pro Cloud', 'permanent', 0, NOW())");

                                    }}

                                }}

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



            def _sync_single_target(target_info):

                clean_url, api_key, site_token = target_info

                if not clean_url:

                    return

                try:

                    headers = {

                        "Content-Type": "application/json",

                        "User-Agent": "MDefender-Pro-CloudSync/1.0",

                    }

                    if api_key:

                        headers["Authorization"] = f"Bearer {api_key}"

                        headers["X-API-Key"] = api_key

                    if site_token:

                        headers["X-Site-Token"] = site_token



                    sep = "&" if "?" in clean_url else "?"

                    url_params = "waf_cloud_sync=1"

                    if api_key:

                        url_params += f"&api_key={api_key}"

                    if site_token:

                        url_params += f"&site_token={site_token}"



                    candidate_endpoints = [

                        f"{clean_url}/wp-json/waf-fw/v1/sync?{url_params}",

                        f"{clean_url}/?rest_route=/waf-fw/v1/sync&{url_params}",

                        f"{clean_url}{sep}{url_params}",

                        f"{clean_url}/index.php?{url_params}",

                    ]



                    # Match site-specific custom login slug and hide_login_url to prevent cross-site slug pollution
                    target_payload = dict(sync_payload)
                    target_config = dict(sync_payload.get("config", {}))
                    target_ws = None
                    for ws in w_sites:
                        dom = (ws.get("domain") or "").strip().rstrip("/")
                        ru = (ws.get("url") or "").strip().rstrip("/")
                        if (dom and dom in clean_url) or (ru and ru in clean_url):
                            target_ws = ws
                            break
                    if target_ws:
                        target_config["custom_login_slug"] = str(target_ws.get("custom_login_slug", "")).strip() if bool(target_ws.get("hide_login_url", False)) else ""
                        target_config["hide_login_url"] = bool(target_ws.get("hide_login_url", False))
                    else:
                        target_config["custom_login_slug"] = ""
                        target_config["hide_login_url"] = False
                    target_payload["config"] = target_config

                    for target_ep in candidate_endpoints:

                        try:

                            resp = requests.post(

                                target_ep,

                                json=target_payload,

                                headers=headers,

                                timeout=4.0,

                                verify=False,

                                allow_redirects=True

                            )

                            if resp.status_code == 200:

                                return

                        except Exception:

                            pass



                    # Fallback GET notification

                    fallback_ep = f"{clean_url}{sep}{url_params}"

                    try:

                        requests.get(

                            fallback_ep,

                            headers=headers,

                            timeout=2.5,

                            verify=False,

                            allow_redirects=True

                        )

                    except Exception:

                        pass

                except Exception:

                    pass



            if unique_targets:

                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor(max_workers=min(12, len(unique_targets) * 2)) as executor:

                    list(executor.map(_sync_single_target, unique_targets))

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





# -----------------------------------------------------------------------------

# WordPress Core Version & Integrity Management Endpoints

# -----------------------------------------------------------------------------

from src.services.wordpress_core_service import WordPressCoreService





class CorePolicyRequest(BaseModel):

    policy: str = "minor"





@router.get("/core/status")

async def get_wordpress_core_status(user=Depends(get_current_user)):

    """Fleet-wide WordPress Core versions, official WP.org release, and checksum integrity."""

    user_id = str(user.get("id") or user.get("_id") or "")

    svc = WordPressCoreService()

    matrix = svc.get_fleet_core_matrix(user_id=user_id)

    return success(matrix)





@router.post("/core/{website_id}/verify-checksums")

async def verify_site_core_checksums(website_id: str, user=Depends(get_current_user)):

    """Run real MD5 verification against official WordPress.org SVN release checksums."""

    get_owned_website(user, website_id)

    user_id = str(user.get("id") or user.get("_id") or "")

    svc = WordPressCoreService()

    try:

        report = svc.verify_website_core_checksums(website_id=website_id, user_id=user_id)

        return success(report)

    except Exception as e:

        raise HTTPException(status_code=400, detail=str(e))





@router.post("/core/{website_id}/auto-update-policy")

async def update_core_auto_update_policy(website_id: str, body: CorePolicyRequest, user=Depends(get_current_user)):

    """Configure auto-update policy (minor, all, disabled)."""

    get_owned_website(user, website_id)

    user_id = str(user.get("id") or user.get("_id") or "")

    svc = WordPressCoreService()

    res = svc.set_auto_update_policy(website_id=website_id, policy=body.policy, user_id=user_id)

    return success(res)





@router.post("/core/{website_id}/update")

async def update_site_core(website_id: str, user=Depends(get_current_user)):

    """Trigger 1-click update to the latest official stable WordPress release."""

    get_owned_website(user, website_id)

    user_id = str(user.get("id") or user.get("_id") or "")

    svc = WordPressCoreService()

    res = svc.update_core(website_id=website_id, user_id=user_id)

    return success(res)





@router.post("/core/update-all")

async def update_all_sites_core(user=Depends(get_current_user)):

    """Trigger bulk upgrade across all fleet sites to latest official stable WordPress release."""

    user_id = str(user.get("id") or user.get("_id") or "")

    svc = WordPressCoreService()

    res = svc.update_all_fleet(user_id=user_id)

    return success(res)

