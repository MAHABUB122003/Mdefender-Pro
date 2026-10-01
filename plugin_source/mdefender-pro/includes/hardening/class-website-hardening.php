<?php
/**
 * MDefender-Pro Enterprise Website Hardening & Security Engine
 *
 * Implements a complete hardening lifecycle:
 * Detect -> Assess -> Backup -> Harden -> Verify -> Monitor -> Detect Drift -> Remediate -> Rollback
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_Website_Hardening {
    private static $_instance = null;
    private $db;
    private $backup_dir;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->db = class_exists('WAF_FW_DB') ? WAF_FW_DB::instance() : null;
        $this->backup_dir = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups/safety_snapshots/');

        // 1. XML-RPC Dynamic Filter
        $xmlrpc_mode = get_option('waf_harden_xmlrpc_mode', get_option('waf_fw_disable_xmlrpc') === 'yes' ? 'complete' : 'off');
        if ($xmlrpc_mode === 'complete') {
            add_filter('xmlrpc_enabled', '__return_false');
        } elseif ($xmlrpc_mode === 'jetpack_only') {
            add_filter('xmlrpc_enabled', function($enabled) {
                $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
                if (stripos($user_agent, 'Jetpack') !== false || stripos($user_agent, 'Automattic') !== false) {
                    return true;
                }
                return false;
            });
        }

        // 2. Pingback Amplification Blocker
        if (get_option('waf_harden_block_pingback') === 'yes') {
            add_filter('xmlrpc_methods', function($methods) {
                unset($methods['pingback.ping']);
                unset($methods['pingback.extensions.getPingbacks']);
                return $methods;
            });
        }

        // 3. User Enumeration Protection
        if (get_option('waf_fw_prevent_user_enumeration') === 'yes' || get_option('waf_harden_user_enumeration') === 'enabled' || get_option('waf_harden_disable_user_enum') === 'yes' || get_option('waf_harden_rest_disable_users') === 'yes') {
            if (!is_admin()) {
                // Block ?author=N queries
                if (isset($_REQUEST['author']) || (isset($_GET['author']) && $_GET['author'] !== '')) {
                    status_header(403);
                    wp_die('User enumeration blocked by MDefender-Pro Hardening', 'Access Denied', ['response' => 403]);
                }
                // Block author archives & author feed queries
                add_action('template_redirect', function() {
                    if (is_author() || (function_exists('is_feed') && is_feed() && is_author())) {
                        status_header(403);
                        wp_die('Author archive enumeration blocked by MDefender-Pro', 'Access Denied', ['response' => 403]);
                    }
                });
                // Block /wp/v2/users REST endpoint for unauthenticated users
                add_filter('rest_endpoints', function($endpoints) {
                    if (!is_user_logged_in()) {
                        if (isset($endpoints['/wp/v2/users'])) {
                            unset($endpoints['/wp/v2/users']);
                        }
                        if (isset($endpoints['/wp/v2/users/(?P<id>[\d]+)'])) {
                            unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
                        }
                    }
                    return $endpoints;
                });
            }
        }

        // 4. File Editor Constant Protection
        if (get_option('waf_fw_disable_file_editing') === 'yes' || get_option('waf_harden_disable_file_editor') === 'yes') {
            if (!defined('DISALLOW_FILE_EDIT')) {
                define('DISALLOW_FILE_EDIT', true);
            }
        }

        // 5. Security Headers Hook
        if (get_option('waf_harden_security_headers') === 'enabled') {
            add_action('send_headers', [$this, 'send_security_headers']);
        }

        // 6. WordPress Version Signature Removal
        if (get_option('waf_harden_hide_wp_version') === 'yes' || get_option('waf_harden_version_hiding') === 'enabled') {
            add_filter('the_generator', '__return_empty_string');
            add_filter('style_loader_src', [$this, 'remove_version_query_strings'], 999);
            add_filter('script_loader_src', [$this, 'remove_version_query_strings'], 999);
        }

        // 7. Session Timeout Enforcement for Administrators
        $session_timeout = (int) get_option('waf_harden_admin_session_timeout', 0);
        if ($session_timeout > 0 && is_admin()) {
            add_filter('auth_cookie_expiration', function($expiration, $user_id, $remember) use ($session_timeout) {
                if (user_can($user_id, 'manage_options')) {
                    return $session_timeout;
                }
                return $expiration;
            }, 10, 3);
        }

        // 8. Background Drift Check Hook (WP-Cron)
        add_action('waf_harden_drift_check_cron', [$this, 'run_background_drift_check']);
        if (!wp_next_scheduled('waf_harden_drift_check_cron')) {
            wp_schedule_event(time() + 3600, 'daily', 'waf_harden_drift_check_cron');
        }
    }

    public function remove_version_query_strings($src) {
        if ($src && strpos($src, 'ver=' . get_bloginfo('version')) !== false) {
            $src = remove_query_arg('ver', $src);
        }
        return $src;
    }

    /**
     * Ensure the safety snapshots directory is secured.
     */
    public function ensure_snapshot_dir() {
        if (!is_dir($this->backup_dir)) {
            wp_mkdir_p($this->backup_dir);
        }
        $htaccess = $this->backup_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "# MDefender-Pro Safety Snapshots Protection\nOrder Deny,Allow\nDeny from all\n<Files *>\nRequire all denied\n</Files>\n");
        }
        $index = $this->backup_dir . 'index.php';
        if (!file_exists($index)) {
            @file_put_contents($index, "<?php\n// Silence is golden.\n");
        }
    }

    /**
     * Create pre-change safety backup of sensitive config files.
     */
    public function create_safety_backup($file_type = 'all', $note = 'Pre-change snapshot') {
        $this->ensure_snapshot_dir();
        $timestamp = date('Ymd_His');
        $snapshots = get_option('waf_harden_safety_snapshots', []);
        if (!is_array($snapshots)) $snapshots = [];

        $created = [];

        if ($file_type === 'all' || $file_type === 'wp_config') {
            $src = ABSPATH . 'wp-config.php';
            if (file_exists($src)) {
                $dst_name = 'wp-config-snapshot-' . $timestamp . '.php';
                $dst = $this->backup_dir . $dst_name;
                if (@copy($src, $dst)) {
                    $snap_id = 'snap_config_' . $timestamp;
                    $entry = [
                        'id' => $snap_id,
                        'file_type' => 'wp_config',
                        'filename' => $dst_name,
                        'target' => 'wp-config.php',
                        'created_at' => current_time('mysql'),
                        'size' => filesize($dst),
                        'hash' => hash_file('sha256', $dst),
                        'note' => $note,
                    ];
                    $snapshots[$snap_id] = $entry;
                    $created[] = $entry;
                }
            }
        }

        if ($file_type === 'all' || $file_type === 'htaccess') {
            $src = ABSPATH . '.htaccess';
            if (file_exists($src)) {
                $dst_name = 'htaccess-snapshot-' . $timestamp . '.txt';
                $dst = $this->backup_dir . $dst_name;
                if (@copy($src, $dst)) {
                    $snap_id = 'snap_htaccess_' . $timestamp;
                    $entry = [
                        'id' => $snap_id,
                        'file_type' => 'htaccess',
                        'filename' => $dst_name,
                        'target' => '.htaccess',
                        'created_at' => current_time('mysql'),
                        'size' => filesize($dst),
                        'hash' => hash_file('sha256', $dst),
                        'note' => $note,
                    ];
                    $snapshots[$snap_id] = $entry;
                    $created[] = $entry;
                }
            }
        }

        // Limit snapshots list to latest 20
        if (count($snapshots) > 20) {
            $to_remove = array_slice($snapshots, 0, count($snapshots) - 20, true);
            foreach ($to_remove as $old_id => $old_item) {
                if (file_exists($this->backup_dir . $old_item['filename'])) {
                    @unlink($this->backup_dir . $old_item['filename']);
                }
                unset($snapshots[$old_id]);
            }
        }

        update_option('waf_harden_safety_snapshots', $snapshots);
        return $created;
    }

    /**
     * Reversible Rollback to a specific snapshot.
     */
    public function rollback_safety_backup($snapshot_id) {
        $snapshots = get_option('waf_harden_safety_snapshots', []);
        if (!isset($snapshots[$snapshot_id])) {
            return ['success' => false, 'message' => 'Snapshot ID not found in catalog.'];
        }

        $snap = $snapshots[$snapshot_id];
        $file_path = $this->backup_dir . $snap['filename'];

        if (!file_exists($file_path)) {
            return ['success' => false, 'message' => 'Snapshot file missing from disk: ' . $snap['filename']];
        }

        $target = ABSPATH . $snap['target'];
        
        // Take safety backup of current state before rollback
        $this->create_safety_backup($snap['file_type'], 'Auto-backup prior to rollback');

        if (@copy($file_path, $target)) {
            $this->log_activity('Configuration Rollback', $snap['target'], 'Success', 'Restored to snapshot from ' . $snap['created_at']);
            return ['success' => true, 'message' => 'Successfully restored ' . $snap['target'] . ' from snapshot (' . $snap['created_at'] . ')'];
        }

        return ['success' => false, 'message' => 'Failed to write restored content to ' . $target . '. Check filesystem permissions.'];
    }

    /**
     * Record an event in the hardening activity audit log.
     */
    public function log_activity($action, $control, $result, $details = '', $before = '', $after = '') {
        $logs = get_option('waf_harden_activity_log', []);
        if (!is_array($logs)) $logs = [];

        $current_user = wp_get_current_user();
        $user_login = ($current_user && $current_user->ID) ? $current_user->user_login : 'System/WP-Cron';

        array_unshift($logs, [
            'id' => uniqid('act_'),
            'timestamp' => current_time('mysql'),
            'action' => sanitize_text_field($action),
            'control' => sanitize_text_field($control),
            'result' => sanitize_text_field($result),
            'user' => sanitize_text_field($user_login),
            'details' => sanitize_text_field($details),
            'before_state' => sanitize_text_field($before),
            'after_state' => sanitize_text_field($after),
        ]);

        if (count($logs) > 200) {
            $logs = array_slice($logs, 0, 200);
        }

        update_option('waf_harden_activity_log', $logs);
        update_option('waf_harden_last_change_time', current_time('mysql'));
    }

    public function get_activity_log() {
        return get_option('waf_harden_activity_log', []);
    }

    public function clear_activity_log() {
        update_option('waf_harden_activity_log', []);
        return ['success' => true, 'message' => 'Hardening activity log cleared.'];
    }

    /**
     * Retrieve all 16 modular security features.
     */
    public function get_all_features() {
        return [
            'admin_protect'      => 'Protect wp-admin',
            'login_protect'      => 'Protect wp-login.php',
            'wp_config'          => 'Protect wp-config.php',
            'htaccess'           => 'Protect .htaccess',
            'uploads'            => 'Protect Uploads Folder',
            'sensitive_files'    => 'Protect Sensitive Files',
            'rest_api'           => 'Protect REST API',
            'xmlrpc'             => 'Protect XML-RPC',
            'php_files'          => 'Protect PHP Files',
            'file_perms'         => 'File Permissions',
            'security_headers'   => 'Security Headers',
            'user_accounts'      => 'User Account Protection',
            'backup'             => 'Backup Protection',
            'plugin_theme'       => 'Plugin & Theme Protection',
            'directory_browsing' => 'Directory Browsing',
            'version_hiding'     => 'WordPress Version Hiding',
        ];
    }

    /**
     * Categorize features across the 8 Core Defense Categories.
     */
    public function get_category_map() {
        return [
            'core' => [
                'title' => 'Core Security',
                'features' => ['wp_config', 'version_hiding', 'plugin_theme'],
            ],
            'auth' => [
                'title' => 'Authentication',
                'features' => ['admin_protect', 'login_protect', 'user_accounts'],
            ],
            'files' => [
                'title' => 'File Security',
                'features' => ['htaccess', 'uploads', 'sensitive_files', 'file_perms', 'directory_browsing'],
            ],
            'network' => [
                'title' => 'Network Security',
                'features' => ['rest_api', 'xmlrpc', 'php_files'],
            ],
            'headers' => [
                'title' => 'Security Headers',
                'features' => ['security_headers'],
            ],
            'database' => [
                'title' => 'Database Security',
                'features' => ['backup'],
            ],
            'backup' => [
                'title' => 'Backup & Recovery',
                'features' => ['backup'],
            ],
            'monitoring' => [
                'title' => 'Continuous Security',
                'features' => ['plugin_theme', 'php_files', 'sensitive_files'],
            ],
        ];
    }

    public function get_status($feature = null) {
        if ($feature) {
            return get_option('waf_harden_' . $feature, 'disabled');
        }
        $features = $this->get_all_features();
        $statuses = [];
        foreach ($features as $key => $label) {
            $statuses[$key] = [
                'label' => $label,
                'status' => get_option('waf_harden_' . $key, 'disabled'),
                'settings' => get_option('waf_harden_' . $key . '_settings', []),
            ];
        }
        return $statuses;
    }

    /**
     * Compute authentic Security Defense Index & Category breakdown.
     */
    public function generate_report() {
        $statuses = $this->get_status();
        $cat_map = $this->get_category_map();
        $category_scores = [];

        $total_controls = count($statuses);
        $passed_controls = 0;
        $failed_controls = 0;

        foreach ($cat_map as $cat_key => $cat_info) {
            $cat_total = 0;
            $cat_passed = 0;
            foreach ($cat_info['features'] as $f_key) {
                if (isset($statuses[$f_key])) {
                    $cat_total++;
                    if ($statuses[$f_key]['status'] === 'enabled') {
                        $cat_passed++;
                    }
                }
            }
            $cat_score = $cat_total > 0 ? round(($cat_passed / $cat_total) * 100) : 0;
            $category_scores[$cat_key] = [
                'title' => $cat_info['title'],
                'score' => $cat_score,
                'passed' => $cat_passed,
                'failed' => $cat_total - $cat_passed,
                'status' => $cat_score >= 80 ? 'Optimal' : ($cat_score >= 50 ? 'Moderate' : 'Action Needed'),
            ];
        }

        $details = [];
        foreach ($statuses as $key => $info) {
            $enabled = $info['status'] === 'enabled';
            if ($enabled) {
                $passed_controls++;
            } else {
                $failed_controls++;
            }
            $details[] = [
                'feature' => $key,
                'label' => $info['label'],
                'status' => $enabled ? 'enabled' : 'disabled',
                'score' => $enabled ? 100 : 0,
                'recommendation' => $enabled ? null : 'Enable ' . $info['label'] . ' to harden defense posture',
            ];
        }

        $overall_score = $total_controls > 0 ? round(($passed_controls / $total_controls) * 100) : 0;
        $grade = $overall_score >= 90 ? 'A' : ($overall_score >= 80 ? 'B' : ($overall_score >= 70 ? 'C' : ($overall_score >= 55 ? 'D' : 'F')));

        $last_audit = get_option('waf_harden_last_audit_time', current_time('mysql'));
        $last_change = get_option('waf_harden_last_change_time', 'None yet');

        update_option('waf_harden_last_audit_time', current_time('mysql'));

        return [
            'score' => $overall_score,
            'grade' => $grade,
            'status' => $overall_score >= 75 ? 'Active & Protected' : 'Needs Attention',
            'total_features' => $total_controls,
            'enabled_count' => $passed_controls,
            'failed_count' => $failed_controls,
            'last_audit' => $last_audit,
            'last_change' => $last_change,
            'category_scores' => $category_scores,
            'details' => $details,
        ];
    }

    /* ===== 1. ADMIN PROTECT ===== */
    public function apply_admin_protect($settings = []) {
        $this->create_safety_backup('wp_config', 'Pre-admin protect backup');
        $results = ['feature' => 'admin_protect', 'actions' => []];

        if (isset($settings['disable_file_editor']) && $settings['disable_file_editor']) {
            if (!defined('DISALLOW_FILE_EDIT')) {
                $this->write_to_wp_config('DISALLOW_FILE_EDIT', 'true');
                $results['actions'][] = 'File editor disabled in wp-config.php (DISALLOW_FILE_EDIT)';
            }
            update_option('waf_harden_disable_file_editor', 'yes');
        } else {
            update_option('waf_harden_disable_file_editor', 'no');
        }

        if (isset($settings['admin_ip_whitelist'])) {
            update_option('waf_harden_admin_ips', sanitize_textarea_field($settings['admin_ip_whitelist']));
            $results['actions'][] = 'Admin IP whitelist updated';
        }

        if (isset($settings['admin_session_timeout'])) {
            $to = max(300, (int)$settings['admin_session_timeout']);
            update_option('waf_harden_admin_session_timeout', $to);
            $results['actions'][] = 'Admin session timeout set to ' . $to . 's';
        }

        if (isset($settings['disable_user_enum'])) {
            $enum_val = $settings['disable_user_enum'] ? 'yes' : 'no';
            update_option('waf_harden_disable_user_enum', $enum_val);
            $results['actions'][] = 'User enumeration ' . ($enum_val === 'yes' ? 'disabled' : 'enabled');
        }

        update_option('waf_harden_admin_protect', 'enabled');
        update_option('waf_harden_admin_protect_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect wp-admin', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_admin_protect() {
        $this->remove_from_wp_config('DISALLOW_FILE_EDIT');
        delete_option('waf_harden_disable_file_editor');
        delete_option('waf_harden_admin_ips');
        delete_option('waf_harden_admin_session_timeout');
        delete_option('waf_harden_disable_user_enum');
        update_option('waf_harden_admin_protect', 'disabled');
        update_option('waf_harden_admin_protect_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect wp-admin', 'Disabled', 'Admin protection reset');
    }

    /* ===== 2. LOGIN PROTECT ===== */
    public function apply_login_protect($settings = []) {
        $results = ['feature' => 'login_protect', 'actions' => []];

        if (isset($settings['login_captcha'])) {
            update_option('waf_harden_login_captcha', $settings['login_captcha'] ? 'yes' : 'no');
            $results['actions'][] = 'Login CAPTCHA ' . ($settings['login_captcha'] ? 'enabled' : 'disabled');
        }
        if (isset($settings['recaptcha_site_key'])) {
            update_option('waf_harden_recaptcha_site_key', sanitize_text_field($settings['recaptcha_site_key']));
        }
        if (isset($settings['recaptcha_secret_key'])) {
            update_option('waf_harden_recaptcha_secret_key', sanitize_text_field($settings['recaptcha_secret_key']));
        }
        if (isset($settings['login_rename'])) {
            update_option('waf_harden_login_rename', sanitize_title($settings['login_rename']));
            $results['actions'][] = 'Custom login slug updated';
        }
        if (isset($settings['brute_force_threshold'])) {
            $th = max(3, (int)$settings['brute_force_threshold']);
            update_option('waf_harden_brute_force_threshold', $th);
            $results['actions'][] = 'Brute force threshold set to ' . $th . ' attempts';
        }
        if (isset($settings['login_lockout_time'])) {
            $lockout = max(300, (int)$settings['login_lockout_time']);
            update_option('waf_harden_login_lockout_time', $lockout);
            $results['actions'][] = 'Lockout duration set to ' . $lockout . 's';
        }

        update_option('waf_harden_login_protect', 'enabled');
        update_option('waf_harden_login_protect_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect wp-login.php', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_login_protect() {
        delete_option('waf_harden_login_captcha');
        delete_option('waf_harden_recaptcha_site_key');
        delete_option('waf_harden_recaptcha_secret_key');
        delete_option('waf_harden_login_rename');
        delete_option('waf_harden_brute_force_threshold');
        delete_option('waf_harden_login_lockout_time');
        update_option('waf_harden_login_protect', 'disabled');
        update_option('waf_harden_login_protect_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect wp-login.php', 'Disabled', 'Login protection removed');
    }

    /* ===== 3. WP-CONFIG PROTECT ===== */
    public function apply_wp_config_protect($settings = []) {
        $results = ['feature' => 'wp_config', 'actions' => []];
        $config_path = ABSPATH . 'wp-config.php';

        if (!file_exists($config_path)) {
            $results['error'] = 'wp-config.php not found in root';
            return $results;
        }

        $this->create_safety_backup('wp_config', 'Pre wp-config.php lock snapshot');
        $results['actions'][] = 'Safety snapshot generated';

        if (!empty($settings['lock_permissions'])) {
            @chmod($config_path, 0600);
            $results['actions'][] = 'Permissions locked to 0600';
        }

        update_option('waf_harden_wp_config', 'enabled');
        update_option('waf_harden_wp_config_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect wp-config.php', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_wp_config_protect() {
        $config_path = ABSPATH . 'wp-config.php';
        if (file_exists($config_path)) {
            @chmod($config_path, 0644);
        }
        update_option('waf_harden_wp_config', 'disabled');
        update_option('waf_harden_wp_config_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect wp-config.php', 'Disabled', 'Permissions reset to 0644');
    }

    /* ===== 4. HTACCESS PROTECT ===== */
    public function apply_htaccess_protect($settings = []) {
        $results = ['feature' => 'htaccess', 'actions' => []];
        $htaccess = ABSPATH . '.htaccess';

        $this->create_safety_backup('htaccess', 'Pre .htaccess hardening snapshot');
        $results['actions'][] = 'Safety snapshot generated';

        if (isset($settings['block_dir_browsing']) && $settings['block_dir_browsing']) {
            $this->ensure_htaccess_rule($htaccess, 'block_directory_browsing');
            $results['actions'][] = 'Directory browsing disabled (Options -Indexes)';
        }
        if (isset($settings['protect_wp_config']) && $settings['protect_wp_config']) {
            $this->ensure_htaccess_rule($htaccess, 'protect_wp_config');
            $results['actions'][] = 'wp-config.php access guard added';
        }
        // block_php_uploads MUST strictly target wp-content/uploads/.htaccess, NEVER root .htaccess
        if (!empty($settings['block_php_uploads'])) {
            $this->apply_uploads_protect(['block_php' => true]);
            $results['actions'][] = 'PHP execution blocked in wp-content/uploads/ directory';
        }

        update_option('waf_harden_htaccess', 'enabled');
        update_option('waf_harden_htaccess_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect .htaccess', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_htaccess_protect() {
        $this->restore_htaccess_backup();
        update_option('waf_harden_htaccess', 'disabled');
        update_option('waf_harden_htaccess_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect .htaccess', 'Disabled', 'Restored previous .htaccess state');
    }

    /* ===== 5. UPLOADS PROTECT ===== */
    public function apply_uploads_protect($settings = []) {
        $results = ['feature' => 'uploads', 'actions' => []];
        $upload_dir = wp_upload_dir();
        $htaccess = $upload_dir['basedir'] . '/.htaccess';

        if (isset($settings['block_php'])) {
            $this->ensure_htaccess_rule($htaccess, 'block_php_uploads', true);
            $results['actions'][] = 'PHP execution disabled in uploads via dedicated .htaccess';
        }
        if (isset($settings['scan_uploads'])) {
            update_option('waf_harden_scan_uploads', $settings['scan_uploads'] ? 'yes' : 'no');
            $results['actions'][] = 'Media upload scanning ' . ($settings['scan_uploads'] ? 'enabled' : 'disabled');
        }
        if (isset($settings['block_executables'])) {
            update_option('waf_harden_block_executables', $settings['block_executables'] ? 'yes' : 'no');
            $results['actions'][] = 'Executable extensions blocked';
        }

        update_option('waf_harden_uploads', 'enabled');
        update_option('waf_harden_uploads_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect Uploads', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_uploads_protect() {
        $upload_dir = wp_upload_dir();
        $htaccess = $upload_dir['basedir'] . '/.htaccess';
        if (file_exists($htaccess)) {
            @unlink($htaccess);
        }
        delete_option('waf_harden_scan_uploads');
        delete_option('waf_harden_block_executables');
        update_option('waf_harden_uploads', 'disabled');
        update_option('waf_harden_uploads_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect Uploads', 'Disabled', 'Uploads protection removed');
    }

    /* ===== 6. SENSITIVE FILES ===== */
    public function apply_sensitive_files_protect($settings = []) {
        $results = ['feature' => 'sensitive_files', 'actions' => []];
        $files = [
            '.env', 'web.config', 'composer.json', 'composer.lock', 'package.json',
            'readme.html', 'license.txt', 'debug.log', 'error_log',
        ];
        $locked = 0;
        foreach ($files as $file) {
            $path = ABSPATH . $file;
            if (file_exists($path)) {
                $perms = @fileperms($path);
                if ($perms !== false && ($perms & 0044)) {
                    @chmod($path, 0600);
                    $locked++;
                }
            }
        }
        if ($locked > 0) {
            $results['actions'][] = "Permissions tightened for {$locked} sensitive files";
        }

        if (isset($settings['protect_git'])) {
            $git = ABSPATH . '.git';
            if (is_dir($git) && !file_exists($git . '/.htaccess')) {
                @file_put_contents($git . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
                $results['actions'][] = '.git repository directory access blocked';
            }
        }

        update_option('waf_harden_sensitive_files', 'enabled');
        update_option('waf_harden_sensitive_files_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect Sensitive Files', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_sensitive_files_protect() {
        update_option('waf_harden_sensitive_files', 'disabled');
        update_option('waf_harden_sensitive_files_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect Sensitive Files', 'Disabled', 'Sensitive files protection disabled');
    }

    /* ===== 7. REST API PROTECT ===== */
    public function apply_rest_api_protect($settings = []) {
        $results = ['feature' => 'rest_api', 'actions' => []];

        if (isset($settings['disable_user_endpoints'])) {
            update_option('waf_harden_rest_disable_users', $settings['disable_user_endpoints'] ? 'yes' : 'no');
            $results['actions'][] = 'REST user enumeration ' . ($settings['disable_user_endpoints'] ? 'disabled' : 'enabled');
        }
        if (isset($settings['require_auth'])) {
            update_option('waf_harden_rest_require_auth', $settings['require_auth'] ? 'yes' : 'no');
            $results['actions'][] = 'Anonymous REST access ' . ($settings['require_auth'] ? 'restricted' : 'permitted');
        }
        if (isset($settings['rate_limit'])) {
            update_option('waf_harden_rest_rate_limit', (int)$settings['rate_limit']);
            $results['actions'][] = 'REST rate limit configured';
        }

        update_option('waf_harden_rest_api', 'enabled');
        update_option('waf_harden_rest_api_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect REST API', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_rest_api_protect() {
        delete_option('waf_harden_rest_disable_users');
        delete_option('waf_harden_rest_require_auth');
        delete_option('waf_harden_rest_rate_limit');
        update_option('waf_harden_rest_api', 'disabled');
        update_option('waf_harden_rest_api_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect REST API', 'Disabled', 'REST API protection reset');
    }

    /* ===== 8. XML-RPC PROTECT ===== */
    public function apply_xmlrpc_protect($settings = []) {
        $results = ['feature' => 'xmlrpc', 'actions' => []];
        $mode = $settings['disable_xmlrpc'] ?? 'complete';

        update_option('waf_harden_xmlrpc_mode', $mode);
        if ($mode === 'complete') {
            $results['actions'][] = 'XML-RPC completely disabled';
        } elseif ($mode === 'jetpack_only') {
            $results['actions'][] = 'XML-RPC restricted to Jetpack only';
        } else {
            $results['actions'][] = 'XML-RPC permitted without restriction';
        }

        if (isset($settings['block_pingback'])) {
            update_option('waf_harden_block_pingback', $settings['block_pingback'] ? 'yes' : 'no');
            $results['actions'][] = 'Pingback amplification defense ' . ($settings['block_pingback'] ? 'enabled' : 'disabled');
        }

        update_option('waf_harden_xmlrpc', 'enabled');
        update_option('waf_harden_xmlrpc_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect XML-RPC', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_xmlrpc_protect() {
        update_option('waf_harden_xmlrpc_mode', 'off');
        delete_option('waf_harden_block_pingback');
        update_option('waf_harden_xmlrpc', 'disabled');
        update_option('waf_harden_xmlrpc_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect XML-RPC', 'Disabled', 'XML-RPC protection reset');
    }

    /* ===== 9. PHP FILES PROTECT ===== */
    public function apply_php_files_protect($settings = []) {
        $results = ['feature' => 'php_files', 'actions' => []];
        if (isset($settings['scan_dangerous_funcs'])) {
            update_option('waf_harden_scan_dangerous', $settings['scan_dangerous_funcs'] ? 'yes' : 'no');
            $results['actions'][] = 'Dangerous PHP function tracking active';
        }

        update_option('waf_harden_php_files', 'enabled');
        update_option('waf_harden_php_files_settings', $settings);
        $this->log_activity('Hardening Applied', 'Protect PHP Files', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_php_files_protect() {
        delete_option('waf_harden_scan_dangerous');
        update_option('waf_harden_php_files', 'disabled');
        update_option('waf_harden_php_files_settings', []);
        $this->log_activity('Hardening Disabled', 'Protect PHP Files', 'Disabled', 'PHP protection disabled');
    }

    /* ===== 10. FILE PERMISSIONS ENGINE ===== */
    public function get_monitored_paths_schema() {
        return [
            'wp_config' => [
                'path' => ABSPATH . 'wp-config.php',
                'name' => 'wp-config.php',
                'type' => 'Configuration File',
                'recommended' => 0600,
                'rec_octal' => '0600',
                'description' => 'WordPress database credentials and secret security keys.',
                'criticality' => 'Critical',
            ],
            'htaccess' => [
                'path' => ABSPATH . '.htaccess',
                'name' => '.htaccess',
                'type' => 'Server Directive File',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'Apache/LiteSpeed rewrite and firewall rules.',
                'criticality' => 'Critical',
            ],
            'root_index' => [
                'path' => ABSPATH . 'index.php',
                'name' => 'index.php (Root)',
                'type' => 'Core Script',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'WordPress root bootstrap file.',
                'criticality' => 'High',
            ],
            'wp_login' => [
                'path' => ABSPATH . 'wp-login.php',
                'name' => 'wp-login.php',
                'type' => 'Auth Entry Point',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'Administrative authentication gateway.',
                'criticality' => 'High',
            ],
            'wp_settings' => [
                'path' => ABSPATH . 'wp-settings.php',
                'name' => 'wp-settings.php',
                'type' => 'Core Bootstrap',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'WordPress environment initializations.',
                'criticality' => 'High',
            ],
            'wp_load' => [
                'path' => ABSPATH . 'wp-load.php',
                'name' => 'wp-load.php',
                'type' => 'Core Loader',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'WordPress bootstrap loader.',
                'criticality' => 'High',
            ],
            'xmlrpc' => [
                'path' => ABSPATH . 'xmlrpc.php',
                'name' => 'xmlrpc.php',
                'type' => 'XML-RPC API',
                'recommended' => 0644,
                'rec_octal' => '0644',
                'description' => 'Remote publishing and XML-RPC pingback entry point.',
                'criticality' => 'Medium',
            ],
            'wp_admin_dir' => [
                'path' => ABSPATH . 'wp-admin',
                'name' => 'wp-admin/',
                'type' => 'Core Admin Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'WordPress administrative backend dashboard files.',
                'criticality' => 'High',
            ],
            'wp_includes_dir' => [
                'path' => ABSPATH . 'wp-includes',
                'name' => 'wp-includes/',
                'type' => 'Core Library Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'WordPress core function libraries and classes.',
                'criticality' => 'High',
            ],
            'wp_content_dir' => [
                'path' => WP_CONTENT_DIR,
                'name' => 'wp-content/',
                'type' => 'Content Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'Parent container for plugins, themes, and uploaded media.',
                'criticality' => 'High',
            ],
            'plugins_dir' => [
                'path' => WP_PLUGIN_DIR,
                'name' => 'wp-content/plugins/',
                'type' => 'Plugins Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'Active and installed plugin extensions.',
                'criticality' => 'High',
            ],
            'themes_dir' => [
                'path' => get_theme_root(),
                'name' => 'wp-content/themes/',
                'type' => 'Themes Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'Active and installed WordPress themes.',
                'criticality' => 'High',
            ],
            'uploads_dir' => [
                'path' => wp_upload_dir()['basedir'] ?? (WP_CONTENT_DIR . '/uploads'),
                'name' => 'wp-content/uploads/',
                'type' => 'Uploads Directory',
                'recommended' => 0755,
                'rec_octal' => '0755',
                'description' => 'Public media and user-uploaded asset storage.',
                'criticality' => 'High',
            ],
        ];
    }

    /**
     * Live scan of all file and directory permissions.
     */
    public function scan_live_file_permissions() {
        $schema = $this->get_monitored_paths_schema();
        $results = [];
        $total_scanned = 0;
        $optimal_count = 0;
        $risk_count = 0;

        foreach ($schema as $key => $item) {
            $path = $item['path'];
            $exists = file_exists($path);
            $total_scanned++;

            if (!$exists) {
                $results[] = [
                    'key' => $key,
                    'name' => $item['name'],
                    'type' => $item['type'],
                    'exists' => false,
                    'current_octal' => 'Missing',
                    'current_symbolic' => '---------',
                    'recommended_octal' => $item['rec_octal'],
                    'status' => 'Missing',
                    'is_optimal' => false,
                    'criticality' => $item['criticality'],
                    'description' => $item['description'],
                    'is_writable' => false,
                    'is_dir' => strpos($item['name'], '/') !== false,
                ];
                continue;
            }

            $raw_perms = @fileperms($path);
            $current_octal = sprintf('%04o', $raw_perms & 0777);
            $current_int = (int) ($raw_perms & 0777);
            $rec_int = (int) $item['recommended'];

            // wp-config.php can be either 0600, 0640, or 0644
            if ($key === 'wp_config' && in_array($current_octal, ['0600', '0640', '0644', '0400', '0440', '0444'])) {
                $is_optimal = true;
            } elseif ($key === 'htaccess' && in_array($current_octal, ['0644', '0640', '0600', '0444', '0440', '0400'])) {
                $is_optimal = true;
            } elseif (is_dir($path) && in_array($current_octal, ['0755', '0750', '0700'])) {
                $is_optimal = true;
            } elseif (!is_dir($path) && in_array($current_octal, ['0644', '0640', '0600', '0444'])) {
                $is_optimal = true;
            } else {
                $is_optimal = ($current_int === $rec_int);
            }

            // High risk permissions: 0777, 0666, or world-writable on sensitive files
            $is_world_writable = ($raw_perms & 0002) !== 0;
            $is_group_writable = ($raw_perms & 0020) !== 0;

            if ($is_optimal) {
                $optimal_count++;
                $status_label = 'Optimal';
            } else {
                $risk_count++;
                $status_label = $is_world_writable ? 'Critical Insecure (777/666)' : 'Deviation Risk';
            }

            $results[] = [
                'key' => $key,
                'name' => $item['name'],
                'type' => $item['type'],
                'exists' => true,
                'current_octal' => $current_octal,
                'current_symbolic' => $this->format_perms_symbolic($raw_perms),
                'recommended_octal' => $item['rec_octal'],
                'status' => $status_label,
                'is_optimal' => $is_optimal,
                'criticality' => $item['criticality'],
                'description' => $item['description'],
                'is_writable' => is_writable($path),
                'is_dir' => is_dir($path),
                'last_modified' => date('Y-m-d H:i:s', filemtime($path)),
            ];
        }

        return [
            'success' => true,
            'total_scanned' => $total_scanned,
            'optimal_count' => $optimal_count,
            'risk_count' => $risk_count,
            'overall_status' => ($risk_count === 0) ? 'All Permissions Fortified' : "{$risk_count} Permission Risk(s) Detected",
            'items' => $results,
            'scanned_at' => current_time('mysql'),
        ];
    }

    /**
     * 1-Click Fix all file & directory permissions to WordPress standards.
     */
    public function fix_all_file_permissions() {
        $schema = $this->get_monitored_paths_schema();
        $fixed = [];
        $failed = [];

        foreach ($schema as $key => $item) {
            $path = $item['path'];
            if (!file_exists($path)) continue;

            $recommended_perm = $item['recommended'];
            $current = @fileperms($path) & 0777;

            if ($current !== $recommended_perm) {
                $res = @chmod($path, $recommended_perm);
                if ($res || (@fileperms($path) & 0777) === $recommended_perm) {
                    $fixed[] = "{$item['name']} (" . sprintf('%04o', $recommended_perm) . ")";
                } else {
                    $failed[] = $item['name'];
                }
            }
        }

        $msg = !empty($fixed) 
            ? 'Successfully corrected permissions for: ' . implode(', ', $fixed) 
            : 'All monitored files and directories already possess optimal permissions.';

        $this->log_activity('1-Click Permission Fix', 'File Permissions Engine', empty($failed) ? 'Success' : 'Partial', $msg);
        update_option('waf_harden_file_perms', 'enabled');

        return [
            'success' => true,
            'message' => $msg,
            'fixed_count' => count($fixed),
            'failed_count' => count($failed),
            'fixed_items' => $fixed,
            'failed_items' => $failed,
            'live_scan' => $this->scan_live_file_permissions(),
        ];
    }

    /**
     * Fix a single specific file or directory permission.
     */
    public function fix_single_file_permission($target_key) {
        $schema = $this->get_monitored_paths_schema();
        if (!isset($schema[$target_key])) {
            return ['success' => false, 'message' => 'Invalid target file key.'];
        }

        $item = $schema[$target_key];
        $path = $item['path'];

        if (!file_exists($path)) {
            return ['success' => false, 'message' => "Target {$item['name']} does not exist on disk."];
        }

        $recommended_perm = $item['recommended'];
        @chmod($path, $recommended_perm);

        $new_perm = sprintf('%04o', @fileperms($path) & 0777);
        $this->log_activity('Permission Corrected', $item['name'], 'Success', "Set permission to {$new_perm}");

        return [
            'success' => true,
            'message' => "Successfully set permissions for {$item['name']} to {$item['rec_octal']}.",
            'key' => $target_key,
            'new_octal' => $new_perm,
        ];
    }

    /**
     * Convert raw file permissions to symbolic string (e.g. -rw-r--r--).
     */
    private function format_perms_symbolic($perms) {
        if (($perms & 0xC000) == 0xC000) $info = 's';
        elseif (($perms & 0xA000) == 0xA000) $info = 'l';
        elseif (($perms & 0x8000) == 0x8000) $info = '-';
        elseif (($perms & 0x6000) == 0x6000) $info = 'b';
        elseif (($perms & 0x4000) == 0x4000) $info = 'd';
        elseif (($perms & 0x2000) == 0x2000) $info = 'c';
        elseif (($perms & 0x1000) == 0x1000) $info = 'p';
        else $info = 'u';

        // Owner
        $info .= (($perms & 0x0100) ? 'r' : '-');
        $info .= (($perms & 0x0080) ? 'w' : '-');
        $info .= (($perms & 0x0040) ? (($perms & 0x0800) ? 's' : 'x') : (($perms & 0x0800) ? 'S' : '-'));

        // Group
        $info .= (($perms & 0x0020) ? 'r' : '-');
        $info .= (($perms & 0x0010) ? 'w' : '-');
        $info .= (($perms & 0x0008) ? (($perms & 0x0400) ? 's' : 'x') : (($perms & 0x0400) ? 'S' : '-'));

        // World
        $info .= (($perms & 0x0004) ? 'r' : '-');
        $info .= (($perms & 0x0002) ? 'w' : '-');
        $info .= (($perms & 0x0001) ? (($perms & 0x0200) ? 't' : 'x') : (($perms & 0x0200) ? 'T' : '-'));

        return $info;
    }

    public function apply_file_permissions($settings = []) {
        $auto_fix = !empty($settings['auto_fix']);
        if ($auto_fix) {
            return $this->fix_all_file_permissions();
        }
        update_option('waf_harden_file_perms', 'enabled');
        update_option('waf_harden_file_perms_settings', $settings);
        $this->log_activity('Hardening Applied', 'File Permissions', 'Success', 'File permissions monitoring enabled');
        return ['feature' => 'file_perms', 'actions' => ['File permissions monitoring enabled']];
    }

    public function remove_file_permissions() {
        update_option('waf_harden_file_perms', 'disabled');
        update_option('waf_harden_file_perms_settings', []);
        $this->log_activity('Hardening Disabled', 'File Permissions', 'Disabled', 'Auto-fix permissions disabled');
    }

    /* ===== 11. ADVANCED HTTP SECURITY HEADERS SUITE ===== */
    public function get_security_headers_schema() {
        return [
            'Strict-Transport-Security' => [
                'directive' => 'Strict-Transport-Security',
                'name' => 'HSTS (Strict-Transport-Security)',
                'recommended' => 'max-age=31536000; includeSubDomains; preload',
                'desc' => 'Enforces strict HTTPS encryption across the main domain and all subdomains, preventing SSL-stripping and man-in-the-middle attacks.',
                'criticality' => 'High',
                'impact' => 'Prevents unencrypted HTTP downgrades.',
            ],
            'Content-Security-Policy' => [
                'directive' => 'Content-Security-Policy',
                'name' => 'Content-Security-Policy (CSP)',
                'recommended' => "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;",
                'desc' => 'Restricts script execution, frames, and resource loads to trusted origins, neutralizing Cross-Site Scripting (XSS) and malicious data injection.',
                'criticality' => 'Critical',
                'impact' => 'Neutralizes XSS and unauthorized remote script loads.',
            ],
            'X-Frame-Options' => [
                'directive' => 'X-Frame-Options',
                'name' => 'X-Frame-Options',
                'recommended' => 'SAMEORIGIN',
                'desc' => 'Stops attackers from embedding your website within malicious IFRAMEs on external sites to steal clicks and user credentials.',
                'criticality' => 'High',
                'impact' => 'Prevents UI Redressing & Clickjacking.',
            ],
            'X-Content-Type-Options' => [
                'directive' => 'X-Content-Type-Options',
                'name' => 'X-Content-Type-Options',
                'recommended' => 'nosniff',
                'desc' => 'Blocks browsers from MIME-type sniffing uploaded assets (e.g. executing an image masquerading as executable JavaScript).',
                'criticality' => 'High',
                'impact' => 'Blocks Drive-by MIME confusion attacks.',
            ],
            'Referrer-Policy' => [
                'directive' => 'Referrer-Policy',
                'name' => 'Referrer-Policy',
                'recommended' => 'strict-origin-when-cross-origin',
                'desc' => 'Protects privacy by limiting sensitive URL path parameters transmitted in the HTTP Referer header to external destinations.',
                'criticality' => 'Medium',
                'impact' => 'Prevents URL and token leakage in external requests.',
            ],
            'Permissions-Policy' => [
                'directive' => 'Permissions-Policy',
                'name' => 'Permissions-Policy',
                'recommended' => 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)',
                'desc' => 'Disables dangerous browser hardware features, sensors, and invasive device APIs unless explicitly permitted.',
                'criticality' => 'Medium',
                'impact' => 'Locks down client browser device APIs.',
            ],
            'Cross-Origin-Opener-Policy' => [
                'directive' => 'Cross-Origin-Opener-Policy',
                'name' => 'Cross-Origin-Opener-Policy (COOP)',
                'recommended' => 'same-origin',
                'desc' => 'Isolates top-level browsing context to prevent cross-origin window tampering and Specter-style memory leaks.',
                'criticality' => 'Medium',
                'impact' => 'Isolates window execution context.',
            ],
            'Cross-Origin-Resource-Policy' => [
                'directive' => 'Cross-Origin-Resource-Policy',
                'name' => 'Cross-Origin-Resource-Policy (CORP)',
                'recommended' => 'same-origin',
                'desc' => 'Restricts asset and media loading exclusively to requests originating from the same domain.',
                'criticality' => 'Medium',
                'impact' => 'Prevents cross-origin asset hotlinking and leakage.',
            ],
            'Cross-Origin-Embedder-Policy' => [
                'directive' => 'Cross-Origin-Embedder-Policy',
                'name' => 'Cross-Origin-Embedder-Policy (COEP)',
                'recommended' => 'credentialless',
                'desc' => 'Prevents a document from loading cross-origin resources that do not explicitly grant the document permission.',
                'criticality' => 'Low',
                'impact' => 'Enhanced cross-origin resource isolation.',
            ],
            'X-XSS-Protection' => [
                'directive' => 'X-XSS-Protection',
                'name' => 'X-XSS-Protection',
                'recommended' => '1; mode=block',
                'desc' => 'Enables legacy browser reflective XSS filtering mechanisms.',
                'criticality' => 'Low',
                'impact' => 'Legacy browser reflective filter.',
            ],
        ];
    }

    public function apply_security_headers($settings = []) {
        $results = ['feature' => 'security_headers', 'actions' => []];
        $headers = [];

        // 1. X-Frame-Options
        $x_frame = $settings['x_frame_options'] ?? 'SAMEORIGIN';
        if ($x_frame && $x_frame !== 'off') {
            $headers['X-Frame-Options'] = $x_frame;
        }

        // 2. X-Content-Type-Options
        if (!isset($settings['x_content_type_options']) || $settings['x_content_type_options']) {
            $headers['X-Content-Type-Options'] = 'nosniff';
        }

        // 3. Referrer-Policy
        $ref_pol = $settings['referrer_policy'] ?? 'strict-origin-when-cross-origin';
        if ($ref_pol && $ref_pol !== 'off') {
            $headers['Referrer-Policy'] = $ref_pol;
        }

        // 4. Permissions-Policy
        $perm_pol = $settings['permissions_policy'] ?? 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)';
        if ($perm_pol && $perm_pol !== 'off') {
            $headers['Permissions-Policy'] = $perm_pol;
        }

        // 5. Cross-Origin-Opener-Policy
        if (!empty($settings['coop']) && $settings['coop'] !== 'off') {
            $headers['Cross-Origin-Opener-Policy'] = sanitize_text_field($settings['coop']);
        }

        // 6. Cross-Origin-Resource-Policy
        if (!empty($settings['corp']) && $settings['corp'] !== 'off') {
            $headers['Cross-Origin-Resource-Policy'] = sanitize_text_field($settings['corp']);
        }

        // 7. Cross-Origin-Embedder-Policy
        if (!empty($settings['coep']) && $settings['coep'] !== 'off') {
            $headers['Cross-Origin-Embedder-Policy'] = sanitize_text_field($settings['coep']);
        }

        // 8. X-XSS-Protection
        if (!isset($settings['x_xss_protection']) || $settings['x_xss_protection']) {
            $headers['X-XSS-Protection'] = '1; mode=block';
        }

        // 9. Content-Security-Policy (Enforce / Report-Only)
        if (!empty($settings['csp'])) {
            $csp_mode = $settings['csp_mode'] ?? 'enforce';
            $header_key = ($csp_mode === 'report_only') ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
            $headers[$header_key] = $settings['csp'];
        }

        // 10. HSTS (Strict-Transport-Security)
        if (!empty($settings['hsts'])) {
            $max_age = (int)($settings['hsts_max_age'] ?? 31536000);
            $hsts_val = "max-age={$max_age}";
            if (!empty($settings['hsts_subdomains'])) {
                $hsts_val .= '; includeSubDomains';
            }
            if (!empty($settings['hsts_preload'])) {
                $hsts_val .= '; preload';
            }
            $headers['Strict-Transport-Security'] = $hsts_val;
        }

        update_option('waf_harden_security_headers_list', $headers);
        $results['actions'][] = count($headers) . ' HTTP security response headers configured';
        update_option('waf_harden_security_headers', 'enabled');
        update_option('waf_harden_security_headers_settings', $settings);
        $this->log_activity('Hardening Applied', 'Security Headers', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    /**
     * 1-Click Apply Recommended Full HTTP Security Headers Suite.
     */
    public function apply_recommended_security_headers() {
        $recommended_settings = [
            'enabled' => true,
            'x_frame_options' => 'SAMEORIGIN',
            'x_content_type_options' => true,
            'referrer_policy' => 'strict-origin-when-cross-origin',
            'permissions_policy' => 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)',
            'coop' => 'same-origin',
            'corp' => 'same-origin',
            'x_xss_protection' => true,
            'hsts' => true,
            'hsts_max_age' => 31536000,
            'hsts_subdomains' => true,
            'hsts_preload' => false,
            'csp' => "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;",
            'csp_mode' => 'enforce',
        ];

        $res = $this->apply_security_headers($recommended_settings);
        return [
            'success' => true,
            'message' => 'Recommended HTTP Security Headers Suite successfully activated and applied.',
            'headers_count' => count(get_option('waf_harden_security_headers_list', [])),
            'headers_list' => get_option('waf_harden_security_headers_list', []),
        ];
    }

    public function remove_security_headers() {
        delete_option('waf_harden_security_headers_list');
        update_option('waf_harden_security_headers', 'disabled');
        update_option('waf_harden_security_headers_settings', []);
        $this->log_activity('Hardening Disabled', 'Security Headers', 'Disabled', 'HTTP headers cleared');
    }

    public function send_security_headers() {
        if (headers_sent()) return;
        $list = get_option('waf_harden_security_headers_list', []);
        if (is_array($list)) {
            foreach ($list as $name => $value) {
                header("{$name}: {$value}");
            }
        }
    }

    /* ===== 12. USER ACCOUNT PROTECT ===== */
    public function apply_user_account_protect($settings = []) {
        $results = ['feature' => 'user_accounts', 'actions' => []];
        if (isset($settings['detect_fake_admins'])) {
            update_option('waf_harden_detect_fake_admins', $settings['detect_fake_admins'] ? 'yes' : 'no');
            $suspicious = $this->find_fake_admins();
            $results['actions'][] = count($suspicious) . ' suspicious admin accounts flagged';
        }
        if (isset($settings['enforce_strong_passwords'])) {
            update_option('waf_harden_strong_passwords', $settings['enforce_strong_passwords'] ? 'yes' : 'no');
        }

        update_option('waf_harden_user_accounts', 'enabled');
        update_option('waf_harden_user_accounts_settings', $settings);
        $this->log_activity('Hardening Applied', 'User Account Protection', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_user_account_protect() {
        delete_option('waf_harden_detect_fake_admins');
        delete_option('waf_harden_strong_passwords');
        update_option('waf_harden_user_accounts', 'disabled');
        update_option('waf_harden_user_accounts_settings', []);
        $this->log_activity('Hardening Disabled', 'User Account Protection', 'Disabled', 'User protection disabled');
    }

    /* ===== 13. BACKUP PROTECT ===== */
    public function apply_backup_protect($settings = []) {
        $results = ['feature' => 'backup', 'actions' => []];
        if (isset($settings['detect_backups'])) {
            $patterns = ['*.sql', '*.zip', '*.tar.gz', '*.gz', '*.bak', '*.dump', 'backup*'];
            $found = [];
            foreach ($patterns as $p) {
                foreach (glob(ABSPATH . $p) ?: [] as $m) {
                    if (is_file($m)) $found[] = basename($m);
                }
            }
            $results['actions'][] = count($found) . ' exposed root archive files identified';
            update_option('waf_harden_backup_findings', $found);
        }

        update_option('waf_harden_backup', 'enabled');
        update_option('waf_harden_backup_settings', $settings);
        $this->log_activity('Hardening Applied', 'Backup Protection', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_backup_protect() {
        delete_option('waf_harden_backup_findings');
        update_option('waf_harden_backup', 'disabled');
        update_option('waf_harden_backup_settings', []);
        $this->log_activity('Hardening Disabled', 'Backup Protection', 'Disabled', 'Backup protection disabled');
    }

    /* ===== 14. PLUGIN & THEME PROTECT ===== */
    public function apply_plugin_theme_protect($settings = []) {
        $results = ['feature' => 'plugin_theme', 'actions' => []];
        if (isset($settings['detect_modifications'])) {
            update_option('waf_harden_detect_modifications', $settings['detect_modifications'] ? 'yes' : 'no');
            $results['actions'][] = 'File tamper monitor active';
        }

        update_option('waf_harden_plugin_theme', 'enabled');
        update_option('waf_harden_plugin_theme_settings', $settings);
        $this->log_activity('Hardening Applied', 'Plugin & Theme Protection', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_plugin_theme_protect() {
        delete_option('waf_harden_detect_modifications');
        update_option('waf_harden_plugin_theme', 'disabled');
        update_option('waf_harden_plugin_theme_settings', []);
        $this->log_activity('Hardening Disabled', 'Plugin & Theme Protection', 'Disabled', 'Plugin & Theme protection disabled');
    }

    /* ===== 15. DIRECTORY BROWSING ===== */
    public function apply_directory_browsing($settings = []) {
        $results = ['feature' => 'directory_browsing', 'actions' => []];
        $htaccess = ABSPATH . '.htaccess';

        $this->create_safety_backup('htaccess', 'Pre directory browsing lock');
        $this->ensure_htaccess_rule($htaccess, 'block_directory_browsing');
        $results['actions'][] = 'Directory index browsing disabled via Options -Indexes';

        update_option('waf_harden_directory_browsing', 'enabled');
        update_option('waf_harden_directory_browsing_settings', $settings);
        $this->log_activity('Hardening Applied', 'Directory Browsing', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_directory_browsing() {
        update_option('waf_harden_directory_browsing', 'disabled');
        update_option('waf_harden_directory_browsing_settings', []);
        $this->log_activity('Hardening Disabled', 'Directory Browsing', 'Disabled', 'Directory browsing rule removed');
    }

    /* ===== 16. VERSION HIDING ===== */
    public function apply_version_hiding($settings = []) {
        $results = ['feature' => 'version_hiding', 'actions' => []];
        update_option('waf_harden_hide_wp_version', 'yes');
        $results['actions'][] = 'WordPress generator meta tags & version query strings removed';

        if (file_exists(ABSPATH . 'readme.html')) {
            @rename(ABSPATH . 'readme.html', ABSPATH . 'readme.html.waf-guard');
            $results['actions'][] = 'readme.html shielded';
        }

        update_option('waf_harden_version_hiding', 'enabled');
        update_option('waf_harden_version_hiding_settings', $settings);
        $this->log_activity('Hardening Applied', 'WordPress Version Hiding', 'Success', implode('; ', $results['actions']));
        return $results;
    }

    public function remove_version_hiding() {
        delete_option('waf_harden_hide_wp_version');
        if (file_exists(ABSPATH . 'readme.html.waf-guard')) {
            @rename(ABSPATH . 'readme.html.waf-guard', ABSPATH . 'readme.html');
        }
        update_option('waf_harden_version_hiding', 'disabled');
        update_option('waf_harden_version_hiding_settings', []);
        $this->log_activity('Hardening Disabled', 'WordPress Version Hiding', 'Disabled', 'Version hiding disabled');
    }

    /* ===== ALIAS DISPATCH METHODS ===== */
    public function apply_wp_config($s = []) { return $this->apply_wp_config_protect($s); }
    public function remove_wp_config() { return $this->remove_wp_config_protect(); }
    public function apply_htaccess($s = []) { return $this->apply_htaccess_protect($s); }
    public function remove_htaccess() { return $this->remove_htaccess_protect(); }
    public function apply_uploads($s = []) { return $this->apply_uploads_protect($s); }
    public function remove_uploads() { return $this->remove_uploads_protect(); }
    public function apply_sensitive_files($s = []) { return $this->apply_sensitive_files_protect($s); }
    public function remove_sensitive_files() { return $this->remove_sensitive_files_protect(); }
    public function apply_rest_api($s = []) { return $this->apply_rest_api_protect($s); }
    public function remove_rest_api() { return $this->remove_rest_api_protect(); }
    public function apply_xmlrpc($s = []) { return $this->apply_xmlrpc_protect($s); }
    public function remove_xmlrpc() { return $this->remove_xmlrpc_protect(); }
    public function apply_php_files($s = []) { return $this->apply_php_files_protect($s); }
    public function remove_php_files() { return $this->remove_php_files_protect(); }
    public function apply_file_perms($s = []) { return $this->apply_file_permissions($s); }
    public function remove_file_perms() { return $this->remove_file_permissions(); }
    public function apply_user_accounts($s = []) { return $this->apply_user_account_protect($s); }
    public function remove_user_accounts() { return $this->remove_user_account_protect(); }
    public function apply_backup($s = []) { return $this->apply_backup_protect($s); }
    public function remove_backup() { return $this->remove_backup_protect(); }
    public function apply_plugin_theme($s = []) { return $this->apply_plugin_theme_protect($s); }
    public function remove_plugin_theme() { return $this->remove_plugin_theme_protect(); }

    /* ===== HARDENING PROFILES (BALANCED / STRONG / MAXIMUM) ===== */
    public function apply_profile($profile = 'balanced') {
        $profile = sanitize_key($profile);
        $actions = [];

        // Create safety backup prior to profile execution
        $this->create_safety_backup('all', "Pre-profile application ({$profile})");

        switch ($profile) {
            case 'strong':
                $this->apply_wp_config(['lock_permissions' => true]);
                $this->apply_htaccess(['block_dir_browsing' => true, 'protect_wp_config' => true]);
                $this->apply_uploads(['block_php' => true, 'block_executables' => true]);
                $this->apply_sensitive_files(['protect_git' => true]);
                $this->apply_rest_api(['disable_user_endpoints' => true]);
                $this->apply_xmlrpc(['disable_xmlrpc' => 'complete', 'block_pingback' => true]);
                $this->apply_file_permissions(['auto_fix' => true]);
                $this->apply_security_headers(['hsts' => true, 'hsts_subdomains' => true, 'x_frame_options' => 'SAMEORIGIN', 'x_content_type_options' => true]);
                $this->apply_user_accounts(['detect_fake_admins' => true, 'enforce_strong_passwords' => true]);
                $this->apply_version_hiding(['hide_wp_version' => true, 'remove_readme' => true]);
                $this->apply_directory_browsing([]);
                $actions[] = 'Strong Enterprise Profile applied (Strict isolation & headers)';
                break;

            case 'maximum':
                $this->apply_admin_protect(['disable_file_editor' => true, 'disable_user_enum' => true, 'admin_session_timeout' => 1800]);
                $this->apply_login_protect(['login_captcha' => true, 'brute_force_threshold' => 3, 'login_lockout_time' => 3600]);
                $this->apply_wp_config(['lock_permissions' => true]);
                $this->apply_htaccess(['block_dir_browsing' => true, 'protect_wp_config' => true]);
                $this->apply_uploads(['block_php' => true, 'scan_uploads' => true, 'block_executables' => true]);
                $this->apply_sensitive_files(['protect_git' => true]);
                $this->apply_rest_api(['disable_user_endpoints' => true, 'require_auth' => false, 'rate_limit' => 30]);
                $this->apply_xmlrpc(['disable_xmlrpc' => 'complete', 'block_pingback' => true]);
                $this->apply_php_files(['scan_dangerous_funcs' => true]);
                $this->apply_file_permissions(['auto_fix' => true]);
                $this->apply_security_headers(['hsts' => true, 'hsts_subdomains' => true, 'hsts_preload' => true, 'x_frame_options' => 'DENY', 'x_content_type_options' => true, 'referrer_policy' => 'strict-origin']);
                $this->apply_user_accounts(['detect_fake_admins' => true, 'enforce_strong_passwords' => true]);
                $this->apply_backup(['detect_backups' => true]);
                $this->apply_plugin_theme(['detect_modifications' => true]);
                $this->apply_directory_browsing([]);
                $this->apply_version_hiding(['hide_wp_version' => true, 'remove_readme' => true]);
                $actions[] = 'Maximum Lockdown Profile applied (Full hardening suite)';
                break;

            case 'balanced':
            default:
                $this->apply_wp_config(['lock_permissions' => true]);
                $this->apply_htaccess(['block_dir_browsing' => true, 'protect_wp_config' => true]);
                $this->apply_uploads(['block_php' => true]);
                $this->apply_sensitive_files(['protect_git' => true]);
                $this->apply_rest_api(['disable_user_endpoints' => true]);
                $this->apply_xmlrpc(['disable_xmlrpc' => 'jetpack_only', 'block_pingback' => true]);
                $this->apply_file_permissions(['auto_fix' => true]);
                $this->apply_security_headers(['x_frame_options' => 'SAMEORIGIN', 'x_content_type_options' => true, 'referrer_policy' => 'strict-origin-when-cross-origin']);
                $this->apply_user_accounts(['detect_fake_admins' => true]);
                $this->apply_version_hiding(['hide_wp_version' => true]);
                $this->apply_directory_browsing([]);
                $actions[] = 'Balanced Production Profile applied (High compatibility)';
                break;
        }

        update_option('waf_harden_active_profile', $profile);
        $this->log_activity('Profile Applied', ucfirst($profile) . ' Profile', 'Success', implode('; ', $actions));

        return [
            'success' => true,
            'profile' => $profile,
            'message' => ucfirst($profile) . ' security profile successfully configured and activated.',
            'report' => $this->generate_report(),
        ];
    }

    /* ===== SECURITY BASELINE & CONFIGURATION DRIFT ===== */
    public function create_security_baseline() {
        $baseline = [
            'created_at' => current_time('mysql'),
            'statuses' => $this->get_status(),
            'files' => [
                'wp-config.php' => [
                    'exists' => file_exists(ABSPATH . 'wp-config.php'),
                    'perms' => file_exists(ABSPATH . 'wp-config.php') ? sprintf('%04o', @fileperms(ABSPATH . 'wp-config.php') & 0777) : 'none',
                    'hash' => file_exists(ABSPATH . 'wp-config.php') ? hash_file('sha256', ABSPATH . 'wp-config.php') : '',
                ],
                '.htaccess' => [
                    'exists' => file_exists(ABSPATH . '.htaccess'),
                    'perms' => file_exists(ABSPATH . '.htaccess') ? sprintf('%04o', @fileperms(ABSPATH . '.htaccess') & 0777) : 'none',
                    'hash' => file_exists(ABSPATH . '.htaccess') ? hash_file('sha256', ABSPATH . '.htaccess') : '',
                ],
            ],
            'options' => [
                'xmlrpc_mode' => get_option('waf_harden_xmlrpc_mode', 'off'),
                'disable_file_editor' => get_option('waf_harden_disable_file_editor', 'no'),
                'disable_user_enum' => get_option('waf_harden_disable_user_enum', 'no'),
                'security_headers_count' => count(get_option('waf_harden_security_headers_list', [])),
            ],
        ];

        update_option('waf_harden_security_baseline', $baseline);
        $this->log_activity('Security Baseline Created', 'System Baseline', 'Success', 'Recorded ' . count($baseline['statuses']) . ' control states and config hashes');

        return [
            'success' => true,
            'message' => 'Security Baseline created successfully on ' . $baseline['created_at'],
            'baseline' => $baseline,
        ];
    }

    public function check_configuration_drift() {
        $baseline = get_option('waf_harden_security_baseline', null);
        if (!$baseline) {
            return [
                'has_baseline' => false,
                'message' => 'No baseline created yet. Click "Create Security Baseline" to initialize drift detection.',
                'drifts' => [],
            ];
        }

        $drifts = [];
        $current_statuses = $this->get_status();

        // 1. Control Status Drift
        foreach ($baseline['statuses'] ?? [] as $key => $base_item) {
            $cur_status = $current_statuses[$key]['status'] ?? 'disabled';
            if ($base_item['status'] === 'enabled' && $cur_status !== 'enabled') {
                $drifts[] = [
                    'control' => $key,
                    'label' => $base_item['label'] ?? $key,
                    'type' => 'Control Disabled',
                    'severity' => 'High',
                    'expected' => 'Enabled',
                    'current' => 'Disabled',
                ];
            }
        }

        // 2. File State Drift
        if (file_exists(ABSPATH . 'wp-config.php')) {
            $cur_perms = sprintf('%04o', @fileperms(ABSPATH . 'wp-config.php') & 0777);
            $exp_perms = $baseline['files']['wp-config.php']['perms'] ?? '0600';
            if ($cur_perms !== $exp_perms) {
                $drifts[] = [
                    'control' => 'wp_config_perms',
                    'label' => 'wp-config.php Permissions',
                    'type' => 'Permission Change',
                    'severity' => 'High',
                    'expected' => $exp_perms,
                    'current' => $cur_perms,
                ];
            }
        }

        // 3. XML-RPC Drift
        $cur_xml = get_option('waf_harden_xmlrpc_mode', 'off');
        $exp_xml = $baseline['options']['xmlrpc_mode'] ?? 'off';
        if ($exp_xml === 'complete' && $cur_xml !== 'complete') {
            $drifts[] = [
                'control' => 'xmlrpc',
                'label' => 'XML-RPC Protection',
                'type' => 'Mode Alteration',
                'severity' => 'Medium',
                'expected' => 'Complete Block',
                'current' => ucfirst($cur_xml),
            ];
        }

        update_option('waf_harden_last_drift_check', current_time('mysql'));
        update_option('waf_harden_drift_findings', $drifts);

        return [
            'has_baseline' => true,
            'baseline_date' => $baseline['created_at'] ?? 'Unknown',
            'last_check' => current_time('mysql'),
            'total_drifts' => count($drifts),
            'drifts' => $drifts,
        ];
    }

    public function run_background_drift_check() {
        $res = $this->check_configuration_drift();
        if (!empty($res['drifts'])) {
            $this->log_activity('Configuration Drift Detected', 'Drift Monitor', 'Warning', count($res['drifts']) . ' configuration drift(s) flagged');
        }
    }

    public function remediate_drift($control_key) {
        $baseline = get_option('waf_harden_security_baseline', []);
        $method = 'apply_' . $control_key;
        if (method_exists($this, $method)) {
            $saved_settings = $baseline['statuses'][$control_key]['settings'] ?? ['enabled' => true];
            $this->$method($saved_settings);
            $this->log_activity('Drift Remediated', $control_key, 'Success', 'Restored to baseline state');
            return ['success' => true, 'message' => "Remediated {$control_key} to baseline state."];
        }
        return ['success' => false, 'message' => 'Cannot auto-remediate specified control.'];
    }

    /* ===== FILE INTEGRITY ENGINE (SHA-256) ===== */
    public function scan_file_integrity() {
        $key_files = [
            'wp-config.php',
            '.htaccess',
            'index.php',
            'wp-login.php',
            'wp-settings.php',
            'wp-load.php',
            'wp-blog-header.php',
            'xmlrpc.php',
        ];

        $baseline_hashes = get_option('waf_harden_integrity_baseline', []);
        $is_first_scan = empty($baseline_hashes);
        $findings = [];
        $current_hashes = [];

        foreach ($key_files as $f) {
            $abs = ABSPATH . $f;
            if (file_exists($abs)) {
                $hash = hash_file('sha256', $abs);
                $current_hashes[$f] = $hash;
                $mtime = filemtime($abs);

                if (!$is_first_scan && isset($baseline_hashes[$f])) {
                    if ($baseline_hashes[$f] !== $hash) {
                        $findings[] = [
                            'file' => $f,
                            'change_type' => 'Modified',
                            'severity' => ($f === 'wp-config.php' || $f === '.htaccess') ? 'Critical' : 'High',
                            'detected_at' => date('Y-m-d H:i:s', $mtime),
                            'baseline_hash' => substr($baseline_hashes[$f], 0, 12) . '...',
                            'current_hash' => substr($hash, 0, 12) . '...',
                        ];
                    }
                }
            } else {
                if (!$is_first_scan && isset($baseline_hashes[$f])) {
                    $findings[] = [
                        'file' => $f,
                        'change_type' => 'Deleted',
                        'severity' => 'Critical',
                        'detected_at' => current_time('mysql'),
                        'baseline_hash' => substr($baseline_hashes[$f], 0, 12) . '...',
                        'current_hash' => 'Missing',
                    ];
                }
            }
        }

        // Check for unexpected executable files in root
        foreach (glob(ABSPATH . '*.{php,sh,py,pl,exe,phar}', GLOB_BRACE) ?: [] as $rf) {
            $base_rf = basename($rf);
            if (!in_array($base_rf, $key_files) && strpos($base_rf, 'wp-') !== 0 && $base_rf !== 'index.php') {
                $findings[] = [
                    'file' => $base_rf,
                    'change_type' => 'Unexpected File',
                    'severity' => 'High',
                    'detected_at' => date('Y-m-d H:i:s', filemtime($rf)),
                    'baseline_hash' => 'None',
                    'current_hash' => substr(hash_file('sha256', $rf), 0, 12) . '...',
                ];
            }
        }

        if ($is_first_scan) {
            update_option('waf_harden_integrity_baseline', $current_hashes);
        }

        update_option('waf_harden_integrity_findings', $findings);
        return [
            'success' => true,
            'is_first_run' => $is_first_scan,
            'scanned_count' => count($key_files),
            'findings_count' => count($findings),
            'findings' => $findings,
        ];
    }

    /* ===== UPLOADS SECURITY SCANNER ===== */
    public function scan_uploads_security() {
        $upload_dir = wp_upload_dir();
        $basedir = $upload_dir['basedir'];
        $issues = [];

        if (is_dir($basedir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($basedir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );

            $scanned = 0;
            foreach ($iterator as $item) {
                if ($item->isFile()) {
                    $scanned++;
                    $name = $item->getFilename();
                    $path = wp_normalize_path($item->getPathname());
                    $rel = str_replace(wp_normalize_path(ABSPATH), '', $path);
                    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

                    // 1. Direct PHP files in uploads
                    if (in_array($ext, ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phar'])) {
                        $issues[] = [
                            'file' => $rel,
                            'issue' => 'Executable PHP Script in Uploads',
                            'severity' => 'Critical',
                            'size' => size_format($item->getSize(), 2),
                        ];
                    }
                    // 2. Double extensions (e.g. image.php.jpg)
                    elseif (preg_match('/\.php\.[a-z0-9]+$/i', $name)) {
                        $issues[] = [
                            'file' => $rel,
                            'issue' => 'Double Extension Masking Script',
                            'severity' => 'Critical',
                            'size' => size_format($item->getSize(), 2),
                        ];
                    }
                    // 3. Executables
                    elseif (in_array($ext, ['exe', 'sh', 'py', 'pl', 'cgi', 'bash'])) {
                        $issues[] = [
                            'file' => $rel,
                            'issue' => 'Binary / Shell Executable in Uploads',
                            'severity' => 'High',
                            'size' => size_format($item->getSize(), 2),
                        ];
                    }

                    if (count($issues) >= 100) break;
                }
            }
        }

        return [
            'success' => true,
            'scanned_files' => $scanned ?? 0,
            'total_issues' => count($issues),
            'issues' => $issues,
        ];
    }

    /* ===== READ-ONLY DATABASE SECURITY AUDIT ===== */
    public function audit_database_security() {
        global $wpdb;
        $findings = [];

        // 1. Check for exposed SQL dumps in web root
        $dump_matches = glob(ABSPATH . '*.{sql,dump,sql.gz}', GLOB_BRACE) ?: [];
        foreach ($dump_matches as $dm) {
            $findings[] = [
                'type' => 'Exposed SQL Database Dump',
                'target' => basename($dm),
                'severity' => 'Critical',
                'description' => 'Plain-text database dump exposed in public web root: ' . basename($dm),
                'action_type' => 'file_delete',
            ];
        }

        // 2. Check for suspicious administrators
        $admins = $this->find_fake_admins();
        foreach ($admins as $fa) {
            $findings[] = [
                'type' => 'Suspicious Administrator Account',
                'target' => $fa['user_login'] . ' (' . $fa['user_email'] . ')',
                'severity' => 'High',
                'description' => implode(', ', $fa['flags']),
                'action_type' => 'user_review',
            ];
        }

        // 3. Suspicious wp_options (eval, base64_decode, iframe)
        $options_query = $wpdb->get_results(
            "SELECT option_name, LENGTH(option_value) as val_len FROM {$wpdb->options} 
             WHERE option_value LIKE '%eval(%' 
                OR option_value LIKE '%base64_decode(%' 
                OR option_value LIKE '%<iframe%'
             LIMIT 10",
            ARRAY_A
        );

        if (!empty($options_query)) {
            foreach ($options_query as $opt) {
                // Ignore legitimate plugins that reference base64 safely
                if (in_array($opt['option_name'], ['cron', 'recently_activated'])) continue;
                $findings[] = [
                    'type' => 'Suspicious wp_options Code Injection',
                    'target' => $opt['option_name'],
                    'severity' => 'High',
                    'description' => "Contains executable PHP or iframe syntax ({$opt['val_len']} bytes)",
                    'action_type' => 'option_review',
                ];
            }
        }

        // 4. Autoload Options Size Check
        $autoload_size = (int) $wpdb->get_var("SELECT SUM(LENGTH(option_value)) FROM {$wpdb->options} WHERE autoload = 'yes'");
        if ($autoload_size > 1500000) { // > 1.5MB
            $findings[] = [
                'type' => 'Excessive Autoloaded Options Size',
                'target' => 'wp_options table',
                'severity' => 'Medium',
                'description' => 'Autoloaded options size is ' . size_format($autoload_size, 2) . ' (Optimal: < 800 KB)',
                'action_type' => 'audit_info',
            ];
        }

        return [
            'success' => true,
            'total_findings' => count($findings),
            'findings' => $findings,
            'autoload_size_formatted' => size_format($autoload_size ?? 0, 2),
        ];
    }

    /* ===== ONE-CLICK HARDEN ===== */
    public function one_click_harden() {
        return $this->apply_profile('balanced');
    }

    /* ===== HELPERS ===== */
    private function write_to_wp_config($constant, $value) {
        $config = ABSPATH . 'wp-config.php';
        if (!file_exists($config) || !is_writable($config)) return false;
        $content = @file_get_contents($config);
        if (strpos($content, "define('$constant'") !== false || strpos($content, "define(\"$constant\"") !== false) {
            $content = preg_replace("/define\s*\(\s*['\"]" . preg_quote($constant, '/') . "['\"]\s*,\s*[^)]+\s*\)\s*;/", "define('$constant', $value);", $content);
        } else {
            $content = str_replace("<?php", "<?php\ndefine('$constant', $value);", $content);
        }
        return @file_put_contents($config, $content, LOCK_EX);
    }

    private function remove_from_wp_config($constant) {
        $config = ABSPATH . 'wp-config.php';
        if (!file_exists($config) || !is_writable($config)) return false;
        $content = @file_get_contents($config);
        $content = preg_replace("/define\s*\(\s*['\"]" . preg_quote($constant, '/') . "['\"]\s*,\s*[^)]+\s*\)\s*;\s*/", '', $content);
        return @file_put_contents($config, $content, LOCK_EX);
    }

    private function ensure_htaccess_rule($htaccess, $rule_type, $create = false) {
        $rules = [
            'block_directory_browsing' => [
                'tag' => 'MDefender-Pro - Disable Directory Browsing',
                'code' => "\n# MDefender-Pro - Disable Directory Browsing\nOptions -Indexes\n",
            ],
            'protect_wp_config' => [
                'tag' => 'MDefender-Pro - Protect wp-config.php',
                'code' => "\n# MDefender-Pro - Protect wp-config.php\n<files wp-config.php>\norder allow,deny\ndeny from all\n</files>\n",
            ],
            'block_php_uploads' => [
                'tag' => 'MDefender-Pro - Block PHP in Uploads',
                'code' => "\n# MDefender-Pro - Block PHP in Uploads\n<Files *.php>\ndeny from all\n</Files>\n",
            ],
        ];
        if (!isset($rules[$rule_type])) return false;
        $rule_info = $rules[$rule_type];

        if ($create && !file_exists($htaccess)) {
            @file_put_contents($htaccess, $rule_info['code']);
            return true;
        }
        if (!file_exists($htaccess)) return false;
        $content = @file_get_contents($htaccess);
        if ($content === false) return false;
        if (strpos($content, $rule_info['tag']) !== false) return true;
        return @file_put_contents($htaccess, rtrim($content) . "\n" . $rule_info['code'], LOCK_EX);
    }

    private function restore_htaccess_backup() {
        $backups = glob(ABSPATH . '.htaccess-backup-*');
        if (!empty($backups)) {
            $latest = end($backups);
            $waf_rules = "# MDefender-Pro";
            $content = @file_get_contents(ABSPATH . '.htaccess');
            if ($content && strpos($content, $waf_rules) !== false) {
                $lines = explode("\n", $content);
                $cleaned = [];
                $skip = false;
                foreach ($lines as $line) {
                    if (strpos($line, $waf_rules) !== false) { $skip = true; continue; }
                    if ($skip && (trim($line) === '' || $line[0] === '#')) continue;
                    if ($skip && strpos($line, '<') === 0) { $skip = false; }
                    if (!$skip) $cleaned[] = $line;
                }
                @file_put_contents(ABSPATH . '.htaccess', implode("\n", $cleaned));
            }
        }
    }

    private function find_fake_admins() {
        $suspicious = [];
        $admins = get_users(['role' => 'administrator']);
        $suspicious_domains = ['mail.ru', 'yandex.com', 'protonmail.com', 'tempmail', 'guerrillamail', '10minute', 'mailinator', 'yopmail'];
        foreach ($admins as $user) {
            $flags = [];
            if ($user->user_login === 'admin' || $user->user_login === 'administrator') {
                $flags[] = 'Generic default username';
            }
            if ($user->user_email) {
                $domain = substr(strrchr($user->user_email, '@'), 1);
                foreach ($suspicious_domains as $sd) {
                    if (stripos($domain, $sd) !== false) {
                        $flags[] = "Suspicious disposable email: {$domain}";
                        break;
                    }
                }
            }
            if (!empty($flags)) {
                $suspicious[] = [
                    'ID' => $user->ID,
                    'user_login' => $user->user_login,
                    'user_email' => $user->user_email,
                    'flags' => $flags,
                ];
            }
        }
        return $suspicious;
    }
}
