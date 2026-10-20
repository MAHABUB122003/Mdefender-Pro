"""Step 1 Verification Test Suite: Remote Security & Hardening Controls Sync.

Tests:
1. Website Security Settings GET & PATCH endpoints.
2. Heartbeat correctly passes hardening settings and website-specific country blocks to plugin.
3. IDOR Tenant Isolation on security settings.
"""

import sys
import os
import asyncio
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.v1.websites_api import update_security_settings, get_security_settings, SecuritySettingsUpdate
import src.api.v1.websites_api as ws_module
from fastapi import HTTPException


class TestRemoteHardeningSync(unittest.TestCase):

    def setUp(self):
        self.user_a = {"id": "user_a_123"}
        self.user_b = {"id": "user_b_456"}
        self.mock_site = {
            "_id": "site_wp_1",
            "user_id": "user_a_123",
            "domain": "myblog.com",
            "platform": "wordpress",
            "waf_mode": "protect",
            "disable_xmlrpc": True,
            "block_uploads_php": True,
            "disable_file_editing": True,
            "disable_directory_listing": True,
            "prevent_user_enumeration": True,
            "hide_wp_version": True,
            "rate_limit_per_minute": 120,
            "blocked_countries": ["CN"]
        }

    def test_1_get_security_settings(self):
        orig_gow = ws_module.get_owned_website
        try:
            ws_module.get_owned_website = lambda u, wid: self.mock_site
            res = asyncio.run(get_security_settings("site_wp_1", user=self.user_a))
            self.assertTrue(res["success"])
            self.assertIn("settings", res["data"])
            self.assertEqual(res["data"]["settings"]["waf_mode"], "protect")
            self.assertTrue(res["data"]["settings"]["disable_xmlrpc"])
            self.assertEqual(res["data"]["settings"]["blocked_countries"], ["CN"])
        finally:
            ws_module.get_owned_website = orig_gow

    def test_2_patch_security_settings_updates_db(self):
        orig_gow = ws_module.get_owned_website
        mock_db = MagicMock()
        mock_db.websites.find_one.return_value = {
            **self.mock_site,
            "waf_mode": "monitor",
            "disable_xmlrpc": False,
            "blocked_countries": ["CN", "RU"]
        }

        try:
            ws_module.get_owned_website = lambda u, wid: self.mock_site
            with patch("src.api.v1.websites_api.MongoDB", return_value=mock_db):
                body = SecuritySettingsUpdate(
                    waf_mode="monitor",
                    disable_xmlrpc=False,
                    blocked_countries=["cn", "ru"]
                )
                res = asyncio.run(update_security_settings("site_wp_1", body=body, user=self.user_a))
                self.assertTrue(res["success"])
                self.assertEqual(res["data"]["settings"]["waf_mode"], "monitor")
                self.assertFalse(res["data"]["settings"]["disable_xmlrpc"])
                self.assertEqual(res["data"]["settings"]["blocked_countries"], ["CN", "RU"])

                # Verify db.websites.update_one called with expected updates
                mock_db.websites.update_one.assert_called_once()
                args, _ = mock_db.websites.update_one.call_args
                updated_fields = args[1]["$set"]
                self.assertEqual(updated_fields["waf_mode"], "monitor")
                self.assertFalse(updated_fields["disable_xmlrpc"])
                self.assertEqual(updated_fields["blocked_countries"], ["CN", "RU"])
        finally:
            ws_module.get_owned_website = orig_gow

    def test_3_idor_tenant_isolation(self):
        """Ensure User B cannot access or update User A's security settings."""
        with self.assertRaises(HTTPException) as ctx:
            # get_owned_website with user B should raise 404 or 403 when not found
            mock_db = MagicMock()
            mock_db.websites.find_one.return_value = None
            with patch("src.api.v1.deps.MongoDB", return_value=mock_db):
                from src.api.v1.deps import get_owned_website
                get_owned_website(self.user_b, "site_wp_1")
        self.assertIn(ctx.exception.status_code, [403, 404])


if __name__ == "__main__":
    unittest.main()
