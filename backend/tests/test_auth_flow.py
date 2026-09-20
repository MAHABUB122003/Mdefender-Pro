import requests

BASE = 'http://localhost:8000/api/auth'

print("=== 1. LOGIN ===")
s = requests.Session()
r = s.post(f'{BASE}/login', json={
    'email_or_username': 'testuser2@mdefender.com',
    'password': 'T3st!ngP@ssw9rd'
})
print(f'Status: {r.status_code}')
print(f'Cookies: {list(s.cookies.keys())}')
data = r.json()
csrf = data.get('csrf_token', '')
print(f'User: {data.get("user", {}).get("email")}')

print("\n=== 2. GET /me ===")
r = s.get(f'{BASE}/me')
print(f'Status: {r.status_code}')
print(f'Body: {r.json()}')

print("\n=== 3. MFA SETUP ===")
r = s.post(f'{BASE}/mfa/enable', headers={'X-CSRF-Token': csrf})
print(f'Status: {r.status_code}')
mfa_data = r.json()
print(f'Has QR: {bool(mfa_data.get("qr_code"))}')
print(f'Backup codes: {len(mfa_data.get("backup_codes", []))}')
secret = mfa_data.get('secret', '')

print("\n=== 4. VERIFY MFA (simulated) ===")
if secret:
    import pyotp
    totp = pyotp.TOTP(secret)
    code = totp.now()
    r = s.post(f'{BASE}/mfa/verify-setup', json={'code': code}, headers={'X-CSRF-Token': csrf})
    print(f'Status: {r.status_code}')
    print(f'Body: {r.json()}')

print("\n=== 5. MFA STATUS ===")
r = s.get(f'{BASE}/mfa/status')
print(f'Status: {r.status_code}')
print(f'Body: {r.json()}')

print("\n=== 6. SESSIONS ===")
r = s.get(f'{BASE}/sessions')
print(f'Status: {r.status_code}')
sessions = r.json()
print(f'Session count: {len(sessions.get("sessions", []))}')

print("\n=== 7. PROFILE ===")
r = s.get(f'{BASE}/profile')
print(f'Status: {r.status_code}')
print(f'Body: {r.json()}')

print("\n=== 8. AUDIT LOGS ===")
r = s.get(f'{BASE}/audit-logs')
print(f'Status: {r.status_code}')
logs = r.json()
print(f'Log entries: {len(logs.get("logs", []))}')

print("\n=== 9. FORGOT PASSWORD ===")
r = requests.post(f'{BASE}/forgot-password', json={'email': 'testuser2@mdefender.com'})
print(f'Status: {r.status_code}')
print(f'Body: {r.json()}')

print("\n=== 10. BRUTE FORCE (6 bad logins) ===")
for i in range(6):
    r = requests.post(f'{BASE}/login', json={
        'email_or_username': 'testuser2@mdefender.com',
        'password': 'WrongPassword123!'
    })
    print(f'  Attempt {i+1}: {r.status_code} - {r.json().get("message", "")[:80]}')
