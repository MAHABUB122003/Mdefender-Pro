"""MDefender Pro Website Security Audit & Port Diagnostics Service.

Performs comprehensive, non-intrusive security health assessments for websites:
- SSL / TLS Certificate validation and cipher strength
- HTTP Security Headers analysis (HSTS, CSP, X-Frame-Options, etc.)
- Server information exposure detection (Server, X-Powered-By, etc.)
- Sensitive paths & WordPress admin endpoint exposure checks
- Standard web and database port exposure scanning
- Cookie security flags (HttpOnly, Secure, SameSite)
- Overall security score (0-100), letter grade (A+ to F), and non-intimidating actionable guidance
"""

import socket
import ssl
import time
import re
from datetime import datetime, timezone
from urllib.parse import urlparse
import concurrent.futures
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


COMMON_PORTS = [
    {"port": 80, "service": "HTTP (Web)", "category": "web", "risk": "low", "desc": "Standard unencrypted web traffic."},
    {"port": 443, "service": "HTTPS (Secure Web)", "category": "web", "risk": "low", "desc": "Standard encrypted web traffic."},
    {"port": 8080, "service": "HTTP-Alt / Proxy", "category": "web", "risk": "medium", "desc": "Secondary web or development proxy port."},
    {"port": 8443, "service": "HTTPS-Alt / Admin", "category": "web", "risk": "medium", "desc": "Alternative secure web or control panel port."},
    {"port": 21, "service": "FTP (File Transfer)", "category": "management", "risk": "high", "desc": "Unencrypted file transfer. Recommend disabling in favor of SFTP."},
    {"port": 22, "service": "SSH (Secure Shell)", "category": "management", "risk": "medium", "desc": "Remote terminal access. Ensure key-based auth is enforced."},
    {"port": 25, "service": "SMTP (Mail)", "category": "mail", "risk": "medium", "desc": "Mail transfer service."},
    {"port": 3306, "service": "MySQL Database", "category": "database", "risk": "critical", "desc": "Direct database exposure. Should only be accessible via localhost/VPN."},
    {"port": 5432, "service": "PostgreSQL Database", "category": "database", "risk": "critical", "desc": "Direct database exposure. Should be firewalled from public internet."},
    {"port": 6379, "service": "Redis Cache", "category": "database", "risk": "critical", "desc": "Direct in-memory cache exposure. High vulnerability to unauthorized access."},
    {"port": 27017, "service": "MongoDB Database", "category": "database", "risk": "critical", "desc": "Direct NoSQL database exposure. Must be bound to private network."},
    {"port": 9200, "service": "Elasticsearch API", "category": "database", "risk": "critical", "desc": "Search cluster API exposure. Should not be publicly reachable without auth."},
]

SECURITY_HEADERS_DEF = [
    {
        "key": "Strict-Transport-Security",
        "name": "HTTP Strict Transport Security (HSTS)",
        "importance": "high",
        "weight": 15,
        "desc": "Forces client browsers to always connect via encrypted HTTPS.",
        "fix": "Enable HSTS in MDefender Pro or web server configuration with max-age=31536000."
    },
    {
        "key": "Content-Security-Policy",
        "name": "Content Security Policy (CSP)",
        "importance": "high",
        "weight": 20,
        "desc": "Mitigates Cross-Site Scripting (XSS) and data injection attacks by restricting script sources.",
        "fix": "Define a Content-Security-Policy header restricting script-src and object-src."
    },
    {
        "key": "X-Frame-Options",
        "name": "Clickjacking Protection (X-Frame-Options)",
        "importance": "high",
        "weight": 15,
        "desc": "Prevents malicious third-party websites from framing your site into invisible overlays.",
        "fix": "Set X-Frame-Options to 'SAMEORIGIN' or 'DENY'."
    },
    {
        "key": "X-Content-Type-Options",
        "name": "MIME-Sniffing Defense (X-Content-Type-Options)",
        "importance": "medium",
        "weight": 10,
        "desc": "Instructs browsers not to override the declared Content-Type header.",
        "fix": "Set X-Content-Type-Options to 'nosniff'."
    },
    {
        "key": "Referrer-Policy",
        "name": "Referrer Policy",
        "importance": "medium",
        "weight": 10,
        "desc": "Controls how much sensitive referrer metadata is sent with outbound requests.",
        "fix": "Set Referrer-Policy to 'strict-origin-when-cross-origin' or 'no-referrer-when-downgrade'."
    },
    {
        "key": "Permissions-Policy",
        "name": "Permissions Policy",
        "importance": "low",
        "weight": 5,
        "desc": "Restricts browser features such as microphone, camera, and geolocation sensors.",
        "fix": "Configure Permissions-Policy header to disable unused browser device APIs."
    },
]

