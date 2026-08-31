<?php
defined('ABSPATH') || exit;

class WAF_FW_DB {
    private static $_instance = null;
    private $wpdb;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb ? $wpdb : ($GLOBALS['wpdb'] ?? null);
    }

    public function install_tables() {
        if (!$this->wpdb) {
            global $wpdb;
            $this->wpdb = $wpdb ? $wpdb : ($GLOBALS['wpdb'] ?? null);
        }
        if (!$this->wpdb) {
            return;
        }
        $charset = $this->wpdb->get_charset_collate();

        $attacks = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_ATTACKS . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            country_code VARCHAR(10) DEFAULT '',
            url TEXT NOT NULL,
            method VARCHAR(10) DEFAULT 'GET',
            attack_type VARCHAR(100) NOT NULL,
            confidence DECIMAL(5,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'blocked',
            user_agent TEXT,
            referer TEXT,
            request_body TEXT,
            rule_matched VARCHAR(200),
            reference_id VARCHAR(20),
            details LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip),
            INDEX idx_attack_type (attack_type),
            INDEX idx_created_at (created_at),
            INDEX idx_status (status)
        ) $charset;";

        $requests = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_REQUESTS . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            country_code VARCHAR(10) DEFAULT '',
            url TEXT NOT NULL,
            method VARCHAR(10) DEFAULT 'GET',
            status VARCHAR(20) DEFAULT 'allowed',
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        ) $charset;";

        $blacklist = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_BLACKLIST . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL UNIQUE,
            reason TEXT,
            type VARCHAR(20) DEFAULT 'permanent',
            auto_blocked TINYINT(1) DEFAULT 0,
            blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            block_expires_at DATETIME NULL DEFAULT NULL,
            INDEX idx_ip (ip),
            INDEX idx_type (type)
        ) $charset;";

        $login_attempts = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_LOGIN_ATTEMPTS . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            attempts INT DEFAULT 0,
            first_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip),
            INDEX idx_last_attempt (last_attempt)
        ) $charset;";

        $scan_results = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_SCAN_RESULTS . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            scan_type VARCHAR(50) DEFAULT 'full',
            target_url VARCHAR(500),
            vulnerabilities LONGTEXT,
            summary LONGTEXT,
            score INT DEFAULT 100,
            pages_scanned INT DEFAULT 0,
            issues_found INT DEFAULT 0,
            duration_seconds INT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'completed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_scan_type (scan_type),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        ) $charset;";

        $file_integrity = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_FILE_INTEGRITY . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            file_path TEXT NOT NULL,
            file_hash VARCHAR(64) NOT NULL,
            file_size BIGINT UNSIGNED DEFAULT 0,
            modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'known',
            INDEX idx_file_hash (file_hash),
            INDEX idx_status (status)
        ) $charset;";

        $file_changes = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_FILE_CHANGES . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            file_path TEXT NOT NULL,
            old_hash VARCHAR(64),
            new_hash VARCHAR(64),
            change_type VARCHAR(20) DEFAULT 'modified',
            file_size BIGINT UNSIGNED DEFAULT 0,
            detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'new',
            INDEX idx_change_type (change_type),
            INDEX idx_status (status),
            INDEX idx_detected_at (detected_at)
        ) $charset;";

        $scan_queue = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_SCAN_QUEUE . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            scan_type VARCHAR(20) DEFAULT 'full',
            status VARCHAR(20) DEFAULT 'pending',
            progress INT DEFAULT 0,
            current_stage VARCHAR(100),
            started_at DATETIME,
            completed_at DATETIME,
            total_files INT DEFAULT 0,
            scanned_files INT DEFAULT 0,
            results LONGTEXT,
            INDEX idx_status (status),
            INDEX idx_scan_type (scan_type)
        ) $charset;";

        $firewall_rules = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_FIREWALL_RULES . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            pattern TEXT NOT NULL,
            action VARCHAR(20) DEFAULT 'block',
            severity VARCHAR(20) DEFAULT 'high',
            enabled TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_enabled (enabled),
            INDEX idx_action (action)
        ) $charset;";

        $hardening_status = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_HARDENING . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            feature_name VARCHAR(100) NOT NULL UNIQUE,
            is_enabled TINYINT(1) DEFAULT 0,
            settings LONGTEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_feature (feature_name),
            INDEX idx_enabled (is_enabled)
        ) $charset;";

        $scan_files_queue = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_SCAN_FILES_QUEUE . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            scan_id BIGINT UNSIGNED NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            file_type VARCHAR(20) DEFAULT 'unknown',
            INDEX idx_scan_id (scan_id),
            INDEX idx_status (status)
        ) $charset;";

        $cleaned_backups = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}" . WAF_FW_TABLE_CLEANED_BACKUPS . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            scan_id BIGINT UNSIGNED NOT NULL,
            original_path VARCHAR(512) NOT NULL,
            backup_path VARCHAR(512) NOT NULL,
            file_hash VARCHAR(64) NOT NULL,
            cleaned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_scan_id (scan_id)
        ) $charset;";

        if (!function_exists('dbDelta')) {
            if (defined('ABSPATH') && file_exists(ABSPATH . 'wp-admin/includes/upgrade.php')) {
                require_once ABSPATH . 'wp-admin/includes/upgrade.php';
            }
        }
        if (function_exists('dbDelta')) {
            dbDelta($attacks);
            dbDelta($requests);
            dbDelta($blacklist);
            dbDelta($login_attempts);
            dbDelta($scan_results);
            dbDelta($file_integrity);
            dbDelta($file_changes);
            dbDelta($scan_queue);
            dbDelta($firewall_rules);
            dbDelta($hardening_status);
            dbDelta($scan_files_queue);
            dbDelta($cleaned_backups);
        }

        $this->maybe_add_block_expires_at_column();
        $this->maybe_add_country_code_column_to_attacks();
        $this->maybe_add_country_code_column_to_requests();
        $this->seed_default_firewall_rules();
        $this->fix_overaggressive_rules();
    }

    private function seed_default_firewall_rules() {
        $table = $this->wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $count = $this->wpdb->get_var("SELECT COUNT(*) FROM $table");
        if ($count > 0) return;

        $default_rules = [
            ['name' => 'SQL Injection - Union Select', 'pattern' => '/(?:\bUNION\b\s+\bSELECT\b)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SQL Injection - Drop Table', 'pattern' => '/(?:\bDROP\b\s+\bTABLE\b)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SQL Injection - OR 1=1', 'pattern' => "/(?:\bOR\b\s+.*\b1=1\b)/i", 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SQL Injection - Single Quote', 'pattern' => "/(?:%27\s*(?:OR|AND|--|#|\bUNION\b|;))|(?:\'\s*(?:OR|AND|--|#|\bUNION\b|;))/i", 'action' => 'block', 'severity' => 'high'],
            ['name' => 'XSS - Script Tag', 'pattern' => '/(?:<script[^>]*>[\s\S]*?<\/script>)|(?:<script[^>]*>)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'XSS - OnError', 'pattern' => '/(?:\bonerror\s*=\s*)/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'XSS - JavaScript Protocol', 'pattern' => '/(?:javascript\s*:\s*[\w\(])/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'XSS - Alert Function', 'pattern' => '/(?:alert\s*\(\s*(?:document\.cookie|document\.domain|location|window))/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'LFI - Directory Traversal', 'pattern' => '/(?:\.\.\/(?:\.\.\/){2,}|\.\.\\\\(?:\.\.\\\\){2,})/', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'LFI - etc/passwd', 'pattern' => '/(?:\/etc\/passwd)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'LFI - PHP Filter', 'pattern' => '/(?:php:\/\/filter)/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'Command Injection - Pipe', 'pattern' => "/(?:\b(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell)\s*\|)|(?:\|\s*(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell))|(?:`[^`]+`)|(?:\$\([\s\w\/]+\))/i", 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'Command Injection - System Commands', 'pattern' => '/(?:;\s*(?:ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell)\b)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'CSRF - Form Spoofing', 'pattern' => '/(?:<form[^>]*>.*?<\/form>)/i', 'action' => 'alert', 'severity' => 'medium'],
            ['name' => 'Path Traversal', 'pattern' => '/(?:\/proc\/self\/)/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'SSTI - Jinja2 Template', 'pattern' => '/(?:\{\{\s*\d+.*?\}\})/', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SSTI - Python Internals', 'pattern' => '/(?:__class__|__mro__|__subclasses__|__builtins__)/', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SSRF - Internal IP', 'pattern' => '/(?:(?:https?|ftp):\/\/.*(?:169\.254\.|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.))/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SSRF - Cloud Metadata', 'pattern' => '/(?:\/latest\/meta-data|\/computeMetadata|metadata\.google)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SSRF - Internal Hostnames', 'pattern' => '/(?:(?:https?|ftp):\/\/[^\/]*(?:localhost|\.local|\.internal))/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'XSS - Event Handlers', 'pattern' => '/(?:\bon\w+\s*=\s*(?:[`\\"\'].*?[`\\"\']|\w+))/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'SQL Injection - Benchmark', 'pattern' => '/(?:\bBENCHMARK\s*\()/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'SQL Injection - SLEEP', 'pattern' => '/(?:\bSLEEP\s*\()/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'RCE - PHP Code Execution', 'pattern' => '/(?:(?:base64_decode|eval|assert)\s*\(\s*\$_)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'RFI - Remote File Include', 'pattern' => '/(?:php:\/\/input|php:\/\/filter|data:\/\/|expect:\/\/)/i', 'action' => 'block', 'severity' => 'critical'],
            ['name' => 'LDAP Injection', 'pattern' => '/(?:\bLDAP\b\s*\w+\s*(?:&|\||!)\s*\w+)/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'XPath Injection', 'pattern' => '/(?:\bOR\b\s+\w+\s*=\s*\w+\s*(?:OR|AND))/i', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'Null Byte Injection', 'pattern' => '/(?:%00[^a-zA-Z])/', 'action' => 'block', 'severity' => 'high'],
            ['name' => 'Log Poisoning', 'pattern' => '/(?:<\?php\s+(?:\$_|system|eval|exec|passthru|shell_exec))/i', 'action' => 'block', 'severity' => 'critical'],
        ];

        foreach ($default_rules as $rule) {
            $this->wpdb->insert($table, $rule);
        }
    }

    public function fix_overaggressive_rules() {
        $table = $this->wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;

        $fixes = [
            // pipe rule: old bare pipe/backtick pattern -> context-aware
            [
                'old' => ["/(\||`|\$\(|\$\{)/i", "/(\||`|\$\(|\$\{)/"],
                'name' => 'Command Injection - Pipe',
                'new' => "/(?:\b(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell)\s*\|)|(?:\|\s*(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell))|(?:`[^`]+`)|(?:\$\([\s\w\/]+\))/i",
            ],
            // sql single quote: bare quote -> requires SQL keyword after
            [
                'old' => ["/(%27)|(')/"],
                'name' => 'SQL Injection - Single Quote',
                'new' => "/(?:%27\s*(?:OR|AND|--|#|\bUNION\b|;))|(?:\'\s*(?:OR|AND|--|#|\bUNION\b|;))/i",
            ],
            // union select: .* -> \s+
            [
                'old' => ["/(\bUNION\b.*\bSELECT\b)/i"],
                'name' => 'SQL Injection - Union Select',
                'new' => '/(?:\bUNION\b\s+\bSELECT\b)/i',
            ],
            // drop table: .* -> \s+
            [
                'old' => ["/(\bDROP\b.*\bTABLE\b)/i"],
                'name' => 'SQL Injection - Drop Table',
                'new' => '/(?:\bDROP\b\s+\bTABLE\b)/i',
            ],
            // or 1=1: .* -> \s+.*
            [
                'old' => ["/(\bOR\b.*\b1=1\b)/i"],
                'name' => 'SQL Injection - OR 1=1',
                'new' => "/(?:\bOR\b\s+.*\b1=1\b)/i",
            ],
            // directory traversal: bare ../ -> 3+ levels
            [
                'old' => ['/(\.\.\/|\.\.\\\\)/'],
                'name' => 'LFI - Directory Traversal',
                'new' => '/(?:\.\.\/(?:\.\.\/){2,}|\.\.\\\\(?:\.\.\\\\){2,})/',
            ],
            // ssrf internal ip: any ip -> requires http prefix
            [
                'old' => ["/(169\.254\.|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i"],
                'name' => 'SSRF - Internal IP',
                'new' => '/(?:(?:https?|ftp):\/\/.*(?:169\.254\.|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.))/i',
            ],
            // ssrf internal hostnames: bare localhost/.local -> requires http prefix or internal hostname
            [
                'old' => ["/(localhost|\.internal|\.local)/i"],
                'name' => 'SSRF - Internal Hostnames',
                'new' => '/(?:(?:https?|ftp):\/\/[^\/]*(?:localhost|\.local|\.internal))/i',
            ],
            // rfi: any url ending in .php -> only php wrappers
            [
                'old' => ['/((ftp|ftps|http|https):\/\/.*\.(php|asp|jsp|pl))/i'],
                'name' => 'RFI - Remote File Include',
                'new' => '/(?:php:\/\/input|php:\/\/filter|data:\/\/|expect:\/\/)/i',
            ],
            // rce: bare base64_decode/eval/assert -> requires $_ superglobal
            [
                'old' => ["/(base64_decode\s*\(|eval\s*\(|assert\s*\()/i"],
                'name' => 'RCE - PHP Code Execution',
                'new' => '/(?:(?:base64_decode|eval|assert)\s*\(\s*\$_)/i',
            ],
            // xss event handlers: bare on\w+= -> requires value after =
            [
                'old' => ["/(\bon\w+\s*=)/i"],
                'name' => 'XSS - Event Handlers',
                'new' => '/(?:\bon\w+\s*=\s*(?:[`\\"\'].*?[`\\"\']|\w+))/i',
            ],
            // xpath injection: bare OR ... = ... -> requires second OR/AND
            [
                'old' => ["/(\bOR\b.*\b\w+\b\s*=\s*\w+)/i"],
                'name' => 'XPath Injection',
                'new' => '/(?:\bOR\b\s+\w+\s*=\s*\w+\s*(?:OR|AND))/i',
            ],
            // log poisoning: bare <?php -> requires dangerous function
            [
                'old' => ["/(<\?php|\<\?=)/i"],
                'name' => 'Log Poisoning',
                'new' => '/(?:<\?php\s+(?:\$_|system|eval|exec|passthru|shell_exec))/i',
            ],
            // alert: bare alert( -> requires cookie/domain access
            [
                'old' => ["/(alert\s*\(.*\))/i"],
                'name' => 'XSS - Alert Function',
                'new' => '/(?:alert\s*\(\s*(?:document\.cookie|document\.domain|location|window))/i',
            ],
            // javascript protocol: bare javascript: -> requires code after
            [
                'old' => ["/(javascript\s*:)/i"],
                'name' => 'XSS - JavaScript Protocol',
                'new' => '/(?:javascript\s*:\s*[\w\(])/i',
            ],
            // ssti jinja2: bare {{...}} -> requires digit
            [
                'old' => ['/(\{\{.*\}\})/'],
                'name' => 'SSTI - Jinja2 Template',
                'new' => '/(?:\{\{\s*\d+.*?\}\})/',
            ],
            // null byte: bare %00 -> requires non-alpha after
            [
                'old' => ['/(%00|\\\x00)/'],
                'name' => 'Null Byte Injection',
                'new' => '/(?:%00[^a-zA-Z])/',
            ],
            // command injection system commands: remove trailing .* capture
            [
                'old' => ["/(;\s*(ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell))/i"],
                'name' => 'Command Injection - System Commands',
                'new' => '/(?:;\s*(?:ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell)\b)/i',
            ],
            // csrf form spoofing: no .* capture group needed
            [
                'old' => ['/(<form[^>]*>.*<\/form>)/i'],
                'name' => 'CSRF - Form Spoofing',
                'new' => '/(?:<form[^>]*>.*?<\/form>)/i',
            ],
            // ldap injection: broken pattern with empty alternative
            [
                'old' => ['/(\bLDAP\b.*\b(|&|\||!)\b)/i'],
                'name' => 'LDAP Injection',
                'new' => '/(?:\bLDAP\b\s*\w+\s*(?:&|\||!)\s*\w+)/i',
            ],
        ];

        foreach ($fixes as $fix) {
            foreach ($fix['old'] as $old_pattern) {
                $this->wpdb->query($this->wpdb->prepare(
                    "UPDATE $table SET pattern = %s WHERE pattern = %s AND name = %s",
                    $fix['new'], $old_pattern, $fix['name']
                ));
            }
        }
    }

    private function maybe_add_block_expires_at_column() {
        $table = $this->wpdb->prefix . WAF_FW_TABLE_BLACKLIST;
        $row = $this->wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'block_expires_at'");
        if (empty($row)) {
            $this->wpdb->query("ALTER TABLE $table ADD COLUMN block_expires_at DATETIME NULL DEFAULT NULL AFTER blocked_at");
        }
    }

    private function maybe_add_country_code_column_to_attacks() {
        $table = $this->wpdb->prefix . WAF_FW_TABLE_ATTACKS;
        $row = $this->wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'country_code'");
        if (empty($row)) {
            $this->wpdb->query("ALTER TABLE $table ADD COLUMN country_code VARCHAR(10) DEFAULT '' AFTER ip");
        }
    }

    private function maybe_add_country_code_column_to_requests() {
        $table = $this->wpdb->prefix . WAF_FW_TABLE_REQUESTS;
        $row = $this->wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'country_code'");
        if (empty($row)) {
            $this->wpdb->query("ALTER TABLE $table ADD COLUMN country_code VARCHAR(10) DEFAULT '' AFTER ip");
        }
    }

    public function set_default_options() {
        $defaults = [
            'waf_fw_security_level' => 'high',
            'waf_fw_confidence_threshold' => 0.7,
            'waf_fw_rate_limit' => 100,
            'waf_fw_ml_api_url' => 'https://api.mdefender-pro.io',
            'waf_fw_ml_api_key' => '',
            'waf_fw_website_id' => '',
            'waf_fw_site_token' => '',
            'waf_fw_connected' => 'no',
            'waf_fw_cloud_mode' => 'protect',
            'waf_fw_cloud_scope' => 'signal',
            'waf_fw_dashboard_url' => '',
            'waf_fw_stats_blocked' => 0,
            'waf_fw_stats_allowed' => 0,
            'waf_fw_block_message' => 'This request has been blocked by Web Application Firewall',
            'waf_fw_block_colors' => '#667eea,#764ba2',
            'waf_fw_email_alerts' => 'no',
            'waf_fw_admin_password' => '',
            'waf_fw_log_retention_days' => 30,
            'waf_fw_login_threshold' => 10,
            'waf_fw_login_block_duration' => 86400,
            'waf_fw_login_lockout_enabled' => 'yes',
            'waf_fw_attack_blocker_enabled' => 'yes',
            'waf_fw_protection_enabled' => 'yes',
            'waf_fw_attack_threshold' => 20,
            'waf_fw_attack_block_duration' => 86400,
            'waf_fw_attack_window' => 86400,
            'waf_fw_main_waf_api_url' => 'http://localhost:8000/api',
            'waf_fw_main_waf_admin_url' => 'http://localhost:8000/admin',
        ];
        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                update_option($key, $value);
            }
        }
    }

    public function get_attacks_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_ATTACKS;
    }

    public function get_requests_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_REQUESTS;
    }

    public function get_blacklist_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_BLACKLIST;
    }

    public function get_login_attempts_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_LOGIN_ATTEMPTS;
    }

    public function get_scan_results_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_SCAN_RESULTS;
    }

    public function get_file_integrity_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_FILE_INTEGRITY;
    }

    public function get_file_changes_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_FILE_CHANGES;
    }

    public function get_scan_queue_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_SCAN_QUEUE;
    }

    public function get_scan_files_queue_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_SCAN_FILES_QUEUE;
    }

    public function get_cleaned_backups_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_CLEANED_BACKUPS;
    }

    public function get_firewall_rules_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
    }

    public function get_hardening_table() {
        return $this->wpdb->prefix . WAF_FW_TABLE_HARDENING;
    }

    public static function cleanup_old_logs() {
        $days = get_option('waf_fw_log_retention_days', 30);
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}" . WAF_FW_TABLE_ATTACKS . " WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
            $days
        ));
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}" . WAF_FW_TABLE_REQUESTS . " WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
            $days
        ));

        $login_table = $wpdb->prefix . WAF_FW_TABLE_LOGIN_ATTEMPTS;
        $wpdb->query(
            "DELETE FROM $login_table WHERE last_attempt < DATE_SUB(NOW(), INTERVAL 1 DAY)"
        );

        $blacklist_table = $wpdb->prefix . WAF_FW_TABLE_BLACKLIST;
        $wpdb->query(
            "DELETE FROM $blacklist_table WHERE block_expires_at IS NOT NULL AND block_expires_at <= NOW()"
        );
    }
}
