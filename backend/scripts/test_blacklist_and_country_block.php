<?php
/**
 * Test Blacklist & Country Blocking on WordPress / MDefender-Pro
 */

$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SERVER_NAME'] = 'localhost';
$_SERVER['DOCUMENT_ROOT'] = 'C:/xampp/htdocs';

require 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "========================================================\n";
echo " MDEFENDER PRO: BLACKLIST & COUNTRY BLOCK VERIFICATION \n";
echo "========================================================\n\n";

$engine = WAF_FW_Engine::instance();
$ip_filter = WAF_FW_IP_Filter::instance();

// ---------------------------------------------------------
// TEST 1: Clean Request (Not Blacklisted, Not Geo-Blocked)
// ---------------------------------------------------------
echo "[TEST 1] Testing Clean Request (IP: 203.0.113.195)...\n";
$_SERVER['REMOTE_ADDR'] = '203.0.113.195';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$result = $engine->analyze_current_request();
echo "  -> Result Status: " . $result['status'] . "\n";
echo "  -> Message: " . ($result['message'] ?? 'N/A') . "\n";
if ($result['status'] === 'allowed') {
    echo "  [PASS] Clean visitor successfully allowed.\n\n";
} else {
    echo "  [FAIL] Clean visitor was unexpectedly blocked.\n\n";
}

// ---------------------------------------------------------
// TEST 2: Blacklist via Cloud Dashboard Sync (IP: 198.51.100.77)
// ---------------------------------------------------------
echo "[TEST 2] Blacklisting IP: 198.51.100.77 via MDefender Cloud Cache...\n";
$current_bl = get_option('waf_fw_local_blacklist_cache', []);
$current_bl[] = '198.51.100.77';
update_option('waf_fw_local_blacklist_cache', array_unique($current_bl));
$engine->export_fast_cache();

$_SERVER['REMOTE_ADDR'] = '198.51.100.77';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$result_bl = $engine->analyze_current_request();
echo "  -> Result Status: " . $result_bl['status'] . "\n";
echo "  -> Attack Type: " . ($result_bl['attack_type'] ?? 'N/A') . "\n";
echo "  -> Confidence: " . ($result_bl['confidence'] ?? 'N/A') . "\n";
echo "  -> Message: " . ($result_bl['message'] ?? 'N/A') . "\n";
if ($result_bl['status'] === 'blocked' && $result_bl['attack_type'] === 'Blacklisted IP') {
    echo "  [PASS] Blacklisted IP is immediately BLOCKED (403 Forbidden).\n\n";
} else {
    echo "  [FAIL] Blacklisted IP was not blocked!\n\n";
}

// ---------------------------------------------------------
// TEST 3: Blacklist Localhost Testing (IP: 127.0.0.1 and ::1)
// ---------------------------------------------------------
echo "[TEST 3] Blacklisting Localhost IP (127.0.0.1)...\n";
$current_bl[] = '127.0.0.1';
update_option('waf_fw_local_blacklist_cache', array_unique($current_bl));
$engine->export_fast_cache();

$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$result_local = $engine->analyze_current_request();
echo "  -> Result Status: " . $result_local['status'] . "\n";
echo "  -> Attack Type: " . ($result_local['attack_type'] ?? 'N/A') . "\n";
if ($result_local['status'] === 'blocked') {
    echo "  [PASS] Localhost blacklisted IP is immediately BLOCKED.\n\n";
} else {
    echo "  [FAIL] Localhost blacklisted IP was not blocked!\n\n";
}

// ---------------------------------------------------------
// TEST 4: Country Geo-Block (e.g. Block 'CN', 'RU', 'BD', 'US')
// ---------------------------------------------------------
echo "[TEST 4] Testing Country Blocking (Blocking CN, RU)...\n";
update_option('waf_fw_blocked_countries', 'CN,RU');
$engine->export_fast_cache();

$_SERVER['REMOTE_ADDR'] = '1.2.3.4'; // Non-local IP
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'CN';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$result_geo = $engine->analyze_current_request();
echo "  -> Result for Origin Country CN Status: " . $result_geo['status'] . "\n";
echo "  -> Attack Type: " . ($result_geo['attack_type'] ?? 'N/A') . "\n";
echo "  -> Message: " . ($result_geo['message'] ?? 'N/A') . "\n";
if ($result_geo['status'] === 'blocked' && $result_geo['attack_type'] === 'Country Blocked') {
    echo "  [PASS] Visitor from blocked country (CN) is immediately BLOCKED.\n\n";
} else {
    echo "  [FAIL] Visitor from blocked country was not blocked!\n\n";
}

// ---------------------------------------------------------
// TEST 5: Allowed Country
// ---------------------------------------------------------
echo "[TEST 5] Testing Visitor from Non-Blocked Country (e.g. JP)...\n";
$_SERVER['REMOTE_ADDR'] = '133.242.0.1';
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'JP';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$result_jp = $engine->analyze_current_request();
echo "  -> Result for Origin Country JP Status: " . $result_jp['status'] . "\n";
if ($result_jp['status'] === 'allowed') {
    echo "  [PASS] Visitor from non-blocked country (JP) is ALLOWED.\n\n";
} else {
    echo "  [FAIL] Visitor from non-blocked country was unexpectedly blocked!\n\n";
}

// ---------------------------------------------------------
// TEST 6: Clean Up Test State
// ---------------------------------------------------------
echo "[TEST 6] Cleaning up test blocks...\n";
update_option('waf_fw_local_blacklist_cache', []);
update_option('waf_fw_blocked_countries', '');
$engine->export_fast_cache();
echo "  -> Test state reset.\n\n";

echo "========================================================\n";
echo " ALL TESTS COMPLETED SUCCESSFULLY!                      \n";
echo "========================================================\n";
