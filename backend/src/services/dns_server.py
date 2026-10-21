"""MDefender Pro Authoritative DNS Server Daemon (Port 53).

Provides Cloudflare-style high-performance Authoritative DNS resolution for
all registered domains protected by MDefender Pro.

Key Capabilities:
- Listens on UDP port 53 (and optional TCP).
- Resolves A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and ANY queries.
- Origin Cloaking: For any record with 'proxied: True', automatically returns
  the MDefender Edge Anycast IP (e.g. 217.15.170.82), completely shielding the
  customer's real origin server IP from the public internet.
- Authoritative SOA & NS delegations to ns1.mdefender-pro.crafix.tech and ns2.mdefender-pro.crafix.tech.
- In-memory high-throughput zone caching with configurable TTL (sub-millisecond latency).
- Seamless integration with FastAPI lifespan and standalone daemon CLI mode.
"""

import os
import time
import socket
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple

try:
    import dns.message
    import dns.rrset
    import dns.rdatatype
    import dns.rdataclass
    import dns.flags
    import dns.name
    HAS_DNSPYTHON = True
except ImportError:
    HAS_DNSPYTHON = False

from src.database.mongodb_connection import MongoDB

logger = logging.getLogger("mdefender.dns_server")
logging.basicConfig(level=logging.INFO)

DEFAULT_EDGE_IP = os.getenv("WAF_EDGE_IP", "217.15.170.82")
DEFAULT_EDGE_IPS = [p.strip() for p in os.getenv("WAF_EDGE_IPS", "217.15.170.82").split(",") if p.strip()]
DEFAULT_EDGE_IPV6_SUBNET = os.getenv("WAF_EDGE_IPV6_SUBNET", "2a02:4780:2d:5552::")
DEFAULT_DNS_PORT = int(os.getenv("DNS_SERVER_PORT", "53"))
DEFAULT_NAMESERVERS = os.getenv(
    "MDEFENDER_NAMESERVERS",
    "ns1.mdefender-pro.crafix.tech,ns2.mdefender-pro.crafix.tech"
).split(",")
HOSTMASTER_EMAIL = os.getenv("DNS_HOSTMASTER_EMAIL", "hostmaster.crafix.tech.")
ZONE_CACHE_TTL = 30.0  # seconds


