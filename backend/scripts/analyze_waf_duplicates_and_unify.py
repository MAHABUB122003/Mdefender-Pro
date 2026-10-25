"""Memory-efficient analysis of duplicates and record coverage across all 4 WAF files."""

import os
import sys
import zlib
import hashlib
import pandas as pd
from collections import Counter

WAF_DIR = r"D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\waf_requests"
FILES = [
    ("waf_ml_dataset.csv", "Main Current Combined"),
    ("waf_train_dataset.csv", "Train Split"),
    ("waf_test_dataset.csv", "Test Split"),
    ("waf_ml_dataset_old_5m_backup.csv", "Old 5M Backup")
]

print("="*70)
print("     MDEFENDER-PRO 4-FILE WAF UNIFICATION & DEDUPLICATION AUDIT")
print("="*70)

seen_hashes = set()
file_stats = {}

for fname, desc in FILES:
    fpath = os.path.join(WAF_DIR, fname)
    if not os.path.exists(fpath):
        print(f"Skipping {fname}: Not found")
        continue

    size_mb = os.path.getsize(fpath) / (1024 * 1024)
    print(f"\nScanning '{fname}' ({desc} - {size_mb:.2f} MB)...")
    
    total_in_file = 0
    unique_in_file = 0
    new_to_global = 0
    label_counts = Counter()
    
    # Process in chunks of 500,000
    chunk_num = 0
    file_hashes = set()
    
    for chunk in pd.read_csv(
        fpath,
        chunksize=500_000,
        dtype={"text": str, "label": str, "category": str, "source": str},
        on_bad_lines="skip",
        low_memory=False
    ):
        chunk_num += 1
        total_in_file += len(chunk)
        
        # Count labels
        for lbl, c in chunk["label"].value_counts().items():
            label_counts[str(lbl).strip()] += c
            
        # Fast array iteration
        texts = chunk["text"].dropna().astype(str).values
        for text in texts:
            if not text:
                continue
            h = zlib.crc32(text.encode("utf-8", errors="ignore"))
            if h not in file_hashes:
                file_hashes.add(h)
                unique_in_file += 1
            if h not in seen_hashes:
                seen_hashes.add(h)
                new_to_global += 1
                
        print(f"  Chunk {chunk_num}: Processed {total_in_file:,} rows... (Global Unique: {len(seen_hashes):,})")
        
    print(f"\n  * Total rows in {fname}: {total_in_file:,}")
    print(f"  * Unique in {fname}: {unique_in_file:,}")
    print(f"  * NEW unique records contributed to global pool: {new_to_global:,}")
    print(f"  * Labels in {fname}: {dict(label_counts)}")
    file_stats[fname] = {
        "total": total_in_file,
        "unique": unique_in_file,
        "new_global": new_to_global,
        "labels": dict(label_counts)
    }

print("\n" + "="*70)
print("                 GLOBAL DEDUPLICATION RESULTS")
print("="*70)
print(f"Total Cumulative Unique Global Records across ALL 4 files: {len(seen_hashes):,}")
for fname, stats in file_stats.items():
    print(f"  - {fname}: Total={stats['total']:,} | Unique={stats['unique']:,} | Contributed={stats['new_global']:,}")
print("="*70)
