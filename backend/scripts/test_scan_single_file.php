<?php
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

$scanner = WAF_FW_Scanner::instance();

$planted_samples = [
    'wp-content/uploads/shell_eval_b64.php',
    'wp-content/plugins/rce_backdoor.php',
    'wp-content/uploads/china_chopper.php',
    'wp-content/uploads/obfuscated_trojan.php',
    'wp-content/uploads/var_func_call.php',
    'wp-content/uploads/seo_spam_redirect.php',
    'wp-content/uploads/crypto_miner.js',
    'wp-content/uploads/.env.backup',
    'wp-content/plugins/create_backdoor_admin.php',
    'wp-content/uploads/chr_hex_webshell.php',
];

echo "=== DIRECT SINGLE FILE MULTI-SIGNAL SCAN TEST ===\n\n";

foreach ($planted_samples as $rel) {
    $full = 'C:/xampp/htdocs/mahabub/' . $rel;
    $cat = (strpos($rel, 'uploads') !== false) ? 'uploads' : 'plugins';
    $code = file_exists($full) ? file_get_contents($full) : '';
    $ast = $scanner->analyze_php_ast_dataflow($rel, $code);
    $res = $scanner->scan_file_multi_signal($full, $cat);
    
    echo "File: $rel\n";
    echo "  -> AST Score: " . ($ast['score'] ?? 0) . " | Findings: " . json_encode($ast['findings']) . "\n";
    if ($res) {
        echo "  [DETECTED] Classification: " . ($res['classification'] ?? 'N/A') . " | Score: " . ($res['score'] ?? 'N/A') . "\n";
        echo "  Findings: " . json_encode($res['findings']) . "\n";
    } else {
        echo "  [MISSED / CLEAN]\n";
    }
    echo "\n";
}
