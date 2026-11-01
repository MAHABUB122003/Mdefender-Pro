<?php
defined('ABSPATH') || exit;

/**
 * MDefender Pro - Enterprise Engine Registry
 *
 * Configures and registers all modular security engines into the
 * Service Container with lazy-loading and circuit-breaker isolation.
 *
 * @package MDefender-Pro
 * @subpackage Core
 */
class WAF_FW_Engine_Registry {

    /**
     * Bind all engines into the container
     *
     * @param WAF_FW_Service_Container $container
     */
    public static function register_all(WAF_FW_Service_Container $container) {

        // 1. Core WAF & Inspection Engines (Always active)
        $container->register('waf', function() {
            if (class_exists('WAF_FW_Engine')) {
                return WAF_FW_Engine::instance();
            }
            return null;
        }, false);

        // 2. RASP (Runtime Application Self-Protection)
        $container->register('rasp', function() {
            if (class_exists('WAF_FW_RASP_Engine')) {
                return WAF_FW_RASP_Engine::instance();
            }
            return null;
        }, false);

        // 3. IP Filter & Access Control (Blacklist, Whitelist, Country Geoblocking)
        $container->register('ip_filter', function() {
            if (class_exists('WAF_FW_IP_Filter')) {
                return WAF_FW_IP_Filter::instance();
            }
            return null;
        }, false);

        // 4. Rate Limiter (DDoS & Flooding Mitigation)
        $container->register('rate_limiter', function() {
            if (class_exists('WAF_FW_Rate_Limiter')) {
                return WAF_FW_Rate_Limiter::instance();
            }
            return null;
        }, false);

        // 5. Proof-of-Work Under Attack Shield
        $container->register('bot_shield', function() {
            if (class_exists('WAF_FW_Under_Attack_Shield')) {
                return WAF_FW_Under_Attack_Shield::instance();
            }
            return null;
        }, false);

        // 6. Cloudflare Turnstile Bot Defense
        $container->register('turnstile', function() {
            if (class_exists('WAF_FW_Turnstile')) {
                $instance = WAF_FW_Turnstile::instance();
                $instance->init();
                return $instance;
            }
            return null;
        }, false);

        // 7. Login Protector (Custom Secret Login Gateway & Brute Force Lockout)
        $container->register('login_protector', function() {
            if (class_exists('WAF_FW_Login_Protector')) {
                $instance = WAF_FW_Login_Protector::instance();
                $instance->register_hooks();
                return $instance;
            }
            return null;
        }, false);

        // 8. Two-Factor Authentication (2FA TOTP & Recovery)
        $container->register('two_factor', function() {
            if (class_exists('WAF_FW_2FA')) {
                return WAF_FW_2FA::instance();
            }
            return null;
        }, false);

        // 9. Admin Panel & Login Gateway IP Access Lockdown
        $container->register('admin_ip_access', function() {
            if (class_exists('WAF_FW_Admin_Panel_IP')) {
                return WAF_FW_Admin_Panel_IP::instance();
            }
            return null;
        }, false);

        // 10. Zero-Trust Security Hardening Suite (Directives)
        $container->register('hardening', function() {
            if (class_exists('WAF_FW_Website_Hardening')) {
                return WAF_FW_Website_Hardening::instance();
            }
            return null;
        }, false);

        // 11. Core File Integrity & Tamper Monitor
        $container->register('core_integrity', function() {
            if (class_exists('WAF_FW_Core_Integrity')) {
                return WAF_FW_Core_Integrity::instance();
            }
            return null;
        }, false);

        // 12. Post-Hack Automated Recovery
        $container->register('posthack_recovery', function() {
            if (class_exists('WAF_FW_PostHack_Recovery')) {
                return WAF_FW_PostHack_Recovery::instance();
            }
            return null;
        }, false);

        // 13. Attack Blocker (Brute-force dynamic blocker)
        $container->register('attack_blocker', function() {
            if (class_exists('WAF_FW_Attack_Blocker')) {
                return WAF_FW_Attack_Blocker::instance();
            }
            return null;
        }, false);

        // 14. Malware Scanner (Admin & background cron only - deferred from frontend)
        $container->register('scanner', function() {
            if (class_exists('WAF_FW_Scanner')) {
                return WAF_FW_Scanner::instance();
            }
            return null;
        }, true);

        // 15. Backup & Disaster Recovery Engine (Admin & cron only)
        $container->register('backup', function() {
            if (class_exists('WAF_FW_Backup_Engine')) {
                return WAF_FW_Backup_Engine::instance();
            }
            return null;
        }, true);

        // 16. Admin Ajax Handlers (Only loaded when doing AJAX)
        $container->register('ajax_handler', function() {
            if (class_exists('WAF_FW_Ajax_Handler')) {
                return new WAF_FW_Ajax_Handler();
            }
            return null;
        }, false);

        // 17. Admin UI Controller (Admin context only)
        $container->register('admin_ui', function() {
            if (class_exists('WAF_FW_Admin')) {
                return new WAF_FW_Admin();
            }
            return null;
        }, true);

        // Extensibility hook: Allow third-party or future custom engines to register
        do_action('mdefender_register_custom_engines', $container);
    }
}

