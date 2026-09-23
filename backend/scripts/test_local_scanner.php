<?php
require 'C:/xampp/htdocs/mahabub/wp-load.php';

// 1. Create malicious test files in uploads
$uploads_dir = ABSPATH . 'wp-content/uploads/';
if (!is_dir($uploads_dir)) {
    mkdir($uploads_dir, 0755, true);
}

$test_file1 = $uploads_dir . 'mdefender_test_backdoor.php';
file_put_contents($test_file1, "<?php\n/* Malicious Webshell Test */\neval(base64_decode('c3lzdGVtKCRfR0VUWydjbWQnXSk7'));\npassthru(\$_POST['cmd']);\n");
echo "Created test malware file 1: {$test_file1}\n";

$test_file2 = $uploads_dir . 'wso_shell.php';
file_put_contents($test_file2, "<?php\n/* WSO 2.5 Web Shell */\n\$auth_pass = '63a9f0ea7bb98050796b649e85481845';\n\$default_action = 'FilesMan';\n@eval(\$_POST['p1']);\n");
echo "Created test malware file 2: {$test_file2}\n";

// 2. Start scan
$scanner = WAF_FW_Scanner::instance();
$scan_id = $scanner->create_scan_queue('full');
echo "Created scan queue ID: {$scan_id}\n";

$total_files = $scanner->initialize_scan_files_queue($scan_id);
echo "Initialized files queue, total files: {$total_files}\n";

// 3. Process batches progressively via process_scan_cell
$max_steps = 100;
$step = 0;
$cell_index = 0;
$final_results = null;

while ($step < $max_steps) {
    $step++;
    $res = $scanner->process_scan_cell($scan_id, $cell_index);
    $cell_index = $res['cell_index'] ?? ($cell_index + 1);
    $status = $res['status'] ?? 'unknown';
    $prog = $res['progress'] ?? 0;
    $stage = $res['current_stage'] ?? '';
    $scanned = $res['scanned_files'] ?? 0;
    $total = $res['total_files'] ?? $total_files;
    $completed = $res['completed'] ?? false;

    echo "Step {$step}: stage={$stage}, progress={$prog}%, scanned={$scanned}/{$total}, completed=" . ($completed ? 'YES' : 'NO') . "\n";
    
    if ($res['results']) {
        $final_results = $res['results'];
    }

    if ($completed || in_array($status, ['completed', 'completed_with_issues', 'failed'])) {
        break;
    }
}

// 4. Inspect results
global $wpdb;
$table = WAF_FW_DB::instance()->get_scan_results_table();
$last_scan = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table ORDER BY id DESC LIMIT 1"));

echo "\n============================================\n";
echo "           SCAN EXECUTION SUMMARY           \n";
echo "============================================\n";
echo "Scan ID: " . ($last_scan->id ?? $scan_id) . "\n";
echo "Score: " . ($last_scan->score ?? 'N/A') . "/100\n";
echo "Issues Found: " . ($last_scan->issues_found ?? 0) . "\n";
echo "Duration: " . ($last_scan->duration_seconds ?? 0) . "s\n";

if ($final_results || ($last_scan && $last_scan->vulnerabilities)) {
    $vulns = $final_results ?: json_decode($last_scan->vulnerabilities, true);
    
    if (isset($vulns['malware_scan']['suspicious_files'])) {
        echo "\n>>> DETECTED MALICIOUS FILES (" . count($vulns['malware_scan']['suspicious_files']) . "):\n";
        foreach ($vulns['malware_scan']['suspicious_files'] as $f) {
            echo " [!] File: " . ($f['file'] ?? '') . "\n";
            echo "     Score: " . ($f['score'] ?? '') . " | Classification: " . ($f['classification'] ?? '') . " | Severity: " . ($f['severity'] ?? '') . "\n";
            echo "     Findings: " . implode(', ', $f['findings'] ?? []) . "\n";
        }
    }

    if (isset($vulns['vulnerability_scan']) && !empty($vulns['vulnerability_scan']['plugin_vulnerabilities'])) {
        echo "\n>>> DETECTED PLUGIN VULNERABILITIES:\n";
        foreach ($vulns['vulnerability_scan']['plugin_vulnerabilities'] as $pv) {
            echo " [!] Plugin: " . ($pv['name'] ?? $pv['plugin'] ?? '') . " - " . ($pv['description'] ?? '') . "\n";
        }
    }
}
echo "============================================\n";
