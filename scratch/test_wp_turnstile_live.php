<?php
define('WP_USE_THEMES', false);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "WordPress Loaded: " . get_bloginfo('name') . "\n";

// 1. Enable Turnstile in WP options
update_option('waf_fw_turnstile_enabled', 'yes');
update_option('waf_turnstile_enabled', 'yes');
update_option('waf_fw_turnstile_mode', 'login_only');
update_option('waf_turnstile_mode', 'login_only');

echo "Turnstile enabled: " . get_option('waf_fw_turnstile_enabled') . "\n";
echo "Turnstile mode: " . get_option('waf_fw_turnstile_mode') . "\n";

// 2. Check if WAF_FW_Turnstile class exists
if (class_exists('WAF_FW_Turnstile')) {
    echo "WAF_FW_Turnstile class: FOUND\n";
    $turnstile = WAF_FW_Turnstile::instance();
    $challenge = $turnstile->generate_challenge();
    echo "Challenge generated: " . json_encode($challenge) . "\n";
    
    // Test PoW solver in PHP
    $nonce_val = $challenge['nonce'];
    $salt = $challenge['salt'];
    $diff = $challenge['difficulty'];
    $prefix = str_repeat('0', $diff);
    $sol = 0;
    $t0 = microtime(true);
    while (true) {
        $hash = hash('sha256', "{$nonce_val}:{$salt}:{$sol}");
        if (substr($hash, 0, $diff) === $prefix) {
            break;
        }
        $sol++;
    }
    $elapsed = round((microtime(true) - $t0) * 1000);
    echo "PoW solved in {$elapsed}ms! Solution: {$sol}, Hash: {$hash}\n";
    
    $verify = $turnstile->verify_solution($challenge['challenge_token'], (string)$sol, ['duration_ms' => max(50, $elapsed), 'webdriver' => false]);
    echo "Solution verification result: " . json_encode($verify) . "\n";

    if (!empty($verify['valid'])) {
        echo "SUCCESS: Clearance Token Generated: " . substr($verify['clearance_token'], 0, 30) . "...\n";
    } else {
        echo "FAILED verification: " . $verify['message'] . "\n";
    }
} else {
    echo "WAF_FW_Turnstile class: NOT FOUND\n";
}
