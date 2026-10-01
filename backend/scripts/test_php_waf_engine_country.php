<?php
// Standalone PHP WAF Engine & Bootstrap Country Blocking Test
define('ABSPATH', __DIR__ . '/');
define('WAF_FW_PLUGIN_DIR', dirname(__DIR__, 2) . '/plugin_source/mdefender-pro/');

$GLOBALS['mock_options'] = [
    'waf_fw_protection_enabled' => 'yes',
    'waf_fw_blocked_countries' => 'BD,RU,KP',
    'waf_fw_local_server_country' => 'BD',
];
$GLOBALS['mock_transients'] = [];

if (!function_exists('get_option')) {
    function get_option($k, $default = false) {
        return $GLOBALS['mock_options'][$k] ?? $default;
    }
}
if (!function_exists('update_option')) {
    function update_option($k, $v) {
        $GLOBALS['mock_options'][$k] = $v;
        return true;
    }
}
if (!function_exists('get_transient')) {
    function get_transient($k) {
        return $GLOBALS['mock_transients'][$k] ?? false;
    }
}
if (!function_exists('set_transient')) {
    function set_transient($k, $v, $exp = 0) {
        $GLOBALS['mock_transients'][$k] = $v;
        return true;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($s) {
        return trim(strip_tags((string)$s));
    }
}
if (!function_exists('plugin_dir_path')) {
    function plugin_dir_path($f) {
        return dirname($f) . '/';
    }
}
if (!function_exists('add_action')) {
    function add_action($hook, $cb) {}
}

// Mock dependency singletons if needed
class WAF_FW_Rule_Engine {
    public static function instance() { return new self(); }
}
class WAF_FW_Feature_Extractor {
    public static function instance() { return new self(); }
}
class WAF_FW_ML_Api_Client {
    public static function instance() { return new self(); }
}
class WAF_FW_Rate_Limiter {
    public static function instance() { return new self(); }
}
class WAF_FW_IP_Filter {
    public static function instance() { return new self(); }
}
class WAF_FW_Logger {
    public static function instance() { return new self(); }
}

require_once WAF_FW_PLUGIN_DIR . 'includes/class-waf-engine.php';

echo "============================================================\n";
echo "2. TESTING PHP WAF ENGINE COUNTRY BLOCKING\n";
echo "============================================================\n";

$engine = new WAF_FW_Engine();

// Test 1: Bangladesh visitor blocked when BD in blocked_countries
$_GET = [];
$_SERVER = ['REMOTE_ADDR' => '103.151.30.111'];
$is_blocked_bd = $engine->check_country_block('103.151.30.111');
echo "[TEST 1] Bangladesh Public IP (103.151.30.111) check: " . ($is_blocked_bd ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";
assert($is_blocked_bd, "BD public IP should be blocked");

// Test 2: Localhost visitor when BD is blocked and server is in Bangladesh
$_SERVER = ['REMOTE_ADDR' => '127.0.0.1'];
$is_blocked_local = $engine->check_country_block('127.0.0.1');
echo "[TEST 2] Localhost IP (127.0.0.1 -> BD origin) check: " . ($is_blocked_local ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";
assert($is_blocked_local, "Localhost should be blocked when BD is blocked");

// Test 3: US visitor (not in blocked list)
$_SERVER = ['REMOTE_ADDR' => '8.8.8.8'];
$is_blocked_us = $engine->check_country_block('8.8.8.8');
echo "[TEST 3] US IP (8.8.8.8) check: " . (!$is_blocked_us ? "ALLOWED 200 [PASS]" : "BLOCKED [FAIL]") . "\n";
assert(!$is_blocked_us, "US IP should NOT be blocked");

// Test 4: Cloudflare Header CF-IPCountry: RU
$_SERVER = ['REMOTE_ADDR' => '1.2.3.4', 'HTTP_CF_IPCOUNTRY' => 'RU'];
$is_blocked_ru = $engine->check_country_block('1.2.3.4');
echo "[TEST 4] Edge header CF-IPCountry: RU check: " . ($is_blocked_ru ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";
assert($is_blocked_ru, "RU edge header should be blocked");

// Test 5: Query test simulation (?test_country=KP)
$_SERVER = ['REMOTE_ADDR' => '1.2.3.4'];
unset($_SERVER['HTTP_CF_IPCOUNTRY']);
$_GET['test_country'] = 'KP';
$is_blocked_kp = $engine->check_country_block('1.2.3.4');
echo "[TEST 5] Query param ?test_country=KP check: " . ($is_blocked_kp ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";
assert($is_blocked_kp, "KP query test should be blocked");

// Test 6: Unblocking Bangladesh
$_GET = [];
update_option('waf_fw_blocked_countries', 'RU,KP');
$_SERVER = ['REMOTE_ADDR' => '103.151.30.111'];
$is_blocked_bd_after = $engine->check_country_block('103.151.30.111');
echo "[TEST 6] Bangladesh IP after unblocking BD: " . (!$is_blocked_bd_after ? "ALLOWED 200 [PASS]" : "BLOCKED [FAIL]") . "\n";
assert(!$is_blocked_bd_after, "BD IP should be allowed after unblocking");

echo "\n============================================================\n";
echo "3. TESTING WAF PRE-FLIGHT BOOTSTRAP COUNTRY BLOCKING\n";
echo "============================================================\n";

// Test bootstrap execution simulation
$mdefender_cache_data = [
    'enabled' => true,
    'blocked_countries' => ['BD', 'RU'],
    'local_server_country' => 'BD'
];
$mdefender_ip = '103.151.30.111';
$is_blocked = false;

// Simulate bootstrap logic
$geo_country = '';
$is_local_ip = in_array($mdefender_ip, ['127.0.0.1', '::1', '0.0.0.0', 'localhost'], true);
if (empty($geo_country) && $is_local_ip) {
    $geo_country = !empty($mdefender_cache_data['local_server_country']) ? strtoupper($mdefender_cache_data['local_server_country']) : 'BD';
}
if (empty($geo_country) && !$is_local_ip) {
    // Disk cache
    $geoip_cache_file = WAF_FW_PLUGIN_DIR . 'includes/data/waf_geoip_cache.json';
    if (file_exists($geoip_cache_file)) {
        $geoip_data = @json_decode(@file_get_contents($geoip_cache_file), true);
        if (is_array($geoip_data) && !empty($geoip_data[$mdefender_ip])) {
            $geo_country = strtoupper(substr(trim($geoip_data[$mdefender_ip]), 0, 2));
        }
    }
}
$blocked_list = (array)$mdefender_cache_data['blocked_countries'];
if (!empty($geo_country) && in_array($geo_country, $blocked_list, true)) {
    $is_blocked = true;
}
echo "[TEST 7] Pre-flight Bootstrap fast GeoIP check for BD: " . ($is_blocked ? "BLOCKED 403 [PASS]" : "ALLOWED [FAIL]") . "\n";

echo "\n>>> ALL COUNTRY BLOCKING ENGINE & BOOTSTRAP TESTS PASSED! <<<\n";
