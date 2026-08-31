<?php
/**
 * Plugin Name: MDefender-Pro
 * Plugin URI: https://mdefender-pro.io
 * Description: AI/ML-Powered Web Application Firewall and Malware Scanner, powered by the MDefender-Pro cloud service. Connects to your MDefender-Pro dashboard with a website API key for ML WAF decisions and malware scanning.
 * Version: 4.1.0
 * Author: MDefender-Pro Team
 * Author URI: https://mdefender-pro.io
 * License: GPL v2 or later
 * Text Domain: mdefender-pro
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

define('WAF_FW_VERSION', '4.1.0');
define('WAF_FW_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WAF_FW_PLUGIN_URL', plugin_dir_url(__FILE__));

define('WAF_FW_TABLE_ATTACKS', 'waf_attacks');
define('WAF_FW_TABLE_REQUESTS', 'waf_requests');
define('WAF_FW_TABLE_BLACKLIST', 'waf_blacklist');
define('WAF_FW_TABLE_LOGIN_ATTEMPTS', 'waf_login_attempts');
define('WAF_FW_TABLE_SCAN_RESULTS', 'waf_scan_results');
define('WAF_FW_TABLE_FILE_INTEGRITY', 'waf_file_integrity');
define('WAF_FW_TABLE_FILE_CHANGES', 'waf_file_changes');
define('WAF_FW_TABLE_SCAN_QUEUE', 'waf_scan_queue');
define('WAF_FW_TABLE_FIREWALL_RULES', 'waf_firewall_rules');
define('WAF_FW_TABLE_HARDENING', 'waf_hardening_status');
define('WAF_FW_TABLE_SCAN_FILES_QUEUE', 'waf_scan_files_queue');
define('WAF_FW_TABLE_CLEANED_BACKUPS', 'waf_cleaned_backups');

require_once WAF_FW_PLUGIN_DIR . 'includes/class-db.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-logger.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/hardening/class-website-hardening.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/hardening/class-admin-panel-ip.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-rule-engine.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-feature-extractor.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-ml-api-client.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-rate-limiter.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-ip-filter.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-login-protector.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-2fa.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-attack-blocker.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-waf-engine.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-ajax-handler.php';
require_once WAF_FW_PLUGIN_DIR . 'includes/class-scanner.php';
require_once WAF_FW_PLUGIN_DIR . 'admin/class-admin.php';

register_activation_hook(__FILE__, 'waf_fw_activate');
register_deactivation_hook(__FILE__, 'waf_fw_deactivate');

function waf_fw_activate() {
    try {
        $db = WAF_FW_DB::instance();
        $db->install_tables();
        $db->set_default_options();
        $db->fix_overaggressive_rules();
        if (empty(get_option('waf_fw_site_token', ''))) {
            update_option('waf_fw_site_token', wp_generate_password(40, false, false));
        }
        if (get_option('waf_fw_connected', 'no') !== 'yes') {
            update_option('waf_fw_onboarding_pending', 'yes');
            update_option('waf_fw_do_setup_redirect', 'yes');
        }
        if (!wp_next_scheduled('waf_fw_cleanup_logs')) {
            wp_schedule_event(time(), 'daily', 'waf_fw_cleanup_logs');
        }
        if (!wp_next_scheduled('waf_fw_scheduled_scan')) {
            wp_schedule_event(time(), 'weekly', 'waf_fw_scheduled_scan');
        }
        if (!wp_next_scheduled('waf_fw_file_integrity_check')) {
            wp_schedule_event(time(), 'daily', 'waf_fw_file_integrity_check');
        }
        if (!wp_next_scheduled('waf_fw_cloud_heartbeat')) {
            wp_schedule_event(time(), 'hourly', 'waf_fw_cloud_heartbeat');
        }
    } catch (\Throwable $e) {
        error_log('MDefender-Pro activation error: ' . $e->getMessage());
    }
}

function waf_fw_deactivate() {
    wp_clear_scheduled_hook('waf_fw_cleanup_logs');
    wp_clear_scheduled_hook('waf_fw_scheduled_scan');
    wp_clear_scheduled_hook('waf_fw_file_integrity_check');
    wp_clear_scheduled_hook('waf_fw_cloud_heartbeat');
}

function waf_fw_check_db_update() {
    $current_db_ver = get_option('waf_fw_db_version', '0.0.0');
    if (version_compare($current_db_ver, WAF_FW_VERSION, '<')) {
        try {
            $db = WAF_FW_DB::instance();
            $db->install_tables();
            $db->set_default_options();
            $db->fix_overaggressive_rules();
            // Security hardening: if a legacy install still holds the known
            // weak default dashboard password (admin123), clear it so the
            // password gate cannot be bypassed with the published default.
            $legacy = get_option('waf_fw_admin_password', '');
            if (!empty($legacy) && wp_check_password('admin123', $legacy)) {
                delete_option('waf_fw_admin_password');
            }
            update_option('waf_fw_db_version', WAF_FW_VERSION);
        } catch (\Throwable $e) {
            error_log('MDefender-Pro DB upgrade error: ' . $e->getMessage());
        }
    }
}
add_action('admin_init', 'waf_fw_check_db_update');

add_action('waf_fw_cleanup_logs', ['WAF_FW_DB', 'cleanup_old_logs']);
add_action('waf_fw_scheduled_scan', ['WAF_FW_Scanner', 'run_scheduled_scan']);
add_action('waf_fw_file_integrity_check', ['WAF_FW_Scanner', 'run_file_integrity_check']);
add_action('waf_fw_run_scan_batch', ['WAF_FW_Scanner', 'run_scan_batch_cron'], 10, 1);

/**
 * Hourly cloud heartbeat: pushes online status + local counters so the
 * MDefender-Pro dashboard reflects the real state of this site.
 */
