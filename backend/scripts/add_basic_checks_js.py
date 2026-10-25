# -*- coding: utf-8 -*-
"""
Add basic_checks parsing to parseFindingsFromScanData in scan.js.
"""

import sys

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

target = "        // 4. Vulnerable Plugins or Themes"
if target not in js_content:
    print("Target not found")
    sys.exit(1)

basic_checks_code = '''        // 4. Basic Security & Exposure Checks (from Quick / Full scans)
        if (scanData.basic_checks) {
            var bc = scanData.basic_checks;
            if (bc.install_php_exists) {
                findings.push({
                    id: 'basic_install_php',
                    title: 'Exposed Core Installation Script: wp-admin/install.php',
                    type: 'Security Hardening',
                    severity: 'warning',
                    severityLabel: 'Warning',
                    details: 'The WordPress installation script <code>wp-admin/install.php</code> is publicly reachable over HTTP and can reveal environment details or trigger unauthorized actions.',
                    evidence: [
                        'Installation script is accessible over public HTTP request.',
                        'Hardening recommendation: delete or restrict access via .htaccess.'
                    ],
                    paths: 'Target file: <code>wp-admin/install.php</code>',
                    file: 'wp-admin/install.php',
                    actions: [
                        { label: 'View File Source', class: 'waf-btn-view-file', file: 'wp-admin/install.php' },
                        { label: 'Ignore Issue', class: 'waf-btn-ignore-file', file: 'wp-admin/install.php' }
                    ]
                });
            }
            if (bc.upgrade_php_exists) {
                findings.push({
                    id: 'basic_upgrade_php',
                    title: 'Publicly Accessible Database Upgrade Endpoint: wp-admin/upgrade.php',
                    type: 'Security Hardening',
                    severity: 'warning',
                    severityLabel: 'Warning',
                    details: 'The database upgrade script <code>wp-admin/upgrade.php</code> is reachable without administrative authentication.',
                    evidence: [
                        'Database upgrade endpoint exposed to unauthenticated visitors.',
                        'Should be protected by WAF access rules.'
                    ],
                    paths: 'Target file: <code>wp-admin/upgrade.php</code>',
                    file: 'wp-admin/upgrade.php',
                    actions: [
                        { label: 'View File Source', class: 'waf-btn-view-file', file: 'wp-admin/upgrade.php' },
                        { label: 'Ignore Issue', class: 'waf-btn-ignore-file', file: 'wp-admin/upgrade.php' }
                    ]
                });
            }
            if (bc.readme_exists) {
                findings.push({
                    id: 'basic_readme',
                    title: 'Version Disclosure Resource Reachable: readme.html',
                    type: 'Information Disclosure',
                    severity: 'warning',
                    severityLabel: 'Notice',
                    details: 'Default WordPress <code>readme.html</code> reveals CMS version to automated reconnaissance scanners and threat bots.',
                    evidence: [
                        'WordPress readme.html is directly accessible at the web root.',
                        'Fingerprints WordPress version to automated attack frameworks.'
                    ],
                    paths: 'Target file: <code>readme.html</code>',
                    file: 'readme.html',
                    actions: [
                        { label: 'View File Source', class: 'waf-btn-view-file', file: 'readme.html' },
                        { label: 'Ignore Issue', class: 'waf-btn-ignore-file', file: 'readme.html' }
                    ]
                });
            }
        }

        // 5. Vulnerable Plugins or Themes'''

js_content = js_content.replace(target, basic_checks_code)

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Updated basic_checks parsing in scan.js!")
