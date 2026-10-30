import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import api from '../api/api';
import userStore from '../utils/userStore';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Activity,
  RefreshCw,
  Clock,
  ArrowRight,
  Lock,
  Crown,
  CheckCircle2,
  Crosshair,
  Ban,
  Layers,
  Radio,
  Check,
  Copy,
  BarChart3,
  Terminal,
  Zap,
  Sliders
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// =========================================================================
// 1. REFINED MONOCHROME & SEMANTIC THREAT PALETTE (Cloudflare / Stripe Standard)
// =========================================================================
const securityPalette = [
  '#DC2626', // Critical Threats (SQLi / RCE)
  '#E8792F', // High Severity (XSS / CSRF)
  '#2A8B68', // Behavioral / Bot Mitigations (Forest Emerald)
  '#475569', // Scanners & Web Crawlers (Slate)
  '#64748B', // Path Traversal & Probes (Muted Slate)
  '#0B2522'  // Core Ingress
];

const severityConfig = {
  sqli: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  sql: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  rce: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  command: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  xss: { label: 'HIGH', color: '#D97706', bg: '#FEF3EB', border: '#FCD8BF' },
  lfi: { label: 'HIGH', color: '#D97706', bg: '#FEF3EB', border: '#FCD8BF' },
  path: { label: 'HIGH', color: '#D97706', bg: '#FEF3EB', border: '#FCD8BF' },
  traversal: { label: 'HIGH', color: '#D97706', bg: '#FEF3EB', border: '#FCD8BF' },
  bot: { label: 'BLOCKED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  scanner: { label: 'BLOCKED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  probe: { label: 'DETECTED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  clean: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  allowed: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  ingress: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  default: { label: 'MITIGATED', color: '#D97706', bg: '#FEF3EB', border: '#FCD8BF' }
};

function getSeverity(type = '') {
  const lower = (type || '').toLowerCase();
  for (const [k, v] of Object.entries(severityConfig)) {
    if (lower.includes(k)) return v;
  }
  return severityConfig.default;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    if (typeof timestamp === 'string' && timestamp.toLowerCase().includes('just')) return timestamp;
    const dateStr = String(timestamp).replace(' ', 'T');
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return String(timestamp);
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return String(timestamp);
  }
}

// =========================================================================
// 2. UNIFIED ENTERPRISE KPI STAT CARD (Consistent & Clean)
// =========================================================================
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  actionLink,
  actionText,
  isThreat = false
}) {
  const displayVal = Number(value || 0).toLocaleString();

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: '700',
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {label}
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isThreat ? '#FEF2F2' : '#F8FAFC',
            border: isThreat ? '1px solid #FEE2E2' : '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isThreat ? '#DC2626' : '#2A8B68'
          }}>
            {Icon && <Icon size={16} strokeWidth={2.2} />}
          </div>
        </div>

        <div style={{
          fontSize: '26px',
          fontWeight: '800',
          color: isThreat && value > 0 ? '#DC2626' : '#0F172A',
          lineHeight: '1.2',
          letterSpacing: '-0.03em'
        }}>
          {displayVal}
        </div>

        {sublabel && (
          <div style={{
            fontSize: '12px',
            color: '#64748B',
            marginTop: '4px',
            fontWeight: '500'
          }}>
            {sublabel}
          </div>
        )}
      </div>

      {actionLink && actionText && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
          <Link
            to={actionLink}
            style={{
              fontSize: '11.5px',
              fontWeight: '700',
              color: '#0284C7',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{actionText}</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. MAIN ENTERPRISE USER DASHBOARD
// =========================================================================
export default function UserDashboard() {
  const navigate = useNavigate();
  const [selectedWebsite, setSelectedWebsite] = useState('all');
  const [data, setData] = useState(() => userStore.get('dashboard'));
  const [loading, setLoading] = useState(() => !userStore.get('dashboard'));
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [ddosEnabled, setDdosEnabled] = useState(true);
  const [ddosToggling, setDdosToggling] = useState(false);
  const [copiedIp, setCopiedIp] = useState(null);
  const [copiedUri, setCopiedUri] = useState(null);
  const [bannedIps, setBannedIps] = useState(() => new Set());
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'critical' | 'bots'
  const [chartMetric, setChartMetric] = useState('both'); // 'both' | 'clean' | 'threats'

  const rawPlan = data?.user?.plan || data?.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_plan') : null) || 'free';
  const userPlan = (typeof rawPlan === 'string' ? rawPlan : (rawPlan?.id || rawPlan?.name || 'free')).toLowerCase();
  const isPremium = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);

  const userName = data?.user?.name || data?.user?.full_name || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_name') : '') || 'User';

  const fetchData = useCallback(async (manual = false, siteId = selectedWebsite) => {
    if (manual) setRefreshing(true);
    try {
      const params = siteId && siteId !== 'all' ? { website_id: siteId } : {};
      if (manual) params.refresh = '1';
      const result = await api.getUserDashboard(params);
      setData(result);
      userStore.set('dashboard', result);
      setLastRefreshed(new Date());
      if (result?.user?.name) localStorage.setItem('mdefender_user_name', result.user.name);
      const freshPlan = result?.user?.plan || result?.plan;
      if (freshPlan) localStorage.setItem('mdefender_user_plan', freshPlan);
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 300);
    }
  }, [selectedWebsite]);

  useEffect(() => {
    fetchData(false, selectedWebsite);
    api.getDdosStatus().then(r => setDdosEnabled(r.ddos_enabled ?? true)).catch(() => {});

    // Polling every 5 seconds for telemetry
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(false, selectedWebsite);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData, selectedWebsite]);

  const handleDdosToggle = async () => {
    setDdosToggling(true);
    try {
      const newState = !ddosEnabled;
      await api.toggleDdos(newState);
      setDdosEnabled(newState);
    } catch (err) {
      alert(err.message || 'Failed to toggle DDoS protection');
    } finally {
      setDdosToggling(false);
    }
  };

  const blockTopIP = async (ip) => {
    if (!ip) return;
    try {
      await api.userBlockIp(ip, 'Automated IP Quarantine via Dashboard', 0, selectedWebsite);
      setBannedIps(prev => new Set(prev).add(ip));
      userStore.clear();
      fetchData(true, selectedWebsite);
    } catch (err) {
      alert(err.message || `Failed to block IP ${ip}`);
    }
  };

  const handleCopyIp = async (ip) => {
    const ok = await copyToClipboard(ip);
    if (ok) {
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const handleCopyUri = async (uri) => {
    const ok = await copyToClipboard(uri);
    if (ok) {
      setCopiedUri(uri);
      setTimeout(() => setCopiedUri(null), 2000);
    }
  };

  // Filtered live stream events
  const filteredRecentActivity = useMemo(() => {
    const list = data?.recent_activity || [];
    if (streamFilter === 'critical') {
      return list.filter(item => {
        const type = (item.attack_type || '').toLowerCase();
        return type.includes('sql') || type.includes('rce') || type.includes('command') || type.includes('inject');
      });
    }
    if (streamFilter === 'bots') {
      return list.filter(item => {
        const type = (item.attack_type || '').toLowerCase();
        return type.includes('bot') || type.includes('scan') || type.includes('probe') || type.includes('crawler');
      });
    }
    return list;
  }, [data?.recent_activity, streamFilter]);

  // Threat Vectors breakdown calculation
  const rawAttackTypes = data?.attack_types?.length ? data.attack_types : ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Local File Inclusion (LFI)', 'Remote Code Execution (RCE)', 'Bot Scanner Probes'];
  const rawAttackCounts = data?.attack_counts?.length ? data.attack_counts : [0, 0, 0, 0, 0];
  const totalAttacksCount = rawAttackCounts.reduce((a, b) => a + b, 0);

  const attackChartData = {
    labels: rawAttackTypes,
    datasets: [{
      data: rawAttackCounts.map(c => Math.max(c, 0)),
      backgroundColor: securityPalette,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      hoverOffset: 6
    }]
  };

  // 7-Day Ingress Timeline
  const dailyDays = [];
  const dailyCleanCounts = [];
  const dailyThreatCounts = [];
  const now = new Date();

  const totalReq = data?.total_requests || 0;
  const totalBlk = data?.total_blocked || 0;
  const threatRatio = totalReq > 0 ? (totalBlk / totalReq) : 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    dailyDays.push(d.toLocaleDateString('en', { weekday: 'short', month: 'numeric', day: 'numeric' }));
    const count = data?.daily_requests?.[i] || 0;
    const estimatedThreats = Math.round(count * threatRatio);
    dailyThreatCounts.push(estimatedThreats);
    dailyCleanCounts.push(Math.max(0, count - estimatedThreats));
  }

  const dailyDatasets = [];
  if (chartMetric === 'both' || chartMetric === 'clean') {
    dailyDatasets.push({
      label: 'Clean Traffic',
      data: dailyCleanCounts,
      borderColor: '#0F172A',
      backgroundColor: 'rgba(15, 23, 42, 0.04)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#0F172A',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5
    });
  }

  if (chartMetric === 'both' || chartMetric === 'threats') {
    dailyDatasets.push({
      label: 'Mitigated Threats (403)',
      data: dailyThreatCounts,
      borderColor: '#DC2626',
      backgroundColor: 'rgba(220, 38, 38, 0.05)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#DC2626',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5
    });
  }

  const dailyChartData = {
    labels: dailyDays,
    datasets: dailyDatasets
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '76%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Inter', weight: '700', size: 12 },
        bodyFont: { family: 'Inter', size: 11.5 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
            return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
          }
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Inter', weight: '700', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label(ctx) {
            return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()} requests`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
        ticks: { font: { size: 11, family: 'Inter' }, color: '#64748B', padding: 6 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter' }, color: '#64748B', padding: 6 }
      }
    }
  };

  const cleanRatio = totalReq > 0
    ? (((totalReq - totalBlk) / totalReq) * 100).toFixed(1)
    : '100.0';

  const websitesList = data?.websites || [];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 0 48px' }}>
      
      {/* ========================================================================= */}
      {/* 1. QUIET & ENTERPRISE HEADER BANNER (Cloudflare / Stripe Style)           */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Security Overview
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0'
              }}>
                {userPlan === 'go' ? 'Pro Plan' : (userPlan === 'pro' || userPlan === 'premium' || userPlan === 'enterprise') ? 'Enterprise Plan' : 'Free Tier'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              Real-time telemetry, threat mitigation, and health across your connected sites.
            </p>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Domain Filter Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F8FAFC',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <Globe size={14} color="#64748B" />
              <select
                value={selectedWebsite}
                onChange={(e) => {
                  const siteId = e.target.value;
                  setSelectedWebsite(siteId);
                  fetchData(true, siteId);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Sites ({websitesList.length})</option>
                {websitesList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.domain || w.name || w.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Sync Timestamp */}
            <button
              onClick={() => fetchData(true, selectedWebsite)}
              disabled={refreshing}
              title="Refresh telemetry"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
            </button>

            {/* DDoS Toggle */}
            <button
              onClick={handleDdosToggle}
              disabled={ddosToggling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: ddosEnabled ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                background: ddosEnabled ? '#F0FDF4' : '#F8FAFC',
                color: ddosEnabled ? '#15803D' : '#64748B',
                fontSize: '12px',
                fontWeight: '700',
                cursor: ddosToggling ? 'not-allowed' : 'pointer'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ddosEnabled ? '#16A34A' : '#94A3B8' }} />
              <span>DDoS Shield: {ddosEnabled ? 'Active' : 'Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Banner if 0 Sites */}
      {!loading && websitesList.length === 0 && (
        <div style={{
          background: '#F8FAFC',
          borderRadius: '12px',
          border: '1.5px dashed #CBD5E1',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
              No Websites Connected
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
              Install the MDefender Pro plugin on your WordPress site to start receiving edge telemetry and WAF protection.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="/mdefender-pro.zip"
              download="mdefender-pro.zip"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#0F172A',
                textDecoration: 'none',
                fontSize: '12.5px',
                fontWeight: '600',
                border: '1px solid #CBD5E1'
              }}
            >
              Download Plugin
            </a>
            <Link
              to="/user/websites"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#0B2522',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '12.5px',
                fontWeight: '700'
              }}
            >
              + Connect Site
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. UNIFIED 4-METRIC KPI GRID                                              */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={data?.total_requests || 0}
          sublabel="Aggregated edge traffic"
          actionLink="/user/logs"
          actionText="View Traffic Logs"
        />

        <StatCard
          icon={ShieldAlert}
          label="Threats Blocked"
          value={data?.total_blocked || 0}
          sublabel="403 Forbidden drops"
          isThreat={true}
          actionLink="/user/logs"
          actionText="Inspect Threat Events"
        />

        <StatCard
          icon={ShieldCheck}
          label="Clean Traffic Rate"
          value={`${cleanRatio}%`}
          sublabel="Legitimate human visitors"
          actionLink="/user/bulk/tools"
          actionText="Bot Defense Settings"
        />

        <StatCard
          icon={Globe}
          label="Protected Sites"
          value={websitesList.length || data?.active_websites || 0}
          sublabel="Connected WordPress fleet"
          actionLink="/user/websites"
          actionText="Manage Sites"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY ANALYTICS ROW: 2D TRAFFIC TIMELINE & THREAT DISTRIBUTION      */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 0.75fr',
        gap: '20px',
        marginBottom: '20px'
      }} className="responsive-dashboard-grid">
        
        {/* Left: 2D High-Precision Area Chart */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '22px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '360px'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Traffic &amp; Threat Volume (7 Days)
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Dual-stream comparison of clean visitor traffic vs mitigated threats
                </div>
              </div>

              {/* Metric Filter Tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: '#F1F5F9',
                padding: '3px',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: chartMetric === 'both' ? '#0F172A' : 'transparent',
                    color: chartMetric === 'both' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('clean')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: chartMetric === 'clean' ? '#0F172A' : 'transparent',
                    color: chartMetric === 'clean' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Clean
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('threats')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: chartMetric === 'threats' ? '#DC2626' : 'transparent',
                    color: chartMetric === 'threats' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Threats
                </button>
              </div>
            </div>

            {/* High-Precision 2D Area Chart */}
            <div style={{ height: '230px', position: 'relative' }}>
              <Line data={dailyChartData} options={lineOptions} />
            </div>
          </div>

          {/* Clean Legend Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '14px',
            marginTop: '10px',
            borderTop: '1px solid #F1F5F9',
            fontSize: '11.5px',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F172A' }} />
              <span>Clean: <strong>{dailyCleanCounts.reduce((a, b) => a + b, 0).toLocaleString()}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
              <span>Mitigated: <strong>{dailyThreatCounts.reduce((a, b) => a + b, 0).toLocaleString()}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>WAF Status: <strong style={{ color: '#16A34A' }}>Enforcing</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Threat Breakdown Doughnut */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '22px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '360px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Threat Distribution
              </h3>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                {totalAttacksCount.toLocaleString()} Total
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
              {/* Donut Chart */}
              <div style={{ height: '140px', width: '140px', position: 'relative', margin: '0 auto' }}>
                <Doughnut data={attackChartData} options={doughnutOptions} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', lineHeight: '1' }}>
                    {totalAttacksCount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em', marginTop: '2px' }}>
                    BLOCKED
                  </span>
                </div>
              </div>

              {/* Breakdown List */}
              <div style={{ flex: 1, minWidth: '170px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rawAttackTypes.slice(0, 5).map((type, tIdx) => {
                  const count = rawAttackCounts[tIdx] || 0;
                  const pct = totalAttacksCount > 0 ? ((count / totalAttacksCount) * 100).toFixed(0) : '0';

                  return (
                    <Link
                      key={tIdx}
                      to={`/user/logs?search=${encodeURIComponent(type)}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11.5px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: '#F8FAFC',
                        textDecoration: 'none',
                        border: '1px solid #E2E8F0',
                        color: '#0F172A'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: securityPalette[tIdx], flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                        <span style={{ fontWeight: '700' }}>{count}</span>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>({pct}%)</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            marginTop: '10px',
            borderTop: '1px solid #F1F5F9',
            fontSize: '11.5px'
          }}>
            <span style={{ color: '#64748B' }}>WAF Rule Engine Active</span>
            <Link to="/user/bulk/tools" style={{ color: '#0284C7', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Configure Defense</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECURITY OPERATIONS: TOP ATTACKERS & LIVE RECENT EVENTS               */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Left: Top Hostile IPs */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '22px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Top Attacking IPs
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Most aggressive hostile sources detected in recent sampling windows
                </div>
              </div>
              <Link
                to="/user/logs"
                style={{
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: '#0284C7',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>All Logs</span>
                <ArrowRight size={11} />
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: '700'
                  }}>
                    <th style={{ padding: '8px 6px' }}>Rank</th>
                    <th style={{ padding: '8px 12px' }}>Hostile IP</th>
                    <th style={{ padding: '8px 12px' }}>Attempts</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Enforcement</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.top_attackers?.slice(0, 5).map((attacker, i) => {
                    const maxAttacks = data.top_attackers[0]?.count || 1;
                    const ratio = Math.min(100, Math.round((attacker.count / maxAttacks) * 100));
                    const isBanned = bannedIps.has(attacker.ip);

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 6px', color: '#64748B', fontWeight: '700', fontSize: '11px' }}>
                          #{i + 1}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0F172A', fontSize: '12.5px' }}>
                              {attacker.ip}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyIp(attacker.ip)}
                              title="Copy IP"
                              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '1px 3px' }}
                            >
                              {copiedIp === attacker.ip ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '5px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${ratio}%`, height: '100%', background: '#DC2626' }} />
                            </div>
                            <span style={{ fontWeight: '700', color: '#0F172A', fontSize: '12px' }}>
                              {attacker.count}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                          {isBanned ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', background: '#FEF3EB', padding: '3px 8px', borderRadius: '5px' }}>
                              Blocked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => blockTopIP(attacker.ip)}
                              style={{
                                padding: '4px 9px',
                                borderRadius: '6px',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FEE2E2',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }) || (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#64748B', padding: '24px' }}>
                        No hostile IPs recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Live Ingress Feed */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '22px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Recent Blocked Events
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Quarantined malicious requests intercepted at origin edge
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '3px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStreamFilter('all')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    background: streamFilter === 'all' ? '#0F172A' : 'transparent',
                    color: streamFilter === 'all' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStreamFilter('critical')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    background: streamFilter === 'critical' ? '#DC2626' : 'transparent',
                    color: streamFilter === 'critical' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Critical
                </button>
              </div>
            </div>

            {/* Event List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {filteredRecentActivity?.slice(0, 5).map((log, i) => {
                const sev = getSeverity(log.attack_type);
                const method = (log.method || (log.url?.includes('login') ? 'POST' : 'GET')).toUpperCase();

                return (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: sev.bg,
                          color: sev.color,
                          border: `1px solid ${sev.border}`
                        }}>
                          {log.attack_type || 'Malicious Payload'}
                        </span>
                        <code style={{ fontSize: '11.5px', color: '#0F172A', fontWeight: '700', fontFamily: 'monospace' }}>
                          {log.ip}
                        </code>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {formatRelativeTime(log.timestamp || log.time)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: '#475569', fontSize: '11.5px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {method} {log.url || '/'}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px' }}>
                        Blocked
                      </span>
                    </div>
                  </div>
                );
              }) || (
                <div style={{ textAlign: 'center', color: '#64748B', padding: '28px' }}>
                  No recent threat events
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SYSTEM POSTURE & ENGINE STATUS DOCK                                    */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        fontSize: '12.5px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ color: '#64748B' }}>Edge WAF:</span>
            <strong style={{ color: '#0F172A' }}>Active</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ color: '#64748B' }}>Bot Defense:</span>
            <strong style={{ color: '#0F172A' }}>Enforcing</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ color: '#64748B' }}>Rate Limiting:</span>
            <strong style={{ color: '#0F172A' }}>Active</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to="/user/websites" style={{ color: '#0F172A', textDecoration: 'none', fontWeight: '700', fontSize: '12px' }}>
            Websites ({websitesList.length})
          </Link>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <Link to="/user/bulk/tools" style={{ color: '#0284C7', textDecoration: 'none', fontWeight: '700', fontSize: '12px' }}>
            Threat Defense Settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
