import subprocess
import requests

# 1. Test direct API call to /api/v1/wordpress/connect
api_url = "http://127.0.0.1:8000/api/v1/wordpress/connect"
api_key = "md_db90aaf8f7b7659447a333b3460c8e1f526188423398c2aa"
domain = "localhost"

payload = {
    "api_key": api_key,
    "domain": domain,
    "site_token": "init_token",
    "plugin_version": "4.2.2",
    "php_version": "8.0.30",
    "wp_version": "6.4.2"
}

resp = requests.post(api_url, json=payload, headers={"Authorization": f"Bearer {api_key}"})
print("Connect response:", resp.status_code, resp.json())

# 2. Update WordPress options to use this API key and URL
mysql_cmd = [
    r'C:\xampp\mysql\bin\mysql.exe',
    '-u', 'root',
    'mahabub',
    '-e',
    f'''
    UPDATE wp_options SET option_value = "{api_key}" WHERE option_name = "waf_fw_ml_api_key";
    UPDATE wp_options SET option_value = "http://127.0.0.1:8000" WHERE option_name = "waf_fw_ml_api_url";
    UPDATE wp_options SET option_value = "yes" WHERE option_name = "waf_fw_connected";
    '''
]
subprocess.run(mysql_cmd, capture_output=True, text=True)
print("Updated WordPress options with active API key.")
