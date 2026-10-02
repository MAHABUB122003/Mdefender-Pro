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
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $cf_ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
            if (filter_var($cf_ip, FILTER_VALIDATE_IP)) $candidates[] = $cf_ip;
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            $r_ip = trim($_SERVER['HTTP_X_REAL_IP']);
            if (filter_var($r_ip, FILTER_VALIDATE_IP)) $candidates[] = $r_ip;
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $fwds = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            foreach ($fwds as $f_ip) {
                $f_ip = trim($f_ip);
                if (filter_var($f_ip, FILTER_VALIDATE_IP)) $candidates[] = $f_ip;
            }
        }

        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === '0.0.0.0' || strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0 || strpos($ip, '172.16.') === 0) {
            $candidates[] = '127.0.0.1';
            $candidates[] = '::1';
            $candidates[] = '0.0.0.0';
            $candidates[] = 'localhost';

            $local_pub_ip = get_option('waf_fw_local_server_ip', '');
            if (!empty($local_pub_ip)) {
                $candidates[] = $local_pub_ip;
            }
        }
        $candidates = array_values(array_unique(array_filter($candidates)));

        // 1. Check ultra-fast local JSON fast-cache (0.005ms)
        $fast_cache_file = dirname(__DIR__) . '/includes/data/waf_fast_cache.json';
        if (file_exists($fast_cache_file)) {
            $fc = @json_decode(file_get_contents($fast_cache_file), true);
            if (!empty($fc['blacklist_ips']) && is_array($fc['blacklist_ips'])) {
                foreach ($candidates as $cand) {
                    if (!empty($fc['blacklist_ips'][$cand]) || in_array($cand, $fc['blacklist_ips'], true)) {
                        $this->runtime_blacklist_cache[$ip] = true;
                        return true;
                    }
                }
            }
        }

        // 2. Check local WAF blacklist cache synced from cloud
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

        // 3. Check Global Threat Intel Cache (0.01ms)
        $threat_ips = get_transient('waf_fw_cloud_threat_ips');
        if (is_array($threat_ips) && !empty($threat_ips)) {
            foreach ($candidates as $cand) {
                if (in_array($cand, $threat_ips, true)) {
                    $this->runtime_blacklist_cache[$ip] = true;
                    return true;
                }
            }
        }

        // 4. Fallback DB lookup in a single query
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $placeholders = implode(',', array_fill(0, count($candidates), '%s'));
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT ip, block_expires_at FROM $table WHERE ip IN ($placeholders)",
            ...$candidates
        ));

        if (!empty($results)) {
            $now = current_time('timestamp');
            foreach ($results as $result) {
                if (!empty($result->block_expires_at) && strtotime($result->block_expires_at) <= $now) {
                    $wpdb->delete($table, ['ip' => $result->ip]);
                } else {
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
            update_option('waf_fw_ip_whitelist', implode(',', array_values(array_unique($ips))));
        }
        $this->remove_from_blacklist($ip);
        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
    }

    public function remove_from_whitelist($ip) {
        $ip = trim((string) $ip);
        $custom = get_option('waf_fw_ip_whitelist', '');
        if (!empty($custom)) {
            $ips = array_filter(array_map('trim', explode(',', $custom)));
            $ips = array_diff($ips, [$ip]);
            update_option('waf_fw_ip_whitelist', implode(',', array_values($ips)));
        }
        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
    }

    public function add_to_blacklist($ip, $reason = 'Auto-blocked by rate limiter', $type = 'permanent', $auto = true, $expires_at = null) {
        $ip = trim((string) $ip);
        if (empty($ip)) return;
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE ip = %s", $ip));
        if ($exists) {
            $update = [
                'reason' => $reason,
                'type' => $type,
                'auto_blocked' => $auto ? 1 : 0,
                'blocked_at' => current_time('mysql'),
            ];
            if ($expires_at) $update['block_expires_at'] = $expires_at;
            $wpdb->update($table, $update, ['ip' => $ip]);
        } else {
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

        // Also add to local blacklist option cache
        $cached_bl = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cached_bl)) {
            $cached_bl[] = $ip;
            update_option('waf_fw_local_blacklist_cache', array_values(array_unique($cached_bl)));
        }

        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
    }

    public function add_temporary_block($ip, $reason, $duration_seconds) {
        $expires_at = date('Y-m-d H:i:s', current_time('timestamp') + $duration_seconds);
        $this->add_to_blacklist($ip, $reason, 'temporary', true, $expires_at);
    }

    public function remove_from_blacklist($ip) {
        $ip = trim((string) $ip);
        if (empty($ip)) return;
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $wpdb->delete($table, ['ip' => $ip]);

        // Remove from local cloud blacklist cache as well
        $cached_bl = get_option('waf_fw_local_blacklist_cache', []);
        if (is_array($cached_bl)) {
            $cached_bl = array_values(array_diff($cached_bl, [$ip]));
            update_option('waf_fw_local_blacklist_cache', $cached_bl);
        }

        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
    }

    public function reset_runtime_cache() {
        $this->runtime_blacklist_cache = [];
    }

    public function sync_with_cloud_blacklist($cloud_ips = []) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $this->runtime_blacklist_cache = [];

        $sanitized_ips = [];
        if (is_array($cloud_ips)) {
            $sanitized_ips = array_values(array_filter(array_map('trim', array_map('sanitize_text_field', $cloud_ips))));
        }
        update_option('waf_fw_local_blacklist_cache', $sanitized_ips);

        if (empty($sanitized_ips)) {
            // If cloud blacklist is empty, purge all manual/auto entries
            $wpdb->query("DELETE FROM $table");
        } else {
            // Remove any IP in MySQL that is not in the cloud blacklist
            $placeholders = implode(',', array_fill(0, count($sanitized_ips), '%s'));
            $wpdb->query($wpdb->prepare(
                "DELETE FROM $table WHERE ip NOT IN ($placeholders)",
                ...$sanitized_ips
            ));
        }

        delete_transient('waf_fw_cloud_threat_ips');

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
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
        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
    }
}

