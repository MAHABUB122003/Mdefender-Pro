"""Domain Service and Lifecycle Orchestrator for MDefender Pro.

Implements Cloudflare-style custom domain onboarding:
1. Normalization & validation
2. Tenant quota enforcement (WordPress + Domains)
3. Cryptographic ownership token generation & verification (DNS TXT)
4. Nameserver provisioning & delegation checks
5. Asynchronous DNS discovery
6. SSRF-safe origin binding
7. Activation gate validation before WAF activation
8. Real metrics aggregation for dashboard overview
"""

import os
import re
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

try:
    import dns.resolver
    HAS_DNSPYTHON = True
except ImportError:
    HAS_DNSPYTHON = False

from src.database.mongodb_connection import MongoDB
from src.services.origin_validator import OriginValidator
from src.services.dns_zone_service import DNSZoneService

logger = logging.getLogger("mdefender.domain_service")

import hashlib

MDEFENDER_NAMESERVERS = os.getenv(
    "MDEFENDER_NAMESERVERS",
    "ns1.mdefender-pro.crafix.tech,ns2.mdefender-pro.crafix.tech"
).split(",")

# Cloudflare-style pool of 25 pairs (50 distinctive first names)
NAMESERVER_POOLS = [
    ("alex", "bella"),
    ("cameron", "cecelia"),
    ("damon", "elena"),
    ("felix", "grace"),
    ("harper", "isaac"),
    ("jasper", "kai"),
    ("leo", "matias"),
    ("noah", "olivia"),
    ("piper", "quinn"),
    ("riley", "samuel"),
    ("theo", "uma"),
    ("val", "wyatt"),
    ("xander", "yara"),
    ("zane", "atlas"),
    ("blake", "cora"),
    ("dante", "elias"),
    ("finn", "gemma"),
    ("hugo", "iris"),
    ("jude", "kira"),
    ("luca", "milo"),
    ("nora", "otis"),
    ("phoebe", "reed"),
    ("sloan", "tate"),
    ("uriel", "vance"),
    ("wren", "zion")
]
BASE_NS_DOMAIN = os.getenv("MDEFENDER_BASE_NS_DOMAIN", "ns.mdefender-pro.crafix.tech")


def get_assigned_nameservers_for_domain(clean_domain: str) -> Tuple[List[str], str]:
    """Deterministically assign a unique pair of nameservers (Cloudflare-style) for a given domain."""
    if not clean_domain:
        return (["ns1.mdefender-pro.crafix.tech", "ns2.mdefender-pro.crafix.tech"], "pair-edge-default")

    # Check if custom override exists in env
    env_ns = os.getenv("MDEFENDER_NAMESERVERS")
    if env_ns and "ns1." not in env_ns:
        parts = [p.strip() for p in env_ns.split(",") if p.strip()]
        if len(parts) >= 2:
            return (parts[:2], "custom-env")

    # Hash domain deterministically for a stable, unique pair
    h = int(hashlib.sha256(clean_domain.lower().encode("utf-8")).hexdigest(), 16)
    idx = h % len(NAMESERVER_POOLS)
    pair = NAMESERVER_POOLS[idx]
    pair_name = f"{pair[0]}-{pair[1]}"
    assigned = [f"{pair[0]}.{BASE_NS_DOMAIN}", f"{pair[1]}.{BASE_NS_DOMAIN}"]
    return (assigned, pair_name)

# Plan limits for protected websites (WordPress + Domains)
PLAN_LIMITS = {
    "free": 1,
    "go": 5,
    "pro": 10,
    "enterprise": 20,
    "premium": 10,
    "ultra": 9999
}


