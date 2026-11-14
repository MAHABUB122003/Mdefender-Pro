<?php
/**
 * MDefender Pro - Enterprise Plugin Uninstallation & Database Purge
 *
 * Automatically triggered when the plugin is deleted via WP Admin.
 * Completely cleanses database tables, WordPress options, scheduled cron jobs,
 * transients, and fast caches to guarantee a 100% fresh slate for future installations.
 *
 * @package MDefender-Pro
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

global $wpdb;

// 1. Notify MDefender Pro Cloud Service (Graceful Disconnect Beacon)
try {
    $cloud_url = get_option('waf_fw_cloud_api_url', get_option('waf_fw_ml_api_url', ''));
    $api_key = get_option('waf_fw_api_key', get_option('waf_fw_ml_api_key', ''));
    $site_token = get_option('waf_fw_site_token', '');
    $website_id = get_option('waf_fw_website_id', '');

    if (!empty($cloud_url) && !empty($api_key)) {
        $domain = parse_url(home_url(), PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'unknown');
        @wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/disconnect', [
            'timeout' => 4,
            'sslverify' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ],
            'body' => wp_json_encode([
                'api_key' => $api_key,
                'domain' => $domain,
                'website_id' => $website_id,
                'site_token' => $site_token,
                'uninstalled' => true,
                'reason' => 'plugin_deleted'
            ])
        ]);
    }
} catch (\Throwable $e) {
    // Fail-safe: Network timeouts must never impede local uninstallation
}

// 2. Clear Scheduled Cron Hooks
$scheduled_hooks = [
    'waf_fw_cleanup_logs',
    'waf_fw_scheduled_scan',
    'waf_fw_file_integrity_check',
    'waf_fw_cloud_heartbeat',
    'waf_fw_run_scan_batch',
    'waf_fw_security_audit',
    'mdefender_hourly_sync',
    'mdefender_daily_cleanup',
];
foreach ($scheduled_hooks as $hook) {
    wp_clear_scheduled_hook($hook);
}

// 3. Purge Database Tables
$tables = [
    $wpdb->prefix . 'waf_attacks',
    $wpdb->prefix . 'waf_requests',
    $wpdb->prefix . 'waf_blacklist',
    $wpdb->prefix . 'waf_login_attempts',
    $wpdb->prefix . 'waf_scan_results',
    $wpdb->prefix . 'waf_file_integrity',
    $wpdb->prefix . 'waf_file_changes',
    $wpdb->prefix . 'waf_scan_queue',
    $wpdb->prefix . 'waf_firewall_rules',
    $wpdb->prefix . 'waf_hardening_status',
    $wpdb->prefix . 'waf_scan_files_queue',
    $wpdb->prefix . 'waf_cleaned_backups',
    $wpdb->prefix . 'waf_security_events',
];

foreach ($tables as $table) {
    $wpdb->query("DROP TABLE IF EXISTS `{$table}`");
}

// 4. Remove All Configuration Options & Credentials (Unconditional for Security)
$wpdb->query("DELETE FROM `{$wpdb->options}` WHERE `option_name` LIKE 'waf_%' OR `option_name` LIKE 'mdefender_%'");

// 5. Remove All Transients & Cached Nonces
$wpdb->query("DELETE FROM `{$wpdb->options}` WHERE `option_name` LIKE '_transient_waf_%' OR `option_name` LIKE '_transient_timeout_waf_%' OR `option_name` LIKE '_transient_mdefender_%' OR `option_name` LIKE '_transient_timeout_mdefender_%'");

// 6. Multisite Network Cleanup (if applicable)
if (is_multisite()) {
    $blog_ids = $wpdb->get_col("SELECT blog_id FROM {$wpdb->blogs}");
    foreach ($blog_ids as $b_id) {
        $prefix = $wpdb->get_blog_prefix($b_id);
        foreach ($tables as $t) {
            $blog_table = preg_replace('/^' . preg_quote($wpdb->prefix, '/') . '/', $prefix, $t);
            $wpdb->query("DROP TABLE IF EXISTS `{$blog_table}`");
        }
        $options_table = $prefix . 'options';
        $wpdb->query("DELETE FROM `{$options_table}` WHERE `option_name` LIKE 'waf_%' OR `option_name` LIKE 'mdefender_%'");
        $wpdb->query("DELETE FROM `{$options_table}` WHERE `option_name` LIKE '_transient_waf_%' OR `option_name` LIKE '_transient_timeout_waf_%'");
    }
    if (!empty($wpdb->sitemeta)) {
        $wpdb->query("DELETE FROM `{$wpdb->sitemeta}` WHERE `meta_key` LIKE 'waf_%' OR `meta_key` LIKE 'mdefender_%'");
    }
}

// 7. Flush Runtime Fast Caches & Temporary Artifacts
if (function_exists('apcu_delete')) {
    @apcu_delete('mdefender_waf_fast_cache');
}

$cache_file = __DIR__ . '/includes/data/waf_fast_cache.json';
if (file_exists($cache_file)) {
    @unlink($cache_file);
}
