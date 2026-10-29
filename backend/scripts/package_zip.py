import os
import zipfile
import shutil

src_dir = os.path.abspath('plugin_source/mdefender-pro')
targets = [
    os.path.abspath('mdefender-pro.zip'),
    os.path.abspath('backend/downloads/mdefender-pro.zip'),
    os.path.abspath('frontend/public/mdefender-pro.zip'),
    os.path.abspath('frontend/dist/mdefender-pro.zip'),
]

temp_zip = os.path.abspath('temp_mdefender.zip')
if os.path.exists(temp_zip):
    os.remove(temp_zip)

with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, os.path.dirname(src_dir))
            z.write(full_path, rel_path)

print(f"Created archive: {os.path.getsize(temp_zip)} bytes")

for t in targets:
    os.makedirs(os.path.dirname(t), exist_ok=True)
    shutil.copy2(temp_zip, t)
    print(f"Copied to {t} ({os.path.getsize(t)} bytes)")

os.remove(temp_zip)
print("Plugin packaging complete!")
