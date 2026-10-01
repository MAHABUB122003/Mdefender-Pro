import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import subprocess

print("=========================================================")
print("  MDEFENDER PRO ENTERPRISE END-TO-END VERIFICATION SUITE ")
print("=========================================================\n")

API_KEY = "mdf_live_test_api_key_8492048102948201"
SITE_URL = "http://localhost/mahabub"
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

report = {
    "system_services": {},
    "waf_firewall_tests": {},
    "scanner_tests": {},
    "cloud_sync_tests": {},
    "fixes_applied": []
}

# 1. System Services Check
print("[1/5] Checking System Services...")
# Backend
try:
    req = urllib.request.Request(f"{BACKEND_URL}/docs")
    with urllib.request.urlopen(req, timeout=3) as resp:
        report["system_services"]["cloud_backend"] = f"ONLINE (HTTP {resp.status})"
except Exception as e:
    report["system_services"]["cloud_backend"] = f"ERROR: {e}"

# Frontend
try:
    req = urllib.request.Request(FRONTEND_URL)
    with urllib.request.urlopen(req, timeout=3) as resp:
        report["system_services"]["cloud_frontend"] = f"ONLINE (HTTP {resp.status})"
except Exception as e:
    report["system_services"]["cloud_frontend"] = f"ERROR: {e}"

# WordPress Test Site
try:
    req = urllib.request.Request(f"{SITE_URL}/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        report["system_services"]["wordpress_site"] = f"ONLINE (HTTP {resp.status})"
except Exception as e:
    report["system_services"]["wordpress_site"] = f"ERROR: {e}"

for k, v in report["system_services"].items():
    print(f"  - {k}: {v}")

# 2. WAF Firewall Attack Interception Tests
print("\n[2/5] Testing WAF Firewall Attack Interception...")
test_vectors = [
    ("Clean GET Request", f"{SITE_URL}/?test=clean_param_123", 200),
    ("SQL Injection (UNION SELECT)", f"{SITE_URL}/?id=1%20UNION%20SELECT%201,version(),3--", 403),
    ("SQL Injection (Time-based Blind)", f"{SITE_URL}/?id=1%20AND%20SLEEP(5)--", 403),
    ("XSS Injection (<script> tag)", f"{SITE_URL}/?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E", 403),
    ("XSS Injection (SVG onload)", f"{SITE_URL}/?q=%3Csvg/onload=alert(1)%3E", 403),
    ("LFI / Path Traversal (etc/passwd)", f"{SITE_URL}/?file=../../../../etc/passwd", 403),
    ("RCE / Command Injection (whoami)", f"{SITE_URL}/?cmd=cat%20/etc/passwd;whoami", 403),
    ("Malicious Security Scanner UA", f"{SITE_URL}/", 403, {"User-Agent": "sqlmap/1.5#stable (http://sqlmap.org)"}),
]

for item in test_vectors:
    name = item[0]
    url = item[1]
    expected_status = item[2]
    headers = item[3] if len(item) > 3 else {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8", errors="ignore")
    except Exception as e:
        status = f"ERR: {e}"
        body = ""

    passed = (status == expected_status)
    blocked_by_mdefender = "MDefender" in body or "Web Application Firewall" in body or status == 403
    report["waf_firewall_tests"][name] = {
        "expected": expected_status,
        "actual": status,
        "passed": passed,
        "mdefender_waap_response": blocked_by_mdefender if expected_status == 403 else True
    }
    print(f"  {'[PASS]' if passed else '[FAIL]'} {name}: Expected {expected_status}, Got {status} (Blocked Page: {blocked_by_mdefender})")

# 3. Cloud API Endpoints & Telemetry
print("\n[3/5] Verifying Cloud Backend & WordPress Sync Endpoints...")
endpoints = [
    ("Heartbeat Sync", f"{BACKEND_URL}/api/v1/wordpress/heartbeat", {
        "api_key": API_KEY, "domain": "localhost", "site_token": "test", "wp_version": "7.1.2", "plugin_version": "4.2.2"
    }),
    ("WAF Telemetry", f"{BACKEND_URL}/api/v1/waf/telemetry", {
        "api_key": API_KEY, "domain": "localhost", "allowed_requests": 10, "blocked_requests": 2
    }),
    ("Radar Telemetry", f"{BACKEND_URL}/api/v1/malware/radar-telemetry", {
        "api_key": API_KEY, "domain": "localhost", "security_score": 95, "status": "active",
        "files_monitored": 7487, "components_monitored": 24, "active_threats": 0
    }),
]

for name, ep_url, payload in endpoints:
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(ep_url, data=req_data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            st = resp.status
            res_json = json.loads(resp.read().decode("utf-8"))
            passed = (st == 200 and res_json.get("success", False))
            report["cloud_sync_tests"][name] = {"status": st, "passed": passed, "response": res_json}
            print(f"  {'[PASS]' if passed else '[FAIL]'} {name}: HTTP {st} -> {res_json.get('data', {}).get('status', 'ok')}")
    except Exception as e:
        report["cloud_sync_tests"][name] = {"status": "ERR", "passed": False, "error": str(e)}
        print(f"  [FAIL] {name}: {e}")

print("\n--- Summary Data Written to scratch/verification_report.json ---")
with open(r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\scratch\verification_report.json", "w") as f:
    json.dump(report, f, indent=2)
