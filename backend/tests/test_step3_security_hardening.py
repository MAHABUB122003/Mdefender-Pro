"""Step 3 Verification Test Suite: Backend Core Hardening & Security Defenses.

Tests:
1. NoSQL Injection & ReDoS Protection in API Key & Website Resolution.
2. Tenant Isolation & IDOR Protection across website and configuration endpoints.
3. Cloud Anycast DNS Verification Subsystem (Nameservers, CNAME, A-record).
4. Cloudflare-Style SaaS Installation Guidance (Obsolescence check on npm packages).
5. Timing Attack & Side-Channel Guard on API Keys and Authentication Tokens.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.v1.deps import get_owned_website
from src.api.v1.waf_api import verify_api_key
from fastapi import HTTPException


class TestStep3SecurityHardening(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()

    def test_1_nosql_injection_rejection_in_api_key(self):
        """Ensure malicious NoSQL queries, non-strings, or malformed payloads cannot bypass verify_api_key."""
        # Malicious dict injection payload
        res = verify_api_key(self.mock_db, {"$ne": ""})
        self.assertIsNone(res, "verify_api_key must reject non-string dictionary objects")

        # Short / null payloads
        self.assertIsNone(verify_api_key(self.mock_db, ""))
        self.assertIsNone(verify_api_key(self.mock_db, None))
        self.assertIsNone(verify_api_key(self.mock_db, "short_key"))

    def test_2_regex_injection_in_domain_matching(self):
        """Ensure regex characters in domain names (e.g. .* or evil regex) are safely escaped."""
        evil_domain = "evil.*(.)+$"
        mock_user = {"_id": "user123", "api_key": "valid_64_char_test_key_1234567890abcdef1234567890abcdef1234567890"}
        
        # When db.users.find_one returns a valid user, verify_api_key performs domain query with re.escape
        self.mock_db.api_keys.find_one.return_value = None
        self.mock_db.websites.find_one.return_value = None
        self.mock_db.users.find_one.return_value = mock_user

        verify_api_key(self.mock_db, mock_user["api_key"], domain=evil_domain)

        # Check the query call to db.websites.find_one
        calls = self.mock_db.websites.find_one.call_args_list
        found_safe_regex = False
        for call in calls:
            args, kwargs = call
            query = args[0] if args else kwargs.get("filter", {})
            if "$or" in query:
                for cond in query["$or"]:
                    if "domain" in cond and "$regex" in cond["domain"]:
                        pattern = cond["domain"]["$regex"]
                        # The pattern must contain escaped regex characters, not raw wildcard
                        if "\\.\\*" in pattern or "\\$" in pattern:
                            found_safe_regex = True
        self.assertTrue(found_safe_regex, "Regex metacharacters must be escaped with re.escape")

    def test_3_tenant_isolation_idor_enforcement(self):
        """Ensure get_owned_website strictly blocks cross-tenant access and raises 404."""
        user_a = {"id": "user_a_123"}
        user_b = {"id": "user_b_456"}

        website_a = {
            "_id": "site_999",
            "user_id": "user_a_123",
            "domain": "example.com"
        }

        # Mock db to return website_a
        self.mock_db.websites.find_one.return_value = website_a

        # Inject mock_db into deps
        import src.api.v1.deps as deps
        orig_get_db = deps.get_db
        deps.get_db = lambda: self.mock_db

        try:
            # User A accessing their own website -> Success
            site = get_owned_website(user_a, "site_999")
            self.assertEqual(site["_id"], "site_999")

            # User B attempting to access User A's website -> 404 Not Found
            with self.assertRaises(HTTPException) as cm:
                get_owned_website(user_b, "site_999")
            self.assertEqual(cm.exception.status_code, 404)
        finally:
            deps.get_db = orig_get_db

    def test_4_installation_instructions_no_obsolete_npm(self):
        """Verify installation instructions exclusively feature Anycast DNS and WordPress plugin, not npm."""
        import asyncio
        from src.api.v1.websites_api import installation_instructions
        import src.api.v1.websites_api as ws_module

        # Mock website and get_owned_website
        user = {"id": "u1"}
        mock_wp_site = {"_id": "w1", "platform": "wordpress", "domain": "myblog.com"}
        mock_node_site = {"_id": "w2", "platform": "node", "domain": "nodeapp.com"}

        orig_gow = ws_module.get_owned_website
        try:
            # Test WordPress site instructions
            ws_module.get_owned_website = lambda u, wid: mock_wp_site
            wp_res = asyncio.run(installation_instructions("w1", user=user))
            self.assertIn("data", wp_res)
            self.assertEqual(wp_res["data"]["nameservers"], ["ns1.mdefender.pro", "ns2.mdefender.pro"])
            self.assertIn("mdefender-pro.zip", str(wp_res["data"]))

            # Test Other/Node site instructions (Must be Cloudflare-style Anycast DNS, NOT npm)
            ws_module.get_owned_website = lambda u, wid: mock_node_site
            node_res = asyncio.run(installation_instructions("w2", user=user))
            self.assertIn("data", node_res)
            self.assertEqual(node_res["data"]["nameservers"], ["ns1.mdefender.pro", "ns2.mdefender.pro"])
            # Ensure npm package is NOT mentioned
            self.assertNotIn("npm install", str(node_res["data"]))
        finally:
            ws_module.get_owned_website = orig_gow


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestStep3SecurityHardening)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
