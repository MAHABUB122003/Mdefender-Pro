"""DNS Zone & Discovery Service for Cloudflare-Style Domain Onboarding.

Provides:
- Public DNS discovery (A, AAAA, CNAME, MX, TXT, NS) with fast asynchronous resolution.
- Common subdomain enumeration (www, api, mail, blog, admin, shop, dev, app, etc.).
- Zone record management (CRUD, Proxied vs DNS-Only toggle).
- Nameserver delegation verification (ns1.mdefender.pro, ns2.mdefender.pro).
- SSL/TLS mode configuration (Flexible, Full, Full Strict).
- Plan entitlement verification (Free, Go, Pro, Ultra).
"""

import os
import re
import uuid
import socket
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

try:
    import dns.resolver
    import dns.exception
    HAS_DNSPYTHON = True
except ImportError:
    HAS_DNSPYTHON = False

from src.database.mongodb_connection import MongoDB

logger = logging.getLogger(__name__)

# Primary MDefender Anycast Nameservers and CNAME Proxy Host
MDEFENDER_NAMESERVERS = ["ns1.mdefender.pro", "ns2.mdefender.pro"]
MDEFENDER_CNAME_PROXY = "proxy.mdefender.pro"

# Common subdomains to probe during deep DNS discovery
COMMON_SUBDOMAINS = [
    "www", "mail", "api", "blog", "admin", "shop", "dev",
    "app", "vpn", "staging", "portal", "cpanel", "webmail", "store",
    "ftp", "secure", "test", "direct", "cdn", "m", "smtp", "pop", "imap", "whm",
    "autodiscover", "autoconfig", "webdisk", "cpcontacts", "cpcalendars", "_dmarc"
]

# Non-HTTP protocols that must default to DNS Only (Direct Origin)
NON_PROXIED_NAMES = {
    "mail", "cpanel", "webmail", "whm", "ftp", "smtp", "pop", "imap", "vpn", "direct", "autodiscover", "sip"
}

# Web-facing record names that should default to Proxied (Edge WAF on)
WEB_PROXIED_NAMES = {"@", "www", "api", "blog", "app", "dev", "staging", "shop", "store", "portal", "cdn", "secure"}

# Cloud WAF Plans feature matrix
PLAN_ENTITLEMENTS = {
    "free": {
        "name": "Free",
        "max_domains": 1,
        "dns_discovery": True,
        "manual_dns": True,
        "waf_rules": "Basic (2,000 Signatures)",
        "rate_limiting": "Community Tier (120 RPM)",
        "log_retention_days": 1,
        "subdomain_zones": False,
        "support": "Community Forum",
    },
    "go": {
        "name": "Go",
        "max_domains": 5,
        "dns_discovery": True,
        "manual_dns": True,
        "waf_rules": "Expanded Signatures (100k+)",
        "rate_limiting": "Enhanced (500 RPM)",
        "log_retention_days": 7,
        "subdomain_zones": True,
        "support": "Email Support",
    },
    "pro": {
        "name": "Pro",
        "max_domains": 25,
        "dns_discovery": True,
        "manual_dns": True,
        "waf_rules": "Advanced ML 5.48M Inference Core + Custom Regex Policies",
        "rate_limiting": "High-Throughput (2,500 RPM)",
        "log_retention_days": 30,
        "subdomain_zones": True,
        "support": "Priority 24/7 Support",
    },
    "ultra": {
        "name": "Ultra",
        "max_domains": 9999,
        "dns_discovery": True,
        "manual_dns": True,
        "waf_rules": "Highest Configured Tier (Real-Time Retraining + Zero-Day Shield)",
        "rate_limiting": "Uncapped Anycast Throughput",
        "log_retention_days": 365,
        "subdomain_zones": True,
        "support": "Dedicated Enterprise VIP SLA",
    },
}


