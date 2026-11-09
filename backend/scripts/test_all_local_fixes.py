import requests
import json
import time

base_cloud_url = "http://127.0.0.1:8000"
wp_url = "http://localhost/mahabub"
api_key = "zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1"
site_token = "da842331a2044c5aa1c4a60d0dd346d15ad320de3d184e3eb210f6e975e1a478"

print("==================================================")
print("TESTING 1: CLOUD SYNC DIRECTLY TO WORDPRESS")
print("==================================================")
sync_url = f"{wp_url}/?waf_cloud_sync=1&api_key={api_key}&site_token={site_token}"
test_payload = {
    "action": "test",
    "blacklist": ["198.51.100.99", "203.0.113.88"],
    "blocked_countries": ["RU", "CN"],
    "config": {
        "hold_press_enabled": True,
        "hold_press_duration_ms": 2500,
        "turnstile_enabled": False,
        "turnstile_mode": "forms"
    }
}
r = requests.post(sync_url, json=test_payload, timeout=10)
print(f"Status Code : {r.status_code}")
try:
    res = r.json()
    print(f"Response    : status={res.get('status')}, blacklist_count={res.get('blacklist_count')}")
except Exception:
    print(f"Response text: {r.text[:200]}")

print("\n==================================================")
print("TESTING 2: IP BLACKLIST BLOCKING IN ACTION")
print("==================================================")
# Add test IP 198.51.100.77 to blacklist via sync
bl_payload = {
    "action": "add_blacklist",
    "ip": "198.51.100.77",
    "reason": "Automated E2E Test Ban",
    "duration": "1d"
}
r_bl = requests.post(sync_url, json=bl_payload, timeout=10)
print(f"Add Blacklist Status : {r_bl.status_code}")
try:
    print(f"Add Blacklist Result : {r_bl.json()}")
except Exception:
    print(f"Result text: {r_bl.text[:100]}")

# Now simulate an incoming request from 198.51.100.77 with X-Forwarded-For
r_blocked = requests.get(f"{wp_url}/", headers={"X-Forwarded-For": "198.51.100.77"}, timeout=10)
print(f"Visitor from blacklisted IP (198.51.100.77) Status Code : {r_blocked.status_code}")
if r_blocked.status_code == 403:
    print("SUCCESS: Blacklisted IP was blocked with HTTP 403!")
else:
    print(f"Check status: {r_blocked.status_code}")

print("\n==================================================")
print("TESTING 3: BIOMETRIC LOGIN SECURITY (HOLD PRESS)")
print("==================================================")
# Enable hold_press and check wp-login.php
cfg_payload = {
    "action": "sync",
    "config": {
        "hold_press_enabled": True,
        "hold_press_duration_ms": 2000
    }
}
r_cfg = requests.post(sync_url, json=cfg_payload, timeout=10)
print(f"Config sync status: {r_cfg.status_code}")

r_login = requests.get(f"{wp_url}/wp-login.php", timeout=10)
print(f"wp-login.php Status Code : {r_login.status_code}")
has_hold_widget = "waf-hold-container" in r_login.text or "Press & Hold to Authenticate" in r_login.text or "hold-press" in r_login.text
print(f"Biometric Hold Widget Present on Login Page : {has_hold_widget}")

print("\n==================================================")
print("TESTING 4: BACKUP CREATION VIA RESCUE / CLOUD SYNC")
print("==================================================")
bk_payload = {
    "action": "create_backup",
    "type": "database",
    "note": "Automated Verification Snapshot"
}
r_bk = requests.post(sync_url, json=bk_payload, timeout=30)
print(f"Create Backup Status Code : {r_bk.status_code}")
try:
    bk_res = r_bk.json()
    action_res = bk_res.get("action_result", {})
    print(f"Backup Result : success={action_res.get('success')}, filename={action_res.get('filename')}, size={action_res.get('size')}")
except Exception:
    print(f"Response: {r_bk.text[:200]}")

print("\n==================================================")
print("TESTING 5: MONITORING UPTIME & CORE WEB VITALS")
print("==================================================")
from src.services.monitoring_service import MonitoringService
svc = MonitoringService()
probe = svc.probe_website_health(wp_url)
print(f"Uptime Probe : online={probe.get('is_online')}, code={probe.get('status_code')} {probe.get('status_text')}, ttfb={probe.get('ttfb_ms')}ms")

perf = svc.run_performance_audit(wp_url, strategy="desktop", force=True)
print(f"Performance Audit : score={perf.get('score')}/100, rating={perf.get('rating')}, LCP={perf.get('metrics', {}).get('lcp_ms')}ms, TTFB={perf.get('metrics', {}).get('ttfb_ms')}ms")

print("\n==================================================")
print("ALL 5 AUTOMATED TESTS FINISHED!")
print("==================================================")

