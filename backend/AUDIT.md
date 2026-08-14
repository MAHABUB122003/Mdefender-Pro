# MDefender Pro - Phase 0 Audit & Foundation Report

Date: 2026-08-14 · Scope: full-codebase audit + Phase 1 backend foundation.

## 1. What exists and works (do not break)

### Backend (`Mdefender/backend/`, FastAPI "MDefender Pro" v2.0.0)
- `main.py` (794 lines) defines all legacy routes directly (admin, user, WAF,
  scan, logs) plus `/health`, `/health/ml/*`, `/api/ml/status`, `/api/scan`.
- Auth is already strong: JWT + refresh cookies, CSRF, MFA, OAuth2 (Google),
  session management, brute-force lockout, audit logs (`src/auth/*`).
- Security: DDoS middleware (sliding window) + `/api/ddos` router, CORS locked
  to `AuthConfig.CORS_ORIGINS`, security headers middleware.
- Detection pipeline already usable: `RequestParser` → `FeatureExtractor` →
  `RuleEngine` → `MLDetector` (WAF v2.0.0) → `MalwareDetector` (v1.0.0).
- DB: MongoDB singleton (`src/database/mongodb_connection.py`) with in-memory
  fallback. Collections: users, websites, api_keys, security_events,
  waf_events, malware_scans, quarantine_files, wordpress_sites, subscriptions,
  blacklist, audit_logs, settings, and more.

### Frontend (`Mdefender/frontend/`)
- React 19 + Vite + Tailwind 4 + react-router 7 + chart.js; fetch-based API
  client in `src/api/api.js` (no axios).

### Machine learning / datasets
- Dataset A: `waf_ml_dataset.csv` (5.3M rows / 648MB) → WAF model.
- Dataset B: `Malware scaning datasets/` → signature rules (11 patterns,
  127,876 hashes in `signatures/rules.json` + `hashes.csv`) and 29,559-wordpress
  sample corpus for the malware model.
- Models copied byte-identical from `ml/` to `backend/models/`.

### WordPress plugin (`Mdefender-Pro_wp/`)
- v3.5.0, `waf-firewall.php`, 15 includes, 44 AJAX endpoints, 10 tables, cron.

### SDKs
- npm (`npm-package/`), php (`php-package/`), python (`python-package/`).

## 2. Verified test results (runtime)
- WAF model loads v2.0.0; malware model loads v1.0.0.
- Real dataset calibration: BENIGN mean prob 0.006 / p90 0.011 / max 0.073;
  MAL mean 0.989 → thresholds are correct.
- Live inference: SQLi `1' OR '1'='1' -- ` → BLOCK (risk 78, conf 0.9991),
  benign GET → ALLOW, real webshell sample → malicious (family: webshell).
- Edge case accepted: one-line `<?php echo "Hello World"; ?>` → suspicious
  (0.52). Real-data calibration shows the model is sound; no threshold change.

## 3. Known defects / debts (fix in later phases)
- `ml/malware/train.py` points to a broken path
  (`D:\Documents\ML_all_Payloads\data\wordpress_malware`); real data lives at
  `Malware scaning datasets\wordpress_malware\samples\{benign,malicious}`.
- `frontend/src/components/Modal.jsx` imports `lucide-react` which is NOT in
  `package.json` (crashes the page).
- Port mismatch: backend `.env` PORT=5000, uvicorn default 8000, tests hit
  8000, frontend api.js falls back to 5000.
- npm package is named `mdefender-pro` but docs say `mdefender`; `monitor`
  mode is documented but not implemented; SDKs forward headers unredacted.
- WP plugin remote ML API default is a dead localhost placeholder.

## 4. Phase 1 foundation delivered
New services (all DB-backed, no fake data):
- `src/services/plan_service.py` - DEFAULT_PLANS (free/pro/business/enterprise)
  with limits + `price_id`; DB override via `settings{_type:"plans"}`.
- `src/services/subscription_service.py` - Paddle subscription records,
  admin entitlements, effective-plan precedence (admin > paddle > user),
  usage counters (`usage_metrics`), website/scan limits, billing dashboard,
  admin grant/revoke, plan change.
