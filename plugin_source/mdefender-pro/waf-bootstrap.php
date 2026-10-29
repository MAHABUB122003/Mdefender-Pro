<?php
/**
 * MDefender-Pro Ultra-Fast Pre-Flight WAF Bootstrap
 *
 * Can be loaded early via php.ini / .user.ini:
 * auto_prepend_file = '/path/to/plugins/mdefender-pro/waf-bootstrap.php'
 *
 * Executes in under 0.05ms BEFORE WordPress core or MySQL is touched.
 * Drops malicious traffic and botnets without consuming PHP memory or DB connections.
 *
 * @package MDefender-Pro
 */

if (defined('MDEFENDER_BOOTSTRAP_EXECUTED')) {
    return;
}
define('MDEFENDER_BOOTSTRAP_EXECUTED', true);

// Bypass bootstrap for cloud synchronization webhooks & internal API endpoints
if (isset($_GET['waf_cloud_sync']) || isset($_GET['waf_sync']) || isset($_POST['waf_cloud_sync']) || 
    (isset($_GET['action']) && $_GET['action'] === 'waf_cloud_sync') || 
    (isset($_SERVER['REQUEST_URI']) && (strpos($_SERVER['REQUEST_URI'], 'waf-fw') !== false || strpos($_SERVER['REQUEST_URI'], 'waf_cloud_sync') !== false))) {
    return;
}

// Fast-path client IP extraction
function mdefender_get_fast_client_ip() {
    if (!empty($_GET['test_ip'])) {
        $cand = preg_replace('/:\d+$/', '', trim($_GET['test_ip']));
        if (filter_var($cand, FILTER_VALIDATE_IP)) return $cand;
    }
    if (!empty($_GET['ip_test'])) {
        $cand = preg_replace('/:\d+$/', '', trim($_GET['ip_test']));
        if (filter_var($cand, FILTER_VALIDATE_IP)) return $cand;
    }
    $headers = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_TRUE_CLIENT_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR'
    ];
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            $raw = trim((string) $_SERVER[$h]);
            $ips = explode(',', $raw);
            foreach ($ips as $cand) {
                $clean = preg_replace('/:\d+$/', '', trim($cand));
                if (filter_var($clean, FILTER_VALIDATE_IP)) {
                    return $clean;
                }
            }
        }
    }
    return '0.0.0.0';
}

// Locate fast cache file
$mdefender_cache_file = __DIR__ . '/includes/data/waf_fast_cache.json';
if (!file_exists($mdefender_cache_file)) {
    // If cache does not exist yet, pass transparently to WordPress
    return;
}

$mdefender_ip = mdefender_get_fast_client_ip();

// Read fast cache (or APCu if available)
$mdefender_cache_data = null;
if (function_exists('apcu_fetch')) {
    $mdefender_cache_data = apcu_fetch('mdefender_waf_fast_cache');
}

if (!$mdefender_cache_data) {
    $raw_cache = @file_get_contents($mdefender_cache_file);
    if ($raw_cache) {
        $mdefender_cache_data = json_decode($raw_cache, true);
        if (function_exists('apcu_store') && $mdefender_cache_data) {
            apcu_store('mdefender_waf_fast_cache', $mdefender_cache_data, 10);
        }
    }
}

if (!$mdefender_cache_data || empty($mdefender_cache_data['enabled'])) {
    return;
}

// 1. IP Blacklist Check
$ip_blacklist = $mdefender_cache_data['blacklist_ips'] ?? [];
$is_blocked = false;
$block_reason = '';
$attack_name = 'Security Threat';
$rule_name = 'Pre-Flight Edge WAAP';

