<?php
defined('ABSPATH') || exit;

class WAF_FW_Ajax_Handler {
    public function __construct() {
        add_action('wp_ajax_waf_fw_get_stats', [$this, 'get_stats']);
        add_action('wp_ajax_waf_fw_get_dashboard', [$this, 'get_dashboard']);
        add_action('wp_ajax_waf_fw_get_logs', [$this, 'get_logs']);
        add_action('wp_ajax_waf_fw_get_rules', [$this, 'get_rules']);
        add_action('wp_ajax_waf_fw_save_rule', [$this, 'save_rule']);
        add_action('wp_ajax_waf_fw_update_rule', [$this, 'update_rule']);
        add_action('wp_ajax_waf_fw_delete_rule', [$this, 'delete_rule']);
        add_action('wp_ajax_waf_fw_toggle_rule', [$this, 'toggle_rule']);
        add_action('wp_ajax_waf_fw_get_blacklist', [$this, 'get_blacklist']);
        add_action('wp_ajax_waf_fw_add_blacklist', [$this, 'add_blacklist']);
        add_action('wp_ajax_waf_fw_remove_blacklist', [$this, 'remove_blacklist']);
        add_action('wp_ajax_waf_fw_get_settings', [$this, 'get_settings']);
        add_action('wp_ajax_waf_fw_save_settings', [$this, 'save_settings']);
        add_action('wp_ajax_waf_fw_change_password', [$this, 'change_password']);
        add_action('wp_ajax_waf_fw_export_logs', [$this, 'export_logs']);
        add_action('wp_ajax_waf_fw_clear_logs', [$this, 'clear_logs']);
        add_action('wp_ajax_waf_fw_block_ip', [$this, 'block_ip']);
        add_action('wp_ajax_waf_fw_get_live_feed', [$this, 'get_live_feed']);
        add_action('wp_ajax_waf_fw_toggle_protection', [$this, 'toggle_protection']);
        add_action('wp_ajax_waf_fw_clean_stats', [$this, 'clean_stats']);

        add_action('wp_ajax_waf_fw_scan_website', [$this, 'scan_website']);
        add_action('wp_ajax_waf_fw_get_scan_history', [$this, 'get_scan_history']);
        add_action('wp_ajax_waf_fw_test_ml_connection', [$this, 'test_ml_connection']);
        add_action('wp_ajax_waf_fw_get_ml_status', [$this, 'get_ml_status']);
        add_action('wp_ajax_waf_fw_get_cloud_dashboard', [$this, 'get_cloud_dashboard']);
        add_action('wp_ajax_waf_fw_complete_onboarding', [$this, 'complete_onboarding']);
        add_action('wp_ajax_waf_fw_get_backups', [$this, 'get_backups']);
        add_action('wp_ajax_waf_fw_clean_file', [$this, 'clean_file']);
        add_action('wp_ajax_waf_fw_restore_file', [$this, 'restore_file']);
        add_action('wp_ajax_waf_fw_delete_backup', [$this, 'delete_backup']);

        add_action('wp_ajax_waf_fw_start_progressive_scan', [$this, 'start_progressive_scan']);
        add_action('wp_ajax_waf_fw_continue_scan', [$this, 'continue_scan']);
        add_action('wp_ajax_waf_fw_get_scan_status', [$this, 'get_scan_status_ajax']);
        add_action('wp_ajax_waf_fw_get_file_integrity_status', [$this, 'get_file_integrity_status']);
        add_action('wp_ajax_waf_fw_get_file_changes', [$this, 'get_file_changes_ajax']);
        add_action('wp_ajax_waf_fw_save_scheduled_scan_settings', [$this, 'save_scheduled_scan_settings']);
        add_action('wp_ajax_waf_fw_clear_scan_history', [$this, 'clear_scan_history']);
        add_action('wp_ajax_waf_fw_pause_scan', [$this, 'pause_scan']);
        add_action('wp_ajax_waf_fw_cancel_scan', [$this, 'cancel_scan']);
        add_action('wp_ajax_waf_fw_email_scan_report', [$this, 'email_scan_report']);
        add_action('wp_ajax_waf_fw_get_scan_metrics', [$this, 'get_scan_metrics']);
        add_action('wp_ajax_waf_fw_get_scan_stage_detail', [$this, 'get_scan_stage_detail']);
        add_action('wp_ajax_waf_harden_apply', [$this, 'harden_apply']);
        add_action('wp_ajax_waf_fw_get_active_or_last_scan', [$this, 'get_active_or_last_scan']);
        add_action('wp_ajax_waf_harden_remove', [$this, 'harden_remove']);
        add_action('wp_ajax_waf_harden_one_click', [$this, 'harden_one_click']);
        add_action('wp_ajax_waf_harden_report', [$this, 'harden_report']);
        add_action('wp_ajax_waf_harden_get_status', [$this, 'harden_get_status']);
        add_action('wp_ajax_waf_harden_admin_ip_save', [$this, 'harden_admin_ip_save']);
        add_action('wp_ajax_waf_fw_whois_lookup', [$this, 'whois_lookup']);
        add_action('wp_ajax_waf_fw_delete_scan_file', [$this, 'delete_scan_file']);
        add_action('wp_ajax_waf_fw_restore_core_file', [$this, 'restore_core_file']);
        add_action('wp_ajax_waf_fw_view_scan_file', [$this, 'view_scan_file']);
        add_action('wp_ajax_waf_fw_ignore_scan_issue', [$this, 'ignore_scan_issue']);
        add_action('wp_ajax_waf_fw_get_admin_attacks', [$this, 'get_admin_attacks']);
        add_action('wp_ajax_waf_fw_get_diagnostics', [$this, 'get_diagnostics']);
    }

