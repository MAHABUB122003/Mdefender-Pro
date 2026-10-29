import requests

res = requests.post('https://mdefender-pro.crafix.tech/api/auth/login', json={'email_or_username': 'user@gmail.com', 'password': 'user123'})
print("Live login:", res.status_code)
token = res.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

sites_res = requests.get('https://mdefender-pro.crafix.tech/api/v1/websites', headers=headers)
sites = sites_res.json().get('data', {}).get('websites', [])
print(f"Live Websites ({len(sites)}):")
for s in sites:
    print(f"ID: {s.get('id')} | Name: {s.get('name')} | Domain: {s.get('domain')} | URL: {s.get('url')} | API Key: {s.get('api_key')}")