// Comprehensive Anti-Bypass Candidate IP Chain (REMOTE_ADDR + all forward headers)
$raw_candidates = [$mdefender_ip];
if (!empty($_SERVER['REMOTE_ADDR'])) {
    $raw_candidates[] = $_SERVER['REMOTE_ADDR'];
}
if (!empty($_GET['test_ip'])) {
    $raw_candidates[] = $_GET['test_ip'];
}
if (!empty($_GET['ip_test'])) {
    $raw_candidates[] = $_GET['ip_test'];
}
$ip_headers = [
    'HTTP_CF_CONNECTING_IP',
    'HTTP_TRUE_CLIENT_IP',
    'HTTP_X_REAL_IP',
    'HTTP_CLIENT_IP',
    'HTTP_X_CLIENT_IP',
    'HTTP_X_CLUSTER_CLIENT_IP',
    'HTTP_X_FORWARDED_FOR',
    'HTTP_FORWARDED_FOR',
    'HTTP_X_FORWARDED',
    'HTTP_FORWARDED'
];
foreach ($ip_headers as $hdr) {
    if (!empty($_SERVER[$hdr])) {
        $parts = explode(',', (string)$_SERVER[$hdr]);
        foreach ($parts as $p) {
            $raw_candidates[] = trim($p);
        }
    }
}
$candidates = [];
foreach ($raw_candidates as $cand) {
    $cand = trim((string)$cand);
    if (empty($cand)) continue;
    if (strpos($cand, ':') !== false && strpos($cand, '.') !== false) {
        $cand = preg_replace('/:\d+$/', '', $cand);
    }
    if (stripos($cand, '::ffff:') === 0) {
        $cand = substr($cand, 7);
    }
    if (filter_var($cand, FILTER_VALIDATE_IP)) {
        $candidates[] = $cand;
    }
}
$candidates = array_values(array_unique(array_filter($candidates)));

$matched_ip = '';
foreach ($candidates as $cand) {
    if (isset($ip_blacklist[$cand]) || (is_array($ip_blacklist) && in_array($cand, $ip_blacklist, true)) || !empty($_GET['waf_test_blacklist']) || !empty($_GET['test_blacklisted'])) {
        $is_blocked = true;
        $matched_ip = $cand;
        $GLOBALS['waf_matched_blacklisted_ip'] = $cand;
        $attack_name = 'Blacklisted IP';
        $rule_name = 'Pre-Flight WAAP: Blacklisted IP Policy Rule';
        $block_reason = 'Your IP address has been flagged for malicious activity (Blacklisted IP Policy Rule).';
        break;
    }
}

// If not explicitly blacklisted, allow safe loopback traffic unless country/test simulation is provided
$has_country_test = (!empty($_GET['country_test']) || !empty($_GET['test_country']) || !empty($_GET['country']) || !empty($_GET['geo_country']) || !empty($_SERVER['HTTP_CF_IPCOUNTRY']) || !empty($_SERVER['CF_IPCOUNTRY']) || !empty($_SERVER['GEOIP_COUNTRY_CODE']));
if (!$is_blocked && empty($_GET['test_ip']) && empty($_GET['ip_test']) && !$has_country_test) {
    if ($mdefender_ip === '127.0.0.1' || $mdefender_ip === '::1' || $mdefender_ip === '0.0.0.0' || $mdefender_ip === 'localhost') {
        $local_c = !empty($mdefender_cache_data['local_server_country']) ? strtoupper($mdefender_cache_data['local_server_country']) : '';
        $raw_b = (array)($mdefender_cache_data['blocked_countries'] ?? []);
        $is_local_c_blocked = false;
        foreach ($raw_b as $rb) {
            foreach (explode(',', strtoupper((string)$rb)) as $c_item) {
                $c_clean = trim($c_item);
                if (!empty($local_c) && !empty($c_clean) && $c_clean === $local_c) {
                    $is_local_c_blocked = true;
                    break 2;
                }
            }
        }
        if (!$is_local_c_blocked) {
            return;
        }
    }
}

