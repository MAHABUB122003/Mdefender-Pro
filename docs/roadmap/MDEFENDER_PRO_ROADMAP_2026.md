# MDefender Pro — 180-Day Roadmap to an International-Grade WordPress Security SaaS

**Version:** 1.0 · **Date:** 12 November 2026  
**Companion document:** [Product, Security & Market Audit](../audit/MDEFENDER_PRO_AUDIT_2026.md)  
**Hotfix log:** [Fixes applied on 12 Nov 2026](../audit/FIXES_APPLIED_2026-11-12.md)
**Goal:** turn a feature-rich alpha into a product that can be sold, trusted and scaled internationally — without losing the speed and breadth that make it different.

---

## 1. Strategy in one page

**The bet:** agencies and small hosts need one lightweight control plane for many WordPress sites — WAF, malware, updates, backups, hardening, monitoring, client reports — with **virtual patching fast enough to matter** and **no lock-in of customer data**. Wordfence owns the single-site plugin mindshare, Sucuri owns proxy+cleanup, Patchstack owns vulnerability mitigation; none of them owns the *multi-site operator console* at a fair price.

**The constraint:** nothing else matters until trust is fixed. A security product with a login backdoor, default admin password, fabricated charts and unverifiable claims cannot be sold at any price. Sequence is therefore: **truth → security → control plane → design → scale → differentiation.**

**The metric that decides success:** a new agency can connect 10 sites, see real protection, and export a branded client report — in under 15 minutes, with zero support contact.

---

## 2. Phase overview

| Phase | Weeks | Theme | Exit question |
|---|---|---|---|
| **0. Trust & Safety** | 1–2 | Remove every lie and every open door | Would a pen-tester find a critical in the first hour? |
| **1. Control Plane Integrity** | 3–6 | Zero-day loop, billing truth, admin ops v1, observability | Can an operator run the business from the panel? |
| **2. Design System & Flagship Pages** | 5–10 | One system, nine signature screens | Does it look and feel like a $10M SaaS? |
| **3. Scale & Compliance** | 9–16 | 500k sites, data residency, SOC 2 readiness, i18n | Can it serve 100k users without lying about uptime? |
| **4. Differentiation & GTM** | 17–24 | Agency program, white-label, threat intel, marketplace | Why choose MDefender over Patchstack/Sucuri? |

Overlap is intentional: design (Phase 2) starts once the security fixes land, while backend hardening (Phase 1/3) continues in parallel.

---

## 3. Phase 0 — Trust & Safety (Weeks 1–2)

**Objective:** eliminate launch-blocking security, legal and credibility risks. No new features.

### Workstream A — Authentication & authorization (owner: backend)
- Delete the `user@gmail.com` backdoor and demo seeding (`login_service.py:94-99, 305-337`), and the brute-force exemption list (`brute_force_service.py:70-75`).
- Remove `admin123` seeding and fallbacks (`main.py:78-95`, `security/auth.py:56`); provision the first admin via CLI; force password rotation; require TOTP for admins.
- Reject `mfa_pending` in `get_current_admin` and `verify_user_token_compat`; then move to a dedicated `mfa_challenge` token type.
- Fix 2FA ownership (`websites_api.py:12775-12990`); never return TOTP secrets; regression test A/B tenants.
- Enforce CSRF on cookie-authenticated writes; remove `?token=` and `?api_key=` auth paths.
- Session model v1: store sessions, check `jti`/`session_id`/`token_version`, make logout-all and force-logout effective within 60 seconds.

### Workstream B — Money (owner: backend)
- bKash: hard-fail when unconfigured; only grant after verified execute/status; idempotency key per invoice.
- Delete public `/api/user/upgrade-plan`; plan changes only via verified webhook or admin grant with reason.
- Paddle: verify webhook signatures in production; handle `subscription.canceled`, `past_due`, refunds; add entitlement reconciliation job.
- Pricing single source of truth: plan service → `/pricing/plans` → landing → checkout. Fix `$4/site` vs $9/5 sites.

