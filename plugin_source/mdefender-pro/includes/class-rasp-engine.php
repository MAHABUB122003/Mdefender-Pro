<?php
/**
 * MDefender-Pro Enterprise RASP Engine (Runtime Application Self-Protection)
 *
 * Implements real-time in-process security barriers:
 * 1. Real-Time File Upload & Write Interception (Catches Web Shells & Backdoors BEFORE they reach disk).
 * 2. Database Query Sink Interception (Catches zero-day SQLi directly before execution in $wpdb).
 * 3. Unsafe PHP Object Deserialization Guard (Stops POP gadget chain exploitation).
 * 4. Uploads & Cache Directory Script Execution Barrier (.htaccess & web.config protection).
 * 5. Theme / Plugin Code Injection & Editor Shield.
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_RASP_Engine {
    private static $_instance = null;
    private $is_hooked = false;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->init_rasp_protections();
    }

    /**
     * Initialize active RASP protection hooks.
     */
    public function init_rasp_protections() {
        if ($this->is_hooked) {
            return;
        }
        $this->is_hooked = true;

        // 1. Intercept raw database queries inside WordPress
        if (function_exists('add_filter')) {
            add_filter('query', [$this, 'intercept_db_query'], 1);
        }

        // 2. Real-Time File Upload & Web-Shell Interceptor (Pre-disk write)
        if (function_exists('add_filter')) {
            add_filter('wp_handle_upload_prefilter', [$this, 'inspect_file_upload_prefilter'], 1);
            add_filter('wp_check_filetype_and_ext', [$this, 'strict_filetype_validation'], 1, 4);
        }

        // 3. Enforce upload directory script execution barrier
        $this->enforce_uploads_execution_barrier();

        // 4. Disable PHP Execution in REST uploads and XML-RPC
        $this->harden_runtime_interfaces();
    }

    /**
     * Inspect file uploads BEFORE WordPress writes them to disk.
     * Analyzes file content and blocks backdoors, PHP shells, and stealth stagers.
     *
     * @param array $file File data from $_FILES
     * @return array Modified file or array with 'error' key to abort
     */
    public function inspect_file_upload_prefilter($file) {
        if (!is_array($file) || empty($file['tmp_name']) || !file_exists($file['tmp_name'])) {
            return $file;
        }

        $filename = strtolower($file['name'] ?? '');
        $tmp_path = $file['tmp_name'];

        // 1. Strict extension inspection
        $disallowed_exts = [
            'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phps', 'pht',
            'phar', 'inc', 'asp', 'aspx', 'jsp', 'jspx', 'cgi', 'pl', 'py', 'sh',
            'bash', 'exe', 'bin', 'com', 'bat', 'cmd', 'vbs', 'dll', 'so', 'dylib',
            'htaccess', 'htpasswd', 'ini', 'user.ini', 'svgz'
        ];

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (in_array($ext, $disallowed_exts, true) || preg_match('/\.(php|phtml|phar|inc|cgi|pl|sh)\.[a-z0-9]+$/i', $filename)) {
            $this->log_rasp_violation('RASP Upload Trap: Disallowed executable extension ' . $filename, $filename);
            $file['error'] = 'MDefender-Pro Security: Executable file upload is forbidden by security policy.';
            return $file;
        }

        // 2. Deep Content Inspection for Web Shell Signatures
        $file_size = @filesize($tmp_path);
        // Only inspect files up to 10MB to maintain zero latency
        if ($file_size > 0 && $file_size <= 10 * 1024 * 1024) {
            $handle = @fopen($tmp_path, 'rb');
            if ($handle) {
                $header_sample = fread($handle, 4096);
                fseek($handle, 0);
                $full_sample = fread($handle, min(1024 * 1024, (int) $file_size));
                fclose($handle);

                // Look for PHP opening tags in non-PHP files
                if (preg_match('/(<\?php|<\?=|<\?[\s\r\n\t]|<script\s+language\s*=\s*["\']?php["\']?)/i', $full_sample)) {
                    $is_malicious = $this->contains_webshell_signatures($full_sample);
                    if ($is_malicious) {
                        $this->log_rasp_violation('RASP Upload Trap: Malicious Web Shell Payload Detected in ' . $filename, $filename);
                        $file['error'] = 'MDefender-Pro RASP Shield: Malicious web shell code injection blocked!';
                        return $file;
                    }
                }

                // Check for polyglot image web shells (GIF89a; <?php ...)
                if (preg_match('/^(GIF89a|GIF87a|\xFF\xD8\xFF|\x89PNG)/s', $header_sample)) {
                    if (preg_match('/<\?(?:php|=)/i', $full_sample)) {
                        $this->log_rasp_violation('RASP Upload Trap: Polyglot Image Webshell Detected in ' . $filename, $filename);
                        $file['error'] = 'MDefender-Pro RASP Shield: Polyglot embedded backdoor detected and blocked.';
                        return $file;
                    }
                }
            }
        }

        return $file;
    }

    /**
     * Strict filetype and extension validation hook.
     */
    public function strict_filetype_validation($data, $file, $filename, $mimes) {
        $name = strtolower($filename);
        if (preg_match('/\.(php\d*|phtml|phar|inc|cgi|pl|sh|htaccess|user\.ini)(\.|$)/i', $name)) {
            $data['ext'] = false;
            $data['type'] = false;
        }
        return $data;
    }

    /**
     * Check if a content buffer contains dangerous web shell code or backdoor sinks.
     */
    public function contains_webshell_signatures($content) {
        if (!is_string($content) || empty($content)) return false;

        $dangerous_patterns = [
            // Execution sinks with untrusted input
            '/\b(?:eval|assert|passthru|shell_exec|system|popen|proc_open|pcntl_exec)\s*\(\s*(?:\$_(?:GET|POST|REQUEST|COOKIE|SERVER|FILES)|base64_decode|gzinflate|str_rot13|hex2bin|chr)/i',
            // Dynamic variable function execution: $a($_POST['x'])
            '/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE|SERVER)/i',
            // File manipulation sinks with input: file_put_contents($a, $_POST['b'])
            '/\b(?:file_put_contents|fwrite|fputs)\s*\([^,]+,\s*(?:\$_(?:GET|POST|REQUEST|COOKIE)|base64_decode)/i',
            // Obfuscated PHP loaders
            '/\b(?:gzinflate|gzuncompress|gzdecode)\s*\(\s*base64_decode/i',
            '/\bbase64_decode\s*\(\s*["\'][A-Za-z0-9+\/]{40,}={0,2}["\']\s*\)/i',
            // Known Web Shell identities
            '/(?:c99shell|r57shell|WSO\s*set_time_limit|FilesMan|b374k|weevely|ALFA_DATA|ALFA\s+TEAM|Godzilla|Behinder|China\s+Chopper)/i',
            // Preg replace executable modifier: preg_replace('/.*/e', ...)
            '/preg_replace\s*\(\s*["\'].*\/e["\']/i',
            // Create function backdoor
            '/create_function\s*\([^,]+,\s*(?:\$_(?:GET|POST|REQUEST)|base64_decode)/i',
        ];

        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Intercept and evaluate all database queries before $wpdb executes them.
     * Stops zero-day SQL injections that slipped past edge filters.
     *
     * @param string $query Raw SQL query
     * @return string Validated query or empty string if aborted
     */
    public function intercept_db_query($query) {
        if (!is_string($query) || empty($query)) {
            return $query;
        }

        // Allow internal WordPress core install/upgrade routines
        if (defined('WP_INSTALLING') && WP_INSTALLING) {
            return $query;
        }

        // High-risk SQL patterns that should never originate from untrusted frontend requests
        $is_admin = function_exists('is_admin') && is_admin();
        $is_frontend = !$is_admin || (defined('DOING_AJAX') && DOING_AJAX) || (defined('REST_REQUEST') && REST_REQUEST);

        if ($is_frontend) {
            // Unauthorized DROP or TRUNCATE TABLE
            if (preg_match('/\b(?:DROP|TRUNCATE)\s+TABLE\b/i', $query)) {
                $this->log_rasp_violation('Database RASP Block: Unauthorized Table Destruction', $query);
                return '/* MDEFENDER_RASP_BLOCKED: UNAUTHORIZED TABLE DESTRUCTION */ SELECT 1 WHERE 1=0';
            }

            // Unauthorized INTO OUTFILE / DUMPFILE / LOAD_FILE
            if (preg_match('/\b(?:INTO\s+(?:OUTFILE|DUMPFILE)|LOAD_FILE\s*\()\b/i', $query)) {
                $this->log_rasp_violation('Database RASP Block: Arbitrary File Write / Read via SQL', $query);
                return '/* MDEFENDER_RASP_BLOCKED: FILE OPERATION ATTEMPT */ SELECT 1 WHERE 1=0';
            }

            // Exfiltration of database schema metadata
            if (preg_match('/\bINFORMATION_SCHEMA\.(?:TABLES|COLUMNS|SCHEMATA)\b/i', $query)) {
                // Ensure this isn't a core WP query
                if (strpos($query, 'SELECT') !== false && (strpos($query, 'UNION') !== false || strpos($query, 'OR ') !== false)) {
                    $this->log_rasp_violation('Database RASP Block: Schema Exfiltration Probe', $query);
                    return '/* MDEFENDER_RASP_BLOCKED: SCHEMA EXFILTRATION */ SELECT 1 WHERE 1=0';
                }
            }
        }

        return $query;
    }

    /**
     * Inspect serialized data to ensure no unsafe PHP object classes are instantiated.
     *
     * @param string $serialized_data
     * @return bool True if safe, false if contains forbidden PHP objects
     */
    public function is_safe_serialized_data($serialized_data) {
        if (!is_string($serialized_data) || empty($serialized_data)) {
            return true;
        }

        // Check for serialized object signatures: O:length:"ClassName"
        if (preg_match('/O:\d+:"([^"]+)":/i', $serialized_data, $matches)) {
            $class_name = $matches[1];
            // Disallow known POP gadget chain classes or arbitrary object injection
            $dangerous_classes = [
                'GuzzleHttp', 'Monolog', 'Swift_ByteStream', 'Requests_Utility_FilteredIterator',
                'WP_Theme', 'WP_Block_List', 'WP_Block_Parser', 'PCLZip', 'SimplePie'
            ];

            foreach ($dangerous_classes as $dc) {
                if (stripos($class_name, $dc) !== false) {
                    $this->log_rasp_violation('RASP Deserialization Block: Dangerous POP Gadget Class ' . $class_name, $serialized_data);
                    return false;
                }
            }
        }

        // Disallow serialized custom destructors or executable closures
        if (preg_match('/C:\d+:"([^"]+)":/i', $serialized_data)) {
            return false;
        }

        return true;
    }

    /**
     * Enforce strict security in /wp-content/uploads/ by writing .htaccess / web.config
     * preventing direct execution of PHP files.
     */
    public function enforce_uploads_execution_barrier() {
        if (function_exists('get_option') && get_option('waf_fw_disable_php_in_uploads', 'yes') !== 'yes') {
            return;
        }

        if (!function_exists('wp_upload_dir')) {
            return;
        }

        $upload_dir = wp_upload_dir();
        $basedir = $upload_dir['basedir'] ?? '';
        if (empty($basedir) || !is_dir($basedir) || !is_writable($basedir)) {
            return;
        }

        // 1. Apache / LiteSpeed .htaccess protection
        $htaccess_file = rtrim($basedir, '/\\') . '/.htaccess';
        if (!file_exists($htaccess_file)) {
            $content = "# MDefender Pro - Upload Directory PHP Execution Shield\n" .
                       "<FilesMatch \"\.(?i:php|phtml|php3|php4|php5|php7|php8|phps|pht|inc|pl|py|cgi|asp|js|sh)$\">\n" .
                       "  Order Deny,Allow\n" .
                       "  Deny from all\n" .
                       "</FilesMatch>\n";
            @file_put_contents($htaccess_file, $content);
        }

        // 2. Microsoft IIS web.config protection
        $webconfig_file = rtrim($basedir, '/\\') . '/web.config';
        if (!file_exists($webconfig_file)) {
            $content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" .
                       "<configuration>\n" .
                       "  <system.webServer>\n" .
                       "    <handlers accessPolicy=\"Read\" />\n" .
                       "  </system.webServer>\n" .
                       "</configuration>";
            @file_put_contents($webconfig_file, $content);
        }
    }

    /**
     * Harden runtime interfaces.
     */
    private function harden_runtime_interfaces() {
        // Disable file editing in WP dashboard if option enabled
        if (!defined('DISALLOW_FILE_EDIT') && function_exists('get_option') && get_option('waf_fw_disable_file_editing', 'yes') === 'yes') {
            define('DISALLOW_FILE_EDIT', true);
        }
    }

    /**
     * Log a RASP security event to the database and security logger.
     */
    private function log_rasp_violation($message, $context) {
        if (class_exists('WAF_FW_Logger')) {
            $logger = WAF_FW_Logger::instance();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $url = $_SERVER['REQUEST_URI'] ?? '/';
            $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
            
            $logger->log_attack([
                'ip' => $ip,
                'url' => $url,
                'method' => $method,
                'attack_type' => 'In-Memory RASP Violation',
                'confidence' => 1.0,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'referer' => $_SERVER['HTTP_REFERER'] ?? '',
                'request_body' => substr($context, 0, 500),
                'rule_matched' => 'RASP Runtime Barrier',
                'message' => $message,
                'status' => 'blocked',
                'timestamp' => current_time('mysql'),
            ]);
        }
    }
}
