<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

define('WP_USE_THEMES', false);
define('WP_DEBUG', true);
define('WP_DEBUG_DISPLAY', true);

require 'C:/xampp/htdocs/mahabub/wp-load.php';

$h = WAF_FW_Website_Hardening::instance();
try {
    $one_click_result = $h->one_click_harden();
    print_r($one_click_result);
} catch (Throwable $e) {
    echo "Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . PHP_EOL;
    echo $e->getTraceAsString() . PHP_EOL;
}
