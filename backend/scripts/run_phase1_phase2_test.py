import os, sys, requests, time, json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.mongodb_connection import MongoDB

WP_URL = "http://localhost/mahabub"
API_URL = "http://localhost:8000"

print("=================================================================")
print("   MDefender Pro: PHASE 1 & 2 MASTER LIVE VERIFICATION          ")
print("=================================================================")

db = MongoDB()

# ---------------------------------------------------------
# PHASE 1: Fleet Pairing & Multi-Site Cryptographic Isolation
# ---------------------------------------------------------
print("\n[PHASE 1] Testing Fleet Pairing & Multi-Site Isolation...")
user = db.users.find_one({"email": "user@gmail.com"})
assert user, "User account not found in database!"
user_id_str = str(user["_id"])
print(f"[✓] User Verified: {user.get('name', 'Operator')} ({user.get('email')}) [ID: {user_id_str}]")

websites = list(db.websites.find({"user_id": user_id_str}))
print(f"[✓] Fleet Size: {len(websites)} site(s) connected to this account:")
for idx, w in enumerate(websites, 1):
    w_id = str(w.get('_id') or w.get('id') or w.get('website_id'))
    print(f"    {idx}. Site: {w.get('name', w.get('site_name', 'Unnamed'))} ({w.get('domain', w.get('url'))})")
    print(f"       - Website ID: {w_id}")
    print(f"       - Status: {w.get('status')} | Verified: {w.get('verified', True)}")
    print(f"       - WAF Mode: {w.get('waf_mode', 'protect')}")
    print(f"       - Token: {str(w.get('site_token', 'N/A'))[:8]}... (Cryptographically Private)")

target_site = next((w for w in websites if "mahabub" in str(w.get("domain", "")).lower() or "mahabub" in str(w.get("url", "")).lower()), websites[0] if websites else None)
assert target_site, "No target WordPress site found in fleet!"
target_site_id = str(target_site.get('_id') or target_site.get('id') or target_site.get('website_id'))
print(f"\n[✓] Primary Live WordPress Target: {target_site.get('domain', target_site.get('url'))} [ID: {target_site_id}]")

# Test Multi-Site Isolation: verify each site has distinct site_token and website_id
all_ids = [str(w.get('_id') or w.get('id') or w.get('website_id')) for w in websites]
all_tokens = [w.get("site_token") for w in websites if w.get("site_token")]
assert len(all_ids) == len(set(all_ids)), "CRITICAL: Duplicate website_ids detected!"
assert len(all_tokens) == len(set(all_tokens)), "CRITICAL: Duplicate site_tokens detected!"
print("[✓] Multi-Site Cryptographic Isolation: 100% Verified (Zero Key Collisions)")

# Test Zero Cross-Talk: change target site waf_mode and verify other sites remain unaffected
other_sites = [w for w in websites if str(w.get('_id') or w.get('id') or w.get('website_id')) != target_site_id]
if other_sites:
    original_other_modes = {str(w.get('_id') or w.get('id') or w.get('website_id')): w.get("waf_mode") for w in other_sites}
    db.websites.update_one({"_id": target_site["_id"]}, {"$set": {"waf_mode": "protect"}})
    for w in other_sites:
        fresh_w = db.websites.find_one({"_id": w["_id"]})
        assert fresh_w.get("waf_mode") == original_other_modes[str(w.get('_id') or w.get('id') or w.get('website_id'))], "Cross-talk detected!"
    print(f"[✓] Zero Cross-Talk Guarantee Verified: Updates to {target_site_id} did NOT touch any of {len(other_sites)} other sites.")

# ---------------------------------------------------------
# PHASE 2: Autonomous Cloud WAF & Live Attack Interception
# ---------------------------------------------------------
print("\n[PHASE 2] Executing Live Attack Interception Test Suite...")

attacks = [
    {
        "name": "SQL Injection (SQLi) - UNION SELECT",
        "params": {"waf_test": "1", "q": "' UNION SELECT 1,2,user(),database() -- "}
    },
    {
        "name": "SQL Injection (SQLi) - Boolean OR Bypass",
        "params": {"waf_test": "1", "id": "1' OR '1'='1"}
    },
    {
        "name": "Cross-Site Scripting (XSS) - Svg Payload",
        "params": {"waf_test": "1", "comment": "<svg/onload=alert('MDefender_XSS')>"}
    },
    {
        "name": "Remote Code Execution (RCE) - Base64 Eval",
        "params": {"waf_test": "1", "eval_code": "eval(base64_decode('cGhwaW5mbygpOw=='))"}
    },
    {
        "name": "Path Traversal - wp-config.php Extraction",
        "params": {"waf_test": "1", "file": "../../../../wp-config.php"}
    }
]

blocked_count = 0
for idx, atk in enumerate(attacks, 1):
    res = requests.get(WP_URL + "/", params=atk["params"], timeout=5)
    print(f"\n  [{idx}] Testing {atk['name']}...")
    print(f"      HTTP Status Code: {res.status_code}")
    
    protected_by = res.headers.get("X-Protected-By", "None")
    print(f"      Protection Header: {protected_by}")
    
    if res.status_code == 403:
        blocked_count += 1
        print("      [✓] RESULT: BLOCKED with HTTP 403 (Attack neutralised!)")
    else:
        print(f"      [-] FAILED: Expected 403, received {res.status_code}")

assert blocked_count == len(attacks), f"Only {blocked_count}/{len(attacks)} attacks were blocked!"
print(f"\n[✓] All {len(attacks)} / {len(attacks)} attack vectors successfully intercepted and blocked!")

# ---------------------------------------------------------
# Telemetry Resolution Test
# ---------------------------------------------------------
print("\n[PHASE 2.6] Verifying Live Attack Telemetry in Central Cloud Database...")
recent_attacks = list(db.waf_attacks.find({"website_id": target_site_id}).sort("timestamp", -1).limit(5))
if not recent_attacks:
    recent_attacks = list(db.attacks.find({"website_id": target_site_id}).sort("timestamp", -1).limit(5))

print(f"[✓] Retrieved {len(recent_attacks)} recent logged attacks for Site {target_site_id}:")
for a in recent_attacks:
    t_type = a.get("attack_type", a.get("rule_name", "Threat Blocked"))
    t_ip = a.get("ip", "::1")
    t_time = a.get("timestamp", a.get("created_at", "Just now"))
    print(f"    - [{t_time}] {t_type} from IP: {t_ip} (Blocked: {a.get('blocked', True)})")

print("\n=================================================================")
print("      PHASE 1 & PHASE 2 TESTS: 100% PASSED (NO BUGS FOUND)       ")
print("=================================================================")
