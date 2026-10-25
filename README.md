# 🛡️ MDefender Pro — Next-Generation Web Application Security Suite

MDefender Pro is an enterprise-grade, real-time Web Application Firewall (WAF), Anycast Cloud Proxy, DDoS Shield, and WordPress Security Hardening ecosystem powered by Machine Learning and Threat Intelligence.

---

## 🗂️ Project Repository Overview

```text
Mdefender/
├── backend/          # FastAPI Python Server, AI Engine, Threat DB, Reverse Proxy, DNS Daemon
├── frontend/         # Modern React + Vite Dashboard & User Management Portal
├── plugin_source/    # Enterprise WordPress Security Plugin source code (v4.1.0)
├── datasets/         # WAF training vectors, threat intelligence feeds, malware samples
├── nginx/            # High-performance Nginx reverse proxy and SSL configuration templates
├── scripts/          # Operational server automation (SSL automation, cache warming, threat ingestion)
├── AI.md             # In-depth architectural analysis and machine learning documentation
├── PLUGIN_ARCHITECTURE.md # WordPress plugin internals, hooks, and sync architecture
└── docker-compose.yml# Container orchestration for local and multi-service deployment
```

---

## 🏗️ Core Subsystems

### 1. ⚙️ [Backend](file:///d:/Documents_product/Mdefender-Pro/Mdefender-Pro/Mdefender/backend/README.md)
* **Framework**: FastAPI (Async Python 3.12)
* **Intelligence**: Hybrid Rule + AST Semantic + SGD Machine Learning Engine (<1ms latency)
* **Networking**: Authoritative DNS Server (Port 53), Keep-Alive Connection Pool Proxy
* **Data Stores**: MongoDB (Atlas/Local), Local SQLite Threat Intelligence Database (36MB+)

### 2. 💻 Frontend
* **Stack**: React 18, Vite, Lucide Icons, Modern Dark/Glassmorphic UX
* **Features**: Live Attack Telemetry, Domain Management, DNS Records, WAF Rules, Blacklist/Whitelist, bKash & Card Billing, Security Audit Scanner

### 3. 🔌 WordPress Plugin (`plugin_source/mdefender-pro`)
* Complete on-premise security agent with automatic cloud sync, virtual patch barrier, malware file scanner, and hardening suite.

---

## 🚀 Quick Start Guide

### 1. Run Backend
```bash
cd backend
python main.py
```
* API Server: `http://localhost:8000`
* API Docs: `http://localhost:8000/docs`

### 2. Run Frontend
```bash
cd frontend
npm run dev
```
* Dashboard: `http://localhost:5173`

### 3. Build WordPress Plugin Distribution Zip
```bash
cd backend
python scripts/build_plugin_zip.py
```
Outputs bundle to `backend/downloads/mdefender-pro.zip` and frontend static download targets.
