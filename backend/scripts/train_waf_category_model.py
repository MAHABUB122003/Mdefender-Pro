"""Script: Train WAF Attack Category Classifier.

Uses the 7.525M master dataset (waf_unified_master.csv) and the fitted
40,000-feature TfidfVectorizer (waf_vectorizer.pkl) to train a multi-class
SGDClassifier for granular attack taxonomy identification.
"""

import json
import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATASET_PATH = os.path.join(WORKSPACE_ROOT, "datasets/waf_requests/waf_unified_master.csv")
MODEL_DIR = os.path.join(WORKSPACE_ROOT, "backend/models")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "waf_vectorizer.pkl")
CATEGORY_MODEL_PATH = os.path.join(MODEL_DIR, "waf_category_model.pkl")
META_PATH = os.path.join(MODEL_DIR, "waf_meta.json")

# Category normalization mapping
CATEGORY_MAP = {
    "sqli": "sqli",
    "SQL Injection": "sqli",
    "SQL-Injection-Payloads": "sqli",
    "SQL-Injection-Auth-Bypass-Payloads": "sqli",
    "xss": "xss",
    "XSS Injection": "xss",
    "Cross-Site-Scripting-XSS-Payloads": "xss",
    "Html-Injection-Payloads": "xss",
    "cmdi": "command_injection",
    "command_injection": "command_injection",
    "Command Injection": "command_injection",
    "cmd_injection": "command_injection",
    "OS-Command-Injection-Unix-Payloads": "command_injection",
    "OS-Command-Injection-Windows-Payloads": "command_injection",
    "directory_traversal": "path_traversal",
    "Directory Traversal": "path_traversal",
    "Directory-Traversal-Payloads": "path_traversal",
    "path_traversal": "path_traversal",
    "lfi": "path_traversal",
    "rfi": "path_traversal",
    "File Inclusion": "path_traversal",
    "traversal": "path_traversal",
    "php_webshell": "webshell",
    "wordpress_backdoor": "webshell",
    "malware": "webshell",
    "PHP-Code-Injections-Payloads": "webshell",
    "PHP-Code-injection": "webshell",
    "prompt_injection": "prompt_injection",
    "Prompt Injection": "prompt_injection",
    "ssrf": "ssrf",
    "cloud_ssrf": "ssrf",
    "Server Side Request Forgery": "ssrf",
    "Server-Side-Request-Forgery-Payloads": "ssrf",
    "xxe": "xxe",
    "XXE Injection": "xxe",
    "nosql": "nosql",
    "NoSQL Injection": "nosql",
    "auth_bypass": "auth_bypass",
    "open_redirect": "open_redirect",
    "Open Redirect": "open_redirect",
    "ssti": "ssti",
    "Server Side Template Injection": "ssti",
    "deserialization": "deserialization",
    "Insecure Deserialization": "deserialization",
    "crlf": "crlf",
    "CRLF Injection": "crlf",
    "Fuzzing": "fuzzing_probe",
    "csic_attack": "protocol_attack",
    "capec": "exploit_probe",
    "payload": "generic_payload",
}

def collect_training_samples(max_per_cat=10000):
    print(f"Loading vectorizer from {VECTORIZER_PATH}...")
    vectorizer = joblib.load(VECTORIZER_PATH)
    
    samples_by_cat = {}
    total_scanned = 0
    start_time = time.time()
    
    print(f"Scanning {DATASET_PATH} for attack samples across categories...")
    for chunk in pd.read_csv(DATASET_PATH, chunksize=300000, low_memory=False):
        total_scanned += len(chunk)
        # Only take malicious samples
        mal = chunk[chunk["label"] == 1]
        for _, row in mal.iterrows():
            raw_cat = str(row.get("category", "")).strip()
            norm_cat = CATEGORY_MAP.get(raw_cat)
            if not norm_cat:
                continue
            
            if norm_cat not in samples_by_cat:
                samples_by_cat[norm_cat] = []
            
            if len(samples_by_cat[norm_cat]) < max_per_cat:
                samples_by_cat[norm_cat].append(str(row["text"]))
        
        # Check if all classes reached max
        counts = {k: len(v) for k, v in samples_by_cat.items()}
        print(f"  Scanned {total_scanned:,} rows... Collected categories: {len(counts)}")
        
        # If we have at least 10 categories with >= 3000 samples, and scanned 4M rows
        if total_scanned >= 4000000 and len(counts) >= 12 and all(c >= 2000 for c in counts.values()):
            print("  Sufficient balanced representation reached.")
            break
            
    print(f"\nFinal category distribution:")
    texts = []
    labels = []
    for cat, items in sorted(samples_by_cat.items(), key=lambda x: -len(x[1])):
        print(f"  {cat}: {len(items):,} samples")
        for t in items:
            texts.append(t)
            labels.append(cat)
            
    return vectorizer, texts, labels

def main():
    start_all = time.time()
    vectorizer, texts, labels = collect_training_samples(max_per_cat=10000)
    
    print(f"\nTotal samples: {len(texts):,}")
    unique_classes = sorted(list(set(labels)))
    print(f"Unique classes ({len(unique_classes)}): {unique_classes}")
    
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    print(f"Vectorizing {len(X_train_raw):,} training samples with TF-IDF 40,000 features...")
    t0 = time.time()
    X_train = vectorizer.transform(X_train_raw)
    X_test = vectorizer.transform(X_test_raw)
    print(f"Vectorized in {time.time() - t0:.2f}s, X_train shape: {X_train.shape}")
    
    print("Training multi-class SGDClassifier(loss='log_loss', penalty='l2')...")
    clf = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-5, max_iter=100, random_state=42, n_jobs=-1)
    t1 = time.time()
    clf.fit(X_train, y_train)
    print(f"Model trained in {time.time() - t1:.2f}s")
    
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nCategory Classifier Test Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))
    
    # Save category model
    print(f"Saving category model to {CATEGORY_MODEL_PATH}...")
    joblib.dump(clf, CATEGORY_MODEL_PATH, compress=3)
    file_size_mb = os.path.getsize(CATEGORY_MODEL_PATH) / (1024 * 1024)
    print(f"Model saved successfully ({file_size_mb:.2f} MB)")
    
    # Update waf_meta.json
    if os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            meta = json.load(f)
        meta["category_classes"] = unique_classes
        meta["category_model_accuracy_percent"] = round(acc * 100, 2)
        meta["category_classes_count"] = len(unique_classes)
        with open(META_PATH, "w") as f:
            json.dump(meta, f, indent=2)
        print(f"Updated {META_PATH} with {len(unique_classes)} category classes.")
        
    print(f"\nAll completed in {time.time() - start_all:.1f}s.")

if __name__ == "__main__":
    main()
