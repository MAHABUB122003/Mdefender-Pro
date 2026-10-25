import os
import glob

DATASET_ROOT = os.path.abspath("datasets")

def inspect_datasets():
    print("=" * 70)
    print("       MDEFENDER PRO DATASET AUDIT & INVENTORY")
    print("=" * 70)
    
    total_files = 0
    total_bytes = 0
    
    for category in ["waf_requests", "threat_intelligence", "wordpress_malware"]:
        cat_path = os.path.join(DATASET_ROOT, category)
        if not os.path.exists(cat_path):
            continue
        print(f"\n[+] CATEGORY: {category}")
        cat_bytes = 0
        cat_files = 0
        for root, dirs, files in os.walk(cat_path):
            for f in files:
                fp = os.path.join(root, f)
                sz = os.path.getsize(fp)
                rel = os.path.relpath(fp, DATASET_ROOT)
                cat_bytes += sz
                cat_files += 1
                total_files += 1
                total_bytes += sz
                if sz > 1024 * 1024:
                    print(f"  - {rel:<60} [{sz / (1024*1024):8.2f} MB]")
                elif sz > 1024:
                    print(f"  - {rel:<60} [{sz / 1024:8.2f} KB]")
                else:
                    print(f"  - {rel:<60} [{sz:8d} B]")
        print(f"  => Total for {category}: {cat_files} files, {cat_bytes / (1024*1024):.2f} MB")
        
    print("\n" + "=" * 70)
    print(f"GRAND TOTAL: {total_files} files, {total_bytes / (1024*1024):.2f} MB ({total_bytes / (1024*1024*1024):.2f} GB)")
    print("=" * 70)

if __name__ == "__main__":
    inspect_datasets()
