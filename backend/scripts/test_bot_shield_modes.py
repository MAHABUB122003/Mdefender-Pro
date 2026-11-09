import requests

wp_url = "http://localhost/mahabub"
api_key = "zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1"
site_token = "da842331a2044c5aa1c4a60d0dd346d15ad320de3d184e3eb210f6e975e1a478"
sync_url = f"{wp_url}/?waf_cloud_sync=1&api_key={api_key}&site_token={site_token}"

print("TEST: Testing Bot Shield in forms-only mode...")
requests.post(sync_url, json={"action": "sync", "config": {"turnstile_enabled": True, "turnstile_mode": "forms"}}, timeout=10)

# 1. Normal visitor to homepage in forms-only mode
r1 = requests.get(f"{wp_url}/", timeout=10)
print(f"Homepage in forms-only mode Status Code : {r1.status_code}")
assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
assert "Just a moment..." not in r1.text, "Sitewide challenge should NOT appear in forms-only mode"
print("SUCCESS: Homepage is 200 OK without interstitial challenge in forms-only mode!")

# 2. Check comment form or registration form has Turnstile widget
r_comm = requests.get(f"{wp_url}/", timeout=10)
# Look for widget container
print(f"Comment form widget present: {'mdefender-turnstile-container' in r_comm.text}")

print("TEST: Testing Bot Shield in site_wide mode...")
requests.post(sync_url, json={"action": "sync", "config": {"turnstile_enabled": True, "turnstile_mode": "site_wide"}}, timeout=10)

# Normal visitor without clearance gets challenge
r2 = requests.get(f"{wp_url}/", timeout=10)
print(f"Normal visitor in site_wide mode Status Code : {r2.status_code}")
assert "Just a moment..." in r2.text or r2.status_code == 403, "Expected challenge in site_wide mode"
print("SUCCESS: Unverified visitor correctly receives challenge page in site_wide mode!")

# Monitoring probe passes through even in site_wide mode!
r3 = requests.get(f"{wp_url}/", headers={"X-MDefender-Probe": "1", "X-API-KEY": api_key}, timeout=10)
print(f"Monitoring probe in site_wide mode Status Code : {r3.status_code}")
assert r3.status_code == 200, f"Expected 200 for probe, got {r3.status_code}"
print("SUCCESS: Monitoring probe passes through with HTTP 200 in site_wide mode!")

# Reset to forms mode
requests.post(sync_url, json={"action": "sync", "config": {"turnstile_enabled": True, "turnstile_mode": "forms"}}, timeout=10)
print("TEST COMPLETED SUCCESSFULLY!")

