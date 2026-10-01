<?php
define('DOING_CRON', true);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-scanner.php';

$scanner = WAF_FW_Scanner::instance();
global $wpdb;
$queue_table = WAF_FW_DB::instance()->get_scan_queue_table();
$scan = $wpdb->get_row("SELECT id, status, progress, current_stage FROM $queue_table WHERE id = 43");

echo "Continuing Scan ID 43... Current Status: " . ($scan ? $scan->status : 'none') . "\n";

while (true) {
    $res = $scanner->process_scan_batch(43);
    $scan_curr = $wpdb->get_row("SELECT id, status, progress, current_stage FROM $queue_table WHERE id = 43");
    echo "Progress: " . ($scan_curr ? $scan_curr->progress : 0) . "% | Stage: " . ($scan_curr ? $scan_curr->current_stage : '') . " | Status: " . ($scan_curr ? $scan_curr->status : '') . "\n";
    if (!$scan_curr || in_array($scan_curr->status, ['completed', 'completed_with_issues', 'failed', 'cancelled']) || ($scan_curr->progress >= 100)) {
        break;
    }
    usleep(100000);
}

$results_table = WAF_FW_DB::instance()->get_scan_results_table();
$last_res = $wpdb->get_row("SELECT id, status, score, issues_found, duration_seconds FROM $results_table ORDER BY id DESC LIMIT 1");
if ($last_res) {
    echo "\n=== SCAN FULLY FINISHED ===\n";
    echo "Result ID: " . $last_res->id . "\n";
    echo "Status: " . $last_res->status . "\n";
    echo "Score: " . $last_res->score . "/100\n";
    echo "Issues Found: " . $last_res->issues_found . "\n";
    echo "Duration: " . $last_res->duration_seconds . "s\n";
}
