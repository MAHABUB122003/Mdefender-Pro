# MDefender Pro — Backend Scripts Guide

This folder contains operational utilities and machine learning pipelines for MDefender Pro.

---

## 🛠️ Build & Development Utilities

| Script | Purpose | Usage |
| :--- | :--- | :--- |
| `build_plugin_zip.py` | Compiles the WordPress plugin from `plugin_source/` into `backend/downloads/mdefender-pro.zip` and syncs to frontend distribution directories. | `python scripts/build_plugin_zip.py` |
| `create_user.py` | Seeds default administrator and standard user accounts into MongoDB. | `python scripts/create_user.py` |
| `sync_xampp_plugin.py` | Synchronizes plugin changes to local XAMPP environment for real-time WordPress testing. | `python scripts/sync_xampp_plugin.py` |

---

## 🧠 Machine Learning & Threat Intelligence Pipeline

| Script | Purpose | Usage |
| :--- | :--- | :--- |
| `train_waf_model_v4_enterprise.py` | **Primary Production Model Trainer**: Trains SGDClassifier on balanced datasets using out-of-core streaming with sub-millisecond inference. | `python scripts/train_waf_model_v4_enterprise.py` |
| `train_waf_model_v3.py` | Baseline WAF model trainer (v3 architecture). | `python scripts/train_waf_model_v3.py` |
| `build_balanced_enterprise_waf_dataset.py` | Generates balanced, sanitized attack and benign datasets for enterprise model training. | `python scripts/build_balanced_enterprise_waf_dataset.py` |
| `collect_massive_benign_dataset.py` | Downloads and parses legitimate traffic payloads to minimize False Positives. | `python scripts/collect_massive_benign_dataset.py` |
| `collect_threat_intelligence.py` | Aggregates IP threat intelligence, botnet C2 feeds, and malicious domain lists into local threat databases. | `python scripts/collect_threat_intelligence.py` |
| `audit_and_clean_dataset.py` | Deduplicates and validates raw dataset CSVs prior to model training. | `python scripts/audit_and_clean_dataset.py` |

---

## 🧪 Automated Testing
All official automated unit, integration, and security tests are maintained in `backend/tests/`:
```bash
pytest tests/
```
