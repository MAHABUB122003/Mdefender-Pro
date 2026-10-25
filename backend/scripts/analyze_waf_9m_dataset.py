"""Deep analysis and audit of the 9.5 Million WAF Request Dataset."""

import os
import sys
import csv
from collections import Counter
import pandas as pd

CSV_PATH = r"D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\waf_requests\waf_ml_dataset.csv"

print("="*65)
print("     MDEFENDER-PRO 9.5M WAF DATASET AUDIT & PROFILING")
print("="*65)

if not os.path.exists(CSV_PATH):
    print(f"File not found: {CSV_PATH}")
    sys.exit(1)

total_size_mb = os.path.getsize(CSV_PATH) / (1024 * 1024)
print(f"File: {os.path.basename(CSV_PATH)} ({total_size_mb:.2f} MB)")

chunk_size = 500_000
total_records = 0
label_counter = Counter()
category_counter = Counter()
source_counter = Counter()
corrupt_records = 0
empty_text_records = 0

print("\nStreaming dataset in chunks of 500,000...")

chunk_idx = 0
for chunk in pd.read_csv(
    CSV_PATH,
    chunksize=chunk_size,
    dtype={"text": str, "label": str, "category": str, "source": str},
    on_bad_lines="skip",
    low_memory=False
):
    chunk_idx += 1
    total_records += len(chunk)
    
    # Check nulls
    empty_text = chunk["text"].isna().sum()
    empty_text_records += empty_text
    
    # Labels
    for lbl, cnt in chunk["label"].value_counts().items():
        label_counter[str(lbl).strip()] += cnt
        
    # Categories
    for cat, cnt in chunk["category"].value_counts().items():
        category_counter[str(cat).strip()] += cnt

    # Sources
    for src, cnt in chunk["source"].value_counts().items():
        source_counter[str(src).strip()] += cnt

    print(f"  * Processed Chunk {chunk_idx}: Cumulative Records = {total_records:,} (Normal vs Malicious: {dict(label_counter)})")

print("\n" + "="*65)
print("                      AUDIT SUMMARY RESULTS")
print("="*65)
print(f"Total Parsed Records: {total_records:,}")
print(f"Empty / NaN Text:     {empty_text_records:,}")
print("\n--- Label Distribution ---")
for lbl, count in label_counter.most_common():
    pct = (count / total_records * 100) if total_records else 0
    name = "Malicious" if lbl == "1" else ("Normal" if lbl == "0" else f"Unknown ({lbl})")
    print(f"  * Label '{lbl}' ({name}): {count:,} ({pct:.2f}%)")

print("\n--- Top Categories ---")
for cat, count in category_counter.most_common(20):
    pct = (count / total_records * 100) if total_records else 0
    print(f"  * {cat}: {count:,} ({pct:.2f}%)")

print("\n--- Top Sources ---")
for src, count in source_counter.most_common(15):
    pct = (count / total_records * 100) if total_records else 0
    print(f"  * {src}: {count:,} ({pct:.2f}%)")
print("="*65)