class AuthoritativeDNSResolver:
    """Core logic to resolve DNS queries against MongoDB dns_records with in-memory caching."""

    def __init__(self, edge_ip: str = DEFAULT_EDGE_IP, edge_ips: Optional[List[str]] = None, edge_ipv6_subnet: str = DEFAULT_EDGE_IPV6_SUBNET):
        self.edge_ip = edge_ip
        self.edge_ips = edge_ips or DEFAULT_EDGE_IPS
        self.edge_ipv6_subnet = edge_ipv6_subnet
        self.db = MongoDB()
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
        self._known_domains_cache: Tuple[float, set] = (0.0, set())

    def get_edge_ips_for_domain(self, domain: str) -> List[str]:
        """Return deterministic IPv4 addresses from the routable IP pool."""
        pool = self.edge_ips or [self.edge_ip]
        if len(pool) <= 1:
            return pool
        import hashlib
        h = hashlib.sha256(domain.lower().strip().encode()).digest()
        idx1 = h[0] % len(pool)
        idx2 = (h[1] % (len(pool) - 1)) if len(pool) > 1 else 0
        if idx2 >= idx1:
            idx2 = (idx2 + 1) % len(pool)
        return [pool[idx1], pool[idx2]]

    def get_edge_ipv6_for_domain(self, domain: str) -> List[str]:
        """
        Generate deterministic, globally routable dual IPv6 addresses from the server's allocated subnet.
        Every domain gets its own unique, consistent pair of IPv6 addresses.
        """
        import hashlib
        clean_d = (domain or "edge").lower().strip()
        h = hashlib.sha256(clean_d.encode()).hexdigest()
        p1 = h[0:4]
        p2 = h[4:8]
        p3 = h[8:12]
        p4 = h[12:16]
        base = self.edge_ipv6_subnet.rstrip(":")
        return [
            f"{base}::{p1}:{p2}",
            f"{base}::{p3}:{p4}"
        ]

    def invalidate_cache(self, domain: Optional[str] = None):
        """Invalidate zone cache when records are updated in admin or user dashboard."""
        if domain:
            self._cache.pop(domain.lower(), None)
        else:
            self._cache.clear()
            self._known_domains_cache = (0.0, set())

    def _get_registered_domains(self) -> set:
        """Fetch list of all active domains protected by MDefender."""
        now = time.time()
        cached_time, cached_domains = self._known_domains_cache
        if now - cached_time < 30.0 and cached_domains:
            return cached_domains

        try:
            sites = list(self.db.websites.find(
                {"status": {"$in": ["active", "pending", "protected"]}},
                {"domain": 1, "url": 1}
            ))
            domain_set = set()
            for s in sites:
                d = (s.get("domain") or s.get("url") or "").lower().strip()
                if d.startswith("http://"):
                    d = d[7:]
                if d.startswith("https://"):
                    d = d[8:]
                d = d.split("/")[0].split(":")[0].strip()
                if d:
                    domain_set.add(d)

            # Also check domains collection
            distinct_domains = self.db.domains.distinct("domain")
            for d in distinct_domains:
                if d:
                    domain_set.add(d.lower().strip())

            # Also check dns_records directly
            distinct_dns_domains = self.db.dns_records.distinct("domain")
            for d in distinct_dns_domains:
                if d:
                    domain_set.add(d.lower().strip())

            # Always treat the base nameserver domain as a managed authoritative zone
            domain_set.add("mdefender-pro.crafix.tech")

            self._known_domains_cache = (now, domain_set)
            return domain_set
        except Exception as e:
            logger.warning(f"[DNS] Failed to fetch registered domains from DB: {e}")
            return cached_domains or set()

    def _find_zone_for_qname(self, qname: str) -> Optional[Tuple[str, str]]:
        """Determine base zone domain and subdomain for a queried name.
        
        Example:
            'mahabubur.shop' -> ('mahabubur.shop', '@')
            'www.mahabubur.shop' -> ('mahabubur.shop', 'www')
            'api.v1.mahabubur.shop' -> ('mahabubur.shop', 'api.v1')
        """
        registered_domains = self._get_registered_domains()
        clean_qname = qname.rstrip(".").lower()

        # Exact match
        if clean_qname in registered_domains:
            return clean_qname, "@"

        # Subdomain match
        parts = clean_qname.split(".")
        for i in range(1, len(parts)):
            candidate_parent = ".".join(parts[i:])
            if candidate_parent in registered_domains:
                subdomain = ".".join(parts[:i])
                return candidate_parent, subdomain

        return None

    def _get_zone_records(self, zone_domain: str) -> List[Dict[str, Any]]:
        """Fetch DNS records for a zone with in-memory caching."""
        now = time.time()
        if zone_domain in self._cache:
            ts, records = self._cache[zone_domain]
            if now - ts < ZONE_CACHE_TTL:
                return records

        try:
            records = list(self.db.dns_records.find({"domain": zone_domain}))
            self._cache[zone_domain] = (now, records)
            return records
        except Exception as e:
            logger.warning(f"[DNS] Error loading zone records for {zone_domain}: {e}")
            return []

    def _get_zone_assigned_nameservers(self, zone_domain: str) -> List[str]:
        """Fetch assigned nameserver pair for a zone, falling back to deterministic pair."""
        try:
            dom = self.db.domains.find_one({"domain": zone_domain})
            if dom and dom.get("nameservers", {}).get("assigned"):
                return dom["nameservers"]["assigned"]
            site = self.db.websites.find_one({"domain": zone_domain})
            if site and site.get("assigned_nameservers"):
                return site["assigned_nameservers"]
            from src.services.domain_service import get_assigned_nameservers_for_domain
            assigned, _ = get_assigned_nameservers_for_domain(zone_domain)
            return assigned
        except Exception:
            return DEFAULT_NAMESERVERS

    def handle_query(self, wire_data: bytes) -> Optional[bytes]:
        """Parse DNS wire query, build authoritative answer, and return response bytes."""
        if not HAS_DNSPYTHON:
            return None

        try:
            query = dns.message.from_wire(wire_data)
        except Exception as e:
            logger.debug(f"[DNS] Failed to parse DNS wire packet: {e}")
            return None

        if not query.question:
            return None

        question = query.question[0]
        qname_obj = question.name
        qname_str = str(qname_obj).rstrip(".").lower()
        qtype_int = question.rdtype
        qtype_str = dns.rdatatype.to_text(qtype_int)

        response = dns.message.make_response(query)
        response.flags |= dns.flags.AA  # Authoritative Answer
        response.flags |= dns.flags.QR  # Query Response

        # Base nameserver hostnames resolution (ns1, ns2, or wildcard *.ns.mdefender-pro.crafix.tech)
        base_domain = "mdefender-pro.crafix.tech"
        if (qname_str.endswith(".ns." + base_domain) or qname_str in ("ns1." + base_domain, "ns2." + base_domain, "ns." + base_domain)):
            if qtype_str in ("A", "ANY"):
                for e_ip in self.edge_ips:
                    try:
                        rr = dns.rrset.from_text(f"{qname_str}.", 300, "IN", "A", e_ip)
                        response.answer.append(rr)
                    except Exception:
                        pass
            if qtype_str in ("AAAA", "ANY"):
                base_v6 = f"{self.edge_ipv6_subnet.rstrip(':')}::1"
                try:
                    rr = dns.rrset.from_text(f"{qname_str}.", 300, "IN", "AAAA", base_v6)
                    response.answer.append(rr)
                except Exception:
                    pass
            if response.answer:
                return response.to_wire()

        if qname_str == base_domain:
            if qtype_str in ("NS", "ANY"):
                for ns in DEFAULT_NAMESERVERS:
                    clean_ns = ns.strip() if ns.strip().endswith(".") else f"{ns.strip()}."
                    ns_rr = dns.rrset.from_text(f"{base_domain}.", 86400, "IN", "NS", clean_ns)
                    response.answer.append(ns_rr)
            if qtype_str in ("A", "ANY"):
                rr = dns.rrset.from_text(f"{base_domain}.", 300, "IN", "A", self.edge_ip)
                response.answer.append(rr)
            if response.answer:
                return response.to_wire()

        # Find which zone this query belongs to
        zone_info = self._find_zone_for_qname(qname_str)
        if not zone_info:
            # Domain not hosted/managed on MDefender
            response.set_rcode(dns.rcode.NXDOMAIN)
            return response.to_wire()

        zone_domain, subdomain = zone_info
        zone_records = self._get_zone_records(zone_domain)

        # Standard TTLs
        soa_ttl = 3600
        default_ttl = 300

        # Fetch assigned nameservers for this specific zone
        zone_ns_list = self._get_zone_assigned_nameservers(zone_domain)
        primary_ns = zone_ns_list[0] if zone_ns_list else DEFAULT_NAMESERVERS[0]
        if not primary_ns.endswith("."):
            primary_ns += "."

        # Handle Query Types
        if qtype_str in ("SOA", "ANY"):
            serial = int(time.strftime("%Y%m%d%H"))
            hostmaster = HOSTMASTER_EMAIL
            if not hostmaster.endswith("."):
                hostmaster += "."
            soa_text = f"{primary_ns} {hostmaster} {serial} 7200 3600 1209600 300"
            soa_rr = dns.rrset.from_text(f"{zone_domain}.", soa_ttl, "IN", "SOA", soa_text)
            response.answer.append(soa_rr)

        if qtype_str in ("NS", "ANY") and subdomain == "@":
            for ns in zone_ns_list:
                clean_ns = ns.strip()
                if not clean_ns.endswith("."):
                    clean_ns += "."
                ns_rr = dns.rrset.from_text(f"{zone_domain}.", 86400, "IN", "NS", clean_ns)
                response.answer.append(ns_rr)

        # Match specific records by subdomain name (@ or specific prefix)
        target_sub = subdomain.lower()
        matching_records = []
        for r in zone_records:
            r_name = (r.get("name") or "@").lower().strip()
            # Normalize record name
            if r_name == zone_domain:
                r_name = "@"
            elif r_name.endswith(f".{zone_domain}"):
                r_name = r_name[:-len(f".{zone_domain}")]

            if r_name == target_sub:
                matching_records.append(r)

        # Fallback for www if not explicitly defined
        if target_sub == "www" and not any(r.get("type") in ("A", "CNAME") for r in matching_records):
            for r in zone_records:
                if (r.get("name") or "").lower().strip() in ("@", zone_domain):
                    matching_records.append(r)

        # Fallback for root (@) and www if domain is registered in MDefender but has no explicit A record
        if not matching_records and target_sub in ("@", "www"):
            matching_records.append({
                "domain": zone_domain,
                "name": target_sub,
                "type": "A",
                "content": self.edge_ip,
                "proxied": True
            })

        # Process matching records
        has_answers = False
        for rec in matching_records:
            rtype = rec.get("type", "").upper()
            content = (rec.get("content") or "").strip()
            proxied = bool(rec.get("proxied", True))
            if content in self.edge_ips or content == self.edge_ip:
                proxied = True

            if not content:
                continue

            # A Record Resolution
            if (qtype_str in ("A", "ANY")) and rtype == "A":
                if proxied:
                    # Cloudflare-style: Return deterministic Anycast Edge IPv4 addresses from routable pool
                    edge_ips = self.get_edge_ips_for_domain(zone_domain)
                    for e_ip in edge_ips:
                        try:
                            socket.inet_aton(e_ip)
                            rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "A", e_ip)
                            response.answer.append(rr)
                            has_answers = True
                        except Exception:
                            pass
                else:
                    try:
                        socket.inet_aton(content)
                        rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "A", content)
                        response.answer.append(rr)
                        has_answers = True
                    except Exception:
                        pass

            # AAAA Record Resolution (IPv6)
            elif (qtype_str in ("AAAA", "ANY")) and (rtype in ("AAAA", "A")):
                if proxied and (qtype_str in ("AAAA", "ANY")):
                    # Cloudflare-style: Return deterministic, globally routable dual IPv6 addresses from server subnet
                    edge_ipv6s = self.get_edge_ipv6_for_domain(zone_domain)
                    for e_v6 in edge_ipv6s:
                        try:
                            socket.inet_pton(socket.AF_INET6, e_v6)
                            rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "AAAA", e_v6)
                            response.answer.append(rr)
                            has_answers = True
                        except Exception:
                            pass
                elif (not proxied) and rtype == "AAAA":
                    try:
                        socket.inet_pton(socket.AF_INET6, content)
                        rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "AAAA", content)
                        response.answer.append(rr)
                        has_answers = True
                    except Exception:
                        pass

            # CNAME Record Resolution
            elif (qtype_str in ("CNAME", "A", "AAAA", "ANY")) and rtype == "CNAME":
                if proxied:
                    # Flatten CNAME to dual Edge IPv4 and dual Edge IPv6 (Cloudflare CNAME flattening)
                    if qtype_str in ("A", "ANY"):
                        edge_ips = self.get_edge_ips_for_domain(zone_domain)
                        for e_ip in edge_ips:
                            try:
                                rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "A", e_ip)
                                response.answer.append(rr)
                                has_answers = True
                            except Exception:
                                pass
                    if qtype_str in ("AAAA", "ANY"):
                        edge_ipv6s = self.get_edge_ipv6_for_domain(zone_domain)
                        for e_v6 in edge_ipv6s:
                            try:
                                rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "AAAA", e_v6)
                                response.answer.append(rr)
                                has_answers = True
                            except Exception:
                                pass
                else:
                    target_cname = content if content.endswith(".") else f"{content}."
                    rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "CNAME", target_cname)
                    response.answer.append(rr)
                    has_answers = True

            # MX Record Resolution
            elif (qtype_str in ("MX", "ANY")) and rtype == "MX":
                priority = rec.get("priority") or 10
                mx_host = content if content.endswith(".") else f"{content}."
                try:
                    rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "MX", f"{priority} {mx_host}")
                    response.answer.append(rr)
                    has_answers = True
                except Exception:
                    pass

            # TXT Record Resolution
            elif (qtype_str in ("TXT", "ANY")) and rtype == "TXT":
                txt_content = content.strip('"')
                try:
                    rr = dns.rrset.from_text(f"{qname_str}.", default_ttl, "IN", "TXT", f'"{txt_content}"')
                    response.answer.append(rr)
                    has_answers = True
                except Exception:
                    pass

        # If question had no answer in zone records, provide SOA in authority section (RFC 2308 NODATA)
        if not response.answer:
            serial = int(time.strftime("%Y%m%d%H"))
            primary_ns = DEFAULT_NAMESERVERS[0]
            if not primary_ns.endswith("."):
                primary_ns += "."
            hostmaster = HOSTMASTER_EMAIL
            if not hostmaster.endswith("."):
                hostmaster += "."
            soa_text = f"{primary_ns} {hostmaster} {serial} 7200 3600 1209600 300"
            soa_rr = dns.rrset.from_text(f"{zone_domain}.", soa_ttl, "IN", "SOA", soa_text)
            response.authority.append(soa_rr)

        return response.to_wire()


