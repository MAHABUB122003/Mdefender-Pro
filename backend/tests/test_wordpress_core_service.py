import os
import sys
import unittest
from types import SimpleNamespace
from urllib.error import URLError
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.wordpress_core_service import WordPressCoreService


class TestWordPressCoreService(unittest.TestCase):
    def setUp(self):
        self.service = WordPressCoreService.__new__(WordPressCoreService)
        self.service.db = SimpleNamespace(
            websites=MagicMock(),
            system_cache=MagicMock(),
            wordpress_sites=MagicMock(),
        )
        self.site = {
            "_id": "site-1",
            "domain": "example.test",
            "url": "https://example.test",
            "wp_version": "6.8",
            "platform": "wordpress",
            "wordpress_connection": {"connected": True},
        }

    def test_incomplete_origin_checksum_scan_is_not_saved_as_verified(self):
        self.service._find_site = lambda _website_id: self.site
        self.service.get_official_checksums = lambda _version: {"index.php": "expected"}
        origin = SimpleNamespace(_dispatch_wp_posthack=lambda *_args, **_kwargs: {
            "success": True,
            "data": {
                "success": True,
                "total_official_files": 2,
                "checked_count": 1,
                "skipped_count": 0,
                "intact_count": 1,
                "modified_files": [],
                "missing_files": [],
                "unknown_files": [],
            },
        })

        with patch.dict(sys.modules, {"src.api.v1.websites_api": origin}), patch(
            "src.services.wordpress_core_service.AuditService"
        ):
            report = self.service.verify_website_core_checksums("site-1", "user-1")

        self.assertEqual(report["status"], "verification_unavailable")
        self.assertFalse(report["verification_complete"])
        self.assertIsNone(report["integrity_percentage"])
        self.service.db.websites.update_one.assert_not_called()

    def test_complete_origin_checksum_scan_records_actual_counts(self):
        self.service._find_site = lambda _website_id: self.site
        self.service.get_official_checksums = lambda _version: {"index.php": "expected"}
        origin = SimpleNamespace(_dispatch_wp_posthack=lambda *_args, **_kwargs: {
            "success": True,
            "data": {
                "success": True,
                "total_official_files": 2,
                "checked_count": 2,
                "skipped_count": 0,
                "intact_count": 1,
                "modified_files": [{"path": "wp-login.php", "official_hash": "expected", "local_hash": "actual"}],
                "missing_files": [],
                "unknown_files": [],
            },
        })

        with patch.dict(sys.modules, {"src.api.v1.websites_api": origin}), patch(
            "src.services.wordpress_core_service.AuditService"
        ):
            report = self.service.verify_website_core_checksums("site-1", "user-1")

        self.assertEqual(report["status"], "modified_files_detected")
        self.assertTrue(report["verification_complete"])
        self.assertEqual(report["total_files_checked"], 2)
        self.assertEqual(report["modified_files_count"], 1)
        self.service.db.websites.update_one.assert_called_once()

    def test_legacy_checksum_status_is_not_trusted_without_scan_evidence(self):
        site = {
            **self.site,
            "checksum_status": "verified",
            "checksum_files_count": 3224,
        }
        self.service.get_official_version_info = lambda: {
            "available": True,
            "latest_version": "6.8",
        }
        self.service.db.websites.find.return_value = [site]

        matrix = self.service.get_fleet_core_matrix("user-1")

        self.assertEqual(matrix["sites"][0]["checksum_status"], "unknown")
        self.assertEqual(matrix["sites"][0]["files_verified_count"], 0)
        self.assertEqual(matrix["fleet_integrity_pct"], "100.0")

    def test_unavailable_official_release_does_not_invent_a_version(self):
        self.service.db.system_cache.find_one.return_value = None

        with patch(
            "src.services.wordpress_core_service.urllib.request.urlopen",
            side_effect=URLError("offline"),
        ):
            release = self.service.get_official_version_info()

        self.assertFalse(release["available"])
        self.assertIsNone(release["latest_version"])
        self.service.db.system_cache.update_one.assert_not_called()

    def test_failed_remote_core_update_does_not_persist_version(self):
        self.service._find_site = lambda _website_id: self.site
        self.service.get_official_version_info = lambda: {"latest_version": "6.8.1"}
        self.service._dispatch_core_update = MagicMock(side_effect=RuntimeError("origin unavailable"))

        with self.assertRaisesRegex(RuntimeError, "origin unavailable"):
            self.service.update_core("site-1", "user-1")

        self.service.db.websites.update_one.assert_not_called()
        self.service.db.wordpress_sites.update_one.assert_not_called()

    def test_failed_remote_policy_change_does_not_persist_policy(self):
        self.service._find_site = lambda _website_id: self.site
        origin = SimpleNamespace(_dispatch_wp_posthack=lambda *_args, **_kwargs: {
            "success": True,
            "data": {"success": False, "message": "origin rejected policy"},
        })

        with patch.dict(sys.modules, {"src.api.v1.websites_api": origin}):
            with self.assertRaisesRegex(RuntimeError, "origin rejected policy"):
                self.service.set_auto_update_policy("site-1", "all", "user-1")

        self.service.db.websites.update_one.assert_not_called()


if __name__ == "__main__":
    unittest.main()
