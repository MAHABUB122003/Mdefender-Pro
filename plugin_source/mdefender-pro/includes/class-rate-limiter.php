<?php
defined('ABSPATH') || exit;

class WAF_FW_Rate_Limiter {
    private static $_instance = null;
    private $max_requests;
    private $window_seconds = 60;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->max_requests = (int) get_option('waf_fw_rate_limit', 100);
    }

    public function is_rate_limited($ip) {
        $key = 'waf_fw_rate_' . md5($ip);
        $data = get_transient($key);
        if (!$data) {
            return false;
        }
        $data = json_decode($data, true);
        $now = time();
        $window_start = $now - $this->window_seconds;
        $data = array_values(array_filter($data, function($t) use ($window_start) {
            return $t > $window_start;
        }));
        if (count($data) >= $this->max_requests) {
            set_transient($key, json_encode($data), $this->window_seconds);
            return true;
        }
        $data[] = $now;
        set_transient($key, json_encode($data), $this->window_seconds);
        return false;
    }

    public function increment($ip) {
        $key = 'waf_fw_rate_' . md5($ip);
        $data = get_transient($key);
        if (!$data) {
            $data = [];
        } else {
            $data = json_decode($data, true);
        }
        $now = time();
        $window_start = $now - $this->window_seconds;
        $data = array_values(array_filter($data, function($t) use ($window_start) {
            return $t > $window_start;
        }));
        $data[] = $now;
        set_transient($key, json_encode($data), $this->window_seconds);
    }
}
