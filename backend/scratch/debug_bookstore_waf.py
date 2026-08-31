import sys
import os
import hashlib
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.database.mongodb_connection import MongoDB

def main():
    print("=== Diagnosing Bookstore WAF Connection ===")
    db = MongoDB()

    api_key = "Ix2TtXbbBHJolIam3MYLui0jphKy9oRvF_D3AJjY1tO8MGfWU-NCQzvDuwc_6Dri"
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # 1. Check in api_keys collection
    key_doc = db.api_keys.find_one({"key_hash": key_hash})
    print("[1] db.api_keys record:", key_doc)

    # 2. Check in users collection
    user_doc = db.users.find_one({"api_key": api_key})
    print("[2] db.users master record:", user_doc.get("email") if user_doc else None)

    # 3. Check websites collection for domain
    web_doc = db.websites.find_one({"domain": "bookstore.local"})
    print("[3] db.websites for 'bookstore.local':", web_doc)

    # 4. Check all active websites
    all_webs = list(db.websites.find({}))
    print(f"[4] Total websites registered: {len(all_webs)}")
    for w in all_webs:
        print(f"    - Domain: {w.get('domain')}, Name: {w.get('name')}, User ID: {w.get('user_id')}")

    # 5. Check all users
    all_users = list(db.users.find({}))
    print(f"[5] Total users: {len(all_users)}")
    for u in all_users:
        print(f"    - User: {u.get('email')}, Master API Key: {u.get('api_key')}")

    # 6. Test WAF evaluate endpoint directly via HTTP
    try:
        payload = {
            "domain": "bookstore.local",
            "request": {
                "method": "POST",
                "url": "/api/books",
                "query_string": "",
                "query_params": {},
                "ip": "127.0.0.1",
                "headers": {"content-type": "application/json"},
                "body": '{"title": "Test Book"}'
            }
        }
        res = requests.post(
            "http://127.0.0.1:8000/api/analyze",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        print("[6] /api/analyze HTTP Response:", res.status_code, res.json())
    except Exception as e:
        print("[6] /api/analyze HTTP Request Failed:", e)

    # 7. Test Bookstore Backend server (port 5005)
    try:
        res = requests.get("http://localhost:5005/", timeout=5)
        print("[7] Bookstore Backend (port 5005) Response:", res.status_code, res.text)
    except Exception as e:
        print("[7] Bookstore Backend (port 5005) is NOT running or failed:", e)

if __name__ == "__main__":
    main()
