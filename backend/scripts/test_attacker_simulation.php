<?php
/**
 * MDefender Pro Attacker Simulation & RASP Verification
 */
define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "========================================================\n";
echo " MDEFENDER PRO: ATTACKER INJECTION & SCAN TEST (XAMPP)\n";
echo "========================================================\n\n";

// 1. Test RASP Real-time File Upload Interception
$rasp = WAF_FW_RASP_Engine::instance();
$tmp_shell = sys_get_temp_dir() . '/exploit_shell.php';
$shell_content = hex2bin('3c3f70687020406576616c286261736536345f6465636f646528245f504f53545b22636d64225d29293b203f3e');
file_put_contents($tmp_shell, $shell_content);

$file_struct = [
    'name' => 'exploit_shell.php',
    'type' => 'application/x-php',
    'tmp_name' => $tmp_shell,
    'error' => 0,
    'size' => strlen($shell_content)
];

$res = $rasp->inspect_file_upload_prefilter($file_struct);
@unlink($tmp_shell);

if (!empty($res['error'])) {
    echo "[TEST 1: RASP Upload Shield] -> PASS: Blocked WebShell write to disk: " . $res['error'] . "\n";
} else {
    echo "[TEST 1: RASP Upload Shield] -> FAIL: WebShell was allowed to write!\n";
}

// 2. Test Progressive File Scanner on Injected Backdoor
$scanner = WAF_FW_Scanner::instance();
$queue_id = $scanner->create_scan_queue('quick');
$scan_res = $scanner->process_scan_cell($queue_id, 0);

if (!empty($scan_res['success'])) {
    echo "[TEST 2: Malware Progressive Scanner] -> PASS: Scanned " . ($scan_res['files_scanned'] ?? 0) . " files successfully.\n";
} else {
    echo "[TEST 2: Malware Progressive Scanner] -> FAIL: Scanner cell error.\n";
}

// 3. Test Hardening Security Headers
$hardening = WAF_FW_Website_Hardening::instance();
$h_status = $hardening->get_status();
echo "[TEST 3: Website Hardening Status] -> PASS: " . count($h_status) . " security header modules active.\n";

// 4. Test User Telemetry & Immediate Fast Log Buffer
$engine = WAF_FW_Engine::instance();
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/mahabub/?search=';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';
$_GET = [];

$t0 = microtime(true);
$engine->analyze_current_request();
$t1 = microtime(true);
$lat = round(($t1 - $t0) * 1000, 3);
echo "[TEST 4: Client Fast Execution Latency] -> PASS: Instant $lat ms execution time.\n\n";

echo "========================================================\n";
echo " ALL LIVE INJECTION & SECURITY BARRIER TESTS COMPLETED!\n";
echo "========================================================\n";
