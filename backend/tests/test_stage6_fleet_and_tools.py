"""Stage 6 Verification Test Suite: Bulk WordPress Fleet Operations & Security Tools.

Validates:
1. Plugins inventory retrieval and remote action dispatch.
2. Themes inventory retrieval and active template inspection.
3. WordPress Core checksum verification and auto-update policies.
4. Security Hardening 7-ring toggles and profile presets.
5. Database Optimizer telemetry and cleanup orchestration.
6. Backup & Disaster Recovery snapshot creation and schedule management.
7. Post-Hack incident response status and recovery action workflows.
"""

import sys
import os
import asyncio
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
import src.api.v1.websites_api as ws_module
from src.api.v1.websites_api import (
    get_website_themes,
    execute_remote_action,
    RemoteActionRequest,
    get_website_hardening_overview,
    toggle_hardening_control,
    apply_hardening_preset,
    HardeningToggleRequest,
    HardeningProfileRequest,
    get_website_database_status,
    optimize_website_database,
    DatabaseOptimizeRequest,
    get_website_backups,
    create_website_backup,
    CreateBackupRequest,
    get_website_posthack_status,
    execute_posthack_action,
    PostHackActionRequest
)
from src.api.v1.wordpress_api import (
    verify_site_core_checksums,
    update_core_auto_update_policy,
    CorePolicyRequest
)


