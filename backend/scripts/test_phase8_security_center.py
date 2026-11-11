import os
import sys
import requests
from pathlib import Path

# Add backend root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
from src.auth.jwt_service import JWTService
from src.services.security_scanner_service import SecurityScannerService

BASE_URL = "http://127.0.0.1:8000"

def run_phase8_security_center_audit():
    print("=" * 68)
    print("PHASE 8 AUDIT: SECURITY CENTER & ORIGIN AUDITING LIVE VERIFICATION")
    print("=" * 68)

    db = MongoDB()
    user = db.users.find_one({"email": "user@gmail.com"})
    assert user, "User user@gmail.com must exist!"
    user_id = str(user["_id"])

    site_b = db.websites.find_one({"domain": "mahabubur.shop"})
    assert site_b, "Site B (mahabubur.shop) must exist!"

    jwt_svc = JWTService()
    token = jwt_svc.create_access_token(user_id, user.get("email"), role=user.get("role", "user"))
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # -----------------------------------------------------------------
    # Test 1: Threat Intelligence & RIR WHOIS Engine
    # -----------------------------------------------------------------
    print("\n[Test 1] Testing Threat Intelligence & RIR WHOIS Engine...")
    test_ip = "8.8.8.8"
    res_whois = requests.get(f"{BASE_URL}/api/user/whois?ip={test_ip}", headers=headers, timeout=10)
    print(f"  * WHOIS Query Status: [{res_whois.status_code}]")
    assert res_whois.status_code == 200, f"WHOIS query failed: {res_whois.text}"
    
    whois_data = res_whois.json()
    print(f"    -> Target IP: {whois_data.get('ip')} | PTR: {whois_data.get('hostname')}")
    print(f"    -> ASN / ISP: {whois_data.get('geo', {}).get('as')} | {whois_data.get('geo', {}).get('isp')}")
    print(f"    -> Threat Score: {whois_data.get('threat_assessment', {}).get('score')}/100 | Level: {whois_data.get('threat_assessment', {}).get('level')}")
    assert whois_data.get("ip") == test_ip, "Queried IP must match target!"
    assert "geo" in whois_data, "WHOIS must return geolocation intelligence!"
    print("  [PASS] Threat Intelligence & WHOIS: Operational with reverse DNS & ASN mapping.")

    # -----------------------------------------------------------------
    # Test 2: Live Security & Port Scanner (Ports, Headers, SSL, Paths)
    # -----------------------------------------------------------------
    print("\n[Test 2] Testing Live Security & Port Scanner across Origin...")
    res_audit = requests.post(f"{BASE_URL}/api/user/security-audit", json={"url": "https://mahabubur.shop"}, headers=headers, timeout=20)
    print(f"  * Audit Endpoint Status: [{res_audit.status_code}]")
    assert res_audit.status_code == 200, f"Security audit failed: {res_audit.text}"

    audit_resp = res_audit.json()
    audit_data = audit_resp.get("audit") or audit_resp
    score = audit_data.get("score")
    grade = audit_data.get("grade")
    verdict = audit_data.get("verdict")
    print(f"    -> Target: {audit_data.get('target_url')} ({audit_data.get('ip_address')})")
    print(f"    -> Security Score: {score}/100 | Grade: {grade} | Verdict: {verdict}")
    assert score is not None and score >= 80, f"Security score too low: {score}"
    assert grade in ("A", "A+"), f"Security grade unexpected: {grade}"

    # 2.1 Ports Evaluation
    ports_info = audit_data.get("ports", {})
    open_count = ports_info.get("open_count", 0)
    print(f"    -> Open Ports Detected: {open_count} (Total Scanned: {ports_info.get('total_scanned')})")
    assert open_count >= 1, "At least port 80/443 must be detected on active website!"

    # 2.2 Security Headers Evaluation
    headers_eval = audit_data.get("http", {}).get("headers_evaluation", [])
    enforced_headers = [h.get("name") for h in headers_eval if h.get("present")]
    print(f"    -> Enforced Security Headers ({len(enforced_headers)}): {', '.join(enforced_headers[:4])}...")
    assert len(enforced_headers) >= 4, "Enterprise website must enforce critical security headers!"

    # 2.3 Sensitive Endpoints Isolation
    paths = audit_data.get("sensitive_paths", [])
    critical_exposed = [p.get("path") for p in paths if p.get("risk") == "critical" and p.get("exposed")]
    print(f"    -> Critical Endpoints Exposed: {len(critical_exposed)} ({', '.join(critical_exposed) if critical_exposed else 'None - Fully Protected'})")
    assert len(critical_exposed) == 0, f"Critical files exposed: {critical_exposed}"

    # 2.4 Origin Hardening 8/8 Shields Matrix
    hardening_info = audit_data.get("hardening", {})
    active_shields = hardening_info.get("active_shields_count", 0)
    total_shields = hardening_info.get("total_shields", 8)
    print(f"    -> Origin Hardening Matrix: {active_shields}/{total_shields} Shields Active")
    assert active_shields >= 5, f"Expected at least 5 active shields, found {active_shields}"
    print("  [PASS] Live Security & Port Scanner: Grade A+ cyber audit validated.")

    # -----------------------------------------------------------------
    # Test 3: Breach Intelligence & HIBP Credentials Verifier
    # -----------------------------------------------------------------
    print("\n[Test 3] Testing Breach Intelligence & HIBP Credentials Engine...")
    
    # 3.1 Known Pwned Password (password123)
    pwned_payload = {"password": "password123"}
    res_pwned = requests.post(f"{BASE_URL}/api/v1/websites/breach-intelligence/check-password", json=pwned_payload, headers=headers, timeout=10)
    pwned_data = res_pwned.json().get("data", {})
    print(f"  * Pwned Test [password123] -> Pwned: {pwned_data.get('pwned')} | Leaked Count: {pwned_data.get('count')} | Risk: {pwned_data.get('risk')}")
    assert pwned_data.get("pwned") is True, "password123 MUST be detected as pwned!"
    assert pwned_data.get("risk") == "CRITICAL", "High-count leaked password must have CRITICAL risk!"

    # 3.2 Secure Unique Password
    clean_payload = {"password": "zK9#mQ2$vL8!pW4*#99xL!@"}
    res_clean = requests.post(f"{BASE_URL}/api/v1/websites/breach-intelligence/check-password", json=clean_payload, headers=headers, timeout=10)
    clean_data = res_clean.json().get("data", {})
    print(f"  * Clean Test [zK9#...] -> Pwned: {clean_data.get('pwned')} | Count: {clean_data.get('count')} | Risk: {clean_data.get('risk')}")
    assert clean_data.get("pwned") is False, "Complex unique password must not be pwned!"
    assert clean_data.get("risk") == "CLEAN", "Unique password risk must be CLEAN!"
    print("  [PASS] Breach Intelligence: k-Anonymity HIBP credential verification operational.")

    print("\n" + "=" * 68)
    print("PHASE 8 AUDIT: 100% PASSED ACROSS SECURITY CENTER & ORIGIN AUDITING")
    print("=" * 68)

if __name__ == "__main__":
    run_phase8_security_center_audit()