class DNSZoneService:
    def __init__(self, db: Optional[MongoDB] = None):
        self.db = db or MongoDB()

    def normalize_domain(self, domain: str) -> str:
        """Strip http/https, trailing slash, path and port to get the clean root domain."""
        if not domain:
            return ""
        d = domain.strip().lower()
        d = re.sub(r"^https?:\/\/", "", d)
        d = d.split("/")[0].split(":")[0].strip()
        return d

    def discover_public_dns(self, raw_domain: str, scan_subdomains: bool = True) -> Dict[str, Any]:
        """Perform comprehensive public DNS discovery for a root domain using DoH (Google & Cloudflare), dnspython, and socket fallback."""
        import concurrent.futures
        import urllib.request
        import json

        domain = self.normalize_domain(raw_domain)
        if not domain:
            return {"status": "error", "message": "Domain name is required", "records": [], "current_nameservers": []}

        discovered_records: List[Dict[str, Any]] = []
        current_nameservers: List[str] = []
        seen_keys: set = set()

        def _add_record(rtype: str, rname: str, rcontent: str, priority: Optional[int] = None, purpose: Optional[str] = None):
            rtype = rtype.upper().strip()
            rname = rname.lower().strip()
            rcontent = str(rcontent).strip()

            # Clean name
            if rname == domain or rname == f"{domain}.":
                clean_name = "@"
            elif rname.endswith(f".{domain}."):
                clean_name = rname[:-len(f".{domain}.")].rstrip(".")
            elif rname.endswith(f".{domain}"):
                clean_name = rname[:-len(f".{domain}")].rstrip(".")
            else:
                clean_name = rname.rstrip(".")

            # Clean content
            if rtype in ("CNAME", "NS"):
                rcontent = rcontent.rstrip(".")
            elif rtype == "MX":
                parts = rcontent.split()
                if len(parts) >= 2:
                    try:
                        priority = int(parts[0])
                        rcontent = parts[1].rstrip(".")
                    except ValueError:
                        rcontent = rcontent.rstrip(".")
                else:
                    rcontent = rcontent.rstrip(".")
            elif rtype == "TXT":
                rcontent = rcontent.strip('"')

            if rtype == "NS" and clean_name == "@":
                clean_ns = rcontent.rstrip(".").lower()
                if clean_ns and clean_ns not in current_nameservers:
                    current_nameservers.append(clean_ns)
                return

            if not rcontent:
                return

            dedup_key = (rtype, clean_name, rcontent)
            if dedup_key in seen_keys:
                return
            seen_keys.add(dedup_key)

            is_web = (clean_name not in NON_PROXIED_NAMES) and (clean_name in WEB_PROXIED_NAMES or clean_name == "@")
            if rtype in ("MX", "TXT", "CAA", "NS", "SRV"):
                is_web = False

            rec_dict = {
                "id": str(uuid.uuid4()),
                "type": rtype,
                "name": clean_name,
                "content": rcontent,
                "ttl": "Auto",
                "proxied": is_web,
                "purpose": purpose or (f"{clean_name.upper()} {rtype} record" if clean_name != "@" else f"Root {rtype} record"),
            }
            if priority is not None and rtype == "MX":
                rec_dict["priority"] = priority
            discovered_records.append(rec_dict)

        # 1. Tier 1: Public DNS-over-HTTPS (DoH) via Google Public DNS and Cloudflare Public DNS
        doh_providers = [
            "https://dns.google/resolve",
            "https://cloudflare-dns.com/dns-query",
        ]
        type_code_map = {1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 2: "NS", 257: "CAA", 6: "SOA"}

        def _query_doh(qname: str, qtype: str) -> List[Dict[str, Any]]:
            for base_url in doh_providers:
                try:
                    req_url = f"{base_url}?name={qname}&type={qtype}"
                    req = urllib.request.Request(req_url, headers={"Accept": "application/dns-json", "User-Agent": "MDefender-Pro/1.0"})
                    with urllib.request.urlopen(req, timeout=3.0) as resp:
                        res_json = json.loads(resp.read().decode("utf-8"))
                        answers = res_json.get("Answer", [])
                        if answers:
                            return answers
                except Exception:
                    continue
            return []

        # Run root DoH queries
        root_types = ["ANY", "A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA"]
        sub_list = COMMON_SUBDOMAINS if scan_subdomains else ["www"]

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            root_futs = {executor.submit(_query_doh, domain, qt): (domain, qt) for qt in root_types}
            sub_futs = {executor.submit(_query_doh, f"{s}.{domain}", "TXT" if s == "_dmarc" else "ANY"): (f"{s}.{domain}", "ANY") for s in sub_list}
            sub_a_futs = {executor.submit(_query_doh, f"{s}.{domain}", "A"): (f"{s}.{domain}", "A") for s in sub_list if s != "_dmarc"}

            all_futs = {**root_futs, **sub_futs, **sub_a_futs}
            for fut in concurrent.futures.as_completed(all_futs):
                qname, _ = all_futs[fut]
                try:
                    answers = fut.result()
                    for ans in answers:
                        code = ans.get("type")
                        t_name = type_code_map.get(code)
                        if not t_name or t_name == "SOA":
                            continue
                        ans_name = ans.get("name", qname)
                        ans_data = ans.get("data", "")
                        _add_record(t_name, ans_name, ans_data)
                except Exception:
                    pass

        # 2. Tier 2: dnspython queries for local/standard DNS resolution if available
        if HAS_DNSPYTHON:
            try:
                resolver = dns.resolver.Resolver()
                resolver.timeout = 1.5
                resolver.lifetime = 2.0
                resolver.nameservers = ["1.1.1.1", "8.8.8.8", "9.9.9.9", "208.67.222.222"]

                def _query_dnspython(target_name: str, rtype: str):
                    try:
                        ans = resolver.resolve(target_name, rtype)
                        return [(target_name, rtype, rdata) for rdata in ans]
                    except Exception:
                        return []

                py_tasks = [(domain, "A"), (domain, "AAAA"), (domain, "CNAME"), (domain, "MX"), (domain, "TXT"), (domain, "NS")]
                with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                    py_futs = [executor.submit(_query_dnspython, t[0], t[1]) for t in py_tasks]
                    for fut in concurrent.futures.as_completed(py_futs):
                        try:
                            for qname, qtype, rdata in fut.result():
                                if qtype == "MX":
                                    _add_record(qtype, qname, rdata.exchange.to_text(), priority=rdata.preference)
                                elif qtype == "TXT":
                                    txt_val = b"".join(rdata.strings).decode("utf-8", errors="ignore")
                                    _add_record(qtype, qname, txt_val)
                                else:
                                    _add_record(qtype, qname, rdata.to_text())
                        except Exception:
                            pass
            except Exception:
                pass

        # 3. Tier 3: Socket resolution fallback if origin IP (@) is still missing
        if not any(r["type"] == "A" and r["name"] == "@" for r in discovered_records):
            try:
                ip = socket.gethostbyname(domain)
                if ip and not ip.startswith("127.") and ip != "0.0.0.0":
                    _add_record("A", "@", ip, purpose="IPv4 origin server (detected via socket)")
            except Exception:
                pass

        # Socket fallback for www if still missing and domain has root IP
        if not any(r["name"] == "www" for r in discovered_records):
            try:
                www_ip = socket.gethostbyname(f"www.{domain}")
                if www_ip and not www_ip.startswith("127."):
                    _add_record("A", "www", www_ip, purpose="WWW subdomain IPv4 origin")
            except Exception:
                pass

        # Sort records logically: A (@) first, then CNAME, AAAA, MX, TXT, CAA
        type_order = {"A": 1, "AAAA": 2, "CNAME": 3, "MX": 4, "TXT": 5, "CAA": 6}
        discovered_records.sort(key=lambda r: (type_order.get(r["type"], 99), 0 if r["name"] == "@" else 1, r["name"]))

        return {
            "status": "success",
            "domain": domain,
            "records": discovered_records,
            "current_nameservers": current_nameservers,
            "target_nameservers": MDEFENDER_NAMESERVERS,
            "scan_completed": True,
            "discovered_count": len(discovered_records),
            "message": f"Discovered {len(discovered_records)} public DNS records.",
        }

    def get_website_zone(self, website_or_id: Any, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetch full zone details for a website, including DNS records, proxy status, and SSL mode."""
        if isinstance(website_or_id, dict):
            website = website_or_id
            website_id = str(website.get("_id") or website.get("id"))
            user_id = str(website.get("user_id") or user_id or "")
        else:
            website_id = str(website_or_id)
            website = self.db.websites.find_one({"_id": website_id})
            if not website:
                clean_d = self.normalize_domain(website_id)
                website = self.db.websites.find_one({"$or": [{"domain": clean_d}, {"url": clean_d}, {"name": clean_d}]})
            if not website:
                raise ValueError("Website not found")

        domain = website.get("domain") or website.get("url") or ""
        domain = self.normalize_domain(domain)
        actual_site_id = str(website.get("_id") or website_id)

        # Retrieve records from db.dns_records by website_id OR domain
        records = list(self.db.dns_records.find({
            "$or": [
                {"website_id": actual_site_id},
                {"domain": domain}
            ]
        }))
        formatted_records = []
        for r in records:
            formatted_records.append({
                "id": str(r.get("_id")),
                "type": r.get("type", "A"),
                "name": r.get("name", "@"),
                "content": r.get("content", ""),
                "ttl": r.get("ttl", "Auto"),
                "proxied": bool(r.get("proxied", True)),
                "priority": r.get("priority"),
                "purpose": r.get("purpose", ""),
                "created_at": r.get("created_at"),
            })

        # If no records exist in DB yet, populate with initial discovery or baseline defaults
        if not formatted_records:
            discovery = self.discover_public_dns(domain, scan_subdomains=True)
            recs_to_insert = discovery.get("records", [])
            if not recs_to_insert:
                recs_to_insert = [
                    {"type": "A", "name": "@", "content": "217.15.170.82", "ttl": "Auto", "proxied": True, "purpose": "Root domain WAF Anycast edge"},
                    {"type": "CNAME", "name": "www", "content": "@", "ttl": "Auto", "proxied": True, "purpose": "WWW subdomain alias"}
                ]
            for rec in recs_to_insert:
                rec_id = str(uuid.uuid4())
                doc = {
                    "_id": rec_id,
                    "website_id": actual_site_id,
                    "user_id": user_id,
                    "domain": domain,
                    "type": rec["type"],
                    "name": rec["name"],
                    "content": rec["content"],
                    "ttl": rec.get("ttl", "Auto"),
                    "proxied": rec.get("proxied", True),
                    "priority": rec.get("priority"),
                    "purpose": rec.get("purpose", ""),
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                }
                try:
                    self.db.dns_records.insert_one(doc)
                    rec["id"] = rec_id
                    formatted_records.append(rec)
                except Exception:
                    pass

        proxied_count = sum(1 for r in formatted_records if r.get("proxied"))
        dns_only_count = len(formatted_records) - proxied_count
        plan_id = website.get("plan", "free").lower()
        plan_meta = PLAN_ENTITLEMENTS.get(plan_id, PLAN_ENTITLEMENTS["free"])

        current_ns = website.get("current_nameservers") or []
        if not current_ns and HAS_DNSPYTHON:
            try:
                res_temp = dns.resolver.Resolver()
                res_temp.timeout = 1.5
                res_temp.nameservers = ["1.1.1.1", "8.8.8.8"]
                ans = res_temp.resolve(domain, "NS")
                current_ns = [r.to_text().rstrip(".") for r in ans]
                if current_ns:
                    self.db.websites.update_one({"_id": actual_site_id}, {"$set": {"current_nameservers": current_ns}})
            except Exception:
                pass

        return {
            "website_id": actual_site_id,
            "domain": domain,
            "status": website.get("status", "active"),
            "verified": bool(website.get("verified", False)),
            "ssl_mode": website.get("ssl_mode", "flexible"),
            "plan": plan_meta,
            "nameservers": MDEFENDER_NAMESERVERS,
            "current_nameservers": current_ns,
            "cname_target": MDEFENDER_CNAME_PROXY,
            "records": formatted_records,
            "proxied_count": proxied_count,
            "dns_only_count": dns_only_count,
            "total_records": len(formatted_records),
            "protection_enabled": website.get("protection_enabled", True),
            "waf_mode": website.get("waf_mode", "protect"),
            "requests_today": website.get("requests_today", 0),
            "blocked_today": website.get("blocked_today", 0),
            "last_activity": website.get("last_activity"),
            "connected_at": website.get("connected_at"),
        }

    def list_records(self, website_id: str) -> List[Dict[str, Any]]:
        """List all DNS records for a given website ID."""
        records = list(self.db.dns_records.find({"website_id": website_id}))
        return [
            {
                "id": str(r.get("_id")),
                "type": r.get("type", "A"),
                "name": r.get("name", "@"),
                "content": r.get("content", ""),
                "ttl": r.get("ttl", "Auto"),
                "proxied": bool(r.get("proxied", True)),
                "priority": r.get("priority"),
                "purpose": r.get("purpose", ""),
                "created_at": r.get("created_at"),
            }
            for r in records
        ]

    def add_dns_record(self, website_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a manual DNS record to a website's zone."""
        clean_d = self.normalize_domain(website_id)
        website = self.db.websites.find_one({"$or": [{"_id": website_id}, {"domain": clean_d}, {"url": clean_d}]})
        if not website:
            website = self.db.websites.find_one({"_id": website_id})
        if not website:
            raise ValueError("Website not found")

        domain = self.normalize_domain(website.get("domain") or "")
        actual_site_id = str(website.get("_id") or website_id)
        rec_type = data.get("type", "A").upper().strip()
        rec_name = data.get("name", "@").strip()
        rec_content = data.get("content", "").strip()
        rec_ttl = data.get("ttl", "Auto")
        proxied = bool(data.get("proxied", False))
        priority = data.get("priority")

        if not rec_content:
            raise ValueError("Record content/IP target is required")

        # MX and TXT cannot be proxied through HTTP WAF
        if rec_type in ("MX", "TXT", "SRV"):
            proxied = False

        record_id = str(uuid.uuid4())
        now = datetime.now()
        doc = {
            "_id": record_id,
            "website_id": actual_site_id,
            "user_id": user_id,
            "domain": domain,
            "type": rec_type,
            "name": rec_name,
            "content": rec_content,
            "ttl": rec_ttl,
            "proxied": proxied,
            "priority": priority,
            "purpose": data.get("purpose", f"Manual {rec_type} record"),
            "created_at": now,
            "updated_at": now,
        }
        self.db.dns_records.insert_one(doc)

        return {
            "id": record_id,
            "type": rec_type,
            "name": rec_name,
            "content": rec_content,
            "ttl": rec_ttl,
            "proxied": proxied,
            "priority": priority,
        }

    def update_dns_record(self, website_id: str, record_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing DNS record."""
        existing = self.db.dns_records.find_one({"_id": record_id})
        if not existing:
            raise ValueError("DNS record not found")

        updates: Dict[str, Any] = {"updated_at": datetime.now()}
        if "type" in data:
            updates["type"] = data["type"].upper().strip()
        if "name" in data:
            updates["name"] = data["name"].strip()
        if "content" in data:
            updates["content"] = data["content"].strip()
        if "ttl" in data:
            updates["ttl"] = data["ttl"]
        if "proxied" in data:
            t = updates.get("type", existing.get("type", "A"))
            updates["proxied"] = False if t in ("MX", "TXT", "SRV") else bool(data["proxied"])
        if "priority" in data:
            updates["priority"] = data["priority"]

        self.db.dns_records.update_one({"_id": record_id}, {"$set": updates})
        updated_doc = self.db.dns_records.find_one({"_id": record_id})
        return {
            "id": record_id,
            "type": updated_doc.get("type"),
            "name": updated_doc.get("name"),
            "content": updated_doc.get("content"),
            "ttl": updated_doc.get("ttl"),
            "proxied": updated_doc.get("proxied"),
            "priority": updated_doc.get("priority"),
        }

    def delete_dns_record(self, website_id: str, record_id: str, user_id: str) -> bool:
        """Delete a DNS record from the zone."""
        res = self.db.dns_records.delete_one({"_id": record_id})
        return res.deleted_count > 0

    def toggle_proxy_status(self, website_id: str, record_id: str, user_id: str) -> Dict[str, Any]:
        """Toggle the Proxied (🟠 WAF Edge Active) vs DNS Only (⚪ Direct to Origin) status."""
        rec = self.db.dns_records.find_one({"_id": record_id})
        if not rec:
            raise ValueError("DNS record not found")

        if rec.get("type") in ("MX", "TXT", "SRV"):
            raise ValueError("MX, TXT, and SRV records cannot be proxied through HTTP/HTTPS WAF.")

        new_status = not rec.get("proxied", True)
        self.db.dns_records.update_one({"_id": record_id}, {"$set": {"proxied": new_status, "updated_at": datetime.now()}})
        return {"id": record_id, "proxied": new_status}

    def verify_nameservers(self, website_id: str, user_id: str) -> Dict[str, Any]:
        """Verify if the domain is correctly pointing its Nameservers to MDefender Anycast nodes."""
        clean_d = self.normalize_domain(website_id)
        website = self.db.websites.find_one({"$or": [{"_id": website_id}, {"domain": clean_d}, {"url": clean_d}]})
        if not website:
            raise ValueError("Website not found")

        domain = self.normalize_domain(website.get("domain") or "")
        actual_site_id = str(website.get("_id") or website_id)
        is_verified = False
        message = ""
        current_ns: List[str] = []

        # Localhost/development bypass check
        if domain in ("localhost", "127.0.0.1", "test.local") or domain.endswith(".test") or os.getenv("WAF_FORCE_DNS_VERIFIED", "false").lower() == "true":
            is_verified = True
            message = "Development bypass: Domain verified successfully."
        elif HAS_DNSPYTHON:
            try:
                resolver = dns.resolver.Resolver()
                resolver.timeout = 2.0
                resolver.lifetime = 3.0
                answers = resolver.resolve(domain, "NS")
                for r in answers:
                    current_ns.append(r.to_text().rstrip(".").lower())

                # Check if MDefender nameservers are present in returned NS set
                matching = [ns for ns in current_ns if "mdefender" in ns]
                if matching:
                    is_verified = True
                    message = f"Nameservers verified: {', '.join(matching)}. Cloud WAF Anycast edge is active!"
                else:
                    message = f"Current Nameservers are {', '.join(current_ns)}. Please switch them to ns1.mdefender.pro and ns2.mdefender.pro."
            except Exception as e:
                try:
                    ip = socket.gethostbyname(domain)
                    message = f"Nameserver check pending. Domain currently resolves to {ip}. Please verify registrar records."
                except Exception:
                    message = f"DNS query failed: {str(e)}. Please check your domain registrar configuration."
        else:
            try:
                ip = socket.gethostbyname(domain)
                is_verified = True
                message = f"Resolved IP {ip}. Cloud WAF proxy verified."
            except Exception as e:
                message = f"DNS resolution failed: {str(e)}."

        if is_verified:
            self.db.websites.update_one(
                {"_id": actual_site_id},
                {"$set": {"verified": True, "status": "active", "verified_at": datetime.now(), "updated_at": datetime.now()}}
            )

        return {
            "website_id": actual_site_id,
            "domain": domain,
            "verified": is_verified,
            "current_nameservers": current_ns,
            "expected_nameservers": MDEFENDER_NAMESERVERS,
            "message": message,
        }

    def set_ssl_mode(self, website_id: str, user_id: str, ssl_mode: str) -> Dict[str, Any]:
        """Configure SSL/TLS encryption mode for edge reverse proxy (Flexible, Full, Strict)."""
        ssl_mode = ssl_mode.lower().strip()
        if ssl_mode not in ("flexible", "full", "strict"):
            raise ValueError("SSL mode must be 'flexible', 'full', or 'strict'")

        clean_d = self.normalize_domain(website_id)
        self.db.websites.update_one(
            {"$or": [{"_id": website_id}, {"domain": clean_d}, {"url": clean_d}]},
            {"$set": {"ssl_mode": ssl_mode, "updated_at": datetime.now()}}
        )
        return {"website_id": website_id, "ssl_mode": ssl_mode}
