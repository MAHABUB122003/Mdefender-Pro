import os, shutil

src = os.path.abspath('plugin_source/mdefender-pro')
dst = r'C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro'

print(f"Syncing from {src} to {dst}...")

count = 0
for root, dirs, files in os.walk(src):
    rel = os.path.relpath(root, src)
    target_dir = os.path.join(dst, rel) if rel != '.' else dst
    os.makedirs(target_dir, exist_ok=True)
    for f in files:
        s_file = os.path.join(root, f)
        d_file = os.path.join(target_dir, f)
        shutil.copy2(s_file, d_file)
        count += 1

print(f"Successfully copied {count} files to XAMPP WordPress plugin directory.")

