<?php
require 'C:/xampp/htdocs/mahabub/wp-load.php';
global $wpdb;
$q = $wpdb->get_row('SELECT * FROM ' . WAF_FW_DB::instance()->get_scan_queue_table() . ' ORDER BY id DESC LIMIT 1');
echo "Scan row: ID={$q->id}, status={$q->status}, stage={$q->current_stage}, progress={$q->progress}%, scanned={$q->scanned_files}/{$q->total_files}\n";

$pending = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . WAF_FW_DB::instance()->get_scan_files_queue_table() . " WHERE scan_id = %d AND status = 'pending'", $q->id));
$completed = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . WAF_FW_DB::instance()->get_scan_files_queue_table() . " WHERE scan_id = %d AND status = 'completed'", $q->id));
$pending_ml = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . WAF_FW_DB::instance()->get_scan_files_queue_table() . " WHERE scan_id = %d AND status = 'pending_ml'", $q->id));
$completed_ml = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . WAF_FW_DB::instance()->get_scan_files_queue_table() . " WHERE scan_id = %d AND status = 'completed_ml'", $q->id));

echo "Files status: pending={$pending}, completed={$completed}, pending_ml={$pending_ml}, completed_ml={$completed_ml}\n";
