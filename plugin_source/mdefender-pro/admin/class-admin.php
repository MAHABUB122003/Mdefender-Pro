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
            'waf-firewall-2fa' => [
                'title' => '2FA Authentication',
                'menu' => '2FA Auth',
                'render' => 'render_2fa',
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
        $this->render_footer();
    }

    public function render_2fa() {
        $this->render_header();
        echo '<div class="war-dashboard">';
        include WAF_FW_PLUGIN_DIR . 'admin/partials/2fa.php';
        echo '</div>';
        $this->render_footer();
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
            'admin_protect' => 'Disable file editor, restrict admin by IP, set session timeout, and disable user enumeration.',
            'login_protect' => 'Add CAPTCHA protection, rename login slug, enforce brute force lockout thresholds.',
            'wp_config' => 'Lock wp-config.php permissions to 600, backup before changes, and prevent unauthorized tampering.',
            'htaccess' => 'Block directory browsing, protect sensitive config files, and disable PHP execution in uploads.',
            'uploads' => 'Block PHP script execution in wp-content/uploads, scan media for malware, and ban executables.',
            'sensitive_files' => 'Block direct access to .env, composer.json, debug.log, readme.html, and .git directories.',
            'rest_api' => 'Disable user enumeration via WP REST endpoints, require authentication for sensitive routes.',
            'xmlrpc' => 'Completely disable XML-RPC or limit to Jetpack to neutralize DDoS and pingback amplification.',
            'php_files' => 'Proactively detect dangerous PHP functions (eval, exec, system, shell_exec, base64_decode).',
            'file_perms' => 'Audit and automatically repair insecure WordPress core file and directory permissions.',
            'security_headers' => 'Enforce HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.',
            'user_accounts' => 'Detect rogue administrator accounts, enforce strong password policies, and track logins.',
            'backup' => 'Discover exposed database dumps (.sql, .zip, .tar.gz) and protect backup directories.',
            'plugin_theme' => 'Monitor core/plugin/theme file integrity and block unauthorized background installations.',
            'directory_browsing' => 'Disable directory index listings via Options -Indexes and ensure empty folder protection.',
            'version_hiding' => 'Remove WordPress version signatures from HTML generator tags, scripts, and readme files.',
        ];
        $desc = $descriptions[$key] ?? 'Secure this area of your WordPress installation.';
        echo '<div class="war-harden-desc-box"><p class="war-harden-desc">' . esc_html($desc) . '</p></div>';
        echo '<div class="war-harden-fields">';

        switch ($key) {
            case 'admin_protect':
                $this->checkbox_setting('disable_file_editor', 'Disable file editor (DISALLOW_FILE_EDIT)', $settings, true);
                $this->checkbox_setting('disable_user_enum', 'Disable user enumeration (author query blocks)', $settings, true);
                $this->text_setting('admin_ip_whitelist', 'Admin IP Whitelist (comma-separated)', $settings, '');
                $this->text_setting('admin_session_timeout', 'Session Timeout (seconds)', $settings, 3600);
                break;
            case 'login_protect':
                $this->checkbox_setting('login_captcha', 'Enable CAPTCHA on login page', $settings, true);
                echo '<div class="war-harden-subbox">';
                echo '<div class="war-harden-subbox-title"><span class="dashicons dashicons-lock"></span> Google reCAPTCHA v2/v3 (Optional - uses Math CAPTCHA if empty)</div>';
                echo '<div class="war-field-row"><label>Site Key</label><input type="text" name="recaptcha_site_key" value="' . esc_attr($settings['recaptcha_site_key'] ?? '') . '" placeholder="Enter reCAPTCHA site key" class="war-input"></div>';
                echo '<div class="war-field-row"><label>Secret Key</label><input type="text" name="recaptcha_secret_key" value="' . esc_attr($settings['recaptcha_secret_key'] ?? '') . '" placeholder="Enter reCAPTCHA secret key" class="war-input"></div>';
                echo '</div>';
                $this->text_setting('login_rename', 'Rename Login URL slug (e.g., "secure-login")', $settings, '');
                $this->text_setting('brute_force_threshold', 'Brute Force Attempts Threshold', $settings, 5);
                $this->text_setting('login_lockout_time', 'Lockout Duration (seconds)', $settings, 1800);
                break;
            case 'wp_config':
                $this->checkbox_setting('backup_config', 'Create automatic backup before any modifications', $settings, true);
                $this->checkbox_setting('lock_permissions', 'Lock wp-config.php permissions to 0600', $settings, true);
                break;
            case 'htaccess':
                $this->checkbox_setting('backup_before_edit', 'Backup .htaccess before making edits', $settings, true);
                $this->checkbox_setting('block_dir_browsing', 'Block directory browsing (Options -Indexes)', $settings, true);
                $this->checkbox_setting('protect_wp_config', 'Protect wp-config.php via .htaccess rules', $settings, true);
                $this->checkbox_setting('block_php_uploads', 'Block direct PHP execution in wp-content/uploads', $settings, true);
                break;
            case 'uploads':
                $this->checkbox_setting('block_php', 'Block PHP script execution in uploads directory', $settings, true);
                $this->checkbox_setting('scan_uploads', 'Scan newly uploaded media files for malware', $settings, true);
                $this->checkbox_setting('block_executables', 'Block .exe, .sh, .py, .pl, .cgi executables in uploads', $settings, true);
                break;
            case 'sensitive_files':
                $this->checkbox_setting('protect_git', 'Block direct access to .git, .svn, and .env files', $settings, true);
                $this->checkbox_setting('block_sensitive_urls', 'Block access to composer.json, package.json, debug.log', $settings, true);
                break;
            case 'rest_api':
                $this->checkbox_setting('disable_user_endpoints', 'Disable user listing via REST API (/wp/v2/users)', $settings, true);
                $this->checkbox_setting('require_auth', 'Require authentication for custom REST endpoints', $settings, false);
                $this->text_setting('rate_limit', 'Rate Limit (Requests per minute per IP)', $settings, 60);
                break;
            case 'xmlrpc':
                echo '<div class="war-field-row"><label class="war-field-label">XML-RPC Protection Mode</label><select name="disable_xmlrpc" class="war-select">';
                $modes = ['complete' => 'Completely Disable (Recommended)', 'jetpack_only' => 'Allow Jetpack Only', 'off' => 'Allow (No Restrictions)'];
                $current = $settings['disable_xmlrpc'] ?? 'complete';
                foreach ($modes as $val => $lbl) {
                    echo '<option value="' . esc_attr($val) . '" ' . selected($current, $val, false) . '>' . esc_html($lbl) . '</option>';
                }
                echo '</select></div>';
                $this->checkbox_setting('block_pingback', 'Block pingback & trackback amplification attacks', $settings, true);
                break;
            case 'php_files':
                $this->checkbox_setting('scan_dangerous_funcs', 'Scan and alert on dangerous functions (eval, exec, passthru)', $settings, true);
                $this->text_setting('custom_funcs', 'Additional Dangerous Functions (comma-separated)', $settings, '');
                break;
            case 'file_perms':
                $this->checkbox_setting('auto_fix', 'Automatically correct file permissions (644 files / 755 dirs)', $settings, true);
                break;
            case 'security_headers':
                $this->checkbox_setting('hsts', 'Enable HSTS (Strict-Transport-Security)', $settings, true);
                echo '<div class="war-field-row"><label class="war-field-label">HSTS Max Age</label><select name="hsts_max_age" class="war-select">';
                $hsts_ages = [
                    '31536000' => '1 Year (31536000s - Recommended)',
                    '63072000' => '2 Years (63072000s)',
                    '15768000' => '6 Months (15768000s)'
                ];
                $hsts_cur = $settings['hsts_max_age'] ?? '31536000';
                foreach ($hsts_ages as $v => $l) {
                    echo '<option value="' . esc_attr($v) . '" ' . selected($hsts_cur, $v, false) . '>' . esc_html($l) . '</option>';
                }
                echo '</select></div>';
                $this->checkbox_setting('hsts_subdomains', 'HSTS Include Subdomains (includeSubDomains)', $settings, true);
                $this->checkbox_setting('hsts_preload', 'HSTS Preload Header (Preload List Ready)', $settings, false);

                echo '<div class="war-field-row"><label class="war-field-label">X-Frame-Options (Clickjacking Protection)</label><select name="x_frame_options" class="war-select">';
                $xframe_opts = ['SAMEORIGIN' => 'SAMEORIGIN (Recommended)', 'DENY' => 'DENY', 'off' => 'Disabled'];
                $xframe_cur = $settings['x_frame_options'] ?? 'SAMEORIGIN';
                foreach ($xframe_opts as $v => $l) {
                    echo '<option value="' . esc_attr($v) . '" ' . selected($xframe_cur, $v, false) . '>' . esc_html($l) . '</option>';
                }
                echo '</select></div>';

                $this->checkbox_setting('x_content_type_options', 'X-Content-Type-Options: nosniff (MIME-type sniffing defense)', $settings, true);
                $this->text_setting('csp', 'Content-Security-Policy (CSP)', $settings, "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;");

                echo '<div class="war-field-row"><label class="war-field-label">Referrer-Policy</label><select name="referrer_policy" class="war-select">';
                $ref_opts = [
                    'strict-origin-when-cross-origin' => 'strict-origin-when-cross-origin (Recommended)',
                    'no-referrer' => 'no-referrer',
                    'same-origin' => 'same-origin',
                    'strict-origin' => 'strict-origin'
                ];
                $ref_cur = $settings['referrer_policy'] ?? 'strict-origin-when-cross-origin';
                foreach ($ref_opts as $v => $l) {
                    echo '<option value="' . esc_attr($v) . '" ' . selected($ref_cur, $v, false) . '>' . esc_html($l) . '</option>';
                }
                echo '</select></div>';

                $this->text_setting('permissions_policy', 'Permissions-Policy', $settings, "geolocation=(), microphone=(), camera=(), payment=()");
                break;
            case 'user_accounts':
                $this->checkbox_setting('detect_fake_admins', 'Detect fake or unauthorized administrator accounts', $settings, true);
                $this->checkbox_setting('enforce_strong_passwords', 'Enforce strong password complexity rules', $settings, true);
                $this->checkbox_setting('track_logins', 'Track and audit user login sessions', $settings, true);
                break;
            case 'backup':
                $this->checkbox_setting('detect_backups', 'Detect publicly exposed backup archives (.sql, .zip, .tar.gz)', $settings, true);
                $this->checkbox_setting('protect_backup_folder', 'Automatically secure backup storage directories', $settings, true);
                break;
            case 'plugin_theme':
                $this->checkbox_setting('detect_modifications', 'Detect unauthorized plugin and theme file modifications', $settings, true);
                $this->checkbox_setting('block_unauthorized_install', 'Block unauthorized plugin and theme installations', $settings, false);
                break;
            case 'directory_browsing':
                $this->checkbox_setting('backup', 'Backup server configuration before rule injection', $settings, true);
                $this->checkbox_setting('disable_index_html', 'Generate index.php file guards in empty directories', $settings, true);
                break;
            case 'version_hiding':
                $this->checkbox_setting('hide_wp_version', 'Remove WordPress version tags from HTML head and feeds', $settings, true);
                $this->checkbox_setting('remove_readme', 'Hide and restrict direct access to readme.html', $settings, true);
                break;
        }
        echo '</div>'; // .war-harden-fields
        echo '<div class="war-harden-card-footer">';
        echo '<button type="button" class="war-btn-apply war-harden-apply-btn"><span class="dashicons dashicons-saved"></span> Save &amp; Apply Rule</button>';
        echo '</div>';
    }

    private function checkbox_setting($name, $label, $settings, $default = false) {
        $checked = isset($settings[$name]) ? $settings[$name] : $default;
        echo '<label class="war-checkbox-row">';
        echo '<input type="checkbox" name="' . esc_attr($name) . '" ' . checked($checked, true, false) . ' class="war-custom-checkbox">';
        echo '<span class="war-checkbox-text">' . esc_html($label) . '</span>';
        echo '</label>';
    }

    private function text_setting($name, $label, $settings, $default = '') {
        $value = $settings[$name] ?? $default;
        echo '<div class="war-field-row">';
        echo '<label class="war-field-label">' . esc_html($label) . '</label>';
        echo '<input type="text" name="' . esc_attr($name) . '" value="' . esc_attr(is_array($value) ? '' : $value) . '" placeholder="' . esc_attr($default) . '" class="war-input">';
        echo '</div>';
    }
}
