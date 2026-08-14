"""v1 API: WAF decision engine, events, and dashboard stats.

Two audiences:
  - SDKs / plugins authenticate with a website-scoped API key and POST request
    metadata to /waf/analyze to receive an ALLOW/BLOCK decision.
  - Authenticated users query events and stats scoped to their websites.

Never return internal detection logic, model details, or scores to blocked
clients - the block page is rendered from a generic reason + reference ID.
"""

import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.engine.decision_engine import DecisionEngine
from src.engine.ml_detector import MLDetector
from src.security.ip_filter import IPFilter
from src.security.rate_limiter import RateLimiter
from src.services.notification_service import NotificationService
from src.utils.api_response import serialize, success

router = APIRouter(prefix="/waf", tags=["WAF"])


class WafAnalyzeRequest(BaseModel):
    request: dict = Field(..., description="Normalized request metadata")
    domain: str | None = None
    mode: str | None = None  # "monitor" | "protect" | "off"
    api_key: str | None = None


def _hostname(url_or_host):
    value = (url_or_host or "").strip().lower()
    value = value.split("://")[-1]
    value = value.split("/")[0].split("?")[0].split("#")[0]
    if ":" in value:
        value = value.split(":")[0]
    return value


def verify_api_key(db, api_key, domain=None):
    """Resolve an API key to (user_id, website_id, website). None if invalid."""
    if not api_key:
        return None
    api_key = api_key.strip()
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    record = db.api_keys.find_one({"key_hash": key_hash, "status": "active"})
    if record:
        website = db.websites.find_one({"_id": record.get("website_id")})
        if website:
            if domain:
                expected = _hostname(domain)
                if expected and expected not in ("localhost", "127.0.0.1") and \
                   _hostname(website.get("domain")) != expected and \
                   _hostname(website.get("url")) != expected:
                    return None
            return {
                "user_id": str(record.get("user_id", "")),
                "website_id": record.get("website_id"),
                "website": website,
            }

    # Also check if api_key is a User Master Account API key (e.g. md_...)
    user = db.users.find_one({"api_key": api_key})
    if user:
        user_id_str = str(user["_id"])
        expected = _hostname(domain) if domain else "localhost"
        website = None
        if domain:
            website = db.websites.find_one({
                "user_id": user_id_str,
                "$or": [
                    {"domain": {"$regex": f"^{expected}", "$options": "i"}},
                    {"url": {"$regex": f"://{expected}", "$options": "i"}},
                    {"domain": expected},
                ]
            })
        if not website:
            website = db.websites.find_one({"user_id": user_id_str})
        if not website:
            import uuid
            site_id = str(uuid.uuid4())
            now = datetime.now()
            site_name = domain or "WordPress Site"
            website = {
                "_id": site_id,
                "user_id": user_id_str,
                "name": site_name,
                "url": f"http://{expected}" if expected else "http://localhost",
                "domain": expected or "localhost",
                "platform": "wordpress",
                "status": "active",
                "protection_enabled": True,
                "waf_mode": "protect",
                "malware_scanner": True,
                "threat_level": "LOW",
                "verified": True,
                "connected_at": now,
                "last_activity": now,
                "created_at": now,
                "updated_at": now,
            }
            db.websites.insert_one(website)
            db.api_keys.insert_one({
                "website_id": site_id,
                "user_id": user_id_str,
                "key_hash": key_hash,
                "label": "wordpress_auto",
                "created_at": now,
                "status": "active",
                "last_used": now,
            })
        return {
            "user_id": user_id_str,
            "website_id": website["_id"],
            "website": website,
        }

    return None


@router.post("/analyze")
async def analyze(body: WafAnalyzeRequest, request: Request):
    db = MongoDB()
    auth_header = request.headers.get("Authorization", "")
    bearer_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    api_key = bearer_key or body.api_key or ""
    auth_data = verify_api_key(db, api_key, body.domain)
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    website = auth_data["website"]
    if not website.get("protection_enabled", True):
        return success({
            "decision": "ALLOW",
            "action": "allowed",
            "reason": "Protection paused",
            "risk_score": 0,
            "reference_id": None,
        })

    decision_engine = DecisionEngine()
    req_data = body.request or {}

    # Normalize: SDKs may send body as a raw string (preferred) or as an
    # object. The rule engine expects a raw string + Content-Type header.
    if isinstance(req_data.get("body"), (dict, list)):
        import json as _json
        headers = req_data.get("headers") or {}
        if not headers.get("Content-Type"):
            headers = {**headers, "Content-Type": "application/json"}
        req_data = {**req_data, "body": _json.dumps(req_data["body"]), "headers": headers}

    # Server-side context signals
    ip = req_data.get("ip", "")
    ip_filter = IPFilter()
    is_blacklisted = bool(ip) and (ip_filter.is_blacklisted(ip) or website.get("status") == "suspended")
    rate_limiter = RateLimiter()
    if ip:
        rate_limiter.increment(ip)
    is_rate_limited = bool(ip) and rate_limiter.is_rate_limited(ip)

    mode = body.mode or website.get("waf_mode", "protect")
    threshold_override = mode in ("monitor", "off")

    decision = decision_engine.evaluate(
        req_data,
        ip=ip,
        is_blacklisted=is_blacklisted,
        is_rate_limited=is_rate_limited,
        user_id=auth_data["user_id"],
        website_id=auth_data["website_id"],
        domain=body.domain,
        threshold_override=threshold_override,
    )

    # Persist a security event for every analyzed request (or at least every
    # meaningful one) so dashboards show real data.
    store_event(db, auth_data, req_data, decision, ip)

    # Update website last activity + threat level.
    db.websites.update_one(
        {"_id": auth_data["website_id"]},
        {"$set": {"last_activity": datetime.now(),
                  "threat_level": _threat_label(decision.get("risk_score", 0))}},
    )

    # Notify on critical blocks.
    if decision["decision"] == "BLOCK":
        try:
            NotificationService(db).notify(
                auth_data["user_id"],
                title="Attack blocked",
                message=f"{decision.get('attack_type') or 'Malicious request'} blocked on {body.domain or website.get('domain')}",
                category="critical_attack",
                website_id=auth_data["website_id"],
                data={"reference_id": decision["reference_id"], "risk_score": decision["risk_score"]},
            )
        except Exception:
            pass

    return success({
        "decision": decision["decision"],
        "action": decision["action"],
        "risk_score": decision["risk_score"],
        "risk_level": decision["risk_level"],
        "confidence": decision["confidence"],
        "reason": decision["reason"],
        "reference_id": decision["reference_id"],
        "attack_type": decision.get("attack_type"),
    })


