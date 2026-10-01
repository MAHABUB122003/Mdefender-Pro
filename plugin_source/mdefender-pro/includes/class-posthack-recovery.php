<?php
/**
 * MDefender Pro - Emergency Post-Hack Response & Site Recovery Engine
 * Inspired by Sucuri & Wordfence Incident Response Toolkits.
 *
 * Implements:
 * 1. Global Session Invalidation (Instant Hacker & Rogue Device Logout)
 * 2. WordPress Security Keys & Salts 1-Click Regenerator (wp-config.php)
 * 3. Global Password Reset Enforcement for All / Admin Accounts
 * 4. Have I Been Pwned (HIBP) k-Anonymity Breached Password Shield
 * 5. Emergency Maintenance & Incident Response Lockdown Mode
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_PostHack_Recovery {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        // Enforce password reset prompt on login if flagged
        add_action('wp_login', [$this, 'check_force_password_reset_on_login'], 10, 2);
        add_action('admin_init', [$this, 'enforce_password_reset_redirect']);

        // Emergency maintenance lockdown hook
        if (get_option('waf_posthack_lockdown_active') === 'yes') {
            add_action('template_redirect', [$this, 'handle_emergency_lockdown'], 1);
        }
    }

    /**
     * Terminate all active user sessions across WordPress (Global Session Invalidation).
     *
     * @param bool $keep_current_user
     * @return array
     */
    public function terminate_all_sessions($keep_current_user = true) {
        global $wpdb;

        $current_user_id = get_current_user_id();
        $users = get_users(['fields' => ['ID', 'user_login']]);
        $terminated_count = 0;

        foreach ($users as $user) {
            if ($keep_current_user && $user->ID === $current_user_id) {
                // Destroy all sessions except the current active session
                $manager = WP_Session_Tokens::get_instance($user->ID);
                $manager->destroy_others(wp_get_session_token());
                $terminated_count++;
                continue;
            }

            // Destroy all sessions for other users
            delete_user_meta($user->ID, 'session_tokens');
            $terminated_count++;
        }

        if (class_exists('WAF_FW_Website_Hardening')) {
            WAF_FW_Website_Hardening::instance()->log_activity('Global Session Invalidation', 'All WordPress Sessions', 'Success', "Terminated all active sessions across {$terminated_count} accounts.");
        }

        return [
            'success' => true,
            'message' => "Successfully invalidated and terminated all active sessions for {$terminated_count} users. Any active unauthorized access or attacker connections have been severed.",
            'terminated_count' => $terminated_count,
        ];
    }

    /**
     * 1-Click Regenerate all 8 WordPress Security Keys & Salts in wp-config.php.
     *
     * @return array
     */
    public function regenerate_security_salts() {
        $config_file = ABSPATH . 'wp-config.php';
        if (!file_exists($config_file)) {
            // Check one directory up for standard WordPress root setups
            if (file_exists(dirname(ABSPATH) . '/wp-config.php') && !file_exists(dirname(ABSPATH) . '/wp-settings.php')) {
                $config_file = dirname(ABSPATH) . '/wp-config.php';
            }
        }

        if (!file_exists($config_file) || !is_writable($config_file)) {
            return [
                'success' => false,
                'message' => 'wp-config.php is not writable by the server. Please check file permissions.',
            ];
        }

        // 1. Create a timestamped backup before touching wp-config.php
        $backup_dir = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups/config_snapshots/');
        if (!is_dir($backup_dir)) {
            wp_mkdir_p($backup_dir);
            @file_put_contents($backup_dir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
            @file_put_contents($backup_dir . '/index.php', '<?php // Silence is golden');
        }
        $backup_file = $backup_dir . '/wp-config.php.salt_backup_' . time() . '.bak';
        @copy($config_file, $backup_file);

        // 2. Fetch official cryptographic salts from api.wordpress.org
        $salts_code = '';
        $response = wp_remote_get('https://api.wordpress.org/secret-key/1.1/salt/', ['timeout' => 8, 'sslverify' => false]);

        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $salts_code = trim(wp_remote_retrieve_body($response));
        }

        // Fallback: Generate cryptographically secure random keys locally if offline
        if (empty($salts_code)) {
            $keys = ['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT'];
            $lines = [];
            foreach ($keys as $k) {
                $random_val = bin2hex(random_bytes(32));
                $lines[] = "define('{$k}', '{$random_val}');";
            }
            $salts_code = implode("\n", $lines);
        }

        $content = file_get_contents($config_file);

        // Replace existing salt definitions
        $salt_keys = ['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT'];
        $pattern = "/define\s*\(\s*['\"](" . implode('|', $salt_keys) . ")['\"]\s*,\s*[^)]+\s*\)\s*;/";

        if (preg_match($pattern, $content)) {
            // Remove old keys first
            $content = preg_replace($pattern, '', $content);
            // Insert fresh keys right after opening <?php
            $content = preg_replace('/<\?php\s*/', "<?php\n\n// MDefender Pro - Regenerated Security Keys & Salts\n" . $salts_code . "\n\n", $content, 1);
        } else {
            // Append right after opening <?php
            $content = preg_replace('/<\?php\s*/', "<?php\n\n// MDefender Pro - Regenerated Security Keys & Salts\n" . $salts_code . "\n\n", $content, 1);
        }

        $saved = @file_put_contents($config_file, $content, LOCK_EX);
        if ($saved === false) {
            return [
                'success' => false,
                'message' => 'Failed to write updated salts to wp-config.php.',
            ];
        }

        if (class_exists('WAF_FW_Website_Hardening')) {
            WAF_FW_Website_Hardening::instance()->log_activity('Security Salts Regenerated', 'wp-config.php', 'Success', 'Generated fresh 64-character cryptographic security keys & salts.');
        }

        return [
            'success' => true,
            'message' => 'WordPress security keys and cryptographic salts have been regenerated successfully. All cookie auth keys are refreshed.',
            'backup_created' => basename($backup_file),
        ];
    }

    /**
     * Force Password Reset for all users or administrators on their next login.
     *
     * @param string $scope 'admins' | 'all'
     * @return array
     */
    public function force_global_password_reset($scope = 'admins') {
        $args = ($scope === 'admins') ? ['role' => 'administrator'] : [];
        $users = get_users($args);
        $count = 0;

        foreach ($users as $user) {
            update_user_meta($user->ID, '_waf_force_password_reset', 'yes');
            $count++;
        }

        if (class_exists('WAF_FW_Website_Hardening')) {
            WAF_FW_Website_Hardening::instance()->log_activity('Force Password Reset', ucfirst($scope) . ' Accounts', 'Success', "Flagged {$count} user accounts to mandate password reset upon next login.");
        }

        return [
            'success' => true,
            'message' => "Mandatory password reset enabled for {$count} account(s) ({$scope}). Users will be prompted to set a new password upon logging in.",
            'affected_count' => $count,
        ];
    }

    /**
     * Check if a password appears in global breached credential dumps using HIBP k-Anonymity API.
     *
     * @param string $password
     * @return array ['pwned' => bool, 'count' => int]
     */
    public function check_pwned_password($password) {
        if (empty($password)) {
            return ['pwned' => false, 'count' => 0];
        }

        $sha1 = strtoupper(sha1($password));
        $prefix = substr($sha1, 0, 5);
        $suffix = substr($sha1, 5);

        $url = 'https://api.pwnedpasswords.com/range/' . $prefix;
        $response = wp_remote_get($url, [
            'timeout' => 8,
            'sslverify' => false,
            'headers' => ['Add-Padding' => 'true'],
            'user-agent' => 'MDefender-Pro-Breach-Check',
        ]);

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return ['pwned' => false, 'count' => 0, 'error' => 'API Unavailable'];
        }

        $body = wp_remote_retrieve_body($response);
        $lines = explode("\n", $body);

        foreach ($lines as $line) {
            $parts = explode(':', trim($line));
            if (count($parts) >= 2 && strtoupper($parts[0]) === $suffix) {
                $breach_count = (int)$parts[1];
                return ['pwned' => true, 'count' => $breach_count];
            }
        }

        return ['pwned' => false, 'count' => 0];
    }

    /**
     * Audit all administrator usernames and default security status.
     *
     * @return array
     */
    public function audit_administrator_security() {
        $admins = get_users(['role' => 'administrator']);
        $results = [];

        foreach ($admins as $admin) {
            $has_2fa = get_user_meta($admin->ID, '_waf_2fa_enabled', true) === 'yes';
            $forced_reset = get_user_meta($admin->ID, '_waf_force_password_reset', true) === 'yes';
            $sessions = get_user_meta($admin->ID, 'session_tokens', true);
            $active_sessions_count = is_array($sessions) ? count($sessions) : 0;

            $risk_level = 'Low';
            $warnings = [];

            if (!$has_2fa) {
                $warnings[] = '2FA Not Enabled';
                $risk_level = 'Medium';
            }
            if (in_array(strtolower($admin->user_login), ['admin', 'administrator', 'root', 'test'])) {
                $warnings[] = 'Default/Predictable Username (' . $admin->user_login . ')';
                $risk_level = 'High';
            }
            if ($active_sessions_count > 3) {
                $warnings[] = "Multiple Concurrent Sessions ({$active_sessions_count})";
            }

            $results[] = [
                'ID' => $admin->ID,
                'user_login' => $admin->user_login,
                'user_email' => $admin->user_email,
                'display_name' => $admin->display_name,
                'has_2fa' => $has_2fa,
                'forced_reset' => $forced_reset,
                'active_sessions' => $active_sessions_count,
                'risk_level' => $risk_level,
                'warnings' => $warnings,
            ];
        }

        return [
            'success' => true,
            'total_admins' => count($admins),
            'admins' => $results,
        ];
    }

    /**
     * Toggle emergency incident response lockdown.
     *
     * @param bool $enable
     * @return array
     */
    public function toggle_emergency_lockdown($enable) {
        $new_val = $enable ? 'yes' : 'no';
        update_option('waf_posthack_lockdown_active', $new_val);

        if (class_exists('WAF_FW_Website_Hardening')) {
            WAF_FW_Website_Hardening::instance()->log_activity(
                $enable ? 'Emergency Lockdown Activated' : 'Emergency Lockdown Deactivated',
                'Incident Response System',
                $enable ? 'Warning' : 'Success',
                $enable ? 'Frontend restricted strictly to authenticated administrators.' : 'Normal website access restored.'
            );
        }

        return [
            'success' => true,
            'lockdown_active' => ($new_val === 'yes'),
            'message' => $enable 
                ? 'Emergency Lockdown is now ACTIVE. Only logged-in administrators can access the website.'
                : 'Emergency Lockdown deactivated. Standard public access restored.',
        ];
    }

    /**
     * Intercept frontend traffic during emergency lockdown.
     */
    public function handle_emergency_lockdown() {
        if (!is_user_logged_in() || !current_user_can('manage_options')) {
            status_header(503);
            nocache_headers();
            wp_die(
                '<h1>Website Under Emergency Security Maintenance</h1><p>This website is currently in incident response lockdown mode by MDefender-Pro Security. Please check back shortly.</p>',
                'Security Maintenance Mode - MDefender Pro',
                ['response' => 503]
            );
        }
    }

    /**
     * Hook to check if logged in user is flagged for password reset.
     */
    public function check_force_password_reset_on_login($user_login, $user) {
        if ($user instanceof WP_User) {
            $flag = get_user_meta($user->ID, '_waf_force_password_reset', true);
            if ($flag === 'yes') {
                update_user_meta($user->ID, '_waf_must_reset_password_now', 'yes');
            }
        }
    }

    /**
     * Enforce password reset redirect for flagged users.
     */
    public function enforce_password_reset_redirect() {
        $user_id = get_current_user_id();
        if (!$user_id) return;

        if (get_user_meta($user_id, '_waf_must_reset_password_now', true) === 'yes') {
            global $pagenow;
            if ($pagenow !== 'profile.php') {
                // Flash notice on profile page
                wp_redirect(admin_url('profile.php?waf_reset_required=1#password'));
                exit;
            }
        }
    }
}
