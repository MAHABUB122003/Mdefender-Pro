"""Origin Validation and SSRF Prevention Service for MDefender Pro.

Validates customer-provided origin IP addresses and hostnames against:
- Loopback addresses (127.0.0.0/8, ::1)
- Private RFC 1918 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Link-local and cloud metadata endpoints (169.254.0.0/16, fe80::/10)
- Carrier-grade NAT (100.64.0.0/10)
- Multicast and reserved blocks (224.0.0.0/4, 240.0.0.0/4)
- MDefender Pro's own public and edge IPs to prevent routing loops.
"""

import ipaddress
import socket
import os
import re
from typing import Tuple, List, Optional
import httpx


FORBIDDEN_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),        # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),     # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),    # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / Cloud Metadata (AWS/GCP/DO)
    ipaddress.ip_network("100.64.0.0/10"),     # Carrier-Grade NAT
    ipaddress.ip_network("0.0.0.0/8"),         # Broadcast / Current Network
    ipaddress.ip_network("224.0.0.0/4"),       # Multicast
    ipaddress.ip_network("240.0.0.0/4"),       # Reserved
]

FORBIDDEN_IPV6_NETWORKS = [
    ipaddress.ip_network("::1/128"),           # Loopback
    ipaddress.ip_network("fc00::/7"),          # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),         # Link-local
    ipaddress.ip_network("::/128"),            # Unspecified
]

# Self-loop protection
MDEFENDER_EDGE_IP = os.getenv("WAF_EDGE_IP", "217.15.170.82")
MDEFENDER_HOSTNAMES = ["mdefender-pro.crafix.tech", "localhost"]


class OriginValidator:
    """Validates origin targets to ensure security and prevent SSRF attacks."""

    @staticmethod
    def is_ip_forbidden(ip_str: str) -> Tuple[bool, str]:
        """Check if an IP address belongs to any private, loopback, or cloud-metadata network."""
        try:
            ip_obj = ipaddress.ip_address(ip_str.strip())
        except ValueError:
            return True, f"Invalid IP address format: {ip_str}"

        if ip_obj.is_loopback:
            return True, "Loopback addresses (127.0.0.0/8, ::1) are strictly forbidden."

        if ip_obj.is_link_local:
            return True, "Link-local and cloud metadata addresses (169.254.0.0/16) are strictly forbidden."

        if ip_obj.is_private:
            return True, "Private RFC 1918 internal network addresses are forbidden for edge routing."

        if ip_obj.is_multicast or ip_obj.is_reserved:
            return True, "Multicast and reserved IP address blocks cannot be used as an origin."

        if isinstance(ip_obj, ipaddress.IPv4Address):
            for net in FORBIDDEN_NETWORKS:
                if ip_obj in net:
                    return True, f"IP belongs to prohibited network: {net}"
        elif isinstance(ip_obj, ipaddress.IPv6Address):
            for net in FORBIDDEN_IPV6_NETWORKS:
                if ip_obj in net:
                    return True, f"IPv6 belongs to prohibited network: {net}"

        # Prevent routing loops to MDefender itself
        if str(ip_obj) == MDEFENDER_EDGE_IP:
            return True, "Origin cannot point to MDefender Pro's own Edge Anycast IP."

        return False, "IP is safe and public."

    @classmethod
    def validate_origin(cls, origin: str) -> Tuple[bool, str, List[str]]:
        """Validate an origin IP or hostname. Resolves hostnames to verify against DNS rebinding."""
        if not origin:
            return False, "Origin server address is required.", []

        clean_origin = origin.strip().lower()
        clean_origin = re.sub(r"^https?:\/\/", "", clean_origin).split("/")[0].split(":")[0].strip()

        if not clean_origin:
            return False, "Origin server address cannot be empty.", []

        if clean_origin in MDEFENDER_HOSTNAMES:
            return False, "Origin cannot point to MDefender's own management domain.", []

        resolved_ips: List[str] = []

        # Case 1: Raw IP provided
        try:
            ipaddress.ip_address(clean_origin)
            is_forbidden, reason = cls.is_ip_forbidden(clean_origin)
            if is_forbidden:
                return False, reason, [clean_origin]
            return True, "Origin IP is valid and safe.", [clean_origin]
        except ValueError:
            pass

        # Case 2: Hostname provided — Resolve DNS to verify no DNS rebinding or private IP
        try:
            addr_info = socket.getaddrinfo(clean_origin, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for item in addr_info:
                ip = item[4][0]
                if ip not in resolved_ips:
                    resolved_ips.append(ip)
        except socket.gaierror as e:
            return False, f"Could not resolve origin hostname '{clean_origin}': {e}", []

        if not resolved_ips:
            return False, f"Origin hostname '{clean_origin}' has no valid IP address records.", []

        for ip in resolved_ips:
            is_forbidden, reason = cls.is_ip_forbidden(ip)
            if is_forbidden:
                return False, f"Hostname '{clean_origin}' resolves to forbidden destination {ip}: {reason}", resolved_ips

        return True, f"Origin hostname resolved safely to {', '.join(resolved_ips)}.", resolved_ips

    @classmethod
    async def check_origin_health(
        cls,
        origin_address: str,
        port: int = 443,
        ssl_mode: str = "strict",
        domain_name: Optional[str] = None,
        timeout_seconds: float = 8.0
    ) -> dict:
        """Perform real HTTP/HTTPS health probe against origin."""
        is_safe, msg, ips = cls.validate_origin(origin_address)
        if not is_safe:
            return {
                "healthy": False,
                "status_code": None,
                "latency_ms": None,
                "error": msg,
                "resolved_ips": ips
            }

        # Select protocol
        scheme = "https" if port == 443 or ssl_mode in ("full", "strict") else "http"
        probe_url = f"{scheme}://{origin_address}:{port}/"
        headers = {
            "User-Agent": "MDefender-Edge-HealthProbe/1.0",
            "Accept": "*/*",
        }
        if domain_name:
            headers["Host"] = domain_name

        verify_tls = (ssl_mode == "strict" and scheme == "https")

        start_time = socket.gettimeofday() if hasattr(socket, "gettimeofday") else None
        import time
        t0 = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=timeout_seconds, verify=verify_tls, follow_redirects=True) as client:
                resp = await client.get(probe_url, headers=headers)
                latency = round((time.perf_counter() - t0) * 1000, 2)
                is_healthy = resp.status_code < 500
                return {
                    "healthy": is_healthy,
                    "status_code": resp.status_code,
                    "latency_ms": latency,
                    "scheme": scheme,
                    "port": port,
                    "error": None if is_healthy else f"Origin returned server error HTTP {resp.status_code}",
                    "resolved_ips": ips
                }
        except httpx.ConnectTimeout:
            return {
                "healthy": False,
                "status_code": None,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "error": f"Connection timed out after {timeout_seconds}s.",
                "resolved_ips": ips
            }
        except httpx.ConnectError as e:
            return {
                "healthy": False,
                "status_code": None,
                "latency_ms": None,
                "error": f"Failed to connect to origin on port {port}: {str(e)}",
                "resolved_ips": ips
            }
        except Exception as e:
            return {
                "healthy": False,
                "status_code": None,
                "latency_ms": None,
                "error": str(e),
                "resolved_ips": ips
            }
