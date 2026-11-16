"""
MDefender Pro Enterprise: Stage 3 WordPress Plugin Core & Hardening Verification Suite
Tests Pre-Flight Ingress WAF and 8 Hardening Modules on http://localhost/mahabub/
"""
import requests
import json
import time

WP_BASE = "http://localhost/mahabub"

def test_stage3_hardening_and_ingress():
    print("\n" + "=" * 70)
    print("   STAGE 3: WORDPRESS PLUGIN CORE & HARDENING AUDIT")
    print("   Target: " + WP_BASE)
    print("=" * 70)
    
    results = {}
    
    # 1. Test Ingress WAF on SQL Injection
    print("\n[1] Testing Edge Ingress WAF (SQL Injection Payload):")
    try:
        r = requests.get(f"{WP_BASE}/?id=1' UNION SELECT 1,user(),3-- -", timeout=5)
        is_blocked = (r.status_code == 403) and ("MDefender" in r.text or "Restricted" in r.text or "Protected-By" in str(r.headers))
        status = "PASS" if is_blocked else "FAIL"
        print(f"  * [{status}] HTTP Status: {r.status_code} | Protected Header: {r.headers.get('X-Protected-By', 'None')}")
        results["ingress_sqli"] = is_blocked
    except Exception as e:
        print(f"  * [FAIL] Error connecting to WP: {e}")
        results["ingress_sqli"] = False

    # 2. Test Ingress WAF on Path Traversal
    print("\n[2] Testing Edge Ingress WAF (Path Traversal / LFI):")
    try:
        r = requests.get(f"{WP_BASE}/.env", timeout=5)
        is_blocked = (r.status_code == 403)
        status = "PASS" if is_blocked else "FAIL"
        print(f"  * [{status}] Accessing /.env -> Status: {r.status_code}")
        results["ingress_lfi"] = is_blocked
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["ingress_lfi"] = False

    # 3. Test XML-RPC Shield
    print("\n[3] Testing Hardening: XML-RPC Shield:")
    try:
        r = requests.get(f"{WP_BASE}/xmlrpc.php", timeout=5)
        # In complete lockdown mode, XML-RPC returns 403 or blocked page
        is_protected = (r.status_code == 403) or ("disabled" in r.text.lower())
        status = "PASS" if is_protected else "INFO"
        print(f"  * [{status}] /xmlrpc.php -> Status: {r.status_code}")
        results["xmlrpc"] = is_protected
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["xmlrpc"] = False

    # 4. Test WP Version Leak Prevention
    print("\n[4] Testing Hardening: Hide WordPress Version Meta:")
    try:
        r = requests.get(f"{WP_BASE}/", timeout=5)
        has_generator = '<meta name="generator" content="WordPress' in r.text
        is_hidden = not has_generator
        status = "PASS" if is_hidden else "FAIL"
        print(f"  * [{status}] Generator Meta Tag Present: {has_generator}")
        results["hide_version"] = is_hidden
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["hide_version"] = False

    # 5. Test Direct wp-config.php Protection
    print("\n[5] Testing Hardening: wp-config.php Protection:")
    try:
        r = requests.get(f"{WP_BASE}/wp-config.php", timeout=5)
        is_blocked = (r.status_code in (403, 500)) or (len(r.text.strip()) == 0)
        status = "PASS" if is_blocked else "FAIL"
        print(f"  * [{status}] Direct Access /wp-config.php -> Status: {r.status_code} | Body Len: {len(r.text)}")
        results["wp_config"] = is_blocked
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["wp_config"] = False

    # 6. Test Username Enumeration Prevention
    print("\n[6] Testing Hardening: Username Enumeration (?author=1):")
    try:
        r = requests.get(f"{WP_BASE}/?author=1", allow_redirects=False, timeout=5)
        # Should redirect to home or return 403, not reveal author slug
        is_masked = (r.status_code in (301, 302, 403)) and not ("/author/" in r.headers.get("Location", ""))
        status = "PASS" if is_masked else "INFO"
        print(f"  * [{status}] ?author=1 -> Status: {r.status_code} | Location: {r.headers.get('Location', 'None')}")
        results["user_enum"] = is_masked
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["user_enum"] = False

    # 7. Test Security Response Headers
    print("\n[7] Testing Hardening: Security Response Headers:")
    try:
        r = requests.get(f"{WP_BASE}/", timeout=5)
        h = r.headers
        has_nosniff = h.get("X-Content-Type-Options") == "nosniff"
        has_xframe = "X-Frame-Options" in h
        print(f"  * X-Content-Type-Options: {h.get('X-Content-Type-Options', 'Missing')}")
        print(f"  * X-Frame-Options: {h.get('X-Frame-Options', 'Missing')}")
        results["sec_headers"] = has_nosniff or has_xframe
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["sec_headers"] = False

    # 8. Test Cloud Sync Action API Handshake
    print("\n[8] Testing Cloud Sync Action API Handshake (?waf_cloud_sync=1):")
    try:
        site_key = "mdf_site_dw6JUvdP3kn7d9EC9BSXhUSvFWjjLCKVoW--nqBTzk4"
        r = requests.get(f"{WP_BASE}/?waf_cloud_sync=1&action=ping&api_key={site_key}", timeout=5)
        data = r.json() if r.status_code == 200 else {}
        is_valid = data.get("status") in ("pong", "success", "ok") or "version" in data
        status = "PASS" if is_valid else "INFO"
        print(f"  * [{status}] Status: {r.status_code} | Handshake Response: {data}")
        results["cloud_sync"] = is_valid
    except Exception as e:
        print(f"  * [FAIL] Error: {e}")
        results["cloud_sync"] = False

    print("\n" + "=" * 70)
    passed_count = sum(1 for v in results.values() if v)
    print(f" [✓] STAGE 3 SUMMARY: {passed_count}/{len(results)} CHECKS PASSED")
    print("=" * 70)
    return passed_count >= 6

if __name__ == "__main__":
    test_stage3_hardening_and_ingress()
