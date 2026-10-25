# MDefender Pro — Backend Architecture & Directory Guide

This directory houses the core FastAPI server, Anycast Cloud Proxy Engine, Threat Intelligence databases, Machine Learning models, and Security services.

---

## 📁 Directory Structure & Responsibilities

```text
backend/
├── client/          # Multi-language client SDKs / middlewares (Node.js, PHP, Python)
├── data/            # Dynamic intelligence stores:
│   ├── bot_intelligence/      # Bot signatures and crawling heuristics
│   └── threat_intel/          # Local SQLite threat intelligence database (IP reputation, C2 feeds)
├── downloads/       # Distributable artifacts (mdefender-pro.zip WordPress plugin bundle)
├── logs/            # Real-time application and security audit logs
├── models/          # Serialized Machine Learning models (WAF classifier, Malware detection, scalers)
├── quarantine/      # Secure quarantine storage for isolated malicious payloads
├── scripts/         # Production utilities (Plugin builders, User seeders, ML training pipelines)
├── src/             # Core Python modules & business logic (see below)
├── templates/       # Jinja2 HTML templates (Custom Cloudflare-style WAF Block Page)
├── tests/           # Pytest test suites (Unit, integration, and security regression tests)
├── .env             # Active environment configuration & secret keys
├── config.json      # General server configuration (whitelist localhost, debug flags)
├── ddos_config.json # Real-time DDoS thresholds and rate limiting settings
├── Dockerfile       # Container definition for containerized backend deployments
├── main.py          # Primary application entry point (FastAPI server & Anycast reverse proxy)
└── requirements.txt # Python package dependencies
```

---

## 🏛️ `src/` Module Breakdown

The core logic inside `src/` is modularized into specialized packages:

| Package | Purpose | Key Components |
| :--- | :--- | :--- |
| `src/api/` | REST API Controllers | Modular `v1/` routers for websites, domains, billing, malware, WAF, notifications, and legacy endpoints. |
| `src/auth/` | Authentication & Security | JWT, session management, MFA (TOTP), OAuth2, CSRF protection, brute-force defenses. |
| `src/database/` | Database Layer | MongoDB client connection pool, indexing, and collection handlers. |
| `src/ddos/` | DDoS Protection Engine | Layer 7 rate-limiter, burst detection, sliding window algorithms, Redis caching. |
| `src/engine/` | Detection & Inspection | Hybrid engine combining Rule-based signatures, Semantic AST analysis, and ML inference. |
| `src/features/` | Feature Management | Dynamic feature toggles. |
| `src/security/` | Network & IP Rules | Dynamic in-memory IP whitelists/blacklists, CIDR filters, automatic temporary IP bans. |
| `src/services/` | External & Platform Services | Authoritative DNS server (port 53), SSL certificate manager, payment gateways (Stripe/bKash/Paddle). |
| `src/utils/` | Shared Helpers | Structured logging, ObjectId serialization, API response builders. |

---

## 🚀 Running the Backend

### Standard Development Server
```bash
python main.py
```
* Runs on port 8000 by default (configurable via `.env`).
* Authoritative DNS daemon binds on port 53 if enabled (`DNS_SERVER_ENABLED=true`).

### Running Tests
```bash
pytest tests/
```