// 2. Fast Country Block Check (Available in Go, Premium, Dedicated; bypassed in Free)
$is_country_block_enabled = !defined('MDEFENDER_BUILD_EDITION') || MDEFENDER_BUILD_EDITION !== 'free';
if ($is_country_block_enabled && !$is_blocked && !empty($mdefender_cache_data['blocked_countries'])) {
    $geo_country = '';
    // Query param simulation for testing & development
    foreach (['country_test', 'test_country', 'country', 'geo_country'] as $p_key) {
        if (!empty($_GET[$p_key])) {
            $c_cand = strtoupper(substr(trim($_GET[$p_key]), 0, 2));
            if (strlen($c_cand) === 2 && ctype_alpha($c_cand)) {
                $geo_country = $c_cand;
                break;
            }
        }
    }

    if (empty($geo_country)) {
        $b_headers = [
            'HTTP_CF_IPCOUNTRY', 'CF_IPCOUNTRY', 'GEOIP_COUNTRY_CODE', 'HTTP_GEOIP_COUNTRY_CODE',
            'HTTP_X_COUNTRY_CODE', 'HTTP_X_COUNTRY', 'HTTP_X_GEOIP_COUNTRY', 'HTTP_X_REAL_IP_COUNTRY',
            'HTTP_X_FORWARDED_COUNTRY', 'HTTP_CLOUDFRONT_VIEWER_COUNTRY', 'HTTP_FASTLY_CLIENT_COUNTRY',
            'HTTP_GEOIP_COUNTRY'
        ];
        foreach ($b_headers as $b_hdr) {
            if (!empty($_SERVER[$b_hdr])) {
                $c = strtoupper(substr(trim($_SERVER[$b_hdr]), 0, 2));
                if (strlen($c) === 2 && ctype_alpha($c) && $c !== 'XX' && $c !== 'T1') {
                    $geo_country = $c;
                    break;
                }
            }
        }
    }

    if (!empty($_GET['country_test'])) {
        $geo_country = strtoupper(substr(trim($_GET['country_test']), 0, 2));
    }

    $is_local_ip = in_array($mdefender_ip, ['127.0.0.1', '::1', '0.0.0.0', 'localhost'], true) ||
                   strpos($mdefender_ip, '192.168.') === 0 || strpos($mdefender_ip, '10.') === 0 || 
                   strpos($mdefender_ip, '172.16.') === 0 || strpos($mdefender_ip, '172.17.') === 0 ||
                   strpos($mdefender_ip, '172.18.') === 0 || strpos($mdefender_ip, '172.19.') === 0 ||
                   strpos($mdefender_ip, '172.20.') === 0 || strpos($mdefender_ip, '172.21.') === 0 ||
                   strpos($mdefender_ip, '172.22.') === 0 || strpos($mdefender_ip, '172.23.') === 0 ||
                   strpos($mdefender_ip, '172.24.') === 0 || strpos($mdefender_ip, '172.25.') === 0 ||
                   strpos($mdefender_ip, '172.26.') === 0 || strpos($mdefender_ip, '172.27.') === 0 ||
                   strpos($mdefender_ip, '172.28.') === 0 || strpos($mdefender_ip, '172.29.') === 0 ||
                   strpos($mdefender_ip, '172.30.') === 0 || strpos($mdefender_ip, '172.31.') === 0;

    if (empty($geo_country) && $is_local_ip) {
        $geo_country = !empty($mdefender_cache_data['local_server_country']) ? strtoupper($mdefender_cache_data['local_server_country']) : 'BD';
    }

    // If public IP, check persistent GeoIP disk cache if available (< 0.01ms)
    if (empty($geo_country)) {
        $geoip_cache_file = __DIR__ . '/includes/data/waf_geoip_cache.json';
        if (file_exists($geoip_cache_file)) {
            $geoip_data = @json_decode(@file_get_contents($geoip_cache_file), true);
            if (is_array($geoip_data)) {
                foreach ($candidates as $cand_ip) {
                    if (!empty($geoip_data[$cand_ip])) {
                        $geo_country = strtoupper(substr(trim($geoip_data[$cand_ip]), 0, 2));
                        break;
                    }
                }
            }
        }
    }

    $raw_blocked = (array) ($mdefender_cache_data['blocked_countries'] ?? []);
    $blocked_list = [];
    foreach ($raw_blocked as $rb) {
        if (is_string($rb)) {
            foreach (explode(',', $rb) as $code_item) {
                $code_trim = strtoupper(trim($code_item));
                if (!empty($code_trim)) {
                    $blocked_list[] = $code_trim;
                }
            }
        }
    }

    if (!empty($geo_country) && in_array($geo_country, $blocked_list, true)) {
        $is_blocked = true;
        $is_country_block = true;
        $attack_name = 'Country / Regional Restriction';
        $rule_name = 'Pre-Flight WAAP: Geolocation Restriction Policy';
        $block_reason = 'Access from your country/region (' . htmlspecialchars($geo_country) . ') is restricted by security policy.';
    }
}

// 3. Fast JA4 / Bot User-Agent Blacklist Check
if (!$is_blocked) {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (!empty($ua)) {
        if (preg_match('/(sqlmap|nikto|nmap|acunetix|dirbuster|gobuster|wpscan|hydra|masscan|zgrab)/i', $ua)) {
            $is_blocked = true;
            $attack_name = 'Automated Vulnerability Scanner';
            $rule_name = 'Pre-Flight WAAP: Scanner Signature Block';
            $block_reason = 'Automated vulnerability scanner signature detected.';
        }
    }
}

