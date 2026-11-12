# MDefender Pro — UI/UX Redesign Roadmap

**Theme:** *Quiet confidence — a security product that looks calm, precise and expensive.*  
**Date:** 12 November 2026  
**Scope:** marketing site, auth, user console, admin console, block page, email templates  
**Evidence:** live screenshots of `/`, `/pricing`, `/user/login`, `/blocked`, `/admin/dashboard` (Chrome 1440–1600 px), plus `index.css` (95 KB), `App.jsx`, `Sidebar.jsx`, `UserSidebar.jsx`, `Dashboard.jsx`, `BlockPage.jsx`

---

## 1. What the UI looks like today (diagnosis)

### 1.1 Four products pretending to be one

| Surface | Palette | Personality | Verdict |
|---|---|---|---|
| Marketing (`/`, `/pricing`) | warm paper `#F7F6F1`, deep forest, amber `#E8792F` | editorial, confident | Strong direction, but hero art is AI-generated and claims are loud |
| Auth (`/user/login`) | forest panel + cream form | premium, calm | Best surface in the product |
| Admin console | white/slate + blue `#2563EB`, pastel icon tiles | generic SaaS template | Clean but anonymous; no relation to the brand |
| User console | near-black green `#0c1615` + emerald + orange | different product | Third identity; heavy inline styles |
| Block page | gray browser mock + red X | broken/unfinished | Damages customer trust at the worst moment |

The single biggest visual problem is **not** any one page — it is that a customer moving from the landing page to the console feels they changed companies.

### 1.2 Specific issues found on screen

**Landing**
- Hero right side is a busy AI-generated dashboard collage; it reads as stock art, not as the real product. Enterprise buyers discount the whole page.
- Headline is 4 lines of 56–64 px type; the orange phrase plus orange period creates two focal points.
- Claim bar mixes `14.04M+`, `<0.61ms`, `99.75%`, `Stealth 502` — four different proof types with no methodology.
- Long centred sections with 40 px headings; the page never shows a real screenshot of the product.

**Pricing**
- The calculator is genuinely good and should be kept.
- `$4/site` is consistent here (good), but the header/`index.html` still carry `$9` plan language elsewhere.
- Trust bar repeats unverifiable numbers (`<0.12ms`, `99.99% SLA`, `14M+`).

**Admin dashboard**
- Pastel icon squares + 24 px numbers = “template dashboard”; every card has the same weight, so nothing signals risk.
- “Tenant Onboarding Demographics” occupies a full-width block at 0% for every row — dead space above the fold.
- Sidebar has 12 flat items and theatrical labels: “Mission Control”, “HQ Console”, “Platform Owner”, “SecOps HQ 99.99%”. International buyers read this as a hobby project.
- Header has 7 controls (search, cluster status, clock, fullscreen, bell, avatar) and a search placeholder that promises “500,000+ domains, CVEs, users, or IPs…”.
- 12–13 px type everywhere; low contrast on muted labels; cards float on a white background with almost no borders.

**Login**
- Strong composition. But the left panel claims “SOC-2 TYPE II READY • 99.99% GUARANTEED SLA” — not true yet, and the first thing a security buyer will challenge.

**Block page**
- A 680 px tall empty browser mockup with a red circle X; 60% of the screen is blank.
- Leaks `localhost`, hardcodes a fallback IP and Ray ID, and offers a “Contact Site Administrator” button that does nothing.
- This is the page a hacked customer’s visitors will see. It must be the most polished page in the product, not the least.

### 1.3 System-level debt

- 6,537 raw hex colours across `src/`; 177 inline `fontFamily` declarations; 95 KB single CSS file.
- No component library, no tokens, no dark-mode strategy, no visual regression.
- 238 form controls with 28 `aria-*` attributes; no error boundaries; inconsistent focus states.
- Three different sidebars/headers, each with its own spacing and colour logic.

---

## 2. Design principles

1. **Calm authority.** Security UI should lower anxiety, not raise it. Muted surfaces, one accent, red only for real danger.
2. **One company.** Marketing, auth, console and emails share one palette, one type scale and one component language.
3. **Data first, chrome last.** Remove decorative panels; every card must answer a question or trigger an action.
4. **Proof over adjectives.** Show the product, real numbers, methodology links. No AI hero art, no invented telemetry.
5. **Every state designed.** Loading, empty, error, partial, permission-denied, offline — before the happy path.
6. **Accessible by default.** WCAG 2.2 AA, keyboard-first tables and modals, visible focus, 4.5:1 text contrast.

---

## 3. Visual direction

