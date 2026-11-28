import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import userStore from '../utils/userStore';
import { getStoredPricingConfig, subscribePricing } from '../utils/pricingStore';
import {
  LayoutDashboard,
  FileText,
  Sliders,
  Bell,
  Globe,
  Wrench,
  Link as LinkIcon,
  Ban,
  Tag,
  Settings,
  Menu,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Layers,
  Lock,
  Database,
  Activity,
  Zap,
  Key,
  ChevronDown,
  User,
  LogOut,
  BellOff,
  Check,
  ArrowRight,
  RotateCw
} from 'lucide-react';
import useBulkFleet from '../pages/bulk/useBulkFleet';
import api from '../api/api';

const pageConfig = {
  '/user/dashboard': { name: 'Dashboard', icon: LayoutDashboard },
  '/user/logs': { name: 'Attack Logs', icon: FileText },
  '/user/notices': { name: 'Notice Board', icon: Bell },
  '/user/websites': { name: 'My Websites', icon: Globe },
  '/user/security/threat-intelligence': { name: 'Threat Intelligence & WHOIS', icon: ShieldCheck },
  '/user/security/port-scanner': { name: 'Security & Port Scanner', icon: Wrench },
  '/user/security/bot-shield': { name: 'Visitor Bot Shield', icon: Shield },
  '/user/security/bot-defense': { name: 'Visitor Bot Shield', icon: Shield },
  '/user/security/login-gateway': { name: 'Login Gateway Security', icon: Key },
  '/user/security/rate-limits': { name: 'Rate Limiting & Thresholds', icon: Sliders },
  '/user/security/2fa': { name: 'Two-Factor Auth (2FA)', icon: Key },
  '/user/security/post-hack': { name: 'Incident Response & Post-Hack', icon: ShieldAlert },
  '/user/security/incident-response': { name: 'Incident Response & Post-Hack', icon: ShieldAlert },
  '/user/security/breach-intelligence': { name: 'Breach Intelligence & HIBP', icon: ShieldCheck },
  '/user/security/hibp': { name: 'Breach Intelligence & HIBP', icon: ShieldCheck },
  '/user/tools': { name: 'Security Tools', icon: Wrench },
  '/user/blacklist': { name: 'IP Blacklist', icon: Ban },
  '/user/access/ip-blocklist': { name: 'IP Blacklist', icon: Ban },
  '/user/access/ip-allowlist': { name: 'IP Whitelist', icon: ShieldCheck },
  '/user/access/country-blocking': { name: 'Geo Blocking', icon: Globe },
  '/user/pricing': { name: 'Pricing & Plans', icon: Tag },
  '/user/settings': { name: 'Settings', icon: Settings },
  '/user/support': { name: 'Support Tickets', icon: FileText },
  '/user/team': { name: 'Team & Access', icon: User },
  '/user/alerts': { name: 'Security Alerts', icon: Bell },
  '/user/reports': { name: 'Security Reports', icon: FileText },
  '/user/bulk/scanner': { name: 'Malware Scanner', icon: ShieldAlert },
  '/user/bulk/plugins': { name: 'Plugins Manager', icon: Layers },
  '/user/bulk/themes': { name: 'Themes Manager', icon: Layers },
  '/user/bulk/core': { name: 'WordPress Core Integrity', icon: Globe },
  '/user/bulk/database': { name: 'Database Hygiene', icon: Database },
  '/user/bulk/safe-updates': { name: 'Safe Updates Engine', icon: ShieldCheck },
  '/user/bulk/hardening': { name: 'Security Hardening', icon: Lock },
  '/user/bulk/backups': { name: 'Cloud Backups', icon: Database },
  '/user/bulk/backup': { name: 'Cloud Backups', icon: Database },
  '/user/backups': { name: 'Cloud Backups', icon: Database },
  '/user/backup': { name: 'Cloud Backups', icon: Database },
  '/user/bulk/monitoring': { name: 'Fleet Monitoring', icon: Activity },
  '/user/bulk/uptime': { name: 'Uptime Sentinel', icon: Activity },
  '/user/bulk/performance': { name: 'Performance Analytics', icon: Zap },
  '/user/monitoring/performance': { name: 'Performance Analytics', icon: Zap },
  '/user/monitoring/uptime': { name: 'Uptime Sentinel', icon: Activity },
  '/user/monitoring/broken-links': { name: 'Broken Links Audit', icon: LinkIcon },
  '/user/monitoring/blacklist': { name: 'Blacklist Monitoring', icon: Ban },
  '/user/bulk/broken-links': { name: 'Broken Links Audit', icon: LinkIcon },
  '/user/bulk/activity': { name: 'Fleet Activity Log', icon: FileText }
};

