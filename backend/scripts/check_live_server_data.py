import requests

res = requests.post('https://mdefender-pro.crafix.tech/api/auth/login', json={'email_or_username': 'user@gmail.com', 'password': 'user123'})
token = res.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Check user profile on live server
p_res = requests.get('https://mdefender-pro.crafix.tech/api/user/profile', headers=headers)
print("User profile on LIVE:", p_res.json())

# Check user dashboard on live server
d_res = requests.get('https://mdefender-pro.crafix.tech/api/user/dashboard', headers=headers)
print("\nUser dashboard on LIVE:", d_res.json().get('total_requests'), d_res.json().get('total_blocked'), len(d_res.json().get('recent_activity', [])))

# Check user logs on live server
l_res = requests.get('https://mdefender-pro.crafix.tech/api/user/logs?page=1&per_page=10', headers=headers)
print("\nUser logs on LIVE:", l_res.json().get('total'), len(l_res.json().get('logs', [])))