### 3.1 Concept: “warm paper, deep forest, signal amber”

Keep the strongest existing idea (the login/marketing palette) and make it the *only* palette. It differentiates from the blue ocean of Cloudflare/Wordfence clones and feels like an editorial security journal rather than a firewall appliance.

| Token | Hex | Usage |
|---|---|---|
| `--md-paper` | `#F6F5F0` | App and marketing background |
| `--md-surface` | `#FFFFFF` | Cards, tables, modals |
| `--md-surface-sunken` | `#EFEEE8` | Table headers, code blocks, wells |
| `--md-ink` | `#10201E` | Primary text, headings |
| `--md-ink-2` | `#465955` | Secondary text |
| `--md-ink-3` | `#6E7F7A` | Muted labels, placeholders |
| `--md-line` | `#E2E5DE` | Borders, dividers |
| `--md-forest` | `#0B2B26` | Brand, dark panels, primary buttons |
| `--md-forest-2` | `#123F37` | Hover, secondary dark |
| `--md-emerald` | `#12805C` | Success, protection active, healthy |
| `--md-amber` | `#E8792F` | Primary accent, attention, CTA highlight |
| `--md-amber-soft` | `#FBEBDD` | Amber backgrounds, badges |
| `--md-danger` | `#C0392B` | Critical, blocked, destructive |
| `--md-danger-soft` | `#F8E5E1` | Danger backgrounds |
| `--md-info` | `#2F6F62` | Informational, links in dark contexts |

**Rules**
- Amber is a spotlight, not a paint: max ~5% of any screen.
- Green means *protection is working*, never decoration.
- No pastel icon tiles. Icons sit in neutral 32 px wells or inline with text.
- Gradients only on the auth/marketing hero; never on cards or buttons.

### 3.2 Typography

| Role | Font | Size / weight / tracking |
|---|---|---|
| Display (marketing) | Plus Jakarta Sans | 56/60, 700, −0.03em |
| H1 page | Inter | 28/34, 700, −0.02em |
| H2 section | Inter | 18/24, 650, −0.01em |
| Card title | Inter | 14/20, 600 |
| Body | Inter | 13.5/21, 400 |
| Label / meta | Inter | 12/16, 500 |
| Micro / badge | Inter | 11/14, 600, 0.04em uppercase |
| Numeric | Inter tabular | `font-variant-numeric: tabular-nums` |
| Code / Ray ID | JetBrains Mono | 12/18 |

Base 13.5 px (not 12) for readability; only table meta and badges go to 11–12 px.

### 3.3 Spacing, radius, elevation

- 4 px grid; section spacing 24/32/48; card padding 20–24; table row 44–48 px.
- Radius: 8 px controls, 12 px cards, 16 px modals, 999 px pills.
- Border: 1 px `--md-line` on every card; shadow only for overlays.
- Elevation: `0 1px 2px rgba(16,32,30,.04)` cards, `0 12px 32px rgba(16,32,30,.12)` modals.
- Motion: 140–180 ms ease-out; no bounce, no parallax.

### 3.4 Iconography & imagery

- Lucide, stroke 1.75, sizes 16/18/20 only.
- Replace the AI hero collage with a **real product screenshot** in a browser frame, subtly tilted, with a soft forest gradient behind it.
- Diagrams (architecture, request path) instead of abstract 3D globes.
- Customer logos, status badge, security.txt, SOC 2 progress — real proof, not illustrations.

---

## 4. Layout system

### 4.1 Console shell

```
┌──────────────┬─────────────────────────────────────────────┐
│ 248 px       │ 56 px topbar: breadcrumb · search · status  │
│ sidebar      ├─────────────────────────────────────────────┤
│ (grouped)    │ Page header: title · purpose · primary CTA  │
│              │ KPI row (max 4)                             │
│              │ Content cards / tables                      │
└──────────────┴─────────────────────────────────────────────┘
```

- Sidebar: warm surface `#FBFAF6`, grouped sections with 10 px labels, active item = forest text + amber 2 px left rail + soft amber background.
- Topbar: max 3 actions; remove the clock and fullscreen from the default header.
- Page header is a reusable component: eyebrow (optional), H1, one-line purpose, actions, optional tabs.
- Content max-width 1440; gutters 24/32.
- KPI row: 4 cards max, each with label, value, delta, and one sparkline or context line.

### 4.2 Card anatomy

