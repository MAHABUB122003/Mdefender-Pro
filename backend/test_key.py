import urllib.request, json

def test_api(url, key):
    req = urllib.request.Request(
        url,
        data=json.dumps({'api_key': key, 'domain': 'localhost'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req)
        print(f"SUCCESS {url}: {res.read().decode('utf-8')}")
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"ERROR {url}: {e} - {e.read().decode('utf-8')}")
        else:
            print(f"ERROR {url}: {e}")

api_key = "b_wPB2efwBi-JnT07c8VHDZBmZCH1M-eR6id1eVnHHVHX_RYE03ynMebkFWREa5s"
print("Testing Local Backend...")
test_api('http://localhost:8000/api/v1/wordpress/connect', api_key)

print("\nTesting Live Backend...")
test_api('https://mdefenderapi.onrender.com/api/v1/wordpress/connect', api_key)
