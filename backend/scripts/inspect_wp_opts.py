import subprocess, json

cmd = [r'C:\xampp\php\php.exe', '-r', """
require 'C:/xampp/htdocs/mahabub/wp-load.php';
$opts = [
    'waf_fw_site_token' => get_option('waf_fw_site_token'),
    'waf_fw_ml_api_key' => get_option('waf_fw_ml_api_key'),
    'waf_fw_api_key' => get_option('waf_fw_api_key'),
    'waf_fw_website_id' => get_option('waf_fw_website_id'),
    'waf_fw_connected' => get_option('waf_fw_connected'),
    'waf_fw_ml_api_url' => get_option('waf_fw_ml_api_url'),
];
echo json_encode($opts, JSON_PRETTY_PRINT);
"""]
print(subprocess.check_output(cmd).decode())

