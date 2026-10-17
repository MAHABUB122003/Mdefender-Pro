<?php
/**
 * MDefender Pro - Plugin Uninstallation & Database Purge
 *
 * Automatically triggered when the plugin is deleted via WP Admin.
 * Checks user preference 'waf_fw_delete_data_on_uninstall' (default: 'yes').
 * If 'yes', drops all MDefender tables and removes all options for a 100% clean slate.
 *
 * @package MDefender-Pro
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

global $wpdb;

$delete_data = get_option('waf_fw_delete_data_on_uninstall', 'yes');

if ($delete_data !== 'no') {
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

    // Remove plugin configuration options
    $wpdb->query("DELETE FROM `{$wpdb->options}` WHERE `option_name` LIKE 'waf_%'");
    
    // Remove plugin transients
    $wpdb->query("DELETE FROM `{$wpdb->options}` WHERE `option_name` LIKE '_transient_waf_%' OR `option_name` LIKE '_transient_timeout_waf_%'");

    // Clear cron schedules
    wp_clear_scheduled_hook('waf_fw_cleanup_logs');
    wp_clear_scheduled_hook('waf_fw_scheduled_scan');
    wp_clear_scheduled_hook('waf_fw_file_integrity_check');
    wp_clear_scheduled_hook('waf_fw_cloud_heartbeat');
}
