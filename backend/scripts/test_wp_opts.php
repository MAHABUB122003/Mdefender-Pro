<?php
$mysqli = new mysqli('127.0.0.1', 'root', '', 'mahabub');
if ($mysqli->connect_error) {
    die("Connect error: " . $mysqli->connect_error . "\n");
}
$res = $mysqli->query("SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'waf_%'");
while ($row = $res->fetch_assoc()) {
    if (preg_match('/(api_key|token|blocked_countries|blacklist|cloud)/i', $row['option_name'])) {
        echo $row['option_name'] . ': ' . substr($row['option_value'], 0, 100) . "\n";
    }
}
$res2 = $mysqli->query("SELECT COUNT(*) as c FROM wp_waf_attacks");
$row2 = $res2->fetch_assoc();
echo "Total attacks in wp_waf_attacks: " . $row2['c'] . "\n";

$res3 = $mysqli->query("SELECT COUNT(*) as c FROM wp_waf_requests");
$row3 = $res3->fetch_assoc();
echo "Total requests in wp_waf_requests: " . $row3['c'] . "\n";

$res4 = $mysqli->query("SELECT * FROM wp_waf_blacklist");
echo "Total rows in wp_waf_blacklist: " . $res4->num_rows . "\n";
while ($b = $res4->fetch_assoc()) {
    echo "Blacklist entry: IP=" . $b['ip'] . " Reason=" . $b['reason'] . "\n";
}
