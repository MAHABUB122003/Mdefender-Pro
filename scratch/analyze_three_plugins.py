import zipfile
import os

plugins = [
    "malcare-security.6.76.zip",
    "sucuri-scanner.2.8.zip",
    "wordfence.9.0.2.zip"
]

extract_dir = "scratch/extracted_plugins"
os.makedirs(extract_dir, exist_ok=True)

print("=" * 70)
print("DEEP ANALYSIS OF TOP 3 WORDPRESS SECURITY SCANNER PLUGINS")
print("=" * 70)

for p in plugins:
    zip_path = os.path.join("three_plugin", p)
    if not os.path.exists(zip_path):
        print(f"File {zip_path} not found")
        continue
    
    target_p = os.path.join(extract_dir, p.replace(".zip", ""))
    print(f"\n[+] Extracting {p} to {target_p}...")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target_p)
    
    print(f"[+] Scanning key architectural components of {p}...")
    
    key_files = []
    for root, dirs, files in os.walk(target_p):
        for f in files:
            if f.endswith(".php"):
                full_f = os.path.join(root, f)
                rel_f = os.path.relpath(full_f, target_p)
                lower_f = rel_f.lower()
                if any(term in lower_f for term in ["scan", "malware", "signature", "integrity", "audit", "alert", "token", "file", "diff", "clean", "sync", "cloud"]):
                    size = os.path.getsize(full_f)
                    key_files.append((rel_f, size))
    
    print(f"    Found {len(key_files)} security scanner related files in {p}:")
    for kf, sz in sorted(key_files, key=lambda x: -x[1])[:10]:
        print(f"      - {kf} ({sz} bytes)")
