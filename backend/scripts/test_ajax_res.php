<?php
require 'C:/xampp/htdocs/mahabub/wp-load.php';
wp_set_current_user(1);
$ajax = new WAF_FW_Ajax_Handler();
ob_start();
$ajax->get_active_or_last_scan();
$out = ob_get_clean();
echo substr($out, 0, 500) . "\n";
