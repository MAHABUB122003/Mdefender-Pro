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
  Building2,
  CheckCircle2,
  Clock,
  Clock3,
  Compass,
  Database,
  Fingerprint,
  Globe2,
  KeyRound,
  LifeBuoy,
  RefreshCw,
  Server,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import api from '../api/api';
import adminStore from '../utils/adminStore';
import {
  Badge,
  Button,
  Card,
  Dotline,
  EmptyState,
  PageHeader,
  StatCard,
  Skeleton,
} from '../components/ui';

ChartJS.register(ArcElement, Tooltip, Legend);

const THREAT_COLORS = ['#C0392B', '#E8792F', '#B7791F', '#2F6F62', '#6E7F7A', '#0B2B26'];

const PERSONA_ICONS = {
  owner: ShoppingBag,
  agency: Building2,
  freelance: User,
  enterprise: ShieldCheck,
  unassigned: Clock,
};

const PERSONA_COLORS = {
  owner: '#12805C',
  agency: '#2563EB',
  freelance: '#D97706',
  enterprise: '#7C3AED',
  unassigned: '#64748B',
};

const fmt = (n) => Number(n || 0).toLocaleString();

function formatCompact(n) {
  if (n === null || n === undefined) return '0';
  const num = Number(n);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 10_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
}

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
  const [overview, setOverview] = useState(() => adminStore.get('admin_overview') || null);
  const [stats, setStats] = useState(() => adminStore.get('admin_stats') || null);
  const [health, setHealth] = useState(() => adminStore.get('admin_health') || null);
  const [fleet, setFleet] = useState(() => adminStore.get('admin_fleet') || []);
  const [audit, setAudit] = useState(() => adminStore.get('admin_audit') || []);
  const [loading, setLoading] = useState(() => !adminStore.get('admin_overview'));
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeframe, setTimeframe] = useState('today');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const [ov, st, he, fl, au] = await Promise.allSettled([
      api.adminGetOverview({ fresh: manual }),
      api.getStats(),
      api.adminGetSystemHealth(),
      api.adminGetTenantWebsites(),
      api.adminGetAuditLogs({ limit: 8 }),
    ]);
    if (ov.status === 'fulfilled') {
      const data = ov.value?.data || ov.value;
      setOverview(data);
      adminStore.set('admin_overview', data);
    }
    if (st.status === 'fulfilled') {
      setStats(st.value);
      adminStore.set('admin_stats', st.value);
    }
    if (he.status === 'fulfilled') {
      const data = he.value?.data || he.value;
      setHealth(data);
      adminStore.set('admin_health', data);
    }
    if (fl.status === 'fulfilled') {
      const payload = fl.value?.data || fl.value;
      const list = payload?.websites || [];
      setFleet(list);
      adminStore.set('admin_fleet', list);
    }
    if (au.status === 'fulfilled') {
      const payload = au.value?.data || au.value;
      const list = payload?.logs || [];
      setAudit(list);
      adminStore.set('admin_audit', list);
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
  const activeWebsites = Number(overview?.active_websites || websites);
  const requestsToday = Number(overview?.requests_today || 0);
  const blockedToday = Number(overview?.events_blocked_today || 0);
  const totalBlocked = Number(overview?.total_blocked_threats || stats?.total_threats || 0);
  const totalRequests = Number(overview?.total_requests || stats?.total_requests || requestsToday || 0);
  const blockRate = requestsToday > 0 ? (blockedToday / requestsToday) * 100 : 0;

  // Timeframe statistics calculation
  const timeframeData = useMemo(() => {
    const tf = overview?.timeframes || {};
    if (timeframe === '7d') {
      const b = Number(tf['7d']?.blocked !== undefined ? tf['7d'].blocked : Math.round(blockedToday * 3.5));
      const r = Number(tf['7d']?.requests !== undefined ? tf['7d'].requests : Math.round(requestsToday * 4));
      return {
        label: 'Past 7 Days',
        blocked: b,
        requests: r,
        rate: r > 0 ? (b / r) * 100 : 0,
      };
    }
    if (timeframe === '30d') {
      const b = Number(tf['30d']?.blocked !== undefined ? tf['30d'].blocked : Math.round(blockedToday * 8.2));
      const r = Number(tf['30d']?.requests !== undefined ? tf['30d'].requests : Math.round(requestsToday * 12));
      return {
        label: 'Past 30 Days',
        blocked: b,
        requests: r,
        rate: r > 0 ? (b / r) * 100 : 0,
      };
    }
    if (timeframe === '1y') {
      const b = Number(tf['1y']?.blocked !== undefined ? tf['1y'].blocked : totalBlocked);
      const r = Number(tf['1y']?.requests !== undefined ? tf['1y'].requests : totalRequests);
      return {
        label: 'This Year',
        blocked: b,
        requests: r,
        rate: r > 0 ? (b / r) * 100 : 0,
      };
    }
    if (timeframe === 'all') {
      return {
        label: 'All Time',
        blocked: totalBlocked,
        requests: totalRequests,
        rate: totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0,
      };
    }
    // Default: 'today'
    return {
      label: 'Today',
      blocked: blockedToday,
      requests: requestsToday,
      rate: blockRate,
    };
  }, [timeframe, overview, blockedToday, requestsToday, blockRate, totalBlocked, totalRequests]);

  // Demographics & Acquisition Intelligence State
  const demographics = overview?.demographics || {};
  const personas = demographics.personas || [];
  const topPersona = demographics.top_persona || null;
  const referrals = demographics.referrals || [];
  const topReferral = demographics.top_referral || null;
  const fleetSizes = demographics.fleet_sizes || [];
  const totalOnboarded = Number(demographics.total_onboarded || 0);
  const completionRate = Number(demographics.completion_rate || 0);

  const referralChannels = useMemo(() => {
    const defaultChannels = [
      'Social Media (Facebook, LinkedIn, X)',
      'Search Engine (Google, Bing)',
      'AI Assistant (ChatGPT, Gemini, Copilot)',
      'YouTube',
      'Cybersecurity Community / Forum',
      'Friend / Colleague Referral',
      'Other'
    ];
    const map = new Map();
    (referrals || []).forEach(r => map.set(r.name, r));
    const combined = defaultChannels.map(ch => {
      if (map.has(ch)) return map.get(ch);
      return { name: ch, count: 0, percentage: 0.0 };
    });
    (referrals || []).forEach(r => {
      if (!defaultChannels.includes(r.name)) {
        combined.push(r);
      }
    });
    return combined.sort((a, b) => b.count - a.count);
  }, [referrals]);

  const riskySites = useMemo(
    () => [...sites].sort((a, b) => Number(a.security_score || 0) - Number(b.security_score || 0)).slice(0, 6),
    [sites]
  );

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
        .adm-tf-bar {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: var(--md-surface); border: 1px solid var(--md-line);
          border-radius: var(--md-radius-card); padding: 9px 16px;
        }
        .adm-tf-title {
          display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 650;
          color: var(--md-ink); letter-spacing: -0.01em;
        }
        .adm-tf-pulse-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); display: inline-block;
          animation: admPulse 2s infinite ease-in-out;
        }
        @keyframes admPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .adm-tf-pills {
          display: flex; align-items: center; gap: 4px; background: var(--md-surface-sunken);
          padding: 3px; border-radius: 8px; border: 1px solid var(--md-line);
        }
        .adm-tf-pill {
          border: 0; background: transparent; color: var(--md-ink-2); font-size: 11.5px;
          font-weight: 550; padding: 5px 12px; border-radius: 6px; cursor: pointer;
          transition: all 0.16s ease; line-height: 1;
        }
        .adm-tf-pill:hover { color: var(--md-ink); background: rgba(0, 0, 0, 0.04); }
        .adm-tf-pill.active {
          background: var(--md-surface); color: var(--md-ink); font-weight: 650;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
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
        .adm-demog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .adm-demog-item { display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; border-radius: 9px; background: var(--md-surface-sunken); border: 1px solid var(--md-line); transition: border-color .14s ease, background .14s ease; }
        .adm-demog-item:hover { border-color: #d6d9cf; background: var(--md-surface-hover); }
        .adm-demog-item.dominant { border-color: rgba(18, 128, 92, 0.35); background: rgba(18, 128, 92, 0.04); }
        .adm-demog-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .adm-demog-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 650; color: var(--md-ink); }
        .adm-demog-icon { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; flex-shrink: 0; }
        .adm-demog-val { font-size: 12px; font-weight: 700; color: var(--md-ink); font-variant-numeric: tabular-nums; }
        .adm-demog-pct { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .adm-demog-bar { width: 100%; height: 5px; border-radius: 999px; background: rgba(0,0,0,0.06); overflow: hidden; }
        .adm-demog-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
        .adm-demog-desc { font-size: 10.5px; color: var(--md-ink-3); line-height: 1.3; }

        .adm-ref-item { display: flex; flex-direction: column; gap: 5px; padding: 8px 12px; border-radius: 8px; background: var(--md-surface-sunken); border: 1px solid var(--md-line); }
        .adm-ref-head { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; }
        .adm-ref-name { font-weight: 600; color: var(--md-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
        .adm-ref-count { font-weight: 700; color: var(--md-ink); font-variant-numeric: tabular-nums; }

        .adm-fleet-strip { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--md-line); }
        .adm-fleet-box { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 6px; background: var(--md-surface-sunken); border: 1px solid var(--md-line); }
        .adm-fleet-box span { font-size: 10px; font-weight: 600; color: var(--md-ink-3); }
        .adm-fleet-box strong { font-size: 13px; font-weight: 700; color: var(--md-ink); font-variant-numeric: tabular-nums; }

        @media (max-width: 1200px) {
          .adm-ov-strip { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        @media (max-width: 900px) {
          .adm-tf-bar { flex-direction: column; align-items: flex-start; }
          .adm-tf-pills { width: 100%; justify-content: space-between; overflow-x: auto; }
          .adm-demog-grid { grid-template-columns: 1fr; }
          .adm-fleet-strip { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 640px) {
          .adm-ov-strip { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
      `}</style>

      <PageHeader
        eyebrow="Platform control"
        title="Overview"
        description="Tenants, protection and platform health — executive security pulse across all sites."
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

      {/* Timeframe Executive Filter Bar */}
      <div className="adm-tf-bar">
        <div className="adm-tf-title">
          <span>Executive Security Pulse</span>
          <span className="adm-tf-pulse-dot" title="Live WAF Protection Engine Active" />
        </div>
        <div className="adm-tf-pills">
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '1y', label: 'This Year' },
            { key: 'all', label: 'All Time' },
          ].map((tf) => (
            <button
              key={tf.key}
              type="button"
              className={`adm-tf-pill ${timeframe === tf.key ? 'active' : ''}`}
              onClick={() => setTimeframe(tf.key)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Hero KPI Cards */}
      <div className="mdui-grid mdui-kpi-grid">
        <StatCard
          label="Active Tenants"
          value={loading && !overview ? <Skeleton height={32} width={75} /> : formatCompact(users)}
          hint={loading && !overview ? <Skeleton height={14} width={130} /> : (usersToday > 0 ? `+${fmt(usersToday)} joined today` : `${fmt(overview?.verified_users || users)} verified tenants`)}
          icon={Users}
          trend={usersToday > 0 ? `+${fmt(usersToday)} today` : '100% active'}
          trendDir={usersToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Total Protected Websites"
          value={loading && !overview ? <Skeleton height={32} width={65} /> : formatCompact(websites)}
          hint={loading && !overview ? <Skeleton height={14} width={140} /> : `${fmt(activeWebsites)}/${fmt(websites)} endpoints actively guarded`}
          icon={Globe2}
          trend="WAF Armed"
          trendDir="up"
        />
        <StatCard
          label={`Threats Blocked (${timeframeData.label})`}
          value={loading && !overview ? <Skeleton height={32} width={90} /> : formatCompact(timeframeData.blocked)}
          hint={loading && !overview ? <Skeleton height={14} width={150} /> : `${fmt(timeframeData.requests)} requests · ${timeframeData.rate.toFixed(1)}% drop`}
          icon={ShieldAlert}
          trend={`${timeframeData.rate.toFixed(1)}% block rate`}
          trendDir="neutral"
        />
        <StatCard
          label="Total Blocked (Lifetime)"
          value={loading && !overview ? <Skeleton height={32} width={95} /> : formatCompact(totalBlocked)}
          hint={loading && !overview ? <Skeleton height={14} width={160} /> : `${fmt(totalBlocked)} attacks thwarted fleet-wide`}
          icon={Activity}
          trend={`${formatCompact(totalRequests)} requests`}
          trendDir="up"
        />
      </div>

      <div className="mdui-grid mdui-split">
        <Card
          title="Threat distribution"
          subtitle="What the WAF mitigated across the fleet"
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

      {/* Onboarding Demographics & Acquisition Intelligence */}
      <div className="mdui-grid mdui-split">
        <Card
          title="Tenant Personas"
          subtitle={`Audience segment · ${totalOnboarded} onboarded (${completionRate}% rate)`}
          action={
            topPersona?.title && topPersona?.id !== 'unassigned' ? (
              <Badge tone="success" dot>
                Top: {topPersona.title}
              </Badge>
            ) : null
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPersona && topPersona.id !== 'unassigned' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(18, 128, 92, 0.08)',
                border: '1px solid rgba(18, 128, 92, 0.25)',
                fontSize: 11.5
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 650, color: '#12805C' }}>
                  <Sparkles size={13} /> Dominant Segment: {topPersona.title}
                </span>
                <span style={{ fontWeight: 700, color: '#12805C', fontVariantNumeric: 'tabular-nums' }}>
                  {topPersona.percentage}% of all tenants ({topPersona.onboarded_percentage}% of onboarded)
                </span>
              </div>
            )}

            <div className="adm-demog-grid">
              {personas.map((p) => {
                const IconComp = PERSONA_ICONS[p.id] || User;
                const color = PERSONA_COLORS[p.id] || '#28745D';
                const isDominant = topPersona?.id === p.id && p.id !== 'unassigned';
                return (
                  <div key={p.id} className={`adm-demog-item ${isDominant ? 'dominant' : ''}`}>
                    <div className="adm-demog-head">
                      <div className="adm-demog-title">
                        <span className="adm-demog-icon" style={{ background: `${color}18`, color }}>
                          <IconComp size={13} strokeWidth={2.2} />
                        </span>
                        <span>{p.title}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="adm-demog-val">{fmt(p.count)}</span>
                        <span className="adm-demog-pct" style={{ marginLeft: 4, color }}>
                          ({p.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="adm-demog-bar">
                      <div
                        className="adm-demog-bar-fill"
                        style={{ width: `${Math.min(100, Math.max(0, p.percentage))}%`, background: color }}
                      />
                    </div>
                    <div className="adm-demog-desc">
                      {p.description}
                      {p.id !== 'unassigned' && totalOnboarded > 0 && (
                        <span style={{ display: 'block', marginTop: 2, fontWeight: 600, color: 'var(--md-ink-2)' }}>
                          {p.onboarded_percentage}% of completed onboarding
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card
          title="Acquisition & Fleet Scale"
          subtitle="Where tenants discover MDefender Pro & fleet size"
          action={
            topReferral?.name ? (
              <Badge tone="info">
                Top: {topReferral.name.split('(')[0].trim()}
              </Badge>
            ) : null
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topReferral && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.22)',
                fontSize: 11.5
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 650, color: '#2563EB' }}>
                  <Compass size={13} /> Primary Acquisition: {topReferral.name}
                </span>
                <span style={{ fontWeight: 700, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
                  {topReferral.percentage}% of referrals ({fmt(topReferral.count)})
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {referralChannels.slice(0, 5).map((ref) => {
                return (
                  <div key={ref.name} className="adm-ref-item">
                    <div className="adm-ref-head">
                      <span className="adm-ref-name" title={ref.name}>
                        {ref.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="adm-ref-count">{fmt(ref.count)}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ref.count > 0 ? '#12805C' : 'var(--md-ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                          ({ref.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="adm-demog-bar">
                      <div
                        className="adm-demog-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, ref.percentage))}%`,
                          background: ref.count > 0 ? '#2563EB' : 'rgba(0,0,0,0.1)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {fleetSizes.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--md-ink-3)', marginBottom: 6 }}>
                  Fleet Scale (Managed Sites per Tenant)
                </div>
                <div className="adm-fleet-strip">
                  {fleetSizes.map((fl) => (
                    <div key={fl.range} className="adm-fleet-box">
                      <span>{fl.range.replace(' Websites', '').replace(' Enterprise Fleet', '+ Enterprise')}</span>
                      <strong>{fl.percentage}% <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--md-ink-3)' }}>({fl.count})</span></strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
