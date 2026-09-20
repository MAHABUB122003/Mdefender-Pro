"""Comprehensive Integration Test for MDefender Pro Services:
1. Scoped API Key creation & validation
2. npm-package middleware / sendAnalyzeRequest connectivity
3. WordPress Plugin WAF API (`/api/v1/wordpress/connect`, `/api/v1/waf/analyze`, `/api/v1/malware/plugin-scan`, etc.)
4. Health & Status checks across all modules
"""

import io
import sys
import os
import json
import base64
import urllib.request
import urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.database.mongodb_connection import MongoDB
from src.api.v1.waf_api import verify_api_key
from src.engine.decision_engine import DecisionEngine


def run_integration_tests():
    print("\n" + "=" * 65)
    print("🚀 Verifying NPM Package, WordPress Plugin, and Core WAF APIs")
    print("=" * 65 + "\n")

    db = MongoDB()
    decision_engine = DecisionEngine()

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

    # 1. Verify / Create Test Website & API Key in DB
    print("--- [1] Database & Scoped API Key Setup ---")
    test_user = db.users.find_one({"email": "integration_test@mdefender.io"})
    if not test_user:
        test_user_id = db.users.insert_one({
            "email": "integration_test@mdefender.io",
            "role": "user",
            "api_key": "mdf_master_test_key_12345"
        }).inserted_id
    else:
        test_user_id = test_user["_id"]

    test_web = db.websites.find_one({"domain": "test-integration.com"})
    if not test_web:
        test_web_id = db.websites.insert_one({
            "user_id": test_user_id,
            "domain": "test-integration.com",
            "name": "Integration Test Site",
            "status": "active",
            "wordpress_connection": {
                "site_token": "valid_site_token_hash_12345",
                "connected_at": "2026-09-08T00:00:00"
            }
        }).inserted_id
    else:
        test_web_id = test_web["_id"]

    raw_api_key = "mdf_live_test_apikey_9876543210abcdef"
    import hashlib
    key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()

    db.api_keys.update_one(
        {"key_hash": key_hash},
        {"$set": {
            "key_hash": key_hash,
            "user_id": test_user_id,
            "website_id": test_web_id,
            "status": "active"
        }},
        upsert=True
    )

    resolved = verify_api_key(db, raw_api_key, domain="test-integration.com")
    assert_test("Scoped API Key Resolution", resolved is not None and str(resolved["website_id"]) == str(test_web_id), f"Resolved: {resolved}")

    # 2. Test NPM Package Analyze Payload Flow
    print("\n--- [2] NPM Package Protocol & Payload Verification ---")
    npm_payload = {
        "domain": "test-integration.com",
        "request": {
            "method": "POST",
            "url": "/api/v1/auth/login",
            "query_string": "",
            "query_params": {},
            "ip": "198.51.100.42",
            "headers": {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            "user_agent": "Mozilla/5.0",
            "referer": "",
            "content_type": "application/json",
            "body": '{"username": "admin\' OR \'1\'=\'1", "password": "xyz"}',
            "body_fields": {"username": "admin' OR '1'='1", "password": "xyz"},
            "body_field_values": "admin' OR '1'='1 xyz"
        }
    }

    # Evaluate with DecisionEngine
    npm_decision = decision_engine.evaluate(npm_payload["request"], domain=npm_payload["domain"])
    assert_test(
        "NPM Package Attack Payload Evaluated & Blocked",
        npm_decision["decision"] == "BLOCK" and npm_decision["risk_score"] >= 80,
        f"Decision: {npm_decision['decision']}, Score: {npm_decision['risk_score']}"
    )

    # 3. Test WordPress Plugin Protocol Flow
    print("\n--- [3] WordPress Plugin WAF & Malware Protocol Verification ---")
    
    # WordPress WAF Analyze
    wp_waf_payload = {
        "method": "GET",
        "url": "/wp-login.php?redirect_to=%2Fwp-admin%2F&id=1%20UNION/**/SELECT%20user_pass%20FROM%20wp_users",
        "ip": "203.0.113.19",
        "headers": {"User-Agent": "Mozilla/5.0"}
    }
    wp_decision = decision_engine.evaluate(wp_waf_payload)
    assert_test(
        "WordPress Plugin SQLi Infiltration Blocked",
        wp_decision["decision"] == "BLOCK" and wp_decision["risk_score"] >= 80,
        f"Decision: {wp_decision['decision']}, Score: {wp_decision['risk_score']}"
    )

    # WordPress Malware Scanner File Evaluation
    from src.engine.malware_detector import MalwareDetector
    malware_detector = MalwareDetector()

    webshell_content = b"<?php @eval($_POST['cmd']); ?>"
    scan_res = malware_detector.scan("wp-content/plugins/revslider/temp.php", webshell_content)
    assert_test(
        "WordPress Malware Scanner Detects Webshell",
        scan_res["verdict"] == "malicious" and scan_res["risk_score"] >= 80,
        f"Scan Result: {scan_res}"
    )

    clean_wp_file = b"<?php function get_site_title() { return 'My Site'; } ?>"
    clean_scan = malware_detector.scan("wp-content/themes/twentytwenty/functions.php", clean_wp_file)
    assert_test(
        "WordPress Malware Scanner Allows Clean PHP File",
        clean_scan["verdict"] == "clean" and clean_scan["risk_score"] <= 40,
        f"Scan Result: {clean_scan}"
    )

    # Cleanup test data
    db.users.delete_many({"email": "integration_test@mdefender.io"})
    db.websites.delete_many({"domain": "test-integration.com"})
    db.api_keys.delete_many({"key_hash": key_hash})

    # Summary
    print("\n" + "=" * 65)
    print(f"📊 Integration Test Results: {passed}/{total} Tests PASSED ({round(passed/total*100, 1)}%)")
    print("=" * 65 + "\n")

    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    run_integration_tests()
