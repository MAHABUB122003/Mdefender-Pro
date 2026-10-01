import subprocess

cmd = [
    r'C:\xampp\mysql\bin\mysql.exe',
    '-u', 'root',
    'mahabub',
    '-e', 'SELECT option_name, SUBSTRING(option_value, 1, 100) AS val FROM wp_options WHERE option_name LIKE "%waf%" OR option_name LIKE "%mdefender%";'
]

out = subprocess.run(cmd, capture_output=True, text=True)
print(out.stdout)
if out.stderr:
    print("ERR:", out.stderr)
