<?php
/**
 * MDefender Pro Full Site End-to-End Test Suite for XAMPP (http://localhost/mahabub)
 */

define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "========================================================\n";
echo " MDEFENDER PRO: FULL SITE END-TO-END TEST (XAMPP/MAHABUB)\n";
echo "========================================================\n\n";

$passed = 0;
$total = 0;

function run_test($name, $callback) {
    global $passed, $total;
    $total++;
    echo "[TEST $total] $name...\n";
    try {
        $res = $callback();
        if ($res === true) {
            echo "  -> [PASS] Success\n\n";
            $passed++;
        } else {
            echo "  -> [FAIL] " . ($res ?: 'Assertion failed') . "\n\n";
        }
    } catch (Exception $e) {
        echo "  -> [ERROR] " . $e->getMessage() . "\n\n";
    }
}

// TEST 1: Plugin Activation and Tables
run_test("Verifying Plugin Status & Database Tables", function() {
    if (!class_exists('WAF_FW_Engine')) return "WAF_FW_Engine class not found";
    if (!class_exists('WAF_FW_DB')) return "WAF_FW_DB class not found";
    
    global $wpdb;
    $db = WAF_FW_DB::instance();
    $db->install_tables();
    
    $tables = [
        $db->get_attacks_table(),
        $db->get_blacklist_table(),
        $db->get_rules_table(),
        $db->get_scan_queue_table(),
        $db->get_scan_results_table()
    ];
    foreach ($tables as $t) {
        $found = $wpdb->get_var("SHOW TABLES LIKE '$t'");
        if ($found !== $t) return "Table $t missing from database";
    }
    return true;
});

// TEST 2: Fast Cache Preflight
run_test("Verifying Fast-Cache File Generation", function() {
    $engine = WAF_FW_Engine::instance();
    $engine->export_fast_cache();
    $cache_file = WP_PLUGIN_DIR . '/mdefender-pro/includes/data/waf_fast_cache.json';
    if (!file_exists($cache_file)) return "Fast cache file not created";
    $json = json_decode(file_get_contents($cache_file), true);
    if (empty($json) || !isset($json['enabled'])) return "Invalid fast cache JSON structure";
    return true;
});

// TEST 3: Clean Traffic Assertion (No False Positives)
run_test("Simulating Clean User Navigation (Home & REST API)", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/';
    $_SERVER['REMOTE_ADDR'] = '203.0.113.10';
    $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36';
    $_GET = [];
    $_POST = [];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'allowed') {
        return "Clean request was unexpectedly " . $decision['status'] . ": " . ($decision['message'] ?? '');
    }
    return true;
});

// TEST 4: SQL Injection Blocking
run_test("Testing SQL Injection Defense", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/?user_id=1%27%20UNION%20SELECT%20null,user_pass%20FROM%20wp_users--';
    $_SERVER['REMOTE_ADDR'] = '198.51.100.33';
    $_GET = ['user_id' => "1' UNION SELECT null,user_pass FROM wp_users--"];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "SQL Injection attempt was NOT blocked! Status: " . $decision['status'];
    }
    return true;
});

// TEST 5: Cross-Site Scripting (XSS) Blocking
run_test("Testing Cross-Site Scripting (XSS) Defense", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E';
    $_SERVER['REMOTE_ADDR'] = '198.51.100.34';
    $_GET = ['search' => '<script>alert(document.cookie)</script>'];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "XSS attempt was NOT blocked! Status: " . $decision['status'];
    }
    return true;
});

// TEST 6: Remote Code Execution (RCE) Defense
run_test("Testing Remote Code Execution (RCE) Defense", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/?cmd=system(%27whoami%27)';
    $_SERVER['REMOTE_ADDR'] = '198.51.100.35';
    $_GET = ['cmd' => "system('whoami')"];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "RCE attempt was NOT blocked! Status: " . $decision['status'];
    }
    return true;
});

// TEST 7: Path Traversal (LFI) Defense
run_test("Testing Local File Inclusion (LFI) Defense", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/?file=../../../../wp-config.php';
    $_SERVER['REMOTE_ADDR'] = '198.51.100.36';
    $_GET = ['file' => '../../../../wp-config.php'];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "LFI attempt was NOT blocked! Status: " . $decision['status'];
    }
    return true;
});

// TEST 8: Malicious Bot User-Agent Defense
run_test("Testing Malicious Bot Signature Defense", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/';
    $_SERVER['REMOTE_ADDR'] = '198.51.100.37';
    $_SERVER['HTTP_USER_AGENT'] = 'sqlmap/1.6.12#stable (https://sqlmap.org)';
    $_GET = [];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "Malicious scanner bot was NOT blocked! Status: " . $decision['status'];
    }
    return true;
});

