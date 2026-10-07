<?php
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

global $wpdb;
$queue_tbl = WAF_FW_DB::instance()->get_scan_queue_table();
$scan = $wpdb->get_row("SELECT * FROM $queue_tbl ORDER BY id DESC LIMIT 1", ARRAY_A);
$res = json_decode($scan['results'], true) ?: [];

echo "======================================================================\n";
echo "DETAILED SCAN FINDINGS AUDIT (Scan ID {$scan['id']})\n";
echo "======================================================================\n";

$all_findings = [];

// 1. Static/Heuristic/Signature findings
if (!empty($res['malware_signatures']['malicious_files'])) {
    foreach ($res['malware_signatures']['malicious_files'] as $f) {
        $all_findings[$f['file']] = [
            'type' => 'Signature/Heuristic (Malicious)',
            'score' => $f['score'] ?? 100,
            'severity' => $f['severity'] ?? 'critical',
            'findings' => $f['findings'] ?? []
        ];
    }
}
if (!empty($res['malware_signatures']['suspicious_files'])) {
    foreach ($res['malware_signatures']['suspicious_files'] as $f) {
        $all_findings[$f['file']] = [
            'type' => 'Signature/Heuristic (Suspicious)',
            'score' => $f['score'] ?? 60,
            'severity' => $f['severity'] ?? 'warning',
            'findings' => $f['findings'] ?? []
        ];
    }
}

// 2. Static Secrets/Config findings
if (!empty($res['malware_signatures']['secrets_found'])) {
    foreach ($res['malware_signatures']['secrets_found'] as $f) {
        $all_findings[$f['file']] = [
            'type' => 'Secret / Sensitive Config Exposure',
            'score' => $f['score'] ?? 80,
            'severity' => 'critical',
            'findings' => $f['findings'] ?? []
        ];
    }
}

// 3. AI / ML Cloud Findings
if (!empty($res['ml_malware_scan']['malicious_files'])) {
    foreach ($res['ml_malware_scan']['malicious_files'] as $f) {
        $all_findings[$f['file']] = [
            'type' => 'AI/ML Cloud Detector (Malicious)',
            'score' => $f['score'] ?? 100,
            'severity' => $f['severity'] ?? 'critical',
            'findings' => $f['findings'] ?? []
        ];
    }
}
if (!empty($res['ml_malware_scan']['suspicious_files'])) {
    foreach ($res['ml_malware_scan']['suspicious_files'] as $f) {
        $all_findings[$f['file']] = [
            'type' => 'AI/ML Cloud Detector (Suspicious)',
            'score' => $f['score'] ?? 70,
            'severity' => $f['severity'] ?? 'warning',
            'findings' => $f['findings'] ?? []
        ];
    }
}

echo "Total Detected Threats in Scan: " . count($all_findings) . "\n\n";

$test_threats = [
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

foreach ($test_threats as $sample) {
    $found = false;
    foreach ($all_findings as $path => $item) {
        if (strpos($path, basename($sample)) !== false || strpos($path, $sample) !== false) {
            $found = true;
            echo " [MATCHED] " . $sample . "\n";
            echo "   -> Detection Engine: " . $item['type'] . "\n";
            echo "   -> Severity: " . strtoupper($item['severity']) . " (Risk Score: " . $item['score'] . ")\n";
            echo "   -> Evidence/Reasons: " . implode(' | ', (array)$item['findings']) . "\n\n";
            break;
        }
    }
    if (!$found) {
        // Let's test this file directly against ML and Static detector to verify why or scan it immediately
        $full = ABSPATH . $sample;
        if (file_exists($full)) {
            $content = file_get_contents($full);
            $ml_res = WAF_FW_ML_Api_Client::instance()->scan_file(basename($sample), $content);
            echo " [DIRECT ML SCAN] " . $sample . "\n";
            echo "   -> ML Verdict: " . ($ml_res['verdict'] ?? 'N/A') . " (Risk Score: " . ($ml_res['risk_score'] ?? 0) . ")\n";
            echo "   -> Reasons: " . implode(' | ', (array)($ml_res['reasons'] ?? [])) . "\n\n";
        }
    }
}
