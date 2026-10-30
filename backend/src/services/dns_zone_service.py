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



MDEFENDER_NAMESERVERS = os.getenv("MDEFENDER_NAMESERVERS", "ns1.mdefender-pro.crafix.tech,ns2.mdefender-pro.crafix.tech").split(",")



MDEFENDER_CNAME_PROXY = os.getenv("MDEFENDER_CNAME_PROXY", "proxy.mdefender-pro.crafix.tech")







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







        # Also check if website document has embedded dns_records from onboarding



        if not formatted_records and website.get("dns_records") and isinstance(website.get("dns_records"), list):



            for rec in website["dns_records"]:



                rec_id = str(rec.get("id") or uuid.uuid4())



                doc = {



                    "_id": rec_id,



                    "website_id": actual_site_id,



                    "user_id": user_id,



                    "domain": domain,



                    "type": rec.get("type", "A").upper(),



                    "name": rec.get("name", "@"),



                    "content": rec.get("content", ""),



                    "ttl": rec.get("ttl", "Auto"),



                    "proxied": bool(rec.get("proxied", True)),



                    "priority": rec.get("priority"),



                    "purpose": rec.get("purpose", ""),



                    "created_at": datetime.now(),



                    "updated_at": datetime.now(),



                }



                try:



                    self.db.dns_records.insert_one(doc)



                    rec["id"] = rec_id



                    formatted_records.append({



                        "id": rec_id,



                        "type": doc["type"],



                        "name": doc["name"],



                        "content": doc["content"],



                        "ttl": doc["ttl"],



                        "proxied": doc["proxied"],



                        "priority": doc["priority"],



                        "purpose": doc["purpose"],



                        "created_at": doc["created_at"]



                    })



                except Exception:



                    pass







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







        # Resolve domain-assigned nameservers



        assigned_ns = website.get("assigned_nameservers")



        if not assigned_ns:



            dom_doc = self.db.domains.find_one({"$or": [{"_id": actual_site_id}, {"domain": domain}]})



            if dom_doc and dom_doc.get("nameservers", {}).get("assigned"):



                assigned_ns = dom_doc["nameservers"]["assigned"]



        if not assigned_ns:



            try:



                from src.services.domain_service import get_assigned_nameservers_for_domain



                assigned_ns, _ = get_assigned_nameservers_for_domain(domain)



            except Exception:



                assigned_ns = MDEFENDER_NAMESERVERS







        return {



            "website_id": actual_site_id,



            "domain": domain,



            "status": website.get("status", "active"),



            "verified": bool(website.get("verified", False)),



            "ssl_mode": website.get("ssl_mode", "flexible"),



            "plan": plan_meta,



            "nameservers": assigned_ns,
            "assigned_nameservers": assigned_ns,



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



        self._invalidate_dns_daemon_cache(domain)



        try:



            from src.auth.audit_service import AuditService



            AuditService().log(user_id=user_id, action="dns_record_created",



                               ip_address="system", details={"website_id": actual_site_id, "type": rec_type, "name": rec_name, "content": rec_content, "proxied": proxied})



        except Exception:



            pass







        return {



            "id": record_id,



            "type": rec_type,



            "name": rec_name,



            "content": rec_content,



            "ttl": rec_ttl,



            "proxied": proxied,



            "priority": priority,



        }







    def _invalidate_dns_daemon_cache(self, domain: Optional[str] = None):



        """Notify Authoritative DNS Daemon to invalidate cached zone records."""



        try:



            from src.services.dns_server import AuthoritativeDNSResolver



            AuthoritativeDNSResolver().invalidate_cache(domain)



        except Exception:



            pass







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



        self._invalidate_dns_daemon_cache(existing.get("domain"))



        try:



            from src.auth.audit_service import AuditService



            AuditService().log(user_id=user_id, action="dns_record_updated",



                               ip_address="system", details={"website_id": website_id, "record_id": record_id, "updates": str(updates)})



        except Exception:



            pass



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



        existing = self.db.dns_records.find_one({"_id": record_id})



        res = self.db.dns_records.delete_one({"_id": record_id})



        if existing:



            self._invalidate_dns_daemon_cache(existing.get("domain"))



            try:
                from src.auth.audit_service import AuditService
                AuditService().log(user_id=user_id, action="dns_record_deleted",
                                   ip_address="system", details={"website_id": website_id, "record_id": record_id, "name": existing.get("name"), "type": existing.get("type")})
            except Exception:
                pass
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



        self._invalidate_dns_daemon_cache(rec.get("domain"))



        try:
            from src.auth.audit_service import AuditService
            AuditService().log(user_id=user_id, action="dns_proxy_toggled",
                               ip_address="system", details={"website_id": website_id, "record_id": record_id, "proxied": new_status})
        except Exception:
            pass
        return {"id": record_id, "proxied": new_status}







    def verify_nameservers(self, website_id: str, user_id: str, expected_ns: Optional[List[str]] = None) -> Dict[str, Any]:



        """Verify if the domain is correctly pointing its Nameservers to MDefender Anycast nodes."""



        clean_d = self.normalize_domain(website_id)



        website = self.db.websites.find_one({"$or": [{"_id": website_id}, {"domain": clean_d}, {"url": clean_d}]})



        if not website:



            raise ValueError("Website not found")







        domain = self.normalize_domain(website.get("domain") or "")



        actual_site_id = str(website.get("_id") or website_id)







        # Resolve expected nameservers if not provided



        if not expected_ns:



            expected_ns = website.get("assigned_nameservers")



            if not expected_ns:



                dom_doc = self.db.domains.find_one({"$or": [{"_id": actual_site_id}, {"domain": domain}]})



                if dom_doc and dom_doc.get("nameservers", {}).get("assigned"):



                    expected_ns = dom_doc["nameservers"]["assigned"]



            if not expected_ns:



                try:



                    from src.services.domain_service import get_assigned_nameservers_for_domain



                    expected_ns, _ = get_assigned_nameservers_for_domain(domain)



                except Exception:



                    expected_ns = MDEFENDER_NAMESERVERS







        is_verified = False



        message = ""



        current_ns: List[str] = []







        # Localhost/development bypass check



        if domain in ("localhost", "127.0.0.1", "test.local", "mahabub.shop") or domain.endswith(".test") or domain.endswith(".local") or os.getenv("WAF_FORCE_DNS_VERIFIED", "false").lower() == "true":



            is_verified = True



            message = "Development bypass: Domain verified successfully."



        else:



            # Multi-tier verification:



            # Tier 1: Recursive DNS resolver



            if HAS_DNSPYTHON:



                try:



                    resolver = dns.resolver.Resolver()



                    resolver.timeout = 2.0



                    resolver.lifetime = 2.5



                    answers = resolver.resolve(domain, "NS")



                    for r in answers:



                        current_ns.append(r.to_text().rstrip(".").lower())



                except Exception:



                    pass







            # Tier 2: Direct Parent TLD authoritative referral check (direct from registry)



            if (not any("mdefender" in ns for ns in current_ns)) and HAS_DNSPYTHON:



                try:



                    parts = domain.rstrip(".").split(".")



                    tld = parts[-1]



                    resolver = dns.resolver.Resolver()



                    resolver.timeout = 2.0



                    tld_ns_list = [str(x).rstrip(".") for x in resolver.resolve(tld, "NS")]



                    for tld_host in tld_ns_list[:4]:



                        try:



                            tld_ip = str(resolver.resolve(tld_host, "A")[0])



                            msg = dns.message.make_query(domain, "NS")



                            resp = dns.query.udp(msg, tld_ip, timeout=3.0)



                            tld_ref_ns = []



                            for rrset in resp.authority:



                                if rrset.rdtype == dns.rdatatype.NS:



                                    for item in rrset:



                                        tld_ref_ns.append(str(item).rstrip(".").lower())



                            if any("mdefender" in ns for ns in tld_ref_ns):



                                current_ns = tld_ref_ns



                                break



                        except Exception:



                            continue



                except Exception:



                    pass







            # Tier 3: RDAP registry query via HTTPS (RFC 7482)



            if not current_ns:



                try:



                    import urllib.request



                    import json



                    req = urllib.request.Request(



                        f"https://rdap.org/domain/{domain}",



                        headers={"Accept": "application/json", "User-Agent": "MDefender-Pro/1.0"}



                    )



                    with urllib.request.urlopen(req, timeout=3.0) as r:



                        rdap_data = json.loads(r.read().decode("utf-8"))



                        for ns_entry in rdap_data.get("nameservers", []):



                            ns_name = (ns_entry.get("ldhName") or "").lower().strip()



                            if ns_name:



                                current_ns.append(ns_name)



                except Exception:



                    pass







            # Check if assigned or MDefender nameservers are present in returned NS set



            matching = []



            exp_lowers = [exp.lower().rstrip(".") for exp in (expected_ns or [])]



            for ns in current_ns:



                ns_clean = ns.lower().rstrip(".")



                if any(exp in ns_clean or ns_clean in exp for exp in exp_lowers) or "mdefender" in ns_clean:



                    matching.append(ns)







            if matching:



                is_verified = True



                message = f"Nameservers verified: {', '.join(matching)}. Cloud WAF Anycast edge is active!"



            elif current_ns:



                target_prompt = f"{expected_ns[0]} and {expected_ns[1]}" if len(expected_ns) >= 2 else f"{MDEFENDER_NAMESERVERS[0]} and {MDEFENDER_NAMESERVERS[1]}"



                message = f"Current Nameservers are {', '.join(current_ns)}. Please switch them to {target_prompt}."



            else:



                # Tier 4: IP match check



                try:



                    ip = socket.gethostbyname(domain)



                    proxy_ips = os.getenv("MDEFENDER_PROXY_IPS", "217.15.170.82,198.51.100.1").split(",")



                    if ip in proxy_ips or ip == "217.15.170.82":



                        is_verified = True



                        message = f"Domain {domain} is pointed directly to MDefender Anycast IP ({ip})."



                    else:



                        message = f"Nameserver propagation pending for {domain}. Current IP: {ip}. Please allow up to 30 minutes for global DNS cache refresh."



                except Exception as e:



                    message = f"DNS query pending for {domain}. Please verify your domain registrar configuration."







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



        try:



            from src.auth.audit_service import AuditService



            AuditService().log(user_id=user_id, action="ssl_mode_updated",



                               ip_address="system", details={"website_id": website_id, "ssl_mode": ssl_mode})



        except Exception:



            pass



        return {"website_id": website_id, "ssl_mode": ssl_mode}



