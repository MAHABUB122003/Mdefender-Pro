<?php
defined('ABSPATH') || exit;

class WAF_FW_Rate_Limiter {
    private static $_instance = null;
    private $window_seconds = 60;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function is_ddos_enabled() {
        return get_option('waf_fw_ddos_protection', 'yes') === 'yes';
    }

    public function get_max_requests() {
        return max(5, (int) get_option('waf_fw_rate_limit', 120));
    }

    /**
     * Check if the incoming IP is performing a volumetric DDoS burst flood.
     * Burst Window: 5 seconds. Burst Limit: 25 requests.
     */
    public function is_ddos_flooding($ip) {
        if (empty($ip) || !$this->is_ddos_enabled()) {
            return false;
        }

        // Local loopback and private networks never burst flood (< 0.0001ms)
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost' || $ip === '0.0.0.0' ||
            strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || strpos($ip, '172.16.') === 0) {
            return false;
        }

        $burst_limit = 25; // 25 requests in 5 seconds
        $slice = floor(time() / 5);
        $key = 'waf_burst_' . md5($ip . '_' . $slice);

        if (function_exists('apcu_inc')) {
            $count = apcu_inc($key, 1, $success, 10);
            if ($count >= $burst_limit) {
                if (class_exists('WAF_FW_IP_Filter')) {
                    WAF_FW_IP_Filter::instance()->add_temporary_block($ip, 'Anti-DDoS Shield: Volumetric burst flood detected (' . $count . ' reqs/5s)', 7200);
                }
                return true;
            }
            return false;
        }

        $count = (int) get_transient($key);
        if ($count >= $burst_limit) {
            if (class_exists('WAF_FW_IP_Filter')) {
                WAF_FW_IP_Filter::instance()->add_temporary_block($ip, 'Anti-DDoS Shield: Volumetric burst flood detected (' . $count . ' reqs/5s)', 7200);
            }
            return true;
        }
        set_transient($key, $count + 1, 10);

        return false;
    }

    public function is_rate_limited($ip, $custom_max = null) {
        if (empty($ip)) return false;
        if (get_option('waf_fw_rate_limit_enabled', 'yes') === 'no') {
            return false;
        }

        // Local loopback and private networks are never rate limited (< 0.0001ms)
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost' || $ip === '0.0.0.0' ||
            strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || strpos($ip, '172.16.') === 0) {
            return false;
        }

        // 2. Standard WordPress Transient fallback
        $data = get_transient($key);
        if (!$data) {
            return false;
        }
        $data = json_decode($data, true);
        if (!is_array($data)) {
            return false;
        }
        $now = time();
        $window_start = $now - $this->window_seconds;
        $data = array_values(array_filter($data, function($t) use ($window_start) {
            return $t > $window_start;
        }));
        if (count($data) >= $max_requests) {
            set_transient($key, json_encode($data), $this->window_seconds);
            if (class_exists('WAF_FW_IP_Filter')) {
                WAF_FW_IP_Filter::instance()->add_temporary_block($ip, 'Rate limit exceeded (' . $max_requests . ' req/min)', 3600);
            }
            return true;
        }
        return false;
    }

    public function increment($ip) {
        if (empty($ip)) return;
        $key = 'waf_fw_rate_' . md5($ip);
        $now = time();

        // 1. In-memory APCu fast path (0 MySQL queries)
        if (function_exists('apcu_fetch')) {
            $data = apcu_fetch($key);
            if (!is_array($data)) $data = [];
            $window_start = $now - $this->window_seconds;
            $data = array_values(array_filter($data, function($t) use ($window_start) {
                return $t > $window_start;
            }));
            $data[] = $now;
            apcu_store($key, $data, $this->window_seconds);
            return;
        }

        // 2. Transient fallback
        $data = get_transient($key);
        if (!$data) {
            $data = [];
        } else {
            $data = json_decode($data, true);
            if (!is_array($data)) $data = [];
        }
        $window_start = $now - $this->window_seconds;
        $data = array_values(array_filter($data, function($t) use ($window_start) {
            return $t > $window_start;
        }));
        $data[] = $now;
        set_transient($key, json_encode($data), $this->window_seconds);
    }
}

