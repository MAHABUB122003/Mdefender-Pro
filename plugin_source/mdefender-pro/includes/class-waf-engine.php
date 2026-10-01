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

    public function analyze_current_request() {
        try {
            if (get_option('waf_fw_protection_enabled', 'yes') !== 'yes') {
                return $this->allowed_result('', '', '', 'Protection disabled');
            }

            $ip = $this->get_client_ip();
            $url = $_SERVER['REQUEST_URI'] ?? '/';
            $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
            $body = file_get_contents('php://input');
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $referer = $_SERVER['HTTP_REFERER'] ?? '';
            $query_string = $_SERVER['QUERY_STRING'] ?? '';
            $query_params = $_GET;
            $headers = getallheaders();

            if ($this->ip_filter->is_whitelisted($ip)) {
                return $this->do_allow($ip, $url, $method, $user_agent, 'Whitelisted IP');
            }

            if ($this->ip_filter->is_blacklisted($ip)) {
                return $this->do_block($ip, $url, $method, 'Blacklisted IP', 1.0, $user_agent, $referer, $body, 'Access denied: Your IP address is blacklisted by security policy.', 'Blacklist Rule');
            }

            if ($this->check_country_block($ip)) {
                return $this->do_block($ip, $url, $method, 'Country Blocked', 1.0, $user_agent, $referer, $body, 'Access denied: Traffic from your country is restricted by security policy.', 'GeoIP Rule');
            }

            if ($this->learning_mode) {
                return $this->do_allow($ip, $url, $method, $user_agent, 'Learning mode - allowing all');
            }

            // JA4 Client Fingerprinting & AI Bot Assessment
            if ($this->ja4) {
                $ja4_data = $this->ja4->calculate_ja4h($headers, $_SERVER);
                if ($ja4_data['risk_level'] === 'critical' || ($ja4_data['is_automated_agent'] && $ja4_data['bot_type'] === 'exploit_fuzzer')) {
                    return $this->do_block($ip, $url, $method, 'Automated Exploit / Scanner Tool', 0.99, $user_agent, $referer, $body, 'Automated vulnerability scanner signature detected (' . $ja4_data['bot_type'] . ')', 'JA4 Fingerprint: ' . $ja4_data['ja4h']);
                }
            }

            if ($this->rate_limiter->is_rate_limited($ip)) {
                return $this->do_block($ip, $url, $method, 'Rate Limiting', 1.0, $user_agent, $referer, $body, 'Rate limit exceeded', 'Rate Limit Rule');
            }

            // Whitelist legitimate WordPress login, custom login URL, and admin dashboard access
            $url_path = strtolower(parse_url($url, PHP_URL_PATH) ?? $url);
            $custom_slug = trim(get_option('waf_harden_login_rename', ''));
            $is_custom_login = (!empty($custom_slug) && (strpos($url_path, '/' . strtolower($custom_slug)) !== false || trim($url_path, '/') === strtolower($custom_slug)));
            $is_wp_admin_path = ($is_custom_login || strpos($url_path, 'wp-login.php') !== false || strpos($url_path, 'wp-admin') !== false || strpos($url_path, 'admin-ajax.php') !== false);
            if ($is_wp_admin_path && empty($_GET['waf_test']) && empty($_POST['waf_test'])) {
                $features = $this->feature_extractor->extract_features($url . ' ' . $body . ' ' . $query_string);
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
                'body' => $body,
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

            $features = $this->feature_extractor->extract_features($url . ' ' . $body . ' ' . $query_string);
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
                            waf_fw_bump_stat('allowed');
                            return $this->do_allow($ip, $url, $method, $user_agent);
                        }

                        waf_fw_bump_stat('blocked');
                        return $this->do_block($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $reason, 'cloud_ml_waf');
                    }

                    waf_fw_bump_stat('allowed');
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
        if (($features['sql_score'] ?? 0) >= 0.2) return true;
        if (($features['xss_score'] ?? 0) >= 0.2) return true;
        if (($features['lfi_score'] ?? 0) >= 0.2) return true;
        if (($features['rce_score'] ?? 0) >= 0.2) return true;
        if (($features['ssti_score'] ?? 0) >= 0.2) return true;
        if (($features['ssrf_score'] ?? 0) >= 0.2) return true;
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
        $blocked_rows = $wpdb->get_results("SELECT ip FROM $blacklist_table");
        $bl_map = [];
        if ($blocked_rows) {
            foreach ($blocked_rows as $row) {
                if (!empty($row->ip)) {
                    $cand = trim((string) $row->ip);
                    $bl_map[$cand] = true;
                    if ($cand === '127.0.0.1') { $bl_map['::1'] = true; $bl_map['0.0.0.0'] = true; }
                    if ($cand === '::1') { $bl_map['127.0.0.1'] = true; $bl_map['0.0.0.0'] = true; }
                }
            }
        }

        $cloud_bl = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cloud_bl)) {
            foreach ($cloud_bl as $ip) {
                if (!empty($ip)) {
                    $cand = trim((string) $ip);
                    $bl_map[$cand] = true;
                    if ($cand === '127.0.0.1') { $bl_map['::1'] = true; $bl_map['0.0.0.0'] = true; }
                    if ($cand === '::1') { $bl_map['127.0.0.1'] = true; $bl_map['0.0.0.0'] = true; }
                }
            }
        }

        $raw_countries = get_option('waf_fw_blocked_countries', '');
        $blocked_countries = [];
        if (is_array($raw_countries)) {
            $blocked_countries = array_values(array_filter(array_map('strtoupper', array_map('trim', $raw_countries))));
        } elseif (is_string($raw_countries) && !empty($raw_countries)) {
            $blocked_countries = array_values(array_filter(array_map('trim', explode(',', strtoupper($raw_countries)))));
        }

        $local_geo = get_transient('waf_fw_local_public_geo') ?: get_option('waf_fw_local_server_country', '');
        if (empty($local_geo) && function_exists('wp_remote_get')) {
            $resp = wp_remote_get('http://ip-api.com/json/?fields=status,countryCode', ['timeout' => 0.8]);
            if (!is_wp_error($resp) && wp_remote_retrieve_response_code($resp) === 200) {
                $g = json_decode(wp_remote_retrieve_body($resp), true);
                if (!empty($g['countryCode'])) {
                    $local_geo = strtoupper(trim($g['countryCode']));
                    set_transient('waf_fw_local_public_geo', $local_geo, 86400);
                    update_option('waf_fw_local_server_country', $local_geo);
                }
            }
        }

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
            $country = $this->get_ip_country($ip);
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

            self::flush_telemetry();
        }
        return $result;
    }

    private function do_allow($ip, $url, $method, $user_agent, $message = 'Request allowed') {
        $this->logger->log_request([
            'ip' => $ip,
            'url' => $url,
            'method' => $method,
            'status' => 'allowed',
            'user_agent' => $user_agent,
        ]);
        waf_fw_bump_stat('allowed');

        $country = $this->get_ip_country($ip);
        $this->buffer_telemetry([
            'event_type' => 'allowed',
            'ip' => $ip,
            'url' => $url,
            'method' => $method,
            'attack_type' => null,
            'confidence' => 0.0,
            'user_agent' => $user_agent,
            'rule_matched' => '',
            'message' => $message,
            'status' => 'allowed',
            'action' => 'allowed',
            'country_code' => $country,
            'timestamp' => current_time('mysql'),
        ]);

        return $this->allowed_result($ip, $url, $method, $message);
    }

    private function blocked_result($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched = '') {
        $ref_id = strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 8));
        return [
            'status' => 'blocked',
            'ip' => $ip,
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

    private function check_country_block($ip) {
        $raw = get_option('waf_fw_blocked_countries', '');
        if (empty($raw)) return false;

        if (is_array($raw)) {
            $blocked = array_values(array_filter(array_map('strtoupper', array_map('trim', $raw))));
        } else {
            $blocked = array_values(array_filter(array_map('trim', explode(',', strtoupper($raw)))));
        }
        if (empty($blocked)) return false;

        $country_code = $this->get_ip_country($ip);
        if (empty($country_code) || $country_code === 'XX') return false;

        return in_array($country_code, $blocked, true);
    }

    private function get_ip_country($ip) {
        // Query param simulation for testing
        if (!empty($_GET['country_test'])) {
            $test_c = strtoupper(substr(trim(sanitize_text_field($_GET['country_test'])), 0, 2));
            if (strlen($test_c) === 2 && ctype_alpha($test_c)) return $test_c;
        }
        if (!empty($_GET['test_country'])) {
            $test_c = strtoupper(substr(trim(sanitize_text_field($_GET['test_country'])), 0, 2));
            if (strlen($test_c) === 2 && ctype_alpha($test_c)) return $test_c;
        }
        if (!empty($_GET['country'])) {
            $test_c = strtoupper(substr(trim(sanitize_text_field($_GET['country'])), 0, 2));
            if (strlen($test_c) === 2 && ctype_alpha($test_c)) return $test_c;
        }

        // 1. Direct Edge Headers from CDN / Reverse Proxies / GeoIP modules (Instant 0.001ms)
        $header_keys = [
            'HTTP_CF_IPCOUNTRY',
            'GEOIP_COUNTRY_CODE',
            'HTTP_GEOIP_COUNTRY_CODE',
            'HTTP_X_COUNTRY_CODE',
            'HTTP_X_GEOIP_COUNTRY',
            'HTTP_X_REAL_IP_COUNTRY',
            'HTTP_X_FORWARDED_COUNTRY',
        ];
        foreach ($header_keys as $hk) {
            if (!empty($_SERVER[$hk])) {
                $h_code = strtoupper(substr(trim($_SERVER[$hk]), 0, 2));
                if (strlen($h_code) === 2 && ctype_alpha($h_code) && $h_code !== 'XX' && $h_code !== 'T1') {
                    return $h_code;
                }
            }
        }

        // 2. Local loopback / private IP handling (development environments)
        $is_local = (empty($ip) || $ip === '127.0.0.1' || $ip === '::1' || $ip === '0.0.0.0' || strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || strpos($ip, '172.16.') === 0);
        if ($is_local) {
            $local_cached = get_option('waf_fw_local_server_country', '');
            if (!empty($local_cached) && strlen($local_cached) === 2 && $local_cached !== 'XX') {
                return strtoupper($local_cached);
            }
            return 'BD'; // Default local development country
        }

        // 3. Cached Public IP GeoIP lookup (0.005ms) - Never make blocking HTTP requests during page load
        $transient_key = 'waf_fw_geoip_' . md5($ip);
        if (function_exists('get_transient')) {
            $cached = get_transient($transient_key);
            if ($cached !== false && !empty($cached)) {
                if (is_array($cached)) {
                    $cached = $cached['countryCode'] ?? $cached['country_code'] ?? $cached['country'] ?? '';
                }
                if (is_string($cached) && strlen(trim($cached)) === 2) {
                    return strtoupper(trim($cached));
                }
            }
        }

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