class DomainService:
    def __init__(self, db: Optional[MongoDB] = None):
        self.db = db or MongoDB()
        self.dns_zone_svc = DNSZoneService(self.db)

    @staticmethod
    def normalize_domain(raw_domain: str) -> str:
        """Strip protocol, port, paths, and www prefix to get the clean root domain."""
        if not raw_domain:
            return ""
        d = raw_domain.strip().lower()
        d = re.sub(r"^https?:\/\/", "", d)
        d = d.split("/")[0].split(":")[0].strip()
        if d.startswith("www."):
            d = d[4:]
        return d

    @staticmethod
    def is_valid_domain_name(domain: str) -> bool:
        """Validate standard FQDN hostname pattern."""
        if not domain or len(domain) > 253 or "." not in domain:
            return False
        # Disallow IP addresses directly as root domain names
        pattern = r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$"
        return bool(re.match(pattern, domain))

    def get_user_plan_limit(self, user_id: str) -> Tuple[str, int]:
        """Fetch the effective user plan and quota limit."""
        user = self.db.users.find_one({"_id": user_id}) if hasattr(self.db, "users") else None
        if not user:
            try:
                from bson import ObjectId
                user = self.db.users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                pass

        plan = "free"
        if user:
            plan = (user.get("plan") or "free").lower()

        limit = PLAN_LIMITS.get(plan, 1)
        return plan, limit

    def get_tenant_website_count(self, user_id: str) -> Tuple[int, int, int]:
        """Returns (total_websites, wordpress_count, custom_domains_count) for the tenant."""
        user_ids = [str(user_id)]
        try:
            from bson import ObjectId
            if ObjectId.is_valid(str(user_id)):
                user_ids.append(ObjectId(str(user_id)))
        except Exception:
            pass

        wp_count = self.db.websites.count_documents({
            "user_id": {"$in": user_ids},
            "platform": {"$regex": "^wordpress", "$options": "i"}
        })
        domains_count = self.db.websites.count_documents({
            "user_id": {"$in": user_ids},
            "platform": {"$not": {"$regex": "^wordpress", "$options": "i"}}
        })
        return wp_count + domains_count, wp_count, domains_count

    def create_domain(
        self,
        user_id: str,
        domain_name: str,
        origin_address: Optional[str] = None,
        origin_port: int = 443,
        ssl_mode: str = "strict",
        background_scan: bool = True
    ) -> Dict[str, Any]:
        """Phase 2: Onboard a new domain with plan check, token generation, and state machine."""
        clean_domain = self.normalize_domain(domain_name)
        if not self.is_valid_domain_name(clean_domain):
            raise ValueError(f"'{domain_name}' is not a valid root domain name. Example: example.com")

        # 1. Enforce Plan Quota (Unified across WordPress + Domains)
        plan_name, max_limit = self.get_user_plan_limit(user_id)
        current_total, wp_count, dom_count = self.get_tenant_website_count(user_id)

        if current_total >= max_limit:
            raise PermissionError(
                f"Website quota limit reached ({current_total}/{max_limit} websites used). "
                f"Your {plan_name.title()} plan allows up to {max_limit} protected website(s). "
                "Please upgrade your plan to connect additional domains."
            )

        # 2. Check for duplicate domain claims across tenants
        existing = self.db.domains.find_one({
            "domain": clean_domain,
            "status": {"$ne": "deleted"}
        })
        if existing:
            if existing.get("user_id") == user_id:
                return self.serialize_domain(existing)
            else:
                # If claimed by another user, check if active/verified
                if existing.get("status") in ("active", "verified"):
                    raise PermissionError(
                        f"Domain '{clean_domain}' is already registered and protected under another account. "
                        "If you are the rightful owner, please verify ownership or contact security support."
                    )

        # 3. Validate origin if supplied
        origin_info = {
            "address": origin_address or "",
            "port": origin_port,
            "ssl_mode": ssl_mode,
            "health_status": "unverified",
            "last_health_check_at": None,
            "error": None
        }
        if origin_address:
            is_safe, msg, _ = OriginValidator.validate_origin(origin_address)
            if not is_safe:
                raise ValueError(f"Invalid origin address: {msg}")
            origin_info["address"] = origin_address

        # 4. Generate unique ownership verification challenge
        token_secret = secrets.token_hex(16)
        verification_token = f"mdefender-verify={token_secret}"
        token_expires_at = datetime.now() + timedelta(days=3)

        domain_id = f"dom_{secrets.token_hex(8)}"
        now = datetime.now()

        assigned_ns, pair_name = get_assigned_nameservers_for_domain(clean_domain)
        doc = {
            "_id": domain_id,
            "domain_id": domain_id,
            "user_id": user_id,
            "domain": clean_domain,
            "status": "ownership_pending",
            "lifecycle_step": 2,
            "ownership": {
                "token": verification_token,
                "txt_host": f"_mdefender-challenge.{clean_domain}",
                "txt_value": verification_token,
                "verified": False,
                "verified_at": None,
                "expires_at": token_expires_at
            },
            "nameservers": {
                "assigned": assigned_ns,
                "pair_name": pair_name,
                "delegation_status": "pending",
                "verified": False,
                "last_checked_at": None,
                "detected_ns": []
            },
            "origin": origin_info,
            "ssl": {
                "status": "pending_issuance",
                "mode": ssl_mode,
                "issuer": "Let's Encrypt / MDefender Edge CA",
                "auto_renew": True
            },
            "waf": {
                "enabled": False,
                "mode": "protect",
                "bot_challenge_enabled": False
            },
            "metrics": {
                "total_requests": 0,
                "blocked_requests": 0,
                "last_measured_latency_ms": None,
                "latency_p95_ms": None,
                "measurement_window": "1h"
            },
            "created_at": now,
            "updated_at": now
        }

        self.db.domains.insert_one(doc)

        # Sync to legacy websites collection for unified dashboard listing
        legacy_website = {
            "_id": domain_id,
            "user_id": user_id,
            "domain": clean_domain,
            "name": clean_domain,
            "url": clean_domain,
            "platform": "domain",
            "plan": plan_name,
            "ssl_mode": ssl_mode,
            "status": "pending",
            "verified": False,
            "bot_challenge_enabled": False,
            "origin_server": origin_address or "",
            "assigned_nameservers": assigned_ns,
            "nameserver_pair": pair_name,
            "added_at": now,
            "connected_at": now,
            "updated_at": now
        }
        self.db.websites.replace_one({"_id": domain_id}, legacy_website, upsert=True)

        # 5. Enqueue Initial DNS Discovery
        if background_scan:
            self.enqueue_dns_discovery(domain_id, clean_domain, user_id)

        return self.serialize_domain(doc)

    def enqueue_dns_discovery(self, domain_id: str, domain_name: str, user_id: str):
        """Enqueue asynchronous DNS discovery job."""
        job_id = f"job_dns_{secrets.token_hex(6)}"
        now = datetime.now()
        job_doc = {
            "_id": job_id,
            "domain_id": domain_id,
            "user_id": user_id,
            "type": "dns_discovery",
            "status": "running",
            "created_at": now,
            "updated_at": now
        }
        self.db.domain_jobs.insert_one(job_doc)

        try:
            # Run discovery
            discovery_result = self.dns_zone_svc.discover_public_dns(domain_name, scan_subdomains=True)
            records = discovery_result.get("records", [])

            # Persist discovered records to db.dns_records
            for rec in records:
                rec_id = str(uuid.uuid4())
                r_type = rec.get("type", "A").upper()
                r_name = rec.get("name", "@")
                r_content = rec.get("content", "")
                r_proxied = bool(rec.get("proxied", True))

                # Auto-set origin IP if discovered and not yet set
                if r_name == "@" and r_type == "A" and r_content:
                    is_safe, _, _ = OriginValidator.validate_origin(r_content)
                    if is_safe:
                        self.db.domains.update_one(
                            {"_id": domain_id, "origin.address": ""},
                            {"$set": {"origin.address": r_content, "origin.health_status": "healthy"}}
                        )

                doc = {
                    "_id": rec_id,
                    "domain_id": domain_id,
                    "website_id": domain_id,
                    "user_id": user_id,
                    "domain": domain_name,
                    "type": r_type,
                    "name": r_name,
                    "content": r_content,
                    "ttl": rec.get("ttl", "Auto"),
                    "proxied": r_proxied,
                    "priority": rec.get("priority"),
                    "purpose": rec.get("purpose", f"Discovered {r_type} record"),
                    "source": "discovered",
                    "reviewed": False,
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
                self.db.dns_records.replace_one(
                    {"domain": domain_name, "type": r_type, "name": r_name, "content": r_content},
                    doc,
                    upsert=True
                )

            # Update job and domain state
            self.db.domain_jobs.update_one(
                {"_id": job_id},
                {"$set": {"status": "completed", "records_found": len(records), "updated_at": datetime.now()}}
            )
            self.db.domains.update_one(
                {"_id": domain_id},
                {"$set": {"lifecycle_step": 3, "nameservers.detected_ns": discovery_result.get("current_nameservers", [])}}
            )
        except Exception as e:
            logger.error(f"DNS discovery failed for {domain_name}: {e}")
            self.db.domain_jobs.update_one(
                {"_id": job_id},
                {"$set": {"status": "failed", "error": str(e), "updated_at": datetime.now()}}
            )

    def verify_ownership(self, domain_id: str, user_id: str) -> Dict[str, Any]:
        """Phase 4: Verify domain ownership via DNS TXT record challenge."""
        domain = self.get_owned_domain(domain_id, user_id)
        token_info = domain.get("ownership", {})
        expected_token = token_info.get("token")
        expected_host = token_info.get("txt_host")
        clean_domain = domain.get("domain")

        if not expected_token:
            raise ValueError("No ownership token was issued for this domain.")

        # Check expiration
        expires_at = token_info.get("expires_at")
        if expires_at and datetime.now() > expires_at:
            raise ValueError("Verification token has expired. Please regenerate a new token.")

        # Check live DNS TXT record for expected token
        txt_records_found = []
        is_verified = False

        # Query host directly (e.g. _mdefender-challenge.domain.com and domain.com)
        hosts_to_query = [expected_host, clean_domain]

        # Tier 1: Public DoH
        import urllib.request
        import json
        for host in hosts_to_query:
            try:
                url = f"https://dns.google/resolve?name={host}&type=TXT"
                req = urllib.request.Request(url, headers={"Accept": "application/dns-json"})
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    data = json.loads(resp.read().decode())
                    for ans in data.get("Answer", []):
                        val = ans.get("data", "").strip('"').strip()
                        txt_records_found.append(val)
                        if expected_token in val:
                            is_verified = True
                            break
            except Exception:
                pass
            if is_verified:
                break

        # Tier 2: dnspython fallback
        if not is_verified and HAS_DNSPYTHON:
            try:
                resolver = dns.resolver.Resolver()
                resolver.timeout = 2.0
                resolver.nameservers = ["1.1.1.1", "8.8.8.8"]
                for host in hosts_to_query:
                    try:
                        answers = resolver.resolve(host, "TXT")
                        for r in answers:
                            txt_str = b"".join(r.strings).decode("utf-8", errors="ignore").strip()
                            txt_records_found.append(txt_str)
                            if expected_token in txt_str:
                                is_verified = True
                                break
                    except Exception:
                        pass
                    if is_verified:
                        break
            except Exception:
                pass

        if is_verified:
            now = datetime.now()
            self.db.domains.update_one(
                {"_id": domain_id},
                {"$set": {
                    "ownership.verified": True,
                    "ownership.verified_at": now,
                    "status": "verified",
                    "lifecycle_step": 4,
                    "updated_at": now
                }}
            )
            return {
                "verified": True,
                "message": f"Ownership of domain '{clean_domain}' verified successfully!",
                "verified_at": now.isoformat()
            }
        else:
            return {
                "verified": False,
                "message": f"TXT token not detected yet on {expected_host}. Please ensure the TXT record has propagated.",
                "expected_host": expected_host,
                "expected_value": expected_token,
                "detected_records": txt_records_found
            }

    def check_delegation(self, domain_id: str, user_id: str) -> Dict[str, Any]:
        """Phase 5: Check whether registrar has delegated nameservers to MDefender."""
        domain = self.get_owned_domain(domain_id, user_id)
        clean_domain = domain.get("domain")
        assigned_ns = domain.get("nameservers", {}).get("assigned") or get_assigned_nameservers_for_domain(clean_domain)[0]

        res = self.dns_zone_svc.verify_nameservers(clean_domain, user_id, expected_ns=assigned_ns)
        is_delegated = res.get("verified", False)
        detected_ns = res.get("current_nameservers", [])

        now = datetime.now()
        updates = {
            "nameservers.detected_ns": detected_ns,
            "nameservers.last_checked_at": now,
            "nameservers.delegation_status": "verified" if is_delegated else "waiting_delegation",
            "nameservers.verified": is_delegated,
            "updated_at": now
        }
        if is_delegated and domain.get("status") in ("verified", "nameservers_assigned", "waiting_delegation", "ownership_pending", "pending"):
            updates["status"] = "delegation_verified"
            updates["lifecycle_step"] = 7
            updates["ssl.status"] = "pending_issuance"

        self.db.domains.update_one({"_id": domain_id}, {"$set": updates})

        # Also sync legacy websites table
        if is_delegated:
            self.db.websites.update_one(
                {"_id": domain_id},
                {"$set": {"verified": True, "updated_at": now}}
            )
            # Auto-trigger Universal SSL generation for the newly verified domain
            try:
                from src.services.ssl_service import UniversalSSLService
                UniversalSSLService().trigger_automated_ssl_provisioning(clean_domain)
            except Exception as ssl_err:
                logger.warning(f"Auto-SSL trigger warning for {clean_domain}: {ssl_err}")

        return {
            "delegated": is_delegated,
            "assigned_nameservers": assigned_ns,
            "detected_nameservers": detected_ns,
            "status": "delegation_verified" if is_delegated else "waiting_delegation",
            "message": res.get("message")
        }

    async def update_and_check_origin(
        self,
        domain_id: str,
        user_id: str,
        origin_address: str,
        port: int = 443,
        ssl_mode: str = "strict"
    ) -> Dict[str, Any]:
        """Phase 6: Update origin configuration with SSRF validation and live health check."""
        domain = self.get_owned_domain(domain_id, user_id)
        clean_domain = domain.get("domain")

        # 1. SSRF and Address Validation
        is_safe, msg, ips = OriginValidator.validate_origin(origin_address)
        if not is_safe:
            raise ValueError(f"Origin validation failed: {msg}")

        # 2. Real Health Probe
        health = await OriginValidator.check_origin_health(
            origin_address=origin_address,
            port=port,
            ssl_mode=ssl_mode,
            domain_name=clean_domain
        )

        now = datetime.now()
        origin_doc = {
            "address": origin_address,
            "port": port,
            "ssl_mode": ssl_mode,
            "resolved_ips": ips,
            "health_status": "healthy" if health.get("healthy") else "unhealthy",
            "last_health_check_at": now,
            "http_status_code": health.get("status_code"),
            "latency_ms": health.get("latency_ms"),
            "error": health.get("error")
        }

        updates: Dict[str, Any] = {
            "origin": origin_doc,
            "ssl.mode": ssl_mode,
            "updated_at": now
        }
        if health.get("healthy") and domain.get("status") == "delegation_verified":
            updates["status"] = "origin_verified"
            updates["lifecycle_step"] = 8

        self.db.domains.update_one({"_id": domain_id}, {"$set": updates})

        # Keep legacy website table origin_server in sync
        self.db.websites.update_one(
            {"_id": domain_id},
            {"$set": {"origin_server": origin_address, "ssl_mode": ssl_mode, "updated_at": now}}
        )

        return {
            "origin": origin_doc,
            "health": health
        }

    def activate_domain(self, domain_id: str, user_id: str) -> Dict[str, Any]:
        """Phase 7: Activation Gate. Validates all prerequisite checks before arming WAF."""
        domain = self.get_owned_domain(domain_id, user_id)

        # 1. Check ownership verified
        if not domain.get("ownership", {}).get("verified"):
            # Check if domain was verified via nameserver delegation directly
            if not domain.get("nameservers", {}).get("verified"):
                raise ValueError("Domain ownership is not verified yet. Please complete the TXT verification step.")

        # 2. Check nameserver delegation
        if not domain.get("nameservers", {}).get("verified"):
            raise ValueError("Nameserver delegation is pending. Please update your domain registrar nameservers.")

        # 3. Check origin health
        origin = domain.get("origin", {})
        if not origin.get("address"):
            raise ValueError("Origin server address is required before activating protection.")

        if origin.get("health_status") == "unhealthy":
            raise ValueError(f"Origin health check failed: {origin.get('error')}. Please verify origin server.")

        now = datetime.now()
        self.db.domains.update_one(
            {"_id": domain_id},
            {"$set": {
                "status": "active",
                "lifecycle_step": 10,
                "waf.enabled": True,
                "ssl.status": "active",
                "activated_at": now,
                "updated_at": now
            }}
        )

        # Update legacy website
        self.db.websites.update_one(
            {"_id": domain_id},
            {"$set": {
                "status": "active",
                "verified": True,
                "protection_enabled": True,
                "updated_at": now
            }}
        )

        return {
            "status": "active",
            "waf_armed": True,
            "message": f"Domain '{domain.get('domain')}' is now actively protected by MDefender Pro Edge WAF!"
        }

    def pause_domain(self, domain_id: str, user_id: str) -> Dict[str, Any]:
        """Pause edge WAF protection for domain."""
        domain = self.get_owned_domain(domain_id, user_id)
        now = datetime.now()
        self.db.domains.update_one(
            {"_id": domain_id},
            {"$set": {"status": "paused", "waf.enabled": False, "updated_at": now}}
        )
        self.db.websites.update_one(
            {"_id": domain_id},
            {"$set": {"status": "paused", "protection_enabled": False, "updated_at": now}}
        )
        return {"status": "paused", "waf_armed": False, "message": "Domain protection paused."}

    def delete_domain(self, domain_id: str, user_id: str) -> bool:
        """Remove domain and clean up its DNS records."""
        domain = self.get_owned_domain(domain_id, user_id)
        clean_d = domain.get("domain")

        self.db.domains.delete_one({"_id": domain_id})
        self.db.websites.delete_one({"_id": domain_id})
        self.db.dns_records.delete_many({"$or": [{"domain_id": domain_id}, {"domain": clean_d}]})

        # Invalidate DNS daemon cache
        try:
            from src.services.dns_server import AuthoritativeDNSResolver
            AuthoritativeDNSResolver().invalidate_cache(clean_d)
        except Exception:
            pass

        return True

    def get_dashboard_overview(self, user_id: str) -> Dict[str, Any]:
        """Phase 8: Return tenant-scoped overview metrics for the Domains dashboard."""
        plan_name, plan_limit = self.get_user_plan_limit(user_id)
        total_used, wp_count, dom_count = self.get_tenant_website_count(user_id)

        # Reconcile orphan domains: purge any db.domains records whose website was deleted
        active_domains_in_websites = set(
            w.get("domain") for w in self.db.websites.find({"user_id": user_id}) if w.get("domain")
        )
        self.db.domains.delete_many({
            "user_id": user_id,
            "domain": {"$nin": list(active_domains_in_websites)}
        })

        all_domains = list(self.db.domains.find({"user_id": user_id, "status": {"$ne": "deleted"}}))

        active_count = sum(1 for d in all_domains if d.get("status") == "active" or d.get("waf", {}).get("enabled"))
        pending_count = sum(1 for d in all_domains if d.get("status") in ("ownership_pending", "waiting_delegation", "draft", "verified"))

        # Real request metrics
        total_requests = sum(d.get("metrics", {}).get("total_requests", 0) for d in all_domains)
        blocked_requests = sum(d.get("metrics", {}).get("blocked_requests", 0) for d in all_domains)

        # Real measured latency (returns None if awaiting live traffic)
        latency_samples = [
            d.get("metrics", {}).get("last_measured_latency_ms")
            for d in all_domains
            if d.get("metrics", {}).get("last_measured_latency_ms") is not None
        ]
        avg_latency = round(sum(latency_samples) / len(latency_samples), 2) if latency_samples else None

        edge_status = "Armed & Active" if active_count > 0 else "Awaiting Configuration"
        latency_display = f"{avg_latency}ms" if avg_latency is not None else "Awaiting Traffic"

        return {
            "total_domains": len(all_domains),
            "active_protected_domains": active_count,
            "pending_delegation": pending_count,
            "wordpress_sites": wp_count,
            "total_protected_websites": total_used,
            "website_limit": plan_limit,
            "remaining_slots": max(0, plan_limit - total_used),
            "plan_name": plan_name,
            "edge_status": edge_status,
            "measured_latency_ms": avg_latency,
            "latency_display": latency_display,
            "measurement_window": "1h",
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "nameservers": MDEFENDER_NAMESERVERS
        }

    def get_owned_domain(self, domain_id_or_name: str, user_id: str) -> Dict[str, Any]:
        """Fetch domain ensuring tenant isolation. Raises 404/403 appropriately."""
        clean_name = self.normalize_domain(domain_id_or_name)
        doc = self.db.domains.find_one({
            "$or": [{"_id": domain_id_or_name}, {"domain": clean_name}]
        })
        if not doc:
            raise KeyError(f"Domain '{domain_id_or_name}' not found.")
        if doc.get("user_id") != user_id:
            raise PermissionError("Access denied: You do not own this domain.")
        return doc

    def list_user_domains(self, user_id: str) -> List[Dict[str, Any]]:
        """List all domains belonging to a specific tenant."""
        active_domains_in_websites = set(
            w.get("domain") for w in self.db.websites.find({"user_id": user_id}) if w.get("domain")
        )
        self.db.domains.delete_many({
            "user_id": user_id,
            "domain": {"$nin": list(active_domains_in_websites)}
        })
        docs = list(self.db.domains.find({"user_id": user_id, "status": {"$ne": "deleted"}}))
        return [self.serialize_domain(d) for d in docs]

    def serialize_domain(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Format domain document for JSON response."""
        res = dict(doc)
        res["id"] = str(res.get("_id"))
        if "_id" in res:
            res["_id"] = str(res["_id"])
        if "created_at" in res and isinstance(res["created_at"], datetime):
            res["created_at"] = res["created_at"].isoformat()
        if "updated_at" in res and isinstance(res["updated_at"], datetime):
            res["updated_at"] = res["updated_at"].isoformat()
        return res