```
┌──────────────────────────────────────────┐
│ Title            [badge]      [action ▾] │
│ Supporting line (optional)               │
│ ──────────────────────────────────────── │
│ body / table / chart                     │
└──────────────────────────────────────────┘
```
- One primary card per screen; secondary cards use `surface-sunken` headers and no shadow.
- Charts: grid lines `#EEF0EA`, series in forest/amber/emerald only; no default Chart.js blue.

### 4.3 Table anatomy

- 44 px rows, sticky header, zebra off, 1 px dividers.
- First column = identity (domain/site), second = status, last = actions.
- Filters in a toolbar above; active filters as removable chips.
- Bulk selection appears only when rows are selected.
- Empty state inside the table body, not a separate page.

---

## 5. Component inventory (build once)

`Button` (primary/secondary/ghost/danger, 3 sizes), `IconButton`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, `Badge` (neutral/success/warning/danger/info), `StatusDot`, `Tooltip`, `Popover`, `Dropdown`, `Modal`, `Drawer`, `Tabs`, `Accordion`, `Table`, `Pagination`, `FilterBar`, `Toast`, `Alert`, `Skeleton`, `EmptyState`, `PageHeader`, `StatCard`, `SectionHeader`, `Progress`, `CodeBlock`, `CopyField`.

Each ships with: default/hover/active/focus/disabled/loading, keyboard behaviour, RTL-safe spacing, and a Storybook entry.

---

## 6. Page-by-page redesign

### 6.1 Marketing

**Landing** — keep the editorial voice; replace the hero art with a real console screenshot; reduce to 8 sections:
1. Hero (H1 ≤ 10 words, one CTA, one proof line, real screenshot)
2. Proof bar (installs, sites protected, uptime, benchmark — each linked to methodology)
3. “What you get” (3 pillars: WAF, malware, fleet ops)
4. Live product tour (3 tabs: Dashboard / Logs / Scanner)
5. Virtual patching explainer (timeline graphic)
6. Agency/fleet section (multi-site visual)
7. Pricing teaser ($4/site, 14-day trial)
8. FAQ + final CTA + footer with status/legal/security.txt

**Pricing** — keep the calculator; add annual toggle state in URL, per-site total, “what happens after trial”, comparison table, money-back line, FAQ. Remove the claim bar; link to `/benchmark`.

**Solutions / Product / Docs** — one template: eyebrow, H1, 2-column intro, feature grid, code/API example, CTA. Kill duplicated `/about` → Solutions mapping.

### 6.2 Auth

- Keep split layout; remove unverified SOC 2/SLA claims.
- Add passkey, SSO (Google already), clear MFA step, inline validation, caps-lock hint, password strength.
- One auth system for user and admin; admin gets a separate URL but identical components.

### 6.3 Block page (customer-facing, highest priority)

Replace the browser mock with a calm, branded page:
- Left: shield mark, “Request blocked”, status `403`, one-sentence explanation, rule name in a neutral code chip.
- Right: “What you can do” — go back, contact the site owner, copy Ray ID; “Report a false positive” opens a small form.
- Footer: Ray ID, timestamp, site domain, “Protected by MDefender Pro” with a link; no internal IPs, no `localhost`, no hardcoded fallbacks.
- Works at 360 px, prints cleanly, loads < 20 KB.

### 6.4 Admin console

**Information architecture (replace 12 flat items):**

1. **Overview** — security posture, revenue snapshot, incidents, fleet health.
2. **Tenants** — users, plans, lifecycle, impersonation.
3. **Fleet** — websites, versions, health, bulk actions.
4. **Security Operations** — patches, whitelists, evasion lab, CVE feed, model registry, flags.
5. **Billing** — subscriptions, invoices, refunds, dunning, coupons.
6. **Support** — tickets, SLA, inspector.
7. **Compliance** — audit trail, DSAR, retention, DPA versions.
8. **Platform** — health, releases, status page, broadcast, email.
9. **Settings**.

**Overview page** — replace pastel KPI cards with a “posture strip”: Protected sites · Threats blocked 24 h · Open incidents · Revenue at risk. Below: incident queue (actionable), fleet health table (top 8), onboarding funnel only when non-zero, threat trend. Remove demographics block from the default view (move to Growth).

### 6.5 User console

Rebuild the shell to 7 sections: **Overview · Sites · Protection · WordPress · Monitoring · Reports · Settings**. Keep all power features inside site detail.

**Overview** — a “fleet posture” hero: score 0–100, “3 things to fix today”, protection status per site, last scan, next backup. Then recent incidents and a compact traffic chart. Remove 15-card mosaic.

**Sites** — master-detail: table left, drawer right with protection state, plugin/core versions, last scan, quick actions (scan, backup, update, pause). Bulk actions in a sticky bar.

