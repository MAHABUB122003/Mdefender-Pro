import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.database.mongodb_connection import MongoDB
from src.api.waf_api import WAFAPI

def main():
    db = MongoDB()
    waf = WAFAPI()

    payload = {
        "domain": "bookstore.local",
        "method": "GET",
        "url": "/api/books",
        "query_string": "",
        "query_params": {},
        "ip": "127.0.0.1",
        "headers": {
            "Host": "localhost:5005",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Referer": "http://localhost:5174/",
            "Origin": "http://localhost:5174",
            "Accept": "application/json, text/plain, */*"
        },
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "referer": "http://localhost:5174/",
        "body": ""
    }

    user_id = "6a904dee1842ed7b68f60d76"
    website_id = "9c34fae2-eca3-48ef-8a19-71e4ab1dd326"

    decision, log_entry, event, is_blocked, ip = waf.evaluate_request_fast(
        payload, user_id=user_id, domain="bookstore.local", website_id=website_id
    )

    print("Is Blocked:", is_blocked)
    print("Decision:", decision)

if __name__ == "__main__":
    main()
