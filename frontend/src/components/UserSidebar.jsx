import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  HeartPulse,
  Activity,
  Globe,
  ShieldCheck,
  Wrench,
  Bug,
  Shield,
  HardDrive,
  Layers,
  Cpu,
  Boxes,
  Palette,
  Sparkles,
  Users,
  Bell,
  Tag,
  Settings,
  LogOut
} from 'lucide-react'
import userStore from '../utils/userStore'

export default function UserSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [selectedDomain, setSelectedDomain] = useState(() => {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('mdf_bulk_selected_site') || 'all') : 'all'
  })

  // Synchronize domain selector state with BulkHeader across pages
  useEffect(() => {
    const handleDomainSync = () => {
      setSelectedDomain(localStorage.getItem('mdf_bulk_selected_site') || 'all')
    }
    window.addEventListener('mdf_bulk_domain_changed', handleDomainSync)
    return () => window.removeEventListener('mdf_bulk_domain_changed', handleDomainSync)
  }, [])

  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase()
  const isPaid = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)
  const isCustomRulesAllowed = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)

  const planName = {
    free: 'Starter Free',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise'
  }[userPlan] || (isPaid ? 'Premium Plan' : 'Starter Free')

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  const prefetch = (page) => {
    try {
      if (page === 'dashboard') import('../pages/UserDashboard')
      else if (page === 'logs') import('../pages/UserLogs')
      else if (page === 'rules') import('../pages/UserRules')
      else if (page === 'pricing') import('../pages/UserPricing')
      else if (page === 'blacklist') import('../pages/UserBlacklist')
      else if (page === 'domains') import('../pages/UserDomains')
      else if (page === 'websites') import('../pages/UserWebsites')
      else if (page === 'team') import('../pages/UserTeam')
      else if (page === 'alerts') import('../pages/UserAlerts')
      else if (page === 'tools') import('../pages/UserTools')
      else if (page === 'settings') import('../pages/UserSettings')
      else if (page === 'scanner') import('../pages/bulk/BulkScanner')
      else if (page === 'backup') import('../pages/bulk/BulkBackup')
      else if (page === 'plugins') import('../pages/bulk/BulkPlugins')
      else if (page === 'themes') import('../pages/bulk/BulkThemes')
      else if (page === 'hardening') import('../pages/bulk/BulkHardening')
      else if (page === 'health') import('../pages/bulk/BulkSiteHealth')
      else if (page === 'activity') import('../pages/bulk/BulkActivity')
      else if (page === 'core') import('../pages/bulk/BulkCore')
    } catch {}
  }

  const getNavLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 14px',
    borderRadius: '9px',
    marginBottom: '2px',
    textDecoration: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '13.5px',
    transition: 'all 0.15s ease',
    ...(isActive
      ? { background: 'rgba(232, 121, 47, 0.14)', color: '#F38A3E', fontWeight: 600 }
      : { color: '#94a3b8' })
  })

  const getCategoryHeaderStyle = (isFirst = false) => ({
    color: '#6A7D78',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginTop: isFirst ? '2px' : '18px',
    marginBottom: '6px',
    paddingLeft: '14px',
    userSelect: 'none'
  })

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar" style={{ background: '#0c1615', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* ========================================================================= */}
        {/* BRAND LOGO HEADER                                                         */}
        {/* ========================================================================= */}
        <div className="sidebar-brand" style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link
            to="/"
            title="Return to Website Homepage"
            className="logo"
            onClick={handleLinkClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div className="logo-icon" style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="logo-text">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>MDefender</h2>
              <span style={{ fontSize: '10.5px', color: '#E8792F', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase' }}>Enterprise WAF</span>
            </div>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION LIST (ORGANIZED BY ENTERPRISE CATEGORIES)                     */}
        {/* ========================================================================= */}
        <nav className="sidebar-nav" style={{ padding: '14px 12px 20px', overflowY: 'auto' }}>
          
          {/* 1. OVERVIEW & MONITORING */}
          <div style={getCategoryHeaderStyle(true)}>Overview &amp; Monitoring</div>
          <NavLink to="/user/dashboard" onClick={handleLinkClick} onMouseEnter={() => prefetch('dashboard')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <LayoutDashboard size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Dashboard</span>
          </NavLink>
          <NavLink to="/user/logs" onClick={handleLinkClick} onMouseEnter={() => prefetch('logs')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <FileText size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Live Traffic Logs</span>
          </NavLink>
          <NavLink to="/user/bulk/site-health" onClick={handleLinkClick} onMouseEnter={() => prefetch('health')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <HeartPulse size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Site Health &amp; Uptime</span>
          </NavLink>
          <NavLink to="/user/bulk/activity" onClick={handleLinkClick} onMouseEnter={() => prefetch('activity')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Activity size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Activity Audit Log</span>
          </NavLink>

          {/* 2. WAF & THREAT DEFENSE */}
          <div style={getCategoryHeaderStyle()}>WAF &amp; Threat Defense</div>
          <NavLink to="/user/blacklist" onClick={handleLinkClick} onMouseEnter={() => prefetch('blacklist')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Globe size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Access Control &amp; Geo</span>
          </NavLink>
          <NavLink to="/user/rules" onClick={handleLinkClick} onMouseEnter={() => prefetch('rules')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <ShieldCheck size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Firewall Rules</span>
            {!isCustomRulesAllowed && (
              <span className="pro-badge" style={{ background: '#E8792F', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto', pointerEvents: 'none' }}>
                CORE
              </span>
            )}
          </NavLink>
          <NavLink to="/user/bulk/tools" onClick={handleLinkClick} onMouseEnter={() => prefetch('tools')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Wrench size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Rate Limit &amp; Tools</span>
          </NavLink>

          {/* 3. SECURITY & RECOVERY */}
          <div style={getCategoryHeaderStyle()}>Security &amp; Recovery</div>
          <NavLink to="/user/bulk/scanner" onClick={handleLinkClick} onMouseEnter={() => prefetch('scanner')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Bug size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Malware Scanner</span>
          </NavLink>
          <NavLink to="/user/bulk/hardening" onClick={handleLinkClick} onMouseEnter={() => prefetch('hardening')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Shield size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Security Hardening</span>
          </NavLink>
          <NavLink to="/user/bulk/backup" onClick={handleLinkClick} onMouseEnter={() => prefetch('backup')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <HardDrive size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Backup &amp; Disaster Rec.</span>
          </NavLink>

          {/* 4. FLEET ASSET MANAGEMENT */}
          <div style={getCategoryHeaderStyle()}>Fleet Asset Management</div>
          <NavLink to="/user/websites" onClick={handleLinkClick} onMouseEnter={() => prefetch('websites')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Layers size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>WordPress Sites</span>
          </NavLink>
          <NavLink to="/user/domains" onClick={handleLinkClick} onMouseEnter={() => prefetch('domains')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Cpu size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Custom Domains</span>
          </NavLink>
          <NavLink to="/user/bulk/plugins" onClick={handleLinkClick} onMouseEnter={() => prefetch('plugins')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Boxes size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Plugins Management</span>
          </NavLink>
          <NavLink to="/user/bulk/themes" onClick={handleLinkClick} onMouseEnter={() => prefetch('themes')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Palette size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Themes Management</span>
          </NavLink>
          <NavLink to="/user/bulk/core" onClick={handleLinkClick} onMouseEnter={() => prefetch('core')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Sparkles size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Core &amp; Safe Updates</span>
          </NavLink>

          {/* 5. WORKSPACE & SETTINGS */}
          <div style={getCategoryHeaderStyle()}>Workspace &amp; Settings</div>
          <NavLink to="/user/team" onClick={handleLinkClick} onMouseEnter={() => prefetch('team')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Users size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Team Members</span>
          </NavLink>
          <NavLink to="/user/alerts" onClick={handleLinkClick} onMouseEnter={() => prefetch('alerts')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Bell size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Alerts &amp; Notifications</span>
          </NavLink>
          <NavLink to="/user/pricing" onClick={handleLinkClick} onMouseEnter={() => prefetch('pricing')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Tag size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Pricing &amp; Plans</span>
          </NavLink>
          <NavLink to="/user/settings" onClick={handleLinkClick} onMouseEnter={() => prefetch('settings')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Settings size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Settings</span>
          </NavLink>
        </nav>

        {/* ========================================================================= */}
        {/* FOOTER (STATUS & LOGOUT)                                                  */}
        {/* ========================================================================= */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 14px' }}>
          <div className="sidebar-status" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className={`status-dot ${isPaid ? 'online' : ''}`} style={!isPaid ? { background: '#F59E0B' } : { background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#889895', fontWeight: 500, lineHeight: 1.1 }}>Active Tier</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planName}</span>
            </div>
            {isPaid && <Sparkles size={14} color="#E8792F" />}
          </div>
          <button
            className="logout-btn"
            onClick={() => window.__doLogout && window.__doLogout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'rgba(220, 38, 38, 0.1)',
              color: '#F87171',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12.5px',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
