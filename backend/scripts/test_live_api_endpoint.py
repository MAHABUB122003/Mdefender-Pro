import urllib.request
import json

def test_api():
    # 1. Clean Request
    clean_payload = {
        'request': {
            'method': 'POST',
            'path': '/checkout/',
            'query': '',
            'headers': {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
            'body': 'order_id=4592&billing_city=Dhaka&payment_method=bkash'
        },
        'domain': 'localhost'
    }
    req1 = urllib.request.Request(
        'http://localhost:8000/api/v1/waf/analyze',
        data=json.dumps(clean_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req1) as resp:
        res1 = json.loads(resp.read().decode('utf-8'))
        dec1 = res1.get('data', {}).get('decision')
        risk1 = res1.get('data', {}).get('risk_score')
        print(f"Clean WooCommerce Checkout -> Decision: {dec1} | Risk Score: {risk1} | Action: {res1.get('data', {}).get('action')}")

    # 2. Attack Request
    atk_payload = {
        'request': {
            'method': 'GET',
            'path': '/wp-content/plugins/vuln/upload.php',
            'query': 'cmd=cat /etc/passwd',
            'headers': {'User-Agent': 'Mozilla/5.0'},
            'body': ''
        },
        'domain': 'localhost'
    }
    req2 = urllib.request.Request(
        'http://localhost:8000/api/v1/waf/analyze',
        data=json.dumps(atk_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req2) as resp:
            res2 = json.loads(resp.read().decode('utf-8'))
            dec2 = res2.get('data', {}).get('decision')
            risk2 = res2.get('data', {}).get('risk_score')
            reason2 = res2.get('data', {}).get('reason')
            print(f"Attack Request Response    -> Decision: {dec2} | Risk Score: {risk2} | Reason: {reason2}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        if "403 Forbidden" in body or "Access Denied" in body:
            print(f"Attack Request Intercepted -> HTTP {e.code} Forbidden: Successfully Blocked with MDefender Pro 403 HTML Page!")
        else:
            print(f"Attack Request HTTP {e.code}: {body[:200]}")

if __name__ == '__main__':
    test_api()
