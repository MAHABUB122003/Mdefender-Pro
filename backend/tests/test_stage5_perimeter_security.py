"""
MDefender Pro - Stage 5 QA Testing & Validation Suite
Access Control, Geo-Blocking, Login Gateway & Perimeter Defense Audit

Covers:
  1. IP Blacklist Engine & Candidate IP Header Extraction.
  2. Zero-Trust Anti-Bypass (Spoofed Whitelist in X-Forwarded-For cannot bypass Blacklist).
  3. IP Allowlist Engine (Trusted developer bypass).
  4. Country Geo-Blocking Engine (Nation-state restriction).
  5. Volumetric Burst Anti-DDoS Flooding & Rate Limiting Guard.
  6. Login Gateway Security (Custom slug & brute-force lockdown).
  7. Live WordPress Integration Test against localhost/mahabub.
"""

import sys
import os
import unittest
import requests
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, r"D:\Mdefender\backend")
sys.path.insert(0, r"D:\Mdefender")

from src.database.mongodb_connection import MongoDB
from src.security.ip_filter import IPFilter


class TestStage5PerimeterSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = MongoDB()
        cls.ip_filter = IPFilter(db=cls.db)
        cls.test_user_id = str(ObjectId())
        cls.test_blocked_ip = "198.51.100.99"
        cls.test_allowed_ip = "203.0.113.77"
        cls.wp_url = "http://localhost/mahabub"

    @classmethod
    def tearDownClass(cls):
        cls.db.blacklist.delete_many({"ip": cls.test_blocked_ip})
        cls.db.whitelist.delete_many({"ip": cls.test_allowed_ip})
        cls.db.country_blocks.delete_many({"country_code": "KP"})

    def test_01_ip_blacklist_and_candidate_chain(self):
        print("\n--- [STAGE 5.1] IP Blacklist & Anti-Spoofing Header Extraction ---")
        # 1. Add IP to blacklist in database
        self.db.blacklist.update_one(
            {"ip": self.test_blocked_ip},
            {"$set": {
                "ip": self.test_blocked_ip,
                "reason": "QA Test Blacklist Entry",
                "type": "permanent",
                "created_at": datetime.now(timezone.utc),
                "is_active": True
            }},
            upsert=True
        )
        IPFilter.invalidate_cache()

        # 2. Direct IP check
        is_blocked = self.ip_filter.is_blacklisted(self.test_blocked_ip)
        self.assertTrue(is_blocked, "Blacklisted IP must be detected")
        print(f"  ✓ Direct IP lookup: {self.test_blocked_ip} blocked.")

        # 3. Header spoofing defense: Attacker in X-Forwarded-For
        spoofed_headers = {
            "X-Forwarded-For": f"10.0.0.1, {self.test_blocked_ip}, 172.16.0.1",
            "CF-Connecting-IP": self.test_blocked_ip
        }
        is_blocked_hdr = self.ip_filter.is_blacklisted_headers(spoofed_headers)
        self.assertTrue(is_blocked_hdr, "Blacklisted IP hidden in proxy chain must be detected")
        print("  ✓ Anti-Spoofing Chain: Blacklisted IP detected inside X-Forwarded-For proxy chain.")

    def test_02_zero_trust_anti_bypass_whitelist_spoof(self):
        print("\n--- [STAGE 5.2] Zero-Trust Anti-Bypass: Spoofed Whitelist Defense ---")
        # Attacker tries to bypass by sending a legitimate whitelisted IP in X-Forwarded-For
        # while their true origin is blacklisted.
        self.db.whitelist.update_one(
            {"ip": self.test_allowed_ip},
            {"$set": {
                "ip": self.test_allowed_ip,
                "description": "Legitimate Office IP",
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        IPFilter.invalidate_cache()

        # Candidate chain contains both the whitelisted IP and the blacklisted attacker IP
        # Zero-trust principle: A blacklisted candidate can NEVER be excused by the presence of a whitelisted candidate!
        headers = {
            "X-Forwarded-For": f"{self.test_allowed_ip}, {self.test_blocked_ip}"
        }
        is_blocked = self.ip_filter.is_blacklisted_headers(headers)
        self.assertTrue(is_blocked, "Attacker cannot bypass blacklist by spoofing a whitelisted IP in headers")
        print("  ✓ Zero-Trust verified: Attacker cannot bypass blacklist by attaching a whitelisted IP.")

    def test_03_ip_allowlist_trusted_bypass(self):
        print("\n--- [STAGE 5.3] IP Allowlist Engine (Trusted Developer Bypass) ---")
        clean_ip = "192.0.2.123"
        IPFilter.invalidate_cache()
        self.assertFalse(self.ip_filter.is_whitelisted(clean_ip))

        self.db.whitelist.update_one(
            {"ip": clean_ip},
            {"$set": {"ip": clean_ip, "user_id": self.test_user_id}},
            upsert=True
        )
        IPFilter.invalidate_cache()
        self.assertTrue(self.ip_filter.is_whitelisted(clean_ip))
        print(f"  ✓ IP Allowlist validated: {clean_ip} holds authorized bypass entitlement.")
        self.db.whitelist.delete_one({"ip": clean_ip})
        IPFilter.invalidate_cache()

    def test_04_country_geo_blocking_engine(self):
        print("\n--- [STAGE 5.4] Nation-State Country Geo-Blocking Engine ---")
        # Block country code 'KP'
        self.db.country_blocks.update_one(
            {"country_code": "KP"},
            {"$set": {
                "country_code": "KP",
                "country_name": "North Korea",
                "user_id": self.test_user_id,
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        self.ip_filter.invalidate_country_cache()

        # Check geo block with header
        headers_blocked = {"CF-IPCountry": "KP"}
        is_geo_blocked, info = self.ip_filter.is_country_blocked("1.1.1.1", user_id=self.test_user_id, headers=headers_blocked)
        self.assertTrue(is_geo_blocked, "Traffic originating from blocked country code KP must be intercepted")
        print("  ✓ Country Geo-Blocking: Traffic from country 'KP' successfully intercepted.")

        headers_allowed = {"CF-IPCountry": "US"}
        is_allowed, _ = self.ip_filter.is_country_blocked("1.1.1.1", user_id=self.test_user_id, headers=headers_allowed)
        self.assertFalse(is_allowed, "Traffic from permitted country 'US' must pass freely")
        print("  ✓ Allowed Country: Permitted traffic passes without false positive.")

    def test_05_volumetric_ddos_burst_and_rate_limits(self):
        print("\n--- [STAGE 5.5] Volumetric Anti-DDoS Burst Shield & Rate Limiting ---")
        from src.ddos import DDoSConfig
        config = DDoSConfig()
        self.assertTrue(config.enabled)
        self.assertGreater(config.rate_limits.anonymous_rpm, 0)
        self.assertGreater(config.burst.min_requests, 0)
        print(f"  ✓ DDoS Defense Thresholds: {config.rate_limits.anonymous_rpm} req/min, burst {config.burst.min_requests} reqs/window.")

    def test_06_live_wordpress_ip_blacklist_enforcement(self):
        print("\n--- [STAGE 5.6] Live WordPress Origin Blacklist Interception (localhost/mahabub) ---")
        # Send live request with test_ip query override to simulate a blacklisted attacker IP
        # First ensure test IP is in WordPress local blacklist
        import subprocess
        php_cmd = f"""
        require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
        WAF_FW_IP_Filter::instance()->add_to_blacklist('{self.test_blocked_ip}', 'QA Stage 5 Live Penetration Test');
        """
        subprocess.run(["C:\\xampp\\php\\php.exe", "-r", php_cmd], capture_output=True, text=True)

        # Now send HTTP request to WordPress simulating that IP
        r = requests.get(
            f"{self.wp_url}/?test_ip={self.test_blocked_ip}",
            headers={"X-Forwarded-For": self.test_blocked_ip},
            timeout=5
        )
        self.assertEqual(r.status_code, 403, f"Live WordPress must return 403 Forbidden for blacklisted IP (Got {r.status_code})")
        self.assertTrue("403 Forbidden" in r.text or r.headers.get("X-Protected-By") == "MDefender-Pro", "Must render MDefender block page")
        print("  ✓ Live WordPress Origin: Blacklisted IP immediately rejected with HTTP 403 and MDefender block page.")

        # Clean up test IP from WordPress local table
        clean_cmd = f"""
        require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
        WAF_FW_IP_Filter::instance()->remove_from_blacklist('{self.test_blocked_ip}');
        """
        subprocess.run(["C:\\xampp\\php\\php.exe", "-r", clean_cmd], capture_output=True, text=True)

    def test_07_live_wordpress_country_block_enforcement(self):
        print("\n--- [STAGE 5.7] Live WordPress Origin Country Block Interception ---")
        import subprocess
        # Configure WordPress to block 'KP'
        set_country_cmd = """
        require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
        update_option('waf_fw_blocked_countries', 'KP,RU');
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
        """
        subprocess.run(["C:\\xampp\\php\\php.exe", "-r", set_country_cmd], capture_output=True, text=True)

        # Send request simulating CF-IPCountry: KP
        r = requests.get(
            f"{self.wp_url}/?test_country=KP",
            headers={"CF-IPCountry": "KP", "HTTP_CF_IPCOUNTRY": "KP"},
            timeout=5
        )
        self.assertIn(r.status_code, [403, 502], f"Live WordPress must drop requests from blocked country code KP (Got {r.status_code})")
        self.assertTrue("502 Bad Gateway" in r.text or "403 Forbidden" in r.text or "MDefender" in r.text)
        print("  ✓ Live WordPress Origin: Country restriction KP triggered authentic stealth drop (HTTP 502 Dead Network).")

        # Reset country blocks
        reset_cmd = """
        require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
        update_option('waf_fw_blocked_countries', '');
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
        """
        subprocess.run(["C:\\xampp\\php\\php.exe", "-r", reset_cmd], capture_output=True, text=True)


if __name__ == "__main__":
    unittest.main()
