<?php
defined('ABSPATH') || exit;

class WAF_FW_Website_Hardening {
    private static $_instance = null;
    private $db;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->db = WAF_FW_DB::instance();

        // Dynamic Hardening Options Enforcement
        if (get_option('waf_fw_disable_xmlrpc') === 'yes') {
            add_filter('xmlrpc_enabled', '__return_false');
        }

        if (get_option('waf_fw_prevent_user_enumeration') === 'yes') {
            if (!is_admin()) {
                // Author query parameter blocks
                if (isset($_REQUEST['author']) || (isset($_GET['author']) && $_GET['author'] !== '')) {
                    wp_die('User enumeration blocked by MDefender-Pro WAF', 'Access Denied', ['response' => 403]);
                }
                // REST API users endpoints block
                add_filter('rest_endpoints', function($endpoints) {
                    if (isset($endpoints['/wp/v2/users'])) {
                        unset($endpoints['/wp/v2/users']);
                    }
                    if (isset($endpoints['/wp/v2/users/(?P<id>[\d]+)'])) {
                        unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
                    }
                    return $endpoints;
                });
            }
        }

        if (get_option('waf_fw_disable_file_editing') === 'yes') {
            if (!defined('DISALLOW_FILE_EDIT')) {
                define('DISALLOW_FILE_EDIT', true);
            }
        }

        if (get_option('waf_fw_disable_directory_listing') === 'yes') {
            add_action('init', function() {
                $htaccess = ABSPATH . '.htaccess';
                if (file_exists($htaccess) && is_writable($htaccess)) {
                    $content = @file_get_contents($htaccess);
                    if ($content && strpos($content, 'Options -Indexes') === false) {
                        $rule = "\n# MDefender-Pro - Disable Directory Browsing\nOptions -Indexes\n";
                        @file_put_contents($htaccess, $content . $rule, LOCK_EX);
                    }
                }
            });
        }

        if (get_option('waf_harden_security_headers') === 'enabled') {
            add_action('send_headers', [$this, 'send_security_headers']);
        }
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

    public function get_all_features() {
        return [
            'admin_protect'   => 'Protect wp-admin',
            'login_protect'   => 'Protect wp-login.php',
            'wp_config'       => 'Protect wp-config.php',
            'htaccess'        => 'Protect .htaccess',
            'uploads'         => 'Protect Uploads Folder',
            'sensitive_files' => 'Protect Sensitive Files',
            'rest_api'        => 'Protect REST API',
            'xmlrpc'          => 'Protect XML-RPC',
            'php_files'       => 'Protect PHP Files',
            'file_perms'      => 'File Permissions',
            'security_headers' => 'Security Headers',
            'user_accounts'   => 'User Account Protection',
            'backup'          => 'Backup Protection',
            'plugin_theme'    => 'Plugin & Theme Protection',
            'directory_browsing' => 'Directory Browsing',
            'version_hiding'  => 'WordPress Version Hiding',
        ];
    }

    /* ===== 1. ADMIN PROTECT ===== */
    public function apply_admin_protect($settings = []) {
        $results = ['feature' => 'admin_protect', 'actions' => []];
        if (isset($settings['disable_file_editor'])) {
            if (!defined('DISALLOW_FILE_EDIT')) {
                $this->write_to_wp_config('DISALLOW_FILE_EDIT', 'true');
                $results['actions'][] = 'File editor disabled in wp-config.php';
            } else {
                $results['actions'][] = 'File editor already disabled';
            }
        }
        if (isset($settings['admin_ip_whitelist']) && !empty($settings['admin_ip_whitelist'])) {
            update_option('waf_harden_admin_ips', $settings['admin_ip_whitelist']);
            $results['actions'][] = 'Admin IP whitelist updated';
        }
        if (isset($settings['admin_session_timeout'])) {
            update_option('waf_harden_admin_session_timeout', (int)$settings['admin_session_timeout']);
            $results['actions'][] = 'Admin session timeout set to ' . (int)$settings['admin_session_timeout'] . ' seconds';
        }
        if (isset($settings['disable_user_enum'])) {
            update_option('waf_harden_disable_user_enum', $settings['disable_user_enum'] ? 'yes' : 'no');
            $results['actions'][] = 'User enumeration ' . ($settings['disable_user_enum'] ? 'disabled' : 'enabled');
        }
        update_option('waf_harden_admin_protect', 'enabled');
        update_option('waf_harden_admin_protect_settings', $settings);
        return $results;
    }

