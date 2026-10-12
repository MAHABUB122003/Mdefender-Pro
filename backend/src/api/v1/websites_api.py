"""v1 API: websites + API keys.

Multi-tenant website management:
  - add / list / update / remove websites
  - generate scoped API keys (64 random chars, only displayed once)
  - rotate / revoke API keys
  - pause / resume protection
  - plan limits enforced server-side

Tenant isolation: every operation is scoped to the authenticated user.
"""

import hashlib
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.services.subscription_service import SubscriptionService
from src.services.dns_zone_service import DNSZoneService, PLAN_ENTITLEMENTS
from src.utils.api_response import serialize, success
from src.utils.api_key import generate_api_key

router = APIRouter(prefix="/websites", tags=["Websites"])

PLATFORMS = ["cloud", "wordpress", "node", "express", "react", "laravel", "python", "php", "other"]


class WebsiteCreate(BaseModel):
    name: str | None = None
    url: str | None = None
    domain: str | None = None
    platform: str = Field("cloud")
    plan: str = Field("free")
    ssl_mode: str = Field("flexible")
    dns_records: list[dict] | None = None


class WebsiteUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    domain: str | None = None
    platform: str | None = None
    plan: str | None = None
    ssl_mode: str | None = None


class DnsDiscoverRequest(BaseModel):
    domain: str
    scan_subdomains: bool = True


class DnsRecordCreate(BaseModel):
    type: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    content: str = Field(..., max_length=500)
    ttl: str = Field("Auto")
    proxied: bool = False
    priority: int | None = None
    purpose: str | None = None


class DnsRecordUpdate(BaseModel):
    type: str | None = None
    name: str | None = None
    content: str | None = None
    ttl: str | None = None
    proxied: bool | None = None
    priority: int | None = None
    purpose: str | None = None


class SslModeUpdate(BaseModel):
    ssl_mode: str


class ApiKeyCreate(BaseModel):
    label: str | None = None


def _key_hash(raw_key):
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _generate_raw_key():
    return generate_api_key()


