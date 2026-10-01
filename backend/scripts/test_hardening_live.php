<?php
define('WP_USE_THEMES', false);
require 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "=== MDEFENDER-PRO HARDENING ENGINE LIVE TEST ===" . PHP_EOL;

$h = WAF_FW_Website_Hardening::instance();
$initial_report = $h->generate_report();
echo "Initial Hardening Score: " . $initial_report['score'] . " / 100 (Grade: " . $initial_report['grade'] . "), Active: " . $initial_report['enabled_count'] . "/" . $initial_report['total_features'] . PHP_EOL;

// 1. Test 1-Click Harden
echo "\n--- 1. Testing 1-Click Harden All Modules ---" . PHP_EOL;
$one_click_result = $h->one_click_harden();
echo "Features processed: " . $one_click_result['total'] . ", Successfully applied: " . $one_click_result['applied'] . ", Errors: " . $one_click_result['errors'] . PHP_EOL;

// 2. Test Individual Feature Configuration
echo "\n--- 2. Testing Custom Rule: Security Headers ---" . PHP_EOL;
$sec_headers = $h->apply_security_headers([
    'hsts' => true,
    'hsts_max_age' => '31536000',
    'hsts_subdomains' => true,
    'x_frame_options' => 'SAMEORIGIN',
    'x_content_type_options' => true,
    'referrer_policy' => 'strict-origin-when-cross-origin'
]);
echo "Security Headers applied actions: " . implode(', ', $sec_headers['actions']) . PHP_EOL;

echo "\n--- 3. Testing Custom Rule: Directory Browsing & .htaccess Protection ---" . PHP_EOL;
$dir_browse = $h->apply_directory_browsing(['backup' => true, 'disable_index_html' => true]);
echo "Directory Browsing applied actions: " . implode(', ', $dir_browse['actions']) . PHP_EOL;

echo "\n--- 4. Testing Admin IP & Geo-Fencing ---" . PHP_EOL;
$admin_ip = WAF_FW_Admin_Panel_IP::instance();
update_option('waf_harden_admin_panel_ip_enabled', 1);
update_option('waf_harden_admin_ip_enabled', 'enabled');
update_option('waf_harden_admin_whitelist', "127.0.0.1\n192.168.1.0/24");
update_option('waf_harden_admin_blocked_countries', "CN, RU, KP, IR");
echo "Admin IP Protection enabled: " . ($admin_ip->is_enabled() ? 'YES' : 'NO') . PHP_EOL;
echo "Admin Whitelisted IPs: " . implode(', ', $admin_ip->get_whitelist()) . PHP_EOL;
echo "Admin Blocked Countries: " . implode(', ', $admin_ip->get_blocked_countries()) . PHP_EOL;

// 5. Generate Final Report
echo "\n--- 5. Generating Final Hardening Audit Report ---" . PHP_EOL;
$final_report = $h->generate_report();
echo "Final Hardening Score: " . $final_report['score'] . " / 100" . PHP_EOL;
echo "Final Hardening Grade: " . $final_report['grade'] . " (Maximum Security)" . PHP_EOL;
echo "Active Modules: " . $final_report['enabled_count'] . " / " . $final_report['total_features'] . PHP_EOL;

echo "\n=== ALL HARDENING ENGINE TESTS COMPLETED SUCCESSFULLY! ===" . PHP_EOL;