SENSITIVE_PATHS = [
    {"path": "/wp-login.php", "name": "WordPress Login Portal", "risk": "medium", "desc": "Publicly accessible authentication portal. Recommend rate-limiting and MFA."},
    {"path": "/wp-admin/", "name": "WordPress Administration Area", "risk": "medium", "desc": "Admin control interface. Ensure 2FA and IP allowlisting."},
    {"path": "/xmlrpc.php", "name": "Legacy XML-RPC Interface", "risk": "high", "desc": "Common vector for automated brute-force and DDoS amplification."},
    {"path": "/.git/HEAD", "name": "Exposed Git Repository", "risk": "critical", "desc": "Direct exposure of source code repository metadata."},
    {"path": "/.env", "name": "Environment Config File", "risk": "critical", "desc": "Direct exposure of secret environment variables and API keys."},
    {"path": "/wp-config.php.bak", "name": "Backup Configuration File", "risk": "critical", "desc": "Direct exposure of database credentials and cryptographic salts."},
    {"path": "/robots.txt", "name": "Search Engine Directives", "risk": "info", "desc": "Standard crawler configuration."},
    {"path": "/readme.html", "name": "WordPress Readme File", "risk": "low", "desc": "Discloses core CMS version information to automated scanners."},
]


class SecurityScannerService:
    def __init__(self, timeout=2.5):
        self.timeout = timeout

    def normalize_url(self, raw_url: str):
        url = (raw_url or "").strip()
        if not url:
            raise ValueError("Target website URL is required")
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        parsed = urlparse(url)
        hostname = parsed.hostname or url.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
        scheme = parsed.scheme or "https"
        port_suffix = f":{parsed.port}" if parsed.port and parsed.port not in (80, 443) else ""
        return f"{scheme}://{hostname}{port_suffix}", hostname, scheme

    def _probe_single_port(self, hostname: str, item: dict):
        port = item["port"]
        is_open = False
        latency_ms = None
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.6)
            start = time.perf_counter()
            res = s.connect_ex((hostname, port))
            latency_ms = round((time.perf_counter() - start) * 1000, 1)
            s.close()
            if res == 0:
                is_open = True
        except Exception:
            is_open = False

        return {
            "port": port,
            "service": item["service"],
            "category": item["category"],
            "risk": item["risk"],
            "desc": item["desc"],
            "status": "open" if is_open else "closed",
            "latency_ms": latency_ms if is_open else None,
        }

    def scan_ports(self, hostname: str):
        results = []
        open_count = 0
        critical_count = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(16, len(COMMON_PORTS))) as executor:
            future_to_port = {executor.submit(self._probe_single_port, hostname, item): item for item in COMMON_PORTS}
            for future in concurrent.futures.as_completed(future_to_port):
                try:
                    res = future.result()
                    results.append(res)
                    if res["status"] == "open":
                        open_count += 1
                        if res["risk"] in ("critical", "high"):
                            critical_count += 1
                except Exception:
                    pass

        # Sort back in defined port order
        port_order = {item["port"]: idx for idx, item in enumerate(COMMON_PORTS)}
        results.sort(key=lambda r: port_order.get(r["port"], 999))

        return {
            "ports": results,
            "total_scanned": len(COMMON_PORTS),
            "open_count": open_count,
            "critical_exposed": critical_count,
        }

    def check_ssl(self, hostname: str, port=443):
        ssl_info = {
            "supported": False,
            "issuer": "",
            "subject": "",
            "valid_from": "",
            "valid_to": "",
            "days_remaining": 0,
            "tls_version": "",
            "cipher": "",
            "grade": "F",
            "message": "SSL/TLS connection could not be established",
        }
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = True
            ctx.verify_mode = ssl.CERT_REQUIRED
            with socket.create_connection((hostname, port), timeout=self.timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    tls_ver = ssock.version()
                    cipher_info = ssock.cipher()

                    issuer_dict = dict(x[0] for x in cert.get("issuer", ()))
                    subject_dict = dict(x[0] for x in cert.get("subject", ()))
                    issuer = issuer_dict.get("organizationName") or issuer_dict.get("commonName") or "Unknown Authority"
                    subject = subject_dict.get("commonName") or hostname

                    not_after_str = cert.get("notAfter", "")
                    not_before_str = cert.get("notBefore", "")

                    days_left = 0
                    if not_after_str:
                        exp_dt = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        now_utc = datetime.now(timezone.utc)
                        days_left = max(0, (exp_dt - now_utc).days)

                    ssl_info = {
                        "supported": True,
                        "issuer": issuer,
                        "subject": subject,
                        "valid_from": not_before_str,
                        "valid_to": not_after_str,
                        "days_remaining": days_left,
                        "tls_version": tls_ver or "TLSv1.3",
                        "cipher": cipher_info[0] if cipher_info else "AES-GCM",
                        "grade": "A+" if days_left > 30 and tls_ver in ("TLSv1.2", "TLSv1.3") else "B",
                        "message": f"Valid SSL/TLS certificate issued by {issuer} (Expires in {days_left} days).",
                    }
        except Exception as e:
            ssl_info["message"] = f"SSL check note: {str(e)[:120]}"

        return ssl_info

    def check_http_and_headers(self, base_url: str):
        headers_found = {}
        cookies_found = []
        server_exposure = []
        waf_detected = "None / Direct Origin"
        status_code = None
        final_url = base_url

        try:
            resp = requests.get(
                base_url,
                timeout=3.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MDefender-Pro/4.0 Security Scanner"},
                allow_redirects=True,
                verify=False,
            )
            status_code = resp.status_code
            final_url = resp.url
            headers_found = {k.lower(): v for k, v in resp.headers.items()}

            # Server exposure check
            if "server" in headers_found:
                server_exposure.append({"header": "Server", "value": headers_found["server"], "risk": "low", "desc": "Discloses web server software signature."})
            if "x-powered-by" in headers_found:
                server_exposure.append({"header": "X-Powered-By", "value": headers_found["x-powered-by"], "risk": "medium", "desc": "Discloses backend programming language/framework version."})
            if "x-aspnet-version" in headers_found:
                server_exposure.append({"header": "X-AspNet-Version", "value": headers_found["x-aspnet-version"], "risk": "medium", "desc": "Discloses Microsoft ASP.NET runtime version."})

            # WAF detection
            if "cf-ray" in headers_found or "cloudflare" in headers_found.get("server", "").lower():
                waf_detected = "Cloudflare Edge Network"
            elif "x-sucuri-id" in headers_found or "sucuri" in headers_found.get("server", "").lower():
                waf_detected = "Sucuri Cloud WAF"
            elif "x-amz-cf-id" in headers_found:
                waf_detected = "AWS CloudFront"
            elif "x-mdefender" in headers_found or "mdefender" in headers_found.get("server", "").lower():
                waf_detected = "MDefender Pro Active WAF Shield"

            # Cookie analysis
            for c in resp.cookies:
                cookies_found.append({
                    "name": c.name,
                    "secure": getattr(c, "secure", False),
                    "httponly": bool(c.has_nonstandard_attr("httponly") or c.has_nonstandard_attr("HttpOnly")),
                    "samesite": getattr(c, "samesite", "None") or "Unset",
                })

        except Exception:
            status_code = 0

        # Evaluate Defined Security Headers
        header_evaluations = []
        earned_score = 0
        total_weight = sum(h["weight"] for h in SECURITY_HEADERS_DEF)

        for h in SECURITY_HEADERS_DEF:
            k = h["key"].lower()
            present = k in headers_found
            val = headers_found.get(k, "")
            if present:
                earned_score += h["weight"]
            header_evaluations.append({
                "key": h["key"],
                "name": h["name"],
                "present": present,
                "value": val if present else None,
                "importance": h["importance"],
                "desc": h["desc"],
                "fix": h["fix"],
            })

        header_score_pct = round((earned_score / total_weight) * 100) if total_weight > 0 else 0

        return {
            "status_code": status_code,
            "final_url": final_url,
            "header_score": header_score_pct,
            "headers_evaluation": header_evaluations,
            "server_exposure": server_exposure,
            "waf_detected": waf_detected,
            "cookies": cookies_found,
        }

    def _probe_single_path(self, base_url: str, item: dict):
        target = f"{base_url.rstrip('/')}{item['path']}"
        status = 0
        is_exposed = False
        try:
            r = requests.head(target, timeout=1.5, allow_redirects=False, verify=False)
            status = r.status_code
            if status in (200, 301, 302, 401, 403):
                is_exposed = status in (200, 301, 302)
        except Exception:
            status = 0

        return {
            "path": item["path"],
            "name": item["name"],
            "risk": item["risk"],
            "desc": item["desc"],
            "http_status": status,
            "exposed": is_exposed,
        }

    def check_sensitive_paths(self, base_url: str):
        findings = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(12, len(SENSITIVE_PATHS))) as executor:
            future_to_path = {executor.submit(self._probe_single_path, base_url, item): item for item in SENSITIVE_PATHS}
            for future in concurrent.futures.as_completed(future_to_path):
                try:
                    findings.append(future.result())
                except Exception:
                    pass

        # Sort back in original list order
        path_order = {item["path"]: idx for idx, item in enumerate(SENSITIVE_PATHS)}
        findings.sort(key=lambda r: path_order.get(r["path"], 999))
        return findings

    def run_full_audit(self, target_url: str):
        clean_url, hostname, scheme = self.normalize_url(target_url)

        # 1. DNS Resolution
        ip_address = "Unknown"
        try:
            ip_address = socket.gethostbyname(hostname)
        except Exception:
            ip_address = "Unresolved"

        # 2. Run diagnostics concurrently in threads
        ssl_data = {"supported": False, "grade": "F", "message": "SSL not tested"}
        http_data = {"header_score": 0, "headers_evaluation": [], "server_exposure": [], "waf_detected": "Unknown"}
        port_data = {"ports": [], "total_scanned": 0, "open_count": 0, "critical_exposed": 0}
        path_data = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_ssl = executor.submit(self.check_ssl, hostname)
            future_http = executor.submit(self.check_http_and_headers, clean_url)
            future_ports = executor.submit(self.scan_ports, hostname)
            future_paths = executor.submit(self.check_sensitive_paths, clean_url)

            try:
                ssl_data = future_ssl.result(timeout=4.0)
            except Exception:
                ssl_data = {"supported": False, "grade": "F", "message": "SSL check timed out"}

            try:
                http_data = future_http.result(timeout=4.0)
            except Exception:
                http_data = {"header_score": 0, "headers_evaluation": [], "server_exposure": [], "waf_detected": "None / Direct Origin"}

            try:
                port_data = future_ports.result(timeout=4.0)
            except Exception:
                port_data = {"ports": [], "total_scanned": 12, "open_count": 0, "critical_exposed": 0}

            try:
                path_data = future_paths.result(timeout=4.0)
            except Exception:
                path_data = []

        # 3. Calculate Overall Security Score
        score = 100

        # Deductions
        if not ssl_data.get("supported"):
            score -= 30
        elif ssl_data.get("days_remaining", 0) < 15:
            score -= 10

        # Header score impact (up to 30 point swing)
        hdr_loss = round((100 - http_data.get("header_score", 0)) * 0.3)
        score -= hdr_loss

        # Critical ports exposure
        crit_ports = port_data.get("critical_exposed", 0)
        score -= min(crit_ports * 15, 30)

        # Sensitive paths exposed (e.g. .env or .git)
        for p in path_data:
            if p["exposed"]:
                if p["risk"] == "critical":
                    score -= 20
                elif p["risk"] == "high":
                    score -= 10
                elif p["risk"] == "medium":
                    score -= 5

        score = max(10, min(score, 100))

        if score >= 90:
            grade = "A+"
            grade_color = "#10b981"
            verdict = "Excellent Security Posture"
            summary_message = "Your website demonstrates robust security defenses. Minor recommendations are highlighted below."
        elif score >= 78:
            grade = "A"
            grade_color = "#3b82f6"
            verdict = "Strong Cyber Protection"
            summary_message = "Your origin is well-protected. Enabling additional security headers will achieve a flawless rating."
        elif score >= 60:
            grade = "B"
            grade_color = "#eab308"
            verdict = "Moderate Cyber Health"
            summary_message = "Your website is operational, but standard security hardening headers and port closures are recommended."
        elif score >= 40:
            grade = "C"
            grade_color = "#f97316"
            verdict = "Needs Security Hardening"
            summary_message = "Several sensitive endpoints or missing headers were detected. MDefender Pro 1-click hardening can resolve these instantly."
        else:
            grade = "F"
            grade_color = "#ef4444"
            verdict = "Immediate Hardening Recommended"
            summary_message = "Key security headers or exposed interfaces were detected. Activate MDefender Pro WAF & DDoS mitigation to shield your origin."

        return {
            "target_url": clean_url,
            "hostname": hostname,
            "ip_address": ip_address,
            "scanned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "score": score,
            "grade": grade,
            "grade_color": grade_color,
            "verdict": verdict,
            "summary_message": summary_message,
            "ssl": ssl_data,
            "http": http_data,
            "ports": port_data,
            "sensitive_paths": path_data,
        }
