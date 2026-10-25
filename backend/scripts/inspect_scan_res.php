<?php
$pdo = new PDO('mysql:host=localhost;dbname=mahabub', 'root', '');
$stmt = $pdo->query('SELECT vulnerabilities FROM wp_waf_scan_results ORDER BY id DESC LIMIT 1');
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$data = json_decode($row['vulnerabilities'], true);
echo "KEYS: " . implode(', ', array_keys($data)) . "\n";
if (isset($data['malware_scan'])) {
    echo "malware_scan keys: " . implode(', ', array_keys($data['malware_scan'])) . "\n";
    if (isset($data['malware_scan']['wp_checksums'])) {
        echo "wp_checksums keys: " . implode(', ', array_keys($data['malware_scan']['wp_checksums'])) . "\n";
        echo "modified_files count: " . count($data['malware_scan']['wp_checksums']['modified_files'] ?? []) . "\n";
    }
    if (isset($data['malware_scan']['suspicious_files'])) {
        echo "suspicious_files count: " . count($data['malware_scan']['suspicious_files']) . "\n";
    }
}
if (isset($data['wordpress_checks'])) {
    echo "wordpress_checks keys: " . implode(', ', array_keys($data['wordpress_checks'])) . "\n";
    foreach ($data['wordpress_checks'] as $k => $v) {
        if ($k !== 'wp_checksums') {
            echo "  $k: " . json_encode($v) . "\n";
        }
    }
}
if (isset($data['known_files_check'])) {
    echo "known_files_check: " . json_encode($data['known_files_check']) . "\n";
}
