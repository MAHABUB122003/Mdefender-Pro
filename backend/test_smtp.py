"""MDefender Pro: SMTP & OTP Verification Diagnostics Tool.

Run this script on your VPS to verify whether SMTP ports are open,
credentials are valid, and test OTP delivery to your inbox.

Usage:
    python backend/test_smtp.py [recipient@example.com]
"""

import sys
import os
import socket
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

# Change to script directory and load .env
base_dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(base_dir, '.env')

print("=" * 60)
print("  MDefender Pro — VPS SMTP & OTP Diagnostics Tool")
print("=" * 60)

if not os.path.exists(env_file):
    print(f"\n[CRITICAL ERROR] .env file NOT FOUND at: {env_file}")
    print("When you git clone or git pull on your VPS, .env is not copied by git!")
    print("You must create backend/.env on your VPS with your SMTP credentials:\n")
    print("  SMTP_SERVER=smtp.gmail.com")
    print("  SMTP_PORT=587")
    print("  SMTP_USERNAME=rahmanmdmahabubur575@gmail.com")
    print("  SMTP_PASSWORD=gmol rrdy ytxj wfvl")
    print("=" * 60)
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv(env_file)

smtp_server = os.getenv('SMTP_SERVER', '').strip()
smtp_port_raw = os.getenv('SMTP_PORT', '587').strip()
smtp_port = int(smtp_port_raw) if smtp_port_raw.isdigit() else 587
smtp_username = os.getenv('SMTP_USERNAME', '').strip()
smtp_password = os.getenv('SMTP_PASSWORD', '').strip().replace(' ', '').replace('"', '').replace("'", "")
alert_email = os.getenv('ALERT_EMAIL', '').strip() or smtp_username

target_email = sys.argv[1].strip() if len(sys.argv) > 1 else (alert_email or smtp_username)

print(f"\n1. Loaded Configuration from: {env_file}")
print(f"   • SMTP_SERVER:   {smtp_server or 'MISSING!'}")
print(f"   • SMTP_PORT:     {smtp_port}")
print(f"   • SMTP_USERNAME: {smtp_username or 'MISSING!'}")
print(f"   • SMTP_PASSWORD: {'*' * len(smtp_password) if smtp_password else 'MISSING!'}")
print(f"   • Test Target:   {target_email}")

if not smtp_server or not smtp_username or not smtp_password:
    print("\n[FAILED] SMTP credentials are incomplete in backend/.env!")
    print("Please edit backend/.env on your VPS and provide SMTP_SERVER, SMTP_USERNAME, and SMTP_PASSWORD.")
    sys.exit(1)

# Step 2: Test TCP Socket Reachability (detect if VPS firewall blocks ports)
print(f"\n2. Testing Outbound Port Reachability from this VPS to {smtp_server}...")

def test_tcp_port(host, port, timeout=5):
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return True, "OPEN (Connected successfully)"
    except Exception as e:
        return False, f"BLOCKED or UNREACHABLE ({e})"

ok_587, msg_587 = test_tcp_port(smtp_server, 587)
ok_465, msg_465 = test_tcp_port(smtp_server, 465)

print(f"   • Port 587 (STARTTLS): {msg_587}")
print(f"   • Port 465 (SSL):      {msg_465}")

if not ok_587 and not ok_465:
    print("\n[CRITICAL WARNING] Both Port 587 and Port 465 are BLOCKED by your VPS provider's firewall!")
    print("Many cloud providers (DigitalOcean, AWS, Hetzner, Vultr) block outbound mail ports by default.")
    print("Fixes:")
    print("  1. Check UFW firewall: sudo ufw allow out 587/tcp && sudo ufw allow out 465/tcp")
    print("  2. Open a ticket with your VPS provider asking to unblock outbound SMTP ports (587 & 465).")
    print("  3. Or use an API-based mail relay like Resend, SendGrid, or Mailgun.")
    sys.exit(1)

# Step 3: Test Authentication and Send Verification OTP Email
print(f"\n3. Authenticating and sending test security verification OTP...")

msg = MIMEMultipart('alternative')
msg['Subject'] = '849201 is your MDefender Pro Security Test OTP'
msg['From'] = f"MDefender Pro Security <{smtp_username}>"
msg['To'] = target_email

text_content = f"""Hello,

This is a test security dispatch from your MDefender Pro VPS instance.
Your 6-digit verification code is: 849201

Dispatched at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
Host: {socket.gethostname()}
"""
msg.attach(MIMEText(text_content, 'plain'))

delivered = False
method_used = ""

# Try Port 465 SSL first if configured or available
if smtp_port == 465 or (not ok_587 and ok_465):
    try:
        print(f"   Connecting via SSL Port 465...")
        with smtplib.SMTP_SSL(smtp_server, 465, timeout=10) as s:
            s.login(smtp_username, smtp_password)
            s.send_message(msg)
        delivered = True
        method_used = "Port 465 (Direct SSL)"
    except Exception as e_ssl:
        print(f"   [Port 465 Error] {e_ssl}")

# If not yet delivered, try Port 587 STARTTLS
if not delivered and ok_587:
    try:
        print(f"   Connecting via STARTTLS Port 587...")
        with smtplib.SMTP(smtp_server, 587, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_username, smtp_password)
            s.send_message(msg)
        delivered = True
        method_used = "Port 587 (STARTTLS)"
    except Exception as e_587:
        print(f"   [Port 587 Error] {e_587}")

print("-" * 60)
if delivered:
    print(f"\n[SUCCESS!] Verification email successfully delivered to {target_email}!")
    print(f"Delivered via: {method_used}")
    print("Your SMTP configuration is 100% working and ready to dispatch OTP codes.")
else:
    print("\n[FAILED] Could not send test email.")
    print("Common causes for Gmail SMTP failure:")
    print("  1. Google 2-Step Verification is required to generate an App Password.")
    print("  2. If using an App Password, make sure it has 16 characters (e.g. 'gmolrrdyytxjwfvl').")
    print("  3. Check Google Security Alerts: Google may have sent a 'Suspicious login prevented' email.")
    print("     Open Gmail and approve the login attempt from your VPS IP.")
print("=" * 60)