### Workstream C — Infrastructure & secrets (owner: DevOps)
- Rotate every credential in `backend/.env` (Paddle live key, webhook secret, Google secret, SMTP password, bKash keys, JWT secret, admin password).
- MongoDB auth + internal-only network; Redis `requirepass`; stop publishing 27017/6379.
- Add `.dockerignore`; secrets only at runtime; `COOKIE_SECURE=true`; trim CORS to real origins.
- Fail-fast on Mongo/Redis at startup; split `/health/live` and `/health/ready`; remove InMemoryDB fallback in production.

### Workstream D — Truth in the product (owner: full-stack)
- Remove fabricated data: dashboard `[4,2,1,1]`, DDoS timeline, checksum fallbacks, random CVE ids, hardcoded regional latencies, "500k sites" claims in UI.
- Honest empty states everywhere ("No traffic yet", "Sync not run").
- Create `/security` and `/benchmark` pages with methodology, dates, and reproducible numbers.
- Align claims: one canonical metric set (records, model version, categories, measured p50/p95 latency on stated hardware).

### Workstream E — Legal & trust surface (owner: founder + frontend)
- Publish Terms, Privacy, DPA template, Refund policy, Acceptable Use, Subprocessors, `security.txt`, disclosure policy.
- Status page (BetterStack/Instatus) with real components; incident history.
- Cookie consent (if EU traffic) and analytics disclosure.
- Fix the WordPress test environment (MySQL down; site 500) so E2E can be validated.

### Workstream F — Obvious bugs (owner: frontend)
- `api.js`: remove duplicate keys; rename learning methods (`adminGetLearningWhitelists`, `adminDeleteLearningWhitelist`, …) and update `AttackLearning.jsx`; fix `Rules.jsx` to use rule whitelists.
- Remove dead `api.getUserData()`; replace fake identity fallbacks with "Complete your profile".
- Fix duplicate `/user/blacklist` route; make `/about` a real About page.
- Add nav entries for Logs, Rules, Learning, DDoS, Inspector (or hide until redesigned).

### Exit criteria (all must pass)
- [ ] Pen-test checklist: no default credentials, no auth bypass, no IDOR, no free plan grant, no unauthenticated DB.
- [ ] A fresh clone cannot boot with default admin; first-run flow documented.
- [ ] Zero fabricated numbers in UI (grep for fallback arrays/constants reviewed).
- [ ] Legal pages + status page live; claims match plan API.
- [ ] Secrets rotated and confirmed absent from git history and images.
- [ ] WordPress E2E: install plugin → connect → block a test SQLi → see log in dashboard.

**Effort:** ~6 person-weeks · **Risk if skipped:** existential.

---

## 4. Phase 1 — Control Plane Integrity (Weeks 3–6)

**Objective:** make the operator console and the zero-day loop real, and make failures visible.

### 1.1 Zero-day / virtual patching v2 (the flagship)
- **Rule bundle service:** versioned JSON bundles (`rules-v{n}.json`) with signature (Ed25519), published to object storage; manifest with `version`, `created_at`, `min_plugin_version`, `rollback_to`.
- **Delivery:** Redis pub/sub invalidation to edge workers; plugin polls `/plugin/config?version=` every 60s with ETag; push webhook optional. Target: **p95 propagation < 60s**, measurable per site.
- **Targeting:** global / plan / tenant / site; canary cohort (1% → 10% → 100%) with automatic rollback on FP-rate threshold.
- **Safety:** dry-run/simulation endpoint (already exists as test-evasion — make it real), regex validation, ReDoS guard, max pattern length, hit counters, FP reports.
- **Rollback:** one click to previous bundle; per-tenant override to disable a rule.
- **Operator UI:** Security Operations → Patches: list, diff, simulate, publish, canary, rollback, per-site rollout status.

