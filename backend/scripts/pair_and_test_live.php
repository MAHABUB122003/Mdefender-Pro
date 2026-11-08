<?php
/**
 * MDefender Pro - Full-Stack Live WordPress Pairing & Health Diagnostic
 */

define('WP_USE_THEMES', false);
require('C:/xampp/htdocs/mahabub/wp-load.php');

$apiKey = 'zq8V5f4Swk9GCqxMFJU6nVV9E3HfcQS47mi8piDdXMn32WUToSJ29mo-lzULOSl1';
$cloudUrl = 'http://127.0.0.1:8000';

echo "=========================================================\n";
echo "   MDefender Pro WordPress Live Pairing & Validation     \n";
echo "=========================================================\n\n";

// 1. Site Info
$home = home_url();
$host = parse_url($home, PHP_URL_HOST) ?: 'localhost';
$cleanHost = preg_replace('/^www\./i', '', $host);
$sitePath = trim(parse_url($home, PHP_URL_PATH) ?? '', '/');
$cleanDomain = (!empty($sitePath)) ? $cleanHost . '/' . $sitePath : $cleanHost;

echo "[1] Target Site: {$home} (Domain Key: {$cleanDomain})\n";

// 2. Perform Handshake
$payload = [
    'api_key' => $apiKey,
    'domain' => $cleanDomain,
    'site_url' => $home,
    'home_url' => $home,
    'site_name' => get_bloginfo('name'),
    'wp_version' => get_bloginfo('version'),
    'php_version' => phpversion(),
    'plugin_version' => '4.3.0'
];

echo "[2] Sending Pairing Handshake to {$cloudUrl}/api/v1/wordpress/connect ...\n";
$response = wp_remote_post(rtrim($cloudUrl, '/') . '/api/v1/wordpress/connect', [
    'timeout' => 15,
    'sslverify' => false,
    'headers' => [
        'Content-Type' => 'application/json',
        'Authorization' => 'Bearer ' . $apiKey
    ],
    'body' => wp_json_encode($payload)
]);

if (is_wp_error($response)) {
    echo "[-] FAILED: " . $response->get_error_message() . "\n";
    exit(1);
}

$code = wp_remote_retrieve_response_code($response);
$body = wp_remote_retrieve_body($response);
echo "[+] Handshake Response Code: {$code}\n";

$data = json_decode($body, true);
if ($code !== 200 || empty($data['data'])) {
    echo "[-] Pairing Rejected: {$body}\n";
    exit(1);
}

$resData = $data['data'];
echo "[✓] Handshake Accepted by MDefender Cloud Fleet!\n";
echo "    - Website ID: " . ($resData['website_id'] ?? 'N/A') . "\n";
echo "    - Site Token: " . substr($resData['site_token'] ?? '', 0, 16) . "...\n";
echo "    - Trial Days: " . ($resData['trial_days_remaining'] ?? 'N/A') . "\n";
echo "    - Subscription Status: " . ($resData['subscription_status'] ?? 'N/A') . "\n";

// 3. Save options in WordPress
update_option('waf_fw_api_key', $apiKey);
update_option('waf_fw_ml_api_key', $apiKey);
update_option('waf_fw_site_token', $resData['site_token'] ?? '');
update_option('waf_fw_website_id', $resData['website_id'] ?? '');
update_option('waf_fw_trial_days_remaining', $resData['trial_days_remaining'] ?? 14);
update_option('waf_fw_subscription_status', $resData['subscription_status'] ?? 'trial_active');
update_option('waf_fw_cloud_api_url', $cloudUrl);
update_option('waf_fw_ml_api_url', $cloudUrl);
update_option('waf_fw_connected', 'yes');
update_option('waf_allow_cloud_sso', 'yes');
update_option('waf_fw_last_sync', current_time('mysql'));

// Ensure WAF engine is active
update_option('waf_fw_status', 'active');
update_option('waf_fw_mode', 'block');
update_option('waf_fw_learning_mode', 'no');

echo "[✓] WordPress options updated successfully! WAF is ACTIVE.\n\n";