export default function UserHeader({ onToggleSidebar, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_workspace_owner') || '') : ''));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [headerNotifs, setHeaderNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const headerProfile = userStore.get('profile')?.user || userStore.get('profile') || {};
  const storedName = localStorage.getItem('mdefender_user_name') || 'User';
  const isTeamSession = Boolean(headerProfile?.team_member_context);
  const teamRoleLabel = (headerProfile?.team_role || 'team').toUpperCase();
  const userName = headerProfile?.actor_name || storedName;
  const location = useLocation();

  const fetchHeaderNotifs = async () => {
    try {
      const res = await api.getNotifications({ limit: 8 });
      const payload = res?.data || res;
      if (payload && Array.isArray(payload.notifications)) {
        setHeaderNotifs(payload.notifications);
        setUnreadCount(Number(payload.unread || 0));
      }
    } catch {
      // Ignore transient network errors on background poll
    }
  };

  useEffect(() => {
    api.getTeamWorkspaces()
      .then((res) => {
        const list = res?.data?.workspaces || [];
        const savedOwner = typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_workspace_owner') : '';
        const teamWs = list.find(w => !w.is_own);
        const rawProf = userStore.get('profile');
        const prof = rawProf?.user || rawProf || {};
        const isPureTeammate = Boolean(teamWs && (prof?.team_member_context || (Number(prof?.websites_count || 0) === 0 && !prof?.is_paid)));
        setWorkspaces(isPureTeammate ? list.filter(w => !w.is_own) : list);
        if (!savedOwner && teamWs && Number(prof?.websites_count || 0) === 0 && !prof?.is_paid) {
          localStorage.setItem('mdefender_workspace_owner', teamWs.owner_id);
          userStore.clear();
          window.location.reload();
        }
      })
      .catch(() => {});
  }, []);

  const handleSwitchWorkspace = (ws) => {
    if (ws.is_own) {
      localStorage.removeItem('mdefender_workspace_owner');
    } else {
      localStorage.setItem('mdefender_workspace_owner', ws.owner_id);
    }
    userStore.clear();
    setShowWorkspaceMenu(false);
    window.location.reload();
  };

  const currentWorkspace = useMemo(() => {
    if (!workspaces.length) return null;
    if (!activeWorkspaceId) return workspaces.find(w => w.is_own) || workspaces[0];
    return workspaces.find(w => w.owner_id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    fetchHeaderNotifs();
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchHeaderNotifs();
      }
    }, 30000);
    const onNotifSync = () => fetchHeaderNotifs();
    window.addEventListener('mdf_notifications_updated', onNotifSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('mdf_notifications_updated', onNotifSync);
    };
  }, []);

  const handleMarkOneRead = async (notif) => {
    if (!notif || notif.read) return;
    setHeaderNotifs(prev => prev.map(n => (n.id === notif.id ? { ...n, read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.markNotificationRead(notif.id);
      window.dispatchEvent(new Event('mdf_notifications_updated'));
    } catch { }
  };

  const handleMarkAllHeaderRead = async (e) => {
    e.stopPropagation();
    setHeaderNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.markAllNotificationsRead();
      window.dispatchEvent(new Event('mdf_notifications_updated'));
    } catch { }
  };

  const { wpWebsites, selectedSiteId } = useBulkFleet();

  const selectSite = (newId) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mdf_bulk_selected_site', newId);
      localStorage.setItem('mdefender_selected_site', newId);
      window.dispatchEvent(new Event('mdf_bulk_domain_changed'));
      window.dispatchEvent(new Event('mdefender_domain_changed'));
    }
    setShowDomainMenu(false);
  };

  const currentPath = location.pathname.replace(/\/$/, '');
  const currentConfig = pageConfig[currentPath] || { name: 'Dashboard', icon: LayoutDashboard };
  const PageIcon = currentConfig.icon;
  const pageName = currentConfig.name;

  const [pricingConfig, setPricingConfig] = useState(getStoredPricingConfig);
  useEffect(() => {
    return subscribePricing((cfg) => {
      if (cfg) setPricingConfig(cfg);
    });
  }, []);

  const rawProfile = typeof window !== 'undefined' ? (userStore.get('profile') || {}) : {};
  const cachedProfile = rawProfile?.user || rawProfile || {};
  const _allowTestOverride = import.meta.env.DEV || Boolean(cachedProfile?.is_admin || cachedProfile?.role === 'super_admin');
  const urlParams = (_allowTestOverride && typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : null;
  const testTrialParam = urlParams ? urlParams.get('test_trial_days') : null;
  const testProParam = urlParams ? urlParams.get('test_pro') : null;
  const storedPlan = typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || '') : '';
  const storedIsPaid = typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_is_paid') === 'true') : false;
  const activePlan = (testProParam === 'true' ? 'pro' : (cachedProfile?.plan || cachedProfile?.effective_plan || storedPlan || 'free')).toLowerCase();
  const isPro = Boolean(
    testProParam === 'true' ||
    cachedProfile?.is_admin ||
    cachedProfile?.role === 'super_admin' ||
    cachedProfile?.is_paid ||
    storedIsPaid ||
    ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(activePlan)
  );

  const configuredTrialDays = Number(pricingConfig?.trial_days) || 14;

  const trialDays = useMemo(() => {
    if (testTrialParam !== null) return Math.max(0, Number(testTrialParam));
    if (typeof localStorage === 'undefined') return configuredTrialDays;

    const trialEndsAt = cachedProfile?.trial_ends_at || localStorage.getItem('mdefender_trial_ends_at');
    if (trialEndsAt) {
      const endsDt = new Date(trialEndsAt);
      if (!isNaN(endsDt.getTime())) {
        return Math.max(0, Math.ceil((endsDt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      }
    }

    if (cachedProfile?.trial_days_remaining !== undefined && cachedProfile?.trial_days_remaining !== null) {
      return Math.max(0, Number(cachedProfile.trial_days_remaining));
    }

    const createdAt = cachedProfile?.created_at || localStorage.getItem('mdefender_user_created_at');
    let elapsedDays = null;
    if (createdAt) {
      const createdDt = new Date(createdAt);
      if (!isNaN(createdDt.getTime())) {
        elapsedDays = Math.floor((Date.now() - createdDt.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (elapsedDays !== null) {
      return Math.max(0, configuredTrialDays - elapsedDays);
    }

    const storedTrial = localStorage.getItem('mdefender_trial_days');
    if (storedTrial !== null && storedTrial !== undefined && storedTrial !== '') {
      return Math.max(0, Number(storedTrial));
    }

    return configuredTrialDays;
  }, [testTrialParam, configuredTrialDays, cachedProfile]);

  const planLabel = isPro ? 'Pro Plan' : 'Free Plan';

  // Active domain display label (exact format matching user request)
  const activeDomainObj = selectedSiteId !== 'all'
    ? wpWebsites.find(w => (w.id === selectedSiteId || w._id === selectedSiteId))
    : null;

  const displayDomainLabel = activeDomainObj
    ? (activeDomainObj.domain || activeDomainObj.name || activeDomainObj.url || 'Selected Site')
    : (wpWebsites.length > 0 ? `Global Fleet (${wpWebsites.length} Sites)` : 'No Connected Sites');

  const handleRequestLogout = () => {
    setShowDropdown(false);
    setShowLogoutConfirm(true);
  };

  const handlePerformLogout = async () => {
    setIsSigningOut(true);
    await new Promise(r => setTimeout(r, 450));
    if (onLogout) {
      onLogout();
    }
  };

  useEffect(() => {
    window.__doLogout = handleRequestLogout;
    return () => { delete window.__doLogout; };
  }, [onLogout]);

  useEffect(() => {
    const close = () => {
      setShowDropdown(false);
      setShowNotifications(false);
      setShowDomainMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button type="button" className="menu-toggle" id="menuToggle" onClick={onToggleSidebar} aria-label="Toggle Navigation" style={{ cursor: 'pointer' }}>
          <Menu size={20} />
        </button>
        <div className="header-title-group">
          <div className="header-page-icon" style={{ background: '#FEF3EB', color: '#E8792F', border: '1px solid #FCD8BF' }}>
            <PageIcon size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1>{pageName}</h1>
            <div className="breadcrumb">
              <Link to="/" style={{ color: '#87948D', textDecoration: 'none' }} title="Visit Public Homepage">MDefender</Link> / <span>{pageName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="header-right" style={{ gap: '12px' }}>
        {/* Workspace Switcher (shown when user has access to >1 workspace or is in a team workspace) */}
        {workspaces.length > 1 && currentWorkspace && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowWorkspaceMenu(!showWorkspaceMenu);
                setShowDomainMenu(false);
                setShowDropdown(false);
                setShowNotifications(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: currentWorkspace.is_own ? '#FFFFFF' : '#F0FDF4',
                border: currentWorkspace.is_own ? '1px solid #D9E1DC' : '1px solid #86EFAC',
                borderRadius: '8px',
                padding: '6px 11px',
                cursor: 'pointer',
                maxWidth: '190px'
              }}
              title="Switch active workspace"
            >
              <Layers size={14} color={currentWorkspace.is_own ? '#10201E' : '#15803D'} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#10201E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentWorkspace.workspace_name}
              </span>
              {!currentWorkspace.is_own && (
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#15803D', textTransform: 'uppercase' }}>
                  {currentWorkspace.role_id}
                </span>
              )}
              <ChevronDown size={13} color="#60716B" style={{ flexShrink: 0 }} />
            </button>

            {showWorkspaceMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: '250px',
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #D9E1DC',
                  boxShadow: '0 8px 24px rgba(11, 37, 34, 0.12)',
                  zIndex: 1055,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Switch Workspace
                </div>
                {workspaces.map((ws) => {
                  const isActive = currentWorkspace.owner_id === ws.owner_id;
                  return (
                    <button
                      key={ws.owner_id}
                      type="button"
                      onClick={() => handleSwitchWorkspace(ws)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? '#E8F3EC' : 'transparent',
                        color: isActive ? '#15803D' : '#10201E',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ws.workspace_name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#60716B', fontWeight: '600' }}>
                          {ws.is_own ? 'Owner' : `${ws.role_id.toUpperCase()} • ${ws.scope}`}
                        </div>
                      </div>
                      {isActive && <Check size={14} color="#15803D" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sleek Enterprise Domain Scope Selector Pill (Matching media_1794253816956_bc218db4.png) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-domain-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDomainMenu(!showDomainMenu);
              setShowDropdown(false);
              setShowNotifications(false);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
              outline: 'none',
              maxWidth: '180px'
            }}
            aria-expanded={showDomainMenu}
            aria-haspopup="true"
            title="Filter and synchronize WordPress domain telemetry"
          >
            <Globe size={15} color="#10201E" strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <span className="header-domain-text" style={{ fontSize: '13px', fontWeight: '700', color: '#10201E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayDomainLabel}
            </span>
            <ChevronDown
              size={14}
              color="#10201E"
              strokeWidth={2.4}
              style={{
                transform: showDomainMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }}
            />
          </button>

          {showDomainMenu && (
            <div
              className="header-domain-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: '240px',
                maxWidth: 'calc(100vw - 24px)',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 8px 24px rgba(11, 37, 34, 0.12)',
                zIndex: 1050,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Select Domain Scope
              </div>

              {/* Global Fleet Option */}
              <button
                type="button"
                onClick={() => selectSite('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedSiteId === 'all' ? '#E8F3EC' : 'transparent',
                  color: selectedSiteId === 'all' ? '#2A8B68' : '#10201E',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s ease'
                }}
                onMouseEnter={(e) => { if (selectedSiteId !== 'all') e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { if (selectedSiteId !== 'all') e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={14} color={selectedSiteId === 'all' ? '#2A8B68' : '#60716B'} />
                  <span>Global Fleet ({wpWebsites.length} Sites)</span>
                </div>
                {selectedSiteId === 'all' && <Check size={14} color="#2A8B68" strokeWidth={2.6} />}
              </button>

              {wpWebsites.length > 0 && <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }} />}

              {/* Individual Connected Sites */}
              {wpWebsites.map(w => {
                const sId = w.id || w._id;
                const isSelected = selectedSiteId === sId;
                const domainLabel = w.domain || w.name || w.url || sId;
                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => selectSite(sId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSelected ? '#E8F3EC' : 'transparent',
                      color: isSelected ? '#2A8B68' : '#10201E',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? '700' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10B981',
                        flexShrink: 0
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {domainLabel}
                      </span>
                    </div>
                    {isSelected && <Check size={14} color="#2A8B68" strokeWidth={2.6} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Security Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              const nextOpen = !showNotifications;
              setShowNotifications(nextOpen);
              setShowDropdown(false);
              setShowDomainMenu(false);
              if (nextOpen) fetchHeaderNotifs();
            }}
            aria-label="View notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #FFFFFF',
                  lineHeight: 1
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div
            className={`notification-panel ${showNotifications ? 'show' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '340px', maxWidth: 'calc(100vw - 24px)', right: 0 }}
          >
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#0F172A' }}>Security Alerts</span>
                <span className="panel-count">{unreadCount} new</span>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllHeaderRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2A8B68',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {headerNotifs.length === 0 ? (
              <div style={{ padding: '22px 16px', textAlign: 'center', color: '#87948D', fontSize: '12.5px' }}>
                <BellOff size={20} style={{ display: 'block', margin: '0 auto 6px', color: '#CBD8CF' }} />
                <span>All fleet events operational</span>
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {headerNotifs.map((item) => {
                  const sev = (item.severity || 'info').toLowerCase();
                  const dotColor = sev === 'critical' ? '#DC2626' : (sev === 'warning' || sev === 'high' ? '#D97706' : '#059669');
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkOneRead(item)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #F1F5F9',
                        background: item.read ? '#FFFFFF' : '#F8FAFC',
                        cursor: item.read ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '9px'
                      }}
                    >
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: dotColor,
                        marginTop: '5px',
                        flexShrink: 0
                      }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: item.read ? 600 : 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </span>
                          {!item.read && (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2A8B68', flexShrink: 0 }} />
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.message}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ padding: '8px 14px', borderTop: '1px solid #E2E8F0', background: '#FAFBF9', textAlign: 'center' }}>
              <Link
                to="/user/alerts"
                onClick={() => setShowNotifications(false)}
                style={{ fontSize: '11.5px', fontWeight: 700, color: '#0B2522', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <span>Manage Alerts &amp; Channels</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Modern 14-Day Free Trial Countdown (Hidden permanently when PRO or Team Session) */}
        {!isPro && !isTeamSession && (
          <div className="header-trial-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: trialDays <= 4 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            border: trialDays <= 4 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: trialDays <= 4 ? '#DC2626' : '#059669',
            whiteSpace: 'nowrap'
          }}>
            <span className="header-trial-text">⏳ {trialDays > 0 ? `${trialDays} Days` : '0 Days'}</span>
            <Link
              to="/user/pricing"
              style={{
                background: 'linear-gradient(135deg, #0B2522, #1A4D45)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10.5px',
                textDecoration: 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Zap size={10} color="#FCD34D" fill="#FCD34D" />
              <span>Upgrade</span>
            </Link>
          </div>
        )}

        {/* Minimalist Professional Outline User Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
              setShowNotifications(false);
              setShowDomainMenu(false);
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: showDropdown ? '#E2E8F0' : '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0F172A',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.15s ease',
              outline: 'none',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!showDropdown) e.currentTarget.style.background = '#E2E8F0';
            }}
            onMouseLeave={(e) => {
              if (!showDropdown) e.currentTarget.style.background = '#F8FAFC';
            }}
            aria-label="User Account Menu"
            title="Account Profile & Settings"
          >
            <User size={18} strokeWidth={2} color="#0F172A" />
          </button>

          <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`} style={{ right: 0, maxWidth: 'calc(100vw - 24px)' }}>
            <div style={{ padding: '10px 14px 11px', borderBottom: '1px solid #E2E8F0', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0F172A' }}>{userName}</div>
                {isPro && (
                  <span style={{
                    background: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '1.5px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}>
                    PRO
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                {isTeamSession ? `${teamRoleLabel} • ${isPro ? 'Pro Workspace' : 'Team Workspace'}` : planLabel}
              </div>
            </div>
            <Link to="/" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={14} />
              <span>Website Homepage</span>
            </Link>
            <Link to="/user/settings?tab=profile" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} />
              <span>Account Profile</span>
            </Link>
            <Link to="/user/settings?tab=mfa" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={14} />
              <span>Security Settings</span>
            </Link>
            <div className="divider"></div>
            <button onClick={handleRequestLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Sign Out Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', animation: 'mdfFadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '16px', maxWidth: '420px', width: '100%',
              padding: '28px 24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)',
              border: '1px solid #E2E8F0', textAlign: 'center'
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: '#FEE2E2', color: '#DC2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
              Sign out of MDefender Pro?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              Your current security session and local tokens will be safely cleared.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', background: '#FFFFFF',
                  color: '#475569', fontSize: '14px', fontWeight: '600',
                  cursor: isSigningOut ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handlePerformLogout}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: '10px',
                  border: 'none', background: '#DC2626',
                  color: '#FFFFFF', fontSize: '14px', fontWeight: '600',
                  cursor: isSigningOut ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {isSigningOut ? (
                  <>
                    <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
