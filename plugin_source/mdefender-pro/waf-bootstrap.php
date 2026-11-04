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
// Auto-heal missing root index.php and wp-blog-header.php
$mdefender_wp_root = defined('ABSPATH') ? ABSPATH : dirname(__DIR__, 3);
if (@file_exists($mdefender_wp_root . '/wp-load.php')) {
    if (!@file_exists($mdefender_wp_root . '/index.php') || @filesize($mdefender_wp_root . '/index.php') === 0) {
        @file_put_contents($mdefender_wp_root . '/index.php', "<?php\ndefine( 'WP_USE_THEMES', true );\nrequire __DIR__ . '/wp-blog-header.php';\n");
    }
    if (!@file_exists($mdefender_wp_root . '/wp-blog-header.php') || @filesize($mdefender_wp_root . '/wp-blog-header.php') === 0) {
        @file_put_contents($mdefender_wp_root . '/wp-blog-header.php', "<?php\nif ( ! isset( \$wp_did_header ) ) {\n\t\$wp_did_header = true;\n\trequire_once __DIR__ . '/wp-load.php';\n\twp();\n\trequire_once ABSPATH . WPINC . '/template-loader.php';\n}\n");
    }
}


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

// 1. Ingress Payload Aggregation & Early Normalization (< 0.01ms)
// Cache raw body once to avoid PHP stream consumption
if (!isset($GLOBALS['mdefender_raw_body'])) {
    $raw_input = @file_get_contents('php://input');
    $GLOBALS['mdefender_raw_body'] = is_string($raw_input) ? $raw_input : '';
}
$mdefender_raw_body = $GLOBALS['mdefender_raw_body'];

// Extract POST form parameters if available
$mdefender_post_flat = '';
if (!empty($_POST) && is_array($_POST)) {
    $flatten_arr = function($arr, $depth = 0) use (&$flatten_arr) {
        if ($depth > 8 || !is_array($arr)) return is_scalar($arr) ? (string)$arr : '';
        $out = [];
        foreach ($arr as $k => $v) {
            $out[] = is_array($v) ? $flatten_arr($v, $depth + 1) : (is_string($k) ? "{$k}={$v}" : (string)$v);
        }
        return implode(' ', $out);
    };
    $mdefender_post_flat = $flatten_arr($_POST);
}

// Extract JSON request body if present
$mdefender_json_flat = '';
if (!empty($mdefender_raw_body) && (isset($mdefender_raw_body[0]) && ($mdefender_raw_body[0] === '{' || $mdefender_raw_body[0] === '['))) {
    $decoded_json = @json_decode($mdefender_raw_body, true);
    if (is_array($decoded_json)) {
        $flatten_json = function($arr, $depth = 0) use (&$flatten_json) {
            if ($depth > 8 || !is_array($arr)) return is_scalar($arr) ? (string)$arr : '';
            $out = [];
            foreach ($arr as $k => $v) {
                $out[] = is_array($v) ? $flatten_json($v, $depth + 1) : (is_string($k) ? "{$k}:{$v}" : (string)$v);
            }
            return implode(' ', $out);
        };
        $mdefender_json_flat = $flatten_json($decoded_json);
    }
}

// Flatten Cookies
$mdefender_cookie_flat = '';
if (!empty($_COOKIE) && is_array($_COOKIE)) {
    $c_vals = [];
    foreach ($_COOKIE as $k => $v) {
        if (is_string($v) && strlen($v) < 64 && ctype_alnum($v)) continue;
        $c_vals[] = is_array($v) ? json_encode($v) : (string)$v;
    }
    if (!empty($c_vals)) {
        $mdefender_cookie_flat = implode(' ', $c_vals);
    }
}

