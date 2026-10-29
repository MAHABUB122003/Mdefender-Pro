<?php
define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "WordPress Loaded successfully! Checking Dashboard vs Logs metrics..." . PHP_EOL;

global $wpdb;
$logger = WAF_FW_Logger::instance();
$dash_data = $logger->get_dashboard_data();

$table_attacks = $logger->get_db()->get_attacks_table();
$table_requests = $logger->get_db()->get_requests_table();

$total_blocked_attacks = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_attacks}");
$total_allowed_requests = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_requests}");
$total_all_logs = $total_blocked_attacks + $total_allowed_requests;

echo "==================================================" . PHP_EOL;
echo "DATABASE RAW COUNTS:" . PHP_EOL;
echo "  - Clean/Allowed Requests table : {$total_allowed_requests}" . PHP_EOL;
echo "  - Blocked Attacks table        : {$total_blocked_attacks}" . PHP_EOL;
echo "  - Total Combined Traffic       : {$total_all_logs}" . PHP_EOL;
echo "--------------------------------------------------" . PHP_EOL;
echo "SECURITY LOGS (logs.php) DISPLAY COUNTS:" . PHP_EOL;
echo "  - Total Inspected Traffic      : {$total_all_logs}" . PHP_EOL;
echo "  - Blocked Ingress Attacks      : {$total_blocked_attacks}" . PHP_EOL;
echo "  - Clean Allowed Ingress        : {$total_allowed_requests}" . PHP_EOL;
echo "--------------------------------------------------" . PHP_EOL;
echo "DASHBOARD (dashboard.php) DATA:" . PHP_EOL;
echo "  - Requests inspected (total_requests) : " . ($dash_data['total_requests'] ?? 0) . PHP_EOL;
echo "  - Threats blocked (total_attacks)     : " . ($dash_data['total_attacks'] ?? 0) . PHP_EOL;
echo "  - Clean allowed (total_allowed)       : " . ($dash_data['total_allowed'] ?? 0) . PHP_EOL;
echo "==================================================" . PHP_EOL;

if ($dash_data['total_requests'] === $total_all_logs && $dash_data['total_attacks'] === $total_blocked_attacks) {
    echo "SUCCESS: Dashboard 'Requests inspected' ({$dash_data['total_requests']}) PERFECTLY MATCHES Security Logs ({$total_all_logs})!" . PHP_EOL;
} else {
    echo "ERROR: Discrepancy detected!" . PHP_EOL;
}