- `src/services/paddle_service.py` - real Paddle Billing checkout/prices/
  subscription APIs + constant-time webhook HMAC-SHA256 verification
  (`"{ts}:{raw_body}"`) with replay protection.
- `src/services/notification_service.py` - dashboard notifications with
  per-user preferences (email/webhook channels reserved, honest defaults).
- `src/engine/signature_detector.py` - loads Dataset B rules + hashes.
- `src/engine/decision_engine.py` - weighted rule/ML/reputation/rate-limit/
  behavior risk scoring → ALLOW/MONITOR/CHALLENGE/RATE_LIMIT/BLOCK.
- `src/features/feature_flags.py` - runtime flags stored in `settings`.
- `src/utils/api_response.py` - envelope + `serialize`/`clean_datetime`.

New v1 API (`/api/v1`, 54 routes, wired into `main.py`):
- `websites_api.py` - CRUD, pause/resume, verify, scoped API keys
  (create/rotate/revoke, `mdf_live_` keys hashed at rest, shown once),
  installation instructions per platform; website limit enforced.
- `waf_api.py` - SDK-facing `POST /waf/analyze` (API-key auth + hostname
  check), event persistence, overview stats, event feed.
- `malware_api.py` - `scan-file` (signature + ML, verdict/risk/family),
  scan history, findings feed, quarantine with backup + restore/delete
  (never auto-deletes; audited).
- `wordpress_api.py` - plugin connect/heartbeat/status/disconnect with
  hashed site tokens.
- `billing_api.py` - plans, checkout (hosted Paddle), subscription status,
  change/cancel, and the verified Paddle webhook.
- `notifications_api.py` - list/unread/preferences/read/delete.
- `admin_api.py` - users (suspend/restore/role), entitlements grant/revoke,
  audit log, overview counters, system health, model registry, feature flags.
- `deps.py` - `get_owned_website` (tenant isolation), `get_db`.

MongoDB additions: `entitlements`, `notifications`, `usage_metrics`,
`paddle_transactions` collections + indexes; `__getitem__` bridge.

## 5. Verification
- `python -m py_compile` clean on all new modules.
- `main.py` imports; 196 routes total (54 new v1).
- 25/25 user v1 smoke tests PASS (register→website→API key→WAF analyze
  SQL=BLOCK/benign=ALLOW→events→malware scan malicious=webshell→quarantine→
  notifications→WP connect/heartbeat→prefs→findings→installation).
- 12/12 admin v1 smoke tests PASS (overview/users/audit/entitlements/flags/
  system-health healthy/model-registry/grant/update).
- Test accounts cleaned from dev DB after verification.

## 6. Phase 1 frontend (delivered)
- `lucide-react` installed (fixes `Modal.jsx` import).
- `frontend/src/api/api.js` - `v1` namespace client for every v1 endpoint +
  `v1Call` envelope unwrap (`success/data/error`) and `qs` helper.
- `frontend/src/pages/v1/ui.jsx` - shared kit (Card, Stat, Badge, Spinner,
  Empty, ErrorBox, useAsync, Btn, Field, fmtDate, fmtBytes).
- New pages: `v1/Overview.jsx`, `v1/Websites.jsx` (add/list/pause/resume/
  verify/API keys/installation), `v1/Waf.jsx` (overview + events + live
  API-key attack tester), `v1/Malware.jsx` (scan-file base64, findings,
  quarantine, scan history), `v1/Billing.jsx` (plans/subscription/checkout),
  `v1/Notifications.jsx` (list + preferences), `v1/AdminDashboard.jsx`,
  `v1/AdminUsers.jsx`.
- `App.jsx` routes: `/app/*` (UserLayout, user-gated) and `/admin/app/*`
  (Layout, admin-gated); nav links in UserSidebar.jsx + Sidebar.jsx.
- All pages shaped against backend source; live E2E run verified register →
  login → plans → website/API key → installation → WAF analyze
  (SQL=BLOCK/benign=ALLOW) → overview/events → malware scan → findings/
  quarantine → notifications/prefs → pause/resume/verify → checkout
  (honest "not enabled" until Paddle configured) → admin overview/health/
  models/flags/users/entitlements/audit-log.