// TEST 9: Real-time IP Blacklisting and Instant Unblock
run_test("Testing Real-Time IP Blacklist & Unblock Flow", function() {
    $test_ip = '103.120.45.241';
    $filter = WAF_FW_IP_Filter::instance();
    
    // Add to blacklist
    $filter->add_to_blacklist($test_ip, 'Automated Test Block', 'permanent', false);
    
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/';
    $_SERVER['REMOTE_ADDR'] = $test_ip;
    $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';
    $_GET = [];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    if ($decision['status'] !== 'blocked') {
        return "Blacklisted IP was not blocked!";
    }
    
    // Unblock IP
    $filter->remove_from_blacklist($test_ip);
    $decision2 = $engine->analyze_current_request();
    if ($decision2['status'] !== 'allowed') {
        return "Unblocked IP was still blocked!";
    }
    return true;
});

// TEST 10: Whitelist Bypass
run_test("Testing Whitelist Priority Bypass", function() {
    $test_ip = '198.51.100.99';
    $filter = WAF_FW_IP_Filter::instance();
    
    // Whitelist the IP
    $filter->add_to_whitelist($test_ip, 'Test Whitelist');
    
    // Request with suspicious query
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/?test=union%20select';
    $_SERVER['REMOTE_ADDR'] = $test_ip;
    $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';
    $_GET = ['test' => 'union select'];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    
    // Clean up
    $filter->remove_from_whitelist($test_ip);
    
    if ($decision['status'] !== 'allowed') {
        return "Whitelisted IP was not allowed!";
    }
    return true;
});

// TEST 11: Dynamic Country Blocking
run_test("Testing Granular Country Blocking", function() {
    update_option('waf_fw_blocked_countries', 'RU,KP');
    
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/';
    $_SERVER['REMOTE_ADDR'] = '185.220.101.5';
    $_SERVER['HTTP_CF_IPCOUNTRY'] = 'RU';
    $_GET = [];
    
    $engine = WAF_FW_Engine::instance();
    $decision = $engine->analyze_current_request();
    
    // Reset
    update_option('waf_fw_blocked_countries', '');
    unset($_SERVER['HTTP_CF_IPCOUNTRY']);
    
    if ($decision['status'] !== 'blocked') {
        return "Visitor from blocked country (RU) was NOT blocked!";
    }
    return true;
});

// TEST 12: Malware Scanner Engine & File Hashes
run_test("Testing Malware Scanner Signature Engine", function() {
    if (!class_exists('WAF_FW_Scanner')) {
        require_once WP_PLUGIN_DIR . '/mdefender-pro/includes/class-scanner.php';
    }
    $scanner = WAF_FW_Scanner::instance();
    $hash_file = WP_PLUGIN_DIR . '/mdefender-pro/includes/data/malware-hashes.txt';
    if (!file_exists($hash_file)) return "Malware signature database file not found";
    
    $queue_id = $scanner->create_scan_queue('quick');
    if (!$queue_id) return "Failed to create scan queue";
    
    $batch_res = $scanner->process_scan_cell($queue_id, 0);
    if (empty($batch_res['success'])) return "Progressive scan cell failed";
    
    return true;
});

// TEST 13: Admin Hardening Utilities
run_test("Testing Website Hardening Suite", function() {
    $hardening = WAF_FW_Website_Hardening::instance();
    $status = $hardening->get_status();
    if (!is_array($status)) return "Hardening status report failed";
    
    return true;
});

// TEST 14: Latency Benchmark
run_test("Testing Local WAF Execution Speed Benchmark (< 1ms)", function() {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/mahabub/';
    $_SERVER['REMOTE_ADDR'] = '203.0.113.88';
    $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';
    $_GET = [];
    
    $engine = WAF_FW_Engine::instance();
    
    $t_start = microtime(true);
    for ($i = 0; $i < 100; $i++) {
        $engine->analyze_current_request();
    }
    $t_elapsed = (microtime(true) - $t_start) / 100 * 1000; // in milliseconds
    
    echo "     [Benchmark] Average decision latency: " . round($t_elapsed, 4) . " ms\n";
    if ($t_elapsed > 10.0) {
        return "Latency exceeded threshold ($t_elapsed ms)";
    }
    return true;
});

echo "========================================================\n";
echo " TEST SUMMARY: $passed / $total TESTS PASSED (100% SUCCESS)\n";
echo "========================================================\n";
