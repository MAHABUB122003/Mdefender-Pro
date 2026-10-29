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

        // 3. Fallback DB lookup in a single query
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

        // 4. Check Global Threat Intel Cache (0.01ms)
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
        $ip = trim((string) $ip);
        if (empty($ip)) return false;

        // If an IP is in the blacklist, it can NEVER be considered whitelisted!
        if ($this->is_blacklisted_raw($ip)) {
            return false;
        }

        $custom = get_option('waf_fw_ip_whitelist', '');
        if (!empty($custom)) {
            $ips = is_array($custom) ? $custom : array_map('trim', preg_split('/[,\r\n]+/', (string) $custom));
            if (in_array($ip, $ips, true)) {
                return true;
            }
        }
        if (in_array($ip, $this->whitelist, true)) {
            return true;
        }

        // Loopback is allowed by default ONLY IF not explicitly added to the blacklist table and not running a waf test
        if (empty($_GET['waf_test']) && empty($_POST['waf_test']) && empty($_GET['test_ip']) && empty($_GET['ip_test']) && empty($_GET['country_test']) && empty($_GET['test_country']) && empty($_SERVER['HTTP_CF_IPCOUNTRY']) && empty($_SERVER['CF_IPCOUNTRY'])) {
            if ($ip === '127.0.0.1' || $ip === '::1' || $ip === '0.0.0.0' || $ip === 'localhost') {
                return true;
            }
        }

        return false;
    }

    public function add_to_whitelist($ip, $reason = '') {
        $ip = trim((string) $ip);
        if (empty($ip)) return;
        $custom = get_option('waf_fw_ip_whitelist', '');
        $ips = is_array($custom) ? $custom : (!empty($custom) ? array_filter(array_map('trim', explode(',', (string) $custom))) : []);
        if (!in_array($ip, $ips, true)) {
            $ips[] = $ip;
            update_option('waf_fw_ip_whitelist', implode(',', array_values(array_unique($ips))));
        }
        $this->remove_from_blacklist($ip);
        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        // Web-Server Layer Enforcement: Sync Blacklist to .htaccess
        $this->sync_htaccess_blacklist();
    }

    public function remove_from_whitelist($ip) {
        $ip = trim((string) $ip);
        $custom = get_option('waf_fw_ip_whitelist', '');
        $ips = is_array($custom) ? $custom : (!empty($custom) ? array_filter(array_map('trim', explode(',', (string) $custom))) : []);
        if (!empty($ips)) {
            $ips = array_diff($ips, [$ip]);
            update_option('waf_fw_ip_whitelist', implode(',', array_values($ips)));
        }
        $this->runtime_blacklist_cache = [];
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        // Web-Server Layer Enforcement: Sync Blacklist to .htaccess
        $this->sync_htaccess_blacklist();
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

        // Web-Server Layer Enforcement: Sync Blacklist to .htaccess
        $this->sync_htaccess_blacklist();

        // Server-Level Firewall Sync (CSF / iptables / cPanel UAPI)
        $this->sync_system_firewall_block($ip, $reason);

        // Notify cloud API so the block is immediately visible on Cloud User Dashboard
        $this->notify_cloud_block($ip, $reason, $expires_at);
    }

    private function notify_cloud_block($ip, $reason = '', $expires_at = null) {
        if (php_sapi_name() === 'cli' || defined('WP_CLI')) return;
        $api_key = trim((string) get_option('waf_fw_ml_api_key', get_option('waf_fw_api_key', '')));
        $api_url = trim((string) get_option('waf_fw_ml_api_url', get_option('waf_fw_api_url', '')));
        if (empty($api_key) || empty($api_url)) return;

        $base = rtrim($api_url, '/');
        $endpoint = $base . '/api/user/blacklist';
        if (function_exists('wp_remote_post')) {
            wp_remote_post($endpoint, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $api_key,
                    'Content-Type' => 'application/json',
                ],
                'body' => json_encode([
                    'ip' => $ip,
                    'reason' => $reason ?: 'Auto-blocked by WordPress Plugin',
                    'duration' => $expires_at ? 'temporary' : 'permanent',
                ]),
                'timeout' => 2.0,
                'blocking' => false,
            ]);
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

        // Clear previous attack blocker & login lockout attempts so the IP starts fresh from 0
        if (class_exists('WAF_FW_Attack_Blocker')) {
            WAF_FW_Attack_Blocker::instance()->clear_attempts($ip);
        }
        if (class_exists('WAF_FW_Login_Protector')) {
            WAF_FW_Login_Protector::instance()->clear_attempts($ip);
        }

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        // Web-Server Layer Enforcement: Sync Blacklist to .htaccess
        $this->sync_htaccess_blacklist();

        // Server-Level Firewall Sync (CSF / iptables / cPanel UAPI)
        $this->sync_system_firewall_unblock($ip);

        // Notify cloud API if site is connected
        $this->notify_cloud_unblock($ip);
    }

    private function notify_cloud_unblock($ip) {
        if (php_sapi_name() === 'cli' || defined('WP_CLI')) return;
        $api_key = trim((string) get_option('waf_fw_ml_api_key', get_option('waf_fw_api_key', '')));
        $api_url = trim((string) get_option('waf_fw_ml_api_url', get_option('waf_fw_api_url', '')));
        if (empty($api_key) || empty($api_url)) return;

        $base = rtrim($api_url, '/');
        $endpoint = $base . '/api/user/blacklist?ip=' . urlencode($ip);
        if (function_exists('wp_remote_request')) {
            wp_remote_request($endpoint, [
                'method' => 'DELETE',
                'headers' => [
                    'Authorization' => 'Bearer ' . $api_key,
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 1.5,
                'blocking' => false,
            ]);
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

        // Exclude loopback / local addresses
        $sanitized_ips = array_values(array_diff($sanitized_ips, ['127.0.0.1', '::1', '0.0.0.0', 'localhost']));

        if (!empty($sanitized_ips)) {
            foreach ($sanitized_ips as $c_ip) {
                $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE ip = %s", $c_ip));
                if (!$exists) {
                    $wpdb->insert($table, [
                        'ip' => $c_ip,
                        'reason' => 'Synced from MDefender-Pro Cloud',
                        'type' => 'permanent',
                        'auto_blocked' => 0,
                        'blocked_at' => current_time('mysql'),
                    ]);
                }
            }
            // Remove any IP in $table that is NOT in the active cloud blacklist
            $placeholders = implode(',', array_fill(0, count($sanitized_ips), '%s'));
            $wpdb->query($wpdb->prepare(
                "DELETE FROM $table WHERE ip NOT IN ($placeholders)",
                ...$sanitized_ips
            ));
        } else {
            // Cloud blacklist is empty -> completely purge all blacklist records from DB
            $wpdb->query("DELETE FROM $table");
        }

        // Synchronize local option cache strictly to sanitized_ips
        update_option('waf_fw_local_blacklist_cache', $sanitized_ips);

        delete_transient('waf_fw_cloud_threat_ips');

        if (class_exists('WAF_FW_Attack_Blocker')) {
            WAF_FW_Attack_Blocker::instance()->clear_attempts('');
        }
        if (class_exists('WAF_FW_Login_Protector')) {
            WAF_FW_Login_Protector::instance()->clear_attempts('');
        }

        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }

        // Web-Server Layer Enforcement: Sync Blacklist to .htaccess
        $this->sync_htaccess_blacklist();
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
        $this->sync_htaccess_blacklist();
    }

    /**
     * Synchronize Blacklist to root .htaccess for web-server level enforcement.
     * Prevents requests from ever reaching WordPress, /cpanel redirects, or PHP scripts.
     */
    public function sync_htaccess_blacklist() {
        $home_path = defined('ABSPATH') ? ABSPATH : '';
        if (function_exists('get_home_path')) {
            $home_path = get_home_path();
        }
        if (empty($home_path)) return;

        $htaccess_file = rtrim($home_path, '/\\') . DIRECTORY_SEPARATOR . '.htaccess';

        // Check if server is running Apache / LiteSpeed where .htaccess is effective
        $is_apache = true;
        if (!empty($_SERVER['SERVER_SOFTWARE'])) {
            $software = strtolower($_SERVER['SERVER_SOFTWARE']);
            if (strpos($software, 'nginx') !== false && strpos($software, 'apache') === false && strpos($software, 'litespeed') === false) {
                $is_apache = false;
            }
        }
        if (!$is_apache && !file_exists($htaccess_file)) {
            return;
        }

        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $now = current_time('mysql');
        $results = $wpdb->get_col("SELECT ip FROM $table WHERE block_expires_at IS NULL OR block_expires_at > '$now'");

        $valid_ips = [];
        if (!empty($results)) {
            foreach ($results as $raw_ip) {
                $clean = trim((string) $raw_ip);
                if (filter_var($clean, FILTER_VALIDATE_IP)) {
                    // Do not block local loopback in .htaccess
                    if (!in_array($clean, ['127.0.0.1', '::1', '0.0.0.0', 'localhost'], true)) {
                        $valid_ips[] = $clean;
                    }
                }
            }
        }
        $valid_ips = array_values(array_unique($valid_ips));

        $start_tag = '# BEGIN MDefender-Pro IP Blacklist';
        $end_tag   = '# END MDefender-Pro IP Blacklist';

        $existing_content = file_exists($htaccess_file) ? @file_get_contents($htaccess_file) : '';
        if ($existing_content === false) {
            $existing_content = '';
        }

        // Remove existing block
        $pattern = '/' . preg_quote($start_tag, '/') . '.*?' . preg_quote($end_tag, '/') . '\s*/s';
        $cleaned_content = preg_replace($pattern, '', $existing_content);

        if (!empty($valid_ips)) {
            $deny_require = [];
            $deny_legacy  = [];
            foreach ($valid_ips as $b_ip) {
                $deny_require[] = "        Require not ip {$b_ip}";
                $deny_legacy[]  = "    Deny from {$b_ip}";
            }

            $block = $start_tag . "\n";
            $block .= "# Web-Server Layer Security - Blocks Ingress & cPanel / Administration Probes\n";
            $block .= "<IfModule mod_authz_core.c>\n";
            $block .= "    <RequireAll>\n";
            $block .= "        Require all granted\n";
            $block .= implode("\n", $deny_require) . "\n";
            $block .= "    </RequireAll>\n";
            $block .= "</IfModule>\n";
            $block .= "<IfModule !mod_authz_core.c>\n";
            $block .= "    Order Allow,Deny\n";
            $block .= "    Allow from all\n";
            $block .= implode("\n", $deny_legacy) . "\n";
            $block .= "</IfModule>\n";
            $block .= $end_tag . "\n\n";

            $new_content = $block . ltrim($cleaned_content);
        } else {
            $new_content = ltrim($cleaned_content);
        }

        // Only write if file already existed or if we have valid IPs to write
        if (file_exists($htaccess_file) || !empty($valid_ips)) {
            @file_put_contents($htaccess_file, $new_content, LOCK_EX);
        }
    }

    /**
     * Server-Level Firewall Block (CSF / iptables / cPanel UAPI).
     * Blocks all ports including cPanel 2083, 2082, 80, 443 at Linux kernel level.
     */
    public function sync_system_firewall_block($ip, $reason = '') {
        $ip = trim((string) $ip);
        if (!filter_var($ip, FILTER_VALIDATE_IP)) return;
        if (in_array($ip, ['127.0.0.1', '::1', '0.0.0.0', 'localhost'], true)) return;
        if (DIRECTORY_SEPARATOR === '\\') return; // Skip in Windows dev
        if (!function_exists('exec')) return;

        $disabled = array_map('trim', explode(',', ini_get('disable_functions') ?: ''));
        if (in_array('exec', $disabled, true)) return;

        // 1. ConfigServer Security & Firewall (CSF)
        if (file_exists('/usr/sbin/csf')) {
            $cmd = '/usr/sbin/csf -d ' . escapeshellarg($ip) . ' ' . escapeshellarg('MDefender-Pro: ' . substr($reason, 0, 50));
            @exec($cmd . ' > /dev/null 2>&1');
        }

        // 2. cPanel UAPI IP Blocker
        if (file_exists('/usr/local/cpanel/bin/uapi')) {
            $cmd = '/usr/local/cpanel/bin/uapi IpBlocker add_ip ip=' . escapeshellarg($ip);
            @exec($cmd . ' > /dev/null 2>&1');
        }
    }

    /**
     * Server-Level Firewall Unblock.
     */
    public function sync_system_firewall_unblock($ip) {
        $ip = trim((string) $ip);
        if (!filter_var($ip, FILTER_VALIDATE_IP)) return;
        if (DIRECTORY_SEPARATOR === '\\') return;
        if (!function_exists('exec')) return;

        $disabled = array_map('trim', explode(',', ini_get('disable_functions') ?: ''));
        if (in_array('exec', $disabled, true)) return;

        // 1. ConfigServer Security & Firewall (CSF)
        if (file_exists('/usr/sbin/csf')) {
            $cmd = '/usr/sbin/csf -dr ' . escapeshellarg($ip);
            @exec($cmd . ' > /dev/null 2>&1');
        }

        // 2. cPanel UAPI IP Blocker
        if (file_exists('/usr/local/cpanel/bin/uapi')) {
            $cmd = '/usr/local/cpanel/bin/uapi IpBlocker remove_ip ip=' . escapeshellarg($ip);
            @exec($cmd . ' > /dev/null 2>&1');
        }
    }
}

