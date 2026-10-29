import subprocess

php_code = """
require 'C:/xampp/htdocs/mahabub/wp-load.php';
$client = WAF_FW_ML_Api_Client::instance();
echo "Client is available: " . ($client->is_available() ? 'YES' : 'NO') . "\\n";
echo "Base URL: " . get_option('waf_fw_ml_api_url') . "\\n";
echo "API Key: " . substr(get_option('waf_fw_ml_api_key'), 0, 10) . "...\\n";
$res = $client->send_telemetry_batch('localhost', [
    [
        'event_type' => 'allowed',
        'ip' => '127.0.0.1',
        'url' => '/test-telemetry',
        'method' => 'GET',
        'status' => 'allowed',
        'timestamp' => current_time('mysql')
    ]
]);
var_dump($res);
"""

cmd = [r'C:\xampp\php\php.exe', '-r', php_code]
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
