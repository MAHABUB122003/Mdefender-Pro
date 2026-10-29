import requests

# Login as user@gmail.com
login_res = requests.post('http://localhost:8000/api/auth/login', json={'email_or_username': 'user@gmail.com', 'password': 'user123'})
print("Login status:", login_res.status_code)
token = login_res.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# 1. Test websites list
sites_res = requests.get('http://localhost:8000/api/v1/websites', headers=headers)
sites = sites_res.json().get('data', {}).get('websites', [])
print(f"Websites count: {len(sites)}")
for s in sites[:3]:
    print(f"  Site: {s.get('name')} | Domain: {s.get('domain')} | Has API Key: {bool(s.get('api_key'))}")

# 2. Test user dashboard
dash_res = requests.get('http://localhost:8000/api/user/dashboard?force_refresh=true', headers=headers)
dash = dash_res.json()
print(f"\nUser Dashboard:")
print(f"  Total Requests: {dash.get('total_requests')}")
print(f"  Total Blocked: {dash.get('total_blocked')}")
print(f"  Recent Activity count: {len(dash.get('recent_activity', []))}")
print(f"  Attack Types count: {len(dash.get('attack_types', []))} -> {dash.get('attack_types')}")
print(f"  Top Attackers count: {len(dash.get('top_attackers', []))}")
print(f"  Daily Requests: {dash.get('daily_requests')}")

# 3. Test user logs
logs_res = requests.get('http://localhost:8000/api/user/logs?page=1&per_page=10', headers=headers)
logs_data = logs_res.json()
print(f"\nUser Logs:")
print(f"  Total: {logs_data.get('total')}")
print(f"  Logs count: {len(logs_data.get('logs', []))}")
print(f"  Source: {logs_data.get('source')}")
if logs_data.get('logs'):
    print(f"  Sample log: IP={logs_data['logs'][0].get('ip')}, Type={logs_data['logs'][0].get('attack_type')}, Status={logs_data['logs'][0].get('status')}")

# 4. Test Blacklist GET
bl_res = requests.get('http://localhost:8000/api/user/blacklist', headers=headers)
print(f"\nUser Blacklist count: {len(bl_res.json() if isinstance(bl_res.json(), list) else bl_res.json().get('blacklist', []))}")

# 5. Test Country Blocks GET
cb_res = requests.get('http://localhost:8000/api/user/country-blocks', headers=headers)
print(f"User Country Blocks count: {len(cb_res.json().get('country_blocks', []))}")

