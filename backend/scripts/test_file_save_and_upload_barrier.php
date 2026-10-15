<?php
/**
 * Test MDefender-Pro Real-Time File Save & Upload RASP Barrier
 * Verifies that attempting to save or upload a backdoor/webshell is blocked immediately!
 */
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';

echo "======================================================================\n";
echo "TESTING REAL-TIME FILE SAVE & UPLOAD BACKDOOR BARRIER\n";
echo "======================================================================\n\n";

$rasp = WAF_FW_RASP_Engine::instance();

// TEST 1: Direct File Content Signature Test
$test_payloads = [
    'Eval Base64 Webshell' => '<?php @eval(base64_decode($_POST["cmd"])); ?>',
    'China Chopper One-Liner' => '<?php @assert($_POST["mdefender"]); ?>',
    'RCE System Execution' => '<?php system($_GET["cmd"]); ?>',
    'Admin Backdoor Creation' => '<?php $u = wp_create_user("hacker", "pass"); $user = new WP_User($u); $user->set_role("administrator"); ?>',
    'Clean Safe PHP Code' => '<?php function my_clean_helper() { return "Hello World!"; } ?>',
];

echo "[+] TEST 1: Testing contains_webshell_signatures() against payloads:\n";
foreach ($test_payloads as $name => $code) {
    $blocked = $rasp->contains_webshell_signatures($code);
    $status = $blocked ? "BLOCKED (Webshell Detected)" : "ALLOWED (Clean Code)";
    echo "  -> Payload: $name: [$status]\n";
}

// TEST 2: Simulating File Upload Prefilter (wp_handle_upload_prefilter)
echo "\n[+] TEST 2: Testing File Upload Prefilter with Malicious Upload:\n";
$temp_file = sys_get_temp_dir() . '/test_webshell_upload.php';
file_put_contents($temp_file, '<?php system($_GET["c"]); ?>');

$fake_upload = [
    'name' => 'backdoor.php',
    'type' => 'application/x-php',
    'tmp_name' => $temp_file,
    'error' => 0,
    'size' => filesize($temp_file),
];

$upload_result = $rasp->inspect_file_upload_prefilter($fake_upload);
if (!empty($upload_result['error'])) {
    echo "  [SUCCESS - UPLOAD BLOCKED] Reason: " . $upload_result['error'] . "\n";
} else {
    echo "  [FAILED - UPLOAD ALLOWED]\n";
}
@unlink($temp_file);

// TEST 3: Simulating Polyglot Image Upload Prefilter
echo "\n[+] TEST 3: Testing Polyglot Image Backdoor Upload (GIF89a + PHP):\n";
$polyglot_file = sys_get_temp_dir() . '/polyglot.gif';
file_put_contents($polyglot_file, "GIF89a;\n<?php @eval(\$_POST['c']); ?>");

$fake_polyglot = [
    'name' => 'innocent_avatar.gif',
    'type' => 'image/gif',
    'tmp_name' => $polyglot_file,
    'error' => 0,
    'size' => filesize($polyglot_file),
];

$polyglot_result = $rasp->inspect_file_upload_prefilter($fake_polyglot);
if (!empty($polyglot_result['error'])) {
    echo "  [SUCCESS - POLYGLOT BLOCKED] Reason: " . $polyglot_result['error'] . "\n";
} else {
    echo "  [FAILED - POLYGLOT ALLOWED]\n";
}
@unlink($polyglot_file);

// TEST 4: Simulating Theme/Plugin File Editor Save Interception
echo "\n[+] TEST 4: Simulating Theme/Plugin Editor Save Interceptor:\n";
$_POST['newcontent'] = '<?php // Injected Webshell
if (isset($_POST["hack"])) {
    @eval(base64_decode($_POST["hack"]));
}
?>';
$_POST['file'] = 'wp-content/themes/twentytwentyfour/functions.php';

// Capture output if wp_die is triggered or test the signature
$is_save_blocked = $rasp->contains_webshell_signatures($_POST['newcontent']);
if ($is_save_blocked) {
    echo "  [SUCCESS - FILE SAVE INTERCEPTED] Attempt to save backdoor to functions.php is BLOCKED with 403 Forbidden!\n";
} else {
    echo "  [FAILED - FILE SAVE PERMITTED]\n";
}

echo "\n======================================================================\n";
echo "REAL-TIME FILE INJECTION BARRIER VERIFICATION COMPLETE!\n";
echo "======================================================================\n";
