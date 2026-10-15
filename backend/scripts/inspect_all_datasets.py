import os
import sqlite3

base = r'd:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets'

print("=== DATASET FOLDER SUMMARY ===")
subdirs = ['waf_requests', 'threat_intelligence', 'wordpress_malware']
for sd in subdirs:
    p = os.path.join(base, sd)
    if not os.path.exists(p):
        continue
    file_count = 0
    total_size = 0
    for root, dirs, files in os.walk(p):
        for f in files:
            file_count += 1
            total_size += os.path.getsize(os.path.join(root, f))
    print(f"Directory: {sd}")
    print(f"  Files: {file_count:,} files")
    print(f"  Total Size: {total_size / (1024*1024):.2f} MB")

# Check SQLite databases
cleaned_db = os.path.join(base, 'threat_intelligence', 'cleaned_waf_data.db')
if os.path.exists(cleaned_db):
    try:
        conn = sqlite3.connect(cleaned_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("\n=== threat_intelligence/cleaned_waf_data.db TABLES ===")
        for t in tables:
            tname = t[0]
            cursor.execute(f"SELECT COUNT(*) FROM {tname}")
            cnt = cursor.fetchone()[0]
            print(f"  Table '{tname}': {cnt:,} rows")
        conn.close()
    except Exception as e:
        print("Error reading cleaned_waf_data.db:", e)

wp_db = os.path.join(base, 'wordpress_malware', 'database', 'dataset.db')
if os.path.exists(wp_db):
    try:
        conn = sqlite3.connect(wp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("\n=== wordpress_malware/database/dataset.db TABLES ===")
        for t in tables:
            tname = t[0]
            cursor.execute(f"SELECT COUNT(*) FROM {tname}")
            cnt = cursor.fetchone()[0]
            print(f"  Table '{tname}': {cnt:,} rows")
        conn.close()
    except Exception as e:
        print("Error reading dataset.db:", e)

# Check waf_ml_dataset.csv
csv_path = os.path.join(base, 'waf_requests', 'waf_ml_dataset.csv')
if os.path.exists(csv_path):
    print(f"\n=== waf_requests/waf_ml_dataset.csv ===")
    sz = os.path.getsize(csv_path)
    print(f"  Size: {sz / (1024*1024):.2f} MB")