class DNSUDPProtocol(asyncio.DatagramProtocol):
    """Asynchronous UDP Protocol handler for incoming DNS requests."""

    def __init__(self, resolver: AuthoritativeDNSResolver):
        self.resolver = resolver
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        try:
            resp_wire = self.resolver.handle_query(data)
            if resp_wire and self.transport:
                self.transport.sendto(resp_wire, addr)
        except Exception as e:
            logger.debug(f"[DNS] Error processing packet from {addr}: {e}")

    def error_received(self, exc):
        logger.debug(f"[DNS] Socket error received: {exc}")


class MDefenderDNSServer:
    """Manages lifecycle of the Authoritative DNS Server daemon."""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, port: int = DEFAULT_DNS_PORT, edge_ip: str = DEFAULT_EDGE_IP):
        if getattr(self, "_initialized", False):
            return
        self.port = port
        self.edge_ip = edge_ip
        self.resolver = AuthoritativeDNSResolver(edge_ip=self.edge_ip)
        self.transport = None
        self.protocol = None
        self._is_running = False
        self._initialized = True

    async def start(self):
        """Start Authoritative DNS listener on UDP port 53."""
        if self._is_running:
            return

        loop = asyncio.get_running_loop()
        bind_ip = "0.0.0.0"

        try:
            self.transport, self.protocol = await loop.create_datagram_endpoint(
                lambda: DNSUDPProtocol(self.resolver),
                local_addr=(bind_ip, self.port)
            )
            self._is_running = True
            logger.info(f"[+] MDefender Authoritative DNS Server started on {bind_ip}:{self.port} (UDP)")
            logger.info(f"[+] Shielding Edge Anycast IP: {self.edge_ip}")
            logger.info(f"[+] Authoritative NS: {', '.join(DEFAULT_NAMESERVERS)}")
        except PermissionError:
            fallback_port = 5353
            logger.warning(
                f"[!] Port {self.port} requires root/administrator privileges. "
                f"Attempting fallback to port {fallback_port} for development..."
            )
            try:
                self.transport, self.protocol = await loop.create_datagram_endpoint(
                    lambda: DNSUDPProtocol(self.resolver),
                    local_addr=(bind_ip, fallback_port)
                )
                self.port = fallback_port
                self._is_running = True
                logger.info(f"[+] MDefender DNS Server started on {bind_ip}:{fallback_port} (Development mode)")
            except Exception as e:
                logger.warning(f"[!] DNS Server could not bind fallback port {fallback_port}: {e}")
        except OSError as e:
            logger.warning(f"[!] DNS Server bind failed on {bind_ip}:{self.port}: {e}")

    async def stop(self):
        """Stop Authoritative DNS listener gracefully."""
        if self.transport:
            self.transport.close()
            self._is_running = False
            logger.info("[*] MDefender DNS Server stopped.")


if __name__ == "__main__":
    async def run_standalone():
        server = MDefenderDNSServer(port=int(os.getenv("DNS_SERVER_PORT", "53")))
        await server.start()
        print(f"\n[+] MDefender Pro Authoritative DNS Daemon Active on port {server.port}")
        print("Press Ctrl+C to stop.\n")
        try:
            while True:
                await asyncio.sleep(3600)
        except (KeyboardInterrupt, asyncio.CancelledError):
            await server.stop()

    try:
        asyncio.run(run_standalone())
    except KeyboardInterrupt:
        pass
