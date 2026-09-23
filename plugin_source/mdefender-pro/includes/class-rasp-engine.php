<?php
/**
 * MDefender-Pro In-Memory RASP Engine (Runtime Application Self-Protection)
 *
 * Implements real-time in-process security barriers:
 * 1. Database Query Sink Interception (Catches zero-day SQLi directly before execution in $wpdb).
 * 2. Unsafe PHP Object Deserialization Guard.
 * 3. Uploads & Cache Directory Execution Barrier (.htaccess & web.config protection).
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

        // 2. Enforce upload directory script execution barrier
        $this->enforce_uploads_execution_barrier();
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
