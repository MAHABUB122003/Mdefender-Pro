import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
from src.security.attack_blocker import AttackBlocker
from src.security.rate_limiter import RateLimiter
from src.services.security_scanner_service import SecurityScannerService
from src.api.waf_api import WAFAPI

def test_autoblock_and_rate_limiting():
    print("=" * 60)
    print("TEST 1: Auto-Block & Rate Limiting Verification")
    print("=" * 60)
    
    db = MongoDB()
    ab = AttackBlocker(db)
    test_user_id = "test_user_autoblock_999"
    test_ip = "198.51.100.42"
    
    # Configure user settings: threshold = 5 attacks, rate limit = 10
    config_saved = ab.save_user_settings(test_user_id, {
        "auto_block_enabled": True,
        "auto_block_threshold": 5,
        "auto_block_window_hours": 24,
        "auto_block_duration_hours": 1,
        "rate_limit_per_minute": 10,
        "auto_block_permanent": False
    })
    print(f"  [+] Saved user config: threshold={config_saved['auto_block_threshold']}, rate_limit={config_saved['rate_limit_per_minute']}")
    
    # Clean any prior blacklist / attack attempts for test_ip
    db.blacklist.delete_many({"ip": test_ip})
    db.auto_blocks.delete_many({"ip": test_ip})
    db.attack_attempts.delete_many({"ip": test_ip})
    
    # 1. Rate Limiter dynamic test
    rl = RateLimiter()
    for i in range(10):
        rl.increment(test_ip)
    is_rl = rl.is_rate_limited(test_ip, max_requests=10)
    print(f"  [+] Rate limiter hit 10 requests: is_rate_limited={is_rl} (Expected: True)")
    assert is_rl == True, "Rate limiter should be True at limit"
    
    # 2. Simulate 4 attack attempts (should NOT auto block yet)
    for i in range(4):
        ab.record_attack(test_ip, "SQL_INJECTION", "/index.php?id=1' OR '1'='1", user_id=test_user_id)
    
    blocked_early = ab.check_and_auto_block(test_ip, threshold=5, window_hours=24, duration_hours=1, user_id=test_user_id)
    print(f"  [+] 4 attacks recorded. check_and_auto_block={blocked_early} (Expected: False)")
    assert blocked_early == False, "Should not auto block before threshold"
    
    # 3. 5th attack attempt (reaches threshold of 5 -> MUST auto block)
    ab.record_attack(test_ip, "SQL_INJECTION", "/index.php?id=1' UNION SELECT", user_id=test_user_id)
    blocked_now = ab.check_and_auto_block(test_ip, threshold=5, window_hours=24, duration_hours=1, user_id=test_user_id)
    print(f"  [+] 5th attack recorded. check_and_auto_block={blocked_now} (Expected: True)")
    assert blocked_now == True, "Must auto block when reaching threshold"
    
    # Verify IP is now blacklisted for this user
    is_bl = ab.is_blacklisted(test_ip, user_id=test_user_id)
    print(f"  [+] Blacklist check for {test_ip}: is_blacklisted={is_bl} (Expected: True)")
    assert is_bl == True, "IP must be in blacklist"
    
    # Cleanup test artifacts
    db.blacklist.delete_many({"ip": test_ip})
    db.auto_blocks.delete_many({"ip": test_ip})
    db.attack_attempts.delete_many({"ip": test_ip})
    print("  [PASS] Auto-Block & Rate Limiting logic verified successfully!")

def test_security_scanner_service():
    print("\n" + "=" * 60)
    print("TEST 2: Security & Port Audit Diagnostics Verification")
    print("=" * 60)
    
    scanner = SecurityScannerService(timeout=6.0)
    
    # Test normalization
    clean_url, hostname, scheme = scanner.normalize_url("cloudflare.com")
    print(f"  [+] Normalized: clean_url={clean_url}, hostname={hostname}")
    assert hostname == "cloudflare.com"
    
    # Run full audit on cloudflare.com (consistent, fast, reliable target)
    print("  [+] Executing full security audit on cloudflare.com...")
    report1 = scanner.run_full_audit("cloudflare.com")
    print(f"  [+] Scan 1 Score: {report1['score']}/100 [Grade: {report1['grade']}]")
    print(f"      - SSL: {report1['ssl']['supported']} (Issuer: {report1['ssl'].get('issuer')}, Days Left: {report1['ssl'].get('days_remaining')})")
    print(f"      - Headers Hardened: {report1['http']['header_score']}%")
    print(f"      - WAF Detected: {report1['http']['waf_detected']}")
    print(f"      - Open Ports: {report1['ports']['open_count']} (Critical: {report1['ports']['critical_exposed']})")
    
    # Verify no false positive critical files
    for p in report1['sensitive_paths']:
        if p['path'] in ('/.env', '/.git/HEAD', '/wp-config.php.bak'):
            print(f"      - Path {p['path']}: exposed={p['exposed']} (status={p['http_status']}, notes={p.get('notes')})")
            assert p['exposed'] == False, f"Path {p['path']} should not be marked exposed on cloudflare.com"
            
    # Run Scan 2 immediately to verify score stability/consistency
    print("  [+] Executing Scan 2 to verify score reproducibility...")
    report2 = scanner.run_full_audit("cloudflare.com")
    print(f"  [+] Scan 2 Score: {report2['score']}/100 [Grade: {report2['grade']}]")
    assert report1['score'] == report2['score'], f"Scores must be consistent! Got {report1['score']} vs {report2['score']}"
    print("  [PASS] Security & Port Audit verified consistent, accurate, and free of false positives!")

if __name__ == "__main__":
    test_autoblock_and_rate_limiting()
    test_security_scanner_service()
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