- `npm run build` passes (78 modules); `npm run lint`: 0 errors in v1/api.js
  (65 pre-existing legacy warnings remain untouched).
- Bugfix: `signature_detector.get_status()` reported `hashes_loaded=3`
  (`len()` of the 3-set tuple); now sums the sets (383,628 hashes).
- Notification preferences UI uses the real backend keys (channels: email/
  dashboard/webhook; events: critical_attack, malware_detected,
  website_disconnected, api_key_revoked, subscription_expired,
  scan_completed, config_issue); `webhook_url` string excluded from toggles.
- Test accounts cleaned from dev DB after live verification.

## 7. WordPress plugin -> cloud service (delivered)
User directive: update the `Mdefender-Pro_wp` plugin so it gets its service from
the MDefender-Pro website via the website API key (ML WAF + malware scanning,
Wordfence-style); remove what's unimportant, add what's important.

Backend (plugin-facing v1 endpoints, all API-key authenticated + tenant-scoped):
- `POST /api/v1/wordpress/connect` (existing) - handshake, returns site token;
  token stored SHA256-hashed under `websites.wordpress_connection.site_token`.
- `POST /api/v1/wordpress/heartbeat` (existing) - plugin pushes online status +
  local blocked/allowed counters into `wordpress_sites.last_stats`.
- `POST /api/v1/waf/analyze` (existing) - cloud ML WAF decision
  (`decision` ALLOW/BLOCK, `action`, `risk_score`, `confidence`, `reason`,
  `reference_id`, `attack_type`).
- `POST /api/v1/malware/plugin-scan` (new) - file scan via API key (Bearer or
  body) + optional site token; refactored shared pipeline `_run_file_scan`
  (signature + ML + verdict + quarantine backup + notification) now also used
  by the session `scan-file` endpoint. NO per-day scan cap for plugin sweeps
  (dashboard scans keep the cap); usage counters stay truthful.
- `GET /api/v1/malware/plugin-findings` (new) - findings feed for the key's
  website; clean verdicts are stored in the scan record but excluded from the
  findings feed.
- `GET /api/v1/waf/plugin-events` (new) - security events for the key's website.
- Bugfix: site_token was read from `wordpress_sites` (never written there);
  now read from `websites.wordpress_connection.site_token`, so a bad token
  correctly returns 403 and is not scanned.

Plugin (`Mdefender-Pro_wp`, v4.0.0):
- `includes/class-ml-api-client.php` fully rewritten for the v1 backend
  (Bearer key, envelope unwrap, `analyze`/`scan_file`/`connect`/`heartbeat`/
  `get_events`/`get_findings`/`test_connection`/`get_status`); legacy methods
  (`get_stats`, `block_ip_remotely`, `get_remote_logs`) removed; legacy callers
  in the scanner updated to the new decision/verdict shapes.
- `waf-firewall.php` v4.0.0 - site token generation, hourly cloud heartbeat
  cron (`waf_fw_cloud_heartbeat`) pushing local blocked/allowed counters via
  `waf_fw_bump_stat`, deactivate cleans the new hook.
- `class-db.php` - new option defaults: `waf_fw_website_id`, `waf_fw_site_token`,
  `waf_fw_connected`, `waf_fw_cloud_mode`, `waf_fw_stats_blocked/allowed`.
- `class-ajax-handler.php` - `get_settings`/`save_settings` support website_id +
  cloud_mode and auto-run the connect handshake when cloud fields change;
  `get_ml_status` returns cloud status; new `get_cloud_dashboard` action
  (events + findings for the settings/dashboard UI).
- `admin/partials/settings.php` - the legacy "MDefender-Pro API" + "Backend"
  cards replaced with one "MDefender-Pro Cloud Service" card (API base URL,
  website API key, website ID, cloud mode, Save & Connect / Test Connection).
- `class-waf-engine.php` - cloud analyze honored when local attack signal
  exists: `BLOCK`/`block`/`rate_limit` decisions are enforced (protect mode),
  monitor mode logs without blocking, `off` skips the cloud entirely; local
  threshold fallback preserved for non-BLOCK responses.
