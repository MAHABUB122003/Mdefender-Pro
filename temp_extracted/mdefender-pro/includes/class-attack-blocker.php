<?php
defined('ABSPATH') || exit;

class WAF_FW_Attack_Blocker {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function track_attack($ip) {
        $enabled = get_option('waf_fw_attack_blocker_enabled', 'yes');
        if ($enabled !== 'yes') return;

        $this->increment_attempts($ip);
        $this->auto_block_if_needed($ip);
    }

    public function get_attempts($ip) {
        $key = 'waf_attack_cnt_' . md5($ip);
        $data = get_transient($key);
        if (!$data) return 0;
        $data = json_decode($data, true);
        $window = (int) get_option('waf_fw_attack_window', 86400);
        $cutoff = time() - $window;
        $data = array_values(array_filter($data, function($t) use ($cutoff) {
            return $t > $cutoff;
        }));
        set_transient($key, json_encode($data), $window);
        return count($data);
    }

    public function increment_attempts($ip) {
        $key = 'waf_attack_cnt_' . md5($ip);
        $window = (int) get_option('waf_fw_attack_window', 86400);
        $cutoff = time() - $window;
        $data = get_transient($key);
        if ($data) {
            $data = json_decode($data, true);
            $data = array_values(array_filter($data, function($t) use ($cutoff) {
                return $t > $cutoff;
            }));
        } else {
            $data = [];
        }
        $data[] = time();
        set_transient($key, json_encode($data), $window);
    }

    public function auto_block_if_needed($ip) {
        $attempts = $this->get_attempts($ip);
        $threshold = (int) get_option('waf_fw_attack_threshold', 20);

        if ($attempts >= $threshold && !$this->is_already_blocked_for_attacks($ip)) {
            $duration = (int) get_option('waf_fw_attack_block_duration', 86400);
            $reason = sprintf(
                'Auto-blocked after %d attack payload attempts in %s',
                $threshold,
                $this->format_window((int) get_option('waf_fw_attack_window', 86400))
            );
            WAF_FW_IP_Filter::instance()->add_temporary_block($ip, $reason, $duration);
        }
    }

    private function is_already_blocked_for_attacks($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $row = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE ip = %s AND reason LIKE 'Auto-blocked after % attack payload attempts%' AND (block_expires_at IS NULL OR block_expires_at > NOW())",
            $ip
        ));
        return intval($row) > 0;
    }

    public function clear_attempts($ip) {
        $key = 'waf_attack_cnt_' . md5($ip);
        delete_transient($key);
    }

    public function get_blocked_count() {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM $table WHERE reason LIKE 'Auto-blocked after % attack payload attempts%' AND (block_expires_at IS NULL OR block_expires_at > NOW())"
        );
    }

    public function get_total_attempts_in_window() {
        global $wpdb;
        $prefix = 'waf_attack_cnt_';
        $sum = 0;
        foreach (wp_load_alloptions() as $key => $value) {
            if (strpos($key, '_transient_' . $prefix) !== false || strpos($key, '_transient_timeout_' . $prefix) !== false) {
                continue;
            }
        }
        return 0;
    }

    private function format_window($seconds) {
        if ($seconds >= 86400) return round($seconds / 86400, 1) . ' day(s)';
        if ($seconds >= 3600) return round($seconds / 3600, 1) . ' hour(s)';
        return round($seconds / 60, 1) . ' min(s)';
    }
}
