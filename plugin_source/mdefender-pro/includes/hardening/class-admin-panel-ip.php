<?php
defined('ABSPATH') || exit;

/**
 * MDefender Pro - Enterprise Admin Panel & Login Gateway IP Restriction
 *
 * Restricts access to /wp-admin, /wp-login.php, and custom secret login gateways
 * strictly to authorized/whitelisted IP addresses and CIDR subnets.
 * Implements anti-spoofing defense and authentic 403 Forbidden termination.
 *
 * @package MDefender-Pro
 */
class WAF_FW_Admin_Panel_IP {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        // Run as early as possible before any admin or authentication logic executes
        add_action('plugins_loaded', [$this, 'check_admin_access'], 1);
        add_action('login_init', [$this, 'check_admin_access'], 1);
        add_action('init', [$this, 'check_admin_access'], 1);
        add_filter('authenticate', [$this, 'filter_authenticate_by_ip'], 1, 3);
    }

    public function is_enabled() {
        // Check if plugin is connected or has active settings
        $enabled = get_option('waf_harden_admin_ip_enabled', 'disabled');
        return ($enabled === 'enabled' || $enabled === 'yes' || $enabled === '1' || $enabled === true);
    }

    public function get_whitelist() {
        $ips = get_option('waf_harden_admin_whitelist', '');
        if (empty($ips)) return [];
        if (is_array($ips)) {
            $raw_list = $ips;
        } else {
            $raw_list = preg_split('/[\r\n,]+/', (string)$ips);
        }
        $cleaned = [];
        foreach ($raw_list as $entry) {
            $entry = trim((string)$entry);
            if (!empty($entry) && !in_array($entry, $cleaned, true)) {
                $cleaned[] = $entry;
            }
        }
        return $cleaned;
    }

    public function get_blocked_countries() {
        $codes = get_option('waf_harden_admin_blocked_countries', '');
        if (empty($codes)) return [];
        if (is_array($codes)) {
            return array_map('strtoupper', array_map('trim', $codes));
        }
        return array_filter(array_map('strtoupper', array_map('trim', explode(',', (string)$codes))));
    }

    /**
     * Inspect incoming request for any attempt to access wp-admin, wp-login, or secret gateway
     */
    public function check_admin_access() {
        if (!$this->is_enabled()) {
            return;
        }

        // Emergency admin bypass token (configured in wp-config or via safe rescue)
        if (isset($_GET['mdefender_bypass']) && defined('MDEFENDER_RESCUE_KEY') && !empty($_GET['mdefender_bypass'])) {
            if (hash_equals(MDEFENDER_RESCUE_KEY, (string)$_GET['mdefender_bypass'])) {
                return;
            }
        }

        // Determine if current request targets WordPress admin, login, or secret gateway
        if (!$this->is_admin_or_login_request()) {
            return;
        }

        // Exemption for public front-end AJAX actions (e.g. comments, public search, woocommerce cart)
        if (defined('DOING_AJAX') && DOING_AJAX) {
            $action = sanitize_key($_REQUEST['action'] ?? '');
            // Only allow non-administrative public actions
            if ($this->is_public_ajax_action($action)) {
                return;
            }
        }

        // Exemption for WP Cron
        if (defined('DOING_CRON') && DOING_CRON) {
            return;
        }

        $whitelist = $this->get_whitelist();
        // If enabled but whitelist is empty, avoid accidental lockout
        if (empty($whitelist)) {
            return;
        }

        $user_ip = $this->get_user_ip();

        // Check if user's IP matches any allowed whitelist entry
        $is_allowed = false;
        foreach ($whitelist as $allowed_entry) {
            if ($this->ip_matches($user_ip, $allowed_entry)) {
                $is_allowed = true;
                break;
            }
        }

        if (!$is_allowed) {
            $this->deny_access('Unauthorized administrative IP address');
        }

        // Also verify Geo-restriction if configured
        $blocked_countries = $this->get_blocked_countries();
        if (!empty($blocked_countries)) {
            $country = $this->get_ip_country($user_ip);
            if ($country && in_array(strtoupper($country), $blocked_countries, true)) {
                $this->deny_access('Administrative access restricted from your geographic location');
            }
        }
    }

    /**
     * Stop authentication attempts at filter level if IP is not whitelisted
     */
    public function filter_authenticate_by_ip($user, $username = '', $password = '') {
        if (!$this->is_enabled()) {
            return $user;
        }

        $whitelist = $this->get_whitelist();
        if (empty($whitelist)) {
            return $user;
        }

        $user_ip = $this->get_user_ip();
        foreach ($whitelist as $allowed_entry) {
            if ($this->ip_matches($user_ip, $allowed_entry)) {
                return $user;
            }
        }

        $this->deny_access('Unauthorized administrative authentication attempt');
        return new WP_Error('mdefender_admin_ip_blocked', 'Access denied.');
    }

    /**
     * Deep detection of admin or login request paths
     */
    private function is_admin_or_login_request() {
        // 1. Direct WordPress admin detection
        if (is_admin() || (defined('WP_ADMIN') && WP_ADMIN)) {
            return true;
        }

        // 2. Normalized script and URI checks
        $script_name = strtolower($_SERVER['SCRIPT_NAME'] ?? '');
        $script_file = strtolower($_SERVER['SCRIPT_FILENAME'] ?? '');
        $php_self = strtolower($_SERVER['PHP_SELF'] ?? '');
        $req_uri = strtolower(rawurldecode($_SERVER['REQUEST_URI'] ?? ''));

        // Check wp-login.php
        if (
            strpos($script_name, 'wp-login.php') !== false ||
            strpos($script_file, 'wp-login.php') !== false ||
            strpos($php_self, 'wp-login.php') !== false ||
            preg_match('#/(?:wp-login\.php|wp-admin)(?:/|\?|$)#i', $req_uri)
        ) {
            return true;
        }

        // 3. Custom Secret Login Slug
        $custom_slug = trim(strtolower(get_option('waf_harden_login_rename', '')));
        if (!empty($custom_slug)) {
            $path = trim(parse_url($req_uri, PHP_URL_PATH) ?? '', '/');
            if ($path === $custom_slug || strpos($path, $custom_slug . '/') === 0) {
                return true;
            }
        }

        // 4. Protect XML-RPC if used for authentication
        if (strpos($script_name, 'xmlrpc.php') !== false || preg_match('#/xmlrpc\.php(?:/|\?|$)#i', $req_uri)) {
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine if an AJAX action is public or administrative
     */
    private function is_public_ajax_action($action) {
        if (empty($action)) return false;
        $public_prefixes = ['wc_', 'woocommerce_', 'mailchimp_', 'elementor_ajax', 'heartbeat', 'fetch_'];
        foreach ($public_prefixes as $p) {
            if (strpos($action, $p) === 0) return true;
        }
        return false;
    }

    /**
     * Anti-Spoofing IP Resolution
     */
    public function get_user_ip() {
        // If WAF Engine exists, use its battle-tested anti-spoofing client IP resolver
        if (class_exists('WAF_FW_Engine')) {
            $engine = WAF_FW_Engine::instance();
            if (method_exists($engine, 'get_client_ip')) {
                $waf_ip = $engine->get_client_ip();
                if (!empty($waf_ip) && filter_var($waf_ip, FILTER_VALIDATE_IP)) {
                    return $waf_ip;
                }
            }
        }

        // Fallback: Check trusted headers only when behind Cloudflare or trusted reverse proxies
        $trusted_proxies = ['127.0.0.1', '::1'];
        $remote_addr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $cf_ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
            if (filter_var($cf_ip, FILTER_VALIDATE_IP)) {
                return $cf_ip;
            }
        }

        if (in_array($remote_addr, $trusted_proxies, true)) {
            if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
                $rip = trim($_SERVER['HTTP_X_REAL_IP']);
                if (filter_var($rip, FILTER_VALIDATE_IP)) {
                    return $rip;
                }
            }
            if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
                $fip = trim($parts[0]);
                if (filter_var($fip, FILTER_VALIDATE_IP)) {
                    return $fip;
                }
            }
        }

        return $remote_addr;
    }

    /**
     * Deny access with authentic Nginx 403 Forbidden screen
     */
    private function deny_access($message = 'Access denied.') {
        if (!headers_sent()) {
            if (function_exists('http_response_code')) {
                http_response_code(403);
            }
            header('HTTP/1.1 403 Forbidden', true, 403);
            header('Status: 403 Forbidden');
            header('Content-Type: text/html; charset=UTF-8');
            header('Server: nginx');
            header('Connection: close');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('X-Protected-By: MDefender-Pro');
        }

        if (file_exists(WAF_FW_PLUGIN_DIR . 'ip-blacklist-template.php')) {
            include WAF_FW_PLUGIN_DIR . 'ip-blacklist-template.php';
            exit;
        }

        echo "<html>\n<head><title>403 Forbidden</title></head>\n<body>\n<center><h1>403 Forbidden</h1></center>\n<hr><center>nginx</center>\n</body>\n</html>";
        exit;
    }

    /**
     * Robust IP and CIDR Pattern Matcher
     */
    public function ip_matches($ip, $pattern) {
        $ip = trim((string)$ip);
        $pattern = trim((string)$pattern);
        if ($ip === '' || $pattern === '') return false;
        if ($ip === $pattern) return true;

        // CIDR subnet check (e.g. 192.168.1.0/24)
        if (strpos($pattern, '/') !== false) {
            return $this->ip_in_cidr($ip, $pattern);
        }

        // Wildcard check (e.g. 192.168.1.*)
        if (strpos($pattern, '*') !== false) {
            $escaped = preg_quote($pattern, '/');
            $regex = '/^' . str_replace('\\*', '\\d+', $escaped) . '$/';
            return (bool) preg_match($regex, $ip);
        }

        return false;
    }

    private function ip_in_cidr($ip, $cidr) {
        $parts = explode('/', $cidr);
        if (count($parts) !== 2) return false;
        $net = $parts[0];
        $mask = (int) $parts[1];

        // IPv4 CIDR
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && filter_var($net, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            if ($mask < 0 || $mask > 32) return false;
            $ip_long = ip2long($ip);
            $net_long = ip2long($net);
            if ($ip_long === false || $net_long === false) return false;
            $wildcard = $mask === 0 ? 0 : (~((1 << (32 - $mask)) - 1));
            return ($ip_long & $wildcard) === ($net_long & $wildcard);
        }

        // IPv6 CIDR
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) && filter_var($net, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            if ($mask < 0 || $mask > 128) return false;
            $ip_bin = inet_pton($ip);
            $net_bin = inet_pton($net);
            if ($ip_bin === false || $net_bin === false) return false;
            $bytes = (int)($mask / 8);
            $bits = $mask % 8;
            if (substr($ip_bin, 0, $bytes) !== substr($net_bin, 0, $bytes)) {
                return false;
            }
            if ($bits > 0) {
                $mask_byte = chr((0xFF << (8 - $bits)) & 0xFF);
                return (ord($ip_bin[$bytes]) & ord($mask_byte)) === (ord($net_bin[$bytes]) & ord($mask_byte));
            }
            return true;
        }

        return false;
    }

    public function save_settings($settings) {
        $enabled = !empty($settings['enabled']);
        update_option('waf_harden_admin_ip_enabled', $enabled ? 'enabled' : 'disabled');
        if (isset($settings['whitelist'])) {
            $wl_val = is_array($settings['whitelist']) ? implode("\n", array_map('trim', $settings['whitelist'])) : trim((string)$settings['whitelist']);
            update_option('waf_harden_admin_whitelist', sanitize_textarea_field($wl_val));
        }
        if (isset($settings['blocked_countries'])) {
            $bc_val = is_array($settings['blocked_countries']) ? implode(',', array_map('trim', $settings['blocked_countries'])) : trim((string)$settings['blocked_countries']);
            update_option('waf_harden_admin_blocked_countries', sanitize_text_field($bc_val));
        }
        return ['success' => true, 'enabled' => $enabled];
    }

    public function get_settings() {
        return [
            'enabled' => $this->is_enabled(),
            'whitelist' => $this->get_whitelist(),
            'blocked_countries' => $this->get_blocked_countries(),
        ];
    }

    private function get_ip_country($ip) {
        if (class_exists('WAF_FW_Engine')) {
            $engine = WAF_FW_Engine::instance();
            if (method_exists($engine, 'get_ip_country')) {
                return $engine->get_ip_country($ip);
            }
        }
        if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
            return strtoupper(substr(trim($_SERVER['HTTP_CF_IPCOUNTRY']), 0, 2));
        }
        return '';
    }
}
