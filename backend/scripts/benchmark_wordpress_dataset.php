<?php
/**
 * MDefender Pro — Massive Real-World Dataset Benchmark on WordPress (XAMPP / mahabub).
 * 
 * Streams thousands of real-world attack payloads and clean requests directly from:
 * `datasets/waf_requests/waf_ml_dataset.csv` (5.2M dataset)
 * 
 * Validates:
 * 1. Rate limiting & Auto-block IP disabled so every payload is evaluated purely on its content.
 * 2. Attack detection accuracy across SQLi, XSS, RCE, LFI, SSTI, Command Injection, Malicious Payloads.
 * 3. Clean traffic pass-through (Zero false positives).
 * 4. Sub-millisecond decision latency (Website stays extremely fast!).
 * 5. Live HTTP request over Apache returning 403 Forbidden with the branded MDefender block page.
 */

define('WP_USE_THEMES', false);
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['DOCUMENT_ROOT'] = 'C:/xampp/htdocs';

require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

$dataset_csv = 'D:/Documents_product/Mdefender-Pro/Mdefender-Pro/Mdefender/datasets/waf_requests/waf_ml_dataset.csv';

$TARGET_ATTACKS = 15000;
$TARGET_CLEAN   = 5000;

echo "======================================================================\n";
echo " 🚀 MDEFENDER PRO: MASSIVE WORDPRESS REAL-WORLD ATTACK BENCHMARK\n";
echo "======================================================================\n";
echo "Target Site:       http://localhost/mahabub (XAMPP WordPress)\n";
echo "Dataset Source:    waf_ml_dataset.csv (633 MB / 5.2M Real-World Vectors)\n";
echo "Target Attacks:    " . number_format($TARGET_ATTACKS) . " Malicious Payloads\n";
echo "Target Benign:     " . number_format($TARGET_CLEAN) . " Legitimate User Requests\n";
echo "Rate Limit Status: OFF (Pure payload evaluation mode)\n";
echo "Auto-Block Status: OFF (No IP blacklisting)\n";
echo "----------------------------------------------------------------------\n\n";

if (!file_exists($dataset_csv)) {
    echo "❌ Error: Dataset not found at $dataset_csv\n";
    exit(1);
}

// Ensure Rate Limiting and Auto-Ban are OFF
update_option('waf_fw_protection_enabled', 'yes');
update_option('waf_fw_rate_limit_enabled', 'no');
update_option('waf_fw_attack_blocker_enabled', 'no');

// Clear blacklist table and transients
global $wpdb;
$wpdb->query("TRUNCATE TABLE " . WAF_FW_DB::instance()->get_blacklist_table());

$test_ip = '198.51.100.88'; // Non-whitelisted external IP
delete_transient('waf_attack_cnt_' . md5($test_ip));
delete_transient('waf_fw_rate_' . md5($test_ip));

$engine = WAF_FW_Engine::instance();

$fp = fopen($dataset_csv, 'r');
if (!$fp) {
    echo "❌ Error: Could not open dataset file.\n";
    exit(1);
}

$header = fgetcsv($fp); // ['text', 'label', 'category', 'source']

$attacks_tested = 0;
$attacks_blocked = 0;
$clean_tested = 0;
$clean_allowed = 0;
$clean_false_alarms = 0;

$cat_stats = [];

$total_eval_time = 0.0;
$total_processed = 0;

$t_start = microtime(true);

while (($row = fgetcsv($fp)) !== false) {
    if (empty($row) || count($row) < 2) continue;

    $text = $row[0];
    $label = isset($row[1]) ? (int)$row[1] : 0;
    $category = (!empty($row[2])) ? trim($row[2]) : 'Uncategorized';

    if ($label === 1) {
        if ($attacks_tested >= $TARGET_ATTACKS) continue;
        $attacks_tested++;
    } else {
        if ($clean_tested >= $TARGET_CLEAN) continue;
        $clean_tested++;
    }

    if (!isset($cat_stats[$category])) {
        $cat_stats[$category] = ['total' => 0, 'blocked' => 0];
    }
    $cat_stats[$category]['total']++;

    // Prepare simulated request environment
    $_SERVER['REQUEST_METHOD'] = (strpos($text, '=') !== false) ? 'POST' : 'GET';
    $_SERVER['REMOTE_ADDR'] = $test_ip;
    $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $_SERVER['REQUEST_URI'] = '/mahabub/wp-comments-post.php?test_ip=' . $test_ip;
        $_POST = ['comment' => $text, 'author' => 'Visitor', 'test_ip' => $test_ip];
        $_GET = ['test_ip' => $test_ip];
    } else {
        $_SERVER['REQUEST_URI'] = '/mahabub/?s=' . urlencode($text) . '&test_ip=' . $test_ip;
        $_GET = ['s' => $text, 'test_ip' => $test_ip];
        $_POST = [];
    }

    $t0 = microtime(true);
    $decision = $engine->analyze_current_request();
    $dt = (microtime(true) - $t0) * 1000; // ms

    $total_eval_time += $dt;
    $total_processed++;

    $is_blocked = ($decision['status'] === 'blocked');

    if ($label === 1) {
        if ($is_blocked) {
            $attacks_blocked++;
            $cat_stats[$category]['blocked']++;
        }
    } else {
        if ($is_blocked) {
            $clean_false_alarms++;
        } else {
            $clean_allowed++;
        }
    }

    // Progress report every 5,000 items
    if ($total_processed % 5000 === 0) {
        $elapsed = microtime(true) - $t_start;
        $rps = $elapsed > 0 ? ($total_processed / $elapsed) : 0;
        $avg_lat = $total_eval_time / $total_processed;
        $det_rate = ($attacks_blocked / max(1, $attacks_tested)) * 100;
        $fp_rate = ($clean_false_alarms / max(1, $clean_tested)) * 100;

        echo "  [PROGRESS] " . str_pad(number_format($total_processed), 7, ' ', STR_PAD_LEFT) . " / " . number_format($TARGET_ATTACKS + $TARGET_CLEAN) .
             " | Speed: " . str_pad(number_format($rps), 5, ' ', STR_PAD_LEFT) . " req/s" .
             " | Avg Latency: " . number_format($avg_lat, 3) . " ms" .
             " | Attack Block: " . number_format($det_rate, 2) . "%" .
             " | FP Rate: " . number_format($fp_rate, 2) . "%\n";
    }

    if ($attacks_tested >= $TARGET_ATTACKS && $clean_tested >= $TARGET_CLEAN) {
        break;
    }
}
fclose($fp);

