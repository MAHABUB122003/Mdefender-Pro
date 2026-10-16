import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import requests
from src.database.mongodb_connection import MongoDB

base = 'http://127.0.0.1:8000'
headers = {'Host': 'mahabubur.shop', 'User-Agent': 'Mozilla/5.0'}

print('=== Test 1: Clean request to mahabubur.shop ===')
try:
    r = requests.get(f'{base}/test-clean', headers=headers, timeout=5)
    print('Clean status:', r.status_code, r.text[:150])
except Exception as e:
    print('Clean err:', e)

print('\n=== Test 2: SQL Injection Attack to mahabubur.shop ===')
try:
    sqli = "/?id=1%27%20UNION%20SELECT%20null,username,password%20FROM%20users--"
    r = requests.get(f'{base}{sqli}', headers=headers, timeout=5)
    print('SQLi status:', r.status_code)
    is_blocked = 'MDefender' in r.text or 'Security Threat' in r.text or 'blocked' in r.text.lower()
    print('Is MDefender Block Page?', is_blocked)
    if is_blocked:
        print('Block page confirmed! Status:', r.status_code)
except Exception as e:
    print('SQLi err:', e)

print('\n=== Test 3: XSS Attack in Query to mahabubur.shop ===')
try:
    xss = "/search?q=%3Cscript%3Ealert(%27xss%27)%3C/script%3E"
    r = requests.get(f'{base}{xss}', headers=headers, timeout=5)
    print('XSS status:', r.status_code)
    is_blocked = 'MDefender' in r.text or 'Security Threat' in r.text or 'blocked' in r.text.lower()
    print('Is MDefender Block Page?', is_blocked)
except Exception as e:
    print('XSS err:', e)

print('\n=== Test 4: Check if Attacks were logged to Database ===')
db = MongoDB()
recent_events = list(db.security_events.find({'domain': 'mahabubur.shop'}).sort('timestamp', -1).limit(5))
print(f'Total recent security events logged for mahabubur.shop: {len(recent_events)}')
for ev in recent_events:
    print(f" - [{ev.get('timestamp')}] Type: {ev.get('attack_type')} | IP: {ev.get('source_ip')} | Action: {ev.get('action')}")

site = db.websites.find_one({'domain': 'mahabubur.shop', 'platform': 'domain'})
if site:
    print(f"Website Stats: Total Requests: {site.get('total_requests')}, Blocked: {site.get('total_blocked')}")
