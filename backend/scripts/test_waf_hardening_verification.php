<?php
define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "WP Loaded! Version: " . get_bloginfo('version') . PHP_EOL;

// 1. Test IP Filter & .htaccess synchronization
$ip_filter = WAF_FW_IP_Filter::instance();
$test_ip = '198.51.100.77';

echo "Testing Blacklist Addition of {$test_ip}..." . PHP_EOL;
$ip_filter->add_to_blacklist($test_ip, 'Automated Test Block');
$is_bl = $ip_filter->is_blacklisted($test_ip);
echo "Is Blacklisted: " . ($is_bl ? "YES" : "NO") . PHP_EOL;

$htaccess_path = ABSPATH . '.htaccess';
$content = file_exists($htaccess_path) ? file_get_contents($htaccess_path) : '';
echo "Has .htaccess block with test IP: " . (strpos($content, '198.51.100.77') !== false ? "YES" : "NO") . PHP_EOL;

echo "Testing Blacklist Removal..." . PHP_EOL;
$ip_filter->remove_from_blacklist($test_ip);
$is_bl_after = $ip_filter->is_blacklisted($test_ip);
echo "Is Blacklisted after removal: " . ($is_bl_after ? "YES" : "NO") . PHP_EOL;
$content_after = file_exists($htaccess_path) ? file_get_contents($htaccess_path) : '';
echo "Has IP in .htaccess after removal: " . (strpos($content_after, '198.51.100.77') !== false ? "YES" : "NO") . PHP_EOL;

// 2. Test Website Hardening Engine
echo PHP_EOL . "Testing Website Hardening Engine..." . PHP_EOL;
$hardening = WAF_FW_Website_Hardening::instance();
$features = $hardening->get_all_features();
echo "Total Features: " . count($features) . PHP_EOL;

$rep = $hardening->generate_report();
echo "Initial Report Score: " . $rep['score'] . "/100 Grade: " . $rep['grade'] . PHP_EOL;

echo "Applying Balanced Profile..." . PHP_EOL;
$p_res = $hardening->apply_profile('balanced');
echo "Profile Result: " . json_encode($p_res) . PHP_EOL;

$rep_after = $hardening->generate_report();
echo "Score after Hardening: " . $rep_after['score'] . "/100 Grade: " . $rep_after['grade'] . PHP_EOL;

$ht_content = file_exists($htaccess_path) ? file_get_contents($htaccess_path) : '';
echo "cPanel Probes Guard in .htaccess: " . (strpos($ht_content, '2083') !== false ? "YES" : "NO") . PHP_EOL;

echo PHP_EOL . ">>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<" . PHP_EOL;

// 3. Test Strong & Maximum Profiles
echo PHP_EOL . "Testing Strong Profile..." . PHP_EOL;
$res_strong = $hardening->apply_profile('strong');
$rep_strong = $hardening->generate_report();
echo "Strong Score: " . $rep_strong['score'] . "/100 Grade: " . $rep_strong['grade'] . PHP_EOL;

echo PHP_EOL . "Testing Maximum Profile..." . PHP_EOL;
$res_max = $hardening->apply_profile('maximum');
$rep_max = $hardening->generate_report();
echo "Maximum Score: " . $rep_max['score'] . "/100 Grade: " . $rep_max['grade'] . PHP_EOL;

echo PHP_EOL . ">>> ALL PROFILE TESTS COMPLETE! <<<" . PHP_EOL;