def _threat_label(score):
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


def store_event(db, auth_data, req_data, decision, ip):
    try:
        event = {
            "user_id": auth_data["user_id"],
            "website_id": auth_data["website_id"],
            "timestamp": datetime.now(),
            "source_ip": ip,
            "method": req_data.get("method", "GET"),
            "endpoint": req_data.get("url", "/"),
            "attack_type": decision.get("attack_type"),
            "detection_source": _detection_source(decision),
            "risk_score": decision.get("risk_score", 0),
            "action": decision.get("action"),
            "status": decision.get("action"),
            "reference_id": decision.get("reference_id"),
            "user_agent": (req_data.get("headers") or {}).get("User-Agent", ""),
        }
        db.security_events.insert_one(event)
    except Exception:
        pass


def _detection_source(decision):
    signals = decision.get("signals", {})
    if signals.get("rule_matches"):
        return "rule"
    if signals.get("ml_probability", 0) >= 0.6:
        return "ml"
    return "combined"


# ---------- Events & stats (authenticated user) ----------

@router.get("/events")
async def list_events(request: Request, website_id: str | None = None,
                      user=Depends(get_current_user)):
    db = MongoDB()
    query = {"user_id": str(user["id"])}
    if website_id:
        get_owned_website(user, website_id)
        query["website_id"] = website_id
    params = dict(request.query_params)
    action = params.get("action")
    attack_type = params.get("attack_type")
    limit = min(int(params.get("limit", 50)), 200)
    if action:
        query["action"] = action
    if attack_type:
        query["attack_type"] = attack_type
    events = list(db.security_events.find(query).sort("timestamp", -1).limit(limit))
    return success({"events": [serialize(e) for e in events]})


@router.get("/overview")
async def overview(request: Request, website_id: str | None = None,
                   user=Depends(get_current_user)):
    db = MongoDB()
    user_id = str(user["id"])
    query = {"user_id": user_id}
    if website_id:
        get_owned_website(user, website_id)
        query["website_id"] = website_id

    total = db.security_events.count_documents(query)
    blocked = db.security_events.count_documents({**query, "action": "block"})
    allowed = db.security_events.count_documents({**query, "action": "allow"})
    rate_limited = db.security_events.count_documents({**query, "action": "rate_limit"})

    ml_detections = db.security_events.count_documents({**query, "detection_source": "ml"})
    rule_detections = db.security_events.count_documents({**query, "detection_source": "rule"})

    top_ips = list(db.security_events.aggregate([
        {"$match": query},
        {"$group": {"_id": "$source_ip", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]))
    top_endpoints = list(db.security_events.aggregate([
        {"$match": query},
        {"$group": {"_id": "$endpoint", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]))
    attack_types = list(db.security_events.aggregate([
        {"$match": query},
        {"$group": {"_id": "$attack_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]))

    return success({
        "total_events": total,
        "blocked": blocked,
        "allowed": allowed,
        "rate_limited": rate_limited,
        "ml_detections": ml_detections,
        "rule_detections": rule_detections,
        "top_attacking_ips": [{"ip": i["_id"], "count": i["count"]} for i in top_ips],
        "top_endpoints": [{"endpoint": e["_id"], "count": e["count"]} for e in top_endpoints],
        "attack_types": [{"type": a["_id"], "count": a["count"]} for a in attack_types],
    })


@router.get("/plugin-events")
async def plugin_events(request: Request, limit: int = 50,
                        action: str | None = None, attack_type: str | None = None):
    """Plugin-facing event feed. Authenticated with the website's API key;
    always scoped to that website regardless of query params."""
    db = MongoDB()
    auth_header = request.headers.get("Authorization", "")
    api_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    auth_data = verify_api_key(db, api_key)
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    query = {"website_id": auth_data["website_id"]}
    if action:
        query["action"] = action
    if attack_type:
        query["attack_type"] = attack_type
    events = list(db.security_events.find(query)
                  .sort("timestamp", -1)
                  .limit(min(limit, 200)))
    return success({"events": [serialize(e) for e in events]})
