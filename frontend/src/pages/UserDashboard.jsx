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
  Lock,
  Crown,
  Flame,
  Power
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// =========================================================================
// DESIGN TOKENS — HARMONIZED WITH UserPricing & UserBulkManagement
// =========================================================================
const brandTokens = {
  cardBg: '#ffffff',
  cardBorder: '1px solid #D9E1DC',
  cardRadius: '16px',
  cardShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
  
  subCardBg: '#FBFCFA',
  pillBg: '#E8EEE8',
  
  headingColor: '#10201E',
  bodyColor: '#60716B',
  brandForest: '#0B2522',
  brandEmerald: '#2A8B68',
  brandAmber: '#E8792F',
  dangerRed: '#DC2626'
};

const securityPalette = [
  '#DC2626', // Critical Threats (SQLi / RCE)
  '#E8792F', // High Severity (XSS / CSRF)
  '#2A8B68', // Behavioral / Bot Mitigations
  '#0B2522', // Ingress Edge Neutral
  '#60716B', // Muted Scanner Probes
  '#87948D'  // Low Severity
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
  bot: { label: 'BLOCKED', color: '#60716B', bg: '#E8EEE8', border: '#D9E1DC' },
  scanner: { label: 'BLOCKED', color: '#60716B', bg: '#E8EEE8', border: '#D9E1DC' },
  probe: { label: 'DETECTED', color: '#60716B', bg: '#E8EEE8', border: '#D9E1DC' },
  clean: { label: 'PASSED', color: '#2A8B68', bg: '#E8F3EC', border: '#CFE2D4' },
  allowed: { label: 'PASSED', color: '#2A8B68', bg: '#E8F3EC', border: '#CFE2D4' },
  ingress: { label: 'PASSED', color: '#2A8B68', bg: '#E8F3EC', border: '#CFE2D4' },
  default: { label: 'MITIGATED', color: '#E8792F', bg: '#FFF4ED', border: '#FCD3B6' }
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
// KPI STAT CARD — MATCHING UserPricing CARD SPECIFICATIONS
// =========================================================================
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  actionLink,
  actionText,
  isThreat = false,
  badgeText
}) {
  const displayVal = typeof value === 'string'
    ? value
    : Number(value || 0).toLocaleString();

  return (
    <div style={{
      background: brandTokens.cardBg,
      borderRadius: brandTokens.cardRadius,
      border: brandTokens.cardBorder,
      padding: '24px 26px',
      boxShadow: brandTokens.cardShadow,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      <div>
        {/* Top Header: Label & Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            color: brandTokens.bodyColor,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            {label}
          </span>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isThreat ? '#FEF2F2' : brandTokens.pillBg,
            border: isThreat ? '1px solid #FECACA' : '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isThreat ? brandTokens.dangerRed : brandTokens.brandForest
          }}>
            {Icon && <Icon size={18} strokeWidth={2.4} />}
          </div>
        </div>

        {/* Primary Metric Number */}
        <div style={{
          fontSize: '32px',
          fontWeight: '850',
          color: isThreat && value > 0 ? brandTokens.dangerRed : brandTokens.headingColor,
          lineHeight: '1.1',
          letterSpacing: '-0.04em'
        }}>
          {displayVal}
        </div>

        {/* Sublabel / Context */}
        {sublabel && (
          <div style={{
            fontSize: '12.5px',
            color: brandTokens.bodyColor,
            marginTop: '6px',
            fontWeight: '500'
          }}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {actionLink && actionText && (
        <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #E8EEE8' }}>
          <Link
            to={actionLink}
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: brandTokens.brandEmerald,
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
// MAIN USER DASHBOARD
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
  const isPaidActive = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);

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

    // Polling every 6 seconds for telemetry
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(false, selectedWebsite);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchData, selectedWebsite]);

  const websitesList = data?.websites || [];
  const [ddosFeedback, setDdosFeedback] = useState(null);

  // Determine Under Attack status for currently selected scope
  const currentSiteObj = selectedWebsite !== 'all' ? websitesList.find(w => (w.id || w._id) === selectedWebsite) : null;
  const isSelectedSiteAttacked = currentSiteObj 
    ? Boolean(currentSiteObj.under_attack_mode) 
    : (websitesList.length > 0 ? websitesList.some(w => Boolean(w.under_attack_mode)) : !ddosEnabled);

  const handleUnderAttackToggle = async () => {
    setDdosToggling(true);
    try {
      if (selectedWebsite !== 'all' && currentSiteObj) {
        const nextState = !isSelectedSiteAttacked;
        await api.toggleWebsiteUnderAttack(selectedWebsite, nextState);
        // Optimistic update
        setData(prev => {
          if (!prev) return prev;
          const updated = (prev.websites || []).map(w => {
            if ((w.id || w._id) === selectedWebsite) {
              return { ...w, under_attack_mode: nextState };
            }
            return w;
          });
          return { ...prev, websites: updated };
        });
        setDdosFeedback({
          type: 'success',
          msg: nextState
            ? `⚡ "I'm Under Attack" Mode ACTIVATED for ${currentSiteObj.domain || currentSiteObj.name || 'site'}! Proof-of-Work (PoW) cryptographic challenge is active on origin.`
            : `✅ "I'm Under Attack" Mode DEACTIVATED for ${currentSiteObj.domain || currentSiteObj.name || 'site'}. Standard passive WAF protection resumed.`
        });
      } else {
        const nextState = !isSelectedSiteAttacked;
        await api.toggleDdos(!nextState);
        setDdosEnabled(!nextState);
        // Batch push to all connected sites
        if (websitesList.length > 0) {
          for (const w of websitesList) {
            try {
              await api.toggleWebsiteUnderAttack(w.id || w._id, nextState);
            } catch {}
          }
        }
        setDdosFeedback({
          type: 'success',
          msg: nextState
            ? `⚡ Fleet DDoS & Under Attack Shield ACTIVATED across all connected WordPress origins! Real-time PoW puzzle is now shielding all traffic.`
            : `✅ Fleet DDoS Protection returned to Standard Passive Rate-Limiting mode.`
        });
      }
      userStore.clear();
      await fetchData(true, selectedWebsite);
    } catch (err) {
      setDdosFeedback({
        type: 'error',
        msg: `Failed to toggle DDoS protection: ${err.message || 'Server error'}`
      });
    } finally {
      setDdosToggling(false);
      setTimeout(() => setDdosFeedback(null), 6000);
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
      borderColor: brandTokens.brandForest,
      backgroundColor: 'rgba(11, 37, 34, 0.05)',
      borderWidth: 2.2,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: brandTokens.brandForest,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 3.5,
      pointHoverRadius: 6
    });
  }

  if (chartMetric === 'both' || chartMetric === 'threats') {
    dailyDatasets.push({
      label: 'Mitigated Threats (403)',
      data: dailyThreatCounts,
      borderColor: brandTokens.dangerRed,
      backgroundColor: 'rgba(220, 38, 38, 0.06)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: brandTokens.dangerRed,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 3.5,
      pointHoverRadius: 6
    });
  }

  const dailyChartData = {
    labels: dailyDays,
    datasets: dailyDatasets
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: brandTokens.brandForest,
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
        backgroundColor: brandTokens.brandForest,
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
        grid: { color: 'rgba(217, 225, 220, 0.55)', drawBorder: false },
        ticks: { font: { size: 11, family: 'Inter', weight: '600' }, color: brandTokens.bodyColor, padding: 6 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter', weight: '600' }, color: brandTokens.bodyColor, padding: 6 }
      }
    }
  };

  const cleanRatio = totalReq > 0
    ? (((totalReq - totalBlk) / totalReq) * 100).toFixed(1)
    : '100.0';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 0 60px' }}>
      
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER — MATCHING UserPricing HEADER DESIGN                     */}
      {/* ========================================================================= */}
      <div style={{
        background: brandTokens.cardBg,
        borderRadius: brandTokens.cardRadius,
        padding: '28px 32px',
        marginBottom: '28px',
        border: brandTokens.cardBorder,
        boxShadow: brandTokens.cardShadow,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          {/* Top Pill Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: brandTokens.pillBg,
              color: brandTokens.brandForest,
              border: '1px solid #D9E1DC',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={12} strokeWidth={2.4} style={{ color: brandTokens.brandEmerald }} />
              <span>Active Security Workspace</span>
            </span>

            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: isPaidActive ? '#E8F3EC' : '#F7F6F1',
              color: isPaidActive ? brandTokens.brandEmerald : brandTokens.bodyColor,
              border: `1px solid ${isPaidActive ? '#CFE2D4' : '#D9E1DC'}`
            }}>
              Current Plan: {userPlan.toUpperCase()}
            </span>

            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: '#E8F3EC',
              color: brandTokens.brandEmerald,
              border: '1px solid #CFE2D4',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandTokens.brandEmerald }} />
              <span>Fleet Online</span>
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: brandTokens.headingColor, letterSpacing: '-0.03em' }}>
            Security &amp; Threat Overview
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: brandTokens.bodyColor, maxWidth: '640px', lineHeight: '1.55' }}>
            Real-time edge telemetry, malicious payload mitigation, and active posture across your connected WordPress fleet.
          </p>
        </div>

        {/* Right Controls: Cluster with DDoS Shield & Domain Scope */}
        <div style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'stretch',
          flexWrap: 'wrap'
        }}>
          {/* 1. DDoS & Under Attack Shield Card */}
          <div style={{
            background: isSelectedSiteAttacked ? 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)' : brandTokens.subCardBg,
            border: isSelectedSiteAttacked ? '1.5px solid #FCA5A5' : brandTokens.cardBorder,
            borderRadius: '12px',
            padding: '14px 18px',
            minWidth: '280px',
            boxShadow: isSelectedSiteAttacked ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.25s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Flame size={14} color={isSelectedSiteAttacked ? '#DC2626' : brandTokens.brandEmerald} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: isSelectedSiteAttacked ? '#DC2626' : brandTokens.headingColor
                }}>
                  DDoS &amp; Under Attack Shield
                </span>
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.05em',
                background: isSelectedSiteAttacked ? '#DC2626' : '#E8F3EC',
                color: isSelectedSiteAttacked ? '#FFFFFF' : brandTokens.brandEmerald,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: isSelectedSiteAttacked ? '#FFFFFF' : brandTokens.brandEmerald,
                  boxShadow: isSelectedSiteAttacked ? '0 0 6px #FFFFFF' : 'none'
                }} />
                {isSelectedSiteAttacked ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: isSelectedSiteAttacked ? '#991B1B' : brandTokens.bodyColor, lineHeight: '1.4', marginBottom: '10px' }}>
              {isSelectedSiteAttacked
                ? '⚡ Proof-of-Work JS challenge active. Dropping 100% L7 floods.'
                : '🛡️ Sliding rate limit active. 1-click PoW mitigation standby.'}
            </div>

            <button
              type="button"
              onClick={handleUnderAttackToggle}
              disabled={ddosToggling}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '8px',
                border: isSelectedSiteAttacked ? '1px solid #DC2626' : '1px solid #D9E1DC',
                background: isSelectedSiteAttacked ? '#DC2626' : '#FFFFFF',
                color: isSelectedSiteAttacked ? '#FFFFFF' : brandTokens.headingColor,
                fontSize: '12px',
                fontWeight: '700',
                cursor: ddosToggling ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isSelectedSiteAttacked ? '0 2px 8px rgba(220, 38, 38, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              {ddosToggling ? (
                <>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Synchronizing Fleet...</span>
                </>
              ) : isSelectedSiteAttacked ? (
                <>
                  <Power size={12} />
                  <span>Deactivate Under Attack Mode</span>
                </>
              ) : (
                <>
                  <Flame size={12} color="#DC2626" />
                  <span>Activate "I'm Under Attack"</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Domain Scope Selector Card (Matching UserPricing Account Status Box) */}
          <div style={{
            background: brandTokens.subCardBg,
            border: brandTokens.cardBorder,
            borderRadius: '12px',
            padding: '16px 20px',
            minWidth: '240px'
          }}>
            <div style={{
              fontSize: '11px',
              color: brandTokens.bodyColor,
              textTransform: 'uppercase',
              fontWeight: '700',
              letterSpacing: '0.08em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Domain Scope</span>
              <button
                onClick={() => fetchData(true, selectedWebsite)}
                disabled={refreshing}
                title="Refresh telemetry"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: brandTokens.bodyColor, display: 'inline-flex', alignItems: 'center', padding: 0 }}
              >
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>

            <select
              value={selectedWebsite}
              onChange={(e) => {
                const siteId = e.target.value;
                setSelectedWebsite(siteId);
                fetchData(true, siteId);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #D9E1DC',
                background: '#ffffff',
                color: brandTokens.headingColor,
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Connected Sites ({websitesList.length})</option>
              {websitesList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.domain || w.name || w.id}
                </option>
              ))}
            </select>

            <div style={{ fontSize: '11px', color: brandTokens.brandEmerald, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandTokens.brandEmerald }} />
              <span>Synced: {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DDoS & Status Feedback Alert */}
      {ddosFeedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          background: ddosFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${ddosFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          color: ddosFeedback.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{ddosFeedback.msg}</span>
          </div>
          <button
            onClick={() => setDdosFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '800' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Onboarding Banner if 0 Sites */}
      {!loading && websitesList.length === 0 && (
        <div style={{
          background: brandTokens.cardBg,
          borderRadius: brandTokens.cardRadius,
          border: '1.5px dashed #D9E1DC',
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: brandTokens.cardShadow
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: brandTokens.headingColor }}>
              No WordPress Websites Connected Yet
            </div>
            <div style={{ fontSize: '13.5px', color: brandTokens.bodyColor, marginTop: '4px' }}>
              Install the MDefender Pro plugin on your WordPress site to activate edge telemetry and two-way threat defense.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="/mdefender-pro.zip"
              download="mdefender-pro.zip"
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                color: brandTokens.headingColor,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '700',
                border: '1px solid #D9E1DC'
              }}
            >
              Download Plugin
            </a>
            <Link
              to="/user/websites"
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: brandTokens.brandForest,
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '700',
                boxShadow: '0 4px 14px rgba(11, 37, 34, 0.2)'
              }}
            >
              + Connect Site
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 4 STAT CARDS — MATCHING UserPricing CARD COLOR & ELEVATION             */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <StatCard
          icon={Activity}
          label="Total Ingress Requests"
          value={data?.total_requests || 0}
          sublabel="Aggregated edge network traffic"
          actionLink="/user/logs"
          actionText="View Ingress Logs"
        />

        <StatCard
          icon={ShieldAlert}
          label="Threats Quarantined"
          value={data?.total_blocked || 0}
          sublabel="Malicious 403 drops"
          isThreat={true}
          actionLink="/user/logs"
          actionText="Inspect Threat Events"
        />

        <StatCard
          icon={ShieldCheck}
          label="Traffic Cleanliness"
          value={`${cleanRatio}%`}
          sublabel="Legitimate human visitors"
          actionLink="/user/bulk/tools"
          actionText="Bot Defense Controls"
        />

        <StatCard
          icon={Globe}
          label="Protected Web Fleet"
          value={websitesList.length || data?.active_websites || 0}
          sublabel="Connected WordPress origins"
          actionLink="/user/websites"
          actionText="Manage Websites"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY ANALYTICS ROW: 2D TRAFFIC TIMELINE & THREAT BREAKDOWN          */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 0.75fr',
        gap: '20px',
        marginBottom: '28px'
      }} className="responsive-dashboard-grid">
        
        {/* Left: 2D High-Precision Area Chart */}
        <div style={{
          background: brandTokens.cardBg,
          borderRadius: brandTokens.cardRadius,
          border: brandTokens.cardBorder,
          padding: '26px 28px',
          boxShadow: brandTokens.cardShadow,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '380px'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: brandTokens.headingColor, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Traffic &amp; Threat Volume (7 Days)
                </h3>
                <div style={{ fontSize: '13px', color: brandTokens.bodyColor }}>
                  Dual-stream comparison of clean visitor traffic vs mitigated threats
                </div>
              </div>

              {/* Metric Filter Pills — Matching UserPricing Billing Toggle */}
              <div style={{
                background: brandTokens.pillBg,
                padding: '4px',
                borderRadius: '999px',
                display: 'inline-flex',
                gap: '4px',
                border: '1px solid #D9E1DC'
              }}>
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    background: chartMetric === 'both' ? brandTokens.brandForest : 'transparent',
                    color: chartMetric === 'both' ? '#ffffff' : brandTokens.bodyColor,
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: chartMetric === 'both' ? '0 2px 6px rgba(11, 37, 34, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  All Traffic
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('clean')}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    background: chartMetric === 'clean' ? brandTokens.brandForest : 'transparent',
                    color: chartMetric === 'clean' ? '#ffffff' : brandTokens.bodyColor,
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: chartMetric === 'clean' ? '0 2px 6px rgba(11, 37, 34, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Clean
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('threats')}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    background: chartMetric === 'threats' ? brandTokens.dangerRed : 'transparent',
                    color: chartMetric === 'threats' ? '#ffffff' : brandTokens.bodyColor,
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: chartMetric === 'threats' ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Threats
                </button>
              </div>
            </div>

            {/* High-Precision 2D Area Chart */}
            <div style={{ height: '235px', position: 'relative' }}>
              <Line data={dailyChartData} options={lineOptions} />
            </div>
          </div>

          {/* Clean Legend Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            marginTop: '12px',
            borderTop: '1px solid #D9E1DC',
            fontSize: '12px',
            color: brandTokens.bodyColor,
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: brandTokens.brandForest }} />
              <span>Clean: <strong style={{ color: brandTokens.headingColor }}>{dailyCleanCounts.reduce((a, b) => a + b, 0).toLocaleString()}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: brandTokens.dangerRed }} />
              <span>Mitigated: <strong style={{ color: brandTokens.dangerRed }}>{dailyThreatCounts.reduce((a, b) => a + b, 0).toLocaleString()}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color={brandTokens.brandEmerald} />
              <span>WAF Rule Engine: <strong style={{ color: brandTokens.brandEmerald }}>Enforcing</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Threat Breakdown Doughnut */}
        <div style={{
          background: brandTokens.cardBg,
          borderRadius: brandTokens.cardRadius,
          border: brandTokens.cardBorder,
          padding: '26px 28px',
          boxShadow: brandTokens.cardShadow,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '380px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: brandTokens.headingColor, margin: 0, letterSpacing: '-0.02em' }}>
                Threat Breakdown
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 9px',
                borderRadius: '999px',
                background: brandTokens.pillBg,
                color: brandTokens.bodyColor,
                border: '1px solid #D9E1DC'
              }}>
                {totalAttacksCount.toLocaleString()} Total Drops
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '8px' }}>
              {/* Donut Chart */}
              <div style={{ height: '145px', width: '145px', position: 'relative', margin: '0 auto' }}>
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
                  <span style={{ fontSize: '20px', fontWeight: '850', color: brandTokens.headingColor, lineHeight: '1' }}>
                    {totalAttacksCount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '9.5px', color: brandTokens.bodyColor, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.06em', marginTop: '3px' }}>
                    QUARANTINED
                  </span>
                </div>
              </div>

              {/* Breakdown List */}
              <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
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
                        fontSize: '12px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: brandTokens.subCardBg,
                        textDecoration: 'none',
                        border: '1px solid #D9E1DC',
                        color: brandTokens.headingColor,
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: securityPalette[tIdx], flexShrink: 0 }} />
                        <span style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                        <span style={{ fontWeight: '800' }}>{count}</span>
                        <span style={{ fontSize: '10.5px', color: brandTokens.bodyColor }}>({pct}%)</span>
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
            paddingTop: '14px',
            marginTop: '12px',
            borderTop: '1px solid #D9E1DC',
            fontSize: '12px'
          }}>
            <span style={{ color: brandTokens.bodyColor }}>Automated Offender Defense Active</span>
            <Link to="/user/bulk/tools" style={{ color: brandTokens.brandEmerald, fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Configure Defense</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECURITY OPERATIONS: TOP ATTACKERS & RECENT BLOCKED EVENTS             */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Left: Top Hostile IPs */}
        <div style={{
          background: brandTokens.cardBg,
          borderRadius: brandTokens.cardRadius,
          border: brandTokens.cardBorder,
          padding: '26px 28px',
          boxShadow: brandTokens.cardShadow,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: brandTokens.headingColor, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Top Attacking IPs
                </h3>
                <div style={{ fontSize: '13px', color: brandTokens.bodyColor }}>
                  Most aggressive hostile origins detected in sampling windows
                </div>
              </div>
              <Link
                to="/user/logs"
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: brandTokens.brandEmerald,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>All Logs</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid #D9E1DC',
                    color: brandTokens.bodyColor,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
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
                      <tr key={i} style={{ borderBottom: '1px solid #E8EEE8' }}>
                        <td style={{ padding: '12px 6px', color: brandTokens.bodyColor, fontWeight: '700', fontSize: '11.5px' }}>
                          #{i + 1}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: brandTokens.headingColor, fontSize: '13px' }}>
                              {attacker.ip}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyIp(attacker.ip)}
                              title="Copy IP"
                              style={{ background: 'none', border: 'none', color: brandTokens.bodyColor, cursor: 'pointer', padding: '1px 3px' }}
                            >
                              {copiedIp === attacker.ip ? <Check size={11} color={brandTokens.brandEmerald} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '65px', height: '6px', background: brandTokens.pillBg, borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${ratio}%`, height: '100%', background: brandTokens.dangerRed }} />
                            </div>
                            <span style={{ fontWeight: '800', color: brandTokens.headingColor, fontSize: '12.5px' }}>
                              {attacker.count}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 6px', textAlign: 'right' }}>
                          {isBanned ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: brandTokens.brandAmber, background: '#FFF4ED', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCD3B6' }}>
                              Blocked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => blockTopIP(attacker.ip)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: '#FEF2F2',
                                color: brandTokens.dangerRed,
                                border: '1px solid #FECACA',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Block IP
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }) || (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: brandTokens.bodyColor, padding: '24px' }}>
                        No hostile IPs recorded in current sampling window
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Recent Blocked Events Feed */}
        <div style={{
          background: brandTokens.cardBg,
          borderRadius: brandTokens.cardRadius,
          border: brandTokens.cardBorder,
          padding: '26px 28px',
          boxShadow: brandTokens.cardShadow,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: brandTokens.headingColor, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Recent Blocked Events
                </h3>
                <div style={{ fontSize: '13px', color: brandTokens.bodyColor }}>
                  Quarantined malicious requests intercepted at origin edge
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: brandTokens.pillBg, padding: '3px', borderRadius: '999px', border: '1px solid #D9E1DC' }}>
                <button
                  type="button"
                  onClick={() => setStreamFilter('all')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: 'none',
                    background: streamFilter === 'all' ? brandTokens.brandForest : 'transparent',
                    color: streamFilter === 'all' ? '#ffffff' : brandTokens.bodyColor,
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
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: 'none',
                    background: streamFilter === 'critical' ? brandTokens.dangerRed : 'transparent',
                    color: streamFilter === 'critical' ? '#ffffff' : brandTokens.bodyColor,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '290px', overflowY: 'auto' }}>
              {filteredRecentActivity?.slice(0, 5).map((log, i) => {
                const sev = getSeverity(log.attack_type);
                const method = (log.method || (log.url?.includes('login') ? 'POST' : 'GET')).toUpperCase();

                return (
                  <div
                    key={i}
                    style={{
                      padding: '11px 13px',
                      borderRadius: '10px',
                      background: brandTokens.subCardBg,
                      border: '1px solid #D9E1DC',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: sev.bg,
                          color: sev.color,
                          border: `1px solid ${sev.border}`
                        }}>
                          {log.attack_type || 'Malicious Payload'}
                        </span>
                        <code style={{ fontSize: '12px', color: brandTokens.headingColor, fontWeight: '700', fontFamily: 'monospace' }}>
                          {log.ip}
                        </code>
                      </div>
                      <span style={{ fontSize: '11px', color: brandTokens.bodyColor }}>
                        {formatRelativeTime(log.timestamp || log.time)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: brandTokens.bodyColor, fontSize: '11.5px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {method} {log.url || '/'}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: brandTokens.dangerRed, background: '#FEF2F2', padding: '2px 7px', borderRadius: '4px', border: '1px solid #FECACA' }}>
                        Blocked
                      </span>
                    </div>
                  </div>
                );
              }) || (
                <div style={{ textAlign: 'center', color: brandTokens.bodyColor, padding: '30px' }}>
                  No recent threat events recorded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SYSTEM POSTURE DOCK — MATCHING UserPricing FOOTER DOCK                */}
      {/* ========================================================================= */}
      <div style={{
        background: brandTokens.cardBg,
        borderRadius: brandTokens.cardRadius,
        border: brandTokens.cardBorder,
        padding: '18px 26px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '13px',
        boxShadow: brandTokens.cardShadow
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandTokens.brandEmerald }} />
            <span style={{ color: brandTokens.bodyColor }}>Edge WAF:</span>
            <strong style={{ color: brandTokens.headingColor }}>Active</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandTokens.brandEmerald }} />
            <span style={{ color: brandTokens.bodyColor }}>Bot Shield:</span>
            <strong style={{ color: brandTokens.headingColor }}>Enforcing</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandTokens.brandEmerald }} />
            <span style={{ color: brandTokens.bodyColor }}>Rate Limiting:</span>
            <strong style={{ color: brandTokens.headingColor }}>Active</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/user/websites" style={{ color: brandTokens.headingColor, textDecoration: 'none', fontWeight: '700', fontSize: '12.5px' }}>
            WordPress Sites ({websitesList.length})
          </Link>
          <span style={{ color: '#D9E1DC' }}>|</span>
          <Link to="/user/bulk/tools" style={{ color: brandTokens.brandEmerald, textDecoration: 'none', fontWeight: '700', fontSize: '12.5px' }}>
            Bot Defense &amp; Rate Limit Settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
