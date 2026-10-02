<?php
$c = mysqli_connect('127.0.0.1', 'root', '', 'mahabub');
if (!$c) {
    die("Connection failed: " . mysqli_connect_error() . "\n");
}
$res = mysqli_query($c, "SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'waf_%' OR option_name IN ('siteurl', 'home', 'active_plugins')");
while ($r = mysqli_fetch_assoc($res)) {
    $v = $r['option_value'] ?? '';
    if (strlen($v) > 120) $v = substr($v, 0, 120) . '...';
    echo $r['option_name'] . ' = ' . $v . "\n";
}
