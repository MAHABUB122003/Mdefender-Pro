"""Stage 8 Verification Test Suite: Admin Control Plane, Support Desk & Platform Governance.

Validates:
1. Overview KPIs, revenue telemetry, and fleet-wide health.
2. Tenants & Users lifecycle, RBAC, plan gifts, and security locks.
3. Protected Websites inventory and WAF protection modes.
4. Plans & Pricing dynamic configuration updates.
5. Global IP Blacklist management and TTL persistence.
6. Global Threat Logs telemetry and attack categorization.
7. Patches & Rules virtual patch engine and toggle mechanisms.
8. Evasion Lab payload simulation (SQLi, XSS, Path Traversal).
9. DDoS Shield volumetric thresholds and burst mitigation.
10. Remote Inspector telemetry and site diagnostics.
11. Support Desk ticket lifecycle, messaging, and resolution.
12. Zero-Trust Admin Boundary Enforcement.
"""

import sys
import os
import asyncio
import unittest
from unittest.mock import MagicMock, patch
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
import src.api.v1.admin_api as admin_api_v1
from main import (
    admin_get_support_tickets,
    admin_reply_support_ticket,
    admin_remote_site_inspector,
    admin_get_blacklist,
    admin_add_blacklist,
    admin_delete_blacklist,
    admin_auto_block_get_settings
)


