import requests

BASE = 'http://localhost:8000/api/auth'

for i in range(7):
    r = requests.post(f'{BASE}/login', json={
        'email_or_username': 'testuser2@mdefender.com',
        'password': 'WrongPassword123!'
    })
    body = r.json()
    msg = body.get('message', body.get('detail', r.text[:100]))
    print(f'Attempt {i+1}: {r.status_code} {msg[:100]}')
