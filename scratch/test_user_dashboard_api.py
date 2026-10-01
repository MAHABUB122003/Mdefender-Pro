import os
import sys
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from src.database.mongodb_connection import MongoDB
from src.services.password_service import PasswordService

db = MongoDB()
pwd_svc = PasswordService()
test_email = "testuser@mdefender.pro"
test_pass = "SuperSecure#2026!Pass"
pwd_hash = pwd_svc.hash_password(test_pass)

db.users.update_one(
    {"email": test_email},
    {
        "$set": {
            "password_hash": pwd_hash,
            "is_active": True,
            "email_verified": True,
            "plan": "enterprise"
        }
    },
    upsert=True
)

backend_url = "http://localhost:8000"

print("=== TESTING USER DASHBOARD AUTH & ENDPOINTS ===")

session = requests.Session()
login_resp = session.post(f"{backend_url}/api/auth/login", json={
    "email_or_username": test_email,
    "password": test_pass
})

print("1. Login Response:", login_resp.status_code)
login_data = login_resp.json()
print("   Login message:", login_data.get("message") or login_data.get("status"))

# 2. Get Websites
ws_resp = session.get(f"{backend_url}/api/v1/websites")
print("\n2. Websites Endpoint:", ws_resp.status_code)
print("   Websites count:", len(ws_resp.json().get("data", {}).get("websites", [])))

# 3. Get Overview Stats
ov_resp = session.get(f"{backend_url}/api/v1/waf/overview")
print("\n3. WAF Overview Endpoint:", ov_resp.status_code)
print("   Overview Data:", ov_resp.json().get("data"))

# 4. Get Security Events
ev_resp = session.get(f"{backend_url}/api/v1/waf/events")
print("\n4. WAF Events Endpoint:", ev_resp.status_code)
print("   Events Data:", ev_resp.json().get("data"))
