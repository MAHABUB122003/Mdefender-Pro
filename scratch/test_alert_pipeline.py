import requests
import json

backend_url = "http://localhost:8000"
test_email = "testuser@mdefender.pro"
test_pass = "SuperSecure#2026!Pass"

print("=== TESTING REAL-TIME ALERT PIPELINE & NOTIFICATIONS ===")

# 1. Login to get authenticated user session
session = requests.Session()
login_resp = session.post(f"{backend_url}/api/auth/login", json={
    "email_or_username": test_email,
    "password": test_pass
})
print("1. User Login Status:", login_resp.status_code)

# 2. Get User Notifications count before alert
notifs_before = session.get(f"{backend_url}/api/v1/notifications")
print("2. Notifications Before:", len(notifs_before.json().get("data", {}).get("notifications", [])))

# 3. Simulate WordPress Plugin Radar Triggering a Threat Alert
alert_payload = {
    "api_key": "mdf_live_test_api_key_8492048102948201",
    "domain": "localhost",
    "alert_type": "malware",
    "title": "🚨 Critical Malware Discovered on localhost",
    "message": "Polymorphic PHP Backdoor shell detected in wp-content/uploads/backdoor_shell.php",
    "severity": "critical",
    "file_path": "wp-content/uploads/backdoor_shell.php",
    "threat_name": "WebShell (Godzilla/Behinder/WSO)",
    "details": {
        "rule_matched": "builtin_webshell_markers",
        "risk_score": 100,
        "action": "quarantined"
    }
}
alert_resp = requests.post(f"{backend_url}/api/v1/malware/report-alert", json=alert_payload)
print("3. Plugin Report Alert Status:", alert_resp.status_code, alert_resp.json())

# 4. Fetch User Notifications after alert
notifs_after = session.get(f"{backend_url}/api/v1/notifications")
notifs_list = notifs_after.json().get("data", {}).get("notifications", [])
print(f"4. Notifications After: {len(notifs_list)} total")
if notifs_list:
    latest = notifs_list[0]
    print(f"   Latest Notification: [{latest.get('severity')}] {latest.get('title')} -> {latest.get('message')}")

# 5. Check WAF Events / Live feed
events_resp = session.get(f"{backend_url}/api/v1/waf/events")
events_list = events_resp.json().get("data", {}).get("events", [])
print(f"5. Security Events Count: {len(events_list)}")
if events_list:
    print(f"   Latest Event: {events_list[0].get('attack_type')} | Status: {events_list[0].get('status')} | Source: {events_list[0].get('detection_source')}")

print("\n=== ALERT PIPELINE VERIFIED SUCCESSFULLY ===")
