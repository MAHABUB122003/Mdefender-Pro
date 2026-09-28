<?php
// Set up mock server environment
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/mahabub/';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['SERVER_NAME'] = 'localhost';
$_SERVER['DOCUMENT_ROOT'] = 'C:/xampp/htdocs';

// Load WordPress
require 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "WordPress loaded successfully!\n";
echo "Site URL: " . get_option('siteurl') . "\n";
echo "Active Plugins:\n";
print_r(get_option('active_plugins'));
echo "\nLocal Blacklist Cache:\n";
print_r(get_option('waf_fw_local_blacklist_cache'));
echo "\nBlocked Countries:\n";
print_r(get_option('waf_fw_blocked_countries'));
