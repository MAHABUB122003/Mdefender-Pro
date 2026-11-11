import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
  ArrowRight
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
  '/user/connect': { name: 'Connect Website', icon: LinkIcon },
  '/user/blacklist': { name: 'IP Blacklist', icon: Ban },
  '/user/access/ip-blocklist': { name: 'IP Blacklist', icon: Ban },
  '/user/access/ip-allowlist': { name: 'IP Whitelist', icon: ShieldCheck },
  '/user/access/country-blocking': { name: 'Geo Blocking', icon: Globe },
  '/user/pricing': { name: 'Pricing & Plans', icon: Tag },
  '/user/settings': { name: 'Settings', icon: Settings },
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
  '/user/bulk/site-health': { name: 'Site Health Telemetry', icon: ShieldCheck },
  '/user/bulk/activity': { name: 'Fleet Activity Log', icon: FileText }
};

export default function UserHeader({ onToggleSidebar, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [headerNotifs, setHeaderNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const storedName = localStorage.getItem('mdefender_user_name') || 'User';
  const userName = storedName;
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
    } catch {}
  };

  const handleMarkAllHeaderRead = async (e) => {
    e.stopPropagation();
    setHeaderNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.markAllNotificationsRead();
      window.dispatchEvent(new Event('mdf_notifications_updated'));
    } catch {}
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

  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase();
  const planLabel = {
    free: 'Free Plan',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise',
    ultra: 'Ultra Enterprise',
    premium: 'Enterprise Pro'
  }[userPlan] || 'Enterprise Pro';

  // Active domain display label (exact format matching user request)
  const activeDomainObj = selectedSiteId !== 'all'
    ? wpWebsites.find(w => (w.id === selectedSiteId || w._id === selectedSiteId))
    : null;

  const displayDomainLabel = activeDomainObj
    ? (activeDomainObj.domain || activeDomainObj.name || activeDomainObj.url || 'Selected Site')
    : (wpWebsites.length > 0 ? `Global Fleet (${wpWebsites.length} Sites)` : 'No Connected Sites');

  useEffect(() => {
    window.__doLogout = onLogout;
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
        <button type="button" className="menu-toggle" id="menuToggle" onClick={onToggleSidebar} aria-label="Toggle Navigation" style={{ cursor: 'pointer', padding: '6px' }}>
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
        {/* Sleek Enterprise Domain Scope Selector Pill (Matching media_1794253816956_bc218db4.png) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
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
              padding: '6px 14px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            aria-expanded={showDomainMenu}
            aria-haspopup="true"
            title="Filter and synchronize WordPress domain telemetry"
          >
            <Globe size={15} color="#10201E" strokeWidth={2.2} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E', whiteSpace: 'nowrap' }}>
              {displayDomainLabel}
            </span>
            <ChevronDown
              size={14}
              color="#10201E"
              strokeWidth={2.4}
              style={{
                transform: showDomainMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>

          {showDomainMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: '240px',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 8px 24px rgba(11, 37, 34, 0.12)',
                zIndex: 1000,
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
            style={{ width: '340px', maxWidth: '92vw' }}
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

        {/* Professional User Icon Button (Matching media_1794253835890_f0f46d0d.png - No Username String) */}
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
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#0B2522',
              border: '1px solid #164E48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              color: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(11, 37, 34, 0.15)',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            aria-label="User Account Menu"
            title="Account Profile & Settings"
          >
            <User size={16} strokeWidth={2.3} color="#FFFFFF" />
          </button>

          <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`} style={{ right: 0 }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #E2E8F0', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>{userName}</div>
              <div style={{ fontSize: '11px', color: '#87948D', textTransform: 'capitalize' }}>{planLabel}</div>
            </div>
            <Link to="/" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={14} />
              <span>Website Homepage</span>
            </Link>
            <Link to="/user/settings" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} />
              <span>Account Profile</span>
            </Link>
            <Link to="/user/settings" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={14} />
              <span>Security Settings</span>
            </Link>
            <div className="divider"></div>
            <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
