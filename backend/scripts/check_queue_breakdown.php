<?php
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

global $wpdb;
$files_tbl = WAF_FW_DB::instance()->get_scan_files_queue_table();
$counts = $wpdb->get_results("SELECT status, count(*) as cnt FROM $files_tbl WHERE scan_id = 50 GROUP BY status", ARRAY_A);

echo "Queue items status breakdown for scan 50:\n";
foreach ($counts as $c) {
    echo "  - " . $c['status'] . ": " . $c['cnt'] . "\n";
}

$sample_pending = $wpdb->get_results("SELECT id, file_path, status FROM $files_tbl WHERE scan_id = 50 AND status = 'pending_ml' LIMIT 10", ARRAY_A);
if ($sample_pending) {
    echo "\nSample pending_ml files:\n";
    foreach ($sample_pending as $p) {
        echo "  - ID {$p['id']}: {$p['file_path']}\n";
    }
}
