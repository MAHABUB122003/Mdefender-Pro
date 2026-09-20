import os
import zipfile
import shutil

xampp_dir = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro"

# 1. Update class-ml-api-client.php in XAMPP
client_file = os.path.join(xampp_dir, "includes", "class-ml-api-client.php")
with open(client_file, "r", encoding="utf-8") as f:
    content = f.read()

target_check = "if (empty($url) || strpos($url, 'onrender.com') !== false || strpos($url, 'mdefender-pro.io') !== false"
new_check = "if (empty($url) || strpos($url, 'onrender.com') !== false || strpos($url, 'mdefender-pro.io') !== false || strpos($url, 'localhost:8000') !== false || strpos($url, '127.0.0.1:8000') !== false"

if target_check in content and "localhost:8000" not in content:
    content = content.replace(target_check, new_check)
    with open(client_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated class-ml-api-client.php")

# 2. Update class-ajax-handler.php in XAMPP
ajax_file = os.path.join(xampp_dir, "includes", "class-ajax-handler.php")
with open(ajax_file, "r", encoding="utf-8") as f:
    ajax_content = f.read()

target_ajax = "if (empty($ml_url) || strpos($ml_url, 'onrender.com') !== false || strpos($ml_url, 'mdefender-pro.io') !== false"
new_ajax = "if (empty($ml_url) || strpos($ml_url, 'onrender.com') !== false || strpos($ml_url, 'mdefender-pro.io') !== false || strpos($ml_url, 'localhost:8000') !== false || strpos($ml_url, '127.0.0.1:8000') !== false"

if target_ajax in ajax_content and "localhost:8000" not in ajax_content:
    ajax_content = ajax_content.replace(target_ajax, new_ajax)

ajax_content = ajax_content.replace(
    "'ml_api_url' => get_option('waf_fw_ml_api_url', 'http://217.15.170.82'),",
    "'ml_api_url' => (strpos(get_option('waf_fw_ml_api_url', ''), 'localhost:8000') !== false || !get_option('waf_fw_ml_api_url')) ? 'http://217.15.170.82' : get_option('waf_fw_ml_api_url'),"
)

with open(ajax_file, "w", encoding="utf-8") as f:
    f.write(ajax_content)
print("Updated class-ajax-handler.php")

# 3. Rebuild backend/downloads/mdefender-pro.zip
out_file = os.path.abspath("backend/downloads/mdefender-pro.zip")
if os.path.exists(out_file):
    os.remove(out_file)

count = 0
with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(xampp_dir):
        for fname in files:
            if fname.startswith(".") or "__pycache__" in root:
                continue
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, xampp_dir)
            arc = os.path.join("mdefender-pro", rel).replace("\\", "/")
            zf.write(full, arc)
            count += 1

print(f"Rebuilt {out_file} ({count} files)")
