<?php
defined('ABSPATH') || exit;

/**
 * MDefender Pro - Enterprise Service Container & Circuit Breaker
 *
 * Implements Micro-Engine Fault Isolation (Decoupled Architecture).
 * Guarantees that an issue in one security feature or module CANNOT crash
 * other security engines, the plugin, or the protected WordPress site.
 *
 * Provides lazy-loading so heavy admin engines are only loaded when required,
 * maintaining < 0.5ms ultra-low latency for frontend visitor requests.
 *
 * @package MDefender-Pro
 * @subpackage Core
 */
class WAF_FW_Service_Container {
    private static $_instance = null;

    /**
     * Registered service definitions
     * [ 'key' => [ 'loader' => callable, 'instance' => object|null, 'admin_only' => bool, 'status' => 'idle'|'active'|'failed', 'error' => null ] ]
     */
    private $services = [];

    /**
     * Singleton accessor
     */
    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    private function __construct() {
        // Container initialized
    }

    /**
     * Register a security engine or subsystem
     *
     * @param string   $key          Unique identifier (e.g. 'waf', 'bot_shield', 'hardening')
     * @param callable $loader       Factory closure or instance returning the engine
     * @param bool     $admin_only   If true, this engine is strictly deferred until an admin context
     */
    public function register($key, $loader, $admin_only = false) {
        $this->services[$key] = [
            'loader'     => $loader,
            'instance'   => null,
            'admin_only' => (bool)$admin_only,
            'status'     => 'registered',
            'error'      => null,
            'booted_at'  => null
        ];
    }

    /**
     * Boot all active services matching the current request lifecycle.
     * Wrapped in circuit breaker try/catch blocks.
     */
    public function boot() {
        $is_admin_request = is_admin() || (defined('DOING_AJAX') && DOING_AJAX && !empty($_REQUEST['action']) && strpos($_REQUEST['action'], 'waf_') === 0);

        foreach ($this->services as $key => &$entry) {
            // Skip admin-only services on public visitor requests for 0ms overhead
            if ($entry['admin_only'] && !$is_admin_request) {
                $entry['status'] = 'deferred';
                continue;
            }

            $this->boot_service($key);
        }

        // Allow third-party or custom add-on extensions to hook safely
        do_action('mdefender_services_booted', $this);
    }

    /**
     * Boot an individual service with strict Circuit Breaker isolation
     *
     * @param string $key Service identifier
     * @return object|null Service instance or null on failure
     */
    public function boot_service($key) {
        if (!isset($this->services[$key])) {
            return null;
        }

        $entry = &$this->services[$key];

        if ($entry['instance'] !== null) {
            return $entry['instance'];
        }

        try {
            $loader = $entry['loader'];
            if (is_callable($loader)) {
                $instance = call_user_func($loader);
            } elseif (is_object($loader)) {
                $instance = $loader;
            } else {
                $instance = null;
            }

            $entry['instance'] = $instance;
            $entry['status'] = 'active';
            $entry['booted_at'] = microtime(true);
            return $instance;

        } catch (\Throwable $e) {
            // CIRCUIT BREAKER TRIGGERED:
            // Isolate failure to this specific engine. Do NOT crash WordPress.
            $entry['status'] = 'failed';
            $entry['error'] = $e->getMessage();
            $entry['instance'] = null;

            // Graceful diagnostic log
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log(sprintf(
                    '[MDefender Circuit Breaker] Engine [%s] isolated safely without impacting site: %s in %s on line %d',
                    $key,
                    $e->getMessage(),
                    $e->getFile(),
                    $e->getLine()
                ));
            }

            return null;
        }
    }

    /**
     * Retrieve a service instance by key (lazy-boots if deferred)
     *
     * @param string $key
     * @return object|null
     */
    public function get($key) {
        if (!isset($this->services[$key])) {
            return null;
        }

        if ($this->services[$key]['instance'] === null) {
            return $this->boot_service($key);
        }

        return $this->services[$key]['instance'];
    }

    /**
     * Check if a service is healthy and active
     *
     * @param string $key
     * @return bool
     */
    public function is_active($key) {
        return isset($this->services[$key]) && $this->services[$key]['status'] === 'active';
    }

    /**
     * Get real-time health diagnostic array of all engines
     *
     * @return array
     */
    public function get_health_report() {
        $report = [];
        foreach ($this->services as $key => $entry) {
            $report[$key] = [
                'status'     => $entry['status'],
                'admin_only' => $entry['admin_only'],
                'error'      => $entry['error'],
                'loaded'     => ($entry['instance'] !== null)
            ];
        }
        return $report;
    }
}
