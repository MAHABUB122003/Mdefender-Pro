import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Link2,
  Tag,
  Ban,
  Globe,
  Layers,
  Boxes,
  Users,
  Bell,
  ChevronDown,
  Wrench,
  Settings,
  LogOut,
  Sparkles,
  Activity,
  Sliders,
  Palette,
  Cpu,
  HardDrive,
  Bug,
  Shield,
  HeartPulse
} from 'lucide-react'
import userStore from '../utils/userStore'

export default function UserSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isBulkActive = location.pathname.startsWith('/user/bulk') || location.pathname === '/user/tools'

  // Auto-expand if currently on a bulk route, otherwise default to open for clear discovery
  const [bulkExpanded, setBulkExpanded] = useState(() => true)

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

  const handleDomainChange = (e) => {
    const val = e.target.value
    setSelectedDomain(val)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mdf_bulk_selected_site', val)
      window.dispatchEvent(new Event('mdf_bulk_domain_changed'))
    }
  }

  // Get connected sites list
  const cachedDashboard = userStore.get('dashboard') || userStore.get('websites')
  const siteList = cachedDashboard?.websites || [
    { id: 'site-1', domain: 'mahabub.shop' }
  ]

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

  const toggleBulkDropdown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setBulkExpanded(prev => !prev)
  }

  const prefetch = (page) => {
    try {
      if (page === 'dashboard') import('../pages/UserDashboard')
      else if (page === 'logs') import('../pages/UserLogs')
      else if (page === 'rules') import('../pages/UserRules')
      else if (page === 'connect') import('../pages/UserConnect')
      else if (page === 'pricing') import('../pages/UserPricing')
      else if (page === 'blacklist') import('../pages/UserBlacklist')
      else if (page === 'domains') import('../pages/UserDomains')
      else if (page === 'websites') import('../pages/UserWebsites')
      else if (page === 'team') import('../pages/UserTeam')
      else if (page === 'alerts') import('../pages/UserAlerts')
      else if (page === 'tools') import('../pages/UserTools')
      else if (page === 'settings') import('../pages/UserSettings')
    } catch {}
  }

  const getNavLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '9px',
    marginBottom: '2px',
    textDecoration: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
    ...(isActive
      ? { background: 'rgba(232, 121, 47, 0.14)', color: '#F38A3E', fontWeight: 600 }
      : { color: '#94a3b8' })
  })

  const getSubNavLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 12px 7px 22px',
    borderRadius: '7px',
    marginBottom: '2px',
    textDecoration: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '12.5px',
    fontWeight: isActive ? 700 : 500,
    transition: 'all 0.15s ease',
    ...(isActive
      ? { background: 'rgba(232, 121, 47, 0.15)', color: '#F38A3E' }
      : { color: '#889895' })
  })

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar" style={{ background: '#0c1615', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
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

        <nav className="sidebar-nav" style={{ padding: '16px 12px' }}>
          <div className="nav-label" style={{ color: '#6A7D78', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>Security Ops</div>
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
            <span style={{ pointerEvents: 'none' }}>Logs</span>
          </NavLink>
          <NavLink to="/user/rules" onClick={handleLinkClick} onMouseEnter={() => prefetch('rules')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <ShieldCheck size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Rules</span>
            {!isCustomRulesAllowed && (
              <span className="pro-badge" style={{ background: '#E8792F', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto', pointerEvents: 'none' }}>
                CORE
              </span>
            )}
          </NavLink>

          <div className="nav-label" style={{ color: '#6A7D78', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', marginTop: '16px' }}>Edge &amp; Config</div>
          <NavLink to="/user/connect" onClick={handleLinkClick} onMouseEnter={() => prefetch('connect')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Link2 size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Connect</span>
          </NavLink>
          <NavLink to="/user/pricing" onClick={handleLinkClick} onMouseEnter={() => prefetch('pricing')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Tag size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Pricing &amp; Plans</span>
          </NavLink>
          <NavLink to="/user/blacklist" onClick={handleLinkClick} onMouseEnter={() => prefetch('blacklist')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Ban size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Blacklist &amp; Geo</span>
          </NavLink>
          <NavLink to="/user/domains" onClick={handleLinkClick} onMouseEnter={() => prefetch('domains')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Globe size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Domains</span>
          </NavLink>
          <NavLink to="/user/websites" onClick={handleLinkClick} onMouseEnter={() => prefetch('websites')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Layers size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>WordPress Sites</span>
          </NavLink>

          {/* ========================================================================= */}
          {/* BULK MANAGEMENT ACCORDION WITH DOMAIN SELECTOR & 10 SUB-ACTIONS           */}
          {/* ========================================================================= */}
          <div style={{ marginTop: '4px', marginBottom: '4px' }}>
            <div
              onClick={toggleBulkDropdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '9px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
                background: isBulkActive ? 'rgba(232, 121, 47, 0.12)' : 'transparent',
                color: isBulkActive ? '#F38A3E' : '#94a3b8'
              }}
              onMouseEnter={e => {
                if (!isBulkActive) e.currentTarget.style.color = '#F38A3E'
              }}
              onMouseLeave={e => {
                if (!isBulkActive) e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={17} />
              </span>
              <span style={{ fontWeight: isBulkActive ? 700 : 600 }}>Bulk Management</span>
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6A7D78',
                  transform: bulkExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <ChevronDown size={15} />
              </span>
            </div>

            {/* EXPANDED ACCORDION PANEL */}
            {bulkExpanded && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderLeft: '2px solid rgba(232, 121, 47, 0.4)',
                  borderRadius: '0 8px 8px 0',
                  margin: '4px 0 6px 6px',
                  padding: '6px 4px 6px 2px'
                }}
              >

                {/* 10 Sub-actions */}
                <NavLink to="/user/bulk/monitoring" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Activity size={14} />
                  <span>Monitoring</span>
                </NavLink>

                <NavLink to="/user/bulk/plugins" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Sliders size={14} />
                  <span>Plugins</span>
                </NavLink>

                <NavLink to="/user/bulk/themes" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Palette size={14} />
                  <span>Themes</span>
                </NavLink>

                <NavLink to="/user/bulk/core" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Cpu size={14} />
                  <span>WordPress Core</span>
                </NavLink>

                <NavLink to="/user/bulk/backup" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <HardDrive size={14} />
                  <span>Backup &amp; Restore</span>
                </NavLink>

                <NavLink to="/user/bulk/scanner" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Bug size={14} />
                  <span>Malware Scanner</span>
                </NavLink>

                <NavLink to="/user/bulk/hardening" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Shield size={14} />
                  <span>Hardening</span>
                </NavLink>

                <NavLink to="/user/bulk/safe-updates" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Sparkles size={14} />
                  <span>Safe Updates</span>
                </NavLink>

                <NavLink to="/user/bulk/site-health" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <HeartPulse size={14} />
                  <span>Site Health</span>
                </NavLink>

                <NavLink to="/user/bulk/activity" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <FileText size={14} />
                  <span>Activity History</span>
                </NavLink>

                <NavLink to="/user/bulk/tools" onClick={handleLinkClick} style={getSubNavLinkStyle}>
                  <Wrench size={14} />
                  <span>Security Tools</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/user/team" onClick={handleLinkClick} onMouseEnter={() => prefetch('team')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Users size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Team</span>
          </NavLink>
          <NavLink to="/user/alerts" onClick={handleLinkClick} onMouseEnter={() => prefetch('alerts')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Bell size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Alerts</span>
          </NavLink>
          <NavLink to="/user/settings" onClick={handleLinkClick} onMouseEnter={() => prefetch('settings')} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Settings size={17} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Settings</span>
          </NavLink>
        </nav>

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
