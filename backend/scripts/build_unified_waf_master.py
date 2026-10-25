"""MDefender-Pro: Unify and Deduplicate All WAF Datasets into a Clean Master Dataset.

Processes:
- waf_ml_dataset.csv (7.58M rows)
- waf_ml_dataset_old_5m_backup.csv (5.23M rows)
Eliminates:
- Exact duplicate payloads
- Corrupt / NaN text
- Extra whitespace
Produces:
- waf_unified_master.csv (approx 7.525 Million unique, perfectly clean records)
"""

import os
import sys
import zlib
import csv
import pandas as pd
from collections import Counter

WAF_DIR = r"D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\waf_requests"
INPUT_FILES = [
    os.path.join(WAF_DIR, "waf_ml_dataset.csv"),
    os.path.join(WAF_DIR, "waf_ml_dataset_old_5m_backup.csv")
]

OUTPUT_MASTER = os.path.join(WAF_DIR, "waf_unified_master.csv")

print("="*70)
print("     MDEFENDER-PRO WAF DATASET UNIFIER & DEDUPLICATOR")
print("="*70)

seen_hashes = set()
total_read = 0
total_written = 0
label_dist = Counter()
category_dist = Counter()

# Open output CSV
with open(OUTPUT_MASTER, "w", encoding="utf-8", newline="", errors="ignore") as out_f:
    writer = csv.writer(out_f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["text", "label", "category", "source"])
    
    for fpath in INPUT_FILES:
        if not os.path.exists(fpath):
            continue
        fname = os.path.basename(fpath)
        print(f"\n[+] Ingesting & deduplicating '{fname}'...")
        
        chunk_idx = 0
        for chunk in pd.read_csv(
            fpath,
            chunksize=500_000,
            dtype={"text": str, "label": str, "category": str, "source": str},
            on_bad_lines="skip",
            low_memory=False
        ):
            chunk_idx += 1
            total_read += len(chunk)
            
            # Filter NaNs
            valid_chunk = chunk.dropna(subset=["text"])
            
            cols = ["text", "label", "category", "source"]
            for col in cols:
                if col not in valid_chunk.columns:
                    valid_chunk[col] = "unknown"
            
            sub = valid_chunk[cols].values
            rows_to_write = []
            for row in sub:
                raw_text = str(row[0]).strip()
                if not raw_text or raw_text == "nan":
                    continue
                
                h = zlib.crc32(raw_text.encode("utf-8", errors="ignore"))
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)
                
                raw_lbl = str(row[1]).strip()
                lbl = "1" if raw_lbl in ("1", "1.0", "true", "True") else "0"
                cat = str(row[2]).strip()
                src = str(row[3]).strip()
                
                label_dist[lbl] += 1
                category_dist[cat] += 1
                rows_to_write.append([raw_text, lbl, cat, src])
                
            writer.writerows(rows_to_write)
            total_written += len(rows_to_write)
            print(f"  Chunk {chunk_idx}: Cumulative Written = {total_written:,} records (Processed {total_read:,} rows)")

print("\n" + "="*70)
print("                   UNIFICATION COMPLETE")
print("="*70)
out_size_mb = os.path.getsize(OUTPUT_MASTER) / (1024 * 1024)
print(f"Target Master File:   {OUTPUT_MASTER}")
print(f"File Size:            {out_size_mb:.2f} MB")
print(f"Total Rows Ingested:  {total_read:,}")
print(f"Total Unique Written: {total_written:,}")
print(f"Duplicates Removed:   {(total_read - total_written):,}")
print("\nFinal Class Balance:")
for lbl, cnt in label_dist.items():
    pct = cnt / total_written * 100
    name = "Malicious" if lbl == "1" else "Normal"
    print(f"  - Label {lbl} ({name}): {cnt:,} ({pct:.2f}%)")
print("="*70)
