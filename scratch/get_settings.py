import subprocess

cmd = [
    r'C:\xampp\mysql\bin\mysql.exe',
    '-u', 'root',
    'mahabub',
    '-e', 'SELECT option_value FROM wp_options WHERE option_name = "waf_fw_settings";'
]

out = subprocess.run(cmd, capture_output=True, text=True)
lines = out.stdout.strip().split('\n')
if len(lines) > 1:
    val = lines[1]
    print("RAW waf_fw_settings:", val)
else:
    print("waf_fw_settings not found in wp_options")