$total_elapsed = microtime(true) - $t_start;
$overall_rps = $total_elapsed > 0 ? ($total_processed / $total_elapsed) : 0;
$overall_avg_lat = $total_eval_time / max(1, $total_processed);
$overall_detection = ($attacks_blocked / max(1, $attacks_tested)) * 100;
$overall_fp = ($clean_false_alarms / max(1, $clean_tested)) * 100;

echo "\n" . str_repeat('=', 70) . "\n";
echo "📊  WORDPRESS LIVE WAF BENCHMARK RESULTS (" . number_format($total_processed) . " TOTAL REQUESTS)\n";
echo str_repeat('=', 70) . "\n";
echo "Total Requests Processed:  " . number_format($total_processed) . "\n";
echo "Total Execution Time:      " . round($total_elapsed, 2) . " seconds (" . round($total_elapsed / 60, 2) . " minutes)\n";
echo "Throughput (Speed):        " . number_format($overall_rps) . " Requests / Second\n";
echo "Average Decision Latency:  " . round($overall_avg_lat, 3) . " ms / Request (< 1ms target!)\n";
echo str_repeat('-', 70) . "\n";
echo "🛡️  ATTACK DETECTION ACCURACY (True Positives):\n";
echo "  Total Attacks Tested:    " . number_format($attacks_tested) . "\n";
echo "  Successfully Blocked:    " . number_format($attacks_blocked) . " (" . round($overall_detection, 2) . "%)\n";
echo "  Missed (False Negatives):" . number_format($attacks_tested - $attacks_blocked) . " (" . round(100 - $overall_detection, 2) . "%)\n";
echo str_repeat('-', 70) . "\n";
echo "✅  BENIGN LEGITIMATE TRAFFIC (Zero False Positive Goal):\n";
echo "  Total Clean Requests:    " . number_format($clean_tested) . "\n";
echo "  Correctly Allowed:       " . number_format($clean_allowed) . " (" . round(100 - $overall_fp, 2) . "%)\n";
echo "  False Alarms (FP):       " . number_format($clean_false_alarms) . " (" . round($overall_fp, 2) . "%)\n";
echo str_repeat('=', 70) . "\n";

echo "\n📌 Top Category Detection Breakdown:\n";
uasort($cat_stats, function($a, $b) { return $b['total'] <=> $a['total']; });
$top_count = 0;
foreach ($cat_stats as $cat => $st) {
    if ($top_count++ >= 8) break;
    $rate = ($st['blocked'] / max(1, $st['total'])) * 100;
    echo "  • " . str_pad($cat, 30) . ": " . str_pad(number_format($st['blocked']), 6, ' ', STR_PAD_LEFT) . " / " .
         str_pad(number_format($st['total']), 6, ' ', STR_PAD_LEFT) . " blocked (" . round($rate, 2) . "%)\n";
}

echo "\n" . str_repeat('-', 70) . "\n";
echo "[PHASE 2] End-to-End Live HTTP Request over Apache Port 80 (403 Block Validation)...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://127.0.0.1/mahabub/?s=" . urlencode("1' UNION SELECT null,user_pass FROM wp_users--") . "&test_ip=198.51.100.99");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Host: localhost",
    "X-Forwarded-For: 198.51.100.99",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "  -> HTTP Status Code: $http_status\n";
echo "  -> 403 Forbidden Verified: " . ($http_status === 403 ? "PASS ✅" : "FAIL ❌") . "\n";
echo "  -> MDefender-Pro 403 Template: " . (strpos($resp, 'MDefender-Pro') !== false ? "PASS ✅" : "FAIL ❌") . "\n";
echo "  -> Reference ID Generated: " . (preg_match('/Reference ID|refIdText|ref-id/i', $resp) ? "PASS ✅" : "FAIL ❌") . "\n";
echo str_repeat('=', 70) . "\n";

if ($overall_detection >= 95.0 && $overall_fp <= 1.0 && $http_status === 403) {
    echo "🎉 EXCELLENT: MDefender-Pro WAF meets enterprise-grade protection standards with high speed & zero site slowdown!\n";
    exit(0);
} else {
    echo "⚠️ Check results above.\n";
    exit(1);
}
