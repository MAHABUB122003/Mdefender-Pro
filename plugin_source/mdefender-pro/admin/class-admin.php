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
