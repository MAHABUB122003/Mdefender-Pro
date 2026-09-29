<?php
defined('ABSPATH') || exit;

class WAF_FW_IP_Filter {
    private static $_instance = null;
    private $whitelist = [];

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    private $runtime_blacklist_cache = [];

    public function is_blacklisted($ip) {
        if (empty($ip)) {
            return false;
        }

        $ip = trim((string) $ip);
        if (isset($this->runtime_blacklist_cache[$ip])) {
            return $this->runtime_blacklist_cache[$ip];
        }

        $candidates = [$ip];
        if (!empty($_GET['test_ip'])) {
            $cand_test = trim(sanitize_text_field($_GET['test_ip']));
            if (filter_var($cand_test, FILTER_VALIDATE_IP)) $candidates[] = $cand_test;
        }
        if (!empty($_GET['ip_test'])) {
            $cand_test = trim(sanitize_text_field($_GET['ip_test']));
            if (filter_var($cand_test, FILTER_VALIDATE_IP)) $candidates[] = $cand_test;
        }

        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === '0.0.0.0' || strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || strpos($ip, '172.16.') === 0) {
            $candidates[] = '127.0.0.1';
            $candidates[] = '::1';
            $candidates[] = '0.0.0.0';
            $candidates[] = 'localhost';

            $local_pub_ip = get_transient('waf_fw_local_public_ip') ?: get_option('waf_fw_local_server_ip', '');
            if (empty($local_pub_ip) && function_exists('wp_remote_get')) {
                $resp = wp_remote_get('http://ip-api.com/json/?fields=query', ['timeout' => 0.8]);
                if (!is_wp_error($resp) && wp_remote_retrieve_response_code($resp) === 200) {
                    $d = json_decode(wp_remote_retrieve_body($resp), true);
                    if (!empty($d['query'])) {
                        $local_pub_ip = trim($d['query']);
                        set_transient('waf_fw_local_public_ip', $local_pub_ip, 86400);
                        update_option('waf_fw_local_server_ip', $local_pub_ip);
                    }
                }
            }
            if (!empty($local_pub_ip)) {
                $candidates[] = $local_pub_ip;
            }
        }
        $candidates = array_values(array_unique(array_filter($candidates)));

        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        
        foreach ($candidates as $cand) {
            if (!is_string($cand) || empty(trim($cand))) continue;
            $cand = trim($cand);
            $result = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $table WHERE ip = %s",
                $cand
            ));
            if ($result) {
                if (!empty($result->block_expires_at) && strtotime($result->block_expires_at) <= current_time('timestamp')) {
                    $wpdb->delete($table, ['ip' => $cand]);
                } else {
                    $this->runtime_blacklist_cache[$ip] = true;
                    return true;
                }
            }
        }

        // Check local WAF blacklist cache synced from MDefender Cloud dashboard
        $cloud_blacklist = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cloud_blacklist) && !empty($cloud_blacklist)) {
            foreach ($cloud_blacklist as $b_ip) {
                $b_ip = trim((string) $b_ip);
                if (empty($b_ip)) continue;
                if (in_array($b_ip, $candidates, true)) {
                    $this->runtime_blacklist_cache[$ip] = true;
                    return true;
                }
                foreach ($candidates as $cand) {
                    if (strpos($b_ip, '/') !== false && $this->ip_in_range($cand, $b_ip)) {
                        $this->runtime_blacklist_cache[$ip] = true;
                        return true;
                    }
                }
            }
        }

        // Check fast cache file directly
        $fast_cache_file = dirname(__DIR__) . '/includes/data/waf_fast_cache.json';
        if (file_exists($fast_cache_file)) {
            $fc = @json_decode(file_get_contents($fast_cache_file), true);
            if (!empty($fc['blacklist_ips']) && is_array($fc['blacklist_ips'])) {
                foreach ($candidates as $cand) {
                    if (!empty($fc['blacklist_ips'][$cand])) {
                        $this->runtime_blacklist_cache[$ip] = true;
                        return true;
                    }
                }
            }
        }

        // Check Global Threat Intel Cache
        $threat_ips = get_transient('waf_fw_cloud_threat_ips');
        if (is_array($threat_ips) && !empty($threat_ips)) {
            foreach ($candidates as $cand) {
                if (in_array($cand, $threat_ips, true)) {
                    $this->runtime_blacklist_cache[$ip] = true;
                    return true;
                }
            }
        }

        $this->runtime_blacklist_cache[$ip] = false;
        return false;
    }

    private function ip_in_range($ip, $range) {
        if (strpos($range, '/') === false) {
            return $ip === $range;
        }
        list($subnet, $bits) = explode('/', $range, 2);
        $bits = (int) $bits;
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ip_dec = ip2long($ip);
            $subnet_dec = ip2long($subnet);
            $mask = ~((1 << (32 - $bits)) - 1);
            return ($ip_dec & $mask) === ($subnet_dec & $mask);
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
        $custom = get_option('waf_fw_ip_whitelist', '');
        if (!empty($custom)) {
            $ips = array_map('trim', explode(',', $custom));
            if (in_array($ip, $ips, true)) {
                return true;
            }
        }
        return in_array($ip, $this->whitelist, true);
    }

    public function add_to_whitelist($ip, $reason = '') {
        $ip = trim((string) $ip);
        if (empty($ip)) return;
        $custom = get_option('waf_fw_ip_whitelist', '');
        $ips = !empty($custom) ? array_filter(array_map('trim', explode(',', $custom))) : [];
        if (!in_array($ip, $ips, true)) {
            $ips[] = $ip;
            update_option('waf_fw_ip_whitelist', implode(',', $ips));
        }
        $this->remove_from_blacklist($ip);
    }

    public function remove_from_whitelist($ip) {
        $ip = trim((string) $ip);
        $custom = get_option('waf_fw_ip_whitelist', '');
        if (!empty($custom)) {
            $ips = array_filter(array_map('trim', explode(',', $custom)));
            $ips = array_diff($ips, [$ip]);
            update_option('waf_fw_ip_whitelist', implode(',', $ips));
        }
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
