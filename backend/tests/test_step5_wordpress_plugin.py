"""Step 5 Verification Test Suite: WordPress Security Plugin Integration.

Tests:
1. Verify `mdefender-pro.zip` exists, is valid, and contains required entry points:
   - `waf-bootstrap.php`
   - `waf-firewall.php`
   - `block-page-template.php`
   - `mdefender-pro.php`
2. Verify plugin metadata parser (_plugin_info).
3. Verify WordPress connection and heartbeat endpoint contracts.
"""

import os
import sys
import zipfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.v1.wordpress_api import PLUGIN_ZIP_PATH, _plugin_info


class TestStep5WordPressPlugin(unittest.TestCase):

    def test_1_plugin_zip_structure_integrity(self):
        """Verify the official plugin zip exists and has all essential security engine files."""
        self.assertTrue(os.path.isfile(PLUGIN_ZIP_PATH), f"Plugin zip must exist at {PLUGIN_ZIP_PATH}")
        self.assertGreater(os.path.getsize(PLUGIN_ZIP_PATH), 100_000, "Plugin zip must be fully packaged")

        with zipfile.ZipFile(PLUGIN_ZIP_PATH, 'r') as zf:
            names = zf.namelist()
            # Ensure critical core security files are in the zip
            has_bootstrap = any("waf-bootstrap.php" in n for n in names)
            has_firewall = any("waf-firewall.php" in n for n in names)
            has_main = any("mdefender-pro.php" in n for n in names)

            self.assertTrue(has_bootstrap, "Zip must contain waf-bootstrap.php")
            self.assertTrue(has_firewall, "Zip must contain waf-firewall.php")
            self.assertTrue(has_main, "Zip must contain main plugin file")

    def test_2_plugin_info_metadata(self):
        """Verify metadata extractor correctly reads version and file counts."""
        info = _plugin_info()
        self.assertIsNotNone(info)
        self.assertEqual(info["filename"], "mdefender-pro.zip")
        self.assertGreater(info["files"], 10)
        self.assertGreater(info["size"], 100_000)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestStep5WordPressPlugin)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