def _website_out(doc):
    return serialize({
        "_id": doc["_id"],
        "name": doc.get("name", doc.get("domain", "")),
        "url": doc.get("url", doc.get("domain", "")),
        "domain": doc.get("domain", doc.get("url", "")),
        "platform": doc.get("platform", "cloud"),
        "plan": doc.get("plan", "free"),
        "ssl_mode": doc.get("ssl_mode", "flexible"),
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
    user_plan = subs.effective_plan(user)
    check = subs.check_website_limit(user, user_plan)
    if not check["allowed"]:
        raise HTTPException(status_code=403, detail=check["message"])

    raw_domain = body.domain or body.url or body.name or ""
    clean_domain = raw_domain.strip().lower()
    clean_domain = re.sub(r"^https?:\/\/", "", clean_domain).rstrip("/")
    clean_domain = clean_domain.split("/")[0].split(":")[0].strip()

    if not clean_domain:
        raise HTTPException(status_code=400, detail="A valid root domain name is required")

    platform = body.platform if body.platform in PLATFORMS else "cloud"
    selected_plan = (body.plan or "free").lower()
    ssl_mode = (body.ssl_mode or "flexible").lower()
    name = (body.name or clean_domain).strip()

    existing = db.websites.find_one({"$or": [{"url": clean_domain}, {"domain": clean_domain}]})
    if existing:
        raise HTTPException(status_code=409, detail=f"Website '{clean_domain}' is already registered")

    website_id = str(uuid.uuid4())
    now = datetime.now()
    raw_key = _generate_raw_key()
    website = {
        "_id": website_id,
        "user_id": str(user["id"]),
        "name": name,
        "url": clean_domain,
        "domain": clean_domain,
        "api_key": raw_key,
        "platform": platform,
        "plan": selected_plan,
        "ssl_mode": ssl_mode,
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
        raise HTTPException(status_code=409, detail=f"Website '{clean_domain}' is already registered")

    db.api_keys.insert_one({
        "website_id": website_id,
        "user_id": str(user["id"]),
        "key_hash": _key_hash(raw_key),
        "label": platform,
        "created_at": now,
        "status": "active",
        "last_used": None,
    })

    # Seed DNS records if provided, or run auto-discovery
    dns_svc = DNSZoneService(db)
    if body.dns_records and isinstance(body.dns_records, list):
        for rec in body.dns_records:
            rec_id = str(uuid.uuid4())
            db.dns_records.insert_one({
                "_id": rec_id,
                "website_id": website_id,
                "user_id": str(user["id"]),
                "domain": clean_domain,
                "type": rec.get("type", "A").upper(),
                "name": rec.get("name", "@"),
                "content": rec.get("content", ""),
                "ttl": rec.get("ttl", "Auto"),
                "proxied": bool(rec.get("proxied", False)),
                "priority": rec.get("priority"),
                "purpose": rec.get("purpose", ""),
                "created_at": now,
                "updated_at": now,
            })
    else:
        # Pre-seed with public DNS discovery
        try:
            discovery = dns_svc.discover_public_dns(clean_domain, scan_subdomains=True)
            for rec in discovery.get("records", []):
                db.dns_records.insert_one({
                    "_id": str(uuid.uuid4()),
                    "website_id": website_id,
                    "user_id": str(user["id"]),
                    "domain": clean_domain,
                    "type": rec["type"],
                    "name": rec["name"],
                    "content": rec["content"],
                    "ttl": rec.get("ttl", "Auto"),
                    "proxied": rec.get("proxied", True),
                    "priority": rec.get("priority"),
                    "purpose": rec.get("purpose", ""),
                    "created_at": now,
                    "updated_at": now,
                })
        except Exception:
            pass

    from src.auth.audit_service import AuditService
    try:
        AuditService().log(user_id=str(user["id"]), action="website_added",
                           ip_address="system", details={"website_id": website_id, "url": clean_domain, "plan": selected_plan})
    except Exception:
        pass

    return success({
        "website": _website_out(website),
        "api_key": raw_key,
        "message": "Website added. Store the API key now - it is shown only once.",
    })


@router.post("/dns/discover")
async def discover_dns(body: DnsDiscoverRequest, user=Depends(get_current_user)):
    """
    Public DNS discovery for onboarding. Performs public DNS queries (A, AAAA, CNAME, MX, TXT)
    and probes common subdomains.
    """
    dns_svc = DNSZoneService()
    discovery = dns_svc.discover_public_dns(body.domain, scan_subdomains=body.scan_subdomains)
    return success(discovery)


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
            "prefix": "",
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


@router.post("/{website_id}/verify-dns")
async def verify_dns(website_id: str, user=Depends(get_current_user)):
    """Verify domain DNS configuration (Nameservers, CNAME, or IP) for Cloudflare-style Anycast onboarding."""
    import socket
    import os
    website = get_owned_website(user, website_id)
    domain = website.get("domain") or website.get("url", "")
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip()

    db = MongoDB()
    dns_svc = DNSZoneService(db)
    resolved_ips = []
    is_verified = False
    verification_method = None
    diag_message = ""
    current_ns = []

    # 1. Nameserver check via DNSZoneService
    try:
        ns_res = dns_svc.verify_nameservers(website_id, str(user["id"]))
        current_ns = ns_res.get("current_nameservers", [])
        if ns_res.get("verified"):
            is_verified = True
            verification_method = "nameserver_delegation"
            diag_message = ns_res.get("message", "Nameservers verified successfully.")
    except Exception:
        pass

    # 2. Simulated/Localhost development bypass or public resolution if not already verified
    if not is_verified:
        if domain in ("localhost", "127.0.0.1", "test.local") or domain.endswith(".test"):
            is_verified = True
            verification_method = "local_dev_bypass"
            diag_message = f"Local test domain '{domain}' automatically verified for development."
        else:
            try:
                ip = socket.gethostbyname(domain)
                resolved_ips.append(ip)
                mdefender_proxy_ips = os.getenv("MDEFENDER_PROXY_IPS", "198.51.100.1,203.0.113.5").split(",")
                if ip in mdefender_proxy_ips or os.getenv("WAF_FORCE_DNS_VERIFIED", "false").lower() == "true":
                    is_verified = True
                    verification_method = "anycast_ip_match"
                    diag_message = f"Domain {domain} is successfully pointed to MDefender Anycast IP ({ip})."
                else:
                    diag_message = f"Domain {domain} currently resolves to {ip}. Please delegate nameservers to ns1.mdefender.pro & ns2.mdefender.pro."
            except Exception as e:
                diag_message = f"DNS resolution failed for {domain}: {str(e)}. Please check your registrar settings."

    if is_verified:
        db.websites.update_one(
            {"_id": website["_id"]},
            {"$set": {"verified": True, "status": "active", "verified_at": datetime.now(), "updated_at": datetime.now()}}
        )

    return success({
        "website_id": website_id,
        "domain": domain,
        "verified": is_verified,
        "method": verification_method,
        "current_nameservers": current_ns,
        "resolved_ips": resolved_ips,
        "nameservers": ["ns1.mdefender.pro", "ns2.mdefender.pro"],
        "cname_target": "proxy.mdefender.pro",
        "message": diag_message
    })


@router.get("/{website_id}/zone")
async def get_website_zone(website_id: str, user=Depends(get_current_user)):
    """Retrieve full DNS zone overview, plan entitlement, nameserver instructions, and DNS records."""
    website = get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    zone = dns_svc.get_website_zone(website)
    return success(zone)


@router.get("/{website_id}/dns")
async def list_dns_records(website_id: str, user=Depends(get_current_user)):
    """List all DNS records for a website zone."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    records = dns_svc.list_records(website_id)
    return success({"records": records, "count": len(records)})


@router.post("/{website_id}/dns")
async def add_dns_record(website_id: str, body: DnsRecordCreate, user=Depends(get_current_user)):
    """Add a manual DNS record to the website's zone."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    try:
        record = dns_svc.add_dns_record(
            website_id=website_id,
            user_id=str(user["id"]),
            data=body.dict()
        )
        return success({"record": record, "message": f"DNS record {record['type']} '{record['name']}' added successfully."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{website_id}/dns/{record_id}")
async def update_dns_record(website_id: str, record_id: str, body: DnsRecordUpdate, user=Depends(get_current_user)):
    """Update an existing DNS record."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    try:
        record = dns_svc.update_dns_record(
            website_id=website_id,
            record_id=record_id,
            user_id=str(user["id"]),
            data=body.dict(exclude_unset=True)
        )
        return success({"record": record, "message": "DNS record updated successfully."})
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{website_id}/dns/{record_id}")
async def delete_dns_record(website_id: str, record_id: str, user=Depends(get_current_user)):
    """Delete a DNS record."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    deleted = dns_svc.delete_dns_record(website_id=website_id, record_id=record_id, user_id=str(user["id"]))
    if not deleted:
        raise HTTPException(status_code=404, detail="DNS record not found")
    return success({"message": "DNS record deleted successfully."})


@router.post("/{website_id}/dns/{record_id}/toggle-proxy")
async def toggle_dns_proxy(website_id: str, record_id: str, user=Depends(get_current_user)):
    """Toggle the Proxied (Edge WAF Armed) vs DNS Only (Direct to Origin) status."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    try:
        record = dns_svc.toggle_proxy_status(website_id=website_id, record_id=record_id, user_id=str(user["id"]))
        state_str = "Proxied (Edge WAF Armed)" if record.get("proxied") else "DNS Only (Direct to Origin)"
        return success({"record": record, "message": f"Proxy status updated to {state_str}."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{website_id}/ssl")
async def update_ssl_mode(website_id: str, body: SslModeUpdate, user=Depends(get_current_user)):
    """Configure SSL/TLS encryption mode for edge reverse proxy (Flexible, Full, Strict)."""
    get_owned_website(user, website_id)
    dns_svc = DNSZoneService()
    try:
        updated = dns_svc.set_ssl_mode(website_id=website_id, user_id=str(user["id"]), ssl_mode=body.ssl_mode)
        return success({"ssl_mode": updated.get("ssl_mode"), "message": f"SSL mode updated to {body.ssl_mode}."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{website_id}/installation")
async def installation_instructions(website_id: str, user=Depends(get_current_user)):
    """Cloudflare-style Anycast Smart DNS and WordPress Plugin setup instructions."""
    website = get_owned_website(user, website_id)
    platform = website.get("platform", "other")
    domain = website.get("domain") or website.get("url", "")
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip()

    dns_proxy_steps = [
        "Log into your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.).",
        "Change your domain Nameservers to: ns1.mdefender.pro and ns2.mdefender.pro (OR add a CNAME record pointing to proxy.mdefender.pro).",
        "Wait 1–5 minutes for DNS propagation.",
        "Click 'Verify DNS' in your MDefender Pro dashboard.",
        "All incoming web traffic is now routed through MDefender's Sub-Millisecond Anycast WAF Edge!"
    ]

    instructions = {
        "wordpress": {
            "title": "WordPress Security (Dual Protection: Cloud WAF + Deep Endpoint Plugin)",
            "methods": [
                {
                    "name": "Method 1: Cloud Anycast Reverse Proxy (Recommended for DDoS & Edge WAF)",
                    "steps": dns_proxy_steps
                },
                {
                    "name": "Method 2: MDefender Pro WordPress Plugin (Deep File & Malware Scanning)",
                    "steps": [
                        "Download the official plugin: mdefender-pro.zip from your dashboard.",
                        "Upload and activate the plugin inside WordPress Admin (Plugins -> Add New -> Upload).",
                        "Navigate to MDefender Pro in the WordPress sidebar.",
                        f"Enter your Scoped API Key and click 'Connect'.",
                        "Automated file integrity, WordPress core checksums, and webshell scanning will start instantly."
                    ]
                }
            ]
        },
        "general": {
            "title": "Cloudflare-Style Smart Anycast Reverse Proxy (All Frameworks)",
            "methods": [
                {
                    "name": "Smart DNS / Anycast Reverse Proxy",
                    "steps": dns_proxy_steps
                }
            ]
        }
    }

    cfg = instructions["wordpress"] if platform == "wordpress" else instructions["general"]
    return success({
        "website_id": website_id,
        "domain": domain,
        "platform": platform,
        "nameservers": ["ns1.mdefender.pro", "ns2.mdefender.pro"],
        "cname_target": "proxy.mdefender.pro",
        **cfg
    })