### 1.2 Admin operations console v1
Build the missing surfaces (backend exists for most):
- **Overview:** MRR/ARR, active trials, conversion, churn, sites protected, threats blocked 24h, incidents, queue lag, error rate.
- **Tenants:** search, plan/entitlement timeline, impersonation with consent + audit, suspend/restore, data export/purge.
- **Billing:** subscriptions, invoices, failed payments/dunning, refunds, coupons, revenue by plan/region.
- **Security Operations:** patches, whitelists, threat intel/CVE feed, model registry, feature flags, checksum sync status.
- **Platform:** health per dependency, queue depth, deploy version, error budget, broadcast notices, email deliverability.
- **Audit & Compliance:** append-only audit trail with filters/export, GDPR request queue, retention settings.

### 1.3 Backend correctness & developer experience
- Freeze and shim legacy `/api/*`; one router per domain under `/api/v1`; single response envelope; delete 200-with-error returns.
- Fix duplicate route registrations (`POST /users/plan` ×2, upgrade-plan).
- Add OpenAPI tags/examples, a public API reference (Mintlify/Redoc), and typed SDKs (JS/PHP) generated from the spec.
- CI: lint + type-check + unit + contract tests; migrations runner; seed scripts; staging environment.

### 1.4 Observability & reliability
- Structured JSON logs with `request_id`; OpenTelemetry traces; Sentry (frontend + backend); Prometheus metrics (`waf_decisions_total`, `waf_latency_ms`, `queue_depth`, `mongo_query_ms`, `sync_lag_seconds`).
- Uptime checks per dependency; alerting to PagerDuty/Slack; on-call runbooks.
- Error budget policy: 99.9% monthly; incident severity matrix and postmortem template.

### 1.5 Billing hardening
- Paddle as source of truth; webhook idempotency table; entitlement reconciliation cron; dunning emails; tax/VAT via Paddle; invoice PDF; refund flow with audit.
- Trial abuse controls (email/domain/device signals), plan downgrade grace period.

### Exit criteria
- [ ] Virtual patch published in console reaches a test site in < 60s and can be rolled back in < 60s.
- [ ] Operator can answer "what is my MRR this month?" and "which sites are failing updates?" without DB access.
- [ ] Every API failure returns a correct HTTP status and error code; OpenAPI is complete.
- [ ] Dashboards show real data with empty states, not fallbacks.
- [ ] Mean time to detect dependency failure < 2 minutes.

**Effort:** ~10 person-weeks.

---

## 5. Phase 2 — Design System & Flagship Pages (Weeks 5–10)

**Objective:** one coherent, premium product surface across marketing, auth, admin and tenant console.

### 2.1 Foundations (Week 5)
- Token package (`tokens.css` + TS export): colour, type, spacing, radius, shadow, motion; light/dark.
- Component library (24): Button, IconButton, Input, Select, Combobox, Checkbox, Radio, Switch, Badge, Tag, Tooltip, Popover, Dropdown, Modal, Drawer, Table (sort/filter/paginate), Tabs, Accordion, Toast, Alert, Skeleton, EmptyState, PageHeader, StatCard, Stepper.
- Storybook (or Ladle) with visual regression; ESLint rule banning raw hex in `src/pages`.

### 2.2 Flagship screens (Weeks 6–9)
| Screen | Scope |
|---|---|
| Landing | New narrative: "Protect 5 or 5,000 WordPress sites from one console". 8 sections, real screenshots, benchmark, trust bar, 3 CTAs |
| Pricing | Per-site calculator, annual toggle, comparison, agency plan, FAQ, money-back |
| Auth | Unified user/admin, passkeys, MFA, SSO, clear errors |
| Admin Overview | Revenue + security + fleet, time range, drill-down |
| Tenant Overview | Fleet posture score, top risks, next best action, recent incidents |
| Sites (master-detail) | Row → drawer: protection state, versions, last scan, quick actions |
| Logs | Query builder, saved views, live tail, export, virtualization |
| Reports | Branded PDF, executive summary, trend, remediation status |
| Block page | Real edge template: brand, reason, request id, support, 3-step explanation |

