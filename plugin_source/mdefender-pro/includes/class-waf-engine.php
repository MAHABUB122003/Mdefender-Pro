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
    }

    public function get_client_ip() {
        $ip = '';
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
        } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            $ip = trim($_SERVER['HTTP_X_REAL_IP']);
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ips[0]);
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $ip = trim($_SERVER['REMOTE_ADDR']);
        }
        return filter_var($ip, FILTER_VALIDATE_IP) ?: '0.0.0.0';
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
                return $this->allowed_result($ip, $url, $method, 'Whitelisted IP');
            }

            if ($this->learning_mode) {
                $this->logger->log_request([
                    'ip' => $ip, 'url' => $url, 'method' => $method,
                    'status' => 'learning', 'user_agent' => $user_agent,
                ]);
                return $this->allowed_result($ip, $url, $method, 'Learning mode - allowing all');
            }

            if ($this->check_country_block($ip)) {
                return $this->blocked_result($ip, $url, $method, 'Country Blocked', 1.0, $user_agent, $referer, $body, 'Country blocked by policy');
            }

            // JA4 Client Fingerprinting & AI Bot Assessment
            if ($this->ja4) {
                $ja4_data = $this->ja4->calculate_ja4h($headers, $_SERVER);
                if ($ja4_data['risk_level'] === 'critical' || ($ja4_data['is_automated_agent'] && $ja4_data['bot_type'] === 'exploit_fuzzer')) {
                    $this->logger->log_attack([
                        'ip' => $ip, 'url' => $url, 'method' => $method,
                        'attack_type' => 'Automated Exploit / Scanner Tool',
                        'confidence' => 0.99,
                        'user_agent' => $user_agent, 'referer' => $referer,
                        'request_body' => $body, 'rule_matched' => 'JA4 Fingerprint: ' . $ja4_data['ja4h'],
                        'message' => 'Automated vulnerability scanner signature detected (' . $ja4_data['bot_type'] . ')',
                        'status' => 'blocked',
                        'timestamp' => current_time('mysql'),
                    ]);
                    return $this->blocked_result($ip, $url, $method, 'Automated Exploit / Scanner Tool', 0.99, $user_agent, $referer, $body, 'Automated exploit scanner detected', 'JA4 Fingerprint: ' . $ja4_data['ja4h']);
                }
            }

            if ($this->rate_limiter->is_rate_limited($ip)) {
                $this->logger->log_attack([
                    'ip' => $ip, 'url' => $url, 'method' => $method,
                    'attack_type' => 'Rate Limiting', 'confidence' => 1.0,
                    'user_agent' => $user_agent, 'referer' => $referer,
                    'request_body' => $body, 'rule_matched' => '',
                    'message' => 'Rate limit exceeded', 'status' => 'blocked',
                    'timestamp' => current_time('mysql'),
                ]);
                return $this->blocked_result($ip, $url, $method, 'Rate Limiting', 1.0, $user_agent, $referer, $body, 'Rate limit exceeded');
            }

            if ($this->ip_filter->is_blacklisted($ip)) {
                $this->logger->log_attack([
                    'ip' => $ip, 'url' => $url, 'method' => $method,
                    'attack_type' => 'Blacklisted IP', 'confidence' => 1.0,
                    'user_agent' => $user_agent, 'referer' => $referer,
                    'request_body' => $body, 'rule_matched' => 'Blacklist Rule',
                    'message' => 'IP is blacklisted', 'status' => 'blocked',
                    'timestamp' => current_time('mysql'),
                ]);
                $this->report_block_to_cloud($ip, $url, $method, $body, [
                    'ip' => $ip, 'url' => $url, 'method' => $method, 'user_agent' => $user_agent,
                    'headers' => $headers, 'attack_type' => 'Blacklisted IP',
                ]);
                waf_fw_bump_stat('blocked');
                return $this->blocked_result($ip, $url, $method, 'Blacklisted IP', 1.0, $user_agent, $referer, $body, 'IP is blacklisted', 'Blacklist Rule');
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
                $this->report_block_to_cloud($ip, $url, $method, $body, $request_data);
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
                $this->report_block_to_cloud($ip, $url, $method, $body, $request_data);
                return $this->do_block($ip, $url, $method, $attack_type, 0.85, $user_agent, $referer, $body, "Feature-based detection: $attack_type");
            }

            $cloud_mode = (string) get_option('waf_fw_cloud_mode', 'protect');
            $ml_confidence = 0.0;

            // Optional Cloud ML arbitration only for ambiguous payloads
            if ($cloud_mode !== 'off' && $this->ml_client->is_available()) {
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

            $security_level = get_option('waf_fw_security_level', 'high');
            if ($security_level === 'high') {
                $attack_type = $this->feature_extractor->get_attack_type($features) ?: 'Suspicious';
                return $this->do_block($ip, $url, $method, $attack_type, 0.75, $user_agent, $referer, $body, "High security: Suspicious pattern detected");
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
        $blocked_rows = $wpdb->get_results("SELECT ip_address FROM $blacklist_table");
        $bl_map = [];
        if ($blocked_rows) {
            foreach ($blocked_rows as $row) {
                $bl_map[$row->ip_address] = true;
            }
        }

        $cloud_bl = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cloud_bl)) {
            foreach ($cloud_bl as $ip) {
                $bl_map[$ip] = true;
            }
        }

        $cache_payload = [
            'enabled' => get_option('waf_fw_protection_enabled', 'yes') === 'yes',
            'updated_at' => time(),
            'blacklist_ips' => $bl_map,
        ];

        @file_put_contents($data_dir . '/waf_fast_cache.json', json_encode($cache_payload, JSON_PRETTY_PRINT));
        if (function_exists('apcu_store')) {
            apcu_store('mdefender_waf_fast_cache', $cache_payload, 60);
        }
    }

    private function report_block_to_cloud($ip, $url, $method, $body, $request_data) {
        if ((string) get_option('waf_fw_cloud_mode', 'protect') === 'off') {
            return;
        }
        if (!$this->ml_client->is_available()) {
            return;
        }
        $domain = function_exists('home_url') ? parse_url(home_url(), PHP_URL_HOST) : ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $this->ml_client->report_local_block($domain ? $domain : 'localhost', 'protect', $request_data, $ip);
    }

    private function do_block($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched = '') {
        $result = $this->blocked_result($ip, $url, $method, $attack_type, $confidence, $user_agent, $referer, $body, $message, $rule_matched);
        $this->rate_limiter->increment($ip);
        $this->logger->log_attack($result);
        return $result;
    }

    private function do_allow($ip, $url, $method, $user_agent) {
        $this->logger->log_request([
            'ip' => $ip,
            'url' => $url,
            'method' => $method,
            'status' => 'allowed',
            'user_agent' => $user_agent,
        ]);
        return $this->allowed_result($ip, $url, $method, 'Request allowed');
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
        $blocked_countries = get_option('waf_fw_blocked_countries', '');
        if (empty($blocked_countries)) return false;

        $country_code = $this->get_ip_country($ip);
        if (!$country_code) return false;

        $blocked = array_map('trim', explode(',', strtoupper($blocked_countries)));
        return in_array($country_code, $blocked);
    }

    private function get_ip_country($ip) {
        $transient_key = 'waf_fw_geoip_' . md5($ip);
        if (function_exists('get_transient')) {
            $cached = get_transient($transient_key);
            if ($cached !== false) {
                return $cached;
            }
        }

        if (!function_exists('wp_remote_get') || !function_exists('wp_remote_retrieve_body') || !function_exists('is_wp_error')) {
            return false;
        }

        $response = wp_remote_get("http://ip-api.com/json/{$ip}?fields=countryCode", ['timeout' => 3]);
        if (is_wp_error($response)) return false;
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $country_code = $data['countryCode'] ?? '';

        if (function_exists('set_transient')) {
            $hour = defined('HOUR_IN_SECONDS') ? HOUR_IN_SECONDS : 3600;
            set_transient($transient_key, $country_code, 12 * $hour);
        }
        return $country_code ?: false;
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
