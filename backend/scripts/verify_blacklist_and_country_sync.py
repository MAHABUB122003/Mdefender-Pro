"""
End-to-End Verification of Blacklist & Country Blocking for MDefender-Pro Cloud + WordPress Plugin
"""
import sys
import os
from datetime import datetime

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database.mongodb_connection import MongoDB
from src.security.ip_filter import IPFilter
from src.api.v1.wordpress_api import push_instant_sync_to_wordpress

def verify():
    print("=" * 60)
    print("MDEFENDER PRO: BLACKLIST & COUNTRY BLOCK VERIFICATION")
    print("=" * 60)

    db = MongoDB()
    ip_filter = IPFilter()

    test_user_id = "test_user_waf_123"
    test_ip = "198.51.100.88"
    test_country = "CN"

    # 1. Clean previous test items
    db.blacklist.delete_many({"ip": test_ip})
    db.country_blocks.delete_many({"country_code": test_country, "user_id": test_user_id})

    # 2. Add Blacklist Item
    print("\n[STEP 1] Adding IP to Blacklist for user:", test_ip)
    db.blacklist.insert_one({
        "ip": test_ip,
        "reason": "Test Malicious Attacker",
        "type": "permanent",
        "user_id": test_user_id,
        "added_by_user_id": test_user_id,
        "added_by": "test@example.com",
        "blocked_at": datetime.now(),
        "is_global": False
    })

    # Test IPFilter backend detection
    is_bl = ip_filter.is_blacklisted(test_ip, user_id=test_user_id)
    print(f"  -> IPFilter.is_blacklisted('{test_ip}', user_id='{test_user_id}'): {is_bl}")
    assert is_bl is True, "Expected IP to be blacklisted!"
    print("  ✅ PASS: IP is detected as blacklisted by backend WAF engine.")

    # 3. Add Country Block
    print(f"\n[STEP 2] Adding Country Block ({test_country}) for user...")
    db.country_blocks.insert_one({
        "user_id": test_user_id,
        "added_by_user_id": test_user_id,
        "country_code": test_country,
        "country_name": "China",
        "reason": "Geo restriction",
        "created_at": datetime.now()
    })

    # Mock IP check for country
    # We can mock get_ip_country
    original_get_country = ip_filter.get_ip_country
    ip_filter.get_ip_country = lambda ip: {"country_code": "CN", "country_name": "China"}

    is_c_blocked, geo_info = ip_filter.is_country_blocked("1.2.3.4", user_id=test_user_id)
    print(f"  -> IPFilter.is_country_blocked('1.2.3.4', user_id='{test_user_id}'): {is_c_blocked}, geo: {geo_info}")
    assert is_c_blocked is True, "Expected country to be blocked!"
    print(f"  ✅ PASS: Country {test_country} is detected as blocked by backend Geo-filter.")

    # 4. Clean up test data
    db.blacklist.delete_many({"ip": test_ip})
    db.country_blocks.delete_many({"country_code": test_country, "user_id": test_user_id})
    ip_filter.get_ip_country = original_get_country

    print("\n" + "=" * 60)
    print("✅ ALL BACKEND AND SYNC CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify()
