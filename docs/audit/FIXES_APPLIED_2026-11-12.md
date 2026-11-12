# Hotfixes applied — 12 November 2026

These are the launch-blocking fixes implemented immediately after the audit, plus the verification that was run. The running backend still needs a restart to pick them up.

## 1. Fixes applied

| # | Area | File(s) | Change | Why |
|---|---|---|---|---|
| 1 | Auth backdoor | `backend/src/auth/login_service.py` | Removed the `user@gmail.com` password bypass and the auto-seeding demo account (including its published API key) | Unauthenticated Pro-account access |
| 2 | Brute-force bypass | `backend/src/auth/brute_force_service.py` | Removed the lockout exemption for `user@gmail.com`, `user`, `admin`, `admin@mdefender.com` | The exemption hid attacks on exactly those accounts |
| 3 | Admin bootstrap | `backend/main.py` | Admin is now seeded with `ADMIN_PASSWORD` (fallback only in development); boot refuses to start when `APP_ENV=production` and the password is empty/`admin123` | No default super-admin in production |
| 4 | MFA bypass | `backend/src/auth/dependencies.py`, `backend/main.py` | `get_current_admin` and `verify_user_token_compat` now reject `mfa_pending` tokens | A password alone could reach all admin APIs when MFA was enabled |
| 5 | Tenant isolation (2FA) | `backend/src/api/v1/websites_api.py` | `get_2fa_config`, `verify_and_enable_2fa`, `disable_2fa` resolve the site through `get_owned_website()`; fixed the duplicate `$or` filter in the "any remaining" check | Cross-tenant read/replace/disable of site 2FA secrets |
| 6 | Payment bypass | `backend/src/services/bkash_service.py` | bKash now returns `gateway_unavailable` instead of auto-activating a paid plan; legacy auto-activation block marked unreachable/TODO | Free Enterprise plans with sandbox keys |
| 7 | Payment bypass | `backend/main.py` | `POST /api/user/upgrade-plan` returns 403 | Any logged-in user could grant themselves any plan |
| 8 | Fake telemetry | `frontend/src/pages/Dashboard.jsx` | Removed `[4, 2, 1, 1]` fabricated attack chart; added a truthful empty state | Trust |
| 9 | Fake telemetry | `frontend/src/pages/DDoSDashboard.jsx` | Removed the fabricated 6-point attack timeline | Trust |
| 10 | Fake telemetry | `backend/src/api/v1/admin_api.py` | Removed hardcoded checksum totals (`5,324,810`, `18`) and the random `CVE-YYYY-NNNN` generator (`LOCAL-DRAFT` now) | Trust / legal |
| 11 | API client bugs | `frontend/src/api/api.js`, `pages/AttackLearning.jsx` | Removed duplicate method keys; renamed learning whitelist methods so `Rules.jsx` talks to the rule-whitelist API again; removed duplicate pricing/clean-logs/unlock methods | False-positive workflow was reading/deleting the wrong collection |
| 12 | Dead code | `frontend/src/components/UserSidebar.jsx` | `api.getUserData()` → `api.getUserProfile()` (the former never existed) | API-key copy button silently failed |
| 13 | Navigation | `frontend/src/components/Sidebar.jsx` | Added Attack Logs, Patches & Rules, Evasion Lab, DDoS Shield, Remote Inspector; fixed Support/Inspector active states | 5 of 12 admin routes were unreachable |
| 14 | Routing | `frontend/src/App.jsx` | Removed the duplicate `/user/blacklist` redirect that shadowed the real page | Broken route |

## 2. Verification run

| Check | Command | Result |
|---|---|---|
| Python syntax | `ast.parse` on all modified modules | 7/7 OK |
| Backend imports | `python -c "import src.api.v1.websites_api, ..."` | OK (Mongo connected) |
| JSX/JS parse | Babel parse of all `frontend/src` files | 103 files, 0 failures |
| Duplicate API methods | Object-key scan of `api.js` | 0 duplicates (312 methods) |
| Production build | `npm run build` | ✓ built in 2.42 s |
| Bundle snapshot | build output | `index` 384.77 kB (106.30 kB gzip); `UserTools` 174.83 kB; `dist` 179.62 kB |

## 3. Still open (do not launch without these)

These remain from the audit and are **not** fixed by the hotfixes above:

1. **Rotate every secret in `backend/.env`** — Paddle live key, Paddle webhook secret, Google client secret, SMTP password, bKash keys, `SECRET_KEY`, `JWT_SECRET_KEY`, admin password. Assume they are compromised (they were shipped in the repo folder).
2. **MongoDB/Redis authentication + network isolation** — no auth users exist; `docker-compose.yml` publishes 27017/6379. Bind to localhost/internal network and enable auth.
3. **`.dockerignore`** — `backend/Dockerfile` copies `.env` into the image.
4. **`COOKIE_SECURE=true`** and CORS trimmed to real origins (remove `http://217.15.170.82`).
5. **Session revocation** — access tokens are not checked against the DB; logout-all/force-logout still do not invalidate them.
6. **CSRF enforcement** — `verify_csrf_token` exists but is not attached to any route.
7. **SSRF** — tenant-supplied URLs are fetched by monitoring/scanner without `OriginValidator`.
8. **API-key scoping** — site keys are permanent, plaintext, shared across sites, and act as full-account credentials.
9. **Admin MFA enrolment** — admin login is still password-only; the resolver gate only stops pre-MFA tokens.
10. **Fake identity fallbacks** — `"SecOps Lead Operator"` / `operator@mdefender.io` still appear when a profile is missing.
11. **Delete the existing demo account in MongoDB** — code no longer creates it, but the previously seeded `user@gmail.com` row (and its sites/API key) may still exist. Run `python backend/scripts/security_cleanup.py --apply` after reviewing the dry run.
12. **Rotate the admin password** — `backend/.env` still contains `ADMIN_PASSWORD=admin123` for local development. Change it before exposing the panel, and set `APP_ENV=production` on the server.

## 4. How to apply

```powershell
# 1) Review the security cleanup dry-run (no writes)
cd D:\Mdefender\backend
python scripts/security_cleanup.py

# 2) Apply: deactivate the demo account, rotate its API key, flag default admin
python scripts/security_cleanup.py --apply

# 3) Set a strong admin password in backend/.env, then set APP_ENV=production on the server

# 4) Restart the backend to load the code changes
#    (stop the current uvicorn process and start it again)

# 5) Rebuild the frontend for production
cd D:\Mdefender\frontend
npm run build
```

## 5. Suggested immediate smoke tests

- `POST /api/auth/login` with `user@gmail.com` / `user123` → **401**.
- `POST /api/auth/login` with the admin account and a wrong password → **401**, no bypass.
- `POST /api/user/upgrade-plan` with a normal user token → **403**.
- `GET /api/v1/websites/{site_of_other_user}/security/2fa/config` → **404**.
- Admin sidebar shows 12 items and every route opens.
- Admin dashboard with an empty database shows "No threats recorded yet" (no fake doughnut).
- Rules → whitelist tab lists rule whitelists and delete removes the right record.

> Note: the WordPress test site (`http://localhost/mahabub`) still returns HTTP 500 because MySQL is not running. Start MySQL in XAMPP before end-to-end plugin tests.
