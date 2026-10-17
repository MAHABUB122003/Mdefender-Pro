<?php
/**
 * MDefender Pro - Plugin Uninstallation & Database Purge
 *
 * Automatically triggered when the plugin is deleted via WP Admin.
 * Drops all MDefender tables and removes options for a 100% clean state.
 *
 * @package MDefender-Pro
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

global $wpdb;

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
    $wpdb->query("DROP TABLE IF EXISTS $table");
}

// Remove plugin configuration options
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE 'waf_%'");
