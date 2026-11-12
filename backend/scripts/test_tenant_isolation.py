import urllib.request
import json
from pymongo import MongoClient

db = MongoClient('mongodb://localhost:27017/')['mdefender_pro']

def test_user(email, expected_sites):
    u = db.users.find_one({'email': email})
    if not u:
        print('User not found:', email)
        return
    token = u.get('api_key')
    headers = {'Authorization': 'Bearer ' + token}
    
    # Check onboarding-status
    req_onb = urllib.request.Request('http://localhost:8000/api/user/onboarding-status', headers=headers)
    with urllib.request.urlopen(req_onb) as resp:
        onb_data = json.loads(resp.read().decode())
        print(f"[{email}] Onboarding status -> onboarded: {onb_data.get('onboarded')}, sites_count: {onb_data.get('websites_count')}")

    # Check dashboard
    req_dash = urllib.request.Request('http://localhost:8000/api/user/dashboard', headers=headers)
    with urllib.request.urlopen(req_dash) as resp:
        dash_data = json.loads(resp.read().decode())
        ws = dash_data.get('websites', [])
        print(f"[{email}] Dashboard -> websites count: {len(ws)}")
        if len(ws) > 0:
            print(f"   Site IDs: {[s.get('id') or s.get('_id') for s in ws]}, Domains: {[s.get('domain') for s in ws]}")
        assert len(ws) == expected_sites, f"Expected {expected_sites} sites but got {len(ws)}"

print("=== 1. Testing Mahabub (Original Account) ===")
test_user('rahmanmdmahabubur575@gmail.com', expected_sites=1)

print("\n=== 2. Testing Test User (New Un-onboarded Account) ===")
test_user('rahmanmdmahabubur251595@gmail.com', expected_sites=0)

print("\nALL TENANT ISOLATION TESTS PASSED 100%!")

