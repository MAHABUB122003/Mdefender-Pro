import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Gauge,
  Globe2,
  Layers,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import api from '../api/api';
import userStore from '../utils/userStore';
import { formatMetricNumber } from '../utils/formatters';
import {
  Badge,
  Button,
  Card,
  Dotline,
  EmptyState,
  PageHeader,
  Segmented,
  StatCard,
} from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

const COLORS = {
  forest: '#0B2B26',
  forestSoft: 'rgba(11, 43, 38, 0.08)',
  amber: '#E8792F',
  amberSoft: 'rgba(232, 121, 47, 0.10)',
  emerald: '#12805C',
  emeraldSoft: 'rgba(18, 128, 92, 0.10)',
  danger: '#C0392B',
  line: '#EEF0EA',
  muted: '#6E7F7A',
};

const THREAT_COLORS = ['#C0392B', '#E8792F', '#B7791F', '#2F6F62', '#6E7F7A', '#0B2B26'];

function lastSevenDays() {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
  }
  return out;
}

function timeAgo(value) {
  if (!value) return 'just now';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function postureFor(sites) {
  if (!sites.length) {
    return { score: 0, label: 'Not configured', tone: 'idle', tasks: [] };
  }
  let points = 0;
  const tasks = [];
  sites.forEach((site) => {
    const active = String(site.status || '').toLowerCase() === 'active';
    const protecting = String(site.waf_mode || '').toLowerCase() === 'protect';
    const plugin = Boolean(site.plugin_version);
    if (active) points += 1;
    if (protecting) points += 1;
    if (plugin) points += 1;
    if (!active) tasks.push({ id: `resume-${site.id}`, text: `Resume protection for ${site.domain}`, to: '/user/websites' });
    if (active && !protecting) tasks.push({ id: `waf-${site.id}`, text: `Turn on WAF protection for ${site.domain}`, to: '/user/websites' });
    if (active && !plugin) tasks.push({ id: `plugin-${site.id}`, text: `Install the plugin on ${site.domain}`, to: '/user/connect' });
  });
  const score = Math.round((points / (sites.length * 3)) * 100);
  const tone = score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'bad';
  const label = score >= 85 ? 'Strong' : score >= 60 ? 'Needs attention' : 'At risk';
  return { score, label, tone, tasks: tasks.slice(0, 3) };
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const cached = useMemo(() => userStore.get('dashboard'), []);
  const [data, setData] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState(() => {
    if (typeof localStorage === 'undefined') return 'all';
    return localStorage.getItem('mdf_bulk_selected_site') || localStorage.getItem('mdefender_selected_site') || 'all';
  });
  const [chartMetric, setChartMetric] = useState('both');
  const [toast, setToast] = useState(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ip: '', reason: '', duration: '1d', action_type: 'block' });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(
    async (siteId = selectedWebsite, manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const params = siteId && siteId !== 'all' ? { website_id: siteId } : {};
        if (manual) params.refresh = '1';
        const result = await api.getUserDashboard(params);
        setData(result);
        userStore.set('dashboard', result);
      } catch (err) {
        showToast(err.message || 'Could not refresh telemetry', true);
      } finally {
        setLoading(false);
        if (manual) setTimeout(() => setRefreshing(false), 300);
      }
    },
    [selectedWebsite]
  );

  useEffect(() => {
    fetchData(selectedWebsite, false);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData(selectedWebsite, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData, selectedWebsite]);

  useEffect(() => {
    const onDomainSync = () => {
      const next = localStorage.getItem('mdf_bulk_selected_site') || localStorage.getItem('mdefender_selected_site') || 'all';
      setSelectedWebsite(next);
      fetchData(next, true);
    };
    window.addEventListener('mdf_bulk_domain_changed', onDomainSync);
    window.addEventListener('mdefender_domain_changed', onDomainSync);
    return () => {
      window.removeEventListener('mdf_bulk_domain_changed', onDomainSync);
      window.removeEventListener('mdefender_domain_changed', onDomainSync);
    };
  }, [fetchData]);

  const sites = data?.websites || [];
  const activity = data?.recent_activity || [];
  const posture = postureFor(sites);
  const selectedSite = selectedWebsite !== 'all' ? sites.find((s) => s.id === selectedWebsite) : null;

  const requestsToday = Number(data?.requests_today || 0);
  const blockedToday = Number(data?.blocked_today || 0);
  const activeSites = Number(data?.active_websites ?? sites.filter((s) => s.status === 'active').length);
  const blockRate = requestsToday > 0 ? (blockedToday / requestsToday) * 100 : 0;

  const labels = lastSevenDays();
  const cleanSeries = Array.isArray(data?.daily_clean) ? data.daily_clean : [];
  const threatSeries = Array.isArray(data?.daily_threats) ? data.daily_threats : [];

  const trafficData = {
    labels,
    datasets: [
      chartMetric !== 'threats' && {
        label: 'Clean traffic',
        data: cleanSeries,
        borderColor: COLORS.forest,
        backgroundColor: 'rgba(11, 43, 38, 0.06)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      chartMetric !== 'clean' && {
        label: 'Threats',
        data: threatSeries,
        borderColor: COLORS.amber,
        backgroundColor: 'rgba(232, 121, 47, 0.10)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ].filter(Boolean),
  };

  const trafficOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: COLORS.forest,
        padding: 10,
        titleFont: { size: 11 },
        bodyFont: { size: 11 },
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: COLORS.muted, font: { size: 10.5 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: COLORS.line },
        border: { display: false },
        ticks: { color: COLORS.muted, font: { size: 10.5 }, maxTicksLimit: 5 },
      },
    },
  };

  const attackTypes = data?.attack_types || [];
  const attackCounts = data?.attack_counts || [];
  const hasThreatMix = attackTypes.length > 0 && attackCounts.some((n) => Number(n) > 0);

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

  const changeSite = (value) => {
    setSelectedWebsite(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem('mdf_bulk_selected_site', value);
    fetchData(value, true);
  };

  const toggleUnderAttack = async () => {
    const next = !(selectedSite ? selectedSite.under_attack_mode : sites.some((s) => s.under_attack_mode));
    try {
      if (selectedSite) {
        await api.toggleWebsiteUnderAttack(selectedSite.id, next);
      } else {
        await api.toggleDdos(next);
      }
      showToast(next ? 'Under-attack shield enabled' : 'Under-attack shield disabled');
      fetchData(selectedWebsite, true);
    } catch (err) {
      showToast(err.message || 'Could not change shield state', true);
    }
  };

  const submitBlock = async (e) => {
    e.preventDefault();
    if (!blockForm.ip.trim()) return;
    setSubmitting(true);
    try {
      if (blockForm.action_type === 'allow') {
        await api.addUserWhitelist({ ip: blockForm.ip.trim(), reason: blockForm.reason || 'Allowed from dashboard' });
        showToast(`${blockForm.ip} added to allowlist`);
      } else {
        await api.addUserBlacklist({
          ip: blockForm.ip.trim(),
          reason: blockForm.reason || 'Blocked from dashboard',
          duration: blockForm.duration,
          website_id: selectedWebsite,
        });
        showToast(`${blockForm.ip} blocked`);
      }
      setBlockOpen(false);
      setBlockForm({ ip: '', reason: '', duration: '1d', action_type: 'block' });
      fetchData(selectedWebsite, true);
    } catch (err) {
      showToast(err.message || 'Action failed', true);
    } finally {
      setSubmitting(false);
    }
  };

  const underAttack = selectedSite ? Boolean(selectedSite.under_attack_mode) : sites.some((s) => s.under_attack_mode);
  const firstName = (data?.user?.name || data?.user?.full_name || '').trim().split(/\s+/)[0];

  return (
    <div className="mdf-ud">
      <style>{`
        .mdf-ud { display: flex; flex-direction: column; gap: 14px; max-width: 1680px; margin: 0 auto; width: 100%; }
        .mdf-ud-select {
          height: 36px; min-width: 190px; border: 1px solid var(--md-line-strong, #cfd5cb);
          border-radius: 8px; background: var(--md-surface, #fff); color: var(--md-ink, #10201e);
          font-family: var(--md-font-sans, Inter); font-size: 12.5px; padding: 0 10px; outline: none;
        }
        .mdf-ud-select:focus { border-color: var(--md-amber, #e8792f); box-shadow: 0 0 0 3px rgba(232,121,47,.14); }
        .mdf-ud-posture {
          display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 20px; align-items: center;
          padding: 18px 20px; background: var(--md-surface, #fff);
          border: 1px solid var(--md-line, #e2e5de); border-radius: 14px;
        }
        .mdf-ud-ring {
          width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
          background: conic-gradient(var(--ring, #12805c) calc(var(--pct, 0) * 1%), #eceee7 0);
          position: relative; flex-shrink: 0;
        }
        .mdf-ud-ring::after {
          content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--md-surface, #fff);
        }
        .mdf-ud-ring span { position: relative; z-index: 1; font-size: 15px; font-weight: 700; color: var(--md-ink, #10201e); font-variant-numeric: tabular-nums; }
        .mdf-ud-posture-title { font-size: 14px; font-weight: 650; color: var(--md-ink); margin: 0 0 3px; letter-spacing: -.01em; }
        .mdf-ud-posture-sub { font-size: 12px; color: var(--md-ink-3); margin: 0; line-height: 1.5; }
        .mdf-ud-tasks { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 9px; }
        .mdf-ud-task { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--md-ink-2); text-decoration: none; }
        .mdf-ud-task:hover { color: var(--md-amber); }
        .mdf-ud-chart { height: 220px; position: relative; }
        .mdf-ud-legend { display: flex; gap: 16px; align-items: center; margin-top: 10px; font-size: 11.5px; color: var(--md-ink-3); }
        .mdf-ud-legend i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 5px; }
        .mdf-ud-actions { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
        .mdf-ud-action {
          display: flex; align-items: center; gap: 9px; padding: 10px 11px; border-radius: 9px;
          border: 1px solid var(--md-line); background: var(--md-surface); color: var(--md-ink-2);
          font-size: 12px; font-weight: 500; text-decoration: none; transition: border-color .14s, color .14s, background .14s;
        }
        .mdf-ud-action:hover { border-color: #d6d9cf; background: var(--md-surface-hover); color: var(--md-ink); }
        .mdf-ud-action svg { color: var(--md-ink-3); }
        .mdf-ud-site { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--md-ink); text-decoration: none; }
        .mdf-ud-site:hover { color: var(--md-amber); }
        .mdf-ud-scope { font-size: 11px; color: var(--md-ink-3); }
        .mdf-ud-activity { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-bottom: 1px solid var(--md-line); }
        .mdf-ud-activity:last-child { border-bottom: 0; }
        .mdf-ud-activity .meta { min-width: 0; flex: 1; }
        .mdf-ud-activity .title { font-size: 12px; font-weight: 600; color: var(--md-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mdf-ud-activity .sub { font-size: 11px; color: var(--md-ink-3); margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 900px) {
          .mdf-ud-posture { grid-template-columns: auto minmax(0,1fr); }
          .mdf-ud-posture > :last-child { grid-column: 1 / -1; }
        }
      `}</style>

      <PageHeader
        eyebrow="Fleet overview"
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="Protection status, live traffic and what needs attention across your WordPress sites."
        actions={
          <>
            <select className="mdf-ud-select" value={selectedWebsite} onChange={(e) => changeSite(e.target.value)} aria-label="Site scope">
              <option value="all">All sites ({sites.length})</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.domain || site.name || site.id}
                </option>
              ))}
            </select>
            <Button variant="secondary" icon={RefreshCw} onClick={() => fetchData(selectedWebsite, true)} disabled={refreshing}>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button variant="secondary" icon={Ban} onClick={() => setBlockOpen(true)}>
              Block IP
            </Button>
            <Button variant="primary" icon={Globe2} onClick={() => navigate('/user/websites')}>
              Manage sites
            </Button>
          </>
        }
      />

      <div className="mdf-ud-posture">
        <div
          className="mdf-ud-ring"
          style={{
            '--pct': posture.score,
            '--ring': posture.tone === 'ok' ? COLORS.emerald : posture.tone === 'warn' ? COLORS.amber : COLORS.danger,
          }}
          aria-label={`Protection score ${posture.score} out of 100`}
        >
          <span>{posture.score}</span>
        </div>
        <div>
          <p className="mdf-ud-posture-title">
            Protection posture: {posture.label}{' '}
            <Badge tone={posture.tone === 'ok' ? 'success' : posture.tone === 'warn' ? 'warning' : posture.tone === 'bad' ? 'danger' : 'neutral'} dot>
              {activeSites}/{sites.length} active
            </Badge>
          </p>
          <p className="mdf-ud-posture-sub">
            {sites.length
              ? `${requestsToday.toLocaleString()} requests inspected today · ${blockedToday.toLocaleString()} blocked · ${blockRate.toFixed(1)}% block rate`
              : 'Connect your first WordPress site to start inspecting traffic and blocking attacks.'}
          </p>
          <div className="mdf-ud-tasks">
            {posture.tasks.length ? (
              posture.tasks.map((task) => (
                <Link key={task.id} to={task.to} className="mdf-ud-task">
                  <ArrowRight size={12} /> {task.text}
                </Link>
              ))
            ) : (
              <span className="mdf-ud-task"><CheckCircle2 size={12} /> All connected sites are protected</span>
            )}
          </div>
        </div>
        <Button
          variant={underAttack ? 'danger' : 'secondary'}
          icon={Zap}
          onClick={toggleUnderAttack}
          disabled={!sites.length}
        >
          {underAttack ? 'Shield is active' : 'Under-attack shield'}
        </Button>
      </div>

      <div className="mdui-grid mdui-kpi-grid">
        <StatCard
          label="Requests inspected"
          value={formatMetricNumber(requestsToday)}
          hint={`${formatMetricNumber(data?.total_requests || 0)} lifetime`}
          icon={Activity}
        />
        <StatCard
          label="Threats blocked"
          value={formatMetricNumber(blockedToday)}
          hint={`${blockRate.toFixed(1)}% of today's traffic`}
          icon={ShieldAlert}
          trend={blockedToday > 0 ? 'Shield held' : 'No attacks today'}
          trendDir={blockedToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Protected sites"
          value={`${activeSites}/${sites.length || 0}`}
          hint={sites.length ? `${sites.length - activeSites} need attention` : 'No sites connected yet'}
          icon={ShieldCheck}
        />
        <StatCard
          label="Block rate"
          value={`${blockRate.toFixed(1)}%`}
          hint="Blocked vs inspected today"
          icon={Gauge}
        />
      </div>

      <div className="mdui-grid mdui-split">
        <Card
          title="Traffic & threats"
          subtitle="Clean traffic compared with mitigated requests over the last 7 days"
          action={
            <Segmented
              label="Chart metric"
              value={chartMetric}
              onChange={setChartMetric}
              options={[
                { value: 'both', label: 'Both' },
                { value: 'clean', label: 'Clean' },
                { value: 'threats', label: 'Threats' },
              ]}
            />
          }
        >
          {loading && !data ? (
            <div style={{ height: 250 }} />
          ) : (
            <>
              <div className="mdf-ud-chart">
                <Line data={trafficData} options={trafficOptions} />
              </div>
              <div className="mdf-ud-legend">
                <span><i style={{ background: COLORS.forest }} />Clean traffic</span>
                <span><i style={{ background: COLORS.amber }} />Mitigated threats</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Dotline tone={underAttack ? 'warn' : 'ok'}>{underAttack ? 'Under-attack mode' : 'WAF enforcing'}</Dotline>
                </span>
              </div>
            </>
          )}
        </Card>

        <Card title="Threat mix" subtitle="What the firewall stopped in this period">
          {hasThreatMix ? (
            <>
              <div style={{ height: 180, position: 'relative' }}>
                <Doughnut
                  data={threatData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {attackTypes.slice(0, 5).map((type, i) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--md-ink-2)' }}>
                    <i style={{ width: 7, height: 7, borderRadius: 2, background: THREAT_COLORS[i % THREAT_COLORS.length] }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--md-ink)' }}>{Number(attackCounts[i] || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No threats detected"
              description="Nothing has been blocked in this period. We will surface the mix here as soon as an attack is mitigated."
            />
          )}
        </Card>
      </div>

      <Card
        title="Sites"
        subtitle={selectedWebsite === 'all' ? 'Every site connected to this workspace' : 'Selected site'}
        action={<Link to="/user/websites" style={{ fontSize: 12, color: 'var(--md-ink-3)', textDecoration: 'none' }}>View all sites</Link>}
        flush
      >
        {sites.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdui-table">
              <thead>
                <tr>
                  <th scope="col">Site</th>
                  <th scope="col">Status</th>
                  <th scope="col">WAF</th>
                  <th scope="col">Requests</th>
                  <th scope="col">Plugin</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const active = String(site.status || '').toLowerCase() === 'active';
                  const protecting = String(site.waf_mode || '').toLowerCase() === 'protect';
                  return (
                    <tr key={site.id}>
                      <td>
                        <Link className="mdf-ud-site" to={`/user/websites`}>
                          <Shield size={14} style={{ color: 'var(--md-ink-3)' }} />
                          {site.domain || site.name || site.id}
                        </Link>
                        <div className="mdf-ud-scope">{site.platform || 'WordPress'} · {site.url || site.origin_server || '—'}</div>
                      </td>
                      <td>
                        <Badge tone={active ? 'success' : 'warning'} dot>{active ? 'Active' : 'Paused'}</Badge>
                      </td>
                      <td>
                        <Badge tone={protecting ? 'info' : 'neutral'}>{protecting ? 'Protect' : (site.waf_mode || 'monitor')}</Badge>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(site.requests_today || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--md-ink-3)' }}>{site.plugin_version ? `v${site.plugin_version}` : 'Not installed'}</td>
                      <td>
                        <Link to="/user/websites" style={{ fontSize: 11.5, color: 'var(--md-ink-2)', textDecoration: 'none' }}>
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
          <EmptyState
            icon={Globe2}
            title="No sites connected yet"
            description="Add your first WordPress site, install the plugin and paste the site key to start blocking attacks."
            action={<Button variant="primary" icon={ArrowRight} onClick={() => navigate('/user/connect')}>Connect a site</Button>}
          />
        )}
      </Card>

      <div className="mdui-grid mdui-split">
        <Card title="Recent activity" subtitle="Latest requests inspected at the edge" flush>
          {activity.length ? (
            <div>
              {activity.slice(0, 6).map((event) => {
                const blocked = String(event.status || '').toLowerCase() === 'blocked';
                const clean = String(event.attack_type || '').toLowerCase().includes('clean');
                return (
                  <div className="mdf-ud-activity" key={event.id || `${event.ip}-${event.timestamp}`}>
                    <Badge tone={blocked ? 'danger' : clean ? 'success' : 'warning'}>{blocked ? 'Blocked' : clean ? 'Allowed' : 'Mitigated'}</Badge>
                    <div className="meta">
                      <div className="title">{clean ? 'Clean request' : event.attack_type || 'Inspected request'}</div>
                      <div className="sub">
                        <span>{event.method || 'GET'} {event.url || '/'}</span>
                        <span>{event.ip || 'unknown IP'}</span>
                        <span>{timeAgo(event.timestamp)}</span>
                      </div>
                    </div>
                    <Link to="/user/logs" style={{ fontSize: 11.5, color: 'var(--md-ink-3)', textDecoration: 'none' }}>Details</Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Clock3}
              title="No traffic recorded yet"
              description="Once your site sends its first request, the live feed will appear here."
            />
          )}
        </Card>

        <Card title="Quick actions" subtitle="Common tasks for this fleet">
          <div className="mdf-ud-actions">
            <Link className="mdf-ud-action" to="/user/bulk/scanner"><ScanLine size={15} /> Run malware scan</Link>
            <Link className="mdf-ud-action" to="/user/logs"><Activity size={15} /> Inspect traffic</Link>
            <Link className="mdf-ud-action" to="/user/access/ip-blocklist"><Ban size={15} /> IP blocklist</Link>
            <Link className="mdf-ud-action" to="/user/bulk/backup"><Download size={15} /> Create backup</Link>
            <Link className="mdf-ud-action" to="/user/reports"><Layers size={15} /> Security report</Link>
            <Link className="mdf-ud-action" to="/user/bulk/plugins"><Zap size={15} /> Update plugins</Link>
          </div>
        </Card>
      </div>

      {toast && <div className={`mdui-toast ${toast.isError ? 'error' : ''}`} role="status">{toast.text}</div>}

      {blockOpen && (
        <div className="mdui-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setBlockOpen(false); }}>
          <div className="mdui-dialog" role="dialog" aria-modal="true" aria-labelledby="block-title">
            <div className="mdui-dialog-head">
              <div>
                <h3 id="block-title">Block an IP address</h3>
                <p>Applies to {selectedSite ? selectedSite.domain : 'all connected sites'}.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBlockOpen(false)} aria-label="Close">Close</Button>
            </div>
            <form className="mdui-dialog-body" onSubmit={submitBlock}>
              <div className="mdui-field">
                <label htmlFor="block-ip">IP address</label>
                <input
                  id="block-ip"
                  placeholder="203.0.113.42"
                  value={blockForm.ip}
                  onChange={(e) => setBlockForm((f) => ({ ...f, ip: e.target.value }))}
                  required
                />
              </div>
              <div className="mdui-field">
                <label htmlFor="block-reason">Reason (optional)</label>
                <input
                  id="block-reason"
                  placeholder="Repeated login attempts"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="mdui-field">
                  <label htmlFor="block-duration">Duration</label>
                  <select
                    id="block-duration"
                    value={blockForm.duration}
                    onChange={(e) => setBlockForm((f) => ({ ...f, duration: e.target.value }))}
                  >
                    <option value="1h">1 hour</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                <div className="mdui-field">
                  <label htmlFor="block-type">Action</label>
                  <select
                    id="block-type"
                    value={blockForm.action_type}
                    onChange={(e) => setBlockForm((f) => ({ ...f, action_type: e.target.value }))}
                  >
                    <option value="block">Block</option>
                    <option value="allow">Allow</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <Button variant="secondary" onClick={() => setBlockOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Applying…' : blockForm.action_type === 'allow' ? 'Allow IP' : 'Block IP'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