### 2.3 UX operations
- Onboarding checklist: add site → install plugin → verify connection → run first scan → enable protection; progress persisted; "protection active" celebration.
- Empty states with next action on every list; skeletons instead of spinners; optimistic updates for toggles.
- Accessibility pass: WCAG 2.2 AA; keyboard traps; focus rings; table semantics; contrast ≥ 4.5:1.
- Mobile: console usable at 360px (sidebar drawer, stacked tables, sticky actions).
- Copy: one voice, no jargon ("Biometric & Bot Shield" → "Bot protection"), consistent capitalisation.
- i18n foundation: `react-i18next`, ICU messages, locale detection, currency/date formatting; English + Bengali at launch, then ES/DE/FR/ID.

### Exit criteria
- [ ] < 40 raw hex literals in `src/`; all pages use components.
- [ ] Lighthouse: performance ≥ 85 mobile, accessibility ≥ 95, SEO ≥ 95 on marketing pages.
- [ ] SUS-style usability test with 5 agency users: connect + report in < 15 min.
- [ ] No page exceeds 800 lines (split into modules).

**Effort:** ~12 person-weeks (design + frontend).

---

## 6. Phase 3 — Scale & Compliance (Weeks 9–16)

**Objective:** make the "100k users / 500k sites on one control plane" claim true and auditable.

### 3.1 Data plane separation
- Edge inspector workers: stateless, read versioned config from Redis, evaluate WAF in-process (no Mongo per request). Start with a Python worker pool; evaluate Rust/Go if p95 > 5ms.
- Redis hot keys: `site:{id}:config`, `rules:{version}`, `ip:block:{hash}`, `rate:{ip}:{window}` with TTL and versioning.
- Move `virtual_patches` and whitelists out of the per-request path; compile to a bundle, cache in Redis, invalidate on publish.
- Plugin: signed bundles, local cache, fail-safe behaviour when cloud is unreachable (documented), latency budget < 5ms on the request path.

### 3.2 Database & jobs
- Index migration for every real query path (`dns_records{domain,name,type}`, `blacklist{user_id,blocked_at}`, `websites{user_id,status}`, `malware_scans{website_id,timestamp}`, `audit_logs{user_id,created_at}`, `notifications{user_id,read}`).
- Pagination helper with max limit; cursor-based for logs; TTL for sessions/telemetry; archive cold logs to object storage.
- Job queue (Celery/RQ/Arq + Redis) for scans, backups, reports, webhooks, emails; idempotency keys; retries with backoff; dead-letter queue.
- Heartbeat: delta protocol — site sends counters; control plane returns only changed config version + diffs, never full collections.

### 3.3 Data residency & backups
- Customer data stays customer-side by default: plugin streams backups to customer storage (S3/Drive/Dropbox) or downloads; control plane keeps metadata only with TTL.
- If central storage is offered, publish region, encryption (KMS), retention, deletion SLA, and DPA terms.
- DR: cross-region Mongo replica set, object-storage versioning, quarterly restore drill.

### 3.4 Compliance
- SOC 2 Type I readiness: policies (access, change management, incident response, vendor management), asset inventory, risk register, background checks, training.
- GDPR/CCPA: DSAR workflow (export/delete) with SLA, records of processing, subprocessor list, data-flow map, breach notification runbook.
- Pen test (external) before GA; remediate criticals/highs; publish summary letter.
- PCI: never store card data (Paddle-hosted checkout), document SAQ-A.
- Security.txt, VDP, bug bounty (scope, safe harbour).

