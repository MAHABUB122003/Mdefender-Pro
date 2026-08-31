<?php
defined('ABSPATH') || exit;

class WAF_FW_IP_Filter {
    private static $_instance = null;
    private $whitelist = ['127.0.0.1', '::1', 'localhost'];

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function is_blacklisted($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE ip = %s",
            $ip
        ));
        if ($result) {
            if (!empty($result->block_expires_at) && strtotime($result->block_expires_at) <= current_time('timestamp')) {
                $wpdb->delete($table, ['ip' => $ip]);
            } else {
                return true;
            }
        }

        // Check local WAF blacklist cache synced from MDefender Cloud dashboard
        $cloud_blacklist = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cloud_blacklist) && in_array($ip, $cloud_blacklist, true)) {
            return true;
        }

        return false;
    }

    public function is_blacklisted_raw($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $result = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE ip = %s",
            $ip
        ));
        return intval($result) > 0;
    }

    public function is_whitelisted($ip) {
        return in_array($ip, $this->whitelist, true);
    }

    public function add_to_blacklist($ip, $reason = 'Auto-blocked by rate limiter', $type = 'temporary', $auto = true, $expires_at = null) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE ip = %s", $ip));
        if ($exists) {
            $update = [];
            if ($expires_at) $update['block_expires_at'] = $expires_at;
            if (!empty($update)) {
                $wpdb->update($table, $update, ['ip' => $ip]);
            }
            return;
        }
        $data = [
            'ip' => $ip,
            'reason' => $reason,
            'type' => $type,
            'auto_blocked' => $auto ? 1 : 0,
            'blocked_at' => current_time('mysql'),
        ];
        if ($expires_at) $data['block_expires_at'] = $expires_at;
        $wpdb->insert($table, $data);
    }

    public function add_temporary_block($ip, $reason, $duration_seconds) {
        $expires_at = date('Y-m-d H:i:s', current_time('timestamp') + $duration_seconds);
        $this->add_to_blacklist($ip, $reason, 'temporary', true, $expires_at);
    }

    public function remove_from_blacklist($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $wpdb->delete($table, ['ip' => $ip]);
    }

    public function get_blacklist() {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        return $wpdb->get_results("SELECT * FROM $table ORDER BY blocked_at DESC");
    }

    public function cleanup_expired_blocks() {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $wpdb->query(
            "DELETE FROM $table WHERE block_expires_at IS NOT NULL AND block_expires_at <= NOW()"
        );
    }
}
