import requests
import hashlib
import json

base_url = "http://localhost/mahabub"

print("--- Testing Live WordPress Turnstile via HTTP ---")

# 1. Test wp-login.php HTML rendering
res_login_page = requests.get(f"{base_url}/wp-login.php")
print(f"1. GET wp-login.php: Status {res_login_page.status_code}")
has_widget = "mdefender-turnstile-wrapper" in res_login_page.text
has_turnstile_box = "mdefWpTurnstileBox" in res_login_page.text
has_brand = "MDefender" in res_login_page.text
print(f"   Turnstile Widget in HTML: {has_widget}")
print(f"   Turnstile Interactive Box in HTML: {has_turnstile_box}")
print(f"   MDefender Brand in HTML: {has_brand}")

# 2. Test AJAX Challenge Generation
res_ch = requests.get(f"{base_url}/wp-admin/admin-ajax.php?action=waf_turnstile_challenge")
print(f"\n2. GET Challenge via AJAX: Status {res_ch.status_code}")
ch_data = res_ch.json()
print(f"   Challenge Response: {json.dumps(ch_data)}")
assert ch_data.get("success") is True, "Challenge generation failed!"
ch = ch_data["data"]

# 3. Solve PoW in Python
nonce = ch["nonce"]
salt = ch["salt"]
difficulty = ch["difficulty"]
target = "0" * difficulty
sol = 0
while True:
    h = hashlib.sha256(f"{nonce}:{salt}:{sol}".encode()).hexdigest()
    if h.startswith(target):
        break
    sol += 1

print(f"\n3. PoW Solved! Solution: {sol}, Hash: {h[:16]}...")

# 4. Test AJAX Verification
sess = requests.Session()
res_verify = sess.post(
    f"{base_url}/wp-admin/admin-ajax.php",
    data={
        "action": "waf_turnstile_verify",
        "token": ch["token"],
        "solution": str(sol),
        "telemetry[duration_ms]": "120",
        "telemetry[webdriver]": "0"
    }
)
print(f"\n4. POST Verify via AJAX: Status {res_verify.status_code}")
v_data = res_verify.json()
print(f"   Verification Response: {json.dumps(v_data)}")
assert v_data.get("success") is True, "Verification failed!"
clearance_token = v_data["data"]["clearance_token"]
print(f"   Clearance Token: {clearance_token[:35]}...")
print(f"   Cookies set in session: {sess.cookies.get_dict()}")
assert "__mdef_challenge_token" in sess.cookies, "Clearance cookie not set!"

# 5. Test Login Submission WITHOUT Turnstile (should fail with Security Verification Required)
res_bad_login = requests.post(
    f"{base_url}/wp-login.php",
    data={
        "log": "admin",
        "pwd": "randompassword123",
        "wp-submit": "Log In"
    }
)
print(f"\n5. POST wp-login.php WITHOUT Turnstile:")
has_sec_error = "Security Verification Required" in res_bad_login.text or "waf_turnstile_required" in res_bad_login.text
print(f"   Blocked with Security Verification Required: {has_sec_error}")
assert has_sec_error, "Login was NOT blocked without Turnstile!"

# 6. Test Login Submission WITH Clearance Token (should bypass Turnstile check and proceed to WP auth)
res_good_login = requests.post(
    f"{base_url}/wp-login.php",
    data={
        "log": "admin",
        "pwd": "wrongpasswordfortesting",
        "wp-submit": "Log In",
        "mdefender_turnstile_token": clearance_token,
        "mdefender_turnstile_solution": str(sol)
    }
)
print(f"\n6. POST wp-login.php WITH Turnstile Clearance Token:")
turnstile_blocked = "Security Verification Required" in res_good_login.text
print(f"   Turnstile blocked: {turnstile_blocked} (Should be False)")
print(f"   Proceeded to WP Auth (e.g. invalid username/password error): {'The password you entered' in res_good_login.text or 'Unknown username' in res_good_login.text or 'Error' in res_good_login.text}")
assert not turnstile_blocked, "Turnstile still blocked legitimate submission!"

print("\n==========================================")
print("ALL LIVE WORDPRESS TURNSTILE TESTS PASSED!")
print("==========================================")
