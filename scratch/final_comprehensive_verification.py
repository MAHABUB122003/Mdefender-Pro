import os
import sys
import json
import base64
import urllib.request
import urllib.error

print("=========================================================")
print("      COMPREHENSIVE FULL-SPECTRUM VERIFICATION SUITE     ")
print("=========================================================\n")

API_KEY = "mdf_live_test_api_key_8492048102948201"
SITE_URL = "http://localhost/mahabub"
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

all_passed = True

# 1. Check Cloud Services
print("[Step 1] Verifying Cloud Backend & Frontend Services...")
try:
    with urllib.request.urlopen(f"{BACKEND_URL}/docs", timeout=3) as resp:
        print(f"  [PASS] Backend Server: HTTP {resp.status} Online")
except Exception as e:
    print(f"  [FAIL] Backend Server Error: {e}")
    all_passed = False

try:
    with urllib.request.urlopen(FRONTEND_URL, timeout=3) as resp:
        print(f"  [PASS] Frontend User Dashboard: HTTP {resp.status} Online")
except Exception as e:
    print(f"  [FAIL] Frontend User Dashboard Error: {e}")
    all_passed = False

try:
    with urllib.request.urlopen(f"{SITE_URL}/", timeout=5) as resp:
        print(f"  [PASS] WordPress Test Site: HTTP {resp.status} Online")
except Exception as e:
    print(f"  [FAIL] WordPress Test Site Error: {e}")
    all_passed = False


# 2. Test All 10 WAF Attack Types Live on WordPress
print("\n[Step 2] Testing Live WAF Attack Interception on WordPress...")
waf_tests = [
    ("Clean Normal Request", f"{SITE_URL}/?test=clean_param_123", 200),
    ("SQL Injection (Union Select)", f"{SITE_URL}/?id=1%20UNION%20SELECT%201,2,3--", 403),
    ("SQL Injection (Time-based Blind)", f"{SITE_URL}/?id=1%20AND%20SLEEP(5)--", 403),
    ("XSS Injection (<script>)", f"{SITE_URL}/?q=%3Cscript%3Ealert('xss')%3C/script%3E", 403),
    ("XSS Injection (img onerror)", f"{SITE_URL}/?q=%3Cimg%20src=x%20onerror=alert(1)%3E", 403),
    ("Directory Traversal (LFI)", f"{SITE_URL}/?file=../../../../windows/win.ini", 403),
    ("Command Injection (RCE)", f"{SITE_URL}/?exec=cat%20/etc/passwd;id", 403),
    ("Bad Bot User-Agent", f"{SITE_URL}/", 403, {"User-Agent": "nikto/2.1.6"}),
]

for item in waf_tests:
    name = item[0]
    url = item[1]
    expected = item[2]
    headers = item[3] if len(item) > 3 else {"User-Agent": "Mozilla/5.0"}

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            st = resp.status
    except urllib.error.HTTPError as e:
        st = e.code
    except Exception as e:
        st = f"ERR: {e}"

    passed = (st == expected)
    if not passed:
        all_passed = False
    print(f"  {'[PASS]' if passed else '[FAIL]'} {name}: Expected {expected}, Got {st}")


# 3. Test Threat Detection Engine on 6 Diverse Malware / Spam Vectors
print("\n[Step 3] Testing Scanner ML + Signature Engine Across All Threat Vectors...")
samples = [
    ("Clean OOP WordPress Controller", '<?php class CustomPage { public function render() { return "<h1>Welcome</h1>"; } } ?>', "clean"),
    ("SEO Blackhat Pharma Spam", '<?php echo "<div style=\\"position: absolute; left: -9999px;\\">buy cheap viagra cialis online casino</div>"; ?>', "malicious"),
    ("Search Engine Crawler Cloaking", '<?php if (preg_match("/googlebot|bingbot/i", $_SERVER["HTTP_USER_AGENT"])) { header("Location: http://spam.xyz"); exit(); } ?>', "malicious"),
    ("Godzilla / Behinder AES WebShell", '<?php @session_start(); $k="key123"; $p=file_get_contents("php://input"); if($p){ @eval(openssl_decrypt($p, "AES128", $k)); } ?>', "malicious"),
    ("Classic WSO / FilesMan Backdoor", '<?php $auth_pass = "63a9f0ea7bb98050796b649e85481845"; $default_action = "FilesMan"; eval(gzinflate(base64_decode("..."))); ?>', "malicious"),
    ("Rogue User Privilege Escalation", '<?php wp_create_user("rogue_admin", "p@ss", "bad@mail.ru"); add_role("administrator"); ?>', "malicious"),
]

for name, code, expected_verdict in samples:
    b64 = base64.b64encode(code.encode("utf-8")).decode("ascii")
    req_data = json.dumps({
        "filename": name.lower().replace(" ", "_") + ".php",
        "content_base64": b64,
        "api_key": API_KEY,
        "domain": "localhost"
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BACKEND_URL}/api/v1/malware/plugin-scan",
        data=req_data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8")).get("data", {})
            actual_verdict = data.get("verdict")
            score = data.get("risk_score")
            passed = (actual_verdict == expected_verdict)
            if not passed:
                all_passed = False
            print(f"  {'[PASS]' if passed else '[FAIL]'} {name} -> Verdict: {actual_verdict} (Score: {score}/100)")
    except Exception as e:
        print(f"  [FAIL] {name} -> Error: {e}")
        all_passed = False


# 4. Verify Real-time Cloud Alert & Notification Pipeline
print("\n[Step 4] Verifying Real-Time Notification Delivery...")
alert_payload = {
    "api_key": API_KEY,
    "domain": "localhost",
    "site_token": "test",
    "alert_type": "malware",
    "title": "Automated Final Verification Threat Alert",
    "message": "Enterprise Full-Spectrum Scanner Verified All Threat Vectors 100% Successfully",
    "severity": "critical",
    "file_path": "wp-content/uploads/verified_threat.php",
    "signature_matched": "Godzilla AES WebShell / SEO Blackhat Spam"
}

req = urllib.request.Request(
    f"{BACKEND_URL}/api/v1/malware/report-alert",
    data=json.dumps(alert_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        passed = (resp.status == 200 and res.get("success", False))
        if not passed:
            all_passed = False
        print(f"  {'[PASS]' if passed else '[FAIL]'} Cloud Alert Dispatch: HTTP {resp.status} -> {res.get('data', {}).get('message')}")
except Exception as e:
    print(f"  [FAIL] Cloud Alert Dispatch Error: {e}")
    all_passed = False

print("\n=========================================================")
if all_passed:
    print("  >>> ALL SYSTEMS & TESTS PASSED 100% PERFECTLY! <<<")
else:
    print("  >>> SOME TESTS ENCOUNTERED ISSUES (REVIEW ABOVE) <<<")
print("=========================================================")
