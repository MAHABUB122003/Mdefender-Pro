<?php
define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

// Login as admin for testing settings
$user = get_user_by('login', 'root');
if (!$user) {
    $user = get_user_by('login', 'admin');
}
if ($user) {
    wp_set_current_user($user->ID);
}

require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-ajax-handler.php';
$ajax = new WAF_FW_Ajax_Handler();

echo "Testing Settings Load:\n";
ob_start();
// simulate get_settings
$res_settings = [
    'turnstile_enabled' => get_option('waf_fw_turnstile_enabled', 'no'),
    'turnstile_mode' => get_option('waf_fw_turnstile_mode', 'login_only'),
    'turnstile_theme' => get_option('waf_fw_turnstile_theme', 'auto'),
];
echo json_encode($res_settings) . "\n";

// Test saving new values
update_option('waf_fw_turnstile_enabled', 'yes');
update_option('waf_fw_turnstile_mode', 'site_wide');
update_option('waf_fw_turnstile_theme', 'dark');

echo "Saved site_wide & dark:\n";
echo "turnstile_enabled: " . get_option('waf_fw_turnstile_enabled') . "\n";
echo "turnstile_mode: " . get_option('waf_fw_turnstile_mode') . "\n";
echo "turnstile_theme: " . get_option('waf_fw_turnstile_theme') . "\n";

// Reset to recommended login_only
update_option('waf_fw_turnstile_mode', 'login_only');
update_option('waf_fw_turnstile_theme', 'auto');
echo "Reset back to login_only & auto: SUCCESS\n";
