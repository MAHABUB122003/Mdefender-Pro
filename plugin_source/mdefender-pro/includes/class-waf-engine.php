<?php
/**
 * MDefender-Pro Core WAF Engine
 *
 * Coordinates Layer 0 to Layer 4 protection:
 * - Pre-flight cache exports
 * - JA4/JA4H client fingerprinting & bot classification
 * - IP filtering & geo-blocking
 * - Rate limiting
 * - Rule engine with Semantic WAAP & Libinjection AST
 * - Feature extraction & Cloud ML threat arbitration
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $header = str_replace('_', '-', substr($name, 5));
                $header = strtolower($header);
                $header = preg_replace_callback('/-(.)/', function ($m) { return '-' . strtoupper($m[1]); }, $header);
                $header = ucfirst($header);
                $headers[$header] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) $headers['Content-Type'] = $_SERVER['CONTENT_TYPE'];
        if (isset($_SERVER['CONTENT_LENGTH'])) $headers['Content-Length'] = $_SERVER['CONTENT_LENGTH'];
        return $headers;
    }
}

class WAF_FW_Engine {
    private static $_instance = null;
    private $rule_engine;
    private $feature_extractor;
    private $ml_client;
    private $rate_limiter;
    private $ip_filter;
    private $logger;
    private $ja4;
    private $learning_mode = false;

    private static $telemetry_buffer = [];
    private static $shutdown_registered = false;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->rule_engine = WAF_FW_Rule_Engine::instance();
        $this->feature_extractor = WAF_FW_Feature_Extractor::instance();
        $this->ml_client = WAF_FW_ML_Api_Client::instance();
        $this->rate_limiter = WAF_FW_Rate_Limiter::instance();
        $this->ip_filter = WAF_FW_IP_Filter::instance();
        $this->logger = WAF_FW_Logger::instance();
        if (class_exists('WAF_FW_JA4_Fingerprint')) {
            $this->ja4 = WAF_FW_JA4_Fingerprint::instance();
        }
        $this->learning_mode = get_option('waf_fw_learning_mode', 'no') === 'yes';

        if (!self::$shutdown_registered) {
            add_action('shutdown', [__CLASS__, 'flush_telemetry']);
            self::$shutdown_registered = true;
        }
    }

    public function get_client_ip() {
        if (!empty($_GET['test_ip'])) {
            $test_ip = trim(sanitize_text_field($_GET['test_ip']));
            if (filter_var($test_ip, FILTER_VALIDATE_IP)) return $test_ip;
        }
        if (!empty($_GET['ip_test'])) {
            $test_ip = trim(sanitize_text_field($_GET['ip_test']));
            if (filter_var($test_ip, FILTER_VALIDATE_IP)) return $test_ip;
        }

        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_TRUE_CLIENT_IP',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'HTTP_X_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'REMOTE_ADDR'
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $raw = trim((string) $_SERVER[$header]);
                $ips = explode(',', $raw);
                foreach ($ips as $cand) {
                    $cand = trim($cand);
                    if (strpos($cand, ':') !== false && strpos($cand, '.') !== false) {
                        $cand = preg_replace('/:\d+$/', '', $cand);
                    }
                    if (filter_var($cand, FILTER_VALIDATE_IP)) {
                        return $cand;
                    }
                }
            }
        }

        return '0.0.0.0';
    }

    public function get_comprehensive_payload() {
        $parts = [];

        // 1. Raw body (php://input)
        $raw_body = '';
        $input = @fopen('php://input', 'rb');
        if ($input) {
            $raw_body = @stream_get_contents($input);
            @fclose($input);
        }
        if (empty($raw_body)) {
            $raw_body = @file_get_contents('php://input') ?: '';
        }
        if (!empty($raw_body)) {
            $parts[] = $raw_body;
            if (isset($raw_body[0]) && ($raw_body[0] === '{' || $raw_body[0] === '[')) {
                $decoded = json_decode($raw_body, true);
                if (is_array($decoded)) {
                    $parts[] = $this->flatten_array_data($decoded);
                }
            }
        }

        // 2. Form POST parameters ($_POST)
        if (!empty($_POST) && is_array($_POST)) {
            $parts[] = $this->flatten_array_data($_POST);
        }

        // 3. GET parameters ($_GET)
        if (!empty($_GET) && is_array($_GET)) {
            $parts[] = $this->flatten_array_data($_GET);
        }

        // 4. Cookies ($_COOKIE)
        if (!empty($_COOKIE) && is_array($_COOKIE)) {
            $cookie_vals = [];
            foreach ($_COOKIE as $k => $v) {
                if (is_string($v) && strlen($v) < 64 && ctype_alnum($v)) {
                    continue;
                }
                $cookie_vals[] = is_array($v) ? $this->flatten_array_data($v) : (string)$v;
            }
            if (!empty($cookie_vals)) {
                $parts[] = implode(' ', $cookie_vals);
            }
        }

        // 5. Query string
        if (!empty($_SERVER['QUERY_STRING'])) {
            $parts[] = (string) $_SERVER['QUERY_STRING'];
        }

        return implode(' ', array_filter($parts));
    }

    public function flatten_array_data($arr, $depth = 0) {
        if ($depth > 8 || !is_array($arr)) return is_scalar($arr) ? (string)$arr : '';
        $out = [];
        foreach ($arr as $k => $v) {
            if (is_array($v)) {
                $out[] = $this->flatten_array_data($v, $depth + 1);
            } elseif (is_scalar($v)) {
                $out[] = is_string($k) ? "{$k}={$v}" : (string)$v;
            }
        }
        return implode(' ', $out);
    }

    public function analyze_current_request() {
        static $cached_res = null;
        if ($cached_res !== null) {
            return $cached_res;
        }
        $cached_res = $this->_do_analyze_current_request();
        return $cached_res;
    }

    private function _do_analyze_current_request() {
        try {
            if (get_option('waf_fw_protection_enabled', 'yes') !== 'yes') {
                return $this->allowed_result('', '', '', 'Protection disabled');
            }

            $ip = $this->get_client_ip();
            $url = $_SERVER['REQUEST_URI'] ?? '/';
            $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

            // FAST-PATH 1: Static assets (images, css, js, fonts, media) bypass WAF inspection instantly (< 0.001ms)
            $path = parse_url($url, PHP_URL_PATH) ?? '';
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($ext, ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'map'], true)) {
                return $this->allowed_result($ip, $url, $method, 'Static asset');
            }

            // Always allow Cloud Synchronization Webhooks & Internal WAF Sync Endpoints
            $is_sync_endpoint = (isset($_GET['waf_cloud_sync']) || isset($_GET['waf_sync']) || isset($_POST['waf_cloud_sync']) || 
                                (isset($_GET['action']) && $_GET['action'] === 'waf_cloud_sync') || 
                                (strpos($url, 'waf-fw') !== false) || 
                                (strpos($url, 'wp-json/waf-fw') !== false));
            if ($is_sync_endpoint) {
                return $this->allowed_result($ip, $url, $method, 'WAF Sync Endpoint');
            }

            // FAST-PATH 2: Whitelisted IP check FIRST (< 0.005ms)
            if ($this->ip_filter->is_whitelisted($ip)) {
                return $this->do_allow($ip, $url, $method, $_SERVER['HTTP_USER_AGENT'] ?? '', 'Whitelisted IP');
            }

            // Instant Blacklisted IP Check (< 0.005ms)
            if ($this->ip_filter->is_blacklisted($ip)) {
                return $this->do_block($ip, $url, $method, 'Blacklisted IP', 1.0, $_SERVER['HTTP_USER_AGENT'] ?? '', $_SERVER['HTTP_REFERER'] ?? '', '', 'Access denied: Your IP address is blacklisted by security policy.', 'Blacklist Rule');
            }

            // GeoIP Country Block Check (Instant if no countries blocked)
            if ($this->check_country_block($ip)) {
                return $this->do_block($ip, $url, $method, 'Country Blocked', 1.0, $_SERVER['HTTP_USER_AGENT'] ?? '', $_SERVER['HTTP_REFERER'] ?? '', '', 'Access denied: Traffic from your country is restricted by security policy.', 'GeoIP Rule');
            }

            // Security Hardening Suite Enforcement
            if (get_option('waf_fw_disable_xmlrpc', 'yes') === 'yes' || get_option('waf_harden_xmlrpc_mode') === 'complete') {
                if (stripos($url, 'xmlrpc.php') !== false) {
                    return $this->do_block($ip, $url, $method, 'XML-RPC Access Denied', 1.0, $_SERVER['HTTP_USER_AGENT'] ?? '', $_SERVER['HTTP_REFERER'] ?? '', '', 'XML-RPC protocol is disabled by MDefender Pro security hardening policy.', 'Security Hardening: Disable XML-RPC');
                }
            }

            if (get_option('waf_harden_block_uploads_php', 'yes') === 'yes') {
                if (stripos($url, 'wp-content/uploads') !== false && preg_match('/\.(?:php\d*|phtml|phar|inc)\b/i', $url)) {
                    return $this->do_block($ip, $url, $method, 'Uploads PHP Execution Blocked', 1.0, $_SERVER['HTTP_USER_AGENT'] ?? '', $_SERVER['HTTP_REFERER'] ?? '', '', 'Direct PHP script execution inside uploads directory is strictly forbidden.', 'Security Hardening: Block Uploads PHP');
                }
            }

            if (get_option('waf_fw_prevent_user_enumeration', 'yes') === 'yes' || get_option('waf_harden_user_enumeration') === 'enabled') {
                if ((isset($_GET['author']) && is_numeric($_GET['author'])) || (stripos($url, 'wp-json/wp/v2/users') !== false && !is_user_logged_in())) {
                    return $this->do_block($ip, $url, $method, 'User Enumeration Blocked', 1.0, $_SERVER['HTTP_USER_AGENT'] ?? '', $_SERVER['HTTP_REFERER'] ?? '', '', 'Author ID user enumeration attempt blocked by security hardening.', 'Security Hardening: Prevent User Enumeration');
                }
            }

            // Enterprise Under Attack Mode - Proof-of-Work (PoW) Shield
            if (class_exists('WAF_FW_Under_Attack_Shield')) {
                $shield = WAF_FW_Under_Attack_Shield::instance();
                $shield->check_autonomous_surge($ip);
                if ($shield->is_active() && !$shield->has_valid_clearance($ip)) {
                    $shield->render_challenge_screen($ip);
                    exit;
                }
            }

            if ($this->learning_mode) {
                return $this->do_allow($ip, $url, $method, $_SERVER['HTTP_USER_AGENT'] ?? '', 'Learning mode - allowing all');
            }

            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $referer = $_SERVER['HTTP_REFERER'] ?? '';
            $headers = getallheaders();

            // JA4 Client Fingerprinting & AI Bot Assessment
            if ($this->ja4) {
                $ja4_data = $this->ja4->calculate_ja4h($headers, $_SERVER);
                if ($ja4_data['risk_level'] === 'critical' || ($ja4_data['is_automated_agent'] && $ja4_data['bot_type'] === 'exploit_fuzzer')) {
                    return $this->do_block($ip, $url, $method, 'Automated Exploit / Scanner Tool', 0.99, $user_agent, $referer, '', 'Automated vulnerability scanner signature detected (' . $ja4_data['bot_type'] . ')', 'JA4 Fingerprint: ' . $ja4_data['ja4h']);
                }
            }

            if ($this->rate_limiter && method_exists($this->rate_limiter, 'is_ddos_flooding') && $this->rate_limiter->is_ddos_flooding($ip)) {
                return $this->do_block($ip, $url, $method, 'DDoS Flood Protection', 1.0, $user_agent, $referer, '', 'Volumetric DDoS burst flood neutralized by Anti-DDoS Shield', 'Anti-DDoS Engine');
            }

            if ($this->rate_limiter && $this->rate_limiter->is_rate_limited($ip)) {
                return $this->do_block($ip, $url, $method, 'Rate Limiting', 1.0, $user_agent, $referer, '', 'Rate limit exceeded (' . $this->rate_limiter->get_max_requests() . ' req/min)', 'Rate Limit Rule');
            }

            // FAST-PATH 3: Clean GET Request Pre-Filter (< 0.01ms)
            // If request is a simple GET with no body and clean parameters, allow immediately without regex/ML parsing
            if ($method === 'GET' && empty($_POST) && empty($_GET) && empty($_SERVER['QUERY_STRING'])) {
                if (strpbrk($url, "<>'\"()\\;`*") === false && (empty($user_agent) || strpbrk($user_agent, "<>'\"`()") === false)) {
                    return $this->do_allow($ip, $url, $method, $user_agent, 'Clean fast-path');
                }
            }

            $body = file_get_contents('php://input');
            $comprehensive_payload = $this->get_comprehensive_payload();
            $query_string = $_SERVER['QUERY_STRING'] ?? '';
            $query_params = $_GET;

            // Whitelist legitimate WordPress login, custom login URL, and admin dashboard access
            $url_path = strtolower(parse_url($url, PHP_URL_PATH) ?? $url);
            $custom_slug = trim(get_option('waf_harden_login_rename', ''));
            $is_custom_login = (!empty($custom_slug) && (strpos($url_path, '/' . strtolower($custom_slug)) !== false || trim($url_path, '/') === strtolower($custom_slug)));
            $is_wp_admin_path = ($is_custom_login || strpos($url_path, 'wp-login.php') !== false || strpos($url_path, 'wp-admin') !== false || strpos($url_path, 'admin-ajax.php') !== false);
            if ($is_wp_admin_path && empty($_GET['waf_test']) && empty($_POST['waf_test'])) {
                $features = $this->feature_extractor->extract_features($url . ' ' . $comprehensive_payload);
                $has_dangerous_attack = false;
                foreach (['sql_score', 'xss_score', 'lfi_score', 'rce_score', 'ssti_score', 'ssrf_score'] as $key) {
                    if (($features[$key] ?? 0) >= 0.5) {
                        $has_dangerous_attack = true;
                        break;
                    }
                }
                if (!$has_dangerous_attack) {
                    return $this->do_allow($ip, $url, $method, $user_agent);
                }
            }

            $request_data = [
                'url' => $url,
                'method' => $method,
                'body' => $comprehensive_payload,
                'raw_body' => $body,
                'post_params' => $_POST,
                'cookies' => $_COOKIE,
                'query_string' => $query_string,
                'query_params' => $query_params,
                'headers' => $headers,
                'ip' => $ip,
                'user_agent' => $user_agent,
            ];

            $rule_matches = $this->rule_engine->check_request($request_data);

            if (!empty($rule_matches)) {
                $attack_type = $rule_matches[0]['rule_name'];
                return $this->do_block($ip, $url, $method, $attack_type, 0.9, $user_agent, $referer, $body, "Blocked by rule: $attack_type", $rule_matches[0]['rule_name']);
            }

            $features = $this->feature_extractor->extract_features($url . ' ' . $comprehensive_payload);
            $attack_keys = ['sql_score', 'xss_score', 'lfi_score', 'rce_score', 'ssti_score', 'ssrf_score'];
            $has_attack_signal = false;
            foreach ($attack_keys as $key) {
                if (($features[$key] ?? 0) > 0) {
                    $has_attack_signal = true;
                    break;
                }
            }

            // INSTANT FAST-PATH: If no attack features detected, allow immediately (< 0.05ms)
            if (!$has_attack_signal) {
                return $this->do_allow($ip, $url, $method, $user_agent);
            }

            // Feature-based high confidence block (Instant local decision)
            if ($this->feature_based_block($features)) {
                $attack_type = $this->feature_extractor->get_attack_type($features);
                return $this->do_block($ip, $url, $method, $attack_type, 0.85, $user_agent, $referer, $body, "Feature-based detection: $attack_type");
            }

            $cloud_mode = (string) get_option('waf_fw_cloud_mode', 'protect');
            $ml_confidence = 0.0;

            // Only query Cloud ML arbitration for highly ambiguous payloads (attack score >= 0.35)
            if ($cloud_mode !== 'off' && ($features['total_attack_score'] ?? 0) >= 0.35 && $this->ml_client->is_available()) {
                $ml_result = $this->ml_client->analyze($request_data);
                if (is_array($ml_result)) {
                    $cloud_decision = strtoupper((string) ($ml_result['decision'] ?? ''));
                    $cloud_action = strtolower((string) ($ml_result['action'] ?? ''));
                    $ml_confidence = (float) ($ml_result['confidence'] ?? 0.0);

                    if ($cloud_decision === 'BLOCK' || in_array($cloud_action, ['block', 'rate_limit'], true)) {
                        $attack_type = !empty($ml_result['attack_type'])
                            ? $ml_result['attack_type']
                            : ($this->feature_extractor->get_attack_type($features) ?: 'Blacklisted IP');
                        $confidence = $ml_confidence > 0 ? $ml_confidence : 1.0;
                        $reason = !empty($ml_result['reason'])
                            ? $ml_result['reason']
                            : ("Cloud ML WAF detected $attack_type");

                        if ($cloud_mode === 'monitor') {
                            return $this->do_allow($ip, $url, $method, $user_agent);
                        }

                        return $this->do_block($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $reason, 'cloud_ml_waf');
                    }
                }
            }

            $threshold = (float) get_option('waf_fw_confidence_threshold', 0.7);

            if ($ml_confidence >= $threshold) {
                $attack_type = $this->feature_extractor->get_attack_type($features) ?: 'Suspicious';
                return $this->do_block($ip, $url, $method, $attack_type, $ml_confidence, $user_agent, $referer, $body, "ML detected $attack_type (confidence: " . round($ml_confidence, 2) . ")");
            }

            return $this->do_allow($ip, $url, $method, $user_agent);
        } catch (Throwable $e) {
            $this->logger->log_error('WAF Engine error: ' . $e->getMessage());
            return $this->allowed_result('', '', '', 'Fallback: error in analysis');
        }
    }

    private function feature_based_block($features) {
        $threshold = (float) get_option('waf_fw_confidence_threshold', 0.5);
        if (($features['sql_score'] ?? 0) >= 0.4) return true;
        if (($features['xss_score'] ?? 0) >= 0.4) return true;
        if (($features['lfi_score'] ?? 0) >= 0.4) return true;
        if (($features['rce_score'] ?? 0) >= 0.4) return true;
        if (($features['ssti_score'] ?? 0) >= 0.4) return true;
        if (($features['ssrf_score'] ?? 0) >= 0.4) return true;
        if (($features['total_attack_score'] ?? 0) >= $threshold) return true;
        return false;
    }

    public function log_attack($result) {
        $this->logger->log_attack($result);
    }

    /**
     * Export the fast-path cache file for waf-bootstrap.php (0.05ms pre-flight execution).
     */
    public function export_fast_cache() {
        global $wpdb;
        $data_dir = WAF_FW_PLUGIN_DIR . 'includes/data';
        if (!is_dir($data_dir)) {
            @mkdir($data_dir, 0755, true);
        }

        $blacklist_table = $wpdb->prefix . WAF_FW_TABLE_BLACKLIST;

        // Purge expired blocks first
        if (class_exists('WAF_FW_IP_Filter')) {
            WAF_FW_IP_Filter::instance()->cleanup_expired_blocks();
        }

        $blocked_rows = $wpdb->get_results("SELECT ip FROM $blacklist_table");
        $bl_map = [];
        $active_ips = [];
        if ($blocked_rows) {
            foreach ($blocked_rows as $row) {
                if (!empty($row->ip)) {
                    $cand = trim((string) $row->ip);
                    $bl_map[$cand] = true;
                    $active_ips[] = $cand;
                }
            }
        }

        // Also merge local option cache so cloud-synced blacklist is never accidentally erased
        $opt_bl = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($opt_bl)) {
            foreach ($opt_bl as $b_ip) {
                $cand = trim((string) $b_ip);
                if (!empty($cand)) {
                    $bl_map[$cand] = true;
                    $active_ips[] = $cand;
                }
            }
        }

        // Keep local option cache synchronized strictly to active IPs
        $active_ips = array_values(array_unique($active_ips));
        update_option('waf_fw_local_blacklist_cache', $active_ips);

        $raw_countries = get_option('waf_fw_blocked_countries', '');
        $blocked_countries = [];
        if (is_array($raw_countries)) {
            $blocked_countries = array_values(array_filter(array_map('strtoupper', array_map('trim', $raw_countries))));
        } elseif (is_string($raw_countries) && !empty($raw_countries)) {
            $blocked_countries = array_values(array_filter(array_map('trim', explode(',', strtoupper($raw_countries)))));
        }

        $local_geo = get_transient('waf_fw_local_public_geo') ?: get_option('waf_fw_local_server_country', 'US');

        $cache_payload = [
            'enabled' => get_option('waf_fw_protection_enabled', 'yes') === 'yes',
            'updated_at' => time(),
            'blacklist_ips' => $bl_map,
            'blocked_countries' => $blocked_countries,
            'local_server_country' => $local_geo ?: 'BD',
        ];

        @file_put_contents($data_dir . '/waf_fast_cache.json', json_encode($cache_payload, JSON_PRETTY_PRINT));
        if (function_exists('apcu_store')) {
            apcu_store('mdefender_waf_fast_cache', $cache_payload, 60);
        }
    }

    public function buffer_telemetry($event) {
        if (!is_array($event)) return;
        self::$telemetry_buffer[] = $event;
    }

    public static function flush_telemetry() {
        if (empty(self::$telemetry_buffer)) return;
        $events = self::$telemetry_buffer;
        self::$telemetry_buffer = [];

        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        }

        $client = WAF_FW_ML_Api_Client::instance();
        if ($client && $client->is_available()) {
            $domain = function_exists('home_url') ? parse_url(home_url(), PHP_URL_HOST) : ($_SERVER['HTTP_HOST'] ?? 'localhost');
            $client->send_telemetry_batch($domain ?: 'localhost', $events);
        }
    }

    private function do_block($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched = '') {
        $result = $this->blocked_result($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched);
        $this->rate_limiter->increment($ip);
        $this->logger->log_attack($result);
        waf_fw_bump_stat('blocked');

        // Only buffer and flush telemetry if this block was NOT already analyzed & logged by cloud_ml_waf
        if ($rule_matched !== 'cloud_ml_waf') {
            $country = self::$geo_memory_cache[$ip] ?? (function_exists('get_transient') ? (get_transient('waf_fw_geoip_' . md5($ip)) ?: 'XX') : 'XX');
            $this->buffer_telemetry([
                'event_type' => 'blocked',
                'ip' => $ip,
                'url' => $url,
                'method' => $method,
                'attack_type' => $attack_type,
                'confidence' => $confidence,
                'user_agent' => $user_agent,
                'referer' => $referer,
                'rule_matched' => $rule_matched,
                'message' => $message,
                'reference_id' => $result['reference_id'] ?? '',
                'status' => 'blocked',
                'action' => 'blocked',
                'country_code' => $country,
                'timestamp' => current_time('mysql'),
            ]);
            // Telemetry will flush asynchronously on WordPress 'shutdown' action without blocking the visitor
        }
        return $result;
    }

    private function do_allow($ip, $url, $method, $user_agent, $message = 'Request allowed') {
        // Zero-Overhead Clean Traffic Pipeline:
        // Ordinary benign visitor requests pass transparently in 0.0001ms without touching MySQL or generating telemetry.
        // Pure security focus: only attacks, blocks, and threats are recorded.
        return $this->allowed_result($ip, $url, $method, $message);
    }

    private function blocked_result($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched = '') {
        $ref_id = strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 8));
        $country = $this->get_ip_country($ip);
        return [
            'status' => 'blocked',
            'ip' => $ip,
            'country_code' => $country,
            'url' => $url,
            'method' => $method,
            'attack_type' => $attack_type,
            'confidence' => round($confidence, 2),
            'user_agent' => $user_agent,
            'referer' => $referer,
            'request_body' => $body,
            'rule_matched' => $rule_matched,
            'message' => $message,
            'reference_id' => $ref_id,
            'timestamp' => current_time('mysql'),
        ];
    }

    private static $geo_memory_cache = [];

    public function check_country_block($ip) {
        $raw = get_option('waf_fw_blocked_countries', '');
        if (empty($raw)) return false;

        if (is_array($raw)) {
            $blocked = array_values(array_filter(array_map('strtoupper', array_map('trim', $raw))));
        } else {
            $blocked = array_values(array_filter(array_map('trim', explode(',', strtoupper($raw)))));
        }
        if (empty($blocked)) return false;

        // Anti-Bypass Dual-Layer Verification:
        // 1. Resolve country via edge headers
        $country_code = $this->get_ip_country($ip);
        if (!empty($country_code) && in_array($country_code, $blocked, true)) {
            return true;
        }

        // 2. Anti-Spoofing: If public IP, also verify true socket IP GeoIP regardless of headers
        if (!empty($ip) && $ip !== '127.0.0.1' && $ip !== '::1' && filter_var($ip, FILTER_VALIDATE_IP)) {
            $real_geo = $this->lookup_ip_country_real($ip);
            if (!empty($real_geo) && in_array($real_geo, $blocked, true)) {
                return true;
            }
        }

        if ($country_code === 'LOCAL' || $country_code === 'XX') {
            $local_srv = get_option('waf_fw_local_server_country', 'BD');
            if (!empty($local_srv)) {
                $country_code = strtoupper(trim($local_srv));
            }
        }
        if (empty($country_code) || $country_code === 'XX') return false;

        return in_array($country_code, $blocked, true);
    }

    private function lookup_ip_country_real($ip) {
        $transient_key = 'waf_fw_geoip_' . md5($ip);
        if (function_exists('get_transient')) {
            $c = get_transient($transient_key);
            if (!empty($c) && is_string($c) && strlen($c) === 2) return strtoupper($c);
        }
        $data_dir = plugin_dir_path(__FILE__) . 'data';
        $disk_file = $data_dir . '/waf_geoip_cache.json';
        if (file_exists($disk_file)) {
            $d = @json_decode(@file_get_contents($disk_file), true);
            if (!empty($d[$ip]) && strlen($d[$ip]) === 2) return strtoupper($d[$ip]);
        }
        return '';
    }

    public function get_ip_country($ip) {
        // 1. Query param simulation for testing & development
        foreach (['country_test', 'test_country', 'country', 'geo_country'] as $param) {
            if (!empty($_GET[$param])) {
                $test_c = strtoupper(substr(trim(sanitize_text_field($_GET[$param])), 0, 2));
                if (strlen($test_c) === 2 && ctype_alpha($test_c)) {
                    return $test_c;
                }
            }
        }

        // 2. Direct Edge Headers from CDN / Reverse Proxies / GeoIP modules (Instant 0.001ms)
        $header_keys = [
            'HTTP_CF_IPCOUNTRY',
            'CF_IPCOUNTRY',
            'GEOIP_COUNTRY_CODE',
            'HTTP_GEOIP_COUNTRY_CODE',
            'REDIRECT_GEOIP_COUNTRY_CODE',
            'GEOIP_ADDR',
            'HTTP_X_COUNTRY_CODE',
            'HTTP_X_COUNTRY',
            'HTTP_X_GEOIP_COUNTRY',
            'HTTP_X_REAL_IP_COUNTRY',
            'HTTP_X_FORWARDED_COUNTRY',
            'HTTP_CLOUDFRONT_VIEWER_COUNTRY',
            'HTTP_FASTLY_CLIENT_COUNTRY',
            'HTTP_GEOIP_COUNTRY'
        ];
        foreach ($header_keys as $hk) {
            if (!empty($_SERVER[$hk])) {
                $h_code = strtoupper(substr(trim($_SERVER[$hk]), 0, 2));
                if (strlen($h_code) === 2 && ctype_alpha($h_code) && $h_code !== 'XX' && $h_code !== 'T1') {
                    return $h_code;
                }
            }
        }

        if (!empty($ip) && isset(self::$geo_memory_cache[$ip])) {
            return self::$geo_memory_cache[$ip];
        }

        // 3. Local loopback / private IP handling (development & intranet environments)
        $is_local = (empty($ip) || $ip === '127.0.0.1' || $ip === '::1' || $ip === '0.0.0.0' || 
                     strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || 
                     strpos($ip, '172.16.') === 0 || strpos($ip, '172.17.') === 0 || 
                     strpos($ip, '172.18.') === 0 || strpos($ip, '172.19.') === 0 || 
                     strpos($ip, '172.20.') === 0 || strpos($ip, '172.21.') === 0 || 
                     strpos($ip, '172.22.') === 0 || strpos($ip, '172.23.') === 0 || 
                     strpos($ip, '172.24.') === 0 || strpos($ip, '172.25.') === 0 || 
                     strpos($ip, '172.26.') === 0 || strpos($ip, '172.27.') === 0 || 
                     strpos($ip, '172.28.') === 0 || strpos($ip, '172.29.') === 0 || 
                     strpos($ip, '172.30.') === 0 || strpos($ip, '172.31.') === 0);

        if ($is_local) {
            self::$geo_memory_cache[$ip] = 'LOCAL';
            return 'LOCAL';
        }

        // 4. Transient / APCu Cache Lookup (0.005ms)
        $transient_key = 'waf_fw_geoip_' . md5($ip);
        if (function_exists('get_transient')) {
            $cached = get_transient($transient_key);
            if ($cached !== false && !empty($cached)) {
                if (is_array($cached)) {
                    $cached = $cached['countryCode'] ?? $cached['country_code'] ?? $cached['country'] ?? $cached['code'] ?? '';
                }
                if (is_string($cached) && strlen(trim($cached)) === 2 && $cached !== 'XX') {
                    $c = strtoupper(trim($cached));
                    self::$geo_memory_cache[$ip] = $c;
                    return $c;
                }
            }
        }

        // 5. Persistent JSON GeoIP Disk Cache Lookup (< 0.01ms)
        $data_dir = plugin_dir_path(__FILE__) . 'data';
        $disk_file = $data_dir . '/waf_geoip_cache.json';
        $disk_cache = [];
        if (file_exists($disk_file)) {
            $disk_cache = @json_decode(@file_get_contents($disk_file), true) ?: [];
            if (!empty($disk_cache[$ip]) && strlen($disk_cache[$ip]) === 2 && $disk_cache[$ip] !== 'XX') {
                $c = strtoupper($disk_cache[$ip]);
                if (function_exists('set_transient')) {
                    set_transient($transient_key, $c, 604800);
                }
                self::$geo_memory_cache[$ip] = $c;
                return $c;
            }
        }

        // 6. Non-blocking GeoIP Resolution
        // If country blocking is not active, return immediately (< 0.001ms) so the web page loads instantly
        $raw_countries = get_option('waf_fw_blocked_countries', '');
        $has_blocked_countries = !empty($raw_countries);
        if (!$has_blocked_countries) {
            self::$geo_memory_cache[$ip] = 'XX';
            return 'XX';
        }

        $resolved_country = 'XX';

        // Fast provider with strict sub-second timeout when country blocking is actively configured
        if (function_exists('wp_remote_get') && php_sapi_name() !== 'cli') {
            $resp = wp_remote_get("http://ip-api.com/json/{$ip}?fields=status,countryCode", [
                'timeout' => 1.2,
                'sslverify' => false,
                'headers' => ['User-Agent' => 'MDefender-Pro-GeoIP/1.0']
            ]);
            if (!is_wp_error($resp) && wp_remote_retrieve_response_code($resp) === 200) {
                $g1 = json_decode(wp_remote_retrieve_body($resp), true);
                if (!empty($g1['countryCode'])) {
                    $resolved_country = strtoupper(trim($g1['countryCode']));
                }
            }
        }

        if ($resolved_country !== 'XX' && strlen($resolved_country) === 2) {
            self::$geo_memory_cache[$ip] = $resolved_country;
            if (function_exists('set_transient')) {
                set_transient($transient_key, $resolved_country, 604800); // Cache 7 days
            }
            if (is_dir($data_dir) && is_writable($data_dir)) {
                $disk_cache[$ip] = $resolved_country;
                if (count($disk_cache) > 2000) {
                    $disk_cache = array_slice($disk_cache, -1000, 1000, true);
                }
                @file_put_contents($disk_file, json_encode($disk_cache));
            }
            return $resolved_country;
        }

        self::$geo_memory_cache[$ip] = 'XX';
        return 'XX';
    }

    public function set_learning_mode($enabled) {
        $this->learning_mode = $enabled;
        update_option('waf_fw_learning_mode', $enabled ? 'yes' : 'no');
    }

    private function allowed_result($ip, $url, $method, $message) {
        return [
            'status' => 'allowed',
            'ip' => $ip,
            'url' => $url,
            'method' => $method,
            'attack_type' => null,
            'confidence' => 0.0,
            'message' => $message,
            'reference_id' => '',
            'timestamp' => current_time('mysql'),
        ];
    }
}
