import os
import filecmp

src_dir = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro"
dst_dir = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro"

diffs = []
for root, dirs, files in os.walk(src_dir):
    for f in files:
        src_file = os.path.join(root, f)
        rel_path = os.path.relpath(src_file, src_dir)
        dst_file = os.path.join(dst_dir, rel_path)
        if not os.path.exists(dst_file):
            diffs.append(f"MISSING IN XAMPP: {rel_path}")
        else:
            if not filecmp.cmp(src_file, dst_file, shallow=False):
                diffs.append(f"DIFFERENT: {rel_path} (src: {os.path.getsize(src_file)} vs dst: {os.path.getsize(dst_file)})")

for root, dirs, files in os.walk(dst_dir):
    for f in files:
        dst_file = os.path.join(root, f)
        rel_path = os.path.relpath(dst_file, dst_dir)
        src_file = os.path.join(src_dir, rel_path)
        if not os.path.exists(src_file):
            diffs.append(f"EXTRA IN XAMPP: {rel_path}")

print("\n".join(diffs) if diffs else "DIRECTORIES ARE IDENTICAL")