    private function check_access() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized'], 403);
        }
    }

    /**
     * CSRF protection for mutating AJAX endpoints. Verifies the plugin nonce
     * is present in the request. The JS layer attaches it automatically via
     * the jQuery prefilter in admin.js.
     */
    private function verify_nonce() {
        $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field($_REQUEST['nonce']) : '';
        if (empty($nonce) || !wp_verify_nonce($nonce, 'waf_fw_ajax')) {
            wp_send_json_error(['message' => 'Security check failed'], 403);
        }
    }

    public function get_stats() {
        $this->check_access();
        $logger = WAF_FW_Logger::instance();
        $stats = $logger->get_stats();
        wp_send_json_success($stats);
    }

    public function get_dashboard() {
        $this->check_access();
        $logger = WAF_FW_Logger::instance();
        $data = $logger->get_dashboard_data();
        wp_send_json_success($data);
    }

    public function get_live_feed() {
        $this->check_access();
        $logger = WAF_FW_Logger::instance();
        $logs = $logger->get_logs(['per_page' => 15]);
        wp_send_json_success($logs);
    }

    public function toggle_protection() {
        $this->check_access();
        $this->verify_nonce();
        $enabled = !empty($_POST['enabled']);
        update_option('waf_fw_protection_enabled', $enabled ? 'yes' : 'no');
        wp_send_json_success(['enabled' => $enabled]);
    }

    public function clean_stats() {
        $this->check_access();
        $this->verify_nonce();
        $type = sanitize_text_field($_POST['type'] ?? '');
        $logger = WAF_FW_Logger::instance();

        switch ($type) {
            case 'total_requests':
                $logger->clean_requests();
                break;
            case 'blocked_requests':
                $logger->clean_blocked();
                break;
            case 'threats_detected':
                $logger->clean_threats();
                break;
            default:
                wp_send_json_error(['message' => 'Invalid clean type']);
        }

        wp_send_json_success(['message' => 'Stats cleaned successfully', 'type' => $type]);
    }

    public function get_logs() {
        $this->check_access();
        $logger = WAF_FW_Logger::instance();
        $logs = $logger->get_logs($_GET);
        wp_send_json_success($logs);
    }

    public function get_rules() {
        $this->check_access();
        $engine = WAF_FW_Rule_Engine::instance();
        $rules = [];
        foreach ($engine->get_rules() as $i => $rule) {
            $rule['id'] = $i;
            $rules[] = $rule;
        }
        wp_send_json_success($rules);
    }

    public function save_rule() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $engine = WAF_FW_Rule_Engine::instance();
        $engine->add_rule([
            'name' => sanitize_text_field($data['name']),
            'pattern' => $data['pattern'],
            'action' => sanitize_text_field($data['action']),
            'severity' => sanitize_text_field($data['severity']),
        ]);
        wp_send_json_success(['message' => 'Rule created successfully']);
    }

    public function update_rule() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($_GET['id'] ?? -1);
        if ($id < 0) {
            wp_send_json_error(['message' => 'Invalid rule ID']);
        }
        $engine = WAF_FW_Rule_Engine::instance();
        $update = [];
        if (isset($data['name'])) $update['name'] = sanitize_text_field($data['name']);
        if (isset($data['pattern'])) $update['pattern'] = $data['pattern'];
        if (isset($data['action'])) $update['action'] = sanitize_text_field($data['action']);
        if (isset($data['severity'])) $update['severity'] = sanitize_text_field($data['severity']);
        if (isset($data['enabled'])) $update['enabled'] = (bool) $data['enabled'];
        $result = $engine->update_rule($id, $update);
        if ($result) {
            wp_send_json_success(['message' => 'Rule updated']);
        }
        wp_send_json_error(['message' => 'Rule not found']);
    }

    public function delete_rule() {
        $this->check_access();
        $this->verify_nonce();
        $engine = WAF_FW_Rule_Engine::instance();
        $id = intval($_GET['id'] ?? -1);
        if ($engine->delete_rule($id)) {
            wp_send_json_success(['message' => 'Rule deleted']);
        }
        wp_send_json_error(['message' => 'Rule not found']);
    }

    public function toggle_rule() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($_GET['id'] ?? -1);
        $engine = WAF_FW_Rule_Engine::instance();
        $engine->update_rule($id, ['enabled' => !empty($data['enabled'])]);
        wp_send_json_success();
    }

    public function get_blacklist() {
        $this->check_access();
        $filter = WAF_FW_IP_Filter::instance();
        wp_send_json_success($filter->get_blacklist());
    }

    public function add_blacklist() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $ip = sanitize_text_field($data['ip'] ?? '');
        $reason = sanitize_text_field($data['reason'] ?? 'Manually blocked');
        $type = sanitize_text_field($data['type'] ?? 'permanent');
        if (empty($ip)) {
            wp_send_json_error(['message' => 'IP is required']);
        }
        $filter = WAF_FW_IP_Filter::instance();
        $filter->add_to_blacklist($ip, $reason, $type, false);
        wp_send_json_success(['message' => "IP $ip blocked"]);
    }

    public function remove_blacklist() {
        $this->check_access();
        $this->verify_nonce();
        $ip = sanitize_text_field($_GET['ip'] ?? '');
        if (empty($ip)) {
            wp_send_json_error(['message' => 'IP is required']);
        }
        $filter = WAF_FW_IP_Filter::instance();
        $filter->remove_from_blacklist($ip);
        wp_send_json_success(['message' => "IP $ip unblocked"]);
    }

    public function get_settings() {
        $this->check_access();
        wp_send_json_success([
            'security_level' => get_option('waf_fw_security_level', 'high'),
            'confidence_threshold' => (float) get_option('waf_fw_confidence_threshold', 0.7),
            'rate_limit' => (int) get_option('waf_fw_rate_limit', 100),
            'ml_api_url' => get_option('waf_fw_ml_api_url', 'https://mdefenderapi.onrender.com'),
            'ml_api_key' => get_option('waf_fw_ml_api_key', ''),
            'website_id' => get_option('waf_fw_website_id', ''),
            'cloud_mode' => get_option('waf_fw_cloud_mode', 'protect'),
            'cloud_scope' => get_option('waf_fw_cloud_scope', 'signal'),
            'connected' => get_option('waf_fw_connected', 'no'),
            'connected_at' => get_option('waf_fw_connected_at', ''),
            'block_message' => get_option('waf_fw_block_message', 'This request has been blocked by Web Application Firewall'),
            'block_colors' => get_option('waf_fw_block_colors', '#667eea,#764ba2'),
            'email_alerts' => get_option('waf_fw_email_alerts', 'no'),
            'log_retention_days' => (int) get_option('waf_fw_log_retention_days', 30),
            'login_lockout_enabled' => get_option('waf_fw_login_lockout_enabled', 'yes'),
            'login_threshold' => (int) get_option('waf_fw_login_threshold', 10),
            'login_block_duration' => (int) get_option('waf_fw_login_block_duration', 86400),
            'attack_blocker_enabled' => get_option('waf_fw_attack_blocker_enabled', 'yes'),
            'attack_threshold' => (int) get_option('waf_fw_attack_threshold', 20),
            'attack_block_duration' => (int) get_option('waf_fw_attack_block_duration', 86400),
            'attack_window' => (int) get_option('waf_fw_attack_window', 86400),
            'protection_enabled' => get_option('waf_fw_protection_enabled', 'yes'),
            'main_waf_api_url' => get_option('waf_fw_main_waf_api_url', 'https://mdefenderapi.onrender.com/api'),
            'main_waf_admin_url' => get_option('waf_fw_main_waf_admin_url', 'https://mdefenderpro.onrender.com'),
            'scheduled_scan_enabled' => get_option('waf_fw_scheduled_scan_enabled', 'no'),
            'scheduled_scan_frequency' => get_option('waf_fw_scheduled_scan_frequency', 'weekly'),
            'scheduled_scan_type' => get_option('waf_fw_scheduled_scan_type', 'full'),
            'learning_mode' => get_option('waf_fw_learning_mode', 'no'),
            'blocked_countries' => get_option('waf_fw_blocked_countries', ''),
        ]);
    }

    public function save_settings() {
        $this->check_access();
        $raw = file_get_contents('php://input');
        $data = !empty($raw) ? json_decode($raw, true) : null;
        if (!is_array($data)) {
            $data = !empty($_POST) ? $_POST : [];
        }
        $allowed = [
            'security_level', 'confidence_threshold', 'rate_limit',
            'ml_api_url', 'ml_api_key', 'website_id', 'cloud_mode', 'cloud_scope',
            'block_message', 'block_colors',
            'email_alerts', 'log_retention_days',
            'login_lockout_enabled', 'login_threshold', 'login_block_duration',
            'attack_blocker_enabled', 'attack_threshold', 'attack_block_duration', 'attack_window',
            'main_waf_api_url', 'main_waf_admin_url',
            'learning_mode', 'blocked_countries',
            'dashboard_url',
        ];

        if (isset($data['learning_mode'])) {
            WAF_FW_Engine::instance()->set_learning_mode($data['learning_mode'] === 'yes');
        }
        
        $old_api_key = get_option('waf_fw_ml_api_key', '');
        
        foreach ($allowed as $key) {
            if (isset($data[$key])) {
                if ($key === 'cloud_mode' && !in_array($data[$key], ['monitor', 'protect', 'off'], true)) {
                    continue;
                }
                if ($key === 'cloud_scope' && !in_array($data[$key], ['signal', 'all'], true)) {
                    continue;
                }
                update_option('waf_fw_' . $key, $data[$key]);
            }
        }

        // Ensure default cloud API URL is set
        $ml_url = get_option('waf_fw_ml_api_url', '');
        if (empty($ml_url) || strpos($ml_url, 'mdefender-pro.io') !== false) {
            update_option('waf_fw_ml_api_url', 'https://mdefenderapi.onrender.com');
        }

        // Cloud credentials changed -> attempt a connect handshake so the
        // dashboard marks this site online immediately.
        $connection = null;
        if (isset($data['ml_api_key']) || isset($data['ml_api_url']) || isset($data['website_id'])) {
            $ml_key = get_option('waf_fw_ml_api_key', '');
            if (empty($ml_key)) {
                update_option('waf_fw_connected', 'no');
                update_option('waf_fw_site_token', '');
                update_option('waf_fw_website_id', '');
                $connection = [
                    'success' => false,
                    'message' => 'Disconnected from cloud.',
                ];
            } else {
                update_option('waf_fw_connected', 'no');
                $client = WAF_FW_ML_Api_Client::instance();
                $connection = $client->connect();
                
                if (empty($connection['success']) && isset($data['ml_api_key'])) {
                    // Rollback the broken key to the previous working key
                    update_option('waf_fw_ml_api_key', $old_api_key);
                }
            }
        }

        $response = ['message' => 'Settings saved'];
        if ($connection !== null) {
            $response['connected'] = !empty($connection['success']);
            $response['connection_message'] = $connection['message'];
        }
        wp_send_json_success($response);
    }

    public function change_password() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $old = $data['old_password'] ?? '';
        $new = $data['new_password'] ?? '';
        $stored = get_option('waf_fw_admin_password');
        if (empty($stored)) {
            if (empty($new)) {
                wp_send_json_error(['message' => 'New password is required']);
            }
            update_option('waf_fw_admin_password', wp_hash_password($new));
            wp_send_json_success(['message' => 'Password set successfully']);
        }
        if (!wp_check_password($old, $stored)) {
            wp_send_json_error(['message' => 'Current password is incorrect']);
        }
        update_option('waf_fw_admin_password', wp_hash_password($new));
        wp_send_json_success(['message' => 'Password changed successfully']);
    }

    public function clear_logs() {
        $this->check_access();
        $this->verify_nonce();
        $logger = WAF_FW_Logger::instance();
        $logger->clear_logs();
        wp_send_json_success(['message' => 'All logs cleared']);
    }

    public function block_ip() {
        $this->check_access();
        $this->verify_nonce();
        $ip = sanitize_text_field($_POST['ip'] ?? '');
        $reason = sanitize_text_field($_POST['reason'] ?? 'Manually blocked from dashboard');
        if (empty($ip)) {
            wp_send_json_error(['message' => 'IP is required']);
        }
        $filter = WAF_FW_IP_Filter::instance();
        if ($filter->is_blacklisted_raw($ip)) {
            wp_send_json_error(['message' => "IP $ip is already blocked"]);
        }
        $filter->add_to_blacklist($ip, $reason, 'permanent', false);
        wp_send_json_success(['message' => "IP $ip blocked"]);
    }

    public function export_logs() {
        $this->check_access();
        $logger = WAF_FW_Logger::instance();
        $logs = $logger->get_logs(array_merge($_GET, ['per_page' => 10000]));
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="waf-logs-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['IP', 'URL', 'Method', 'Attack Type', 'Confidence', 'Status', 'Rule Matched', 'Timestamp']);
        foreach ($logs['logs'] as $log) {
            fputcsv($out, [
                $log->ip, $log->url, $log->method, $log->attack_type,
                $log->confidence, $log->status, $log->rule_matched, $log->created_at,
            ]);
        }
        fclose($out);
        exit;
    }

    public function scan_website() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $scan_type = sanitize_text_field($data['scan_type'] ?? 'full');
        $scanner = WAF_FW_Scanner::instance();
        $result = $scanner->scan_website($scan_type);
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error(['message' => 'Scan failed']);
        }
    }

    public function get_scan_history() {
        $this->check_access();
        $scanner = WAF_FW_Scanner::instance();
        $history = $scanner->get_scan_history();
        wp_send_json_success($history);
    }

    public function get_active_or_last_scan() {
        $this->check_access();
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_scan_queue_table();
        
        // 1. Check if there is an active running/paused scan
        $active = $wpdb->get_row("SELECT * FROM $table WHERE status IN ('running', 'paused') ORDER BY id DESC LIMIT 1");
        if ($active) {
            wp_send_json_success([
                'type' => 'active',
                'queue_id' => intval($active->id),
                'status' => $active->status,
                'progress' => intval($active->progress),
                'current_stage' => $active->current_stage,
                'scanned_files' => intval($active->scanned_files),
                'total_files' => intval($active->total_files),
            ]);
        }
        
        // 2. Otherwise, check for the last completed scan
        $last = $wpdb->get_row("SELECT * FROM $table WHERE status = 'completed' ORDER BY id DESC LIMIT 1");
        if ($last) {
            $results = json_decode($last->results, true);
            wp_send_json_success([
                'type' => 'completed',
                'queue_id' => intval($last->id),
                'status' => $last->status,
                'progress' => 100,
                'score' => intval($last->score),
                'issues_found' => intval($last->issues_found),
                'duration' => intval($last->duration_seconds),
                'results' => $results,
                'created_at' => $last->created_at,
                'completed_at' => $last->completed_at,
            ]);
        }
        
        wp_send_json_success([
            'type' => 'none'
        ]);
    }

    public function clear_scan_history() {
        $this->check_access();
        $this->verify_nonce();
        $scanner = WAF_FW_Scanner::instance();
        $scanner->clear_scan_history();
        wp_send_json_success(['message' => 'Scan history cleared']);
    }

    private function check_harden_access() {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'waf_fw_ajax')) {
            wp_send_json_error(['message' => 'Security check failed'], 403);
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized'], 403);
        }
    }

    public function harden_apply() {
        $this->check_harden_access();
        $feature = sanitize_text_field($_POST['feature'] ?? '');
        if (!$feature) wp_send_json_error(['message' => 'No feature specified']);
        $settings = $_POST;
        unset($settings['action'], $settings['feature'], $settings['nonce']);
        $settings = array_map(function($v) { return $v === '1' ? true : ($v === '0' ? false : sanitize_text_field($v)); }, $settings);
        $hardening = WAF_FW_Website_Hardening::instance();
        $method = 'apply_' . $feature;
        if (!method_exists($hardening, $method)) wp_send_json_error(['message' => 'Unknown feature']);
        $result = $hardening->$method($settings);
        wp_send_json_success($result);
    }

    public function harden_remove() {
        $this->check_harden_access();
        $feature = sanitize_text_field($_POST['feature'] ?? '');
        if (!$feature) wp_send_json_error(['message' => 'No feature specified']);
        $hardening = WAF_FW_Website_Hardening::instance();
        $method = 'remove_' . $feature;
        if (!method_exists($hardening, $method)) wp_send_json_error(['message' => 'Unknown feature']);
        $hardening->$method();
        wp_send_json_success(['feature' => $feature, 'status' => 'disabled']);
    }

    public function harden_one_click() {
        $this->check_harden_access();
        $hardening = WAF_FW_Website_Hardening::instance();
        $result = $hardening->one_click_harden();
        wp_send_json_success($result);
    }

    public function harden_report() {
        $this->check_harden_access();
        $hardening = WAF_FW_Website_Hardening::instance();
        $report = $hardening->generate_report();
        wp_send_json_success($report);
    }

    public function harden_get_status() {
        $this->check_harden_access();
        $hardening = WAF_FW_Website_Hardening::instance();
        $status = $hardening->get_status();
        wp_send_json_success($status);
    }

    public function harden_admin_ip_save() {
        $this->check_harden_access();
        $settings = [
            'enabled' => !empty($_POST['enabled']),
            'whitelist' => sanitize_textarea_field($_POST['whitelist'] ?? ''),
            'blocked_countries' => sanitize_text_field($_POST['blocked_countries'] ?? ''),
        ];
        $result = WAF_FW_Admin_Panel_IP::instance()->save_settings($settings);
        wp_send_json_success($result);
    }

    public function start_progressive_scan() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $scan_type = sanitize_text_field($data['scan_type'] ?? 'full');

        $scanner = WAF_FW_Scanner::instance();
        $queue_id = $scanner->create_scan_queue($scan_type);

        $result = $scanner->process_scan_cell($queue_id, 0);
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error(['message' => 'Failed to start scan']);
        }
    }

    public function continue_scan() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $queue_id = intval($data['queue_id'] ?? 0);
        $cell_index = intval($data['cell_index'] ?? 0);

        if (!$queue_id) {
            wp_send_json_error(['message' => 'Invalid scan ID']);
        }

        $scanner = WAF_FW_Scanner::instance();
        $result = $scanner->process_scan_cell($queue_id, $cell_index);
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error(['message' => 'Scan failed']);
        }
    }

    public function get_scan_status_ajax() {
        $this->check_access();
        $queue_id = intval($_GET['queue_id'] ?? 0);

        if (!$queue_id) {
            wp_send_json_error(['message' => 'Invalid scan ID']);
        }

        $scanner = WAF_FW_Scanner::instance();
        $status = $scanner->get_scan_status($queue_id);
        if ($status) {
            wp_send_json_success($status);
        } else {
            wp_send_json_error(['message' => 'Scan not found']);
        }
    }

    public function get_file_integrity_status() {
        $this->check_access();
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_file_integrity_table();
        $total_files = $wpdb->get_var("SELECT COUNT(*) FROM $table");
        $modified_files = $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'modified'");
        $new_files = $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'new'");

        $changes_table = WAF_FW_DB::instance()->get_file_changes_table();
        $recent_changes = $wpdb->get_results(
            "SELECT * FROM $changes_table ORDER BY detected_at DESC LIMIT 20"
        );

        wp_send_json_success([
            'total_files' => (int) $total_files,
            'modified_files' => (int) $modified_files,
            'new_files' => (int) $new_files,
            'integrity_db_populated' => $total_files > 0,
            'recent_changes' => $recent_changes,
        ]);
    }

    public function get_file_changes_ajax() {
        $this->check_access();
        $scanner = WAF_FW_Scanner::instance();
        $changes = $scanner->check_file_changes();

        wp_send_json_success([
            'changes' => $changes,
            'count' => count($changes),
            'timestamp' => current_time('mysql'),
        ]);
    }

    public function save_scheduled_scan_settings() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $enabled = !empty($data['enabled']) ? 'yes' : 'no';
        $frequency = sanitize_text_field($data['frequency'] ?? 'weekly');
        $scan_type = sanitize_text_field($data['scan_type'] ?? 'full');

        update_option('waf_fw_scheduled_scan_enabled', $enabled);
        update_option('waf_fw_scheduled_scan_frequency', $frequency);
        update_option('waf_fw_scheduled_scan_type', $scan_type);

        wp_clear_scheduled_hook('waf_fw_scheduled_scan');
        if ($enabled === 'yes') {
            $schedule = in_array($frequency, ['daily', 'weekly']) ? $frequency : 'weekly';
            wp_schedule_event(time(), $schedule, 'waf_fw_scheduled_scan');
        }

        wp_send_json_success(['message' => 'Scheduled scan settings saved']);
    }

    public function test_ml_connection() {
        $this->check_access();
        $this->verify_nonce();
        $ml_client = WAF_FW_ML_Api_Client::instance();
        $result = $ml_client->test_connection();
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function get_ml_status() {
        $this->check_access();
        $ml_client = WAF_FW_ML_Api_Client::instance();
        $status = $ml_client->get_status();
        $status['api_url'] = get_option('waf_fw_ml_api_url', '');
        $status['has_api_key'] = !empty(get_option('waf_fw_ml_api_key', ''));
        $status['has_website_id'] = !empty(get_option('waf_fw_website_id', ''));
        $status['main_waf_url'] = get_option('waf_fw_main_waf_api_url', 'https://mdefenderapi.onrender.com/api');
        wp_send_json_success($status);
    }

    /** Cloud dashboard stats: recent cloud events + malware findings. */
    public function get_cloud_dashboard() {
        $this->check_access();
        $ml_client = WAF_FW_ML_Api_Client::instance();
        if (!$ml_client->is_available()) {
            wp_send_json_error(['message' => 'Cloud service not connected. Add your Website API key in Settings.']);
        }
        $events = $ml_client->get_events(50);
        $findings = $ml_client->get_findings(50);
        wp_send_json_success([
            'connected' => get_option('waf_fw_connected', 'no'),
            'mode' => get_option('waf_fw_cloud_mode', 'protect'),
            'events' => $events,
            'findings' => $findings,
            'blocked' => count(array_filter($events, function ($e) {
                return in_array($e['action'] ?? '', ['block', 'rate_limit', 'challenge'], true);
            })),
            'malicious_findings' => count(array_filter($findings, function ($f) {
                return ($f['verdict'] ?? '') === 'malicious';
            })),
        ]);
    }

    /** Marks the one-time activation onboarding popup as done. */
    public function complete_onboarding() {
        $this->check_access();
        $this->verify_nonce();
        update_option('waf_fw_onboarding_pending', 'no');
        wp_send_json_success(['message' => 'Onboarding completed.']);
    }

    public function pause_scan() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $queue_id = intval($data['queue_id'] ?? 0);
        if (!$queue_id) {
            wp_send_json_error(['message' => 'Invalid scan ID']);
        }
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_scan_queue_table();
        $wpdb->update($table, [
            'status' => 'paused',
            'current_stage' => 'Paused by user',
        ], ['id' => $queue_id]);
        wp_send_json_success(['message' => 'Scan paused', 'queue_id' => $queue_id]);
    }

    public function cancel_scan() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $queue_id = intval($data['queue_id'] ?? 0);
        if (!$queue_id) {
            wp_send_json_error(['message' => 'Invalid scan ID']);
        }
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_scan_queue_table();
        $wpdb->update($table, [
            'status' => 'cancelled',
            'current_stage' => 'Cancelled by user',
            'completed_at' => current_time('mysql'),
        ], ['id' => $queue_id]);
        wp_send_json_success(['message' => 'Scan cancelled']);
    }

    public function email_scan_report() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $scan_id = intval($data['scan_id'] ?? 0);
        $custom_email = sanitize_email($data['email'] ?? '');

        global $wpdb;
        $table = WAF_FW_DB::instance()->get_scan_results_table();
        $scan = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $scan_id));
        if (!$scan) {
            $scan = $wpdb->get_row("SELECT * FROM $table ORDER BY created_at DESC LIMIT 1");
        }
        if (!$scan) {
            wp_send_json_error(['message' => 'No scan results found']);
        }

        $results = json_decode($scan->vulnerabilities, true);
        $summary = json_decode($scan->summary, true);
        $email = !empty($custom_email) ? $custom_email : get_option('admin_email');
        $site_name = get_bloginfo('name');
        $score = $scan->score;
        $status_label = $summary['security_status']['label'] ?? 'Unknown';

        $subject = sprintf('[%s] Security Scan Report - %s (Score: %d/100)', $site_name, $status_label, $score);

        $body = "═══════════════════════════════════════════\n";
        $body .= "  SECURITY SCAN REPORT - {$site_name}\n";
        $body .= "═══════════════════════════════════════════\n\n";
        $body .= "Scan Type:     {$scan->scan_type}\n";
        $body .= "Security Score: {$score}/100\n";
        $body .= "Issues Found:  {$scan->issues_found}\n";
        $body .= "Status:        {$status_label}\n";
        $body .= "Duration:      {$scan->duration_seconds}s\n";
        $body .= "Scanned:       {$scan->created_at}\n\n";
        $body .= str_repeat('─', 50) . "\n";

        $module_labels = [
            'basic_checks' => 'Basic Security Checks',
            'headers_check' => 'Security Headers',
            'ssl_check' => 'SSL Certificate',
            'ssl_deep_analysis' => 'SSL/TLS Deep Analysis',
            'wordpress_checks' => 'WordPress Security',
            'waf_test' => 'WAF Protection Test',
            'directory_listing' => 'Directory Listing',
            'xmlrpc_check' => 'XML-RPC Security',
            'cors_check' => 'CORS Configuration',
            'cookie_security' => 'Cookie Security',
            'file_upload_check' => 'File Upload Security',
            'php_info_exposure' => 'PHP Info Exposure',
            'vulnerability_scan' => 'Vulnerability Scan',
            'malware_scan' => 'Malware Scan',
            'ml_malware_scan' => 'MDefender ML Malware Scan',
            'db_scan' => 'Database Security',
            'db_integrity' => 'Database Integrity',
            'port_scan' => 'Port Scan',
            'ml_analysis' => 'ML Analysis',
            'password_audit' => 'Password Audit',
            'blocklist_check' => 'Domain Blocklist',
            'fpd_check' => 'Full Path Disclosure',
            'dns_security' => 'DNS Security',
            'rss_spam_check' => 'RSS Spam Check',
            'deprecated_php' => 'Deprecated PHP',
            'file_permissions' => 'File Permissions',
            'server_fingerprint' => 'Server Fingerprint',
            'config_exposure' => 'Config File Exposure',
            'known_files_check' => 'Known File Verification',
        ];

        foreach ($results as $key => $data) {
            if (!isset($module_labels[$key])) continue;
            $label = $module_labels[$key];
            $body .= "\n▸ {$label}\n";

            if (is_array($data)) {
                foreach ($data as $k => $v) {
                    if (is_bool($v)) {
                        $body .= "  " . ($v ? "⚠ " : "✓ ") . $k . "\n";
                    } elseif (is_string($v) || is_int($v)) {
                        $body .= "  • {$k}: {$v}\n";
                    }
                }
            }
        }

        $body .= "\n" . str_repeat('═', 50) . "\n";
        $body .= "Review Details: " . admin_url('admin.php?page=waf-firewall-scan') . "\n";
        $body .= "Generated by: MDefender-Pro Enterprise v" . WAF_FW_VERSION . "\n";

        $sent = wp_mail($email, $subject, $body);
        if ($sent) {
            wp_send_json_success(['message' => 'Scan report sent to ' . $email]);
        } else {
            wp_send_json_error(['message' => 'Failed to send email']);
        }
    }

    public function get_scan_metrics() {
        $this->check_access();
        global $wpdb;
        $metrics = get_option('waf_fw_scan_metrics', []);
        $history_count = $wpdb->get_var("SELECT COUNT(*) FROM " . WAF_FW_DB::instance()->get_scan_results_table());
        $metrics['total_scans'] = (int) $history_count;

        $avg_score = $wpdb->get_var("SELECT AVG(score) FROM " . WAF_FW_DB::instance()->get_scan_results_table() . " WHERE score > 0");
        $metrics['average_score'] = $avg_score ? round($avg_score) : 0;

        wp_send_json_success($metrics);
    }

    public function get_scan_stage_detail() {
        $this->check_access();
        $stage = sanitize_text_field($_GET['stage'] ?? '');
        if (!$stage) {
            wp_send_json_error(['message' => 'No stage specified']);
        }

        $stage_info = [
            'init' => ['label' => 'Initializing Scan', 'description' => 'Preparing scan environment and loading modules', 'icon' => 'download'],
            'basic' => ['label' => 'Basic Security Checks', 'description' => 'Testing common exposure points and admin paths', 'icon' => 'shield'],
            'headers' => ['label' => 'Security Headers', 'description' => 'Checking HTTP security headers (CSP, HSTS, X-Frame-Options)', 'icon' => 'list-view'],
            'ssl' => ['label' => 'SSL Certificate', 'description' => 'Validating SSL certificate and HTTPS configuration', 'icon' => 'lock'],
            'ssl_deep' => ['label' => 'SSL/TLS Deep Analysis', 'description' => 'Testing TLS protocols, cipher suites, and certificate strength', 'icon' => 'lock'],
            'wp_core' => ['label' => 'WordPress Core Security', 'description' => 'Checking WordPress version, settings, and configuration', 'icon' => 'wordpress'],
            'waf_test' => ['label' => 'WAF Protection Test', 'description' => 'Testing WAF against SQLi, XSS, LFI, RCE, SSTI attacks', 'icon' => 'shields'],
            'directories' => ['label' => 'Directory Listing', 'description' => 'Checking for enabled directory browsing', 'icon' => 'folder'],
            'xmlrpc' => ['label' => 'XML-RPC Security', 'description' => 'Testing XML-RPC endpoint for vulnerabilities', 'icon' => 'networking'],
            'cors' => ['label' => 'CORS Configuration', 'description' => 'Checking Cross-Origin Resource Sharing policy', 'icon' => 'admin-links'],
            'cookies' => ['label' => 'Cookie Security', 'description' => 'Auditing cookies for Secure, HttpOnly, and SameSite flags', 'icon' => 'portfolio'],
            'file_upload' => ['label' => 'File Upload Security', 'description' => 'Checking upload directory permissions and PHP execution', 'icon' => 'upload'],
            'php_info' => ['label' => 'PHP Info Exposure', 'description' => 'Scanning for exposed phpinfo() files', 'icon' => 'info'],
            'vulnerabilities' => ['label' => 'Vulnerability Scan', 'description' => 'Checking against known CVEs for WordPress, plugins, and themes', 'icon' => 'warning'],
            'file_changes' => ['label' => 'File Integrity', 'description' => 'Comparing file hashes against known-good baseline', 'icon' => 'edit'],
            'malware' => ['label' => 'Malware Scan', 'description' => 'Deep scan for malware, web shells, backdoors, and suspicious code', 'icon' => 'analytics'],
            'ml_malware' => ['label' => 'MDefender ML Malware Scan', 'description' => 'Files analyzed by the MDefender-Pro malware model for verdicts, risk scores, and malware families', 'icon' => 'rocket'],
            'db_scan' => ['label' => 'Database Security', 'description' => 'Scanning database for injected scripts and suspicious accounts', 'icon' => 'database'],
            'port_scan' => ['label' => 'Port Scan', 'description' => 'Identifying open ports and exposed services', 'icon' => 'networking'],
            'ml_scan' => ['label' => 'ML Analysis', 'description' => 'AI-powered attack detection and pattern analysis', 'icon' => 'rocket'],
            'password_audit' => ['label' => 'Password Audit', 'description' => 'Checking for weak passwords and admin account security', 'icon' => 'admin-users'],
            'blocklist' => ['label' => 'Domain Blocklist', 'description' => 'Checking IP/domain against DNSBL and malware blocklists', 'icon' => 'dismiss'],
            'full_path_disclosure' => ['label' => 'Full Path Disclosure', 'description' => 'Testing for path disclosure vulnerabilities in error messages', 'icon' => 'visibility'],
            'db_integrity' => ['label' => 'Database Integrity', 'description' => 'Checking table integrity, orphaned records, and performance', 'icon' => 'database'],
            'dns_check' => ['label' => 'DNS Security', 'description' => 'Auditing SPF, DMARC, CAA, and DNS configuration', 'icon' => 'admin-network'],
            'rss_spam' => ['label' => 'RSS Spam Check', 'description' => 'Scanning RSS feeds for injected spam content', 'icon' => 'rss'],
            'deprecated_php' => ['label' => 'Deprecated PHP', 'description' => 'Finding deprecated and removed PHP functions in code', 'icon' => 'art'],
            'file_permissions' => ['label' => 'File Permissions', 'description' => 'Auditing critical file and directory permissions', 'icon' => 'admin-generic'],
            'server_fingerprint' => ['label' => 'Server Fingerprint', 'description' => 'Detecting server software, versions, and information disclosure', 'icon' => 'desktop'],
            'config_exposure' => ['label' => 'Config File Exposure', 'description' => 'Scanning for exposed .env, backups, logs, and sensitive files', 'icon' => 'hidden'],
            'known_files' => ['label' => 'Known File Verification', 'description' => 'Verifying core files against WordPress.org checksums', 'icon' => 'yes-alt'],
            'complete' => ['label' => 'Finalizing Scan', 'description' => 'Compiling results and calculating security score', 'icon' => 'yes'],
        ];

        if (isset($stage_info[$stage])) {
            wp_send_json_success($stage_info[$stage]);
        } else {
            wp_send_json_error(['message' => 'Unknown stage']);
        }
    }

    public function whois_lookup() {
        $this->check_access();
        $ip = sanitize_text_field($_GET['ip'] ?? '');
        if (empty($ip)) {
            wp_send_json_error(['message' => 'IP is required']);
        }

        // Fetch basic GeoIP details
        $response = wp_remote_get("http://ip-api.com/json/{$ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query", ['timeout' => 5]);
        $geo = [];
        if (!is_wp_error($response)) {
            $geo = json_decode(wp_remote_retrieve_body($response), true);
        }

        // Fetch raw Whois details from socket connections with fallback
        $raw_whois = $this->query_whois_server($ip);

        wp_send_json_success([
            'geo' => $geo,
            'raw' => $raw_whois
        ]);
    }

    private function query_whois_server($ip) {
        $server = "whois.iana.org";
        $port = 43;
        $timeout = 3;

        $fp = @fsockopen($server, $port, $errno, $errstr, $timeout);
        if (!$fp) {
            // Fallback: request text details from RIPEstat public web registry api
            $url = "https://stat.ripe.net/data/whois/data.json?resource=" . urlencode($ip);
            $resp = wp_remote_get($url, ['timeout' => 4]);
            if (is_wp_error($resp)) {
                return "Whois query failed: Could not connect to Whois registries.";
            }
            $data = json_decode(wp_remote_retrieve_body($resp), true);
            $records = $data['data']['records'] ?? [];
            $output = "";
            foreach ($records as $rec) {
                foreach ($rec as $line) {
                    $output .= $line['key'] . ": " . $line['value'] . "\n";
                }
                $output .= "\n" . str_repeat("-", 40) . "\n\n";
            }
            return $output ?: "No whois record found.";
        }

        fputs($fp, $ip . "\r\n");
        $out = "";
        while (!feof($fp)) {
            $out .= fgets($fp, 128);
        }
        fclose($fp);

        if (preg_match('/refer:\s+([^\s]+)/i', $out, $matches)) {
            $refer_server = trim($matches[1]);
            $fp2 = @fsockopen($refer_server, $port, $errno, $errstr, $timeout);
            if ($fp2) {
                fputs($fp2, $ip . "\r\n");
                $out2 = "";
                while (!feof($fp2)) {
                    $out2 .= fgets($fp2, 128);
                }
                fclose($fp2);
                return $out2;
            }
        }

        return $out;
    }

    public function delete_scan_file() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $path = wp_normalize_path(ABSPATH . $file);
        if (strpos($path, wp_normalize_path(ABSPATH)) === false || strpos($path, '..') !== false) {
            wp_send_json_error(['message' => 'Invalid file path']);
        }

        if (!file_exists($path)) {
            wp_send_json_error(['message' => 'File does not exist']);
        }

        if (@unlink($path)) {
            wp_send_json_success(['message' => 'File deleted successfully']);
        } else {
            wp_send_json_error(['message' => 'Failed to delete file. Check permissions.']);
        }
    }

    public function restore_core_file() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $path = wp_normalize_path(ABSPATH . $file);
        if (strpos($path, wp_normalize_path(ABSPATH)) === false || strpos($path, '..') !== false) {
            wp_send_json_error(['message' => 'Invalid file path']);
        }

        $is_core = false;
        $core_prefixes = ['wp-admin/', 'wp-includes/', 'index.php', 'wp-activate.php', 'wp-blog-header.php', 'wp-comments-post.php', 'wp-cron.php', 'wp-links-opml.php', 'wp-load.php', 'wp-login.php', 'wp-mail.php', 'wp-settings.php', 'wp-signup.php', 'wp-trackback.php', 'xmlrpc.php'];
        foreach ($core_prefixes as $prefix) {
            if (strpos($file, $prefix) === 0 || dirname($file) === '.') {
                $is_core = true;
                break;
            }
        }
        if (!$is_core) {
            wp_send_json_error(['message' => 'Only core files can be automatically restored.']);
        }

        global $wp_version;
        $url = "https://core.svn.wordpress.org/tags/" . $wp_version . "/" . $file;
        $response = wp_remote_get($url, ['timeout' => 15]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            wp_send_json_error(['message' => 'Could not download official core file from WordPress.org.']);
        }

        $content = wp_remote_retrieve_body($response);
        if (empty($content)) {
            wp_send_json_error(['message' => 'Downloaded core file is empty.']);
        }

        // Back up before overwriting for safety
        $this->perform_file_backup($file);

        if (@file_put_contents($path, $content) !== false) {
            wp_send_json_success(['message' => 'Official core file restored successfully.']);
        } else {
            wp_send_json_error(['message' => 'Failed to overwrite core file. Check permissions.']);
        }
    }

    public function view_scan_file() {
        $this->check_access();
        $file = sanitize_text_field($_GET['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $path = wp_normalize_path(ABSPATH . $file);
        if (strpos($path, wp_normalize_path(ABSPATH)) === false || strpos($path, '..') !== false) {
            wp_send_json_error(['message' => 'Invalid file path']);
        }

        if (!file_exists($path)) {
            wp_send_json_error(['message' => 'File not found']);
        }

        $content = @file_get_contents($path);
        if ($content === false) {
            wp_send_json_error(['message' => 'Could not read file contents']);
        }

        $preview = mb_strimwidth($content, 0, 15000, '... [truncated]');
        wp_send_json_success([
            'file' => $file,
            'content' => esc_html($preview),
            'size' => filesize($path)
        ]);
    }

    public function ignore_scan_issue() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'Issue path is required']);

        $ignored = get_option('waf_fw_ignored_issues', []);
        if (!in_array($file, $ignored)) {
            $ignored[] = $file;
            update_option('waf_fw_ignored_issues', $ignored);
        }
        wp_send_json_success(['message' => 'Issue ignored successfully']);
    }

    public function get_admin_attacks() {
        $this->check_access();
        global $wpdb;
        $table_attacks = $wpdb->prefix . WAF_FW_TABLE_ATTACKS;

        $results = [];
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_attacks'") === $table_attacks) {
            $logs = $wpdb->get_results("SELECT ip, url, method, attack_type, status, rule_matched, user_agent, created_at FROM $table_attacks WHERE url LIKE '%wp-admin%' OR url LIKE '%wp-login.php%' OR attack_type LIKE '%Login%' ORDER BY id DESC LIMIT 50");
            foreach ($logs as $l) {
                $results[] = [
                    'ip' => $l->ip,
                    'url' => $l->url,
                    'method' => $l->method,
                    'attack_type' => $l->attack_type ?: 'Admin Access Attempt',
                    'status' => $l->status,
                    'rule' => $l->rule_matched ?: 'N/A',
                    'user_agent' => $l->user_agent,
                    'time' => $l->created_at
                ];
            }
        }
        wp_send_json_success($results);
    }

    public function get_diagnostics() {
        $this->check_access();
        global $wpdb;

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $active_plugins_option = get_option('active_plugins', []);
        $plugin_list = [];

        foreach ($all_plugins as $plugin_file => $data) {
            $is_active = in_array($plugin_file, $active_plugins_option);
            $plugin_list[] = [
                'name' => $data['Name'],
                'version' => $data['Version'],
                'author' => strip_tags($data['Author']),
                'status' => $is_active ? 'Active' : 'Inactive',
                'file' => $plugin_file
            ];
        }

        $theme = wp_get_theme();
        $theme_info = [
            'name' => $theme->get('Name'),
            'version' => $theme->get('Version'),
            'author' => strip_tags($theme->get('Author')),
        ];

        $paths_to_check = [
            'ABSPATH' => ABSPATH,
            'wp-content' => WP_CONTENT_DIR,
            'plugins' => WP_PLUGIN_DIR,
            'uploads' => wp_upload_dir()['basedir'],
            'wp-config.php' => ABSPATH . 'wp-config.php',
            '.htaccess' => ABSPATH . '.htaccess',
        ];

        $perms = [];
        foreach ($paths_to_check as $label => $path) {
            if (file_exists($path)) {
                $perms[$label] = [
                    'perms' => substr(sprintf('%o', fileperms($path)), -4),
                    'writable' => is_writable($path),
                    'readable' => is_readable($path)
                ];
            } else {
                $perms[$label] = ['perms' => 'N/A', 'writable' => false, 'readable' => false];
            }
        }

        $diagnostics = [
            'php_version' => PHP_VERSION,
            'sapi' => php_sapi_name(),
            'wp_version' => get_bloginfo('version'),
            'mysql_version' => $wpdb->db_version(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'curl_enabled' => function_exists('curl_version'),
            'openssl_enabled' => extension_loaded('openssl'),
            'file_editor_disabled' => defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT,
            'waf_protection_enabled' => get_option('waf_fw_protection_enabled', 'yes') === 'yes',
            'plugins' => $plugin_list,
            'theme' => $theme_info,
            'permissions' => $perms,
            'tables_status' => [
                'requests' => $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}" . WAF_FW_TABLE_REQUESTS . "'") ? 'ok' : 'missing',
                'attacks' => $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}" . WAF_FW_TABLE_ATTACKS . "'") ? 'ok' : 'missing',
                'blacklist' => $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}" . WAF_FW_TABLE_BLACKLIST . "'") ? 'ok' : 'missing',
                'scan_queue' => $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}" . WAF_FW_TABLE_SCAN_QUEUE . "'") ? 'ok' : 'missing',
            ]
        ];

        wp_send_json_success($diagnostics);
    }

    public function get_backups() {
        $this->check_access();
        $backups = get_option('waf_fw_backups', []);
        $formatted = [];
        foreach ($backups as $orig => $info) {
            $formatted[] = [
                'original_path' => $orig,
                'backup_id' => $info['backup_id'],
                'time' => $info['time'],
                'size' => size_format($info['size']),
            ];
        }
        wp_send_json_success($formatted);
    }

    public function clean_file() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        $scan_id = intval($data['scan_id'] ?? 0);
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $path = wp_normalize_path(ABSPATH . $file);
        if (strpos($path, wp_normalize_path(ABSPATH)) === false || strpos($path, '..') !== false) {
            wp_send_json_error(['message' => 'Invalid file path']);
        }

        if (!file_exists($path)) {
            wp_send_json_error(['message' => 'File does not exist']);
        }

        $backup_success = $this->perform_file_backup($file, $scan_id);
        if (!$backup_success) {
            wp_send_json_error(['message' => 'Failed to create backup. Clean aborted for safety.']);
        }

        if (@unlink($path)) {
            wp_send_json_success(['message' => 'File backed up and cleaned successfully.']);
        } else {
            wp_send_json_error(['message' => 'File backed up, but failed to delete original file. Check permissions.']);
        }
    }

    public function restore_file() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $backups = get_option('waf_fw_backups', []);
        if (!isset($backups[$file])) {
            wp_send_json_error(['message' => 'No backup found for this file.']);
        }

        $info = $backups[$file];
        $backup_path = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups/' . $info['backup_id']);
        if (!file_exists($backup_path)) {
            wp_send_json_error(['message' => 'Backup file not found on server.']);
        }

        $abs_path = wp_normalize_path(ABSPATH . $file);
        $parent = dirname($abs_path);
        if (!is_dir($parent)) {
            wp_mkdir_p($parent);
        }

        if (@copy($backup_path, $abs_path)) {
            @unlink($backup_path);
            unset($backups[$file]);
            update_option('waf_fw_backups', $backups);
            
            // Delete from database backups table
            global $wpdb;
            $table = WAF_FW_DB::instance()->get_cleaned_backups_table();
            $wpdb->delete($table, ['original_path' => $file]);
            
            wp_send_json_success(['message' => 'File restored successfully.']);
        } else {
            wp_send_json_error(['message' => 'Failed to restore file. Check write permissions.']);
        }
    }

    public function delete_backup() {
        $this->check_access();
        $this->verify_nonce();
        $data = json_decode(file_get_contents('php://input'), true);
        $file = sanitize_text_field($data['file'] ?? '');
        if (empty($file)) wp_send_json_error(['message' => 'File path is required']);

        $backups = get_option('waf_fw_backups', []);
        if (isset($backups[$file])) {
            $info = $backups[$file];
            $backup_path = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups/' . $info['backup_id']);
            if (file_exists($backup_path)) {
                @unlink($backup_path);
            }
            unset($backups[$file]);
            update_option('waf_fw_backups', $backups);
        }
        
        // Delete from database backups table
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_cleaned_backups_table();
        $wpdb->delete($table, ['original_path' => $file]);
        
        wp_send_json_success(['message' => 'Backup deleted permanently.']);
    }

    private function perform_file_backup($file, $scan_id = 0) {
        $abs_path = wp_normalize_path(ABSPATH . $file);
        if (!file_exists($abs_path)) return false;

        $backup_dir = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups');
        if (!is_dir($backup_dir)) {
            wp_mkdir_p($backup_dir);
            @file_put_contents($backup_dir . '/index.php', '<?php // Silence');
            @file_put_contents($backup_dir . '/.htaccess', "Order Deny,Allow\nDeny from all");
        }

        $backup_id = uniqid('mdf_') . '_' . basename($file) . '.bak';
        $backup_path = $backup_dir . '/' . $backup_id;
        $file_hash = hash_file('sha256', $abs_path);

        if (@copy($abs_path, $backup_path)) {
            $backups = get_option('waf_fw_backups', []);
            $backups[$file] = [
                'backup_id' => $backup_id,
                'time' => current_time('mysql'),
                'original_path' => $file,
                'size' => filesize($abs_path),
            ];
            update_option('waf_fw_backups', $backups);

            // Log details into database backups table
            global $wpdb;
            $table = WAF_FW_DB::instance()->get_cleaned_backups_table();
            $wpdb->insert($table, [
                'scan_id' => $scan_id,
                'original_path' => $file,
                'backup_path' => $backup_path,
                'file_hash' => $file_hash,
                'cleaned_at' => current_time('mysql')
            ]);

            return true;
        }
        return false;
    }
}
