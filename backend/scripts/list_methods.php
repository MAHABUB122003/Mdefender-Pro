<?php
require 'C:/xampp/htdocs/mahabub/wp-load.php';
$scanner = WAF_FW_Scanner::instance();
$ref = new ReflectionClass($scanner);
$methods = [];
foreach ($ref->getMethods() as $m) {
    $methods[] = $m->getName();
}
echo "Available methods in WAF_FW_Scanner:\n" . implode("\n", $methods) . "\n";
