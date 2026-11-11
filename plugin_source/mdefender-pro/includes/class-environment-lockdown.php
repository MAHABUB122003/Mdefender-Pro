<?php
/**
 * MDefender Pro - Enterprise Environment Governance & Debug Mode Lockdown
 *
 * Inspects, audits, and enforces production-grade environment lockdowns:
 * - Shuts down WP_DEBUG, WP_DEBUG_LOG, WP_DEBUG_DISPLAY in wp-config.php
 * - Suppresses fatal error disclosures & PHP runtime displays
 * - Purges and shields wp-content/debug.log from external reconnaissance
 * - Enforces DISALLOW_FILE_EDIT and FORCE_SSL_ADMIN
 * - Audits PHP lifecycle (EOL vs Active), memory allocations, and execution ceilings
 *
 * @package MDefender_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class WAF_FW_Environment_Lockdown {

    private static $instance = null;

    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Locate WordPress configuration file (standard root or one directory above)
     */
    public function get_wp_config_path() {
        $primary = ABSPATH . 'wp-config.php';
        if (file_exists($primary)) {
            return $primary;
        }

        $parent = dirname(ABSPATH) . '/wp-config.php';
        if (file_exists($parent) && !file_exists(dirname(ABSPATH) . '/wp-settings.php')) {
            return $parent;
        }

        return $primary;
    }

    /**
     * Get debug.log path
     */
    public function get_debug_log_path() {
        if (defined('WP_DEBUG_LOG') && is_string(WP_DEBUG_LOG) && !empty(WP_DEBUG_LOG)) {
            return WP_DEBUG_LOG;
        }
        return WP_CONTENT_DIR . '/debug.log';
    }

    /**
     * Inspect entire environment status, configurations, and active risk vectors
     */
    public function get_status() {
        global $wp_version;

        $config_file = $this->get_wp_config_path();
        $config_writable = file_exists($config_file) && is_writable($config_file);

        // Debug constants
        $wp_debug = defined('WP_DEBUG') && (bool) WP_DEBUG;
        $wp_debug_log = defined('WP_DEBUG_LOG') && (bool) WP_DEBUG_LOG;
        $wp_debug_display = defined('WP_DEBUG_DISPLAY') && (bool) WP_DEBUG_DISPLAY;
        $script_debug = defined('SCRIPT_DEBUG') && (bool) SCRIPT_DEBUG;

        // PHP runtime display_errors & wp-config inspection
        $raw_display_errors = ini_get('display_errors');
        $display_errors = in_array(strtolower((string) $raw_display_errors), ['1', 'true', 'on', 'yes'], true);
        $config_content = ($config_writable && file_exists($config_file)) ? (string) @file_get_contents($config_file) : '';
        $has_display_suppression = (strpos($config_content, "display_errors") !== false && (strpos($config_content, "'display_errors', 0") !== false || strpos($config_content, "'display_errors', '0'") !== false || strpos($config_content, '"display_errors", 0') !== false || strpos($config_content, 'display_errors\', 0') !== false));
        if ($has_display_suppression) {
            $display_errors = false;
        }

        // Security constants
        $disallow_file_edit = defined('DISALLOW_FILE_EDIT') && (bool) DISALLOW_FILE_EDIT;
        $force_ssl_admin = defined('FORCE_SSL_ADMIN') && (bool) FORCE_SSL_ADMIN;
        $is_ssl = is_ssl();

        // Inspect debug.log
        $debug_log_path = $this->get_debug_log_path();
        $log_exists = file_exists($debug_log_path);
        $log_size_bytes = $log_exists ? (int) @filesize($debug_log_path) : 0;
        $log_readable = $log_exists && is_readable($debug_log_path);
        $log_writable = $log_exists && is_writable($debug_log_path);

        // PHP Version & EOL Analysis
        $php_ver = PHP_VERSION;
        $php_status = 'supported';
        $php_badge = 'Healthy';
        if (version_compare($php_ver, '8.1.0', '<')) {
            $php_status = 'eol_unsupported';
            $php_badge = 'End of Life (Vulnerable)';
        } elseif (version_compare($php_ver, '8.2.0', '<')) {
            $php_status = 'security_only';
            $php_badge = 'Security Fixes Only';
        } else {
            $php_status = 'actively_supported';
            $php_badge = 'Actively Supported';
        }

        // Memory & Limits
        $php_memory_limit = ini_get('memory_limit') ?: '128M';
        $wp_memory_limit = defined('WP_MEMORY_LIMIT') ? WP_MEMORY_LIMIT : '40M';
        $max_execution_time = ini_get('max_execution_time') ?: '30';
        $upload_max_filesize = ini_get('upload_max_filesize') ?: '2M';
        $post_max_size = ini_get('post_max_size') ?: '8M';
        $web_server = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown Web Server';

        // Assess overall risk score (100 = perfectly locked down)
        $score = 100;
        $findings = [];

        if ($wp_debug) {
            $score -= 30;
            $findings[] = [
                'type' => 'WP_DEBUG_ACTIVE',
                'severity' => 'critical',
                'title' => 'WP_DEBUG is Enabled in Production',
                'message' => 'Development debug mode is active. This can expose sensitive SQL statements, server file paths, and environment internals.'
            ];
        }

        if ($wp_debug_display || $display_errors) {
            $score -= 25;
            $findings[] = [
                'type' => 'ERROR_DISPLAY_ACTIVE',
                'severity' => 'critical',
                'title' => 'Direct Error Output Leaking to Visitors',
                'message' => 'PHP runtime errors and stack traces are allowed to render directly in HTTP response bodies, giving attackers deep insight into system vulnerabilities.'
            ];
        }

        if ($log_exists && $log_size_bytes > 0) {
            $score -= 20;
            $findings[] = [
                'type' => 'DEBUG_LOG_EXPOSED',
                'severity' => 'high',
                'title' => 'Physical debug.log Detected on Disk',
                'message' => sprintf('debug.log currently consumes %s on disk. Attackers frequently brute-force this path to harvest database credentials and API secrets.', $this->format_bytes($log_size_bytes))
            ];
        }

        if (!$disallow_file_edit) {
            $score -= 15;
            $findings[] = [
                'type' => 'FILE_EDITOR_ENABLED',
                'severity' => 'medium',
                'title' => 'WordPress In-Dashboard File Editor is Enabled',
                'message' => 'DISALLOW_FILE_EDIT is false. If an admin account is compromised, the attacker can edit plugin and theme PHP files directly to inject web shells.'
            ];
        }

        $is_local = (isset($_SERVER['HTTP_HOST']) && in_array(explode(':', $_SERVER['HTTP_HOST'])[0], ['localhost', '127.0.0.1'], true)) || (defined('WP_HOME') && strpos(WP_HOME, 'localhost') !== false);
        if (!$force_ssl_admin && !$is_ssl && !$is_local) {
            $score -= 10;
            $findings[] = [
                'type' => 'SSL_ADMIN_NOT_ENFORCED',
                'severity' => 'medium',
                'title' => 'Admin Session SSL Not Enforced',
                'message' => 'FORCE_SSL_ADMIN is not enabled, leaving session cookies exposed to man-in-the-middle interception over plaintext connections.'
            ];
        }

        $score = max(0, min(100, $score));

        $lockdown_state = 'locked';
        if ($score < 60) {
            $lockdown_state = 'exposed';
        } elseif ($score < 90) {
            $lockdown_state = 'moderate';
        }

        return [
            'success' => true,
            'lockdown_state' => $lockdown_state,
            'security_score' => $score,
            'findings' => $findings,
            'config_writable' => $config_writable,
            'config_file' => basename($config_file),
            'constants' => [
                'wp_debug' => $wp_debug,
                'wp_debug_log' => $wp_debug_log,
                'wp_debug_display' => $wp_debug_display,
                'script_debug' => $script_debug,
                'display_errors' => $display_errors,
                'disallow_file_edit' => $disallow_file_edit,
                'force_ssl_admin' => $force_ssl_admin,
                'is_ssl' => $is_ssl
            ],
            'debug_log' => [
                'exists' => $log_exists,
                'size_bytes' => $log_size_bytes,
                'size_formatted' => $this->format_bytes($log_size_bytes),
                'readable' => $log_readable,
                'writable' => $log_writable,
                'path_relative' => str_replace(ABSPATH, '', $debug_log_path)
            ],
            'environment' => [
                'php_version' => $php_ver,
                'php_status' => $php_status,
                'php_badge' => $php_badge,
                'wp_version' => $wp_version,
                'memory_limit' => $php_memory_limit,
                'wp_memory_limit' => $wp_memory_limit,
                'max_execution_time' => $max_execution_time . 's',
                'upload_max_filesize' => $upload_max_filesize,
                'post_max_size' => $post_max_size,
                'web_server' => $web_server
            ],
            'timestamp' => current_time('mysql')
        ];
    }

    /**
     * Enforce lockdown settings in wp-config.php and filesystem
     *
     * @param array $options Options array:
     *   - disable_wp_debug: bool
     *   - disable_wp_debug_display: bool
     *   - disable_wp_debug_log: bool
     *   - purge_debug_log: bool
     *   - disallow_file_edit: bool
     *   - force_ssl_admin: bool
     *   - block_debug_log_access: bool
     * @return array Result of the operation
     */
    public function enforce_lockdown($options = []) {
        $defaults = [
            'disable_wp_debug' => true,
            'disable_wp_debug_display' => true,
            'disable_wp_debug_log' => true,
            'purge_debug_log' => true,
            'disallow_file_edit' => true,
            'force_ssl_admin' => is_ssl(),
            'block_debug_log_access' => true,
        ];
        $opts = wp_parse_args($options, $defaults);

        $actions_taken = [];
        $errors = [];

        $config_file = $this->get_wp_config_path();

        if (!file_exists($config_file) || !is_writable($config_file)) {
            return [
                'success' => false,
                'message' => 'wp-config.php is not writable or cannot be located.',
                'errors' => ['wp-config.php write permission denied']
            ];
        }

        $content = @file_get_contents($config_file);
        if ($content === false || empty($content)) {
            return [
                'success' => false,
                'message' => 'Failed to read wp-config.php contents.',
                'errors' => ['Read failure on wp-config.php']
            ];
        }

        // Create safety backup
        $backup_dir = WP_CONTENT_DIR . '/waf-backups';
        if (!file_exists($backup_dir)) {
            @wp_mkdir_p($backup_dir);
            // Protect backup dir
            @file_put_contents($backup_dir . '/.htaccess', "Order deny,allow\nDeny from all\n");
            @file_put_contents($backup_dir . '/index.php', "<?php // Silence is golden\n");
        }
        $backup_file = $backup_dir . '/wp-config-lockdown-' . time() . '.bak.php';
        @copy($config_file, $backup_file);

        $modified = false;

        // 1. WP_DEBUG => false
        if (!empty($opts['disable_wp_debug'])) {
            $content = $this->set_constant_in_content($content, 'WP_DEBUG', 'false', $modified);
            $actions_taken[] = 'WP_DEBUG set to false';
        }

        // 2. WP_DEBUG_DISPLAY => false
        if (!empty($opts['disable_wp_debug_display'])) {
            $content = $this->set_constant_in_content($content, 'WP_DEBUG_DISPLAY', 'false', $modified);
            // Also ensure runtime display_errors suppression is locked into wp-config.php
            if (preg_match("/@?ini_set\s*\(\s*['\"]display_errors['\"]\s*,\s*[^)]+\s*\)\s*;/i", $content)) {
                $content = preg_replace("/@?ini_set\s*\(\s*['\"]display_errors['\"]\s*,\s*[^)]+\s*\)\s*;/i", "@ini_set( 'display_errors', 0 );", $content);
                $modified = true;
            } else {
                $stop_marker = "/* That's all, stop editing!";
                $ini_line = "@ini_set( 'display_errors', 0 );\n";
                if (strpos($content, $stop_marker) !== false) {
                    $content = str_replace($stop_marker, $ini_line . $stop_marker, $content);
                } else {
                    $content .= "\n" . $ini_line;
                }
                $modified = true;
            }
            $actions_taken[] = 'WP_DEBUG_DISPLAY set to false & display_errors suppressed';
        }

        // 3. WP_DEBUG_LOG => false
        if (!empty($opts['disable_wp_debug_log'])) {
            $content = $this->set_constant_in_content($content, 'WP_DEBUG_LOG', 'false', $modified);
            $actions_taken[] = 'WP_DEBUG_LOG set to false';
        }

        // 4. SCRIPT_DEBUG => false
        $content = $this->set_constant_in_content($content, 'SCRIPT_DEBUG', 'false', $modified);
        $actions_taken[] = 'SCRIPT_DEBUG set to false';

        // 5. DISALLOW_FILE_EDIT => true
        if (!empty($opts['disallow_file_edit'])) {
            $content = $this->set_constant_in_content($content, 'DISALLOW_FILE_EDIT', 'true', $modified);
            $actions_taken[] = 'DISALLOW_FILE_EDIT set to true';
        }

        // 6. FORCE_SSL_ADMIN
        if (isset($opts['force_ssl_admin'])) {
            $val = !empty($opts['force_ssl_admin']) ? 'true' : 'false';
            $content = $this->set_constant_in_content($content, 'FORCE_SSL_ADMIN', $val, $modified);
            $actions_taken[] = "FORCE_SSL_ADMIN set to {$val}";
        }

        // Syntax Verification & Atomic Write
        if ($modified) {
            // Pre-flight syntax validation: verify PHP syntax will not break WordPress
            try {
                if (function_exists('token_get_all')) {
                    @token_get_all($content, defined('TOKEN_PARSE') ? TOKEN_PARSE : 0);
                }
            } catch (\Throwable $e) {
                return [
                    'success' => false,
                    'message' => 'Aborted: Syntax check failed on modified wp-config.php: ' . $e->getMessage(),
                    'errors' => ['Pre-write syntax check failed']
                ];
            }

            $write_res = @file_put_contents($config_file, $content, LOCK_EX);
            if ($write_res === false) {
                $errors[] = 'Failed to write updated configuration to wp-config.php.';
            } else {
                $actions_taken[] = 'wp-config.php updated successfully with atomic lock';
            }
        }

        // 7. Purge debug.log if requested
        if (!empty($opts['purge_debug_log'])) {
            $purge_res = $this->purge_debug_log();
            if ($purge_res['purged']) {
                $actions_taken[] = sprintf('debug.log purged (%s reclaimed)', $purge_res['reclaimed_size']);
            }
        }

        // 8. Shield debug.log from public web access via .htaccess
        if (!empty($opts['block_debug_log_access'])) {
            $this->shield_debug_log();
            $actions_taken[] = 'Server access rules injected to deny public access to *.log files';
        }

        // Re-inspect status after modifications
        $new_status = $this->get_status();

        return [
            'success' => empty($errors),
            'message' => empty($errors) ? 'Production environment locked down successfully.' : 'Lockdown completed with warnings.',
            'actions_taken' => $actions_taken,
            'errors' => $errors,
            'backup_file' => basename($backup_file),
            'status' => $new_status
        ];
    }

    /**
     * Purge and remove physical debug.log
     */
    public function purge_debug_log() {
        $log_path = $this->get_debug_log_path();
        if (!file_exists($log_path)) {
            return [
                'success' => true,
                'purged' => false,
                'reclaimed_size' => '0 B',
                'message' => 'No debug.log file present.'
            ];
        }

        $size = @filesize($log_path);
        $size_str = $this->format_bytes($size);

        // Truncate first to zero bytes
        @file_put_contents($log_path, '');
        // Attempt deletion
        $deleted = @unlink($log_path);

        return [
            'success' => true,
            'purged' => true,
            'deleted' => $deleted,
            'reclaimed_size' => $size_str,
            'message' => "debug.log purged successfully ($size_str reclaimed)."
        ];
    }

    /**
     * Shield debug.log in wp-content using .htaccess
     */
    private function shield_debug_log() {
        $htaccess = WP_CONTENT_DIR . '/.htaccess';
        $rule_block = "\n# MDefender-Pro - Deny Access to Debug and Error Logs\n<FilesMatch \"\.(log|txt|bak|sql|ini)$\">\n  Order allow,deny\n  Deny from all\n</FilesMatch>\n";

        if (file_exists($htaccess)) {
            $curr = @file_get_contents($htaccess) ?: '';
            if (strpos($curr, 'MDefender-Pro - Deny Access to Debug') === false) {
                @file_put_contents($htaccess, $curr . $rule_block, FILE_APPEND | LOCK_EX);
            }
        } else {
            @file_put_contents($htaccess, $rule_block, LOCK_EX);
        }
    }

    /**
     * Helper to insert or replace define('CONSTANT', value) inside wp-config.php content safely
     */
    private function set_constant_in_content($content, $constant, $value, &$modified) {
        $pattern = "/define\s*\(\s*['\"]" . preg_quote($constant, '/') . "['\"]\s*,\s*[^)]+\s*\)\s*;/i";

        if (preg_match($pattern, $content)) {
            $new_line = "define( '{$constant}', {$value} );";
            $updated = preg_replace($pattern, $new_line, $content);
            if ($updated !== $content) {
                $modified = true;
                return $updated;
            }
            return $content;
        }

        // Constant does not exist yet; insert before /* That's all, stop editing! */
        $stop_marker = "/* That's all, stop editing!";
        $replacement = "define( '{$constant}', {$value} );\n";

        if (strpos($content, $stop_marker) !== false) {
            $content = str_replace($stop_marker, $replacement . $stop_marker, $content);
            $modified = true;
            return $content;
        }

        // Fallback: insert after <?php
        if (strpos($content, "<?php") !== false) {
            $content = preg_replace("/<\?php\s*/", "<?php\n" . $replacement, $content, 1);
            $modified = true;
            return $content;
        }

        return $content;
    }

    /**
     * Format byte sizes
     */
    private function format_bytes($bytes, $precision = 2) {
        if ($bytes <= 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $base = log($bytes, 1024);
        $floor = floor($base);
        return round(pow(1024, $base - $floor), $precision) . ' ' . ($units[$floor] ?? 'B');
    }
}
