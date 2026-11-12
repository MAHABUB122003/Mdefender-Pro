import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Clock3,
  Database,
  Fingerprint,
  Globe2,
  KeyRound,
  LifeBuoy,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import api from '../api/api';
import {
  Badge,
  Button,
  Card,
  Dotline,
  EmptyState,
  PageHeader,
  StatCard,
} from '../components/ui';

ChartJS.register(ArcElement, Tooltip, Legend);

const THREAT_COLORS = ['#C0392B', '#E8792F', '#B7791F', '#2F6F62', '#6E7F7A', '#0B2B26'];

const fmt = (n) => Number(n || 0).toLocaleString();

const ACTION_LABELS = {
  admin_login: 'Admin signed in',
  login: 'Tenant signed in',
  virtual_patch_published: 'Virtual patch published',
  whitelist_rule_created: 'Whitelist rule created',
  fleet_notice_broadcast: 'Fleet notice broadcast',
  user_impersonated: 'Tenant impersonated',
  wordpress_checksums_synced: 'Checksums synced',
};

function actionLabel(action) {
  return ACTION_LABELS[action] || String(action || 'Event').replace(/_/g, ' ');
}

function healthTone(ok) {
  return ok ? 'success' : 'danger';
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const [ov, st, he, fl, au] = await Promise.allSettled([
      api.adminGetOverview(),
      api.getStats(),
      api.adminGetSystemHealth(),
      api.adminGetTenantWebsites(),
      api.adminGetAuditLogs({ limit: 8 }),
    ]);
    if (ov.status === 'fulfilled') setOverview(ov.value?.data || ov.value);
    if (st.status === 'fulfilled') setStats(st.value);
    if (he.status === 'fulfilled') setHealth(he.value?.data || he.value);
    if (fl.status === 'fulfilled') {
      const payload = fl.value?.data || fl.value;
      setFleet(payload?.websites || []);
    }
    if (au.status === 'fulfilled') {
      const payload = au.value?.data || au.value;
      setAudit(payload?.logs || []);
    }
    setLastUpdated(new Date());
    setLoading(false);
    if (manual) setTimeout(() => setRefreshing(false), 250);
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const sites = fleet;
  const users = Number(overview?.users || 0);
  const usersToday = Number(overview?.users_today || 0);
  const websites = Number(overview?.websites || 0);
  const activeWebsites = Number(overview?.active_websites || 0);
  const requestsToday = Number(overview?.requests_today || 0);
  const blockedToday = Number(overview?.events_blocked_today || 0);
  const blockRate = requestsToday > 0 ? (blockedToday / requestsToday) * 100 : 0;
  const openTickets = Number(overview?.support_tickets_open || 0);
  const quarantine = Number(overview?.quarantine_items || 0);
  const unverified = Number(overview?.unverified_users || 0);

  const riskySites = useMemo(
    () => [...sites].sort((a, b) => Number(a.security_score || 0) - Number(b.security_score || 0)).slice(0, 6),
    [sites]
  );
  const lowScoreSites = sites.filter((s) => Number(s.security_score || 0) < 85).length;

  const signals = [
    {
      id: 'quarantine',
      label: 'Quarantined files',
      value: quarantine,
      hint: quarantine ? 'Review and restore or delete' : 'Nothing in quarantine',
      icon: ShieldAlert,
      to: '/admin/clients',
      tone: quarantine > 0 ? 'warn' : 'ok',
    },
    {
      id: 'tickets',
      label: 'Open support tickets',
      value: openTickets,
      hint: openTickets ? 'Reply within SLA' : 'No open tickets',
      icon: LifeBuoy,
      to: '/admin/support',
      tone: openTickets > 0 ? 'warn' : 'ok',
    },
    {
      id: 'unverified',
      label: 'Unverified tenants',
      value: unverified,
      hint: unverified ? 'Resend verification email' : 'All tenants verified',
      icon: Fingerprint,
      to: '/admin/users',
      tone: unverified > 0 ? 'warn' : 'ok',
    },
    {
      id: 'risk',
      label: 'Sites below 85 score',
      value: lowScoreSites,
      hint: lowScoreSites ? 'Open the fleet to review' : 'Every site is healthy',
      icon: Activity,
      to: '/admin/clients',
      tone: lowScoreSites > 0 ? 'warn' : 'ok',
    },
  ];

  const attackTypes = stats?.attack_types || [];
  const attackCounts = stats?.attack_counts || [];
  const hasThreats = attackTypes.length > 0 && attackCounts.some((n) => Number(n) > 0);

  const threatData = {
    labels: attackTypes,
    datasets: [
      {
        data: attackCounts,
        backgroundColor: THREAT_COLORS,
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const checks = health?.checks || {};
  const healthRows = Object.entries(checks).map(([key, check]) => ({
    key,
    label: check?.label || key,
    ok: Boolean(check?.ok),
    detail:
      key === 'waf_model'
        ? check?.version || 'Loaded'
        : key === 'malware_model'
          ? `v${check?.version || '1.0.0'}`
          : key === 'signature_rules'
            ? `${fmt(check?.patterns)} patterns · ${fmt(check?.hashes)} hashes`
            : 'Operational',
  }));

  const healthyCount = healthRows.filter((row) => row.ok).length;

  return (
    <div className="adm-ov">
      <style>{`
        .adm-ov { display: flex; flex-direction: column; gap: 16px; max-width: 1760px; margin: 0 auto; width: 100%; }
        .adm-ov-signals { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .adm-signal {
          display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
          background: var(--md-surface); border: 1px solid var(--md-line);
          border-radius: var(--md-radius-card); text-decoration: none; color: inherit;
          transition: border-color .14s ease, background .14s ease;
        }
        .adm-signal:hover { border-color: #d6d9cf; background: var(--md-surface-hover); }
        .adm-signal-icon {
          width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;
          flex-shrink: 0; background: var(--md-surface-sunken); color: var(--md-ink-2);
        }
        .adm-signal.warn .adm-signal-icon { background: var(--md-amber-soft); color: var(--md-amber-2); }
        .adm-signal.ok .adm-signal-icon { background: var(--md-emerald-soft); color: var(--md-emerald); }
        .adm-signal-value { font-size: 20px; font-weight: 700; letter-spacing: -.02em; color: var(--md-ink); line-height: 1.1; font-variant-numeric: tabular-nums; }
        .adm-signal-label { font-size: 11.5px; font-weight: 600; color: var(--md-ink-2); margin-top: 1px; }
        .adm-signal-hint { font-size: 10.5px; color: var(--md-ink-3); margin-top: 2px; }
        .adm-health-row { display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid var(--md-line); }
        .adm-health-row:last-child { border-bottom: 0; }
        .adm-health-icon { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: var(--md-surface-sunken); color: var(--md-ink-2); flex-shrink: 0; }
        .adm-health-main { flex: 1; min-width: 0; }
        .adm-health-label { font-size: 12px; font-weight: 600; color: var(--md-ink); }
        .adm-health-detail { font-size: 10.5px; color: var(--md-ink-3); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .adm-score { display: inline-flex; align-items: center; gap: 8px; }
        .adm-score-bar { width: 54px; height: 5px; border-radius: 999px; background: var(--md-surface-sunken); overflow: hidden; }
        .adm-score-bar i { display: block; height: 100%; border-radius: 999px; }
        .adm-audit-row { display: flex; align-items: center; gap: 10px; padding: 9px 18px; border-bottom: 1px solid var(--md-line); }
        .adm-audit-row:last-child { border-bottom: 0; }
        .adm-audit-main { flex: 1; min-width: 0; }
        .adm-audit-title { font-size: 12px; font-weight: 600; color: var(--md-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .adm-audit-meta { font-size: 10.5px; color: var(--md-ink-3); margin-top: 1px; display: flex; gap: 8px; flex-wrap: wrap; }
        .adm-ov-strip { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 0; border-top: 1px solid var(--md-line); margin-top: 2px; }
        .adm-ov-strip > div { padding: 12px 16px; border-right: 1px solid var(--md-line); }
        .adm-ov-strip > div:last-child { border-right: 0; }
        .adm-ov-strip span { display: block; font-size: 10.5px; color: var(--md-ink-3); }
        .adm-ov-strip strong { font-size: 14px; font-weight: 650; color: var(--md-ink); font-variant-numeric: tabular-nums; }
        @media (max-width: 1200px) {
          .adm-ov-signals { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .adm-ov-strip { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        @media (max-width: 640px) {
          .adm-ov-signals { grid-template-columns: 1fr; }
          .adm-ov-strip { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
      `}</style>

      <PageHeader
        eyebrow="Platform control"
        title="Overview"
        description="Tenants, protection and platform health — the things that need a decision today."
        actions={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Badge tone={health?.status === 'healthy' ? 'success' : 'warning'} dot>
                {health?.status === 'healthy' ? 'All systems healthy' : 'Degraded'}
              </Badge>
            </span>
            <Button variant="secondary" icon={RefreshCw} onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button variant="primary" icon={LifeBuoy} onClick={() => (window.location.href = '/admin/support')}>
              Support desk
            </Button>
          </>
        }
      />

      <div className="adm-ov-signals" aria-label="Needs attention">
        {signals.map((signal) => {
          const Icon = signal.icon;
          return (
            <Link key={signal.id} to={signal.to} className={`adm-signal ${signal.tone}`}>
              <span className="adm-signal-icon"><Icon size={15} strokeWidth={1.9} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="adm-signal-value">{fmt(signal.value)}</div>
                <div className="adm-signal-label">{signal.label}</div>
                <div className="adm-signal-hint">{signal.hint}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mdui-grid mdui-kpi-grid">
        <StatCard
          label="Active tenants"
          value={fmt(users)}
          hint={`${fmt(usersToday)} joined today`}
          icon={Users}
          trend={usersToday > 0 ? `+${fmt(usersToday)} today` : 'No signups today'}
          trendDir={usersToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Protected websites"
          value={`${fmt(activeWebsites)}/${fmt(websites)}`}
          hint={`${fmt(overview?.api_keys)} API keys issued`}
          icon={Globe2}
        />
        <StatCard
          label="Threats blocked today"
          value={fmt(blockedToday)}
          hint={`${fmt(requestsToday)} requests inspected`}
          icon={ShieldAlert}
          trend={`${blockRate.toFixed(1)}% block rate`}
          trendDir="neutral"
        />
        <StatCard
          label="Platform events today"
          value={fmt(overview?.events_today)}
          hint={`${fmt(overview?.total_requests)} lifetime requests`}
          icon={Activity}
        />
      </div>

      <div className="mdui-grid mdui-split">
        <Card
          title="Threat distribution"
          subtitle="What the WAF mitigated across the fleet"
          action={<Link to="/admin/logs" style={{ fontSize: 11.5, color: 'var(--md-ink-3)', textDecoration: 'none' }}>View logs</Link>}
        >
          {hasThreats ? (
            <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(0,1fr)', gap: 18, alignItems: 'center' }}>
              <div style={{ height: 180, position: 'relative' }}>
                <Doughnut
                  data={threatData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {attackTypes.slice(0, 6).map((type, i) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                    <i style={{ width: 7, height: 7, borderRadius: 2, background: THREAT_COLORS[i % THREAT_COLORS.length] }} />
                    <span style={{ flex: 1, color: 'var(--md-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type}</span>
                    <span style={{ color: 'var(--md-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(attackCounts[i])}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No threats recorded yet"
              description="Once connected sites report attack telemetry, the mix will appear here."
            />
          )}
        </Card>

        <Card
          title="Platform health"
          subtitle={`${healthyCount}/${healthRows.length || 0} components healthy`}
          action={<Badge tone={health?.status === 'healthy' ? 'success' : 'warning'}>{health?.status || 'checking'}</Badge>}
          flush
        >
          {healthRows.length ? (
            healthRows.map((row) => (
              <div className="adm-health-row" key={row.key}>
                <span className="adm-health-icon">
                  {row.key === 'mongo' ? <Database size={13} /> : row.key === 'signature_rules' ? <ShieldCheck size={13} /> : row.key === 'waf_model' ? <Server size={13} /> : <Bug size={13} />}
                </span>
                <div className="adm-health-main">
                  <div className="adm-health-label">{row.label}</div>
                  <div className="adm-health-detail">{row.detail}</div>
                </div>
                <Badge tone={healthTone(row.ok)} dot>{row.ok ? 'Healthy' : 'Down'}</Badge>
              </div>
            ))
          ) : (
            <EmptyState icon={Server} title="Health checks unavailable" description="The system health endpoint did not return a response." />
          )}
        </Card>
      </div>

      <div className="mdui-grid mdui-split">
        <Card
          title="Fleet at risk"
          subtitle="Lowest security scores first — open a site to inspect or remediate"
          action={<Link to="/admin/clients" style={{ fontSize: 11.5, color: 'var(--md-ink-3)', textDecoration: 'none' }}>All websites</Link>}
          flush
        >
          {riskySites.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="mdui-table">
                <thead>
                  <tr>
                    <th scope="col">Site</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Status</th>
                    <th scope="col">Security score</th>
                    <th scope="col">Threats</th>
                    <th scope="col">Plugin</th>
                    <th scope="col" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {riskySites.map((site) => {
                    const score = Number(site.security_score || 0);
                    const tone = score >= 85 ? '#12805C' : score >= 70 ? '#B7791F' : '#C0392B';
                    return (
                      <tr key={site.id || site.domain}>
                        <td>
                          <span className="strong">{site.domain || site.name || site.id}</span>
                          <div style={{ fontSize: 10.5, color: 'var(--md-ink-3)', marginTop: 2 }}>{site.url || site.origin_server || '—'}</div>
                        </td>
                        <td style={{ fontSize: 11.5 }}>{site.user_email || '—'}</td>
                        <td>
                          <Badge tone={site.status === 'active' ? 'success' : 'warning'} dot>{site.status || 'unknown'}</Badge>
                        </td>
                        <td>
                          <span className="adm-score">
                            <span className="adm-score-bar"><i style={{ width: `${Math.min(100, score)}%`, background: tone }} /></span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-ink)' }}>{score}</span>
                          </span>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(site.threats_blocked)}</td>
                        <td style={{ fontSize: 11.5 }}>{site.plugin_version ? `v${site.plugin_version}` : '—'}</td>
                        <td>
                          <Link to="/admin/clients" style={{ fontSize: 11.5, color: 'var(--md-ink-2)', textDecoration: 'none' }}>
                            Open <ArrowUpRight size={11} style={{ verticalAlign: -1 }} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Globe2} title="No websites connected" description="Tenant sites will appear here as soon as they connect." />
          )}
        </Card>

        <Card
          title="Admin activity"
          subtitle="Latest privileged actions"
          action={<Link to="/admin/settings" style={{ fontSize: 11.5, color: 'var(--md-ink-3)', textDecoration: 'none' }}>Audit log</Link>}
          flush
        >
          {audit.length ? (
            audit.slice(0, 7).map((entry) => (
              <div className="adm-audit-row" key={entry.id}>
                <span className="adm-health-icon"><KeyRound size={13} /></span>
                <div className="adm-audit-main">
                  <div className="adm-audit-title">{actionLabel(entry.action)}</div>
                  <div className="adm-audit-meta">
                    <span>{entry.admin_user || 'system'}</span>
                    <span>{entry.ip_address || '—'}</span>
                  </div>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--md-ink-3)', whiteSpace: 'nowrap' }}>
                  {String(entry.timestamp || '').slice(11, 16)}
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={Clock3} title="No admin activity yet" description="Audit events will show up here after the first privileged action." />
          )}
        </Card>
      </div>

      <Card title="Tenant & data footprint" subtitle="Current platform counters">
        <div className="adm-ov-strip">
          <div><span>Total tenants</span><strong>{fmt(users)}</strong></div>
          <div><span>Verified</span><strong>{fmt(overview?.verified_users)}</strong></div>
          <div><span>Paid subscriptions</span><strong>{fmt(overview?.pro_subscribers)}</strong></div>
          <div><span>Malware scans</span><strong>{fmt(overview?.malware_scans)}</strong></div>
          <div><span>API keys</span><strong>{fmt(overview?.api_keys)}</strong></div>
          <div><span>Blocked IPs</span><strong>{fmt(overview?.blacklisted_ips)}</strong></div>
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--md-ink-3)' }}>
        <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Dotline tone={health?.status === 'healthy' ? 'ok' : 'warn'}>{health?.status === 'healthy' ? 'All dependencies responding' : 'Degraded dependency'}</Dotline>
        </span>
      </div>
    </div>
  );
}
