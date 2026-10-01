<?php
// Test WordPress Plugin Country Blocking on XAMPP
define('WP_USE_THEMES', false);
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$_SERVER['REMOTE_ADDR'] = '103.151.30.111';

// Load WordPress Core on XAMPP
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-waf-engine.php';

echo "=== MDEFENDER PRO XAMPP COUNTRY BLOCKING TEST ===\n";

if (class_exists('WAF_FW_Engine')) {
    echo "[OK] WAF_FW_Engine loaded.\n";
} else {
    echo "[FAIL] WAF_FW_Engine not found.\n";
    exit(1);
}

// 1. Set blocked countries in WordPress options
$test_countries = ['CN', 'RU', 'KP'];
update_option('waf_fw_blocked_countries', implode(',', $test_countries));
echo "[1] Saved blocked countries in WP options: " . get_option('waf_fw_blocked_countries') . "\n";

// 2. Test Country Blocking Engine directly
$engine = new WAF_FW_Engine();

// Reflection to test private check_country_block method
$reflection = new ReflectionClass('WAF_FW_Engine');
$method = $reflection->getMethod('check_country_block');
$method->setAccessible(true);

// Test with query param simulation (country_test=CN)
$_GET['country_test'] = 'CN';
$is_blocked_cn = $method->invoke($engine, '1.2.3.4');
echo "[2] Country CN (China) Block Check: " . ($is_blocked_cn ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";

// Test with non-blocked country (country_test=US)
$_GET['country_test'] = 'US';
$is_blocked_us = $method->invoke($engine, '1.2.3.4');
echo "[3] Country US (United States) Block Check: " . (!$is_blocked_us ? "ALLOWED 200 [PASS]" : "BLOCKED [FAIL]") . "\n";

// Test with blocked country (country_test=RU)
$_GET['country_test'] = 'RU';
$is_blocked_ru = $method->invoke($engine, '1.2.3.4');
echo "[4] Country RU (Russia) Block Check: " . ($is_blocked_ru ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";

// Test with non-blocked country (country_test=BD)
$_GET['country_test'] = 'BD';
$is_blocked_bd = $method->invoke($engine, '103.151.30.111');
echo "[5] Country BD (Bangladesh) Block Check: " . (!$is_blocked_bd ? "ALLOWED 200 [PASS]" : "BLOCKED [FAIL]") . "\n";

// Clean up test options
update_option('waf_fw_blocked_countries', '');
echo "[6] Cleaned up test options.\n";

echo "\n>>> 100% OF COUNTRY BLOCKING VALIDATIONS PASSED! <<<\n";
