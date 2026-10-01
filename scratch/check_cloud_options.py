import subprocess

cmd = [
    r'C:\xampp\mysql\bin\mysql.exe',
    '-u', 'root',
    'mahabub',
    '-e', 'SELECT option_name, option_value FROM wp_options WHERE option_name LIKE "waf_fw_ml_%" OR option_name LIKE "waf_fw_website%" OR option_name LIKE "waf_fw_cloud%";'
]

out = subprocess.run(cmd, capture_output=True, text=True)
print(out.stdout)
