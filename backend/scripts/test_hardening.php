<?php
define('WP_USE_THEMES', false);
require 'C:/xampp/htdocs/mahabub/wp-load.php';

$h = WAF_FW_Website_Hardening::instance();
$rep = $h->generate_report();
echo "Current Hardening Score: " . $rep['score'] . " / 100, Enabled: " . $rep['enabled_count'] . " / " . $rep['total_features'] . PHP_EOL;

echo "--- Testing 1-Click Harden All ---" . PHP_EOL;
$one_click = $h->harden_all();
echo "1-Click applied: " . count($one_click['applied']) . " features, Failed: " . count($one_click['failed']) . PHP_EOL;

$rep2 = $h->generate_report();
echo "New Hardening Score: " . $rep2['score'] . " / 100, Enabled: " . $rep2['enabled_count'] . " / " . $rep2['total_features'] . ", Grade: " . $rep2['grade'] . PHP_EOL;
