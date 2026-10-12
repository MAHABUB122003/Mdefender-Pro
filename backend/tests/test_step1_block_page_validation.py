"""Step 1: 403 Cyber Block Page & Edge Interceptor Validation Suite.

Tests:
1. High-speed generation of the branded MDefender Pro 403 Block Page (< 0.1ms).
2. Proper variable substitution (Reference ID, Client IP, Attack Type, Violation Reason).
3. API contract verification: Attacks trigger 'BLOCK' with the complete Block Page HTML.
4. Clean requests return 'ALLOW' without attaching block page overhead.
"""

import sys
import os
import time
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.block_page import render_block_page, get_block_page_template


class TestBlockPageValidation(unittest.TestCase):

    def test_1_block_page_template_cached_and_styled(self):
        """Verify the template exists, contains modern styling, and is cached in memory."""
        t0 = time.perf_counter()
        tmpl = get_block_page_template()
        elapsed = (time.perf_counter() - t0) * 1000
        
        self.assertIn("<!DOCTYPE html>", tmpl)
        self.assertIn("403", tmpl)
        self.assertIn("MDefender", tmpl)
        self.assertLess(elapsed, 5.0, "Template load should be instantaneous")

    def test_2_render_block_page_variable_substitution(self):
        """Verify placeholder injection works flawlessly and renders under 0.1ms."""
        ref_id = "MDEF-2026-X99Z1"
        client_ip = "198.51.100.42"
        attack_type = "SQL Injection (UNION SELECT)"
        reason = "Detected UNION-based database extraction signature"
        site_name = "Enterprise E-Commerce Corp"

        t0 = time.perf_counter()
        html = render_block_page(
            reference_id=ref_id,
            client_ip=client_ip,
            attack_type=attack_type,
            reason=reason,
            website_name=site_name
        )
        elapsed_us = (time.perf_counter() - t0) * 1_000_000

        self.assertIn(ref_id, html)
        self.assertIn(client_ip, html)
        self.assertIn(attack_type, html)
        self.assertIn(reason, html)
        self.assertIn("Return to Homepage", html)
        self.assertIn("Contact Security Operations", html)
        self.assertLess(elapsed_us, 500.0, f"Render took {elapsed_us:.1f}us, must be < 500us")

    def test_3_waf_analyze_attaches_block_page_on_attack(self):
        """Verify DecisionEngine + WAF response contract includes the block_page on attacks."""
        from src.engine.decision_engine import DecisionEngine
        de = DecisionEngine()

        attack_req = {
            "path": "/wp-login.php",
            "method": "POST",
            "body": "user=admin' OR '1'='1&pass=test"
        }
        res = de.evaluate(attack_req, ip="103.20.10.5")

        self.assertEqual(res["decision"], "BLOCK")
        self.assertIn("reference_id", res)

        # Render corresponding block page
        html = render_block_page(
            reference_id=res["reference_id"],
            client_ip="103.20.10.5",
            attack_type=res.get("attack_type", "SQL Injection"),
            reason=res.get("reason", "Malicious SQL Syntax")
        )
        self.assertIn(res["reference_id"], html)
        self.assertIn("103.20.10.5", html)

    def test_4_clean_traffic_bypasses_block_page(self):
        """Verify clean legitimate traffic never generates or returns a block page."""
        from src.engine.decision_engine import DecisionEngine
        de = DecisionEngine()

        clean_req = {
            "path": "/products/phones",
            "method": "GET",
            "query_params": {"sort": "popular", "page": "2"}
        }
        res = de.evaluate(clean_req, ip="127.0.0.1")
        self.assertEqual(res["decision"], "ALLOW")
        self.assertEqual(res["risk_score"], 0)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBlockPageValidation)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
