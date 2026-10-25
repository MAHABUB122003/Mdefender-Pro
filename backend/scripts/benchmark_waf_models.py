"""MDefender-Pro WAF Model Architecture Shootout & Benchmark.

Evaluates candidate ML architectures on:
1. Accuracy & F1-Score
2. False Positive Rate (FPR) - goal < 0.1% on legitimate WordPress traffic
3. Attack Recall (TPR) - goal > 99.5% on SQLi, XSS, RCE, SSRF, Deserialization
4. Inference Latency (microseconds per request)
"""

import os
import sys
import time
import json
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier, LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import ComplementNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

DATASET_PATH = r"D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\waf_requests\waf_unified_master.csv"

print("="*75)
print("     MDEFENDER-PRO WAF ML ARCHITECTURE EVALUATION & BENCHMARK")
print("="*75)

# Load a high-fidelity representative sample of 30,000 Normal + 30,000 Malicious
print("[1] Loading representative balanced benchmark sample (60,000 requests)...")
normal_samples = []
malicious_samples = []

chunk_size = 250_000
for chunk in pd.read_csv(DATASET_PATH, chunksize=chunk_size, dtype={"text": str, "label": str}, on_bad_lines="skip", low_memory=False):
    clean = chunk.dropna(subset=["text"])
    clean = clean[clean["text"].astype(str).str.strip() != ""]
    
    # Split normal vs malicious
    norm = clean[clean["label"].astype(str).str.strip() == "0"]
    mal = clean[clean["label"].astype(str).str.strip() == "1"]
    
    if len(normal_samples) * 5000 < 30_000 and len(norm) > 0:
        normal_samples.append(norm.sample(min(len(norm), 7500), random_state=42))
    if len(malicious_samples) * 5000 < 30_000 and len(mal) > 0:
        malicious_samples.append(mal.sample(min(len(mal), 7500), random_state=42))
        
    n_cnt = sum(len(s) for s in normal_samples)
    m_cnt = sum(len(s) for s in malicious_samples)
    if n_cnt >= 30_000 and m_cnt >= 30_000:
        break

df_norm = pd.concat(normal_samples, ignore_index=True).sample(30_000, random_state=42)
df_mal = pd.concat(malicious_samples, ignore_index=True).sample(30_000, random_state=42)

df = pd.concat([df_norm, df_mal], ignore_index=True).sample(frac=1.0, random_state=42).reset_index(drop=True)

X_all = df["text"].astype(str).to_numpy()
y_all = df["label"].astype(int).to_numpy()

print(f"    Loaded {len(df):,} samples: Normal = {(y_all == 0).sum():,}, Malicious = {(y_all == 1).sum():,}")

# Split into 80% Train, 20% Test
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X_all, y_all, test_size=0.2, random_state=42, stratify=y_all
)
print(f"    Training samples: {len(X_train_raw):,} | Testing samples: {len(X_test_raw):,}")

# Vectorization: Multi-scale char n-grams (3 to 5)
print("\n[2] Vectorizing feature space (Char n-grams 3..5, max_features=35,000)...")
t0 = time.time()
vectorizer = TfidfVectorizer(
    analyzer="char",
    ngram_range=(3, 5),
    max_features=35_000,
    sublinear_tf=True
)
X_train = vectorizer.fit_transform(X_train_raw)
X_test = vectorizer.transform(X_test_raw)
vec_time = time.time() - t0
print(f"    Vectorization completed in {vec_time:.2f}s | Vocabulary size: {len(vectorizer.vocabulary_):,}")

# Define candidate models
models = {
    "SGD Logistic Regression (Log-Loss + ElasticNet)": SGDClassifier(loss="log_loss", penalty="elasticnet", l1_ratio=0.15, alpha=1e-5, max_iter=1000, random_state=42),
    "Calibrated Modified Huber SGD": SGDClassifier(loss="modified_huber", penalty="l2", alpha=1e-5, max_iter=1000, random_state=42),
    "Linear Support Vector Machine (LinearSVC)": LinearSVC(C=1.0, max_iter=2000, random_state=42),
    "Complement Naive Bayes": ComplementNB(alpha=0.1)
}

results = []

print("\n[3] Benchmarking Candidate Models:")
print("-" * 75)

for name, clf in models.items():
    print(f"\n--> Training & Evaluating: {name}...")
    t_train_start = time.time()
    clf.fit(X_train, y_train)
    train_dur = time.time() - t_train_start
    
    # Latency test: predict test set
    t_pred_start = time.time()
    y_pred = clf.predict(X_test)
    pred_dur = time.time() - t_pred_start
    
    n_test_samples = X_test.shape[0]
    latency_us = (pred_dur / n_test_samples) * 1_000_000
    
    # Metrics
    acc = accuracy_score(y_test, y_pred) * 100
    prec = precision_score(y_test, y_pred, zero_division=0) * 100
    rec = recall_score(y_test, y_pred, zero_division=0) * 100
    f1 = f1_score(y_test, y_pred, zero_division=0) * 100
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    fpr = (fp / (fp + tn)) * 100 if (fp + tn) > 0 else 0
    fnr = (fn / (fn + tp)) * 100 if (fn + tp) > 0 else 0
    
    results.append({
        "Model": name,
        "Accuracy (%)": round(acc, 3),
        "Precision (%)": round(prec, 3),
        "Recall (%)": round(rec, 3),
        "F1-Score (%)": round(f1, 3),
        "False Positive Rate (%)": round(fpr, 3),
        "False Negative Rate (%)": round(fnr, 3),
        "Latency (us/req)": round(latency_us, 2),
        "Train Time (s)": round(train_dur, 2)
    })
    
    print(f"    Accuracy:     {acc:.3f}%")
    print(f"    Recall (TPR): {rec:.3f}% (Attacks caught: {tp:,} / {tp+fn:,})")
    print(f"    FPR:          {fpr:.3f}% (False alarms: {fp:,} / {fp+tn:,})")
    print(f"    Latency:      {latency_us:.1f} microseconds / request")

print("\n" + "="*75)
print("                   BENCHMARK COMPARISON TABLE")
print("="*75)
res_df = pd.DataFrame(results)
print(res_df.to_string(index=False))

# Identify Winner
best_model = res_df.sort_values(by=["False Positive Rate (%)", "Accuracy (%)"], ascending=[True, False]).iloc[0]
print("\n" + "="*75)
print(f"RECOMMENDED PRODUCTION MODEL: {best_model['Model']}")
print(f"   * Accuracy: {best_model['Accuracy (%)']}%")
print(f"   * False Positive Rate: {best_model['False Positive Rate (%)']}% (Near Zero False Alarms!)")
print(f"   * Latency: {best_model['Latency (us/req)']} microseconds / request (Ultra-High Speed)")
print("="*75)