- Live E2E (final_check3): register/login/website/connect/site-token,
  plugin-scan malicious (100) + clean, bad site token -> 403 (not scanned),
  plugin-findings = 1 (clean excluded), analyze SQL -> BLOCK, plugin-events = 1,
  session scan-file via shared pipeline -> malicious, heartbeat bad key -> 401.
  All test data cleaned; server stopped after verification.

## 8. Known defects / debts (fix in later phases)
- Malware ML model false-positives short one-line PHP files: `<?php echo 'hello'; ?>`
  scored `malicious` (risk 75, family wordpress_infection) while multi-line
  equivalents scored clean. Likely n-gram skew from one-line malicious samples;
  fix in Phase 5 (`ml/malware/train.py` dataset + feature review).
- `POST /api/v1/wordpress/heartbeat` validates the API key + domain but not the
  site token (liveness ping only). site_token IS enforced on plugin-scan (403).

## 9. Plugin onboarding popup + dual monitoring (delivered)
User directive: after installing/activating the plugin, show one popup to connect
the key; the user registers/logs in on the MDefender-Pro website, gets one API
key, pastes it in the plugin, and the plugin starts working (ML WAF + malware
scanning from the cloud). The user must be able to monitor every website from
BOTH the MDefender-Pro dashboard and the plugin.

Backend changes:
- None required: `connect` already resolves the website from the API key + domain
  alone (it never read `website_id` from the body), so the plugin can connect
  with just "API base URL + API key". Verified live (final_check4): connect with
  no website_id returns `site_token` + `website_id` (auto-stored by the plugin).

Plugin changes:
- `waf-firewall.php` - activation sets `waf_fw_onboarding_pending=yes` (only when
  not already connected) + one-shot `admin_init` redirect to the settings page
  (`waf_fw_maybe_redirect_setup`); deactivation/re-activation won't re-nag once
  connected.
- `admin/partials/settings.php` - professional onboarding wizard (modal) shown on
  first activation: Step 1 "Register/login -> add website -> copy API key",
  Step 2 paste API Base URL + API key (+ optional dashboard URL), Connect button
  calls the normal save/connect flow; Website ID is auto-detected on success.
  Dismiss/skip/complete clears the flag via the new `waf_fw_complete_onboarding`
  AJAX action. Optional `waf_fw_dashboard_url` (default `https://mdefender-pro.io`)
  powers the "Open MDefender-Pro Dashboard" button.
- `includes/class-ml-api-client.php` - `connect()` no longer requires a Website ID
  (backend resolves it from the key); on success the plugin stores `website_id`.
- `includes/class-ajax-handler.php` - `save_settings` now runs the connect
  handshake with URL + key only (website_id optional), whitelists
  `dashboard_url`, and adds `complete_onboarding`.
- `includes/class-db.php` - new default `waf_fw_dashboard_url`.
- `admin/partials/dashboard.php` - new "MDefender-Pro Cloud" full-width card
  (connected/mode badge, blocked requests, malicious findings, recent cloud
  events + malware findings, "Open MDefender-Pro Dashboard" + "Cloud Settings"
  buttons) fed by the existing `waf_fw_get_cloud_dashboard` AJAX; shows a
  "Connect Now" CTA when not connected.

Live verification (final_check4, all PASS then cleaned up): register (cookie
session) -> login -> create website (API key shown once) -> plugin connect with
ONLY api_key+domain returns site_token+website_id -> heartbeat ok / bad API key
401 -> plugin-scan malicious (risk 100) + clean -> plugin-findings = 1 (clean
excluded) -> analyze benign = ALLOW / SQLi = BLOCK (risk 73) -> plugin-events
include block -> bad API key on plugin-events = 401. Test data removed.

Flow now matches the user journey end to end: install/activate -> one popup ->
user gets a key from mdefender-pro.io -> pastes it -> plugin connects and serves
ML WAF + malware scanning from the cloud -> the same data (events, findings,
blocked/allowed counters) is visible in BOTH the MDefender-Pro dashboard and the
plugin's own dashboard.

## 10. Next
Phase 2 public marketing site; Phase 3 user dashboard polish; Phase 4 admin
dashboard polish; then Phase 5 fix `ml/malware/train.py` dataset path + the
short-PHP false-positive above, Phase 7 SDK fixes, Phase 8 acceptance tests
(A-E).
