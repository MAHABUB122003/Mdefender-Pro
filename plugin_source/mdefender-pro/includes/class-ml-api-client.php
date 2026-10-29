<?php
/**
 * MDefender-Pro cloud API client (v1 / SaaS backend).
 *
 * Authenticates with a website-scoped API key (mdf_live_...) issued by the
 * MDefender-Pro dashboard. All state lives server-side; the plugin only
 * forwards request metadata and file content and enforces the verdicts.
 *
 * Endpoints used:
 *   POST /api/v1/wordpress/connect      - register this WP site + get site token
 *   POST /api/v1/wordpress/heartbeat    - periodic online/status push
 *   POST /api/v1/waf/analyze            - ML WAF decision (Bearer key)
 *   POST /api/v1/malware/plugin-scan    - malware scan of a single file
 *   GET  /api/v1/waf/plugin-events      - cloud events for this website
 *   GET  /api/v1/malware/plugin-findings- cloud findings for this website
 *
 * All responses use the envelope { success, data?, error?{code,message} }.
 * On failure the plugin degrades gracefully to its local rules - it never
 * blocks a whole site because the cloud is unreachable.
 */

defined('ABSPATH') || exit;

class WAF_FW_ML_Api_Client {
    private static $_instance = null;
    private $base_url;
    private $api_key;
    private $website_id;
    private $site_token;
    private $timeout = 10;
    private $scan_timeout = 25;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->refresh_config();
    }

    /** True when the cloud connection can be attempted. */
    public function is_available() {
        return !empty($this->base_url) && !empty($this->api_key);
    }

    public function refresh_config() {
        $url = (string) get_option('waf_fw_ml_api_url', '');

        if (empty($url) || strpos($url, 'onrender.com') !== false || strpos($url, 'mdefender-pro.io') !== false || $url === 'http://127.0.0.1:8000') {
            $url = 'https://mdefender-pro.crafix.tech';
            update_option('waf_fw_ml_api_url', $url);
        }
        $this->base_url   = untrailingslashit($url);
        $k = (string) get_option('waf_fw_ml_api_key', '');
        if (empty($k)) {
            $k = (string) get_option('waf_fw_api_key', '');
            if (!empty($k)) {
                update_option('waf_fw_ml_api_key', $k);
            }
        }
        $this->api_key    = $k;
        $this->website_id = (string) get_option('waf_fw_website_id', '');
        $this->site_token = (string) get_option('waf_fw_site_token', '');
    }

    public function get_base_url() {
        return $this->base_url;
    }

    public function get_website_id() {
        return $this->website_id;
    }

    /** Single page domain this plugin is protecting. */
    private function get_domain() {
        $host = parse_url(home_url(), PHP_URL_HOST);
        return $host ? $host : 'localhost';
    }

    private $last_error = '';
    private $last_status_code = 0;

    public function get_last_error() {
        return $this->last_error;
    }

    /**
     * Core HTTP helper. Returns the envelope's `data` array on success,
     * null on network failure / non-2xx / error envelope.
     */
    private function request($method, $path, $body = null, $timeout = null) {
        $this->last_error = '';
        $this->last_status_code = 0;

        $headers = [
            'Authorization' => 'Bearer ' . $this->api_key,
            'Content-Type'  => 'application/json',
            'User-Agent'    => 'WordPress/' . get_bloginfo('version') . '; ' . home_url(),
        ];
        if (!empty($this->site_token)) {
            $headers['X-Site-Token'] = $this->site_token;
        }

        $host = parse_url($this->base_url, PHP_URL_HOST);
        $is_loopback = $host === 'localhost' || $host === '127.0.0.1' || $host === '::1'
            || (defined('WAF_FW_DEV_MODE') && WAF_FW_DEV_MODE);
        $scheme = wp_parse_url($this->base_url, PHP_URL_SCHEME) ?: '';

        $args = [
            'method'      => $method,
            'timeout'     => $timeout ? $timeout : $this->timeout,
            'headers'     => $headers,
            'redirection' => 3,
            'sslverify'   => ($is_loopback || $scheme !== 'https') ? false : true,
        ];
        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }

        $url = $this->base_url . $path;
        if ($method === 'GET' && $body !== null) {
            $url = add_query_arg($body, $url);
            unset($args['body']);
        }

        $eff_timeout = $timeout ?: $this->timeout;
        $conn_timeout_ms = max(300, min((int)($eff_timeout * 1000), 5000));
        $curl_hook = function($handle) use ($conn_timeout_ms) {
            if (is_resource($handle) || (is_object($handle) && get_class($handle) === 'CurlHandle')) {
                curl_setopt($handle, CURLOPT_CONNECTTIMEOUT_MS, $conn_timeout_ms);
                if (defined('CURLOPT_RESOLVE')) {
                    curl_setopt($handle, CURLOPT_RESOLVE, [
                        'mdefender-pro.crafix.tech:443:217.15.170.82',
                        'mdefender-pro.crafix.tech:80:217.15.170.82'
                    ]);
                }
            }
        };
        add_action('http_api_curl', $curl_hook);
        $response = wp_remote_request($url, $args);
        remove_action('http_api_curl', $curl_hook);
        if (is_wp_error($response)) {
            // If SSL verification failed on a shared host with outdated root CAs, retry once with sslverify=false
            if (!empty($args['sslverify'])) {
                $args['sslverify'] = false;
                add_action('http_api_curl', $curl_hook);
                $response = wp_remote_request($url, $args);
                remove_action('http_api_curl', $curl_hook);
            }
        }
        if (is_wp_error($response)) {
            // Auto-failover: if primary endpoint is blocked by hairpin NAT, firewall or cURL error,
            // try the alternate endpoints (e.g. direct backend port 8000 or localhost loopback).
            $fallback_targets = [];
            if (strpos($this->base_url, 'mdefender-pro.crafix.tech') !== false) {
                $fallback_targets = ['http://217.15.170.82', 'http://217.15.170.82:8000', 'http://127.0.0.1:8000'];
            } elseif (strpos($this->base_url, '127.0.0.1') !== false || strpos($this->base_url, 'localhost') !== false) {
                $fallback_targets = ['https://mdefender-pro.crafix.tech', 'http://217.15.170.82', 'http://217.15.170.82:8000'];
            } elseif (strpos($this->base_url, '217.15.170.82') !== false) {
                $fallback_targets = ['http://217.15.170.82', 'https://mdefender-pro.crafix.tech', 'http://127.0.0.1:8000'];
            }

            foreach ($fallback_targets as $fb_base) {
                $fb_url = $fb_base . $path;
                if ($method === 'GET' && $body !== null) {
                    $fb_url = add_query_arg($body, $fb_url);
                }
                $fb_args = $args;
                $fb_args['sslverify'] = false;
                $fb_res = wp_remote_request($fb_url, $fb_args);
                if (!is_wp_error($fb_res) && (int) wp_remote_retrieve_response_code($fb_res) > 0 && (int) wp_remote_retrieve_response_code($fb_res) < 500) {
                    $response = $fb_res;
                    update_option('waf_fw_ml_api_url', $fb_base);
                    $this->base_url = $fb_base;
                    break;
                }
            }
        }
        if (is_wp_error($response)) {
            $this->last_error = $response->get_error_message();
            return null;
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        $this->last_status_code = $code;
        $raw = wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->last_error = 'Invalid JSON response from cloud service.';
            return null;
        }
        // Envelope: treat success=false or non-2xx as failure.
        if ($code >= 400 || (isset($data['success']) && $data['success'] === false)) {
            if (isset($data['detail'])) {
                $this->last_error = is_string($data['detail']) ? $data['detail'] : json_encode($data['detail']);
            } elseif (isset($data['error']['message'])) {
                $this->last_error = $data['error']['message'];
            } else {
                $this->last_error = 'HTTP error ' . $code;
            }
            return null;
        }
        return isset($data['data']) && is_array($data['data']) ? $data['data'] : [];
    }

    /**
     * Collect full WordPress inventory (plugins, themes, active theme, hardening options, backups).
     * Used for real-time fleet synchronization with the MDefender-Pro dashboard.
     */
    public static function get_site_inventory() {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // 1. Plugins Audit
        $all_plugins = function_exists('get_plugins') ? get_plugins() : [];
        $active_plugins = (array) get_option('active_plugins', []);
        $update_plugins = get_site_transient('update_plugins');

        $plugins = [];
        foreach ($all_plugins as $plugin_file => $data) {
            $is_active = in_array($plugin_file, $active_plugins, true);
            $has_update = false;
            $new_version = '';
            if ($update_plugins && isset($update_plugins->response[$plugin_file])) {
                $has_update = true;
                $new_version = $update_plugins->response[$plugin_file]->new_version ?? '';
            }
            $plugins[] = [
                'id' => sanitize_title($data['Name']),
                'file' => $plugin_file,
                'slug' => dirname($plugin_file) === '.' ? sanitize_title($data['Name']) : dirname($plugin_file),
                'name' => $data['Name'],
                'version' => $data['Version'],
                'author' => strip_tags($data['Author'] ?? ''),
                'status' => $is_active ? 'active' : 'inactive',
                'update_available' => $has_update,
                'new_version' => $new_version,
            ];
        }

        // 2. Themes Audit
        $all_themes = function_exists('wp_get_themes') ? wp_get_themes() : [];
        $active_theme = function_exists('wp_get_theme') ? wp_get_theme() : null;
        $active_slug = $active_theme ? $active_theme->get_stylesheet() : '';
        $update_themes = get_site_transient('update_themes');

        $themes = [];
        foreach ($all_themes as $theme_slug => $tObj) {
            $is_active = ($active_slug === $theme_slug);
            $has_update = false;
            $new_ver = '';
            if ($update_themes && isset($update_themes->response[$theme_slug])) {
                $has_update = true;
                $new_ver = $update_themes->response[$theme_slug]['new_version'] ?? '';
            }
            $themes[] = [
                'id' => $theme_slug,
                'slug' => $theme_slug,
                'name' => $tObj->get('Name'),
                'version' => $tObj->get('Version'),
                'author' => strip_tags($tObj->get('Author') ?? ''),
                'active' => $is_active,
                'is_active' => $is_active,
                'status' => $is_active ? 'active' : 'standby',
                'update_available' => $has_update,
                'new_version' => $new_ver,
            ];
        }

        // 3. Hardening Configuration
        $hardening = [
            'disable_file_editing' => get_option('waf_fw_disable_file_editing', 'yes') === 'yes',
            'disable_xmlrpc' => get_option('waf_fw_disable_xmlrpc', 'yes') === 'yes',
            'hide_wp_version' => get_option('waf_harden_hide_wp_version', 'yes') === 'yes',
            'prevent_user_enumeration' => get_option('waf_fw_prevent_user_enumeration', 'yes') === 'yes',
            'block_uploads_php' => get_option('waf_harden_block_uploads_php', 'yes') === 'yes',
            'security_headers' => get_option('waf_harden_security_headers', 'enabled') === 'enabled',
            'file_permissions_check' => true,
            'login_two_factor' => get_option('waf_harden_login_guard', 'enabled') === 'enabled',
            'disable_directory_listing' => get_option('waf_fw_disable_directory_listing', 'yes') === 'yes',
        ];

        // 4. Backups Inventory
        $backups = [];
        if (class_exists('WAF_FW_Backup_Engine')) {
            $raw_bks = WAF_FW_Backup_Engine::instance()->get_backups();
            if (is_array($raw_bks)) {
                foreach ($raw_bks as $bk) {
                    $backups[] = [
                        'id' => $bk['id'] ?? $bk['filename'],
                        'filename' => $bk['filename'] ?? '',
                        'name' => $bk['note'] ?? ($bk['filename'] ?? 'Backup Snapshot'),
                        'size' => $bk['size_formatted'] ?? '0 MB',
                        'type' => $bk['type'] ?? 'full',
                        'date' => $bk['created_at'] ?? 'Recently',
                        'status' => 'verified',
                    ];
                }
            }
        }

        return [
            'plugins' => $plugins,
            'themes' => $themes,
            'theme' => $active_theme ? $active_theme->get('Name') : 'Active WordPress Theme',
            'hardening' => $hardening,
            'backups' => $backups,
            'wp_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
        ];
    }

    /**
     * Register this site with the cloud. Exchanges the API key for a site
     * token and stores the connection details returned by the server.
     * Returns ['success' => bool, 'message' => string, 'data' => array|null].
     */
    public function connect() {
        $this->refresh_config();
        if (empty($this->api_key)) {
            return [
                'success' => false,
                'message' => 'Enter your website API key first.',
            ];
        }

        $inventory = self::get_site_inventory();
        $b_cnt = (int) get_option('waf_fw_stats_blocked', 0);
        $a_cnt = (int) get_option('waf_fw_stats_allowed', 0);
        global $wpdb;
        $tbl = $wpdb->prefix . 'waf_fw_logs';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$tbl}'") === $tbl) {
            $tot_logs = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$tbl}");
            $blk_logs = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$tbl} WHERE status = 'blocked'");
            $b_cnt = max($b_cnt, $blk_logs);
            $a_cnt = max($a_cnt, $tot_logs - $blk_logs);
        }

        $body = [
            'api_key'        => $this->api_key,
            'domain'         => $this->get_domain(),
            'site_token'     => $this->site_token ? $this->site_token : 'connect',
            'site_url'       => function_exists('home_url') ? home_url() : '',
            'home_url'       => function_exists('home_url') ? home_url() : '',
            'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.3.0',
            'php_version'    => phpversion(),
            'wp_version'     => get_bloginfo('version'),
            'stats'          => [
                'requests_blocked' => $b_cnt,
                'requests_allowed' => $a_cnt,
            ],
            'plugins'        => $inventory['plugins'] ?? [],
            'themes'         => $inventory['themes'] ?? [],
            'theme'          => $inventory['theme'] ?? '',
            'hardening'      => $inventory['hardening'] ?? [],
            'backups'        => $inventory['backups'] ?? [],
        ];

        $data = $this->request('POST', '/api/v1/wordpress/connect', $body, 15);

        if (!is_array($data) || empty($data)) {
            $err_msg = !empty($this->last_error) ? $this->last_error : 'Connection failed. Check that the API key belongs to this website domain in your MDefender-Pro dashboard.';
            return [
                'success' => false,
                'message' => $err_msg,
            ];
        }

        if (!empty($data['site_token'])) {
            update_option('waf_fw_site_token', sanitize_text_field($data['site_token']));
            $this->site_token = $data['site_token'];
        }
        if (!empty($data['website_id'])) {
            update_option('waf_fw_website_id', sanitize_text_field($data['website_id']));
            $this->website_id = $data['website_id'];
        }
        update_option('waf_fw_connected', 'yes');
        update_option('waf_fw_connected_at', current_time('mysql'));

        // Fire immediate heartbeat so cloud dashboard instantly updates with live counters
        $this->heartbeat([
            'requests_blocked' => $b_cnt,
            'requests_allowed' => $a_cnt,
        ], 4.0);

        return [
            'success' => true,
            'message' => 'Connected to MDefender-Pro cloud (' . ($data['mode'] ?? 'protect') . ' mode).',
            'data'    => $data,
        ];
    }

    /**
     * Periodic heartbeat so the dashboard shows this site online.
     * $stats is an associative array of counters (requests_blocked etc).
     */
    public function heartbeat($stats = [], $timeout = 4.0) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return null;
        }

        $inventory = self::get_site_inventory();

        $payload = [
            'api_key'        => $this->api_key,
            'domain'         => $this->get_domain(),
            'site_token'     => $this->site_token,
            'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.3.0',
            'status'         => 'online',
            'plugins'        => $inventory['plugins'] ?? [],
            'themes'         => $inventory['themes'] ?? [],
            'theme'          => $inventory['theme'] ?? '',
            'hardening'      => $inventory['hardening'] ?? [],
            'backups'        => $inventory['backups'] ?? [],
        ];
        if (!empty($stats) && is_array($stats)) {
            $payload['stats'] = $stats;
        }
        $data = $this->request('POST', '/api/v1/wordpress/heartbeat', $payload, $timeout);
        if (is_array($data)) {
            return $data;
        }
        // Fallback retry without stats if backend version threw an error on stats parsing
        if (!empty($stats)) {
            unset($payload['stats']);
            $fallback_data = $this->request('POST', '/api/v1/wordpress/heartbeat', $payload, $timeout);
            if (is_array($fallback_data)) {
                return $fallback_data;
            }
        }
        return null;
    }

    /**
     * Send one request through the cloud ML WAF. $request_data should contain
     * url, method, body, query_string, query_params, headers, ip.
     * Returns the backend decision array or null.
     */
    public function analyze($request_data) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return null;
        }
        $domain = $this->get_domain();
        return $this->request('POST', '/api/v1/waf/analyze', [
            'domain'  => $domain,
            'mode'    => get_option('waf_fw_cloud_mode', 'protect'),
            'request' => is_array($request_data) ? $request_data : ['url' => '/', 'method' => 'GET', 'body' => '', 'headers' => [], 'ip' => ''],
        ], 0.35);
    }

    /**
     * Fire-and-forget report of a request blocked by this plugin's LOCAL
     * rules. Sends the same payload the WAF would forward for a normal
     * analysis so the MDefender dashboard records the block server-side.
     */
    public function report_local_block($domain, $mode, $request_data, $ip = '') {
        $this->refresh_config();
        if (!$this->is_available()) {
            return false;
        }
        $payload = [
            'api_key' => $this->api_key,
            'domain'  => $domain,
            'mode'    => $mode ? $mode : 'protect',
            'request' => is_array($request_data)
                ? array_merge($request_data, ['ip' => $ip])
                : ['url' => '/', 'method' => 'GET', 'body' => '', 'headers' => [], 'ip' => $ip],
        ];
        $host = parse_url($this->base_url, PHP_URL_HOST);
        $is_loopback = $host === 'localhost' || $host === '127.0.0.1' || $host === '::1'
            || (defined('WAF_FW_DEV_MODE') && WAF_FW_DEV_MODE);
        $scheme = wp_parse_url($this->base_url, PHP_URL_SCHEME) ?: '';
        wp_remote_post($this->base_url . '/api/v1/waf/analyze', [
            'timeout'     => 1,
            'blocking'    => false,
            'sslverify'   => ($is_loopback || $scheme !== 'https') ? false : true,
            'redirection' => 0,
            'headers'     => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type'  => 'application/json',
            ],
            'body'        => wp_json_encode($payload),
        ]);
        return true;
    }

    /**
     * Fire-and-forget push of batched requests/logs to the cloud telemetry ingestion pipeline.
     * Guaranteed non-blocking so visitor response time is completely unaffected (0ms user latency).
     */
    public function send_telemetry_batch($domain, $events) {
        $this->refresh_config();
        if (!$this->is_available() || empty($events) || !is_array($events)) {
            return false;
        }
        $payload = [
            'api_key' => $this->api_key,
            'domain'  => $domain ? $domain : $this->get_domain(),
            'events'  => $events,
        ];
        $host = parse_url($this->base_url, PHP_URL_HOST);
        $url = $this->base_url . '/api/v1/waf/telemetry';
        $json_body = wp_json_encode($payload);

        // 1. Primary: WordPress Native Asynchronous Non-Blocking HTTP Post (0ms visitor latency)
        if (function_exists('wp_remote_post')) {
            $agent = (function_exists('get_bloginfo') ? get_bloginfo('version') : '6.7') . '; ' . (function_exists('home_url') ? home_url() : 'localhost');
            @wp_remote_post($url, [
                'timeout'     => 0.4,
                'blocking'    => false, // Completely decoupled from visitor response time
                'sslverify'   => false,
                'redirection' => 0,
                'headers'     => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type'  => 'application/json',
                    'User-Agent'    => 'WordPress/' . $agent,
                ],
                'body'        => $json_body,
            ]);
            return true;
        }

        // 2. Fallback: Fast cURL with sub-second millisecond timeout for standalone/CLI runtimes
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $json_body);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $this->api_key,
                'Content-Type: application/json',
                'User-Agent: MDefender-Pro/4.3.0'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT_MS, 400);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 300);
            curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

            if (defined('CURLOPT_RESOLVE') && $host === 'mdefender-pro.crafix.tech') {
                curl_setopt($ch, CURLOPT_RESOLVE, [
                    'mdefender-pro.crafix.tech:443:217.15.170.82',
                    'mdefender-pro.crafix.tech:80:217.15.170.82'
                ]);
            }

            @curl_exec($ch);
            @curl_close($ch);
            return true;
        }
        return true;
    }

    /**
     * Report an alert or threat discovery immediately to the cloud dashboard.
     */
    public function report_alert($title, $message, $alert_type = 'malware', $severity = 'critical', $details = [], $file_path = '', $threat_name = '') {
        $this->refresh_config();
        if (!$this->is_available()) {
            return false;
        }
        $domain = $this->get_domain();
        return $this->request('POST', '/api/v1/malware/report-alert', [
            'domain'      => $domain,
            'api_key'     => $this->api_key,
            'site_token'  => $this->site_token,
            'alert_type'  => $alert_type,
            'title'       => $title,
            'message'     => $message,
            'severity'    => $severity,
            'details'     => $details,
            'file_path'   => $file_path,
            'threat_name' => $threat_name,
        ], 3.0);
    }


    /**
     * Scan a single file content on the cloud malware detector.
     * Returns ['verdict','risk_score','confidence','family','reasons'] or null.
     */
    public function scan_file($filename, $content, $source = null) {
        $this->refresh_config();
        if (!$this->is_available() || empty($content)) {
            return null;
        }
        return $this->request('POST', '/api/v1/malware/plugin-scan', [
            'api_key'        => $this->api_key,
            'domain'         => $this->get_domain(),
            'site_token'     => $this->site_token,
            'filename'       => sanitize_file_name($filename),
            'content_base64' => base64_encode($content),
            'source'         => $source ? sanitize_text_field($source) : null,
        ], $this->scan_timeout);
    }

    /**
     * Check installed plugins/themes against the central vulnerability
     * database. Returns the list of matching findings, or null on failure.
     *
     * @param array $plugins List of ["slug", "version", "name"].
     * @param array $themes  List of ["slug", "version", "name"].
     * @return array|null
     */
    public function check_vulnerabilities($plugins = [], $themes = []) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return null;
        }
        $data = $this->request('POST', '/api/v1/malware/check-vulnerabilities', [
            'api_key' => $this->api_key,
            'domain'  => $this->get_domain(),
            'plugins' => (array) $plugins,
            'themes'  => (array) $themes,
        ]);
        if (!is_array($data)) {
            return null;
        }
        return $data['findings'] ?? [];
    }

    /** Recent cloud WAF events for this website (list). */
    public function get_events($limit = 50) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return [];
        }
        $data = $this->request('GET', '/api/v1/waf/plugin-events', ['limit' => (int) $limit]);
        return isset($data['events']) ? $data['events'] : [];
    }

    /** Recent cloud malware findings for this website (list). */
    public function get_findings($limit = 50) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return [];
        }
        $data = $this->request('GET', '/api/v1/malware/plugin-findings', ['limit' => (int) $limit]);
        return isset($data['findings']) ? $data['findings'] : [];
    }

    /**
     * Pulls the latest Global Threat Intelligence Feed (blacklisted IPs & zero-day hashes)
     * and caches them in WordPress transients for instant 0ms edge blocking.
     */
    public function sync_threat_intel($limit = 200) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return ['success' => false, 'message' => 'Cloud connection not active.'];
        }
        $data = $this->request('GET', '/api/v1/waf/threat-intel', ['limit' => (int) $limit]);
        if (!is_array($data) || !isset($data['threat_ips'])) {
            return ['success' => false, 'message' => $this->get_last_error() ?: 'Could not sync threat intelligence feed.'];
        }

        $threat_ips = (array) $data['threat_ips'];
        set_transient('waf_fw_cloud_threat_ips', $threat_ips, 3600); // 1 hour cache
        update_option('waf_fw_threat_intel_synced_at', current_time('mysql'));
        update_option('waf_fw_threat_intel_count', count($threat_ips));

        return [
            'success' => true,
            'threat_ips' => $threat_ips,
            'total' => count($threat_ips),
            'synced_at' => current_time('mysql')
        ];
    }

    /**
     * Connection test used by the settings screen. Performs the connect
     * handshake (registering the site) and reports the outcome.
     */
    public function test_connection() {
        return $this->connect();
    }

    /** Lightweight status for the admin UI. */
    public function get_status() {
        $this->refresh_config();
        $connected = get_option('waf_fw_connected', 'no') === 'yes';
        $mode = get_option('waf_fw_cloud_mode', 'protect');
        return [
            'configured'   => $this->is_available(),
            'connected'    => $connected,
            'mode'         => $mode,
            'model'        => 'MDefender-Pro Cloud (ML WAF + malware)',
            'model_loaded' => $connected && $this->is_available(),
            'model_version' => '',
        ];
    }
}
