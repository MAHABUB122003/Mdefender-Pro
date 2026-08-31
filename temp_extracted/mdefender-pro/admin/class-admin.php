<?php
defined('ABSPATH') || exit;

class WAF_FW_Admin {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_head', [$this, 'admin_head_styles']);
        add_action('admin_notices', [$this, 'show_admin_notifications']);
    }

    public function show_admin_notifications() {
        $screen = get_current_screen();
        if (!$screen || strpos($screen->id, 'waf-firewall') === false) return;

        $latest_scan = WAF_FW_Scanner::instance()->get_latest_scan();
        if ($latest_scan && isset($latest_scan->score)) {
            if ($latest_scan->score < 50) {
                echo '<div class="notice notice-error is-dismissible"><p><strong>MDefender-Pro:</strong> Last security scan scored ' . esc_html($latest_scan->score) . '/100 with ' . esc_html($latest_scan->issues_found) . ' issue(s). <a href="' . admin_url('admin.php?page=waf-firewall-scan') . '">Review scan results</a>.</p></div>';
            } elseif ($latest_scan->issues_found > 0) {
                echo '<div class="notice notice-warning is-dismissible"><p><strong>MDefender-Pro:</strong> Last scan found ' . esc_html($latest_scan->issues_found) . ' issue(s). <a href="' . admin_url('admin.php?page=waf-firewall-scan') . '">View details</a>.</p></div>';
            }
        }

        if (get_option('waf_fw_learning_mode', 'no') === 'yes') {
            echo '<div class="notice notice-info is-dismissible"><p><strong>MDefender-Pro:</strong> Learning mode is active. The WAF will log but NOT block requests. <a href="' . admin_url('admin.php?page=waf-firewall-settings') . '">Disable learning mode</a> when ready.</p></div>';
        }

        $protection = get_option('waf_fw_protection_enabled', 'yes');
        if ($protection !== 'yes') {
            echo '<div class="notice notice-error is-dismissible"><p><strong>MDefender-Pro:</strong> Protection is DISABLED. Your website is not protected. <a href="' . admin_url('admin.php?page=waf-firewall-settings') . '">Enable protection</a>.</p></div>';
        }
    }

    public function admin_head_styles() {
        ?>
        <style>
            #adminmenu .toplevel_page_waf-firewall .wp-menu-image img {
                width: 20px;
                height: 20px;
                padding: 6px 0 0;
                opacity: 0.9;
            }
            #adminmenu .toplevel_page_waf-firewall:hover .wp-menu-image img {
                opacity: 1;
            }
            #adminmenu .toplevel_page_waf-firewall.current .wp-menu-image img {
                opacity: 1;
            }
            .waf-badge-pro {
                background: #f59e0b;
                color: #fff;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 4px;
                font-weight: 600;
            }
        </style>
        <?php
    }

    public function add_admin_menu() {
        add_menu_page(
            'MDefender-Pro - AI Web Application Firewall',
            'MDefender-Pro',
            'manage_options',
            'waf-firewall',
            [$this, 'render_dashboard'],
            'dashicons-shield',
            100
        );

        $pages = [
            'waf-firewall' => [
                'title' => 'Dashboard',
                'menu' => 'Dashboard',
                'render' => 'render_dashboard',
            ],
            'waf-firewall-rules' => [
                'title' => 'Firewall Rules',
                'menu' => 'Firewall Rules',
                'render' => 'render_rules',
            ],
            'waf-firewall-blocked' => [
                'title' => 'Blocked IPs',
                'menu' => 'Blocked IPs',
                'render' => 'render_blocked',
            ],
            'waf-firewall-blacklist' => [
                'title' => 'Blacklist',
                'menu' => 'Blacklist',
                'render' => 'render_blacklist',
            ],
            'waf-firewall-logs' => [
                'title' => 'Security Logs',
                'menu' => 'Security Logs',
                'render' => 'render_logs',
            ],
            'waf-firewall-scan' => [
                'title' => 'Scan Website',
                'menu' => 'Scan Website',
                'render' => 'render_scan',
            ],
            'waf-firewall-hardening' => [
                'title' => 'Website Hardening',
                'menu' => 'Hardening',
                'render' => 'render_hardening',
            ],
            'waf-firewall-tools' => [
                'title' => 'Tools & Security',
                'menu' => 'Tools',
                'render' => 'render_tools',
            ],
            'waf-firewall-settings' => [
                'title' => 'Settings',
                'menu' => 'Settings',
                'render' => 'render_settings',
            ],
            'waf-firewall-about' => [
                'title' => 'About',
                'menu' => 'About',
                'render' => 'render_about',
            ],
        ];

        foreach ($pages as $slug => $page) {
            add_submenu_page(
                'waf-firewall',
                $page['title'],
                $page['menu'],
                'manage_options',
                $slug,
                [$this, $page['render']]
            );
        }
    }

    public function enqueue_assets($hook) {
        if (strpos($hook, 'waf-firewall') === false) return;

        wp_enqueue_style('waf-fw-admin', WAF_FW_PLUGIN_URL . 'assets/css/admin.css', [], WAF_FW_VERSION);
        wp_enqueue_script('waf-fw-admin', WAF_FW_PLUGIN_URL . 'assets/js/admin.js', ['jquery'], WAF_FW_VERSION, true);
        wp_enqueue_script('waf-fw-charts', 'https://cdn.jsdelivr.net/npm/chart.js', [], '4.4.0', true);
        wp_enqueue_script('waf-fw-dashboard', WAF_FW_PLUGIN_URL . 'assets/js/dashboard.js', ['jquery', 'waf-fw-charts'], WAF_FW_VERSION, true);

        if (strpos($hook, 'waf-firewall-scan') !== false) {
            wp_enqueue_script('waf-fw-scan', WAF_FW_PLUGIN_URL . 'assets/js/scan.js', ['jquery'], WAF_FW_VERSION, true);
        }

        if (strpos($hook, 'waf-firewall-hardening') !== false) {
            wp_enqueue_style('waf-fw-harden', WAF_FW_PLUGIN_URL . 'assets/css/hardening.css', [], WAF_FW_VERSION);
            wp_enqueue_script('waf-fw-harden', WAF_FW_PLUGIN_URL . 'assets/js/hardening.js', ['jquery'], WAF_FW_VERSION, true);
        }

        wp_localize_script('waf-fw-admin', 'waf_fw_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('waf_fw_ajax'),
            'plugin_url' => WAF_FW_PLUGIN_URL,
        ]);
    }

    private function render_header() {
        include WAF_FW_PLUGIN_DIR . 'admin/partials/header.php';
    }

    private function render_footer() {
        echo '</div>';
    }

    public function render_dashboard() {
        $this->render_header();
        include WAF_FW_PLUGIN_DIR . 'admin/partials/dashboard.php';
    }

    public function render_rules() {
        $this->render_header();
        $engine = WAF_FW_Rule_Engine::instance();
        $rules = [];
        foreach ($engine->get_rules() as $i => $rule) {
            $rule['id'] = $i;
            $rules[] = $rule;
        }
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/rules.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_blocked() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/blocked-ips.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_blacklist() {
        $this->render_header();
        $filter = WAF_FW_IP_Filter::instance();
        $blacklist = $filter->get_blacklist();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/blacklist.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_logs() {
        $this->render_header();
        $logger = WAF_FW_Logger::instance();
        $logs = $logger->get_logs($_GET);
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/logs.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_scan() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/scan-website.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_hardening() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/hardening.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_settings() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/settings.php';
        echo '</div>';
        $this->render_footer();
    }

    public function render_about() {
        $this->render_header();
        include WAF_FW_PLUGIN_DIR . 'admin/partials/about.php';
    }

    public function render_tools() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/tools.php';
        echo '</div>';
        $this->render_footer();
    }

    private function render_feature_settings($key, $label, $settings = []) {
        $descriptions = [
            'admin_protect' => 'Disable file editor, restrict admin by IP, set session timeout, disable user enumeration.',
            'login_protect' => 'Add CAPTCHA, rename login URL, set brute force thresholds, temporary lockouts.',
            'wp_config' => 'Backup wp-config.php, lock permissions to 600, monitor for changes.',
            'htaccess' => 'Backup .htaccess, block directory browsing, protect wp-config.php, block PHP in uploads.',
            'uploads' => 'Block PHP execution in uploads, scan uploads for malware, block executable files.',
            'sensitive_files' => 'Protect .env, composer.json, debug.log, readme.html, .git and other sensitive files.',
            'rest_api' => 'Disable user endpoints, require authentication, rate limit REST API requests.',
            'xmlrpc' => 'Disable XML-RPC completely or limit to Jetpack only. Block pingback attacks.',
            'php_files' => 'Scan for dangerous functions: eval, exec, system, shell_exec, passthru, assert, base64_decode.',
            'file_perms' => 'Audit and fix file permissions. Recommended: 600 for wp-config.php, 755 for directories.',
            'security_headers' => 'Set CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.',
            'user_accounts' => 'Detect fake admin accounts, enforce strong passwords, track login activity.',
            'backup' => 'Detect exposed backup files (.sql, .zip, .tar.gz), protect backup directories.',
            'plugin_theme' => 'Detect modified plugin/theme files, block unauthorized installations.',
            'directory_browsing' => 'Disable directory listing via Options -Indexes. Add index.php files.',
            'version_hiding' => 'Remove WordPress version from source, rename readme.html.',
        ];
        $desc = $descriptions[$key] ?? 'Secure this area of your WordPress installation.';
        echo '<p class="description">' . esc_html($desc) . '</p>';

        switch ($key) {
            case 'admin_protect':
                $this->checkbox_setting('disable_file_editor', 'Disable file editor (DISALLOW_FILE_EDIT)', $settings);
                $this->checkbox_setting('disable_user_enum', 'Disable user enumeration', $settings);
                $this->text_setting('admin_ip_whitelist', 'Admin IP Whitelist (comma-separated)', $settings, '');
                $this->text_setting('admin_session_timeout', 'Session timeout (seconds)', $settings, 3600);
                break;
            case 'login_protect':
                $this->checkbox_setting('login_captcha', 'Enable CAPTCHA on login', $settings);
                echo '<div style="margin:6px 0 10px 20px;padding:8px 12px;background:var(--war-gray-50);border-radius:8px;border:1px solid var(--war-gray-200);">';
                echo '<p style="font-size:11px;color:var(--war-gray-500);margin:0 0 6px;"><strong>reCAPTCHA Keys</strong> (optional — uses image CAPTCHA if empty)</p>';
                echo '<p style="margin:0 0 4px;"><input type="text" name="recaptcha_site_key" value="' . esc_attr($settings['recaptcha_site_key'] ?? '') . '" placeholder="Site Key" style="width:100%;padding:6px 10px;border:1px solid var(--war-gray-300);border-radius:6px;font-size:12px;"></p>';
                echo '<p style="margin:0;"><input type="text" name="recaptcha_secret_key" value="' . esc_attr($settings['recaptcha_secret_key'] ?? '') . '" placeholder="Secret Key" style="width:100%;padding:6px 10px;border:1px solid var(--war-gray-300);border-radius:6px;font-size:12px;"></p>';
                echo '</div>';
                $this->text_setting('login_rename', 'Rename login URL (e.g., "secure-login")', $settings, '');
                $this->text_setting('brute_force_threshold', 'Brute force attempts threshold', $settings, 5);
                $this->text_setting('login_lockout_time', 'Lockout duration (seconds)', $settings, 1800);
                break;
            case 'wp_config':
                $this->checkbox_setting('backup_config', 'Create backup before modifications', $settings, true);
                $this->checkbox_setting('lock_permissions', 'Lock permissions to 600', $settings, true);
                break;
            case 'htaccess':
                $this->checkbox_setting('backup_before_edit', 'Backup .htaccess before edits', $settings, true);
                $this->checkbox_setting('block_dir_browsing', 'Block directory browsing', $settings, true);
                $this->checkbox_setting('protect_wp_config', 'Protect wp-config.php via .htaccess', $settings, true);
                $this->checkbox_setting('block_php_uploads', 'Block PHP execution in uploads', $settings, true);
                break;
            case 'uploads':
                $this->checkbox_setting('block_php', 'Block PHP files in uploads', $settings, true);
                $this->checkbox_setting('scan_uploads', 'Scan uploads for malware', $settings);
                $this->checkbox_setting('block_executables', 'Block executable files in uploads', $settings, true);
                break;
            case 'sensitive_files':
                $this->checkbox_setting('protect_git', 'Protect .git directory', $settings, true);
                $this->checkbox_setting('block_sensitive_urls', 'Block direct access to sensitive files', $settings, true);
                break;
            case 'rest_api':
                $this->checkbox_setting('disable_user_endpoints', 'Disable user enumeration via REST', $settings, true);
                $this->checkbox_setting('require_auth', 'Require authentication for REST API', $settings);
                $this->text_setting('rate_limit', 'Rate limit (requests per minute)', $settings, 60);
                break;
            case 'xmlrpc':
                echo '<p><label>XML-RPC Mode:</label><select name="disable_xmlrpc">';
                $modes = ['off' => 'Allow (No Restriction)', 'complete' => 'Completely Disable', 'jetpack_only' => 'Jetpack Only'];
                $current = $settings['disable_xmlrpc'] ?? 'complete';
                foreach ($modes as $val => $lbl) {
                    echo '<option value="' . $val . '" ' . selected($current, $val, false) . '>' . $lbl . '</option>';
                }
                echo '</select></p>';
                $this->checkbox_setting('block_pingback', 'Block pingback attacks', $settings, true);
                break;
            case 'php_files':
                $this->checkbox_setting('scan_dangerous_funcs', 'Scan for dangerous functions', $settings, true);
                $this->text_setting('custom_funcs', 'Additional dangerous functions (comma-separated)', $settings, '');
                break;
            case 'file_perms':
                $this->checkbox_setting('auto_fix', 'Auto-fix incorrect permissions', $settings);
                break;
            case 'security_headers':
                $this->checkbox_setting('hsts', 'Enable HSTS (Strict-Transport-Security)', $settings, true);
                echo '<p><label>HSTS Max Age:</label><select name="hsts_max_age" style="width:240px;">';
                $hsts_ages = [
                    '31536000' => '1 Year (31536000s - Recommended)',
                    '63072000' => '2 Years (63072000s)',
                    '15768000' => '6 Months (15768000s)'
                ];
                $hsts_cur = $settings['hsts_max_age'] ?? '31536000';
                foreach ($hsts_ages as $v => $l) {
                    echo '<option value="' . $v . '" ' . selected($hsts_cur, $v, false) . '>' . $l . '</option>';
                }
                echo '</select></p>';
                $this->checkbox_setting('hsts_subdomains', 'HSTS Include Subdomains (includeSubDomains)', $settings, true);
                $this->checkbox_setting('hsts_preload', 'HSTS Preload (HSTS Preload List Ready)', $settings, false);

                echo '<p><label>X-Frame-Options:</label><select name="x_frame_options" style="width:240px;">';
                $xframe_opts = ['SAMEORIGIN' => 'SAMEORIGIN (Recommended)', 'DENY' => 'DENY', 'off' => 'Disabled'];
                $xframe_cur = $settings['x_frame_options'] ?? 'SAMEORIGIN';
                foreach ($xframe_opts as $v => $l) {
                    echo '<option value="' . $v . '" ' . selected($xframe_cur, $v, false) . '>' . $l . '</option>';
                }
                echo '</select></p>';

                $this->checkbox_setting('x_content_type_options', 'X-Content-Type-Options: nosniff', $settings, true);
                $this->text_setting('csp', 'Content-Security-Policy (CSP)', $settings, "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;");

                echo '<p><label>Referrer-Policy:</label><select name="referrer_policy" style="width:240px;">';
                $ref_opts = [
                    'strict-origin-when-cross-origin' => 'strict-origin-when-cross-origin (Recommended)',
                    'no-referrer' => 'no-referrer',
                    'no-referrer-when-downgrade' => 'no-referrer-when-downgrade',
                    'same-origin' => 'same-origin',
                    'strict-origin' => 'strict-origin'
                ];
                $ref_cur = $settings['referrer_policy'] ?? 'strict-origin-when-cross-origin';
                foreach ($ref_opts as $v => $l) {
                    echo '<option value="' . $v . '" ' . selected($ref_cur, $v, false) . '>' . $l . '</option>';
                }
                echo '</select></p>';

                $this->text_setting('permissions_policy', 'Permissions-Policy', $settings, "geolocation=(), microphone=(), camera=(), payment=()");
                break;
            case 'user_accounts':
                $this->checkbox_setting('detect_fake_admins', 'Detect fake/suspicious admin accounts', $settings, true);
                $this->checkbox_setting('enforce_strong_passwords', 'Enforce strong passwords', $settings);
                $this->checkbox_setting('track_logins', 'Track user login activity', $settings);
                break;
            case 'backup':
                $this->checkbox_setting('detect_backups', 'Detect exposed backup files', $settings, true);
                $this->checkbox_setting('protect_backup_folder', 'Create and protect backup folder', $settings);
                break;
            case 'plugin_theme':
                $this->checkbox_setting('detect_modifications', 'Detect plugin/theme file modifications', $settings, true);
                $this->checkbox_setting('block_unauthorized_install', 'Block unauthorized plugin/theme installs', $settings);
                break;
            case 'directory_browsing':
                $this->checkbox_setting('backup', 'Backup .htaccess before editing', $settings, true);
                $this->checkbox_setting('disable_index_html', 'Add index.php to empty directories', $settings, true);
                break;
            case 'version_hiding':
                $this->checkbox_setting('hide_wp_version', 'Remove WordPress version from source', $settings, true);
                $this->checkbox_setting('remove_readme', 'Rename/remove readme.html', $settings, true);
                break;
        }
        echo '<div class="war-harden-actions"><button class="war-btn war-btn-primary war-harden-apply-btn">Apply</button></div>';
    }

    private function checkbox_setting($name, $label, $settings, $default = false) {
        $checked = isset($settings[$name]) ? $settings[$name] : $default;
        echo '<p><label><input type="checkbox" name="' . esc_attr($name) . '" ' . checked($checked, true, false) . '> ' . esc_html($label) . '</label></p>';
    }

    private function text_setting($name, $label, $settings, $default = '') {
        $value = $settings[$name] ?? $default;
        echo '<p><label>' . esc_html($label) . '</label><input type="text" name="' . esc_attr($name) . '" value="' . esc_attr(is_array($value) ? '' : $value) . '" placeholder="' . esc_attr($default) . '"></p>';
    }
}
