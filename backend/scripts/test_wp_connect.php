<?php
/**
 * Test script to verify API key connection and service delivery between
 * WordPress plugin and MDefender-Pro backend.
 */
define('WP_USE_THEMES', false);
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['DOCUMENT_ROOT'] = 'C:/xampp/htdocs';

require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "========================================================\n";
echo " MDEFENDER PRO: API CONNECTION & SERVICE VERIFICATION\n";
echo "========================================================\n\n";

$api_key = 'mdf_live_test_api_key_8492048102948201';
$backend_url = 'http://127.0.0.1:8000';

update_option('waf_fw_ml_api_key', $api_key);
update_option('waf_fw_ml_api_url', $backend_url);
update_option('waf_fw_protection_enabled', 'yes');
update_option('waf_fw_rate_limit_enabled', 'no');
update_option('waf_fw_attack_blocker_enabled', 'no');

$client = WAF_FW_ML_Api_Client::instance();
$client->refresh_config();

echo "[STEP 1] Testing /api/v1/wordpress/connect...\n";
$connect_res = $client->connect();
echo "  -> Result: " . json_encode($connect_res, JSON_PRETTY_PRINT) . "\n";

if (empty($connect_res['success'])) {
    echo "  [ERROR] Connection failed: " . ($connect_res['message'] ?? 'Unknown') . "\n";
    exit(1);
}

echo "[STEP 2] Testing /api/v1/wordpress/heartbeat...\n";
$stats = [
    'requests_blocked' => 10,
    'requests_allowed' => 50,
    'last_scan' => 'complete'
];
$heartbeat_res = $client->heartbeat($stats);
echo "  -> Result: " . json_encode($heartbeat_res, JSON_PRETTY_PRINT) . "\n";

echo "[STEP 3] Testing /api/v1/waf/analyze via Cloud API...\n";
$test_req = [
    'url' => '/mahabub/?id=1%27%20UNION%20SELECT%20null,password%20FROM%20users--',
    'method' => 'GET',
    'body' => '',
    'query_string' => "id=1' UNION SELECT null,password FROM users--",
    'headers' => ['User-Agent' => 'Mozilla/5.0'],
    'ip' => '198.51.100.55'
];
$decision = $client->analyze($test_req);
$summary = is_array($decision) ? array_diff_key($decision, ['block_page_html' => '']) : $decision;
echo "  -> Cloud WAF Decision: " . json_encode($summary, JSON_PRETTY_PRINT) . "\n";
echo "  -> Has Block Page HTML: " . (!empty($decision['block_page_html']) ? 'YES (' . strlen($decision['block_page_html']) . ' bytes)' : 'NO') . "\n";
echo "  -> Last Error: " . $client->get_last_error() . "\n\n";

echo "========================================================\n";
echo " CONNECTION & CLOUD SERVICE VERIFICATION COMPLETE\n";
echo "========================================================\n";