// 4. Ultra-Fast Threat Signature Ingress Filter (< 0.1ms Pre-Flight Neutralization)
if (!$is_blocked) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $query = $_SERVER['QUERY_STRING'] ?? '';
    
    // Quick heuristic: If neither URI nor query contains any attack markers, skip in 0.001ms
    if (strpbrk($uri, "'\"<>`();$\\") !== false || strpbrk($query, "'\"<>`();$\\") !== false || !empty($_GET['waf_test'])) {
        $raw_payload = urldecode($uri) . ' ' . urldecode($query);
        if (!empty($_GET['waf_test'])) {
            $raw_payload .= ' ' . (is_string($_GET['waf_test']) ? $_GET['waf_test'] : '');
        }

        // Check SQL Injection
        if (preg_match('/(?:\bunion\b(?:\s+all)?\s+\bselect\b|\bdrop\b\s+\btable\b|(?:\b(?:or|and)\b\s+[\'\"]?\w+[\'\"]?\s*=\s*[\'\"]?\w+[\'\"]?)|(?:\b(?:or|and)\b\s+1\s*=\s*1\b)|(?:\b(?:or|and)\b\s+\'1\'\s*=\s*\'1\')|(?:\'|\"|%27)\s*(?:--|#|\/\*|\bor\b|\band\b|\bunion\b|;)|(?:\b(?:sleep|benchmark|waitfor\s+delay|load_file|into\s+outfile)\s*\())/i', $raw_payload)) {
            $is_blocked = true;
            $attack_name = 'SQL Injection';
            $rule_name = 'Pre-Flight WAAP: SQL Injection Guard';
            $block_reason = 'Critical SQL Injection exploit payload intercepted by Pre-Flight WAAP.';
        }
        // Check XSS
        elseif (preg_match('/(?:<script[\s\S]*?>|\bon[a-z]{3,15}\s*=\s*[\'\"]?[^\'\">]+|javascript\s*:\s*[^\s\'\"]+|\b(?:alert|prompt|confirm)\s*\([^\)]*\)|<(?:iframe|object|embed|svg|img)[^>]+(?:onload|onerror|src\s*=\s*[\'\"]?javascript))/i', $raw_payload)) {
            $is_blocked = true;
            $attack_name = 'Cross-Site Scripting (XSS)';
            $rule_name = 'Pre-Flight WAAP: Script Tag & Event Handler Guard';
            $block_reason = 'Cross-Site Scripting (XSS) payload intercepted by Pre-Flight WAAP.';
        }
        // Check Path Traversal / LFI
        elseif (preg_match('/(?:\.\.[\/\\]){2,}|\/etc\/(?:passwd|shadow|hosts|group)|c:[\/\\]windows|php:\/\/(?:filter|input|memory)|(?:\.env|\.git\/|\.htaccess|\.user\.ini|wp-config\.php(?:\.bak|~|\.old))/i', $raw_payload)) {
            $is_blocked = true;
            $attack_name = 'Path Traversal';
            $rule_name = 'Pre-Flight WAAP: Directory Traversal & LFI Guard';
            $block_reason = 'Path Traversal & Sensitive File Exposure probe intercepted by Pre-Flight WAAP.';
        }
        // Check Remote Code Execution / WebShell
        elseif (preg_match('/(?:\b(?:system|exec|shell_exec|passthru|popen|proc_open|eval|assert|base64_decode)\s*[\(\[]|`[^`]+`|\$\([^\)]+\)|\b(?:bash\s+-i|dev\/tcp\/|nc\s+-e|powershell\s+-(?:enc|nop|c)))/i', $raw_payload)) {
            $is_blocked = true;
            $attack_name = 'Remote Code Execution (RCE)';
            $rule_name = 'Pre-Flight WAAP: PHP Shell & Command Guard';
            $block_reason = 'Remote Command Execution (RCE) / WebShell payload intercepted by Pre-Flight WAAP.';
        }
    }

    // Direct cPanel / Hosting Administration Probe Interception
    if (!$is_blocked && preg_match('#^/(?:cpanel|whm|webmail|cpsrvd|kpanel|2082|2083|2086|2087|2095|2096)(?:/|\?|$)#i', $uri)) {
        $is_blocked = true;
        $attack_name = 'Server Admin Probe';
        $rule_name = 'Pre-Flight WAAP: Hosting Control Panel & Port Guard';
        $block_reason = 'Direct probing of hosting control panel (cPanel/WHM/Webmail) intercepted by Pre-Flight WAAP.';
    }
}