**Logs** — toolbar with saved views, query builder, time range, export; virtualized table; row click → request drawer with payload, rule, action, IP context.

### 6.6 Tables that matter

| Page | Key change |
|---|---|
| Admin Users | status-first columns, plan badge, last seen, inline actions menu, saved filters |
| Admin Websites | health dot, version drift, WAF mode, one-click pause |
| User Websites | protection score, last scan, update available, drawer |
| Logs | server pagination, live tail toggle, query chips |
| Blacklist | scope selector (fleet/site), expiry, reason, bulk unblock |

---

## 7. Content & trust cleanup (non-negotiable)

- Remove “HQ Console”, “Mission Control”, “Platform Owner”, “SecOps Lead Operator”, “Super Admin” as visible copy; use “Admin”, “Workspace”, “Owner”.
- Remove unverified badges: `SOC-2 TYPE II READY`, `99.99% GUARANTEED SLA`, `180+ PoPs`, `<0.61ms`, `<0.12ms` until measured.
- One number per claim + methodology link + date.
- Every empty state explains the next action.
- Every destructive action has a confirm dialog with the object name.

---

## 8. Accessibility, responsive, i18n

- WCAG 2.2 AA: contrast, focus visible, 44 px touch targets, no keyboard traps, `aria-live` for toasts.
- Tables: `<caption>`, `scope`, sortable headers with `aria-sort`.
- Modals/drawers: focus trap, Esc, return focus.
- Responsive: console usable at 360 px (drawer nav, stacked KPIs, horizontal-scroll tables with sticky first column).
- i18n: all strings in `locales/en.json` from day one; no concatenated sentences; dates/numbers via `Intl`.
- Dark mode: tokens only; ship after light mode passes AA.

---

## 9. Implementation plan

### Sprint 1 — Foundations (week 1)
- Token file, type scale, spacing, radius, shadow.
- 12 core components (Button, Input, Card, Badge, PageHeader, StatCard, Table, EmptyState, Modal, Toast, Tabs, Skeleton).
- Console background/borders/typography pass; remove pastel tiles.
- Remove unverified claims and theatrical labels.
- **Exit:** every new page can be built without raw hex; visual review of 3 pages.

### Sprint 2 — Shells & dashboards (weeks 2–3)
- Admin sidebar grouping + topbar simplification + command palette (⌘K).
- User sidebar 7 sections.
- Admin Overview rebuild; User Overview rebuild.
- **Exit:** a new user can answer “is my fleet safe?” in < 10 s; SUS test with 5 users ≥ 75.

### Sprint 3 — Data pages (weeks 4–5)
- Websites master-detail, Logs, Blacklist/Allowlist, Users, Billing, Reports.
- Tables, filters, drawers, bulk actions, saved views.
- **Exit:** no page > 600 lines; all tables paginated server-side; axe 0 critical.

### Sprint 4 — Public site, auth, block page (week 6)
- Landing, Pricing, Solutions/Product template, Auth, Block page.
- Real screenshots, proof bar, benchmark page, status page.
- **Exit:** Lighthouse mobile 85/95/95; block page < 20 KB; no unverified claim.

### Sprint 5 — Polish (weeks 7–8)
- Dark mode, motion, email templates, 404/500, onboarding checklist, empty-state illustrations (line art, not AI).
- Visual regression baseline; Storybook published.
- **Exit:** design system adopted by 100% of pages; 0 raw hex outside tokens.

---

## 10. Success metrics

- SUS ≥ 80; task success “connect a site” ≥ 90% unassisted.
- Time-to-first-value < 10 min (median).
- Trial → paid +10–15% relative lift.
- Support tickets about “where is X” −30%.
- Lighthouse: performance ≥ 85 mobile, accessibility ≥ 95, SEO ≥ 95.
- Design debt: < 40 raw hex values, 0 pages > 600 lines, 100% components from library.

---

## 11. Do / don’t

**Do** use whitespace as hierarchy, one accent, real data, real screenshots, sentence case, 13.5 px body, 44 px rows, 1 px borders.

**Don’t** use AI hero art, pastel icon tiles, gradient cards, 3D globes, all-caps labels everywhere, fake counters, “cyber” jargon, 10 px body text, or five competing accent colours.

---

## 12. Immediate next actions

1. Approve the palette/type direction (§3).
2. Ship Sprint 1 tokens + 12 components (in progress).
3. Redesign the block page first (customer-facing, zero dependency on the console).
4. Rebuild the admin Overview and user Overview as the reference implementations.
5. Freeze new pages until the shell and components land.