### 3.5 Distribution
- WordPress.org submission: readme, screenshots, i18n, GPL compliance, no freemium locks, external-service disclosure, privacy policy link.
- Custom updater with signed releases, staged rollout, rollback, minimum PHP/WP matrix, multisite support.
- One-click install from the dashboard (already partly built) with connection test.

### Exit criteria
- [ ] Load test: 5k rps WAF decisions at p95 < 10ms on staging; control plane 1k rps API p95 < 200ms.
- [ ] 500k synthetic sites: heartbeat completes in < 2s p95; no full-collection scans.
- [ ] Restore drill: full tenant restore in < 30 min, verified.
- [ ] SOC 2 Type I report or gap assessment complete; pen test closed.
- [ ] Plugin listed on WordPress.org or approved for submission.

**Effort:** ~16 person-weeks.

---

## 7. Phase 4 — Differentiation & GTM (Weeks 17–24)

**Objective:** win the agency segment and build a moat that is hard to copy.

- **Agency program:** client sub-accounts, white-label dashboard + PDF reports, per-client billing, bulk onboarding, roles, SLA, partner directory.
- **Threat intelligence:** CVE feed with KEV prioritization, "exploited in the wild" badges, patch-availability tracking, weekly research note; public vulnerability DB page for SEO.
- **AI security analyst:** natural-language "what happened on these 10 sites this week?", guided remediation, false-positive triage assistant (guardrailed, with citations to logs).
- **Marketplace/integrations:** Cloudflare, cPanel/Plesk, MainWP/ManageWP, Slack/Teams, PagerDuty, Zapier, WHMCS.
- **Hosting/white-label API:** per-tenant isolation, usage-based billing, embeddable widget.
- **Community:** open-source hardening rules, bug bounty, conference talks, WordPress security report (data-driven, annual).

**Exit criteria:** 3 design-partner agencies live; 50 paying sites; activation > 60%; NPS > 40; first white-label customer.

---

## 8. 30 / 60 / 90-day plan

| Window | Must ship | Success measure |
|---|---|---|
| **Days 1–30** | All Phase 0 fixes; legal/status pages; honest metrics; admin nav; api.js bug; E2E green | Pen-test checklist clean; 0 criticals; demo to 3 agencies |
| **Days 31–60** | Virtual patching v2 (signed bundles, 60s propagation, rollback); admin Billing + SecOps v1; CI/observability; pricing alignment | Patch propagation p95 < 60s; MRR dashboard live; error budget tracked |
| **Days 61–90** | Design system + Landing/Pricing/Auth/Dashboard/Sites/Logs/Reports; onboarding checklist; i18n foundation; index migration; queue | Lighthouse ≥ 85/95; activation > 50%; p95 API < 300ms; 10 paying customers |

---

## 9. Sprint 1 backlog (two weeks, 4 engineers + designer)

| # | Task | Owner | Est. | Done when |
|---|---|---|---|---|
| 1 | Remove auth backdoor + demo seed + lockout exemptions | BE | 0.5d | `user@gmail.com` cannot log in with any password; tests |
| 2 | Remove admin123 seed/fallbacks; CLI admin provisioning; TOTP required | BE | 1d | Fresh boot has no default admin; admin login requires TOTP |
| 3 | `mfa_pending` rejection in all resolvers | BE | 0.5d | Pre-MFA token gets 401 on admin API |
| 4 | 2FA ownership fix + secret redaction | BE | 1d | Cross-tenant 2FA returns 404; secrets never in response |
| 5 | Disable free upgrade paths; bKash hard-fail | BE | 1d | Upgrade returns 403; unpaid plan unchanged |
| 6 | Rotate secrets; Mongo/Redis auth; `.dockerignore`; secure cookies | DevOps | 1d | External scan shows no open DB; image has no `.env` |
| 7 | Remove fake telemetry + honest empty states | FE | 1.5d | No fallback constants; empty states verified |
| 8 | `api.js` duplicate methods + Rules/AttackLearning calls | FE | 0.5d | Whitelist tab shows rule whitelists; delete works |
| 9 | Admin nav: Logs, Rules, Learning, DDoS, Inspector | FE | 0.5d | All routes reachable; active state correct |
| 10 | Legal pages + status page + security.txt | FE/Founder | 1d | Links in footer; status page live |
| 11 | Canonical metrics page + pricing alignment | FE/BE | 1d | Landing, pricing, plan API agree |
| 12 | WordPress E2E: connect → block → log | QA | 1d | Scripted test passes on `localhost/mahabub` |
| 13 | CI pipeline (lint, tests, build) + staging | DevOps | 1d | PR blocks on failure; staging URL |
| 14 | Audit trail append-only + admin-only notices | BE | 0.5d | Tenant cannot delete audit logs or broadcast |