function waf_fw_cloud_heartbeat() {
    $client = WAF_FW_ML_Api_Client::instance();
    if (!$client->is_available()) {
        return;
    }
    $blocked = get_option('waf_fw_stats_blocked', 0);
    $allowed = get_option('waf_fw_stats_allowed', 0);
    $res = $client->heartbeat([
        'requests_blocked' => (int) $blocked,
        'requests_allowed' => (int) $allowed,
    ]);

    if ($res && is_array($res)) {
        // Sync configuration options
        if (!empty($res['config']) && is_array($res['config'])) {
            $config = $res['config'];
            if (isset($config['waf_mode'])) {
                update_option('waf_fw_cloud_mode', sanitize_text_field($config['waf_mode']));
            }
            if (isset($config['learning_mode'])) {
                update_option('waf_fw_learning_mode', $config['learning_mode'] ? 'yes' : 'no');
            }
            if (isset($config['confidence_threshold'])) {
                update_option('waf_fw_confidence_threshold', (float) $config['confidence_threshold']);
            }
            // Enforce hardening options
            if (isset($config['disable_xmlrpc'])) {
                update_option('waf_fw_disable_xmlrpc', $config['disable_xmlrpc'] ? 'yes' : 'no');
            }
            if (isset($config['disable_directory_listing'])) {
                update_option('waf_fw_disable_directory_listing', $config['disable_directory_listing'] ? 'yes' : 'no');
            }
            if (isset($config['prevent_user_enumeration'])) {
                update_option('waf_fw_prevent_user_enumeration', $config['prevent_user_enumeration'] ? 'yes' : 'no');
            }
            if (isset($config['disable_file_editing'])) {
                update_option('waf_fw_disable_file_editing', $config['disable_file_editing'] ? 'yes' : 'no');
            }
        }

        // Sync local IP blacklist cache
        if (isset($res['blacklist']) && is_array($res['blacklist'])) {
            $ips = array_map('sanitize_text_field', $res['blacklist']);
            update_option('waf_fw_local_blacklist_cache', $ips);
        }

        // Execute scan command if triggered
        if (!empty($res['command']) && is_array($res['command'])) {
            $cmd = $res['command'];
            if (($cmd['type'] ?? '') === 'scan') {
                @set_time_limit(300);
                $scanner = WAF_FW_Scanner::instance();
                $scan_type = $cmd['scan_type'] ?? 'full';
                $scanner->scan_website($scan_type);
            }
        }
    }
}
add_action('waf_fw_cloud_heartbeat', 'waf_fw_cloud_heartbeat');

/**
 * Increment the local cloud-stat counters used by the heartbeat. Called by
 * the WAF engine when a request is blocked or allowed.
 */
function waf_fw_bump_stat($which, $amount = 1) {
    $key = $which === 'blocked' ? 'waf_fw_stats_blocked' : 'waf_fw_stats_allowed';
    update_option($key, (int) get_option($key, 0) + (int) $amount);
}

function waf_fw_init() {
    if (is_admin()) {
        new WAF_FW_Admin();
    }
    new WAF_FW_Ajax_Handler();
    WAF_FW_Login_Protector::instance()->register_hooks();
    WAF_FW_2FA::instance();
    WAF_FW_Website_Hardening::instance();
}
add_action('plugins_loaded', 'waf_fw_init');

function waf_fw_maybe_redirect_setup() {
    if (get_option('waf_fw_do_setup_redirect', 'no') !== 'yes') return;
    delete_option('waf_fw_do_setup_redirect');
    if (current_user_can('manage_options')) {
        wp_safe_redirect(admin_url('admin.php?page=waf-firewall-settings&waf_setup=1'));
        exit;
    }
}
add_action('admin_init', 'waf_fw_maybe_redirect_setup');

function waf_fw_analyze_request() {
    if (php_sapi_name() === 'cli' || (defined('WP_CLI') && WP_CLI)) return;
    if (get_option('waf_fw_protection_enabled', 'yes') !== 'yes') return;
    if (defined('DOING_AJAX') && DOING_AJAX) return;
    if (defined('DOING_CRON') && DOING_CRON) return;
    if (defined('REST_REQUEST') && REST_REQUEST) {
        waf_fw_analyze_rest_request();
        return;
    }
    if (is_admin()) return;

    $engine = WAF_FW_Engine::instance();
    $result = $engine->analyze_current_request();

    if ($result['status'] === 'blocked') {
        WAF_FW_Attack_Blocker::instance()->track_attack($result['ip']);
        status_header(403);
        include WAF_FW_PLUGIN_DIR . 'block-page-template.php';
        exit;
    }
}
add_action('init', 'waf_fw_analyze_request', 1);

function waf_fw_analyze_rest_request() {
    $engine = WAF_FW_Engine::instance();
    $route = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($route, '/wp-json/waf-fw/') !== false) return;

    $result = $engine->analyze_current_request();
    if ($result['status'] === 'blocked') {
        WAF_FW_Attack_Blocker::instance()->track_attack($result['ip']);
        wp_send_json([
            'status' => 'blocked',
            'attack_type' => $result['attack_type'],
            'confidence' => $result['confidence'],
            'reference_id' => $result['reference_id']
        ], 403);
    }
}

add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (strpos($request->get_route(), 'waf-fw') !== false) return $result;
    $engine = WAF_FW_Engine::instance();
    $check = $engine->analyze_current_request();
    if ($check['status'] === 'blocked') {
        WAF_FW_Attack_Blocker::instance()->track_attack($check['ip']);
        return new WP_Error('waf_blocked', 'Request blocked by WAF', ['status' => 403]);
    }
    return $result;
}, 1, 3);
