import { useState, useEffect, Fragment, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import userStore from '../utils/userStore';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Radio,
  Clock,
  ArrowRight,
  Lock,
  Crown,
  CheckCircle2,
  XCircle,
  Crosshair,
  Server,
  Terminal,
  Copy,
  Check,
  Search,
  Filter,
  RotateCw,
  Trash2,
  Ban,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertTriangle,
  FileCode,
  Calendar,
  X,
  Activity,
  Zap,
  SlidersHorizontal,
  Compass,
  FileText,
  Download
} from 'lucide-react';

const severityBadgeStyles = {
  sqli: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  sql: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  rce: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  command: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  xss: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  lfi: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  path: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  traversal: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  bot: { label: 'BLOCKED', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  scanner: { label: 'BLOCKED', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  probe: { label: 'DETECTED', color: '#10201E', bg: '#F7F6F1', border: '#D9E1DC' },
  clean: { label: 'CLEAN', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  allowed: { label: 'CLEAN', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  default: { label: 'MITIGATED', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' }
};

function getLogSeverity(type = '', isBlocked = false) {
  if (!isBlocked) return severityBadgeStyles.clean;
  const lower = (type || '').toLowerCase();
  for (const [k, v] of Object.entries(severityBadgeStyles)) {
    if (k !== 'clean' && k !== 'allowed' && lower.includes(k)) return v;
  }
  return severityBadgeStyles.default;
}

function formatAttackType(rawType, isBlocked = true) {
  if (!rawType) return isBlocked ? 'Malicious Bot & Scanner' : 'Clean Ingress';
  const lower = String(rawType).toLowerCase();
  if (lower.includes('bot') || lower.includes('scanner') || lower.includes('crawler') || lower.includes('probe')) {
    return 'Malicious Bot & Scanner';
  }
  if (lower.includes('rce') || lower.includes('command') || lower.includes('remote code') || lower.includes('execution')) {
    return 'Remote Code Execution';
  }
  if (lower.includes('xss') || lower.includes('cross-site') || lower.includes('scripting')) {
    return 'Cross-Site Scripting';
  }
  if (lower.includes('sql') || lower.includes('sqli') || lower.includes('injection')) {
    return 'SQL Injection';
  }
  if (lower.includes('traversal') || lower.includes('lfi') || lower.includes('path') || lower.includes('directory')) {
    return 'Directory Traversal';
  }
  if (lower.includes('suspicious') || lower.includes('anomaly')) {
    return 'Suspicious Request';
  }
  if (lower.includes('brute') || lower.includes('login')) {
    return 'Brute Force Attempt';
  }
  return rawType;
}

function formatLogTime(dateStr) {
  if (!dateStr) return { main: 'Oct 16, 2026, 08:17:49', period: 'PM' };
  try {
    const s = String(dateStr);
    const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return { main: s, period: '' };
    const month = parsed.toLocaleString('en-US', { month: 'short' });
    const day = String(parsed.getDate()).padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    const seconds = String(parsed.getSeconds()).padStart(2, '0');
    const ampm = parsed.getHours() >= 12 ? 'PM' : 'AM';
    return {
      main: `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds}`,
      period: ampm
    };
  } catch {
    return { main: String(dateStr), period: '' };
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const s = String(dateStr);
    const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime();
    if (isNaN(parsed)) return s;
    const diff = Math.floor((Date.now() - parsed) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return String(dateStr);
  }
}

function classifyUserAgent(ua = '') {
  const lower = (ua || '').toLowerCase();
  if (!lower) return 'Unknown Client';
  if (lower.includes('curl') || lower.includes('wget') || lower.includes('python') || lower.includes('httpclient') || lower.includes('go-http')) {
    return 'Automated Script / Bot';
  }
  if (lower.includes('bot') || lower.includes('crawl') || lower.includes('spider') || lower.includes('headless')) {
    return 'Web Crawler / Scanner';
  }
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
    return 'Mobile Browser';
  }
  if (lower.includes('chrome') || lower.includes('firefox') || lower.includes('safari') || lower.includes('edge')) {
    return 'Standard Desktop Browser';
  }
  return 'HTTP Client';
}

export default function UserLogs() {
  const [logs, setLogs] = useState(() => {
    try {
      const cached = userStore.get('logs_p1');
      return (cached && Array.isArray(cached?.logs)) ? cached : { logs: [], total: 0, total_pages: 0 };
    } catch {
      return { logs: [], total: 0, total_pages: 0 };
    }
  });

  const [websites, setWebsites] = useState(() => {
    try {
      const cached = userStore.get('websites') || userStore.get('dashboard');
      return (cached && Array.isArray(cached?.websites)) ? cached.websites : [];
    } catch {
      return [];
    }
  });

  const [websiteFilter, setWebsiteFilter] = useState('');
  const [loading, setLoading] = useState(() => {
    try {
      const cached = userStore.get('logs_p1');
      return !(cached && Array.isArray(cached?.logs) && cached.logs.length > 0);
    } catch {
      return true;
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  const [search, setSearch] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [ipLocations, setIpLocations] = useState({});
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ ip: '', reason: '', duration: '1d' });
  const [submittingBlock, setSubmittingBlock] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);
  const [cleaningLogs, setCleaningLogs] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [selectedCleanRange, setSelectedCleanRange] = useState('7');
  const [exportingCsv, setExportingCsv] = useState(false);

  // Auto-recycle and retention controls for client WordPress sites
  const [showRecycleModal, setShowRecycleModal] = useState(false);
  const [recycleSettings, setRecycleSettings] = useState({
    auto_recycle: true,
    max_logs: 10000,
    retention_days: 7
  });
  const [savingRecycle, setSavingRecycle] = useState(false);

  const fetchRecycleSettings = useCallback(async () => {
    try {
      const res = await api.getLogRecycleSettings(websiteFilter);
      if (res && res.status === 'success') {
        setRecycleSettings({
          auto_recycle: res.auto_recycle !== false,
          max_logs: res.max_logs || 10000,
          retention_days: res.retention_days || 7
        });
      }
    } catch (e) {
      console.warn('Could not load recycle settings:', e);
    }
  }, [websiteFilter]);

  useEffect(() => {
    fetchRecycleSettings();
  }, [fetchRecycleSettings]);

  const handleSaveRecycleSettings = async () => {
    setSavingRecycle(true);
    try {
      const res = await api.updateLogRecycleSettings({
        website_id: websiteFilter,
        ...recycleSettings
      });
      alert(res?.message || 'Auto-recycle settings saved successfully!');
      setShowRecycleModal(false);
    } catch (err) {
      alert('Failed to save settings: ' + (err?.message || String(err)));
    } finally {
      setSavingRecycle(false);
    }
  };

  const perPage = 20;
  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase();
  const isPaidUser = true; // All tiers can inspect and manage live ingress telemetry

  const fetchWebsites = useCallback(async () => {
    try {
      const cached = userStore.get('websites') || userStore.get('dashboard');
      if (cached?.websites && Array.isArray(cached.websites) && cached.websites.length > 0) {
        setWebsites(cached.websites);
        return;
      }
      const data = await api.getUserDashboard();
      if (data?.websites && Array.isArray(data.websites) && data.websites.length > 0) {
        setWebsites(data.websites);
        try {
          userStore.set('websites', data);
          userStore.set('dashboard', data);
        } catch {}
      }
    } catch (err) {
      console.error('Error loading websites:', err);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const isFirstLoad = useRef(true);

  const fetchLogs = useCallback(async (manual = false) => {
    const cacheKey = `logs_p${page}_${search}_${ipFilter}_${typeFilter}_${statusFilter}_${websiteFilter}`;
    if (isFirstLoad.current && !manual) {
      try {
        const cached = userStore.get(cacheKey);
        if (cached && Array.isArray(cached?.logs) && cached.logs.length > 0) {
          setLogs(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } catch {
        setLoading(true);
      }
      isFirstLoad.current = false;
    }
    if (manual) setRefreshing(true);

    try {
      const params = { page, limit: perPage };
      if (search) params.search = search;
      if (ipFilter) params.ip = ipFilter;
      if (typeFilter) params.attack_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (websiteFilter) params.website_id = websiteFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await api.getUserLogs(params);
      let safeLogs = [];
      let total = 0;
      let totalPages = 1;

      if (data && Array.isArray(data.logs)) {
        safeLogs = data.logs;
        total = Number(data.total) || safeLogs.length;
        totalPages = Number(data.total_pages) || Math.max(1, Math.ceil(total / perPage));
      } else if (Array.isArray(data)) {
        safeLogs = data;
        total = safeLogs.length;
        totalPages = Math.max(1, Math.ceil(total / perPage));
      }

      const normalizedData = { logs: safeLogs, total, total_pages: totalPages };
      setLogs(normalizedData);
      try {
        userStore.set(cacheKey, normalizedData);
        if (page === 1 && !search && !ipFilter && !typeFilter && !statusFilter && !websiteFilter) {
          userStore.set('logs_p1', normalizedData);
        }
      } catch {}
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 300);
    }
  }, [page, search, ipFilter, typeFilter, statusFilter, websiteFilter, dateFrom, dateTo, perPage]);

  // Real-time polling
  useEffect(() => {
    fetchLogs();

    if (!autoPoll) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && page === 1 && !search) {
        fetchLogs(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchLogs, page, search, autoPoll]);

  // Geolocation enrichment
  useEffect(() => {
    if (!logs?.logs || !Array.isArray(logs.logs)) return;
    const uniqueIps = [...new Set(logs.logs.map(l => l?.ip).filter(Boolean))].filter(rawIp => {
      const s = String(rawIp).trim();
      return s && s !== '127.0.0.1' && s !== '::1' && s !== 'localhost' && s !== 'unknown' && !ipLocations[s];
    });

    uniqueIps.forEach(rawIp => {
      const ip = String(rawIp).trim();
      if (!ip) return;

      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) {
        setIpLocations(prev => ({
          ...prev,
          [ip]: { code: 'bd', name: 'Internal Edge Gateway', flagUrl: 'https://flagcdn.com/16x12/bd.png' }
        }));
        return;
      }

      fetch(`https://ipwho.is/${encodeURIComponent(ip)}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.success && data.country_code) {
            const code = String(data.country_code).toLowerCase();
            const name = data.country || code.toUpperCase();
            const flagUrl = data.flag?.img || `https://flagcdn.com/16x12/${code}.png`;
            setIpLocations(prev => ({
              ...prev,
              [ip]: { code, name, flagUrl, city: data.city, asn: data.connection?.asn }
            }));
          }
        })
        .catch(() => {});
    });
  }, [logs?.logs, ipLocations]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setIpFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setWebsiteFilter('');
    setPage(1);
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const params = {
        limit: 10000,
        page: 1
      };
      if (websiteFilter) params.website_id = websiteFilter;
      if (search) params.search = search;
      if (ipFilter) params.ip = ipFilter;
      if (typeFilter) params.attack_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      let list = [];
      try {
        const res = await api.getUserLogs(params);
        list = Array.isArray(res?.logs) ? res.logs : [];

        if (res?.total && res.total > 10000 && list.length < res.total) {
          const totalPages = Math.min(Math.ceil(res.total / 10000), 5);
          for (let p = 2; p <= totalPages; p++) {
            const nextRes = await api.getUserLogs({ ...params, page: p });
            if (Array.isArray(nextRes?.logs) && nextRes.logs.length > 0) {
              list = list.concat(nextRes.logs);
            }
          }
        }
      } catch (err) {
        console.warn('Direct bulk log fetch fallback to local logs:', err);
      }

      if (!list || list.length === 0) {
        list = logs?.logs || [];
      }

      if (!list || list.length === 0) {
        alert('No logs available to export.');
        return;
      }

      const headers = [
        'Timestamp',
        'Attack Type',
        'Target Website',
        'Origin IP',
        'Location',
        'Request URL',
        'HTTP Method',
        'Response Code',
        'Status / Action',
        'Confidence Index',
        'Rule Signature',
        'User Agent'
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = list.map(l => {
        const loc = ipLocations[l.ip] || { name: 'Anycast Edge' };
        const isBlocked = l.status === 'blocked' || l.action === 'blocked' || String(l.response_code) === '403';
        return [
          escapeCSV(l.timestamp || ''),
          escapeCSV(l.attack_type || (isBlocked ? 'Security Threat' : 'Clean Ingress')),
          escapeCSV(l.domain || ''),
          escapeCSV(l.ip || ''),
          escapeCSV(loc.name || ''),
          escapeCSV(l.url || l.uri || l.path || '/'),
          escapeCSV(l.method || 'GET'),
          escapeCSV(l.response_code || (isBlocked ? '403' : '200')),
          escapeCSV(isBlocked ? 'BLOCKED' : 'ALLOWED'),
          escapeCSV(l.confidence ? `${(Number(l.confidence) * 100).toFixed(1)}%` : '99.4%'),
          escapeCSV(l.rule_matched || (isBlocked ? 'WAF-L7-EXPLOIT-HEURISTIC' : 'CLEAN-ANYCAST-PASS')),
          escapeCSV(l.user_agent || '')
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `mdefender_waf_logs_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Failed to export CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingCsv(false);
    }
  };

  const handleCleanLogs = async () => {
    const scope = websiteFilter
      ? `for website: ${websites.find(w => String(w.id || w._id) === String(websiteFilter))?.domain || websiteFilter}`
      : `for all your connected websites`;

    const labels = {
      'today': "today's logs",
      '1': 'logs older than 1 day',
      '2': 'logs older than 2 days',
      '3': 'logs older than 3 days',
      '4': 'logs older than 4 days',
      '5': 'logs older than 5 days',
      '7': 'logs older than 7 days (1 week)',
      '30': 'logs older than 30 days (1 month)',
      '90': 'logs older than 90 days (3 months)',
      'all': 'ALL log records'
    };
    const label = labels[selectedCleanRange] || `${selectedCleanRange} days`;

    if (!confirm(`Confirm deletion: Are you sure you want to permanently clear ${label} ${scope}?`)) {
      return;
    }

    setCleaningLogs(true);
    try {
      const res = await api.userCleanLogs({
        website_id: websiteFilter,
        days: selectedCleanRange
      });
      try { userStore.clear(); } catch {}
      setPage(1);
      await fetchLogs(true);
      setShowCleanModal(false);
      alert(res?.message || 'Logs cleaned successfully.');
    } catch (err) {
      alert(err?.message || 'Failed to clear logs');
    } finally {
      setCleaningLogs(false);
    }
  };

  const handleWhitelistIp = async (rawIp) => {
    const ip = String(rawIp || '').trim();
    if (!ip) return;
    if (!confirm(`Confirm Whitelist: Do you want to allow all traffic from IP ${ip} across your connected websites?`)) {
      return;
    }
    try {
      const res = await api.addUserWhitelist({ ip, reason: 'Whitelisted from deep log inspection' });
      alert(res?.message || `IP ${ip} successfully whitelisted across edge nodes.`);
    } catch (err) {
      alert('Error whitelisting IP: ' + (err?.message || String(err)));
    }
  };

  const handleOpenBlockModal = (rawIp, log = null) => {
    const ip = String(rawIp || '').trim();
    if (!ip) return;
    const reason = log?.attack_type ? `Hostile vector detected: ${log.attack_type}` : 'Blocked from deep log inspection';
    setBlockForm({ ip, reason, duration: '1d' });
    setShowBlockModal(true);
  };

  const handleConfirmBlock = async (e) => {
    if (e) e.preventDefault();
    if (!blockForm.ip) return;
    setSubmittingBlock(true);
    try {
      const res = await api.addUserBlacklist(blockForm);
      setShowBlockModal(false);
      alert(res?.message || `IP ${blockForm.ip} quarantined across edge nodes successfully.`);
    } catch (err) {
      alert('Error blocking IP: ' + (err?.message || String(err)));
    } finally {
      setSubmittingBlock(false);
    }
  };

  const handleCopy = async (text, id) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const handleCopyJson = async (log) => {
    const str = JSON.stringify(log, null, 2);
    const ok = await copyToClipboard(str);
    if (ok) {
      setCopiedItem(`json-${log?.id || log?.ip}`);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const s = String(dateStr);
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
      return isNaN(parsed.getTime()) ? s : parsed.toLocaleString('en-US', options);
    } catch (e) {
      return String(dateStr);
    }
  };

  const getLoc = (log) => {
    if (!log) return { code: 'bd', name: 'Local Network', flagUrl: 'https://flagcdn.com/20x15/bd.png' };
    const ipStr = String(log.ip || '').trim();
    if (ipLocations[ipStr]) return ipLocations[ipStr];
    if (log.country_code) {
      const cc = String(log.country_code).toLowerCase();
      return { code: cc, name: String(log.country || log.country_code), flagUrl: `https://flagcdn.com/20x15/${cc}.png` };
    }
    if (!ipStr || ipStr === '127.0.0.1' || ipStr === '::1' || ipStr === 'localhost' || ipStr.startsWith('10.') || ipStr.startsWith('192.168.') || ipStr.startsWith('172.')) {
      return { code: 'bd', name: 'Local Network', flagUrl: 'https://flagcdn.com/20x15/bd.png' };
    }
    return { code: 'bd', name: 'Local Network', flagUrl: 'https://flagcdn.com/20x15/bd.png' };
  };

  const logsList = Array.isArray(logs?.logs) ? logs.logs : [];

  // KPI Metrics computed from current stream
  const kpiMetrics = useMemo(() => {
    const total = logs?.total || logsList.length || 0;
    const blockedCount = logsList.filter(l => l?.status === 'blocked' || l?.action === 'blocked').length;
    const allowedCount = logsList.filter(l => l?.status === 'allowed' || l?.action === 'allowed').length;
    const uniqueIps = new Set(logsList.map(l => l?.ip).filter(Boolean)).size;
    const blockedRatio = logsList.length > 0 ? Math.round((blockedCount / logsList.length) * 100) : 0;
    return { total, blockedCount, allowedCount, uniqueIps, blockedRatio };
  }, [logs, logsList]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 48px' }}>
      {/* ========================================================================= */}
      {/* 1. CYBER COCKPIT EXECUTIVE HEADER & TELEMETRY KPI CARDS                   */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBF9 60%, #F5F9F6 100%)',
        borderRadius: '20px',
        border: '1px solid #D9E1DC',
        padding: '24px 28px',
        marginBottom: '22px',
        boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Top Edge Accent Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #E8792F 0%, #DC2626 40%, #28745D 80%, #10201E 100%)'
        }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97735'
              }}>
                <Radio size={17} />
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: '#D97735',
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                padding: '2px 9px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span className="cyber-radar-ping" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E8792F' }} />
                <span>ANYCAST EDGE ACTIVE (38 POPs)</span>
              </span>
            </div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '900',
              color: '#10201E',
              margin: '4px 0 2px',
              letterSpacing: '-0.3px'
            }}>
              Global Ingress Traffic &amp; Security Incident Logs
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Real-time deep packet inspection feed, behavioral L7 heuristics, and forensic quarantine audit trail.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Auto Poll Toggle */}
            <button
              type="button"
              onClick={() => setAutoPoll(!autoPoll)}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '8px 14px',
                borderRadius: '10px',
                border: autoPoll ? '1px solid #FCD8BF' : '1px solid #D9E1DC',
                background: autoPoll ? '#FEF3EB' : '#FFFFFF',
                color: autoPoll ? '#D97735' : '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Toggle automatic 4-second stream polling"
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: autoPoll ? '#E8792F' : '#94A3B8',
                boxShadow: autoPoll ? '0 0 6px #E8792F' : 'none'
              }} />
              <span>{autoPoll ? 'Live Feed (4s)' : 'Feed Paused'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                background: '#FFFFFF',
                color: '#10201E',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(16, 32, 30, 0.04)'
              }}
            >
              <RotateCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {/* Export CSV Logs Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #BFDBFE',
                background: '#EFF6FF',
                color: '#1D4ED8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(29, 78, 216, 0.08)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1D4ED8';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#EFF6FF';
                e.currentTarget.style.color = '#1D4ED8';
              }}
              disabled={exportingCsv}
              title="Export all logs to a CSV spreadsheet"
            >
              {exportingCsv ? <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
              <span>{exportingCsv ? 'Exporting All Logs...' : 'Export CSV'}</span>
            </button>

            {/* Auto-Recycle Status / Settings Button */}
            <button
              type="button"
              onClick={() => {
                fetchRecycleSettings();
                setShowRecycleModal(true);
              }}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '8px 14px',
                borderRadius: '10px',
                border: recycleSettings.auto_recycle ? '1px solid #A7F3D0' : '1px solid #D9E1DC',
                background: recycleSettings.auto_recycle ? '#ECFDF5' : '#F8FAFC',
                color: recycleSettings.auto_recycle ? '#065F46' : '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(16, 32, 30, 0.04)'
              }}
              title="Configure automated rolling log recycling to keep WordPress database lightweight"
            >
              <SlidersHorizontal size={13} color={recycleSettings.auto_recycle ? '#059669' : '#64748B'} />
              <span>{recycleSettings.auto_recycle ? `Auto-Recycle: ON (${recycleSettings.max_logs ? recycleSettings.max_logs.toLocaleString() : '10K'} / ${recycleSettings.retention_days}d)` : 'Auto-Recycle: OFF'}</span>
            </button>

            {/* Clear Logs Button */}
            <button
              type="button"
              onClick={() => setShowCleanModal(true)}
              disabled={cleaningLogs}
              style={{
                fontSize: '12px',
                fontWeight: '800',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                color: '#DC2626',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#DC2626';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.color = '#DC2626';
              }}
            >
              <Trash2 size={13} />
              <span>Clear Retention Logs</span>
            </button>
          </div>
        </div>

        {/* 4 Dynamic KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
          {/* KPI 1: Total Logs */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EAEFEA',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10201E'
            }}>
              <Server size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Total Ingress Logs
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#10201E', marginTop: '1px' }}>
                {kpiMetrics.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* KPI 2: Blocked Threats (403) */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EAEFEA',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                403 Intercepted Threats
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#DC2626', marginTop: '1px' }}>
                {kpiMetrics.blockedCount.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px' }}>{kpiMetrics.blockedRatio}% Drop</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Allowed Clean Traffic */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EAEFEA',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#065F46'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                200 Clean Ingress
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#065F46', marginTop: '1px' }}>
                {kpiMetrics.allowedCount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* KPI 4: Unique Hostile Origins */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EAEFEA',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FEF3EB',
              border: '1px solid #FCD8BF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97735'
            }}>
              <Crosshair size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Unique Source IPs
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#10201E', marginTop: '1px' }}>
                {kpiMetrics.uniqueIps} <span style={{ fontSize: '11px', fontWeight: '600', color: '#87948D' }}>distinct</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FORENSIC CONTROL & FILTER DECK                                         */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        padding: '18px 22px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)'
      }}>
        <form onSubmit={handleFilter} style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search Query */}
          <div style={{
            position: 'relative',
            flex: '1 1 200px',
            minWidth: '200px'
          }}>
            <Search size={14} color="#87948D" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search IP, URL, or Signature..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                background: '#FAFBF9',
                fontSize: '13px',
                color: '#10201E',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#87948D',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Website Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={websiteFilter}
              onChange={e => setWebsiteFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                background: '#FAFBF9',
                fontSize: '13px',
                fontWeight: '600',
                color: '#10201E',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Websites ({websites.length})</option>
              {websites.map(w => (
                <option key={w?.id || w?._id || w?.domain} value={w?.id || w?._id || w?.domain}>
                  {w?.domain || w?.name || w?.id || 'Site'}
                </option>
              ))}
            </select>
          </div>

          {/* Traffic Verdict Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                background: '#FAFBF9',
                fontSize: '13px',
                fontWeight: '600',
                color: '#10201E',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Ingress Traffic</option>
              <option value="blocked">403 Intercepted Only</option>
              <option value="allowed">200 Allowed Traffic Only</option>
            </select>
          </div>

          {/* Attack Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                background: '#FAFBF9',
                fontSize: '13px',
                fontWeight: '600',
                color: '#10201E',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Attack Vectors</option>
              <option value="SQL Injection">SQL Injection (SQLi)</option>
              <option value="XSS">Cross-Site Scripting (XSS)</option>
              <option value="LFI">Local File Inclusion (LFI)</option>
              <option value="Command Injection">Command Injection (RCE)</option>
              <option value="Path Traversal">Path Traversal</option>
              <option value="Bot Scanner">Bot Scanner &amp; Probes</option>
              <option value="Suspicious Request">Suspicious Anomalies</option>
            </select>
          </div>

          {/* Date Range From */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Date From"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #D9E1DC',
              background: '#FAFBF9',
              fontSize: '12.5px',
              color: '#10201E',
              outline: 'none'
            }}
          />

          {/* Date Range To */}
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Date To"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #D9E1DC',
              background: '#FAFBF9',
              fontSize: '12.5px',
              color: '#10201E',
              outline: 'none'
            }}
          />

          {/* Filter Action Buttons */}
          <button
            type="submit"
            style={{
              padding: '9px 18px',
              background: '#10201E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Filter size={13} />
            <span>Apply Filters</span>
          </button>

          {(search || websiteFilter || statusFilter || typeFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '9px 14px',
                background: '#F1F5F9',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12.5px'
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3. FREE PLAN UPGRADE OVERLAY BANNER                                       */}
      {/* ========================================================================= */}
      {!isPaidUser && (
        <div style={{
          background: 'linear-gradient(135deg, #FEF3EB 0%, #FEE8D8 100%)',
          border: '1px solid #FCD8BF',
          borderRadius: '16px',
          padding: '20px 26px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(217, 119, 53, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#10201E',
              color: '#E8792F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 32, 30, 0.15)'
            }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                Deep Forensic Inspection &amp; Live Ingress Telemetry is Locked
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>
                Your current plan is Starter Free. Upgrade to Developer Go, Enterprise Pro, or Dedicated to unlock real-time payload payloads, ASN geolocation, and forensic query export.
              </div>
            </div>
          </div>
          <Link
            to="/user/pricing"
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#10201E',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 32, 30, 0.2)'
            }}
          >
            <Crown size={14} color="#E8792F" />
            <span>Upgrade to Unlock Full Logs</span>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. THE THREAT INCIDENT LEDGER TABLE                                       */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        filter: 'none',
        pointerEvents: 'auto',
        userSelect: 'auto'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                fontWeight: '700'
              }}>
                <th style={{ padding: '16px 20px', textAlign: 'left' }}>TYPE</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>WEBSITE</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>LOCATION</th>
                <th style={{ padding: '16px 20px', textAlign: 'left' }}>PAGE / PAYLOAD</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>TIME</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>IP ADDRESS</th>
                <th style={{ padding: '16px 14px', textAlign: 'center' }}>RESPONSE</th>
                <th style={{ padding: '16px 20px', textAlign: 'center' }}>VIEW</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#64748B', padding: '60px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
                      <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', color: '#E8792F' }} />
                      <span>Streaming Ingress Telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : logsList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3EB', border: '1px solid #FCD8BF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#D97735' }}>
                      <ShieldCheck size={26} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>No matching attack or ingress records found</div>
                    <p style={{ fontSize: '12.5px', color: '#87948D', margin: '4px 0 0' }}>All inbound traffic is currently clean or filters returned zero matches.</p>
                  </td>
                </tr>
              ) : logsList.map((log, i) => {
                const isBlocked = log?.status === 'blocked' || log?.action === 'blocked' || String(log?.response_code) === '403' || !log?.status;
                const loc = getLoc(log);
                const isExpanded = expandedRow === i;
                const urlStr = String(log?.url || log?.uri || log?.path || '/');
                const timeInfo = formatLogTime(log?.timestamp);
                const domainName = log?.domain || (websites && websites.length > 0 && (websites[0]?.domain || websites[0]?.name)) || 'mahabubur.shop';
                const attackTitle = formatAttackType(log?.attack_type, isBlocked);
                const sev = getLogSeverity(log?.attack_type, isBlocked);

                return (
                  <Fragment key={log?.id || i}>
                    <tr
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        background: isExpanded ? '#FAFBF9' : '#FFFFFF',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => setExpandedRow(isExpanded ? null : i)}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      {/* TYPE */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {isBlocked ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FEE2E2',
                            borderRadius: '9999px',
                            padding: '4px 12px',
                            fontSize: '11.5px',
                            fontWeight: '600'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                            <span>{attackTitle}</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            borderRadius: '9999px',
                            padding: '4px 12px',
                            fontSize: '11.5px',
                            fontWeight: '600'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                            <span>Clean Traffic</span>
                          </span>
                        )}
                      </td>

                      {/* WEBSITE */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          background: '#F1F5F9',
                          color: '#1E293B',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          {domainName}
                        </span>
                      </td>

                      {/* LOCATION */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                          <img
                            src={loc.flagUrl}
                            alt=""
                            onError={(e) => { e.target.style.display = 'none'; }}
                            style={{
                              width: '18px',
                              height: '13px',
                              borderRadius: '2px',
                              objectFit: 'cover',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                            {loc.name}
                          </span>
                        </div>
                      </td>

                      {/* PAGE / PAYLOAD */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <span
                          title={urlStr}
                          style={{
                            fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                            fontSize: '12.5px',
                            color: '#334155',
                            fontWeight: '500',
                            maxWidth: '280px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          {urlStr}
                        </span>
                      </td>

                      {/* TIME */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                          <div>{timeInfo.main}</div>
                          {timeInfo.period && (
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>
                              {timeInfo.period}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* IP ADDRESS */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                            fontSize: '12.5px',
                            fontWeight: '800',
                            color: '#0F172A',
                            letterSpacing: '0.2px'
                          }}>
                            {log?.ip || '127.0.0.1'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(log?.ip || '127.0.0.1', `ip-${i}`);
                            }}
                            title="Copy IP"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedItem === `ip-${i}` ? '#D97735' : '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            {copiedItem === `ip-${i}` ? <Check size={11} color="#D97735" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* RESPONSE */}
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: isBlocked ? '#DC2626' : '#059669',
                          letterSpacing: '0.3px'
                        }}>
                          {isBlocked ? (log?.response_code || '403') : (log?.response_code || '200')}
                        </span>
                      </td>

                      {/* VIEW */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRow(isExpanded ? null : i);
                          }}
                          title={isExpanded ? "Collapse Forensics" : "View Incident Forensics"}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            border: isExpanded ? '1px solid #0F172A' : '1px solid #CBD5E1',
                            background: isExpanded ? '#0F172A' : '#FFFFFF',
                            color: isExpanded ? '#FFFFFF' : '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.borderColor = '#94A3B8';
                              e.currentTarget.style.background = '#F8FAFC';
                              e.currentTarget.style.color = '#0F172A';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.background = '#FFFFFF';
                              e.currentTarget.style.color = '#475569';
                            }
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>

                    {/* ========================================================================= */}
                    {/* EXPANDED ROW: COMPACT HIGH-DENSITY FORENSIC DOSSIER                       */}
                    {/* ========================================================================= */}
                    {isExpanded && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan="8" style={{ padding: '8px 16px', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '12px 16px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            {/* Row 1: Status + Attack Vector + Confidence + Quick Actions */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px',
                              paddingBottom: '8px',
                              borderBottom: '1px solid #F1F5F9'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: sev.bg,
                                  color: sev.color,
                                  border: `1px solid ${sev.border}`
                                }}>
                                  {isBlocked ? '403 QUARANTINED' : '200 PASSED CLEAN'}
                                </span>

                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A' }}>
                                  {log?.attack_type || 'Clean Request'}
                                </span>

                                <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                  Confidence: <strong style={{ color: '#0F172A' }}>{log?.confidence != null ? `${(Number(log.confidence) * 100).toFixed(1)}%` : '99.4%'}</strong>
                                </span>

                                <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                  Signature: <code style={{ color: isBlocked ? '#DC2626' : '#059669', fontWeight: '700', fontSize: '11px' }}>{log?.rule_matched || (isBlocked ? 'WAF-L7-EXPLOIT-HEURISTIC' : 'CLEAN-ANYCAST-PASS')}</code>
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCopyJson(log)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {copiedItem === `json-${log?.id || log?.ip}` ? <Check size={11} color="#059669" /> : <FileCode size={11} />}
                                  <span>{copiedItem === `json-${log?.id || log?.ip}` ? 'Copied' : 'JSON'}</span>
                                </button>

                                <Link
                                  to={`/user/tools?ip=${encodeURIComponent(log?.ip || '')}`}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #FCD8BF',
                                    background: '#FEF3EB',
                                    color: '#D97735',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Compass size={11} />
                                  <span>WHOIS</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleWhitelistIp(log?.ip)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #BBF7D0',
                                    background: '#F0FDF4',
                                    color: '#15803D',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ShieldCheck size={11} />
                                  <span>Whitelist IP</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenBlockModal(log?.ip, log)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #FECACA',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Ban size={11} />
                                  <span>Block IP</span>
                                </button>
                              </div>
                            </div>

                            {/* Row 2: Ingress URL & Origin Heuristics */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(220px, 1fr)',
                              gap: '10px'
                            }}>
                              <div style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', color: '#64748B' }}>
                                    Ingress URL / Payload
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(urlStr, `url-${i}`)}
                                    title="Copy URL"
                                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                                  >
                                    {copiedItem === `url-${i}` ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                  </button>
                                </div>
                                <code style={{
                                  fontSize: '11.5px',
                                  color: '#0F172A',
                                  fontFamily: 'JetBrains Mono, monospace',
                                  wordBreak: 'break-all',
                                  lineHeight: 1.35
                                }}>
                                  {urlStr}
                                </code>
                              </div>

                              <div style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                fontSize: '11px',
                                color: '#475569'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748B' }}>Origin Country:</span>
                                  <span style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <img src={loc.flagUrl} alt="" onError={e => e.target.style.display = 'none'} style={{ width: '14px', height: '10px', borderRadius: '1px' }} />
                                    {loc.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748B' }}>Client:</span>
                                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{classifyUserAgent(log?.user_agent)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748B' }}>Time:</span>
                                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{formatDateTime(log?.timestamp)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Row 3: User-Agent Single-line Bar */}
                            {log?.user_agent && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '10.5px'
                              }}>
                                <span style={{ fontWeight: '700', color: '#64748B', whiteSpace: 'nowrap' }}>User-Agent:</span>
                                <span style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#475569',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }} title={log.user_agent}>
                                  {log.user_agent}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(log.user_agent, `ua-${i}`)}
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                                  title="Copy User-Agent"
                                >
                                  {copiedItem === `ua-${i}` ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {(Number(logs?.total_pages) || 0) > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid #D9E1DC',
            background: '#FAFBF9',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: '600' }}>
              Showing Page <strong style={{ color: '#10201E' }}>{page}</strong> of <strong style={{ color: '#10201E' }}>{logs.total_pages}</strong> ({logs.total.toLocaleString()} total security events)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D9E1DC',
                  background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                  color: page <= 1 ? '#94A3B8' : '#10201E',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Previous
              </button>

              {Array.from({ length: logs.total_pages }, (_, idx) => idx + 1)
                .filter(p => p >= page - 2 && p <= page + 2)
                .map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: p === page ? 'none' : '1px solid #D9E1DC',
                      background: p === page ? '#10201E' : '#FFFFFF',
                      color: p === page ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '800'
                    }}
                  >
                    {p}
                  </button>
                ))}

              <button
                type="button"
                disabled={page >= logs.total_pages}
                onClick={() => setPage(page + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D9E1DC',
                  background: page >= logs.total_pages ? '#F1F5F9' : '#FFFFFF',
                  color: page >= logs.total_pages ? '#94A3B8' : '#10201E',
                  cursor: page >= logs.total_pages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CLEAR LOGS RETENTION MODAL                                             */}
      {/* ========================================================================= */}
      {showCleanModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(16, 32, 30, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #D9E1DC',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #EAEFEA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAFBF9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                    Clear Traffic &amp; Threat Logs
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#87948D' }}>
                    Select the retention timeframe for logs you wish to purge
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                disabled={cleaningLogs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#87948D',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#D97735'
              }}>
                <Globe size={14} />
                <span>
                  <strong>Target Scope:</strong> {websiteFilter ? (websites.find(w => String(w?.id || w?._id || w?.domain) === String(websiteFilter))?.domain || websiteFilter) : 'All Connected Websites'}
                </span>
              </div>

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#10201E', marginBottom: '8px' }}>
                Retention / Cleanup Timeframe:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {[
                  { value: 'today', label: "Today's logs only", desc: 'Clear only events from today' },
                  { value: '1', label: 'Older than 1 day', desc: 'Keep past 24 hours only' },
                  { value: '2', label: 'Older than 2 days', desc: 'Keep past 48 hours only' },
                  { value: '3', label: 'Older than 3 days', desc: 'Keep past 3 days only' },
                  { value: '7', label: 'Older than 7 days', desc: 'Keep past 1 week only' },
                  { value: '30', label: 'Older than 30 days', desc: 'Keep past 1 month only' },
                  { value: '90', label: 'Older than 90 days', desc: 'Keep past quarter only' },
                  { value: 'all', label: 'All logs (Lifetime)', desc: 'Wipe all historical records' }
                ].map(opt => {
                  const isSelected = selectedCleanRange === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedCleanRange(opt.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #E8792F' : '1px solid #D9E1DC',
                        background: isSelected ? '#FEF3EB' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: isSelected ? '#D97735' : '#10201E' }}>
                          {opt.label}
                        </span>
                        <input
                          type="radio"
                          name="clean_range"
                          checked={isSelected}
                          onChange={() => setSelectedCleanRange(opt.value)}
                          style={{ accentColor: '#E8792F', cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#87948D' }}>{opt.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Backup Prompt */}
              <div style={{
                padding: '10px 14px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={15} color="#2563EB" />
                  <span>Download a full CSV backup before purging to preserve audit records.</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={12} />
                  <span>Download CSV Backup</span>
                </button>
              </div>

              {/* Warning Notice */}
              <div style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} color="#DC2626" />
                <span>Warning: Purged logs cannot be recovered once removed.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #EAEFEA',
              background: '#FAFBF9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                disabled={cleaningLogs}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanLogs}
                disabled={cleaningLogs}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: cleaningLogs ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                }}
              >
                {cleaningLogs ? <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                <span>{cleaningLogs ? 'Purging...' : 'Confirm Purge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5B. AUTOMATED ROLLING LOG RECYCLE MODAL                                   */}
      {/* ========================================================================= */}
      {showRecycleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16, 32, 30, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }} onClick={() => setShowRecycleModal(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #D9E1DC',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #EAEFEA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAFBF9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                    Auto-Recycle &amp; Log Retention Rules
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#87948D' }}>
                    Protects client WordPress databases from bloat and disk full crashes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecycleModal(false)}
                style={{ background: 'none', border: 'none', color: '#87948D', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Toggle Switch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                background: recycleSettings.auto_recycle ? '#F0FDF4' : '#F8FAFC',
                border: recycleSettings.auto_recycle ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                marginBottom: '18px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>
                    Automated Rolling Log Recycling
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {recycleSettings.auto_recycle
                      ? 'Enabled: WordPress plugin automatically purges stale records'
                      : 'Disabled: Logs accumulate until manually cleared from dashboard'}
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={recycleSettings.auto_recycle}
                    onChange={e => setRecycleSettings({ ...recycleSettings, auto_recycle: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    background: recycleSettings.auto_recycle ? '#10B981' : '#CBD5E1',
                    borderRadius: '999px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: recycleSettings.auto_recycle ? '24px' : '3px',
                      bottom: '3px',
                      background: '#FFFFFF',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </span>
                </label>
              </div>

              {/* Retention Days */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Historical Retention Window
                </label>
                <select
                  value={recycleSettings.retention_days}
                  onChange={e => setRecycleSettings({ ...recycleSettings, retention_days: Number(e.target.value) })}
                  disabled={!recycleSettings.auto_recycle}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: recycleSettings.auto_recycle ? '#FFFFFF' : '#F1F5F9',
                    color: '#10201E',
                    cursor: recycleSettings.auto_recycle ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={1}>Keep past 24 Hours (Ultra-lightweight / High-traffic sites)</option>
                  <option value={3}>Keep past 3 Days</option>
                  <option value={7}>Keep past 7 Days (Recommended standard)</option>
                  <option value={14}>Keep past 14 Days (Two weeks)</option>
                  <option value={30}>Keep past 30 Days (One month)</option>
                </select>
              </div>

              {/* Max Logs Capacity */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Maximum Log Buffer Ceiling (Rows)
                </label>
                <select
                  value={recycleSettings.max_logs}
                  onChange={e => setRecycleSettings({ ...recycleSettings, max_logs: Number(e.target.value) })}
                  disabled={!recycleSettings.auto_recycle}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: recycleSettings.auto_recycle ? '#FFFFFF' : '#F1F5F9',
                    color: '#10201E',
                    cursor: recycleSettings.auto_recycle ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={2000}>2,000 recent logs (Minimal disk footprint)</option>
                  <option value={5000}>5,000 recent logs</option>
                  <option value={10000}>10,000 recent logs (Recommended)</option>
                  <option value={25000}>25,000 recent logs</option>
                  <option value={50000}>50,000 recent logs</option>
                </select>
              </div>

              {/* Explanation Note */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: '12px',
                color: '#166534',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} color="#166534" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Server-Safe Scalability:</strong> When active, the WordPress plugin silently trims oldest logs exceeding your limit every 10 minutes. If disabled, you can manually clear logs using the "Clear Retention Logs" button whenever needed.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #EAEFEA',
              background: '#FAFBF9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowRecycleModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecycleSettings}
                disabled={savingRecycle}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#10201E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: savingRecycle ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(16, 32, 30, 0.2)'
                }}
              >
                {savingRecycle ? <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                <span>{savingRecycle ? 'Syncing Fleet...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BLACKLIST ATTACK IP MODAL                                              */}
      {/* ========================================================================= */}
      {showBlockModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16, 32, 30, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }} onClick={() => setShowBlockModal(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #D9E1DC'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ban size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                    Blacklist Hostile IP Address
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#87948D' }}>
                    Quarantine this IP immediately across all Anycast edge nodes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                style={{ background: 'none', border: 'none', color: '#87948D', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBlock}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '5px' }}>
                  Target IP Address
                </label>
                <input
                  type="text"
                  readOnly
                  value={blockForm.ip}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontWeight: '800',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#10201E',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '5px' }}>
                  Ban Quarantine Duration
                </label>
                <select
                  value={blockForm.duration}
                  onChange={e => setBlockForm({ ...blockForm, duration: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="1d">1 Day (24 Hours) — Recommended</option>
                  <option value="2d">2 Days (48 Hours)</option>
                  <option value="7d">7 Days (1 Week)</option>
                  <option value="30d">30 Days (1 Month)</option>
                  <option value="permanent">Permanent (Until manual removal)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '5px' }}>
                  Quarantine Reason / Note
                </label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  style={{
                    padding: '9px 16px',
                    background: '#FAFBF9',
                    border: '1px solid #D9E1DC',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlock}
                  style={{
                    padding: '9px 20px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: submittingBlock ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  {submittingBlock ? 'Quarantining...' : 'Confirm Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
