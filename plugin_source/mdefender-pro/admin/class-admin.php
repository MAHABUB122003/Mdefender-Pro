<?php
defined('ABSPATH') || exit;

/**
 * MDefender-Pro Enterprise Agent Admin Controller
 * 
 * Minimalist, ultra-lightweight WordPress admin controller for the MDefender Pro Agent.
 * All complex fleet operations, rule authoring, live logs, and threat intelligence
 * are securely orchestrated from the central MDefender Pro Cloud User Dashboard.
 *
 * @package MDefender-Pro
 */
class WAF_FW_Admin {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        self::$_instance = $this;
        add_action('init', [$this, 'handle_legacy_redirects'], 1);
        add_action('admin_menu', [$this, 'add_admin_menu'], 9);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_head', [$this, 'admin_head_styles']);
        add_action('admin_notices', [$this, 'show_admin_notifications']);
        add_action('admin_page_access_denied', [$this, 'handle_access_denied_fallback']);
        add_action('wp_ajax_waf_connector_save_connection', [$this, 'ajax_save_connection']);
        add_action('wp_ajax_waf_connector_disconnect', [$this, 'ajax_disconnect']);
        add_action('wp_ajax_waf_connector_sync_license', [$this, 'ajax_sync_license']);
        add_action('rest_api_init', [$this, 'register_license_sync_route']);
    }

    public function handle_legacy_redirects() {
        if (isset($_GET['page'])) {
            $page = sanitize_text_field($_GET['page']);
            $legacy_pages = [
                'waf-firewall-rules', 'waf-firewall-blacklist', 'waf-firewall-logs',
                'waf-firewall-scan', 'waf-firewall-hardening', 'waf-firewall-backup',
                'waf-firewall-tools', 'waf-firewall-settings', 'waf-firewall-about'
            ];
            if (in_array($page, $legacy_pages, true)) {
                $extra = !empty($_GET['waf_setup']) ? '&waf_setup=1' : '';
                wp_safe_redirect(admin_url('admin.php?page=waf-firewall' . $extra));
                exit;
            }
        }
    }

    public function handle_access_denied_fallback() {
        if (isset($_GET['page']) && strpos($_GET['page'], 'waf-firewall') === 0) {
            wp_safe_redirect(admin_url('admin.php?page=waf-firewall'));
            exit;
        }
    }

    public function show_admin_notifications() {
        $screen = get_current_screen();
        if (!$screen || strpos($screen->id, 'waf-firewall') === false) return;

        if (function_exists('waf_fw_is_cloud_active') && !waf_fw_is_cloud_active()) {
            echo '<div class="notice notice-warning" style="border-left: 4px solid #E8792F; background: #FFFBF7; padding: 12px 16px; margin: 15px 0;">' .
                 '<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">' .
                 '<div>' .
                 '<strong style="color: #c25e1a; font-size: 13px;">🛡️ MDefender Pro Inactive (Dormant Mode)</strong>' .
                 '<p style="margin: 4px 0 0 0; color: #475569; font-size: 12.5px;">Your website is currently <strong>UNPROTECTED</strong>. An active MDefender Pro Cloud API key is required to enable the Web Application Firewall, AI threat intelligence, and malware scanning.</p>' .
                 '</div>' .
                 '<a href="' . esc_url(admin_url('admin.php?page=waf-firewall-agent')) . '" class="button button-primary" style="background: #E8792F; border-color: #d0651d; font-weight: 600; text-shadow: none;">Connect Cloud API Key &rarr;</a>' .
                 '</div>' .
                 '</div>';
            return;
        }

        $protection = get_option('waf_fw_protection_enabled', 'yes');
        if ($protection !== 'yes') {
            echo '<div class="notice notice-error is-dismissible"><p><strong>MDefender-Pro:</strong> Protection is DISABLED. Your website is not protected. <a href="' . admin_url('admin.php?page=waf-firewall') . '">Enable protection</a>.</p></div>';
        }
    }

    public function admin_head_styles() {
        ?>
        <style>
            #adminmenu .toplevel_page_waf-firewall .wp-menu-image {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #adminmenu .toplevel_page_waf-firewall .wp-menu-image img {
                width: 20px;
                height: 20px;
                padding: 0;
                margin-top: 7px;
                border-radius: 4px;
                object-fit: contain;
                opacity: 0.95;
                transition: transform 0.15s ease, opacity 0.15s ease;
            }
            #adminmenu .toplevel_page_waf-firewall:hover .wp-menu-image img,
            #adminmenu .toplevel_page_waf-firewall.current .wp-menu-image img {
                opacity: 1;
                transform: scale(1.08);
            }
            .waf-badge-pro {
                background: #E8792F;
                color: #fff;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 4px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }
            #adminmenu .wp-submenu li a[href*="page=waf-firewall-"] {
                display: none !important;
            }
        </style>
        <?php
    }

    public function add_admin_menu() {
        $icon_url = defined('WAF_FW_PLUGIN_URL') ? WAF_FW_PLUGIN_URL . 'assets/images/mdefender-icon.png' : 'dashicons-shield';
        add_menu_page(
            'MDefender-Pro - Security Agent',
            'MDefender-Pro',
            'manage_options',
            'waf-firewall',
            [$this, 'render_agent_dashboard'],
            $icon_url,
            100
        );

        // Alias legacy routes to agent dashboard for backward compatibility
        $legacy_pages = [
            'waf-firewall-settings', 'waf-firewall-rules', 'waf-firewall-blacklist',
            'waf-firewall-logs', 'waf-firewall-scan', 'waf-firewall-hardening',
            'waf-firewall-backup', 'waf-firewall-tools', 'waf-firewall-about',
            'waf-firewall-agent'
        ];
        foreach ($legacy_pages as $slug) {
            add_submenu_page(
                'waf-firewall',
                'MDefender-Pro',
                'MDefender-Pro',
                'manage_options',
                $slug,
                [$this, 'render_agent_dashboard']
            );
        }
    }

    public function enqueue_assets($hook) {
        $page = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : '';
        $is_waf = (strpos($hook, 'waf') !== false || strpos($hook, 'mdefender') !== false || strpos($page, 'waf-firewall') !== false);
        if (!$is_waf) return;

        $css_ver = file_exists(WAF_FW_PLUGIN_DIR . 'assets/css/admin.css') ? filemtime(WAF_FW_PLUGIN_DIR . 'assets/css/admin.css') : (defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.3.0');
        wp_enqueue_style('waf-fw-admin', WAF_FW_PLUGIN_URL . 'assets/css/admin.css', [], $css_ver);
    }

    public function render_agent_dashboard() {
        include WAF_FW_PLUGIN_DIR . 'admin/partials/agent-connector.php';
    }

    public function ajax_save_connection() {
        check_ajax_referer('waf_connector_nonce_action', 'waf_connector_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized permissions']);
        }

        $api_key = sanitize_text_field(trim($_POST['waf_api_key'] ?? ''));
        $cloud_url = esc_url_raw(trim($_POST['waf_cloud_url'] ?? ''));
        $allow_sso = !empty($_POST['waf_allow_cloud_sso']) ? 'yes' : 'no';
        update_option('waf_allow_cloud_sso', $allow_sso);

        if (empty($cloud_url)) {
            $is_local_host = in_array(strtolower($_SERVER['HTTP_HOST'] ?? ''), ['localhost', '127.0.0.1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;
            $cloud_url = $is_local_host ? 'http://127.0.0.1:8000' : 'https://mdefender-pro.crafix.tech';
        }

        if (empty($api_key) || strlen($api_key) < 16) {
            wp_send_json_error(['message' => 'Valid MDefender Pro API Key required (minimum 16 characters).']);
        }

        $host = parse_url(home_url(), PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $clean_host = preg_replace('/^www\./i', '', $host);
        $site_path = trim(parse_url(home_url(), PHP_URL_PATH) ?? '', '/');
        if (in_array(strtolower($clean_host), ['localhost', '127.0.0.1']) && !empty($site_path)) {
            $clean_domain = $clean_host . '/' . $site_path;
        } else {
            $clean_domain = $clean_host;
        }

        $handshake_payload = [
            'api_key' => $api_key,
            'domain' => $clean_domain,
            'site_url' => home_url(),
            'home_url' => home_url(),
            'site_name' => get_bloginfo('name'),
            'wp_version' => get_bloginfo('version'),
            'php_version' => phpversion(),
            'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.3.0'
        ];

        $response = wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/connect', [
            'timeout' => 15,
            'sslverify' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key
            ],
            'body' => wp_json_encode($handshake_payload)
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => 'Connection failed: ' . $response->get_error_message()]);
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);

        if ($code !== 200 || empty($decoded['data'])) {
            $err = $decoded['detail'] ?? $decoded['message'] ?? 'Authentication failed. Please verify your API Key.';
            wp_send_json_error(['message' => $err]);
        }

        $res_data = $decoded['data'];
        $site_token = $res_data['site_token'] ?? '';
        $website_id = $res_data['website_id'] ?? '';
        $trial_days = intval($res_data['trial_days_remaining'] ?? 14);
        $sub_status = $res_data['subscription_status'] ?? 'trial_active';

        update_option('waf_fw_api_key', $api_key);
        update_option('waf_fw_ml_api_key', $api_key);
        if (!empty($site_token)) update_option('waf_fw_site_token', $site_token);
        if (!empty($website_id)) update_option('waf_fw_website_id', $website_id);
        update_option('waf_fw_trial_days_remaining', $trial_days);
        update_option('waf_fw_subscription_status', $sub_status);
        update_option('waf_fw_cloud_api_url', $cloud_url);
        update_option('waf_fw_ml_api_url', $cloud_url);
        update_option('waf_fw_connected', 'yes');
        update_option('waf_fw_last_sync', current_time('mysql'));

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        wp_send_json_success([
            'message' => 'Successfully connected to MDefender Pro Cloud Fleet!',
            'trial_days' => $trial_days,
            'status' => 'connected',
            'last_sync' => date_i18n('M j, Y - H:i:s')
        ]);
    }

    public function ajax_disconnect() {
        check_ajax_referer('waf_connector_nonce_action', 'waf_connector_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized permissions']);
        }

        $api_key = get_option('waf_fw_api_key', get_option('waf_fw_ml_api_key', ''));
        $cloud_url = get_option('waf_fw_cloud_api_url', 'https://mdefender-pro.crafix.tech');
        $site_token = get_option('waf_fw_site_token', '');
        $website_id = get_option('waf_fw_website_id', '');

        if (!empty($cloud_url)) {
            $host = parse_url(home_url(), PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
            wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/disconnect', [
                'timeout' => 5,
                'sslverify' => false,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $api_key
                ],
                'body' => wp_json_encode([
                    'api_key' => $api_key,
                    'domain' => $host,
                    'website_id' => $website_id,
                    'site_token' => $site_token
                ])
            ]);
        }

        delete_option('waf_fw_api_key');
        delete_option('waf_fw_ml_api_key');
        delete_option('waf_fw_site_token');
        delete_option('waf_fw_website_id');
        delete_option('waf_fw_trial_days_remaining');
        delete_option('waf_fw_subscription_status');
        delete_option('waf_allow_cloud_sso');
        delete_option('waf_fw_last_sync');
        delete_option('waf_fw_local_blacklist_cache');
        update_option('waf_fw_connected', 'no');
        wp_clear_scheduled_hook('waf_fw_cloud_heartbeat');

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        wp_send_json_success([
            'message' => 'Agent disconnected. Protection is currently dormant.',
            'status' => 'disconnected'
        ]);
    }

    public function register_license_sync_route() {
        register_rest_route('mdefender/v1', '/license-sync', [
            'methods' => 'POST',
            'callback' => [$this, 'rest_sync_license'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function rest_sync_license(\WP_REST_Request $request) {
        $body = $request->get_json_params();
        $site_token = sanitize_text_field($body['site_token'] ?? '');
        $stored_token = get_option('waf_fw_site_token', '');
        $api_key = sanitize_text_field($body['api_key'] ?? '');
        $stored_key = get_option('waf_fw_api_key', '');

        // Hardened authentication check: at least one secret must be stored and match securely via constant-time comparison
        if (empty($stored_token) && empty($stored_key)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Agent not connected or paired.'], 403);
        }

        $token_valid = !empty($stored_token) && !empty($site_token) && hash_equals($stored_token, $site_token);
        $key_valid   = !empty($stored_key) && !empty($api_key) && hash_equals($stored_key, $api_key);

        if (!$token_valid && !$key_valid) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Unauthorized: Invalid authentication credentials.'], 403);
        }

        // Whitelist allowed subscription statuses to prevent arbitrary option injection
        $allowed_statuses = ['pro', 'active', 'trial_active', 'trial_expired', 'canceled', 'past_due'];
        $raw_status = strtolower(sanitize_text_field($body['subscription_status'] ?? 'trial_active'));
        $sub_status = in_array($raw_status, $allowed_statuses, true) ? $raw_status : 'trial_active';
        $trial_days = max(0, min(14, intval($body['trial_days_remaining'] ?? 0)));

        update_option('waf_fw_subscription_status', $sub_status);
        update_option('waf_fw_trial_days_remaining', $trial_days);
        update_option('waf_fw_last_sync', current_time('mysql'));

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        return new \WP_REST_Response([
            'success' => true,
            'message' => 'License successfully synchronized with MDefender Cloud',
            'subscription_status' => $sub_status,
            'trial_days_remaining' => $trial_days
        ], 200);
    }

    public function ajax_sync_license() {
        check_ajax_referer('waf_connector_nonce_action', 'waf_connector_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized permissions']);
        }

        $api_key = get_option('waf_fw_api_key', get_option('waf_fw_ml_api_key', ''));
        $cloud_url = get_option('waf_fw_cloud_api_url', 'https://mdefender-pro.crafix.tech');
        $site_token = get_option('waf_fw_site_token', '');

        if (empty($api_key)) {
            wp_send_json_error(['message' => 'No Cloud API key connected']);
        }

        $response = wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/sync', [
            'timeout' => 12,
            'sslverify' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key
            ],
            'body' => wp_json_encode([
                'api_key' => $api_key,
                'site_token' => $site_token,
                'home_url' => home_url()
            ])
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()]);
        }

        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        if (!empty($decoded['data'])) {
            $data = $decoded['data'];
            $sub_status = $data['subscription_status'] ?? 'trial_active';
            $trial_days = intval($data['trial_days_remaining'] ?? 0);

            update_option('waf_fw_subscription_status', $sub_status);
            update_option('waf_fw_trial_days_remaining', $trial_days);
            update_option('waf_fw_last_sync', current_time('mysql'));

            wp_send_json_success([
                'message' => 'License and threat signatures updated!',
                'subscription_status' => $sub_status,
                'trial_days' => $trial_days,
                'last_sync' => date_i18n('M j, Y - H:i:s')
            ]);
        }

        wp_send_json_success(['message' => 'Cloud sync completed.']);
    }

    // Dynamic alias fallbacks
    public function render_dashboard() { $this->render_agent_dashboard(); }
    public function render_rules() { $this->render_agent_dashboard(); }
    public function render_blocked() { $this->render_agent_dashboard(); }
    public function render_blacklist() { $this->render_agent_dashboard(); }
    public function render_logs() { $this->render_agent_dashboard(); }
    public function render_scan() { $this->render_agent_dashboard(); }
    public function render_hardening() { $this->render_agent_dashboard(); }
    public function render_backup() { $this->render_agent_dashboard(); }
    public function render_settings() { $this->render_agent_dashboard(); }
    public function render_about() { $this->render_agent_dashboard(); }
    public function render_2fa() { $this->render_agent_dashboard(); }
    public function render_tools() { $this->render_agent_dashboard(); }
}
