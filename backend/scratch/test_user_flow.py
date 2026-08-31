import requests
import random
import sys

BASE_URL = "http://127.0.0.1:8000/api/auth"

# Generate a unique email
rand_id = random.randint(1000, 9999)
email = f"testuser_{rand_id}@mdefender.com"
username = f"testuser_{rand_id}"
password = "SecureP@ssw0rd123"

print(f"Testing flow for: {email}")

# 1. Register
print("\n--- Step 1: Registering user ---")
payload = {
    "full_name": "Test User Flow",
    "username": username,
    "email": email,
    "password": password,
    "confirm_password": password
}
r = requests.post(f"{BASE_URL}/register", json=payload)
print(f"Response code: {r.status_code}")
data = r.json()
print("Response body:", data)

if r.status_code != 200 or data.get("status") != "success":
    print("❌ Registration failed")
    sys.exit(1)

# Extract token
token = data.get("verification_token")
if not token:
    print("❌ Verification token not returned in response")
    sys.exit(1)

print(f"✅ User registered successfully. Token: {token[:20]}...")

# 2. Verify Email
print("\n--- Step 2: Verifying email ---")
v_payload = {"token": token}
r_v = requests.post(f"{BASE_URL}/verify-email", json=v_payload)
print(f"Response code: {r_v.status_code}")
v_data = r_v.json()
print("Response body:", v_data)

if r_v.status_code != 200 or v_data.get("status") != "success":
    print("❌ Email verification failed")
    sys.exit(1)

print("✅ Email verified successfully!")

# 3. Login
print("\n--- Step 3: Logging in ---")
l_payload = {
    "email_or_username": email,
    "password": password,
    "remember_me": False
}
session = requests.Session()
r_l = session.post(f"{BASE_URL}/login", json=l_payload)
print(f"Response code: {r_l.status_code}")
l_data = r_l.json()
print("Response body (partial):", {k: v for k, v in l_data.items() if k != "user"})

if r_l.status_code != 200 or l_data.get("status") != "success":
    print("❌ Login failed")
    sys.exit(1)

print("✅ Login successful! User details fetched:")
print("   Email:", l_data.get("user", {}).get("email"))
print("   API Key:", l_data.get("user", {}).get("api_key"))
print("   Websites count:", len(l_data.get("user", {}).get("websites", [])))

print("\n🎉 ALL TESTS PASSED!")
