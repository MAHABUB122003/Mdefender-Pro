import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.database.mongodb_connection import MongoDB
from src.api.waf_api import WAFAPI

def main():
    print("=== Testing WAF Evaluation on User's Test Request ===")
    db = MongoDB()
    waf = WAFAPI()

    # User's exact request: http://localhost:5174/?id=%3Cscript%3Ealert(1)%3C/script%3E
    req_payload = {
        "domain": "bookstore.local",
        "method": "GET",
        "url": "/",
        "query_string": "id=%3Cscript%3Ealert(1)%3C/script%3E",
        "query_params": {"id": "<script>alert(1)</script>"},
        "ip": "127.0.0.1",
        "headers": {
            "host": "localhost:5005",
            "user-agent": "Mozilla/5.0"
        },
        "user_agent": "Mozilla/5.0",
        "body": ""
    }

    user_id = "6a904dee1842ed7b68f60d76"
    website_id = "9c34fae2-eca3-48ef-8a19-71e4ab1dd326"

    decision, log_entry, event, is_blocked, ip = waf.evaluate_request_fast(
        req_payload, user_id=user_id, domain="bookstore.local", website_id=website_id
    )

    print("Decision Status:", "BLOCKED" if is_blocked else "ALLOWED")
    print("Decision details:", decision)
    assert is_blocked == True
    print("\n[+] CONFIRMED: WAF engine successfully BLOCKS the XSS query attack!")

if __name__ == "__main__":
    main()
