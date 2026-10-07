<?php
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

global $wpdb;
$queue_tbl = WAF_FW_DB::instance()->get_scan_queue_table();
$latest_scan = $wpdb->get_row("SELECT * FROM $queue_tbl ORDER BY id DESC LIMIT 1", ARRAY_A);

echo "=== LATEST SCAN STATUS IN DATABASE ===\n";
echo "Scan ID: " . $latest_scan['id'] . "\n";
echo "Type: " . $latest_scan['scan_type'] . "\n";
echo "Status: " . $latest_scan['status'] . "\n";
echo "Progress: " . $latest_scan['progress'] . "%\n";
echo "Current Stage: " . $latest_scan['current_stage'] . "\n";
echo "Total Files Scanned: " . $latest_scan['total_files_scanned'] . "\n";
echo "Issues Found: " . $latest_scan['issues_found'] . "\n";

$results = json_decode($latest_scan['results'], true) ?: [];

echo "\n--- MALWARE / HEURISTIC FINDINGS (" . count($results['malware_signatures']['malicious_files'] ?? []) . " Malicious, " . count($results['malware_signatures']['suspicious_files'] ?? []) . " Suspicious) ---\n";
if (!empty($results['malware_signatures']['malicious_files'])) {
    foreach ($results['malware_signatures']['malicious_files'] as $mf) {
        echo " [CRITICAL] " . $mf['file'] . " (Score: " . $mf['score'] . ")\n";
        echo "   Reasons: " . implode(' | ', $mf['findings']) . "\n";
    }
}
if (!empty($results['malware_signatures']['suspicious_files'])) {
    foreach ($results['malware_signatures']['suspicious_files'] as $sf) {
        echo " [WARNING]  " . $sf['file'] . " (Score: " . $sf['score'] . ")\n";
        echo "   Reasons: " . implode(' | ', $sf['findings']) . "\n";
    }
}

echo "\n--- CLOUD AI/ML MALWARE FINDINGS ---\n";
if (!empty($results['ml_malware_scan']['malicious_files'])) {
    foreach ($results['ml_malware_scan']['malicious_files'] as $mf) {
        echo " [AI-MALICIOUS] " . $mf['file'] . " (Score: " . $mf['score'] . ")\n";
        echo "   Reasons: " . implode(' | ', $mf['findings']) . "\n";
    }
}
if (!empty($results['ml_malware_scan']['suspicious_files'])) {
    foreach ($results['ml_malware_scan']['suspicious_files'] as $sf) {
        echo " [AI-SUSPICIOUS] " . $sf['file'] . " (Score: " . $sf['score'] . ")\n";
        echo "   Reasons: " . implode(' | ', $sf['findings']) . "\n";
    }
}

echo "\n--- CORE INTEGRITY ---\n";
if (!empty($results['core_integrity']['modified_files'])) {
    echo "Modified core files: " . implode(', ', $results['core_integrity']['modified_files']) . "\n";
} else {
    echo "WordPress core files intact.\n";
}

echo "\n--- DATABASE SCAN ---\n";
echo "DB Status: " . ($results['db_scan']['status'] ?? 'clean') . " | Issues: " . ($results['db_scan']['issues_count'] ?? 0) . "\n";

echo "\n--- SERVER & HEADERS AUDIT ---\n";
if (!empty($results['config_audit']['issues'])) {
    foreach ($results['config_audit']['issues'] as $ci) {
        echo " [CONFIG-ISSUE] " . $ci['title'] . ": " . $ci['description'] . "\n";
    }
}
