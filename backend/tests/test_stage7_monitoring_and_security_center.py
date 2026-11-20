"""Stage 7 Verification Test Suite: Monitoring, Scanning & Threat Intelligence Center.

Validates:
1. Uptime fleet overview and aggregated SLA metrics.
2. Real-time website health & latency probes.
3. Historical SLA uptime calculations.
4. Core Web Vitals and TTFB performance audits.
5. Broken links crawler and integrity status.
6. Multi-vector Security & Port Scanner (Ports, Headers, SSL, Paths).
7. Threat Intelligence WHOIS and reverse DNS lookups.
8. HaveIBeenPwned k-anonymity breach credential analysis.
"""

import sys
import os
import asyncio
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from src.api.v1.monitoring_api import (
    get_monitoring_overview,
    probe_single_website,
    get_website_uptime_history,
    get_performance_audit,
    trigger_performance_audit,
    get_broken_links_report,
    run_broken_links_scan,
    AuditRequest,
    BrokenLinkScanRequest
)
from src.api.v1.websites_api import (
    check_pwned_password_api,
    PwnedPasswordCheckRequest
)
from main import user_security_audit, user_whois_lookup


class TestStage7MonitoringAndSecurityCenter(unittest.TestCase):

    def setUp(self):
        self.user_id = "user_stage7_monitor_test"
        self.user = {"id": self.user_id, "role": "user"}
        self.site_id = "site_stage7_wp_1"
        self.mock_site = {
            "_id": self.site_id,
            "id": self.site_id,
            "user_id": self.user_id,
            "domain": "stage7-test.com",
            "url": "https://stage7-test.com",
            "platform": "wordpress",
            "ssl_mode": "full",
            "last_ping_latency_ms": 42.5,
            "ping_status": "up"
        }

    def test_1_monitoring_fleet_overview(self):
        """Verify aggregate fleet uptime metrics and SSL posture."""
        with patch("src.api.v1.monitoring_api.monitoring_svc") as mock_svc:
            mock_svc.get_fleet_overview.return_value = {
                "fleet_size": 5,
                "overall_uptime_pct": 99.98,
                "avg_response_time_ms": 58.2,
                "healthy_sites": 5,
                "degraded_sites": 0,
                "offline_sites": 0
            }
            res = asyncio.run(get_monitoring_overview(user=self.user))
            self.assertTrue(res["success"])
            self.assertEqual(res["data"]["overall_uptime_pct"], 99.98)
            self.assertEqual(res["data"]["healthy_sites"], 5)

    def test_2_probe_single_website(self):
        """Verify real-time HTTP health and latency probe execution."""
        with patch("src.api.v1.monitoring_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.monitoring_api.monitoring_svc") as mock_svc:

            mock_svc.probe_website_health.return_value = {
                "website_id": self.site_id,
                "status": "up",
                "http_status": 200,
                "response_time_ms": 41.2,
                "ssl_valid": True
            }
            res = asyncio.run(probe_single_website(self.site_id, user=self.user))
            self.assertTrue(res["success"])
            self.assertEqual(res["data"]["status"], "up")
            self.assertEqual(res["data"]["response_time_ms"], 41.2)

    def test_3_uptime_history_and_sla(self):
        """Verify SLA uptime calculations across time windows."""
        with patch("src.api.v1.monitoring_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.monitoring_api.monitoring_svc") as mock_svc:

            mock_svc.get_uptime_history.return_value = {
                "window": "24h",
                "uptime_percentage": 100.0,
                "total_checks": 1440,
                "successful_checks": 1440,
                "downtime_minutes": 0
            }
            res = asyncio.run(get_website_uptime_history(self.site_id, window="24h", user=self.user))
            self.assertTrue(res["success"])
            self.assertEqual(res["data"]["uptime_percentage"], 100.0)

    def test_4_performance_audit_and_core_web_vitals(self):
        """Verify performance metrics retrieval and Core Web Vitals audit."""
        with patch("src.api.v1.monitoring_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.monitoring_api.monitoring_svc") as mock_svc:

            mock_svc.run_performance_audit.return_value = {
                "performance_score": 94,
                "ttfb_ms": 120,
                "fcp_ms": 680,
                "lcp_ms": 1100,
                "strategy": "desktop"
            }
            # 1. Fetch cached audit
            res_get = asyncio.run(get_performance_audit(self.site_id, strategy="desktop", user=self.user))
            self.assertTrue(res_get["success"])
            self.assertEqual(res_get["data"]["performance_score"], 94)

            # 2. Trigger fresh audit
            req = AuditRequest(strategy="desktop", force=True)
            res_post = asyncio.run(trigger_performance_audit(self.site_id, body=req, user=self.user))
            self.assertTrue(res_post["success"])
            self.assertEqual(res_post["data"]["ttfb_ms"], 120)

    def test_5_broken_links_crawler(self):
        """Verify broken link crawler reports and on-demand link audits."""
        with patch("src.api.v1.monitoring_api.get_owned_website", return_value=self.mock_site), \
             patch("src.api.v1.monitoring_api.monitoring_svc") as mock_svc:

            mock_svc.get_broken_links_report.return_value = {
                "total_links_checked": 45,
                "broken_links": [],
                "status": "clean"
            }
            mock_svc.scan_broken_links.return_value = {
                "scanned": 50,
                "broken": 0,
                "dead_endpoints": []
            }

            # 1. Get report
            res_rep = asyncio.run(get_broken_links_report(self.site_id, user=self.user))
            self.assertTrue(res_rep["success"])
            self.assertEqual(res_rep["data"]["status"], "clean")

            # 2. Trigger crawl
            crawl_req = BrokenLinkScanRequest(max_links=50)
            res_scan = asyncio.run(run_broken_links_scan(self.site_id, body=crawl_req, user=self.user))
            self.assertTrue(res_scan["success"])
            self.assertEqual(res_scan["data"]["scanned"], 50)

    def test_6_security_scanner_and_port_scan(self):
        """Verify full security audit including open port detection and headers score."""
        mock_request = MagicMock()
        mock_request.json = MagicMock()

        async def get_json():
            return {"url": "https://example.com"}
        mock_request.json = get_json

        with patch("src.services.security_scanner_service.SecurityScannerService.run_full_audit") as mock_audit:
            mock_audit.return_value = {
                "target_url": "https://example.com",
                "ip_address": "93.184.216.34",
                "score": 92,
                "grade": "A",
                "verdict": "SECURE",
                "ports": {
                    "open_count": 2,
                    "total_scanned": 12,
                    "critical_exposed": 0
                },
                "http": {"header_score": 90},
                "ssl": {"supported": True, "grade": "A"}
            }

            res = asyncio.run(user_security_audit(mock_request, user=self.user))
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["audit"]["score"], 92)
            self.assertEqual(res["audit"]["ports"]["open_count"], 2)

    def test_7_threat_intelligence_whois_lookup(self):
        """Verify WHOIS IP lookup and PTR reverse DNS resolution."""
        with patch("ipaddress.ip_address") as mock_ip, \
             patch("httpx.AsyncClient") as mock_client:

            mock_ip.return_value = True
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "status": "success",
                "country": "United States",
                "countryCode": "US",
                "org": "Cloudflare, Inc.",
                "as": "AS13335 Cloudflare, Inc."
            }
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_resp

            res = asyncio.run(user_whois_lookup(ip="1.1.1.1", user=self.user))
            self.assertIn("status", res)
            self.assertEqual(res["status"], "success")

    def test_8_breach_intelligence_pwned_passwords(self):
        """Verify HaveIBeenPwned k-anonymity SHA-1 range querying."""
        with patch("requests.get") as mock_get:
            # Mock HIBP range response format: SUFFIX:COUNT
            # For "password" (SHA1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8):
            # Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
            suffix = "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = f"0018A45C4D63F44208:1\n{suffix}:3861493\nFFFFF:2"

            body = PwnedPasswordCheckRequest(password="password")
            res = asyncio.run(check_pwned_password_api(body=body, user=self.user))

            self.assertTrue(res["success"])
            self.assertTrue(res["data"]["pwned"])
            self.assertEqual(res["data"]["count"], 3861493)
            self.assertEqual(res["data"]["risk"], "CRITICAL")


if __name__ == "__main__":
    unittest.main()
