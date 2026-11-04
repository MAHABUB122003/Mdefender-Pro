import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.intelligence_service import IntelligenceService

def test_intelligence_service():
    print("Initializing IntelligenceService...")
    start = time.time()
    svc = IntelligenceService.get_instance()
    print(f"Service loaded in {time.time() - start:.2f}s")
    
    # Test 1: Bulk Hash Check with clean + known malware + unknown
    print("\n--- Test 1: Bulk Hash Check (5.32M intelligence) ---")
    # Known WP 6.7 xmlrpc.php MD5: 580c4406318ee35ca18c97f8c6359b7e
    # Known webshell SHA256: 00147ca7b11c3d4d5f40d9b94726274b2da32de234dd97c97f9baf09a8f9f7dc
    sample_hashes = [
        {"path": "xmlrpc.php", "md5": "580c4406318ee35ca18c97f8c6359b7e", "sha256": "aaaa1111"},
        {"path": "wp-content/uploads/shell.php", "md5": "bbbb2222", "sha256": "00147ca7b11c3d4d5f40d9b94726274b2da32de234dd97c97f9baf09a8f938f0"},
        {"path": "wp-content/plugins/my-custom/unknown.php", "md5": "cccc3333", "sha256": "dddd4444"}
    ]
    res = svc.check_bulk_hashes(sample_hashes)
    print(f"Lookup results ({res['lookup_time_ms']} ms):")
    print(f"  Clean: {res['clean']}")
    print(f"  Malicious: {[m['file_path'] for m in res['malicious']]}")
    print(f"  Unknown: {res['unknown']}")
    assert len(res["clean"]) == 1
    assert len(res["malicious"]) == 1
    assert len(res["unknown"]) == 1
    print("Test 1 Passed!")

    # Test 2: Stateless Polyglot Image detection
    print("\n--- Test 2: Stateless Polyglot Image Inspection ---")
    poly_content = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01<?php system($_GET['cmd']); ?>"
    poly_res = svc.scan_file_stateless("logo.jpg", poly_content)
    print("Polyglot Logo Result:")
    print(f"  Verdict: {poly_res['verdict']}, Risk: {poly_res['risk_score']}, Reasons: {poly_res['reasons']}")
    assert poly_res["verdict"] == "malicious"
    print("Test 2 Passed!")

    # Test 3: Database Japanese SEO Spam & Redirect inspection
    print("\n--- Test 3: Database SEO & C2 Inspection ---")
    db_rows = [
        {"id": 1, "target_type": "wp_posts", "column": "post_content", "value": "激安通販送料無料 ブランド腕時計 ルイヴィトン"},
        {"id": 2, "target_type": "wp_options", "column": "option_value", "value": "http://baladainjector.net/script.js"},
        {"id": 3, "target_type": "wp_posts", "column": "post_content", "value": "Welcome to my clean WordPress blog post."}
    ]
    db_findings = svc.scan_db_content_stateless(db_rows)
    print(f"Found {len(db_findings)} database threats:")
    for f in db_findings:
        print(f"  Row {f['row_id']}: {f['threat_name']} ({f['severity']})")
    assert len(db_findings) == 2
    print("Test 3 Passed!")

    print("\n ALL TESTS PASSED SUCCESSFULLY! World-class performance!")

if __name__ == "__main__":
    test_intelligence_service()