---

## 10. KPIs to instrument from day one

**Product:** signup → site connected (%), time-to-first-value (median), first scan completed, protection enabled, weekly active fleets, feature adoption (backups, reports, updates).

**Security:** WAF decisions/day, block rate, false-positive reports per 10k requests, patch propagation p95, scan coverage, mean time to patch (MTTP), incidents per 1k sites.

**Reliability:** uptime per component, API p95/p99, error rate, queue depth, sync lag p95, restore success rate.

**Business:** trial start → paid (target 8–12%), MRR/ARR, ARPU, churn < 3%/month, NRR > 105%, CAC payback < 12 months, support tickets per 100 sites.

**Trust:** status-page incidents, pen-test criticals open (target 0), DSAR turnaround < 30 days, security questionnaire win rate.

---

## 11. Team & budget (lean, 6 months)

| Role | FTE | Focus |
|---|---|---|
| Backend/security | 2 | auth, billing, zero-day pipeline, scale |
| Frontend | 2 | design system, flagship pages, admin console |
| Plugin/WP | 1 | signed updates, compatibility, WP.org |
| DevOps/SRE | 0.5–1 | infra, CI, observability, compliance |
| Product designer | 1 | tokens, components, page redesign |
| QA/automation | 0.5 | E2E, regression, load |
| Founder/PM | 1 | GTM, legal, partnerships, priorities |

Indicative monthly cost (Bangladesh-based team + contractors + tools): **$8k–$14k/month**, plus infra $300–$800/month at early scale, pen test $8k–$15k one-off, SOC 2 Type I $10k–$20k.

---

## 12. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Security incident before fixes ship | High | Existential | Phase 0 first; freeze signups until auth fixed if needed |
| Fabricated claims discovered | Medium | High | Remove now; publish methodology; legal review |
| Scope creep across 225 routes | High | High | Freeze new features 60 days; one roadmap, weekly prioritisation |
| Single-VPS outage | Medium | High | HA Mongo, health-gated deploys, status page, SLA credits |
| Billing fraud / chargebacks | Medium | Medium | Paddle Radar, trial abuse controls, entitlement reconciliation |
| WP.org rejection | Medium | Medium | Compliance review before submission; fallback custom distribution |
| Key-person dependency | High | High | Documented runbooks, pair on critical paths, code review |
| Data-residency contradiction | Medium | High | Customer-side backups by default; DPA clarity |

---

## 13. What "done" looks like in 6 months

- A new agency signs up, connects 10 sites, sees real protection and exports a branded report in **under 15 minutes**.
- A zero-day is published in the console, reaches the fleet in **under 60 seconds**, and can be rolled back in one click.
- The admin console answers revenue, security and platform questions **without DB access**.
- Uptime is **99.9% measured**, status page is public, incidents have postmortems.
- Security questionnaire: SOC 2 Type I, pen-test summary, DPA, GDPR flow — all available on request.
- Pricing is consistent everywhere and **cannot be bypassed**.
- The product looks like one company: one palette, one type scale, one component library, one voice.

That is the difference between "14 million records in a repo" and "a security company international customers trust with their websites".
