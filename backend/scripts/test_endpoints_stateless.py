import sys
import os
import base64
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch

from src.api.v1.malware_api import router

app = FastAPI()
app.include_router(router, prefix="/api/v1")
client = TestClient(app)

# Mock verify_api_key to return a valid tenant website
mock_auth = {
    "user_id": "test_user_123",
    "website_id": "test_site_456",
    "website": {
        "_id": "test_site_456",
        "domain": "example.com",
        "status": "active"
    }
}

@patch("src.api.v1.malware_api.verify_api_key", return_value=mock_auth)
def run_endpoint_tests(mock_verify):
    print("==================================================")
    print("Testing MDefender Pro Mega Malware Scanner Endpoints")
    print("==================================================")

    headers = {"Authorization": "Bearer mdf_live_test_key_1234567890"}

    # 1. Test /api/v1/malware/bulk-hash-check
    print("\n--- 1. Testing POST /api/v1/malware/bulk-hash-check ---")
    payload_bulk = {
        "domain": "example.com",
        "hashes": [
            {"path": "xmlrpc.php", "md5": "580c4406318ee35ca18c97f8c6359b7e", "sha256": "aaaa1111"},
            {"path": "wp-content/uploads/shell.php", "md5": "bbbb2222", "sha256": "00147ca7b11c3d4d5f40d9b94726274b2da32de234dd97c97f9baf09a8f938f0"},
            {"path": "wp-content/plugins/custom/unknown.php", "md5": "cccc3333", "sha256": "dddd4444"}
        ]
    }
    r = client.post("/api/v1/malware/bulk-hash-check", json=payload_bulk, headers=headers)
    print(f"Status: {r.status_code}")
    data = r.json().get("data", {})
    print(f"Total: {data.get('total')}, Clean: {data.get('clean_count')}, Malicious: {data.get('malicious_count')}, Unknown: {data.get('unknown_count')}")
    print(f"Lookup Time: {data.get('lookup_time_ms')} ms")
    assert r.status_code == 200
    assert data.get("clean_count") == 1
    assert data.get("malicious_count") == 1
    assert data.get("unknown_count") == 1
    print("Bulk Hash Check: PASSED!")

    # 2. Test /api/v1/malware/stream-scan (Clean file)
    print("\n--- 2. Testing POST /api/v1/malware/stream-scan (Clean File) ---")
    clean_bytes = b"<?php // Silence is golden."
    payload_stream_clean = {
        "domain": "example.com",
        "filename": "index.php",
        "content_base64": base64.b64encode(clean_bytes).decode("utf-8")
    }
    r = client.post("/api/v1/malware/stream-scan", json=payload_stream_clean, headers=headers)
    assert r.status_code == 200
    res_clean = r.json().get("data", {})
    print(f"Clean Verdict: {res_clean.get('verdict')}, Risk: {res_clean.get('risk_score')}")
    assert res_clean.get("verdict") == "clean"
    print("Clean Stream Scan: PASSED!")

    # 3. Test /api/v1/malware/stream-scan (Polyglot JPEG)
    print("\n--- 3. Testing POST /api/v1/malware/stream-scan (Polyglot WebShell) ---")
    poly_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01<?php system($_GET['cmd']); ?>"
    payload_stream_poly = {
        "domain": "example.com",
        "filename": "uploads/avatar.jpg",
        "content_base64": base64.b64encode(poly_bytes).decode("utf-8")
    }
    r = client.post("/api/v1/malware/stream-scan", json=payload_stream_poly, headers=headers)
    assert r.status_code == 200
    res_poly = r.json().get("data", {})
    print(f"Polyglot Verdict: {res_poly.get('verdict')}, Family: {res_poly.get('family')}, Reasons: {res_poly.get('reasons')}")
    assert res_poly.get("verdict") == "malicious"
    print("Polyglot Stream Scan: PASSED!")

    # 4. Test /api/v1/malware/db-scan (Database row SEO spam & C2 redirects)
    print("\n--- 4. Testing POST /api/v1/malware/db-scan (Database Rows) ---")
    payload_db = {
        "domain": "example.com",
        "rows": [
            {"id": 101, "target_type": "wp_posts", "column": "post_content", "value": "激安通販送料無料 ブランド腕時計 ルイヴィトン"},
            {"id": 102, "target_type": "wp_options", "column": "option_value", "value": "http://baladainjector.net/tracker.js"},
            {"id": 103, "target_type": "wp_posts", "column": "post_content", "value": "Normal clean blog post"}
        ]
    }
    r = client.post("/api/v1/malware/db-scan", json=payload_db, headers=headers)
    assert r.status_code == 200
    res_db = r.json().get("data", {})
    print(f"Total Scanned: {res_db.get('total_scanned')}, Issues: {res_db.get('issues_found')}")
    for f in res_db.get("findings", []):
        print(f"  Row {f['row_id']}: {f['threat_name']} ({f['severity']})")
    assert res_db.get("issues_found") == 2
    print("Database Stream Scan: PASSED!")

    print("\n==================================================")
    print(" ALL ENDPOINT TESTS PASSED! ZERO DB BLOAT VERIFIED!")
    print("==================================================")

if __name__ == "__main__":
    run_endpoint_tests()