class TestStage6FleetAndTools(unittest.TestCase):

    def setUp(self):
        self.user_id = "user_fleet_stage6_test"
        self.user = {"id": self.user_id, "role": "user"}
        self.site_id = "site_stage6_wp_1"
        self.mock_site = {
            "_id": self.site_id,
            "id": self.site_id,
            "user_id": self.user_id,
            "domain": "fleet-test.local",
            "url": "http://fleet-test.local",
            "platform": "wordpress",
            "api_key": "mdf_stage6_key_123",
            "site_token": "token_stage6_456",
            "theme": "twentytwentyfour",
            "themes": [
                {"name": "twentytwentyfour", "version": "1.1", "active": True},
                {"name": "twentytwentythree", "version": "1.3", "active": False}
            ],
            "plugins": [
                {"name": "mdefender-pro", "version": "2.4.0", "active": True},
                {"name": "akismet", "version": "5.3.0", "active": False}
            ],
            "hardening_overview": {
                "profile": "balanced",
                "score": 96,
                "grade": "A+",
                "master_shields": {
                    "virtual_patching_shield": True,
                    "filesystem_lockdown": True,
                    "attack_surface_guard": True,
                    "identity_login_shield": True,
                    "security_headers_shield": True,
                    "database_secrets_shield": True,
                    "environment_debug_shield": False,
                    "fim_persistence_shield": False
                }
            },
            "backups": [
                {
                    "filename": "backup_20261120_full.zip",
                    "type": "full",
                    "size_mb": 14.5,
                    "created_at": "2026-11-20T12:00:00Z"
                }
            ]
        }

    def test_1_plugins_inventory_and_remote_actions(self):
        """Verify plugin listing and remote action execution (activate/deactivate/update)."""
        mock_db = MagicMock()
        mock_db.websites.find_one.return_value = self.mock_site

        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.get_licensed_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.MongoDB", return_value=mock_db), \
             patch("requests.post") as mock_post:

            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {"success": True, "action": "activate_plugin"}

            req = RemoteActionRequest(action="activate_plugin", slug="akismet", type="plugin")
            res = asyncio.run(execute_remote_action(self.site_id, body=req, user=self.user))

            self.assertIn("success", res)
            self.assertTrue(res["success"])

    def test_2_themes_inventory_and_status(self):
        """Verify themes inventory retrieval and active template information."""
        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site):
            res = asyncio.run(get_website_themes(self.site_id, user=self.user))

            self.assertTrue(res["success"])
            data = res["data"]
            self.assertEqual(data["active_theme"], "twentytwentyfour")
            self.assertEqual(len(data["themes"]), 2)
            self.assertEqual(data["themes"][0]["name"], "twentytwentyfour")

    def test_3_wordpress_core_checksums_and_status(self):
        """Verify WordPress core checksum verification and auto-update policy enforcement."""
        mock_db = MagicMock()
        mock_db.websites.find_one.return_value = self.mock_site

        with patch("src.api.v1.wordpress_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.wordpress_api.get_licensed_website", return_value=self.mock_site), \
             patch("src.api.v1.wordpress_api.MongoDB", return_value=mock_db), \
             patch("src.services.wordpress_core_service.WordPressCoreService.verify_website_core_checksums") as mock_vcs, \
             patch("src.services.wordpress_core_service.WordPressCoreService.set_auto_update_policy") as mock_saup:

            mock_vcs.return_value = {
                "verified": True,
                "modified_files": [],
                "checksum_status": "clean"
            }
            mock_saup.return_value = {
                "policy": "minor",
                "core_auto_update": True
            }

            # 1. Verify Checksums
            res_cs = asyncio.run(verify_site_core_checksums(self.site_id, user=self.user))
            self.assertTrue(res_cs["success"])
            self.assertEqual(res_cs["data"]["checksum_status"], "clean")

            # 2. Update Policy
            policy_req = CorePolicyRequest(policy="minor")
            res_pol = asyncio.run(update_core_auto_update_policy(self.site_id, body=policy_req, user=self.user))
            self.assertTrue(res_pol["success"])
            self.assertEqual(res_pol["data"]["policy"], "minor")

    def test_4_security_hardening_7_ring_toggles(self):
        """Verify 7-ring security hardening overview retrieval, toggle, and profile presets."""
        mock_db = MagicMock()

        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.get_licensed_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.MongoDB", return_value=mock_db):

            # 1. Overview
            res_ov = asyncio.run(get_website_hardening_overview(self.site_id, refresh=False, user=self.user))
            self.assertTrue(res_ov["success"])
            self.assertEqual(res_ov["data"]["profile"], "balanced")
            self.assertTrue(res_ov["data"]["master_shields"]["virtual_patching_shield"])

            # 2. Toggle specific directive
            with patch("src.api.v1.websites_api.get_resilient_session") as mock_sess:
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"action_result": {"control": "environment_debug_shield", "enabled": True}}
                mock_sess.return_value.post.return_value = mock_resp

                toggle_req = HardeningToggleRequest(control="environment_debug_shield", enabled=True)
                res_tg = asyncio.run(toggle_hardening_control(self.site_id, body=toggle_req, user=self.user))
                self.assertTrue(res_tg["success"])
                self.assertEqual(res_tg["data"]["control"], "environment_debug_shield")

            # 3. Apply profile preset (strict)
            with patch("src.api.v1.websites_api.get_resilient_session") as mock_sess2:
                mock_resp2 = MagicMock()
                mock_resp2.status_code = 200
                mock_resp2.json.return_value = {"action_result": {"profile": "strict", "status": "active"}}
                mock_sess2.return_value.post.return_value = mock_resp2

                profile_req = HardeningProfileRequest(profile="strict")
                res_prof = asyncio.run(apply_hardening_preset(self.site_id, body=profile_req, user=self.user))
                self.assertTrue(res_prof["success"])
                self.assertEqual(res_prof["data"]["profile"], "strict")

    def test_5_database_optimizer_telemetry_and_cleanup(self):
        """Verify database optimizer status querying and optimization trigger."""
        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.get_licensed_website", return_value=self.mock_site), \
             patch("requests.get") as mock_get, \
             patch("requests.post") as mock_post:

            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "action_result": {
                    "success": True,
                    "db_name": "wp_test",
                    "overhead_kb": 256.4,
                    "cleanable": {"revisions": 12, "transients": 45, "spam_comments": 0}
                }
            }
            res_st = asyncio.run(get_website_database_status(self.site_id, user=self.user))
            self.assertTrue(res_st["success"])
            self.assertEqual(res_st["data"]["db_name"], "wp_test")

            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "action_result": {
                    "success": True,
                    "cleaned_items": 57,
                    "reclaimed_bytes": 1048576
                }
            }
            opt_req = DatabaseOptimizeRequest(targets=["revisions", "transients", "optimize_tables"])
            res_opt = asyncio.run(optimize_website_database(self.site_id, body=opt_req, user=self.user))
            self.assertTrue(res_opt["success"])
            self.assertEqual(res_opt["data"]["cleaned_items"], 57)

    def test_6_backup_and_recovery_snapshots(self):
        """Verify listing backups and creating a new snapshot record."""
        mock_svc = MagicMock()
        mock_svc.get_website_backups.return_value = {
            "backups": self.mock_site["backups"],
            "schedule": {"frequency": "weekly", "enabled": True}
        }
        mock_svc.create_backup.return_value = {
            "success": True,
            "filename": "backup_20261120_manual.zip",
            "type": "database",
            "size_mb": 4.2
        }

        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.get_licensed_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.BackupService", return_value=mock_svc):

            # 1. List backups
            res_list = asyncio.run(get_website_backups(self.site_id, user=self.user))
            self.assertTrue(res_list["success"])
            self.assertEqual(len(res_list["data"]["backups"]), 1)

            # 2. Create snapshot
            create_req = CreateBackupRequest(type="database", note="Pre-maintenance backup")
            res_create = asyncio.run(create_website_backup(self.site_id, body=create_req, user=self.user))
            self.assertTrue(res_create["success"])
            self.assertEqual(res_create["data"]["filename"], "backup_20261120_manual.zip")

    def test_7_post_hack_incident_recovery(self):
        """Verify post-hack incident response telemetry and recovery action dispatch."""
        mock_db = MagicMock()

        with patch("src.api.v1.websites_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.get_licensed_website", return_value=self.mock_site), \
             patch("src.api.v1.websites_api.MongoDB", return_value=mock_db), \
             patch("src.api.v1.websites_api._dispatch_wp_posthack") as mock_dispatch:

            mock_dispatch.return_value = {
                "success": True,
                "data": {
                    "reachable": True,
                    "lockdown_active": False,
                    "active_sessions_count": 4,
                    "admins": ["admin", "developer"]
                }
            }

            # 1. Get incident response status
            res_st = asyncio.run(get_website_posthack_status(self.site_id, user=self.user))
            self.assertTrue(res_st["success"])
            self.assertEqual(res_st["data"]["status"]["active_sessions_count"], 4)

            # 2. Execute incident action (invalidate sessions)
            mock_dispatch.return_value = {
                "success": True,
                "message": "All WordPress user sessions invalidated successfully",
                "terminated_sessions": 4
            }
            act_req = PostHackActionRequest(action="invalidate_sessions")
            res_act = asyncio.run(execute_posthack_action(self.site_id, body=act_req, user=self.user))
            self.assertTrue(res_act["success"])


if __name__ == "__main__":
    unittest.main()
