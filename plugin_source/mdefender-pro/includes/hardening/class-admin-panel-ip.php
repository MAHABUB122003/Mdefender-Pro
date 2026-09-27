<?php
defined('ABSPATH') || exit;

class WAF_FW_Admin_Panel_IP {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        add_action('init', [$this, 'check_admin_access'], 1);
    }

    public function is_enabled() {
        return get_option('waf_harden_admin_ip_enabled', 'disabled') === 'enabled';
    }

    public function get_whitelist() {
        $ips = get_option('waf_harden_admin_whitelist', '');
        if (empty($ips)) return [];
        $list = array_map('trim', explode("\n", $ips));
        $list = array_map(function($ip) {
            return trim(str_replace(["\r", ' '], '', $ip));
        }, $list);
        return array_filter($list);
    }

    public function get_blocked_countries() {
        $codes = get_option('waf_harden_admin_blocked_countries', '');
        if (empty($codes)) return [];
        return array_map('trim', explode(',', $codes));
    }

    public function check_admin_access() {
        if (! $this->is_enabled()) return;
        if (defined('DOING_AJAX') && DOING_AJAX) return;
        if (defined('DOING_CRON') && DOING_CRON) return;
        if (! is_admin() && ! (defined('WP_ADMIN') && WP_ADMIN)) return;

        $user_ip = $this->get_user_ip();
        $whitelist = $this->get_whitelist();

        if (! empty($whitelist)) {
            $allowed = false;
            foreach ($whitelist as $allowed_ip) {
                if ($this->ip_matches($user_ip, $allowed_ip)) {
                    $allowed = true;
                    break;
                }
            }
            if (! $allowed) {
                $blocked_countries = $this->get_blocked_countries();
                if (! empty($blocked_countries)) {
                    $country = $this->get_ip_country($user_ip);
                    if (in_array($country, $blocked_countries)) {
                        $this->deny_access('Your country is blocked from accessing the admin panel.');
                    }
                }
                if (empty($blocked_countries)) {
                    $this->deny_access('Your IP is not whitelisted for admin access.');
                }
            }
        }
    }

    public function save_settings($settings) {
        $enabled = ! empty($settings['enabled']);
        update_option('waf_harden_admin_ip_enabled', $enabled ? 'enabled' : 'disabled');
        if (isset($settings['whitelist'])) {
            update_option('waf_harden_admin_whitelist', sanitize_textarea_field($settings['whitelist']));
        }
        if (isset($settings['blocked_countries'])) {
            update_option('waf_harden_admin_blocked_countries', sanitize_text_field($settings['blocked_countries']));
        }
        return ['success' => true, 'enabled' => $enabled];
    }

    public function get_settings() {
        return [
            'enabled' => $this->is_enabled(),
            'whitelist' => get_option('waf_harden_admin_whitelist', ''),
            'blocked_countries' => get_option('waf_harden_admin_blocked_countries', ''),
        ];
    }

    private function deny_access($message = 'Access denied.') {
        status_header(403);
        wp_die(
            '<h1>403 Forbidden</h1><p>' . esc_html($message) . '</p>',
            'Forbidden',
            ['response' => 403]
        );
    }

    private function get_user_ip() {
        if (! empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        if (! empty($_SERVER['HTTP_X_REAL_IP'])) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }
        if (! empty($_SERVER['REMOTE_ADDR'])) {
            return $_SERVER['REMOTE_ADDR'];
        }
        return '0.0.0.0';
    }

    private function ip_matches($ip, $pattern) {
        $ip = trim($ip);
        $pattern = trim($pattern);
        if ($ip === $pattern) return true;
        if (strpos($pattern, '*') !== false) {
            $pattern_regex = '/^' . str_replace(['.', '*'], ['\.', '\d+'], preg_quote($pattern, '/')) . '$/';
            return (bool) preg_match($pattern_regex, $ip);
        }
        if (strpos($pattern, '/') !== false) {
            return $this->ip_in_cidr($ip, $pattern);
        }
        return false;
    }

    private function ip_in_cidr($ip, $cidr) {
        $parts = explode('/', $cidr);
        $net = $parts[0];
        $mask = (int) ($parts[1] ?? 32);
        $ip_long = ip2long($ip);
        $net_long = ip2long($net);
        if ($ip_long === false || $net_long === false) return false;
        $wildcard = ~ (pow(2, (32 - $mask)) - 1);
        return ($ip_long & $wildcard) === ($net_long & $wildcard);
    }

    private function get_ip_country($ip) {
        $cached = get_transient('waf_ip_country_' . md5($ip));
        if ($cached) return $cached;
        $response = wp_remote_get("http://ip-api.com/json/{$ip}?fields=countryCode", ['timeout' => 3]);
        if (is_wp_error($response)) return '';
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = $body['countryCode'] ?? '';
        if (!empty($code)) {
            set_transient('waf_ip_country_' . md5($ip), $code, DAY_IN_SECONDS);
        }
        return $code;
    }
}
