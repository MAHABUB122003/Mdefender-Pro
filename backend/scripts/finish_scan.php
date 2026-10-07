<?php
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

$scanner = WAF_FW_Scanner::instance();
global $wpdb;
$queue_tbl = WAF_FW_DB::instance()->get_scan_queue_table();
$files_tbl = WAF_FW_DB::instance()->get_scan_files_queue_table();
$latest_scan = $wpdb->get_row("SELECT * FROM $queue_tbl ORDER BY id DESC LIMIT 1", ARRAY_A);
$queue_id = $latest_scan['id'];

echo "Advancing scan ID $queue_id to completion...\n";

$iter = 0;
while (true) {
    $iter++;
    $res = $scanner->process_scan_batch($queue_id);
    $status = $res['status'] ?? 'unknown';
    $progress = $res['progress'] ?? 0;
    $stage = $res['current_stage'] ?? '';
    
    $pending_ml = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $files_tbl WHERE scan_id = %d AND status = 'pending_ml'", $queue_id));
    
    if ($iter % 5 === 0 || $status === 'completed' || $progress >= 100) {
        echo "Iteration $iter: Stage=[$stage] Progress=$progress% Status=$status (Pending ML files: $pending_ml)\n";
    }
    
    if ($status === 'completed' || $progress >= 100 || $pending_ml == 0 && $stage === 'completed') {
        break;
    }
    
    if ($iter > 150) {
        echo "Reached max loop safety limit.\n";
        break;
    }
}

echo "Scan processing finished completely!\n";
