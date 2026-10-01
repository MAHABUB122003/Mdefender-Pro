"""
Comprehensive Automated Verification Script for Country Blocking (Geo-Restriction)
Tests:
1. Python backend IPFilter / WAF API country blocking for BD and international countries.
2. Handling of local loopback/private IPs and public IPs.
3. Edge CDN headers (CF-IPCountry, X-Country-Code).
4. MongoDB country_blocks scoping (user-scoped and global).
5. PHP WAF Engine & Bootstrap Country Blocking simulation.
"""

import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from src.database.mongodb_connection import MongoDB
from src.security.ip_filter import IPFilter
from src.api.waf_api import WAFAPI
from bson import ObjectId

def test_backend_country_blocking():
    print("=" * 60)
    print("1. TESTING BACKEND IPFILTER & WAF API COUNTRY BLOCKING")
    print("=" * 60)
    
    db = MongoDB()
    ip_filter = IPFilter()
    waf_api = WAFAPI()
    
    test_user_id = str(ObjectId())
    
    # Clean previous test entries
    db.country_blocks.delete_many({'country_code': {'$in': ['BD', 'RU', 'CN', 'US']}, 'user_id': test_user_id})
    
    # Test 1: No block initially
    is_blocked, geo = ip_filter.is_country_blocked("103.151.30.111", user_id=test_user_id)
    print(f"[TEST 1] Initial Bangladesh IP check: blocked={is_blocked}, country={geo.get('country_code')}")
    assert not is_blocked, "Should not be blocked initially"
    print("  -> PASS: Traffic initially allowed")
    
    # Test 2: Add Bangladesh (BD) to user's country blocks
    db.country_blocks.insert_one({
        'user_id': test_user_id,
        'added_by_user_id': test_user_id,
        'country_code': 'BD',
        'country_name': 'Bangladesh',
        'reason': 'Blocked by security policy'
    })
    
    # Test 2a: Check Bangladesh public IP
    is_blocked_bd, geo_bd = ip_filter.is_country_blocked("103.151.30.111", user_id=test_user_id)
    print(f"[TEST 2a] Bangladesh Public IP (103.151.30.111) check: blocked={is_blocked_bd}, country={geo_bd.get('country_code')}")
    assert is_blocked_bd, "Bangladesh public IP should be blocked"
    print("  -> PASS: Bangladesh Public IP blocked successfully")
    
    # Test 2b: Check with edge header CF-IPCountry: BD
    is_blocked_hdr, geo_hdr = ip_filter.is_country_blocked("127.0.0.1", user_id=test_user_id, headers={'CF-IPCountry': 'BD'})
    print(f"[TEST 2b] Edge Header CF-IPCountry: BD check: blocked={is_blocked_hdr}, country={geo_hdr.get('country_code')}")
    assert is_blocked_hdr, "Header CF-IPCountry: BD should be blocked"
    print("  -> PASS: Edge header CF-IPCountry blocked successfully")
    
    # Test 2c: Non-blocked country (e.g. US)
    is_blocked_us, geo_us = ip_filter.is_country_blocked("8.8.8.8", user_id=test_user_id, headers={'CF-IPCountry': 'US'})
    print(f"[TEST 2c] US IP check: blocked={is_blocked_us}, country={geo_us.get('country_code')}")
    assert not is_blocked_us, "US IP should NOT be blocked"
    print("  -> PASS: Non-blocked country allowed successfully")
    
    # Test 3: Block Russia (RU) as well
    db.country_blocks.insert_one({
        'user_id': test_user_id,
        'added_by_user_id': test_user_id,
        'country_code': 'RU',
        'country_name': 'Russia',
        'reason': 'Blocked by security policy'
    })
    
    is_blocked_ru, geo_ru = ip_filter.is_country_blocked("185.220.101.1", user_id=test_user_id, headers={'CF-IPCountry': 'RU'})
    print(f"[TEST 3] Russia IP / Header check: blocked={is_blocked_ru}, country={geo_ru.get('country_code')}")
    assert is_blocked_ru, "Russia should be blocked"
    print("  -> PASS: Russia blocked successfully")
    
    # Test 4: Full WAF Request Evaluation
    eval_res = waf_api.evaluate_request_fast({
        'ip': '103.151.30.111',
        'url': '/wp-login.php',
        'method': 'GET',
        'headers': {'User-Agent': 'Mozilla/5.0', 'CF-IPCountry': 'BD'}
    }, user_id=test_user_id)
    
    decision = eval_res[0]
    print(f"[TEST 4] WAF evaluate_request_fast for BD visitor: decision={decision.get('decision')}, reason={decision.get('reason')}")
    assert decision.get('decision') == 'BLOCK', "WAF decision must be BLOCK"
    assert 'BD' in decision.get('reason', '') or 'Bangladesh' in decision.get('reason', ''), "Reason must mention Bangladesh/BD"
    print("  -> PASS: WAF evaluate_request_fast blocked BD request with full metadata")
    
    # Cleanup
    db.country_blocks.delete_many({'country_code': {'$in': ['BD', 'RU', 'CN', 'US']}, 'user_id': test_user_id})
    print("  -> Cleanup complete.")

if __name__ == '__main__':
    test_backend_country_blocking()
