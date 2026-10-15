<?php
// Load WordPress
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "======================================================================\n";
echo "MDEfENDER PRO - FULL WORDPRESS SITE SCANNER EXECUTION\n";
echo "======================================================================\n";

if (!class_exists('WAF_FW_Scanner')) {
    die("Error: WAF_FW_Scanner class not found.\n");
}

$scanner = WAF_FW_Scanner::instance();

// 1. Create Scan Queue
$queue_id = $scanner->create_scan_queue('full');
echo "[Stage 1] Initialized Scan Queue ID: $queue_id\n";

// 2. Initialize file list
$scanner->initialize_scan_files_queue($queue_id);
global $wpdb;
$files_tbl = WAF_FW_DB::instance()->get_scan_files_queue_table();
$total_queued = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $files_tbl WHERE scan_id = %d", $queue_id));
echo "[Stage 2] Queued $total_queued files for deep multi-signal & AI/ML scanning.\n";

// 3. Process batches until scan is completed
$max_batches = 50;
$batch_count = 0;

echo "[Stage 3] Processing scan pipeline across all security matrices...\n";

while ($batch_count < $max_batches) {
    $batch_count++;
    $result = $scanner->process_scan_batch($queue_id);
    $status = $result['status'] ?? 'unknown';
    $progress = $result['progress'] ?? 0;
    $stage = $result['current_stage'] ?? '';
    
    echo "  -> Batch #$batch_count: Stage=[$stage] | Progress: $progress% | Status: $status\n";
    
    if ($status === 'completed' || $progress >= 100) {
        break;
    }
}

// 4. Fetch Full Results & Findings
$queue_tbl = WAF_FW_DB::instance()->get_scan_queue_table();
$scan_record = $wpdb->get_row($wpdb->prepare("SELECT * FROM $queue_tbl WHERE id = %d", $queue_id), ARRAY_A);
$results_data = !empty($scan_record['results']) ? json_decode($scan_record['results'], true) : [];

echo "\n======================================================================\n";
echo "SCAN RESULTS SUMMARY & DETECTIONS REPORT\n";
echo "======================================================================\n";

echo "Scan ID: " . ($scan_record['id'] ?? $queue_id) . "\n";
echo "Status:  " . ($scan_record['status'] ?? 'N/A') . "\n";
echo "Files Scanned: " . ($scan_record['total_files_scanned'] ?? 'N/A') . "\n";
echo "Issues Found:  " . ($scan_record['issues_found'] ?? 'N/A') . "\n\n";

// Print breakdown per matrix
if (isset($results_data['core_integrity'])) {
    $ci = $results_data['core_integrity'];
    echo "[+] Core Integrity: " . ($ci['status'] ?? 'OK') . " | Modified: " . count($ci['modified_files'] ?? []) . " | Missing: " . count($ci['missing_files'] ?? []) . "\n";
}

if (isset($results_data['malware_scan'])) {
    $ms = $results_data['malware_scan'];
    echo "[+] Malware / Heuristic Signature & AST Engine:\n";
    echo "    - Total Files Inspected: " . ($ms['total_scanned'] ?? 0) . "\n";
    echo "    - Total Issues Found: " . ($ms['total_issues'] ?? 0) . "\n";
    echo "    - Suspicious / Malicious Files: " . ($ms['suspicious_found'] ?? 0) . "\n";
    echo "    - Infected Core Files: " . ($ms['infected_core'] ?? 0) . "\n";
}

if (isset($results_data['ml_malware_scan'])) {
    $ml = $results_data['ml_malware_scan'];
    echo "[+] Cloud AI / ML Malware Engine:\n";
    echo "    - AI Status: " . ($ml['status'] ?? 'N/A') . "\n";
    echo "    - Total AI Inspected: " . ($ml['total_scanned'] ?? 0) . "\n";
    echo "    - AI Malicious Detections: " . ($ml['malicious_count'] ?? 0) . "\n";
    echo "    - AI Suspicious Detections: " . ($ml['suspicious_count'] ?? 0) . "\n";
}

if (isset($results_data['db_scan'])) {
    $db_res = $results_data['db_scan'];
    echo "[+] Database & User Security Audit:\n";
    echo "    - Status: " . ($db_res['status'] ?? 'clean') . " | Issues: " . ($db_res['issues_count'] ?? 0) . "\n";
}

if (isset($results_data['config_audit'])) {
    $cfg = $results_data['config_audit'];
    echo "[+] Server & Config Audit:\n";
    echo "    - Status: " . ($cfg['status'] ?? 'N/A') . " | Score: " . ($cfg['score'] ?? 'N/A') . "\n";
}

echo "\n--- EVIDENCE OF CAPTURED TEST THREATS ---\n";
$all_threat_files = [];
if (!empty($results_data['malware_scan']['suspicious_files'])) {
    foreach ($results_data['malware_scan']['suspicious_files'] as $f) {
        $all_threat_files[$f['file']] = $f;
    }
}
if (!empty($results_data['malware_scan']['infected_core_files'])) {
    foreach ($results_data['malware_scan']['infected_core_files'] as $f) {
        $all_threat_files[$f['file']] = $f;
    }
}
if (!empty($results_data['malware_scan']['secrets_found'])) {
    foreach ($results_data['malware_scan']['secrets_found'] as $f) {
        $all_threat_files[$f['file']] = $f;
    }
}
if (!empty($results_data['ml_malware_scan']['malicious_files'])) {
    foreach ($results_data['ml_malware_scan']['malicious_files'] as $f) {
        $all_threat_files[$f['file']] = $f;
    }
}
if (!empty($results_data['ml_malware_scan']['suspicious_files'])) {
    foreach ($results_data['ml_malware_scan']['suspicious_files'] as $f) {
        $all_threat_files[$f['file']] = $f;
    }
}

$planted_samples = [
    'wp-content/uploads/shell_eval_b64.php',
    'wp-content/plugins/rce_backdoor.php',
    'wp-content/uploads/china_chopper.php',
    'wp-content/uploads/obfuscated_trojan.php',
    'wp-content/uploads/var_func_call.php',
    'wp-content/uploads/seo_spam_redirect.php',
    'wp-content/uploads/crypto_miner.js',
    'wp-content/uploads/.env.backup',
    'wp-content/plugins/create_backdoor_admin.php',
    'wp-content/uploads/chr_hex_webshell.php',
    'wp-content/plugins/mdefender_test_backdoor.php'
];

$detected_count = 0;
foreach ($planted_samples as $sample) {
    $found = false;
    foreach ($all_threat_files as $path => $info) {
        if (strpos($path, basename($sample)) !== false || strpos($path, $sample) !== false) {
            $found = true;
            $detected_count++;
            $reasons = is_array($info['findings']) ? implode(' | ', $info['findings']) : json_encode($info['findings']);
            echo " [DETECTED] $sample\n";
            echo "   -> Severity: " . ($info['severity'] ?? 'critical') . " | Score: " . ($info['score'] ?? 100) . "\n";
            echo "   -> Findings: " . substr($reasons, 0, 120) . "...\n\n";
            break;
        }
    }
    if (!$found) {
        echo " [NOT IN RESULTS] $sample\n\n";
    }
}

echo "Total Planted Threats Detected: $detected_count / " . count($planted_samples) . "\n";
echo "Detection Rate: " . round(($detected_count / count($planted_samples)) * 100, 2) . "%\n";
echo "======================================================================\n";