    public function remove_admin_protect() {
        $this->remove_from_wp_config('DISALLOW_FILE_EDIT');
        delete_option('waf_harden_admin_ips');
        delete_option('waf_harden_admin_session_timeout');
        delete_option('waf_harden_disable_user_enum');
        update_option('waf_harden_admin_protect', 'disabled');
        update_option('waf_harden_admin_protect_settings', []);
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
            $results['actions'][] = 'Login URL renamed';
        }
        if (isset($settings['brute_force_threshold'])) {
            update_option('waf_harden_brute_force_threshold', (int)$settings['brute_force_threshold']);
            $results['actions'][] = 'Brute force threshold set to ' . (int)$settings['brute_force_threshold'];
        }
        if (isset($settings['login_lockout_time'])) {
            update_option('waf_harden_login_lockout_time', (int)$settings['login_lockout_time']);
        }
        update_option('waf_harden_login_protect', 'enabled');
        update_option('waf_harden_login_protect_settings', $settings);
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
    }

    /* ===== 3. WP-CONFIG PROTECT ===== */
    public function apply_wp_config_protect($settings = []) {
        $results = ['feature' => 'wp_config', 'actions' => []];
        $config_path = ABSPATH . 'wp-config.php';
        if (!file_exists($config_path)) {
            $results['error'] = 'wp-config.php not found';
            return $results;
        }
        if (isset($settings['backup_config'])) {
            $backup = ABSPATH . 'wp-config-backup-' . date('YmdHis') . '.php';
            if (@copy($config_path, $backup)) {
                $results['actions'][] = 'Backup created: ' . basename($backup);
            }
        }
        if (isset($settings['lock_permissions'])) {
            $perms = @fileperms($config_path);
            if ($perms !== false) {
                @chmod($config_path, 0600);
                $results['actions'][] = 'Permissions set to 600';
            }
        }
        update_option('waf_harden_wp_config', 'enabled');
        update_option('waf_harden_wp_config_settings', $settings);
        return $results;
    }

    public function remove_wp_config_protect() {
        update_option('waf_harden_wp_config', 'disabled');
        update_option('waf_harden_wp_config_settings', []);
    }

    /* ===== 4. HTACCESS PROTECT ===== */
    public function apply_htaccess_protect($settings = []) {
        $results = ['feature' => 'htaccess', 'actions' => []];
        $htaccess = ABSPATH . '.htaccess';
        if (isset($settings['backup_before_edit'])) {
            if (file_exists($htaccess)) {
                $backup = ABSPATH . '.htaccess-backup-' . date('YmdHis');
                if (@copy($htaccess, $backup)) {
                    $results['actions'][] = 'Backup created: ' . basename($backup);
                }
            }
        }
        if (isset($settings['block_dir_browsing'])) {
            $this->ensure_htaccess_rule($htaccess, 'block_directory_browsing');
            $results['actions'][] = 'Directory browsing blocking added to .htaccess';
        }
        if (isset($settings['protect_wp_config'])) {
            $this->ensure_htaccess_rule($htaccess, 'protect_wp_config');
            $results['actions'][] = 'wp-config.php protection added to .htaccess';
        }
        if (isset($settings['block_php_uploads'])) {
            $this->ensure_htaccess_rule($htaccess, 'block_php_uploads');
            $results['actions'][] = 'PHP execution blocked in uploads';
        }
        update_option('waf_harden_htaccess', 'enabled');
        update_option('waf_harden_htaccess_settings', $settings);
        return $results;
    }

    public function remove_htaccess_protect() {
        $this->restore_htaccess_backup();
        update_option('waf_harden_htaccess', 'disabled');
        update_option('waf_harden_htaccess_settings', []);
    }

    /* ===== 5. UPLOADS PROTECT ===== */
    public function apply_uploads_protect($settings = []) {
        $results = ['feature' => 'uploads', 'actions' => []];
        $upload_dir = wp_upload_dir();
        $htaccess = $upload_dir['basedir'] . '/.htaccess';
        if (isset($settings['block_php'])) {
            $this->ensure_htaccess_rule($htaccess, 'block_php_uploads', true);
            $results['actions'][] = 'PHP execution blocked in uploads via .htaccess';
        }
        if (isset($settings['scan_uploads'])) {
            update_option('waf_harden_scan_uploads', $settings['scan_uploads'] ? 'yes' : 'no');
            $results['actions'][] = 'Upload scanning ' . ($settings['scan_uploads'] ? 'enabled' : 'disabled');
        }
        if (isset($settings['block_executables'])) {
            update_option('waf_harden_block_executables', $settings['block_executables'] ? 'yes' : 'no');
        }
        update_option('waf_harden_uploads', 'enabled');
        update_option('waf_harden_uploads_settings', $settings);
        return $results;
    }

    public function remove_uploads_protect() {
        delete_option('waf_harden_scan_uploads');
        delete_option('waf_harden_block_executables');
        update_option('waf_harden_uploads', 'disabled');
        update_option('waf_harden_uploads_settings', []);
    }

    /* ===== 6. SENSITIVE FILES ===== */
    public function apply_sensitive_files_protect($settings = []) {
        $results = ['feature' => 'sensitive_files', 'actions' => []];
        $files = [
            '.env', 'wp-config.php', '.htaccess', 'web.config',
            'composer.json', 'composer.lock', 'package.json', 'package-lock.json',
            'readme.html', 'license.txt', 'debug.log', 'error_log',
            'backup.sql', 'backup.zip', 'phpinfo.php',
        ];
        $found = [];
        foreach ($files as $file) {
            $path = ABSPATH . $file;
            if (file_exists($path)) {
                $found[] = $file;
                $perms = @fileperms($path);
                if ($perms !== false && ($perms & 0044)) {
                    @chmod($path, $perms & ~0044);
                    $results['actions'][] = 'Locked permissions for ' . $file;
                }
            }
        }
        if (isset($settings['protect_git'])) {
            $git = ABSPATH . '.git';
            if (is_dir($git) && !file_exists(ABSPATH . '.gitaccess')) {
                @file_put_contents(ABSPATH . '.gitaccess', 'Deny from all');
            }
        }
        if (isset($settings['block_sensitive_urls'])) {
            update_option('waf_harden_block_sensitive_urls', $settings['block_sensitive_urls'] ? 'yes' : 'no');
        }
        update_option('waf_harden_sensitive_files', 'enabled');
        update_option('waf_harden_sensitive_files_settings', $settings);
        return $results;
    }

    public function remove_sensitive_files_protect() {
        delete_option('waf_harden_block_sensitive_urls');
        update_option('waf_harden_sensitive_files', 'disabled');
        update_option('waf_harden_sensitive_files_settings', []);
    }

    /* ===== 7. REST API PROTECT ===== */
    public function apply_rest_api_protect($settings = []) {
        $results = ['feature' => 'rest_api', 'actions' => []];
        if (isset($settings['disable_user_endpoints'])) {
            update_option('waf_harden_rest_disable_users', $settings['disable_user_endpoints'] ? 'yes' : 'no');
            $results['actions'][] = 'User enumeration via REST ' . ($settings['disable_user_endpoints'] ? 'disabled' : 'enabled');
        }
        if (isset($settings['require_auth'])) {
            update_option('waf_harden_rest_require_auth', $settings['require_auth'] ? 'yes' : 'no');
            $results['actions'][] = 'Anonymous REST access ' . ($settings['require_auth'] ? 'blocked' : 'allowed');
        }
        if (isset($settings['rate_limit'])) {
            update_option('waf_harden_rest_rate_limit', (int)$settings['rate_limit']);
        }
        update_option('waf_harden_rest_api', 'enabled');
        update_option('waf_harden_rest_api_settings', $settings);
        return $results;
    }

    public function remove_rest_api_protect() {
        delete_option('waf_harden_rest_disable_users');
        delete_option('waf_harden_rest_require_auth');
        delete_option('waf_harden_rest_rate_limit');
        update_option('waf_harden_rest_api', 'disabled');
        update_option('waf_harden_rest_api_settings', []);
    }

    /* ===== 8. XML-RPC PROTECT ===== */
    public function apply_xmlrpc_protect($settings = []) {
        $results = ['feature' => 'xmlrpc', 'actions' => []];
        if (isset($settings['disable_xmlrpc'])) {
            if ($settings['disable_xmlrpc'] === 'complete') {
                update_option('waf_harden_xmlrpc_mode', 'complete');
                add_filter('xmlrpc_enabled', '__return_false');
                $results['actions'][] = 'XML-RPC completely disabled';
            } elseif ($settings['disable_xmlrpc'] === 'jetpack_only') {
                update_option('waf_harden_xmlrpc_mode', 'jetpack_only');
                $results['actions'][] = 'XML-RPC limited to Jetpack only';
            } else {
                update_option('waf_harden_xmlrpc_mode', 'off');
                $results['actions'][] = 'XML-RPC blocking disabled';
            }
        }
        if (isset($settings['block_pingback'])) {
            update_option('waf_harden_block_pingback', $settings['block_pingback'] ? 'yes' : 'no');
        }
        update_option('waf_harden_xmlrpc', 'enabled');
        update_option('waf_harden_xmlrpc_settings', $settings);
        return $results;
    }

    public function remove_xmlrpc_protect() {
        update_option('waf_harden_xmlrpc_mode', 'off');
        delete_option('waf_harden_block_pingback');
        update_option('waf_harden_xmlrpc', 'disabled');
        update_option('waf_harden_xmlrpc_settings', []);
    }

    /* ===== 9. PHP FILES PROTECT ===== */
    public function apply_php_files_protect($settings = []) {
        $results = ['feature' => 'php_files', 'actions' => []];
        if (isset($settings['scan_dangerous_funcs'])) {
            update_option('waf_harden_scan_dangerous', $settings['scan_dangerous_funcs'] ? 'yes' : 'no');
            $dangerous = ['eval', 'exec', 'shell_exec', 'system', 'passthru', 'assert', 'base64_decode', 'gzinflate', 'popen', 'proc_open', 'pcntl_exec'];
            if (!empty($settings['custom_funcs'])) {
                $custom = array_map('trim', explode(',', $settings['custom_funcs']));
                $dangerous = array_merge($dangerous, $custom);
            }
            update_option('waf_harden_dangerous_funcs', $dangerous);
            $results['actions'][] = 'Dangerous function scanning ' . ($settings['scan_dangerous_funcs'] ? 'enabled' : 'disabled');
        }
        update_option('waf_harden_php_files', 'enabled');
        update_option('waf_harden_php_files_settings', $settings);
        return $results;
    }

    public function remove_php_files_protect() {
        delete_option('waf_harden_scan_dangerous');
        delete_option('waf_harden_dangerous_funcs');
        update_option('waf_harden_php_files', 'disabled');
        update_option('waf_harden_php_files_settings', []);
    }

    /* ===== 10. FILE PERMISSIONS ===== */
    public function apply_file_permissions($settings = []) {
        $results = ['feature' => 'file_perms', 'actions' => []];
        $recommended = [
            ABSPATH . 'wp-config.php' => 0600,
            ABSPATH . '.htaccess' => 0644,
            ABSPATH . 'wp-admin' => 0755,
            ABSPATH . 'wp-includes' => 0755,
            ABSPATH . 'wp-content' => 0755,
            WP_CONTENT_DIR . '/uploads' => 0755,
            WP_CONTENT_DIR . '/plugins' => 0755,
            WP_CONTENT_DIR . '/themes' => 0755,
        ];
        $auto_fix = isset($settings['auto_fix']) && $settings['auto_fix'];
        $fixed = [];
        $issues = [];
        foreach ($recommended as $path => $recommended_perm) {
            if (!file_exists($path)) continue;
            $current = @fileperms($path) & 0777;
            $status = ($current === $recommended_perm) ? 'ok' : 'warning';
            if ($status === 'warning') {
                $issues[] = [
                    'path' => str_replace(ABSPATH, '', $path),
                    'current' => sprintf('%o', $current),
                    'recommended' => sprintf('%o', $recommended_perm),
                ];
                if ($auto_fix) {
                    @chmod($path, $recommended_perm);
                    $fixed[] = str_replace(ABSPATH, '', $path);
                }
            }
        }
        if (!empty($fixed)) {
            $results['actions'][] = 'Auto-fixed permissions for: ' . implode(', ', $fixed);
        }
        $results['issues'] = $issues;
        $results['total_issues'] = count($issues);
        update_option('waf_harden_file_perms', 'enabled');
        update_option('waf_harden_file_perms_settings', $settings);
        return $results;
    }

    public function remove_file_permissions() {
        update_option('waf_harden_file_perms', 'disabled');
        update_option('waf_harden_file_perms_settings', []);
    }

    /* ===== 11. SECURITY HEADERS ===== */
    public function apply_security_headers($settings = []) {
        $results = ['feature' => 'security_headers', 'actions' => []];
        $default_headers = [];

        // X-Frame-Options
        $x_frame = $settings['x_frame_options'] ?? 'SAMEORIGIN';
        if ($x_frame && $x_frame !== 'off') {
            $default_headers['X-Frame-Options'] = $x_frame;
        }

        // X-Content-Type-Options
        if (!isset($settings['x_content_type_options']) || $settings['x_content_type_options']) {
            $default_headers['X-Content-Type-Options'] = 'nosniff';
        }

        // Referrer-Policy
        $ref_pol = $settings['referrer_policy'] ?? 'strict-origin-when-cross-origin';
        if ($ref_pol) {
            $default_headers['Referrer-Policy'] = $ref_pol;
        }

        // Permissions-Policy
        $perm_pol = $settings['permissions_policy'] ?? 'geolocation=(), microphone=(), camera=(), payment=()';
        if ($perm_pol) {
            $default_headers['Permissions-Policy'] = $perm_pol;
        }

        // Content-Security-Policy
        if (!empty($settings['csp'])) {
            $default_headers['Content-Security-Policy'] = $settings['csp'];
        } else {
            $default_headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'self';";
        }

        // HSTS (Strict-Transport-Security)
        if (isset($settings['hsts']) && $settings['hsts']) {
            $max_age = (int)($settings['hsts_max_age'] ?? 31536000);
            $hsts_val = "max-age={$max_age}";
            if (!empty($settings['hsts_subdomains'])) {
                $hsts_val .= '; includeSubDomains';
            }
            if (!empty($settings['hsts_preload'])) {
                $hsts_val .= '; preload';
            }
            $default_headers['Strict-Transport-Security'] = $hsts_val;
        }

        if (isset($settings['custom_headers'])) {
            $custom = json_decode($settings['custom_headers'], true);
            if (is_array($custom)) {
                foreach ($custom as $k => $v) {
                    $default_headers[$k] = $v;
                }
            }
        }

        update_option('waf_harden_security_headers_list', $default_headers);
        $results['actions'][] = count($default_headers) . ' security headers configured';
        update_option('waf_harden_security_headers', 'enabled');
        update_option('waf_harden_security_headers_settings', $settings);
        return $results;
    }

    public function remove_security_headers() {
        delete_option('waf_harden_security_headers_list');
        update_option('waf_harden_security_headers', 'disabled');
        update_option('waf_harden_security_headers_settings', []);
    }

    public function send_security_headers() {
        if (headers_sent()) return;
        $list = get_option('waf_harden_security_headers_list', []);
        if (is_array($list)) {
            foreach ($list as $name => $value) {
                header("$name: $value");
            }
        }
    }

    /* ===== 12. USER ACCOUNT PROTECT ===== */
    public function apply_user_account_protect($settings = []) {
        $results = ['feature' => 'user_accounts', 'actions' => []];
        if (isset($settings['detect_fake_admins'])) {
            update_option('waf_harden_detect_fake_admins', $settings['detect_fake_admins'] ? 'yes' : 'no');
            $suspicious = $this->find_fake_admins();
            $results['fake_admins'] = $suspicious;
            $results['actions'][] = count($suspicious) . ' suspicious admin(s) detected';
        }
        if (isset($settings['enforce_strong_passwords'])) {
            update_option('waf_harden_strong_passwords', $settings['enforce_strong_passwords'] ? 'yes' : 'no');
        }
        if (isset($settings['track_logins'])) {
            update_option('waf_harden_track_logins', $settings['track_logins'] ? 'yes' : 'no');
        }
        update_option('waf_harden_user_accounts', 'enabled');
        update_option('waf_harden_user_accounts_settings', $settings);
        return $results;
    }

    public function remove_user_account_protect() {
        delete_option('waf_harden_detect_fake_admins');
        delete_option('waf_harden_strong_passwords');
        delete_option('waf_harden_track_logins');
        update_option('waf_harden_user_accounts', 'disabled');
        update_option('waf_harden_user_accounts_settings', []);
    }

    /* ===== 13. BACKUP PROTECT ===== */
    public function apply_backup_protect($settings = []) {
        $results = ['feature' => 'backup', 'actions' => []];
        if (isset($settings['detect_backups'])) {
            $backup_patterns = ['*.sql', '*.zip', '*.tar.gz', '*.gz', '*.bak', 'backup*', '*.dump'];
            $found = [];
            foreach ($backup_patterns as $pattern) {
                $matches = glob(ABSPATH . $pattern);
                if ($matches) {
                    foreach ($matches as $m) {
                        if (is_file($m)) {
                            $found[] = str_replace(ABSPATH, '', $m);
                        }
                    }
                }
            }
            $results['found_backups'] = $found;
            $results['actions'][] = count($found) . ' exposed backup(s) found';
            update_option('waf_harden_backup_findings', $found);
        }
        if (isset($settings['protect_backup_folder'])) {
            $backup_dir = ABSPATH . 'wp-content/waf-backups/';
            if (!is_dir($backup_dir)) {
                wp_mkdir_p($backup_dir);
                @file_put_contents($backup_dir . '.htaccess', "Deny from all\n");
            }
        }
        update_option('waf_harden_backup', 'enabled');
        update_option('waf_harden_backup_settings', $settings);
        return $results;
    }

    public function remove_backup_protect() {
        delete_option('waf_harden_backup_findings');
        update_option('waf_harden_backup', 'disabled');
        update_option('waf_harden_backup_settings', []);
    }

    /* ===== 14. PLUGIN & THEME PROTECT ===== */
    public function apply_plugin_theme_protect($settings = []) {
        $results = ['feature' => 'plugin_theme', 'actions' => []];
        if (isset($settings['detect_modifications'])) {
            update_option('waf_harden_detect_modifications', $settings['detect_modifications'] ? 'yes' : 'no');
            $results['actions'][] = 'Plugin/theme modification detection ' . ($settings['detect_modifications'] ? 'enabled' : 'disabled');
        }
        if (isset($settings['block_unauthorized_install'])) {
            update_option('waf_harden_block_unauthorized_install', $settings['block_unauthorized_install'] ? 'yes' : 'no');
        }
        update_option('waf_harden_plugin_theme', 'enabled');
        update_option('waf_harden_plugin_theme_settings', $settings);
        return $results;
    }

    public function remove_plugin_theme_protect() {
        delete_option('waf_harden_detect_modifications');
        delete_option('waf_harden_block_unauthorized_install');
        update_option('waf_harden_plugin_theme', 'disabled');
        update_option('waf_harden_plugin_theme_settings', []);
    }

    /* ===== 15. DIRECTORY BROWSING ===== */
    public function apply_directory_browsing($settings = []) {
        $results = ['feature' => 'directory_browsing', 'actions' => []];
        $htaccess = ABSPATH . '.htaccess';
        $rule = "\n# MDefender-Pro - Disable Directory Browsing\nOptions -Indexes\n";
        if (file_exists($htaccess)) {
            $content = @file_get_contents($htaccess);
            if (strpos($content, 'Options -Indexes') === false) {
                if (isset($settings['backup'])) {
                    @copy($htaccess, ABSPATH . '.htaccess-backup-' . date('YmdHis'));
                }
                @file_put_contents($htaccess, $content . $rule, LOCK_EX);
                $results['actions'][] = 'Directory browsing disabled via .htaccess';
            } else {
                $results['actions'][] = 'Directory browsing already disabled';
            }
        }
        if (isset($settings['disable_index_html'])) {
            foreach (glob(ABSPATH . '*/index.html') as $idx) {
                if (!file_exists(dirname($idx) . '/index.php')) {
                    @file_put_contents(dirname($idx) . '/index.php', "<?php\n// Silence is golden.\n");
                }
            }
        }
        update_option('waf_harden_directory_browsing', 'enabled');
        update_option('waf_harden_directory_browsing_settings', $settings);
        return $results;
    }

    public function remove_directory_browsing() {
        update_option('waf_harden_directory_browsing', 'disabled');
        update_option('waf_harden_directory_browsing_settings', []);
    }

    /* ===== 16. VERSION HIDING ===== */
    public function apply_version_hiding($settings = []) {
        $results = ['feature' => 'version_hiding', 'actions' => []];
        if (isset($settings['hide_wp_version'])) {
            update_option('waf_harden_hide_wp_version', $settings['hide_wp_version'] ? 'yes' : 'no');
            $results['actions'][] = 'WordPress version hidden from source';
        }
        if (isset($settings['remove_readme'])) {
            if (file_exists(ABSPATH . 'readme.html')) {
                @rename(ABSPATH . 'readme.html', ABSPATH . 'readme.html.waf-backup');
                $results['actions'][] = 'readme.html renamed';
            }
        }
        update_option('waf_harden_version_hiding', 'enabled');
        update_option('waf_harden_version_hiding_settings', $settings);
        return $results;
    }

    public function remove_version_hiding() {
        delete_option('waf_harden_hide_wp_version');
        if (file_exists(ABSPATH . 'readme.html.waf-backup')) {
            @rename(ABSPATH . 'readme.html.waf-backup', ABSPATH . 'readme.html');
        }
        update_option('waf_harden_version_hiding', 'disabled');
        update_option('waf_harden_version_hiding_settings', []);
    }

    /* ===== ONE-CLICK HARDEN ===== */
    public function one_click_harden() {
        $results = [
            'total' => 0,
            'applied' => 0,
            'errors' => 0,
            'details' => [],
        ];
        $features = $this->get_all_features();
        foreach ($features as $key => $label) {
            $method = 'apply_' . $key;
            if (method_exists($this, $method)) {
                try {
                    if ($key === 'file_perms') {
                        $r = $this->$method(['auto_fix' => true]);
                    } else {
                        $r = $this->$method(['enabled' => true]);
                    }
                    $results['applied']++;
                    $results['details'][] = [
                        'feature' => $key,
                        'label' => $label,
                        'status' => 'applied',
                        'actions' => $r['actions'] ?? [],
                    ];
                } catch (Exception $e) {
                    $results['errors']++;
                    $results['details'][] = [
                        'feature' => $key,
                        'label' => $label,
                        'status' => 'error',
                        'error' => $e->getMessage(),
                    ];
                }
            }
            $results['total']++;
        }
        return $results;
    }

    /* ===== HARDENING REPORT ===== */
    public function generate_report() {
        $statuses = $this->get_status();
        $score = 0;
        $max_score = count($statuses) * 100;
        $details = [];
        foreach ($statuses as $key => $info) {
            $enabled = $info['status'] === 'enabled';
            $weight = 100 / count($statuses);
            $feature_score = $enabled ? 100 : 0;
            $score += $feature_score;
            $details[] = [
                'feature' => $key,
                'label' => $info['label'],
                'status' => $enabled ? 'enabled' : 'disabled',
                'score' => $feature_score,
                'weight' => round($weight, 1),
                'recommendation' => $enabled ? null : 'Enable ' . $info['label'] . ' to improve security',
            ];
        }
        $overall = $max_score > 0 ? round(($score / $max_score) * 100) : 0;
        $grade = $overall >= 90 ? 'A' : ($overall >= 80 ? 'B' : ($overall >= 70 ? 'C' : ($overall >= 60 ? 'D' : 'F')));
        return [
            'score' => $overall,
            'grade' => $grade,
            'total_features' => count($statuses),
            'enabled_count' => count(array_filter($statuses, function($s) { return $s['status'] === 'enabled'; })),
            'details' => $details,
        ];
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
            'block_directory_browsing' => "\n# MDefender-Pro - Disable Directory Browsing\nOptions -Indexes\n",
            'protect_wp_config' => "\n# MDefender-Pro - Protect wp-config.php\n<files wp-config.php>\norder allow,deny\ndeny from all\n</files>\n",
            'block_php_uploads' => "\n# MDefender-Pro - Block PHP in Uploads\n<Files *.php>\ndeny from all\n</Files>\n",
        ];
        if (!isset($rules[$rule_type])) return false;
        if ($create && !file_exists($htaccess)) {
            @file_put_contents($htaccess, $rules[$rule_type]);
            return true;
        }
        if (!file_exists($htaccess)) return false;
        $content = @file_get_contents($htaccess);
        if (strpos($content, 'MDefender-Pro - ' . $rule_type) !== false) return true;
        return @file_put_contents($htaccess, $content . $rules[$rule_type], LOCK_EX);
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
            if ($user->user_login === 'admin') {
                $flags[] = 'Default admin username';
            }
            if ($user->user_email) {
                $domain = substr(strrchr($user->user_email, '@'), 1);
                foreach ($suspicious_domains as $sd) {
                    if (stripos($domain, $sd) !== false) {
                        $flags[] = "Suspicious email domain: $domain";
                        break;
                    }
                }
                if (!email_exists($user->user_email)) {
                    $flags[] = 'Potentially invalid email';
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
