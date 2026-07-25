# MDefender Pro - Python WAF Client

[![PyPI version](https://badge.fury.io/py/mdefender.svg)](https://pypi.org/project/mdefender/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MDefender Pro** is a Web Application Firewall (WAF) client for Python. It protects Flask, Django, and WSGI applications against web attacks including XSS, SQLi, CSRF, and other OWASP Top 10 threats.

## Installation

```bash
pip install mdefender
```

## Quick Start

### Flask

```python
from flask import Flask
from mdefender import waf_middleware

app = Flask(__name__)

# Protect all routes
app.wsgi_app = waf_middleware(
    app.wsgi_app,
    api_key='your-api-key-here'
)

@app.route('/')
def hello():
    return 'Hello, protected world!'

if __name__ == '__main__':
    app.run()
```

### Django

Add to `settings.py`:

```python
MIDDLEWARE = [
    'mdefender.DjangoWAFMiddleware',
    # ... other middleware
]

# MDefender configuration
MDEFENDER_API_KEY = 'your-api-key-here'
MDEFENDER_SERVER = 'https://mdefender-pro.onrender.com'
```

That's it! Your website is protected.

## Configuration

### Flask Configuration

```python
app.wsgi_app = waf_middleware(
    app.wsgi_app,
    api_key='your-api-key-here',
    server='https://mdefender-pro.onrender.com',  # Default
    block_page=True  # Return block page HTML
)
```

### Django Configuration

Add to `settings.py`:

```python
# Required
MDEFENDER_API_KEY = 'your-api-key-here'

# Optional (defaults shown)
MDEFENDER_SERVER = 'https://mdefender-pro.onrender.com'
```

## Advanced Usage

### Direct Client Usage

You can use the client directly without middleware:

```python
from mdefender import MDefender

# Initialize client
waf = MDefender(
    api_key='your-api-key-here',
    server='https://mdefender-pro.onrender.com'
)

# Analyze a request
result = waf.analyze(
    url='/api/users?id=1',
    method='GET',
    headers={'User-Agent': 'Mozilla/5.0'},
    ip='192.168.1.1'
)

if result['status'] == 'blocked':
    print(f'Blocked: {result["attack_type"]}')
else:
    print('Request allowed')
```

### Get Protection Statistics

```python
stats = waf.get_stats()
print(f"Blocked attacks: {stats.get('blocked_count', 0)}")
print(f"Allowed requests: {stats.get('allowed_count', 0)}")
```

### Block an IP Address

```python
result = waf.block_ip('192.168.1.100')
print(result)
```

### Get Attack Logs

```python
logs = waf.get_logs(limit=50)
for log in logs.get('logs', []):
    print(f"{log['ip']} - {log['attack_type']} - {log['timestamp']}")
```

## How It Works

1. A request hits your Flask/Django app
2. MDefender intercepts it and builds a payload (method, URL, headers, body, IP, etc.)
3. The payload is sent to the MDefender Pro API for analysis
4. If the API detects a threat, it returns a `blocked` status with attack details
5. MDefender renders a block page and returns 403 status
6. If safe, the request continues to your route handler

## API Reference

### `MDefender(api_key, server, timeout)`

Initialize the WAF client.

**Parameters:**
- `api_key` (str, required) - Your MDefender Pro API key
- `server` (str) - API server URL (default: `https://mdefender-pro.onrender.com`)
- `timeout` (int) - Request timeout in seconds (default: 5)

### `waf_middleware(app, api_key, server, block_page)`

Wrap a Flask/WSGI app with WAF protection.

**Parameters:**
- `app` (WSGI app) - Your Flask application
- `api_key` (str, required) - Your MDefender Pro API key
- `server` (str) - API server URL
- `block_page` (bool) - Return block page HTML (default: True)

### `DjangoWAFMiddleware`

Django middleware class. Add to `MIDDLEWARE` in `settings.py`.

## License

MIT
