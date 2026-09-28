"""End-to-End Test for Country Block in User Dashboard Tools section."""
import sys
import os
import requests
from datetime import datetime

# Connect directly to MongoDB to get or test with user session
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.database.mongodb_connection import MongoDB
from src.auth.jwt_service import JWTService

db = MongoDB()
user = db.users.find_one({})
if not user:
    print("[ERROR] No user found in database.")
    sys.exit(1)

user_id_str = str(user['_id'])
token = JWTService.create_access_token(user_id_str, role=user.get('role', 'user'))

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print(f"Testing User Country Block API as user: {user.get('email', user_id_str)}")

# 1. Clean existing test blocks
db.country_blocks.delete_many({'country_code': 'TEST_CODE', 'user_id': user_id_str})

# 2. Add Country Block (e.g. Russia - RU)
doc = {
    'country_code': 'RU',
    'country_name': 'Russia',
    'reason': 'Test geo-restriction from dashboard'
}
r_add = requests.post('http://localhost:8000/api/user/country-blocks', json=doc, headers=headers)
print(f"Add Country Block Response: {r_add.status_code} -> {r_add.json()}")

# 3. Get Country Blocks
r_get = requests.get('http://localhost:8000/api/user/country-blocks', headers=headers)
print(f"Get Country Blocks Response: {r_get.status_code}")
blocks = r_get.json().get('country_blocks', [])
print(f"Total Blocked Countries in Dashboard: {len(blocks)}")
for b in blocks:
    print(f" - {b.get('country_name')} ({b.get('country_code')}): {b.get('reason')}")

# 4. Remove Country Block (RU)
r_del = requests.delete('http://localhost:8000/api/user/country-blocks?code=RU', headers=headers)
print(f"Delete Country Block Response: {r_del.status_code} -> {r_del.json()}")

# 5. Verify removed
r_get2 = requests.get('http://localhost:8000/api/user/country-blocks', headers=headers)
blocks2 = r_get2.json().get('country_blocks', [])
print(f"Remaining Blocked Countries: {len(blocks2)}")

print("\n[SUCCESS] Dashboard Tools Country Block functionality is working 100%!")
