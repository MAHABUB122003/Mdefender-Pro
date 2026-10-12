import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.waf_api import WAFAPI
from src.database.mongodb_connection import MongoDB
from src.utils.block_page import render_block_page

def main():
    waf = WAFAPI()
    db = MongoDB()

    site = db.websites.find_one({'domain': 'mahabubur.shop'})
    site_id = str(site['_id']) if site else None
    user_id = str(site.get('user_id')) if site else None

    print(f"[+] Loaded domain: mahabubur.shop (site_id={site_id})")

    # Test 1: Malicious SQLi Request
    sqli_req = {
        'url': '/index.php',
        'query_string': "id=1' OR 1=1--",
        'query_params': {'id': "1' OR 1=1--"},
        'ip': '198.51.100.55',
        'headers': {'host': 'mahabubur.shop', 'user-agent': 'Mozilla/5.0 sqlmap/1.5'},
        'user_agent': 'Mozilla/5.0 sqlmap/1.5',
        'method': 'GET'
    }
    dec, log_entry, event, is_blocked, ip = waf.evaluate_request_fast(
        sqli_req, user_id=user_id, domain='mahabubur.shop', website_id=site_id
    )
    print(f"Test 1 (SQLi): is_blocked = {is_blocked}, attack_type = {dec.get('attack_type')}, confidence = {dec.get('confidence')}")
    assert is_blocked is True, "SQLi should be blocked"

    # Test Block Page Rendering
    html = render_block_page(
        reference_id=dec.get('reference_id', 'TEST-REF'),
        client_ip='198.51.100.55',
        attack_type=dec.get('attack_type', 'SQL Injection'),
        reason='Blocked by MDefender Edge WAF',
        website_name='mahabubur.shop'
    )
    assert "403" in html and "Access Denied" in html
    print(f"Test 1 Block Page: Rendered {len(html)} bytes with 403 block screen")

    # Test 2: Malicious XSS Request
    xss_req = {
        'url': '/search',
        'query_string': 'q=<script>alert(document.cookie)</script>',
        'query_params': {'q': '<script>alert(document.cookie)</script>'},
        'ip': '198.51.100.56',
        'headers': {'host': 'mahabubur.shop'},
        'user_agent': 'Mozilla/5.0',
        'method': 'GET'
    }
    dec2, _, _, is_blocked2, _ = waf.evaluate_request_fast(
        xss_req, user_id=user_id, domain='mahabubur.shop', website_id=site_id
    )
    print(f"Test 2 (XSS): is_blocked = {is_blocked2}, attack_type = {dec2.get('attack_type')}")
    assert is_blocked2 is True, "XSS should be blocked"

    # Test 3: Normal Clean Request
    clean_req = {
        'url': '/products/laptop',
        'query_string': 'category=electronics&sort=price_asc',
        'query_params': {'category': 'electronics', 'sort': 'price_asc'},
        'ip': '198.51.100.57',
        'headers': {'host': 'mahabubur.shop'},
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'method': 'GET'
    }
    dec3, _, _, is_blocked3, _ = waf.evaluate_request_fast(
        clean_req, user_id=user_id, domain='mahabubur.shop', website_id=site_id
    )
    print(f"Test 3 (Clean Request): is_blocked = {is_blocked3}, action = {dec3.get('action')}")
    assert is_blocked3 is False, "Clean request should NOT be blocked"

    print("\n[SUCCESS] All domain WAF traffic tests passed perfectly!")

if __name__ == '__main__':
    main()
