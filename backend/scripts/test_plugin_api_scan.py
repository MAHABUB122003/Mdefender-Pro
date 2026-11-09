import json
import base64
import urllib.request

API_URL = "http://127.0.0.1:8000/api/v1/malware/plugin-scan"
API_KEY = "zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1"
SITE_TOKEN = "6b1e49b9f84449f39b0d6fe4d4a31e200a526d20843047b6a182d434ae791398"
DOMAIN = "localhost"

# Test 1: Clean index.php file
clean_content = b"<?php // Silence is golden."
payload_clean = {
    "api_key": API_KEY,
    "domain": DOMAIN,
    "site_token": SITE_TOKEN,
    "filename": "index.php",
    "content_base64": base64.b64encode(clean_content).decode("utf-8"),
    "source": "plugins"
}

# Test 2: RCE Backdoor
evil_content = b"<?php system($_GET['cmd']); ?>"
payload_evil = {
    "api_key": API_KEY,
    "domain": DOMAIN,
    "site_token": SITE_TOKEN,
    "filename": "rce_backdoor.php",
    "content_base64": base64.b64encode(evil_content).decode("utf-8"),
    "source": "plugins"
}

def send_scan(payload, label):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            print(f"\n=== Result for {label} ===")
            print(json.dumps(res, indent=2))
    except urllib.error.HTTPError as e:
        print(f"\nHTTP Error {e.code} for {label}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"\nError for {label}: {e}")

if __name__ == "__main__":
    send_scan(payload_clean, "Clean File")
    send_scan(payload_evil, "RCE Backdoor")
