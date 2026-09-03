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
    private $timeout = 5;
    private $scan_timeout = 20;

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
        return !empty($this->base_url) && !empty($this->api_key) && get_option('waf_fw_connected', 'no') === 'yes';
    }

    public function refresh_config() {
        $url = (string) get_option('waf_fw_ml_api_url', '');
        if (empty($url) || strpos($url, 'mdefender-pro.io') !== false) {
            $url = 'https://mdefenderapi.onrender.com';
            update_option('waf_fw_ml_api_url', $url);
        }
        $this->base_url   = untrailingslashit($url);
        $this->api_key    = (string) get_option('waf_fw_ml_api_key', '');
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

    /**
     * Core HTTP helper. Returns the envelope's `data` array on success,
     * null on network failure / non-2xx / error envelope. Optionally stores
     * the HTTP status code for the caller via $status_ref.
     */
    private function request($method, $path, $body = null, &$status_ref = null, $timeout = null) {
        $headers = [
            'Authorization' => 'Bearer ' . $this->api_key,
            'Content-Type'  => 'application/json',
        ];
        if (!empty($this->site_token)) {
            $headers['X-Site-Token'] = $this->site_token;
        }
        // Verify TLS certificates for all remote (non-loopback) endpoints.
        // Only loopback/local development URLs (plain http / self-signed local
        // backend) disable verification, so API keys and file contents are not
        // exposed to MITM on a real deployment.
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

        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) {
            if ($status_ref !== null) {
                $status_ref['error'] = $response->get_error_message();
            }
            return null;
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        if ($status_ref !== null) {
            $status_ref['code'] = $code;
        }
        $raw = wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return null;
        }
        // Envelope: treat success=false or non-2xx as failure.
        if ($code >= 400 || (isset($data['success']) && $data['success'] === false)) {
            if ($status_ref !== null && isset($data['detail'])) {
                $status_ref['detail'] = is_string($data['detail']) ? $data['detail'] : json_encode($data['detail']);
            } elseif ($status_ref !== null && isset($data['error']['message'])) {
                $status_ref['detail'] = $data['error']['message'];
            }
            return null;
        }
        return isset($data['data']) && is_array($data['data']) ? $data['data'] : [];
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

        $body = [
            'api_key'        => $this->api_key,
            'domain'         => $this->get_domain(),
            'site_token'     => $this->site_token ? $this->site_token : 'connect',
            'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.0.0',
            'php_version'    => phpversion(),
            'wp_version'     => get_bloginfo('version'),
        ];

        $status_ref = [];
        $data = $this->request('POST', '/api/v1/wordpress/connect', $body, $status_ref, 15);

        if (!is_array($data)) {
            $err_msg = !empty($status_ref['detail']) ? $status_ref['detail'] : (!empty($status_ref['error']) ? $status_ref['error'] : 'Connection failed. Check that the API key belongs to this website domain in your MDefender-Pro dashboard.');
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
    public function heartbeat($stats = []) {
        $this->refresh_config();
        if (!$this->is_available()) {
            return null;
        }
        $data = $this->request('POST', '/api/v1/wordpress/heartbeat', [
            'api_key'        => $this->api_key,
            'domain'         => $this->get_domain(),
            'site_token'     => $this->site_token,
            'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.0.0',
            'status'         => 'online',
            'stats'          => (array) $stats,
        ]);
        if (is_array($data) && !empty($data['success'])) {
            return isset($data['data']) ? $data['data'] : $data;
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
        ]);
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
            'timeout'     => 2,
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
        ], null, $this->scan_timeout);
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
