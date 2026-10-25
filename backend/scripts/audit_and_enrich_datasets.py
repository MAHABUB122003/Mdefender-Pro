import os
import sys
import json
import sqlite3
import pandas as pd
from collections import Counter

print("="*65)
print("     MDEFENDER-PRO COMPREHENSIVE DATASET DEEP AUDIT")
print("="*65)

# 1. WAF Dataset
waf_file = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\waf_requests\waf_ml_dataset.csv'
if os.path.exists(waf_file):
    size_mb = os.path.getsize(waf_file) / (1024*1024)
    print(f"\n[1] WAF REQUEST DATASET: {size_mb:.2f} MB")
    try:
        # Sample first 1000 lines
        df_waf = pd.read_csv(waf_file, nrows=2000)
        print(f"  * Columns: {list(df_waf.columns)}")
        print(f"  * Sample Labels: {df_waf['label'].value_counts().to_dict() if 'label' in df_waf.columns else 'No label col'}")
    except Exception as e:
        print(f"  * Error reading WAF dataset sample: {e}")

# 2. WordPress Malware Dataset
print("\n[2] WORDPRESS MALWARE DATASET (PHP Files):")
wp_malware_base = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\data'
benign_count = 0
malicious_count = 0
category_counts = Counter()

eval_in_benign = []
eval_in_malicious = []

if os.path.exists(wp_malware_base):
    for root, dirs, files in os.walk(wp_malware_base):
        for f in files:
            if f.endswith(('.php', '.phtml', '.php5', '.inc', '.txt')):
                rel_path = os.path.relpath(os.path.join(root, f), wp_malware_base)
                parts = rel_path.split(os.sep)
                is_benign = 'benign' in rel_path.lower()
                is_malicious = 'malicious' in rel_path.lower()
                cat = parts[1] if len(parts) > 1 else 'unknown'
                category_counts[cat] += 1
                if is_benign:
                    benign_count += 1
                elif is_malicious:
                    malicious_count += 1
                    
print(f"  * Total Benign Files: {benign_count:,}")
print(f"  * Total Malicious Files: {malicious_count:,}")
print("  * Category Breakdown:")
for cat, cnt in category_counts.most_common(15):
    print(f"    - {cat}: {cnt:,} files")

# 3. Threat Intelligence Database
print("\n[3] THREAT INTELLIGENCE DATABASE:")
ti_db = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\backend\data\threat_intel\threat_intelligence.db'
if os.path.exists(ti_db):
    conn = sqlite3.connect(ti_db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    for (tname,) in tables:
        cur.execute(f"SELECT COUNT(*) FROM {tname}")
        cnt = cur.fetchone()[0]
        print(f"  * Table '{tname}': {cnt:,} records")
    conn.close()
else:
    print("  * Threat intel DB does not exist yet.")

# 4. Cleaned WAF Database
cleaned_db = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\threat_intelligence\cleaned_waf_data.db'
if os.path.exists(cleaned_db):
    print("\n[4] CLEANED WAF REPOSITORY DB:")
    conn = sqlite3.connect(cleaned_db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    for (tname,) in tables:
        cur.execute(f"SELECT COUNT(*) FROM {tname}")
        cnt = cur.fetchone()[0]
        print(f"  * Table '{tname}': {cnt:,} records")
    conn.close()

print("\n" + "="*65)
