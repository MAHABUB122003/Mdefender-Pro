<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'C:/xampp/htdocs/mahabub/wp-load.php';

$s = WAF_FW_Scanner::instance();
try {
    $res = $s->process_scan_batch(21);
    echo "Batch result:\n";
    print_r($res);
} catch (Throwable $e) {
    echo "Exception: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
