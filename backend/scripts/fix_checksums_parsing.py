# -*- coding: utf-8 -*-
"""
Script to fix checksums and findings parsing in scan.js.
"""

import sys

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

target = """        // 1. WordPress Core Checksum Mismatches
        if (scanData.malware_scan && scanData.malware_scan.wp_checksums) {
            var checksums = scanData.malware_scan.wp_checksums;"""

replacement = """        // 1. WordPress Core Checksum Mismatches
        var checksums = null;
        if (scanData.malware_scan && scanData.malware_scan.wp_checksums) {
            checksums = scanData.malware_scan.wp_checksums;
        } else if (scanData.wordpress_checks && scanData.wordpress_checks.wp_checksums) {
            checksums = scanData.wordpress_checks.wp_checksums;
        } else if (scanData.wp_checksums) {
            checksums = scanData.wp_checksums;
        }

        if (checksums) {"""

if target not in js_content:
    print("Target not found in scan.js")
    sys.exit(1)

js_content = js_content.replace(target, replacement)

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Updated checksums parsing in scan.js!")