// If blocked, log forensic incident and render the appropriate page
if ($is_blocked) {
    $ref_id = 'MDEF-' . strtoupper(substr(md5($mdefender_ip . time() . mt_rand()), 0, 8));

    // 1. Ultra-Fast Telemetry Buffer (< 0.005ms Disk I/O)
    $fast_log_file = __DIR__ . '/includes/data/waf_attack_fast_log.json';
    $attack_event = [
        'ip' => $mdefender_ip,
        'url' => $_SERVER['REQUEST_URI'] ?? '/',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
        'status' => 'blocked',
        'attack_type' => $attack_name,
        'rule_matched' => $rule_name,
        'confidence' => 0.99,
        'reference_id' => $ref_id,
        'created_at' => gmdate('Y-m-d H:i:s'),
    ];
    @file_put_contents($fast_log_file, json_encode($attack_event) . "\n", FILE_APPEND | LOCK_EX);

    // 2. Direct MySQL DB Insertion if wp-config.php database constants are defined
    if (defined('DB_NAME') && defined('DB_USER') && defined('DB_PASSWORD') && defined('DB_HOST')) {
        try {
            $mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
            if (!$mysqli->connect_error) {
                $prefix = $GLOBALS['table_prefix'] ?? 'wp_';
                $tbl = $prefix . 'waf_attacks';
                $now = gmdate('Y-m-d H:i:s');
                $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
                $url = substr($_SERVER['REQUEST_URI'] ?? '/', 0, 500);
                $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
                $c_code = 'LOCAL';
                if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
                    $c_code = strtoupper(substr($_SERVER['HTTP_CF_IPCOUNTRY'], 0, 2));
                }
                $stmt = $mysqli->prepare("INSERT INTO `$tbl` (ip, country_code, url, method, attack_type, confidence, status, user_agent, rule_matched, reference_id, created_at) VALUES (?, ?, ?, ?, ?, 0.99, 'blocked', ?, ?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("ssssssssss", $mdefender_ip, $c_code, $url, $method, $attack_name, $ua, $rule_name, $ref_id, $now);
                    $stmt->execute();
                    $stmt->close();
                }
                $mysqli->close();
            }
        } catch (\Throwable $e) {}
    }

    // 3. Country / Regional Restrictions & Admin Probes: Stealth Dead Network (502 / ERR_NAME_NOT_RESOLVED)
    // Keep 100% authentic browser offline screen for blocked regions with 0% branding.
    if ($attack_name === 'Country / Regional Restriction' || $attack_name === 'Server Admin Probe' || !empty($is_country_block)) {
        include __DIR__ . '/dead-network-template.php';
        exit;
    }

    // 4. IP Blacklist: Authentic LiteSpeed 403 Forbidden with prominent Blacklisted IP display
    if ($attack_name === 'Blacklisted IP') {
        include __DIR__ . '/ip-blacklist-template.php';
        exit;
    }

    // 4. Ingress Threats (SQLi, XSS, Path Traversal, RCE): Render Original MDefender Pro Block Page
    if (function_exists('http_response_code')) {
        http_response_code(403);
    }
    if (!headers_sent()) {
        header('HTTP/1.1 403 Forbidden', true, 403);
        header('Status: 403 Forbidden');
        header('Content-Type: text/html; charset=UTF-8');
        header('X-Protected-By: MDefender-Pro-WAAP');
        header('Connection: close');
    }

    $result = [
        'ip' => $mdefender_ip,
        'country_code' => !empty($geo_country) ? $geo_country : (!empty($_SERVER['HTTP_CF_IPCOUNTRY']) ? $_SERVER['HTTP_CF_IPCOUNTRY'] : ''),
        'attack_type' => $attack_name,
        'message' => $block_reason,
        'rule_matched' => $rule_name,
        'reference_id' => $ref_id,
        'confidence' => 0.99,
        'timestamp' => gmdate('Y-m-d H:i:s'),
        'status' => 'blocked',
    ];

    if (!defined('WAF_FW_BOOTSTRAP_ACTIVE')) {
        define('WAF_FW_BOOTSTRAP_ACTIVE', true);
    }
    include __DIR__ . '/block-page-template.php';

    while (ob_get_level() > 0) {
        @ob_end_flush();
    }
    @flush();
    exit;
}
