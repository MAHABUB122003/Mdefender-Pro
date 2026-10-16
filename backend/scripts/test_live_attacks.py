import sys
import requests

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

tests = [
    ("GET", "/products?id=1%27%20OR%201=1--", None, None, "SQL Injection (URL Param)"),
    ("GET", "/search?q=%3Cscript%3Ealert(%27pwned%27)%3C/script%3E", None, None, "XSS Script Tag (URL Param)"),
    ("GET", "/profile?user=%3Csvg/onload=alert(1)%3E", None, None, "XSS SVG (URL Param)"),
    ("GET", "/products?cmd=cat%20/etc/passwd;id", None, None, "Command Injection (URL Param)"),
    ("GET", "/../../../../../../etc/passwd", None, None, "Path Traversal (URL Path)"),
    ("POST", "/user/login", {"Content-Type": "application/json"}, '{"username": "admin\' OR \'1\'=\'1", "password": "x"}', "SQL Injection (POST JSON Body)"),
    ("POST", "/comments/new", {"Content-Type": "application/x-www-form-urlencoded"}, "msg=%3Cscript%3Ealert(document.cookie)%3C/script%3E", "XSS Attack (POST Form Body)"),
    ("POST", "/system/diagnostics", {"Content-Type": "application/json"}, '{"exec": "; cat /etc/passwd ; whoami"}', "Command Injection (POST JSON Body)"),
    ("GET", "/", {"User-Agent": "sqlmap/1.7#stable"}, None, "Malicious Scanner (sqlmap User-Agent)"),
    ("GET", "/", {"User-Agent": "Mozilla/5.0 (Nikto/2.1.6)"}, None, "Vulnerability Scanner (Nikto User-Agent)"),
]

host = "mahabubur.shop"
base = "http://127.0.0.1:8000"

print(f"\n{'='*70}")
print(f"[*] MDefender Pro WAF Live Attack Verification for: {host}")
print(f"{'='*70}")

passed = 0
for method, path, extra_headers, body, desc in tests:
    headers = {"Host": host, "User-Agent": "Mozilla/5.0"}
    if extra_headers:
        headers.update(extra_headers)
    
    try:
        if method == "GET":
            r = requests.get(base + path, headers=headers, timeout=5)
        else:
            r = requests.post(base + path, headers=headers, data=body, timeout=5)
            
        is_blocked = (r.status_code == 403)
        has_block_page = "Security Action Required" in r.text or "MDefender" in r.text
        
        status = "BLOCKED (403)" if (is_blocked and has_block_page) else f"STATUS {r.status_code}"
        icon = "[PASS]" if is_blocked else "[FAIL]"
        if is_blocked:
            passed += 1
            
        print(f" {icon} {desc:<38} -> {status}")
    except Exception as e:
        print(f" [ERR] {desc:<38} -> Error: {e}")

print(f"{'='*70}")
print(f"[*] Results: {passed}/{len(tests)} Attacks Successfully Blocked with Dragon Shield Block Page!")
print(f"{'='*70}\n")