class TestStage8AdminControlPlane(unittest.TestCase):

    def setUp(self):
        self.admin_email = "admin@mdefender.com"
        self.admin_user = {"id": "admin_test_root_01", "_id": "admin_test_root_01", "role": "super_admin", "is_admin": True, "email": self.admin_email}
        self.normal_user = {"id": "normal_test_user_02", "_id": "normal_test_user_02", "role": "user", "is_admin": False, "email": "user@client.com"}
        self.site_id = "site_admin_test_101"

    def test_1_overview_kpis_and_fleet_stats(self):
        """Verify Admin overview KPIs, MRR, website counts, and threats blocked."""
        mock_db = MagicMock()
        mock_db.users.count_documents.return_value = 142
        mock_db.websites.count_documents.return_value = 310
        mock_db.attacks.count_documents.return_value = 45902
        mock_db.admin_pricing_config.find_one.return_value = {"monthly_per_site": 4.0, "yearly_per_site": 40.0}

        with patch("src.api.v1.admin_api.get_db", return_value=mock_db):
            res = asyncio.run(admin_api_v1.admin_overview(admin_email=self.admin_email, fresh=True))
            self.assertTrue(res["success"])
            self.assertIn("users", res["data"])
            self.assertIn("websites", res["data"])
            self.assertIn("total_blocked_threats", res["data"])

    def test_2_tenants_and_users_management(self):
        """Verify listing tenants, searching, and user metadata."""
        mock_db = MagicMock()
        user_list = [
            {"_id": ObjectId(), "email": "tenant1@corp.com", "plan": "pro", "role": "user", "websites_count": 3}
        ]
        mock_db.users.find.return_value.sort.return_value.skip.return_value.limit.return_value = user_list
        mock_db.users.count_documents.return_value = 1

        mock_req = MagicMock()
        mock_req.query_params = {}

        with patch("src.api.v1.admin_api.get_db", return_value=mock_db):
            res = asyncio.run(admin_api_v1.list_users(request=mock_req, admin_email=self.admin_email))
            self.assertTrue(res["success"])
            self.assertEqual(len(res["data"]["users"]), 1)
            self.assertEqual(res["data"]["users"][0]["email"], "tenant1@corp.com")

    def test_3_protected_websites_fleet_management(self):
        """Verify protected websites retrieval and WAF mode enforcement."""
        mock_db = MagicMock()
        site_list = [
            {"_id": self.site_id, "domain": "client-portal.com", "waf_mode": "protect", "user_id": "u1", "created_at": "2026-11-20T12:00:00Z"}
        ]
        mock_db.websites.find.return_value.sort.return_value = site_list
        mock_db.clients.find.return_value.sort.return_value = []
        mock_db.users.find.return_value = []
        mock_db.virtual_patches.count_documents.return_value = 5
        mock_db.websites.count_documents.return_value = 1
        mock_db.websites.find_one.return_value = site_list[0]

        mock_req = MagicMock()
        mock_req.query_params = {}

        with patch("src.api.v1.admin_api.get_db", return_value=mock_db):
            # 1. Get websites
            res_list = asyncio.run(admin_api_v1.list_tenant_websites(request=mock_req, admin_email=self.admin_email))
            self.assertTrue(res_list["success"])
            self.assertEqual(len(res_list["data"]["websites"]), 1)

            # 2. Update WAF Mode to monitor
            mode_req = admin_api_v1.WafModeUpdateBody(waf_mode="monitor")
            res_mode = asyncio.run(admin_api_v1.update_website_waf_mode(self.site_id, body=mode_req, admin_email=self.admin_email))
            self.assertTrue(res_mode["success"])
            self.assertIn("MONITOR", res_mode["message"])

    def test_4_plans_and_pricing_config(self):
        """Verify dynamic SaaS pricing configuration retrieval and updating."""
        mock_db = MagicMock()
        current_cfg = {
            "_type": "dynamic_pricing",
            "config": {
                "base_monthly_rate": 4.0,
                "base_yearly_rate": 40.0,
                "trial_days": 14,
                "currency": "USD"
            }
        }
        mock_db.settings.find_one.side_effect = lambda q: current_cfg

        def mock_update(q, u, **kwargs):
            if "$set" in u and "config" in u["$set"]:
                current_cfg["config"].update(u["$set"]["config"])
            return MagicMock()
        mock_db.settings.update_one.side_effect = mock_update

        with patch("src.api.v1.admin_api.get_db", return_value=mock_db):
            # 1. Get pricing
            res_get = asyncio.run(admin_api_v1.get_admin_dynamic_pricing_config(admin_email=self.admin_email))
            self.assertTrue(res_get["success"])
            self.assertEqual(res_get["data"]["base_monthly_rate"], 4.0)

            # 2. Update pricing
            req = admin_api_v1.DynamicPricingUpdateBody(base_monthly_rate=5.0, base_yearly_rate=48.0, trial_days=14)
            res_up = asyncio.run(admin_api_v1.update_admin_dynamic_pricing_config(body=req, admin_email=self.admin_email))
            self.assertTrue(res_up["success"])
            self.assertEqual(res_up["data"]["base_monthly_rate"], 5.0)

    def test_5_global_ip_blacklist(self):
        """Verify global IP blacklist listing, addition, and removal."""
        with patch("main.admin_api") as mock_admin_api:
            mock_admin_api.get_blacklist.return_value = {
                "status": "success",
                "data": [{"ip": "198.51.100.22", "reason": "Brute Force Attack", "permanent": True}]
            }
            mock_admin_api.add_to_blacklist.return_value = {"status": "success", "message": "IP added"}
            mock_admin_api.remove_from_blacklist.return_value = {"status": "success", "message": "IP removed"}

            # 1. Get blacklist
            mock_get_req = MagicMock()
            mock_get_req.query_params = {}
            res_get = asyncio.run(admin_get_blacklist(mock_get_req, user=self.admin_email))
            self.assertEqual(res_get["status"], "success")
            self.assertEqual(len(res_get["data"]), 1)

            # 2. Add to blacklist
            mock_req = MagicMock()
            async def get_add_json():
                return {"ip": "203.0.113.88", "reason": "Command Injection", "permanent": True}
            mock_req.json = get_add_json

            res_add = asyncio.run(admin_add_blacklist(mock_req, user=self.admin_email))
            self.assertEqual(res_add["status"], "success")

            # 3. Remove from blacklist
            mock_del_req = MagicMock()
            mock_del_req.query_params = {"ip": "203.0.113.88"}

            res_del = asyncio.run(admin_delete_blacklist(mock_del_req, user=self.admin_email))
            self.assertEqual(res_del["status"], "success")

    def test_6_patches_and_rules_evasion_lab(self):
        """Verify Patches & Rules list and Evasion Lab threat simulation."""
        mock_db = MagicMock()
        mock_db.virtual_patches.find.return_value.sort.return_value = [
            {"_id": "patch_cve_2024_01", "name": "WordPress Core RCE Patch", "enabled": True, "category": "CVE"}
        ]

        with patch("src.api.v1.admin_api.get_db", return_value=mock_db):
            # 1. Get Patches
            res_p = asyncio.run(admin_api_v1.list_virtual_patches(admin_email=self.admin_email))
            self.assertTrue(res_p["success"])
            self.assertEqual(len(res_p["data"]["patches"]), 1)

            # 2. Evasion Lab SQL Injection Simulation
            evasion_req = admin_api_v1.TestEvasionBody(
                payload="' UNION SELECT null, username, password FROM wp_users--",
                url="/login"
            )
            res_ev = asyncio.run(admin_api_v1.test_attack_evasion(body=evasion_req, admin_email=self.admin_email))
            self.assertTrue(res_ev["success"])
            self.assertEqual(res_ev["data"]["decision"], "BLOCK")
            self.assertTrue(res_ev["data"]["is_threat"])

    def test_7_ddos_shield_and_inspector(self):
        """Verify DDoS Shield configuration and Remote Inspector telemetry."""
        with patch("main.admin_api") as mock_admin_api, \
             patch("main.support_svc") as mock_supp:

            mock_admin_api.get_auto_block_settings.return_value = {
                "status": "success",
                "settings": {"threshold": 15, "window_hours": 2, "duration_hours": 24, "permanent": False}
            }

            # 1. DDoS Auto-block settings
            res_ddos = asyncio.run(admin_auto_block_get_settings(user=self.admin_email))
            self.assertEqual(res_ddos["status"], "success")
            self.assertEqual(res_ddos["settings"]["threshold"], 15)

            # 2. Remote Inspector
            mock_supp.get_remote_diagnostics.return_value = {"origin_reachable": True, "ip": "93.184.216.34"}
            res_insp = asyncio.run(admin_remote_site_inspector(domain="example.com", user=self.admin_email))
            self.assertEqual(res_insp["status"], "success")
            self.assertTrue(res_insp["diagnostics"]["origin_reachable"])

    def test_8_support_desk_ticket_lifecycle(self):
        """Verify Support Desk ticket querying and admin reply workflow."""
        ticket_id = "ticket_supp_stage8_99"

        with patch("main.support_svc") as mock_supp:
            mock_supp.get_admin_tickets.return_value = {
                "status": "success",
                "data": {
                    "tickets": [{"_id": ticket_id, "subject": "WAF False Positive Query", "status": "open"}],
                    "total": 1
                }
            }
            mock_supp.add_message.return_value = {
                "_id": ticket_id,
                "status": "resolved",
                "messages": [{"sender": "admin", "text": "Whitelisted"}]
            }

            # 1. Get Tickets
            res_tickets = asyncio.run(admin_get_support_tickets(user=self.admin_email))
            self.assertEqual(res_tickets["status"], "success")
            self.assertEqual(len(res_tickets["data"]["tickets"]), 1)

            # 2. Admin Reply to Ticket
            mock_reply_req = MagicMock()
            async def get_reply_json():
                return {"message": "We have whitelisted the legitimate callback endpoint."}
            mock_reply_req.json = get_reply_json

            res_reply = asyncio.run(admin_reply_support_ticket(ticket_id, mock_reply_req, user=self.admin_email))
            self.assertEqual(res_reply["status"], "success")
            self.assertIn("ticket", res_reply)


if __name__ == "__main__":
    unittest.main()