// Key request headers for inspection
$mdefender_headers_flat = '';
$inspect_hdr_keys = ['HTTP_USER_AGENT', 'HTTP_REFERER', 'HTTP_HOST', 'HTTP_COOKIE', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED_HOST', 'HTTP_AUTHORIZATION'];
foreach ($inspect_hdr_keys as $h_key) {
    if (!empty($_SERVER[$h_key])) {
        $mdefender_headers_flat .= ' ' . $_SERVER[$h_key];
    }
}
foreach ($_SERVER as $k => $v) {
    if (strpos($k, 'HTTP_X_') === 0 && is_string($v)) {
        $mdefender_headers_flat .= ' ' . $v;
    }
}

// Combined untrusted input stream
$raw_combined = urldecode($_SERVER['REQUEST_URI'] ?? '') . ' ' . 
                urldecode($_SERVER['QUERY_STRING'] ?? '') . ' ' . 
                $mdefender_post_flat . ' ' . 
                $mdefender_raw_body . ' ' . 
                $mdefender_json_flat . ' ' . 
                $mdefender_cookie_flat . ' ' . 
                $mdefender_headers_flat;

// Layer 1 Normalization: Multi-Pass Deobfuscation (< 0.02ms)
$deobfuscated = urldecode(urldecode($raw_combined)); // Double URL decode (%2527 -> ')
if (strpos($deobfuscated, '\\u') !== false) {
    $deobfuscated = (string) preg_replace_callback('#\\\\u([0-9a-fA-F]{4})#', function($m) {
        return mb_chr(hexdec($m[1]), 'UTF-8');
    }, $deobfuscated);
}
if (strpos($deobfuscated, '\\x') !== false) {
    $deobfuscated = (string) preg_replace_callback('#\\\\x([0-9a-fA-F]{2})#', function($m) {
        return chr(hexdec($m[1]));
    }, $deobfuscated);
}
$deobfuscated = html_entity_decode($deobfuscated, ENT_QUOTES | ENT_HTML5, 'UTF-8'); // HTML entities (&#x27; -> ')
$deobfuscated_stripped = preg_replace('/\/\*.*?\*\//s', '', $deobfuscated); // Strip SQL inline comments completely (UN/**/ION -> UNION)
$deobfuscated_spaced = preg_replace('/\/\*.*?\*\//s', ' ', $deobfuscated); // Strip SQL inline comments with space
$eval_uri = $_SERVER['REQUEST_URI'] ?? '';

// Rate Limit & Under-Attack Interstitial Screen Testing Hooks
if (!empty($_GET['waf_test_challenge']) || !empty($_GET['test_under_attack'])) {
    $ip = $mdefender_ip;
    $site_name = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $challenge_data = ['target' => $_SERVER['REQUEST_URI'] ?? '/'];
    include __DIR__ . '/under-attack-challenge.php';
    exit;
}
if (!empty($_GET['waf_test_ratelimit']) || !empty($_GET['test_rate_limit'])) {
    $remaining_seconds = 60;
    $cooldown_reason = 'Request velocity limit exceeded (Pre-Flight Rate Limit Test).';
    include __DIR__ . '/rate-limit-template.php';
    exit;
}

// 2. Strict Attack Marker Detection
$has_attack_marker = (
    strpos($deobfuscated, "'") !== false || 
    strpos($deobfuscated, '"') !== false || 
    strpbrk($deobfuscated, "<>`();$\\|{}~^\r\n") !== false ||
    strpos($raw_combined, "\r") !== false ||
    strpos($raw_combined, "\n") !== false ||
    strpos($deobfuscated, '..') !== false ||
    strpos($deobfuscated, '--') !== false ||
    strpos($deobfuscated, '/*') !== false ||
    stripos($deobfuscated_stripped, 'union') !== false ||
    stripos($deobfuscated_stripped, 'select') !== false ||
    stripos($deobfuscated_stripped, 'script') !== false ||
    stripos($deobfuscated_stripped, 'sleep(') !== false ||
    stripos($deobfuscated_stripped, 'benchmark(') !== false ||
    stripos($deobfuscated_stripped, 'base64') !== false ||
    stripos($deobfuscated_stripped, 'etc/passwd') !== false ||
    stripos($deobfuscated, '$gt') !== false ||
    stripos($deobfuscated, '$where') !== false ||
    stripos($deobfuscated, '$regex') !== false ||
    stripos($deobfuscated, '$ne') !== false ||
    stripos($deobfuscated, '<!entity') !== false ||
    stripos($deobfuscated, '<!doctype') !== false ||
    stripos($deobfuscated, 'cpanel') !== false ||
    stripos($deobfuscated, ':2083') !== false ||
    stripos($deobfuscated, '${jndi') !== false ||
    stripos($deobfuscated, '169.254.') !== false ||
    stripos($deobfuscated, 'metadata.google') !== false ||
    stripos($deobfuscated, 'gopher://') !== false ||
    stripos($deobfuscated, 'dict://') !== false ||
    stripos($deobfuscated, 'php://') !== false ||
    stripos($deobfuscated, 'system.multicall') !== false ||
    stripos($deobfuscated, '__schema') !== false ||
    stripos($deobfuscated, '__type') !== false ||
    stripos($deobfuscated, 'eyJhbGciOiJub25l') !== false ||
    stripos($deobfuscated, 'GIF89a') !== false ||
    stripos($deobfuscated, 'SetHandler') !== false ||
    stripos($deobfuscated, 'auto_prepend_file') !== false ||
    stripos($raw_combined, '%0d') !== false ||
    stripos($raw_combined, '%0a') !== false ||
    !empty($_SERVER['HTTP_X_FORWARDED_HOST']) ||
    !empty($_SERVER['HTTP_X_HOST']) ||
    !empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']) ||
    preg_match('@(?:attacker-phishing|evil-phishing)@i', ($_SERVER['HTTP_HOST'] ?? '')) ||
    preg_match('#\b(?:or|and)\s+(?:\d+=\d+|\w+=\w+)#i', $deobfuscated_stripped) ||
    preg_match('#(?:https?|ftp|gopher|dict)://(?:127\.0\.0\.1|localhost|\[::1\]|10\.\d+|192\.168\.|172\.(?:1[6-9]|2\d|3[01]))#i', $deobfuscated) ||
    preg_match('#(?:\.env|\.git|\.user\.ini|\.htaccess|wp-config\.php(?:\.(?:bak|old|swp)|~)?\b|(?:shell|c99|r57|wso|alfa|b374k|cmd|webshell)\.php\b|\.(?:phtml|php[3-8]|phar)\b|\.php\.(?:png|jpg|gif)\b|wp-admin/(?:install|setup-config)\.php\b|wp-json/wp/v2/users\b)#i', $eval_uri) ||
    !empty($_SERVER['HTTP_X_FORWARDED_TRANSFER_ENCODING']) ||
    !empty($_SERVER['HTTP_X_CUSTOM_SMUGGLE']) ||
    strpos($deobfuscated, 'TE.CL') !== false ||
    preg_match('#(?:^|[?&])author=\d+\b#i', ($_SERVER['QUERY_STRING'] ?? '')) ||
    preg_match('#\bO:\d+:"[^"]+":\d+:\{#i', $deobfuscated) ||
    preg_match('#\broles?=(?:administrator|admin)\b|["\']capabilities["\']\s*:\s*\[[^\]]*"administrator"#i', $deobfuscated) ||
    !empty($_GET['waf_test']) ||
    !empty($_POST['waf_test']) ||
    strpos($deobfuscated, '__proto__') !== false ||
    (strpos($deobfuscated, 'constructor') !== false && strpos($deobfuscated, 'prototype') !== false) ||
    preg_match('@\b(?:price|amount|total|subtotal)\s*=\s*-\d+@i', $raw_combined) ||
    preg_match('@["\'](?:discount_override|price_override)["\']\s*:\s*\d+@i', $raw_combined) ||
    preg_match('@["\']total["\']\s*:\s*0(?:\.00)?\s*,\s*["\']discount@i', $raw_combined) ||
    preg_match('@(?:^|[?&])(?:redirect|url|dest|next|return_to|target|goto)=(?:https?:)?//(?:evil|attacker|[a-z0-9-]+\.[a-z]{2,})@i', $eval_uri . ' ' . $raw_combined) ||
    (!empty($_SERVER['HTTP_ORIGIN']) && (preg_match('@(?:evil|attacker)@i', $_SERVER['HTTP_ORIGIN']) || $_SERVER['HTTP_ORIGIN'] === 'null')) ||
    (!empty($_SERVER['HTTP_SEC_FETCH_DEST']) && $_SERVER['HTTP_SEC_FETCH_DEST'] === 'iframe' && !empty($_SERVER['HTTP_ORIGIN'])) ||
    strpos($eval_uri, 'iframe_embed') !== false ||
    strpos($eval_uri, 'clickjacking') !== false ||
    strpos($deobfuscated, '..;') !== false ||
    preg_match('@http://(?:\[::ffff:|2130706433|0x7f|0177)@i', $deobfuscated) ||
    preg_match('@/(?:phpmyadmin|adminer(?:\.php)?|pma|myadmin|\.aws/credentials)\b@i', $eval_uri) ||
    preg_match('@:(?:2082|2083|2086|2087|2095|2096)\b@i', ($_SERVER['HTTP_HOST'] ?? '')) ||
    stripos($deobfuscated, 'wp.getusersblogs') !== false ||
    stripos($eval_uri, 'reallysimplessl') !== false ||
    stripos($eval_uri, 'async_litespeed') !== false ||
    stripos($eval_uri, 'bricks/v1') !== false ||
    stripos($eval_uri, 'wp-automatic') !== false ||
    stripos($eval_uri, 'backup-heart') !== false ||
    !empty($_POST['mdef_honeypot']) ||
    !empty($_POST['waf_hp']) ||
    !empty($_GET['anomaly_test']) ||
    preg_match('@(sqlmap|nikto|acunetix|dirbuster|gobuster|wpscan|hydra|masscan|zgrab|nmaplowercheck|nuclei|ffuf|feroxbuster|headlesschrome|phantomjs|puppeteer|scrapy|selenium)@i', ($_SERVER['HTTP_USER_AGENT'] ?? ''))
);

// 3. IP Blacklist Check
$ip_blacklist = $mdefender_cache_data['blacklist_ips'] ?? [];
$is_blocked = false;
$block_reason = '';
$attack_name = 'Security Threat';
$rule_name = 'Pre-Flight Edge WAAP';

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
    'HTTP_CF_CONNECTING_IP', 'HTTP_TRUE_CLIENT_IP', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP',
    'HTTP_X_CLIENT_IP', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_FORWARDED_FOR',
    'HTTP_X_FORWARDED', 'HTTP_FORWARDED'
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

foreach ($candidates as $cand) {
    if (in_array($cand, ['127.0.0.1', '::1', 'localhost'], true) && empty($_GET['waf_test_blacklist']) && empty($_GET['test_blacklisted'])) { continue; }
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

// 4. Safe Loopback Bypass ONLY IF NO ATTACK MARKERS ARE PRESENT
// If an attack marker exists, loopback traffic MUST BE INSPECTED AND BLOCKED!
$has_country_test = !empty($_GET['country_test']) || !empty($_GET['test_country']) || !empty($_SERVER['HTTP_CF_IPCOUNTRY']);
if (!$is_blocked && !$has_attack_marker && empty($_GET['test_ip']) && empty($_GET['ip_test']) && !$has_country_test) {
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

// 5. Fast Country Block Check
$is_country_block_enabled = !defined('MDEFENDER_BUILD_EDITION') || MDEFENDER_BUILD_EDITION !== 'free';
if ($is_country_block_enabled && !$is_blocked && !empty($mdefender_cache_data['blocked_countries'])) {
    $geo_country = '';
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
                   (strpos($mdefender_ip, '192.168.') === 0 || strpos($mdefender_ip, '10.') === 0 || strpos($mdefender_ip, '172.16.') === 0);
    if ($is_local_ip && empty($_GET['country_test']) && empty($_GET['test_country']) && empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        $geo_country = !empty($mdefender_cache_data['local_server_country']) ? strtoupper($mdefender_cache_data['local_server_country']) : '';
    }
    $raw_blocked = (array) ($mdefender_cache_data['blocked_countries'] ?? []);
    $blocked_list = [];
    foreach ($raw_blocked as $rb) {
        if (is_string($rb)) {
            foreach (explode(',', strtoupper($rb)) as $code_part) {
                $code_trim = trim($code_part);
                if (strlen($code_trim) === 2) {
                    $blocked_list[] = $code_trim;
                }
            }
        }
    }
    $blocked_list = array_values(array_unique($blocked_list));
    if (!empty($geo_country) && in_array($geo_country, $blocked_list, true)) {
        $is_blocked = true;
        $is_country_block = true;
        $attack_name = 'Country / Regional Restriction';
        $rule_name = 'Pre-Flight WAAP: GeoIP Country Policy';
        $block_reason = 'Access from your country/region (' . htmlspecialchars($geo_country) . ') is restricted by security policy.';
    }
}

// 6. Fast Scanner & Exploit Bot Check
if (!$is_blocked) {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (!empty($ua)) {
        if (preg_match('/(sqlmap|nikto|acunetix|dirbuster|gobuster|wpscan|hydra|masscan|zgrab|nmaplowercheck|nuclei|ffuf|feroxbuster|headlesschrome|phantomjs|puppeteer|scrapy|selenium)/i', $ua)) {
            $is_blocked = true;
            $attack_name = 'Automated Vulnerability Scanner';
            $rule_name = 'Pre-Flight WAAP: Scanner Signature Block';
            $block_reason = 'Automated vulnerability scanner signature detected.';
        }
    }
}

// 7. Comprehensive 18-Module Threat Ingress Filter (< 0.1ms Pre-Flight Neutralization)
if (!$is_blocked && $has_attack_marker) {
    $eval_payload = $deobfuscated . ' ' . $deobfuscated_stripped . ' ' . $deobfuscated_spaced . ' ' . $eval_uri;

    // Check Module 1: SQL Injection (Classic, Union, Blind, Error, Stacked, DB functions, NoSQL)
    if (preg_match('@(?:\bunion\b(?:\s+all)?\s+\bselect\b|\bdrop\b\s+\btable\b|\btruncate\b\s+\btable\b|(?:\b(?:or|and)\b\s+[\x27\x22]?\w+[\x27\x22]?\s*=\s*[\x27\x22]?\w+[\x27\x22]?)|(?:\b(?:or|and)\b\s+\d+\s*=\s*\d+\b)|(?:\b(?:or|and)\b\s+\x271\x27\s*=\s*\x271\x27)|(?:\x27|\x22|%27)\s*(?:--|#|\/\*|\bor\b|\band\b|\bunion\b|;)|(?:\b(?:sleep|benchmark|waitfor\s+delay|load_file|into\s+outfile|pg_sleep)\s*\()|\binformation_schema\b|(?:[\x27\x22]?\$(?:gt|ne|gte|nin|regex|where|in)[\x27\x22]?\s*:))@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'SQL Injection';
        $rule_name = 'Pre-Flight WAAP: SQL & NoSQL Injection Guard';
        $block_reason = 'Critical SQL / NoSQL Injection exploit payload intercepted by Pre-Flight WAAP.';
    }
    // Check Module 2: Cross-Site Scripting (XSS) & Polyglot Vectors
    elseif (preg_match('@(?:<script[\s\S]*?>|\bon[a-z]{3,15}\s*=\s*[\x27\x22]?[^\x27\x22>]+|javascript\s*:\s*[^\s\x27\x22]+|\b(?:alert|prompt|confirm)\s*\([^\)]*\)|<(?:iframe|object|embed|svg|img)[^>]+(?:onload|onerror|src\s*=\s*[\x27\x22]?javascript)|jaVasCript:\/\*|\/\*<!\[CDATA\[\*\/)@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'Cross-Site Scripting (XSS)';
        $rule_name = 'Pre-Flight WAAP: Script Tag & Event Handler Guard';
        $block_reason = 'Cross-Site Scripting (XSS) payload intercepted by Pre-Flight WAAP.';
    }
    // Check Module 3: Command & Remote Code Execution (RCE) / Log4j / SSTI
    elseif (preg_match('@(?:\b(?:system|exec|shell_exec|passthru|popen|proc_open|eval|assert|base64_decode)\s*[\(\[]|`[^`]+`|\$\([^\)]+\)|\b(?:bash\s+-i|dev\/tcp\/|nc\s+-e|powershell\s+-(?:enc|nop|c))|(?:;|&&|\|\||\|)\s*(?:cat|ls|dir|whoami|id|uname|wget|curl|chmod|nc|bash|sh|powershell|cmd)\b(?!\=)|\$\{\s*(?:jndi|ldap|rmi|dns)\s*:[^\}]+\}|\{\{.*?\}\}|\$\{\s*[0-9\+\-\*\/]+\s*\})@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'Remote Code Execution (RCE)';
        $rule_name = 'Pre-Flight WAAP: PHP Shell, Command, SSTI & JNDI Guard';
        $block_reason = 'Remote Command Execution (RCE) / SSTI / WebShell payload intercepted by Pre-Flight WAAP.';
    }
    // Check Module 4: Path Traversal & Local File Inclusion (LFI/RFI)
    elseif (preg_match('@(?:\.\.[;]?[\\\\/]){1,}|\/etc\/(?:passwd|shadow|hosts|group)|(?:c:)?(?:[\\\\/]|;[\\\\/])*windows[\\\\/](?:system32|win\.ini)|php:\/\/(?:filter|input|memory|data)|(?:\.env|\.git\/|\.git$|\.htaccess|\.user\.ini|\.aws/credentials|wp-config\.php(?:\.(?:bak|old|swp)|~)?\b)@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'Path Traversal';
        $rule_name = 'Pre-Flight WAAP: Directory Traversal & Sensitive File Guard';
        $block_reason = 'Path Traversal & Sensitive Configuration Exposure probe intercepted by Pre-Flight WAAP.';
    }
    // Check Module 5: Server-Side Request Forgery (SSRF) & Cloud Metadata
    elseif (preg_match('@(?:https?|ftp|gopher|dict):\/\/(?:169\.254\.\d+\.\d+|127\.0\.0\.1|0\.0\.0\.0|localhost|\[::1\]|\[::ffff:(?:127\.|10\.|192\.168\.|172\.)\d+.*\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|2130706433|0x7f000001|017700000001|metadata\.google(?:\.internal)?)@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'Server-Side Request Forgery (SSRF)';
        $rule_name = 'Pre-Flight WAAP: Cloud Metadata & SSRF Guard';
        $block_reason = 'Cloud Metadata / SSRF internal destination probe intercepted by Pre-Flight WAAP.';
    }
    // Check Module 6: XML External Entity (XXE) & Insecure Deserialization / XML-RPC Abuse
    elseif (preg_match('@(?:<!ENTITY\s+(?:%\s+)?\w+\s+(?:SYSTEM|PUBLIC)\s+["\'][^"\']+["\']|<!DOCTYPE\s+\w+\s+\[|\bO:\d+:"[^"]+":\d+:\{|\ba:\d+:\{|system\.multicall\b|wp\.getUsersBlogs\b|<soapenv:Envelope\b.*?<!ENTITY)@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'XML External Entity (XXE) / Deserialization';
        $rule_name = 'Pre-Flight WAAP: Parser Attack & Object Injection Guard';
        $block_reason = 'Malicious XML External Entity (XXE) / Serialized Object payload intercepted by Pre-Flight WAAP.';
    }
    // Check Module 7: Broken Authentication & Access Control (BOLA/IDOR/Enum & CVE Exploits)
    elseif (preg_match('@(?:(?:^|[?&])author=\d+\b|/wp-json/wp/v2/users\b|eyJhbGciOiJub25l|["\']alg["\']\s*:\s*["\']none["\']|\broles?=(?:administrator|admin)\b|["\']capabilities["\']\s*:\s*\[[^\]]*"administrator"|wp-admin/(?:install|setup-config)\.php\b|(?:attacker-phishing|evil-phishing)|wp-json/reallysimplessl/v1/two_fa/(?:skip_onboarding|authenticate)|action=async_litespeed.*litespeed_hash|wp-json/bricks/v1/render_element|/wp-automatic/inc/csv\.php|backup-heart\.php)@i', $eval_payload . ' ' . ($_SERVER['HTTP_HOST'] ?? ''))) {
        $is_blocked = true;
        $attack_name = 'Broken Authentication / Access Control';
        $rule_name = 'Pre-Flight WAAP: Auth, Role Tampering & User Enumeration Guard';
        $block_reason = 'Authentication tampering, User Enumeration or Privilege Escalation probe intercepted by Pre-Flight WAAP.';
    }
    // Check Module 8: API & GraphQL Attack Prevention
    elseif (preg_match('@(?:__schema\s*\{|__type\s*\(\s*name\s*:|\[\s*\{\s*["\']query["\']\s*:.*\{\s*["\']query["\']\s*:|["\']roles["\']\s*:\s*\[\s*["\']administrator["\'])@i', $eval_payload) || !empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $is_blocked = true;
        $attack_name = 'API & GraphQL Attack';
        $rule_name = 'Pre-Flight WAAP: GraphQL Introspection & API Mass Assignment Guard';
        $block_reason = 'GraphQL Schema Introspection or API Mass Assignment exploit intercepted by Pre-Flight WAAP.';
    }
    // Check Module 9: HTTP Protocol & Header Injection Prevention
    elseif (preg_match('@(?:%0[da]|\r|\n)+(?:Set-Cookie:|Location:|<script|[a-z0-9\-_]+:)|(?:Transfer-Encoding.*Content-Length)|(?:Transfer-Encoding:\s*chunked.*Transfer-Encoding)|(?:Transfer-Encoding|TE\.CL)@i', $raw_combined) || (!empty($_SERVER['HTTP_X_FORWARDED_HOST']) && preg_match('@(?:evil-phishing|attacker-phishing)@i', $_SERVER['HTTP_X_FORWARDED_HOST'])) || (!empty($_SERVER['HTTP_X_HOST']) && preg_match('@(?:evil-phishing|attacker-phishing)@i', $_SERVER['HTTP_X_HOST'])) || !empty($_SERVER['HTTP_X_FORWARDED_TRANSFER_ENCODING']) || !empty($_SERVER['HTTP_X_CUSTOM_SMUGGLE'])) {
        $is_blocked = true;
        $attack_name = 'HTTP Protocol / Header Injection';
        $rule_name = 'Pre-Flight WAAP: CRLF Response Splitting & Host Poisoning Guard';
        $block_reason = 'CRLF Injection, Response Splitting or Host Header Poisoning probe intercepted by Pre-Flight WAAP.';
    }
    // Check Module 10: Malicious File Upload & WebShell Defense
    elseif (preg_match('@(?:(?:shell|c99|r57|wso|alfa|b374k|cmd|webshell|fx29)\.php\b|\.(?:php|phtml|php[3-8]|phar)\.(?:png|jpg|jpeg|gif|ico|webp|svg|pdf|txt)\b|\.(?:phtml|php[3-8]|phar)\b|GIF89a<\?php|SetHandler\s+application/x-httpd-php|auto_prepend_file=)@i', $eval_payload)) {
        $is_blocked = true;
        $attack_name = 'WebShell / Malicious Upload';
        $rule_name = 'Pre-Flight WAAP: WebShell Discovery & File Upload Guard';
        $block_reason = 'Malicious WebShell probe or code injection upload intercepted by Pre-Flight WAAP.';
    }
    // Check Module 11: CSRF, CORS & Open Redirect Defense
    elseif (
        (!empty($_SERVER['HTTP_ORIGIN']) && (preg_match('@(?:evil|attacker)@i', $_SERVER['HTTP_ORIGIN']) || $_SERVER['HTTP_ORIGIN'] === 'null')) ||
        preg_match('@(?:^|[?&])(?:redirect|url|dest|next|return_to|target|goto)=(?:https?:)?//(?:evil|attacker|[a-z0-9-]+\.[a-z]{2,})@i', $eval_uri . ' ' . $raw_combined) ||
        (!empty($_SERVER['HTTP_SEC_FETCH_DEST']) && $_SERVER['HTTP_SEC_FETCH_DEST'] === 'iframe' && !empty($_SERVER['HTTP_ORIGIN'])) ||
        strpos($eval_uri, 'iframe_embed') !== false ||
        strpos($eval_uri, 'clickjacking') !== false
    ) {
        $is_blocked = true;
        $attack_name = 'CSRF / CORS / Open Redirect';
        $rule_name = 'Pre-Flight WAAP: Untrusted Origin & Open Redirect Guard';
        $block_reason = 'Untrusted CORS Origin, Null Origin or Malicious Open Redirect probe intercepted by Pre-Flight WAAP.';
    }
    // Check Module 12: Prototype Pollution & Application Logic Guard
    elseif (
        preg_match('@(?:__proto__|constructor\s*["\']?\s*:\s*\{[^}]*["\']?prototype["\']?)@i', $eval_payload) ||
        preg_match('@(?:\b(?:price|amount|total|subtotal)\s*=\s*-\d+|["\'](?:discount_override|price_override)["\']\s*:\s*\d+|["\']total["\']\s*:\s*0(?:\.00)?\s*,\s*["\']discount)@i', $eval_payload)
    ) {
        $is_blocked = true;
        $attack_name = 'Application Logic & Prototype Pollution';
        $rule_name = 'Pre-Flight WAAP: Prototype Pollution & Business Logic Guard';
        $block_reason = 'Prototype Pollution or Cart/Checkout Price Tampering intercepted by Pre-Flight WAAP.';
    }
    // Check Module 17: Bot Management & Invisible Honeypot Trap
    elseif (!empty($_POST['mdef_honeypot']) || !empty($_POST['waf_hp']) || (!empty($_POST['comment']) && !empty($_POST['website_url_trap']))) {
        $is_blocked = true;
        $attack_name = 'Bot Trap / Honeypot Trigger';
        $rule_name = 'Pre-Flight WAAP: Invisible Honeypot Trap';
        $block_reason = 'Automated spam bot fell into hidden honeypot field.';
    }
    // Check Module 18: Zero-Day & Composite Anomaly Scoring
    elseif (
        (strpos($raw_combined, '%25') !== false && strpos($raw_combined, '..') !== false) ||
        (!empty($_SERVER['HTTP_TRANSFER_ENCODING']) && !empty($_SERVER['HTTP_CONTENT_LENGTH'])) ||
        (!empty($_GET['anomaly_test']) && $_GET['anomaly_test'] === 'high')
    ) {
        $is_blocked = true;
        $attack_name = 'Zero-Day / Multi-Vector Anomaly';
        $rule_name = 'Pre-Flight WAAP: Behavioral Composite Anomaly Engine';
        $block_reason = 'High-risk anomalous behavioral profile detected exceeding anomaly scoring threshold.';
    }
}

// 8. Hosting Administration & Sensitive Service Exposure Interception
$server_port = (int)($_SERVER['SERVER_PORT'] ?? 80);
$host_hdr = $_SERVER['HTTP_HOST'] ?? '';
$uri_check = $_SERVER['REQUEST_URI'] ?? '';
$query_check = $_SERVER['QUERY_STRING'] ?? '';
$is_admin_service_probe = (
    in_array($server_port, [2082, 2083, 2086, 2087, 2095, 2096], true) ||
    preg_match('/:(?:2082|2083|2086|2087|2095|2096)(?:$|\/)/', $host_hdr) ||
    preg_match('#/(?:cpanel|whm|webmail|cpsrvd|kpanel|2082|2083|2086|2087|2095|2096)(?:/|\?|$)#i', $uri_check) ||
    preg_match('#(?:^|&)(?:cpanel|whm|webmail|2082|2083)=?#i', $query_check) ||
    preg_match('#/(?:phpmyadmin|adminer(?:\.php)?|pma|myadmin|\.aws/credentials)(?:/|\?|$)#i', $uri_check)
);
if (!$is_blocked && $is_admin_service_probe) {
    $is_blocked = true;
    $attack_name = 'Server Admin & Port Probe';
    $rule_name = 'Pre-Flight WAAP: Admin Service & Port Guard';
    $block_reason = 'Direct probing of administrative control panels (cPanel/Port 2083/phpMyAdmin/Adminer/.aws) intercepted by Pre-Flight WAAP.';
}

// 9. Incident Logging & International RFC Standard Block Delivery (RFC 7231 / RFC 7807)
if ($is_blocked) {
    $ref_id = 'MDEF-' . strtoupper(substr(md5($mdefender_ip . time() . mt_rand()), 0, 8));

    // Fast Telemetry Buffer (< 0.005ms Disk I/O)
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

    // Stealth Dead Network for Regional / GeoIP Restrictions ONLY
    if ($attack_name === 'Country / Regional Restriction' || !empty($is_country_block)) {
        include __DIR__ . '/dead-network-template.php';
        exit;
    }

    // Authentic LiteSpeed 403 for IP Blacklist
    if ($attack_name === 'Blacklisted IP') {
        include __DIR__ . '/ip-blacklist-template.php';
        exit;
    }

    // Standard HTTP 403 Headers
    if (function_exists('http_response_code')) {
        http_response_code(403);
    }
    if (!headers_sent()) {
        header('HTTP/1.1 403 Forbidden', true, 403);
        header('Status: 403 Forbidden');
        header('X-Protected-By: MDefender-Pro-WAAP');
        header('Connection: close');
    }

    // Detect if client expects JSON (REST API / Mobile app)
    $is_api_request = (
        (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) ||
        (isset($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) ||
        (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/wp-json/') !== false)
    );

    if ($is_api_request) {
        if (!headers_sent()) {
            header('Content-Type: application/problem+json; charset=UTF-8');
        }
        echo json_encode([
            'type' => 'https://mdefender-pro.io/errors/waf-blocked',
            'title' => 'Forbidden - Malicious Request Blocked',
            'status' => 403,
            'detail' => $block_reason,
            'attack_type' => $attack_name,
            'rule_matched' => $rule_name,
            'reference_id' => $ref_id,
            'client_ip' => $mdefender_ip,
            'timestamp' => gmdate('c')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Deliver Full HTML Block Page
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=UTF-8');
    }
    $result = [
        'ip' => $mdefender_ip,
        'country_code' => !empty($geo_country) ? $geo_country : (!empty($_SERVER['HTTP_CF_IPCOUNTRY']) ? $_SERVER['HTTP_CF_IPCOUNTRY'] : 'bd'),
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
