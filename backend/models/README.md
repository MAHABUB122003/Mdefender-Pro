# MDefender Pro — Machine Learning Models Guide

This directory holds the serialized production machine learning models and feature engineering pipelines.

---

## 🛡️ WAF (Web Application Firewall) Models

| File | Type | Description |
| :--- | :--- | :--- |
| `waf_model.pkl` | Binary Pickle | **Production WAF Model**: High-speed SGD Classifier trained on millions of real-world payloads for sub-millisecond anomaly detection. |
| `waf_category_model.pkl` | Binary Pickle | Classification model determining attack category (SQLi, XSS, RCE, LFI, SSRF, etc.). |
| `waf_meta.json` | JSON Metadata | Model metadata including feature dimensions, threshold score (0.50), model version, and accuracy metrics. |
| `feature_columns.pkl` | Binary Pickle | Serialized list of feature names used during inference vectorization. |
| `feature_engineer.pkl` | Binary Pickle | Pipeline for extracting syntactic, lexical, and behavioral request features. |
| `scaler.pkl` | Binary Pickle | Standard scaler for feature normalization. |

---

## 🦠 Malware Scanning Models

| File | Type | Description |
| :--- | :--- | :--- |
| `malware_model.pkl` | Binary Pickle | **Malware Binary Classifier**: Fast file entropy, AST, and heuristic analyzer for PHP/JS files. |
| `malware_family_model.pkl` | Binary Pickle | Multi-class classifier identifying malware family (e.g. WebShell, ChinaChopper, Obfuscator, C2-Backdoor). |
| `malware_family_encoder.pkl` | Binary Pickle | Label encoder for malware family names. |
| `malware_features.json` | JSON Config | Schema of AST features, entropy thresholds, and regex heuristics. |
| `malware_meta.json` | JSON Metadata | Metadata describing model version, accuracy, and scan parameters. |
