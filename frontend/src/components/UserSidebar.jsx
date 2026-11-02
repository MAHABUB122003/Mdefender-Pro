import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Activity,
  Clock,
  Zap,
  ExternalLink,
  Boxes,
  Palette,
  Sparkles,
  Bug,
  Shield,
  RotateCw,
  Globe,
  Ban,
  ShieldCheck,
  HardDrive,
  Cpu,
  Key,
  Flame,
  Radio,
  Layers,
  Users,
  Bell,
  Tag,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react'
export default function UserSidebar({ isOpen, onClose }) {
  const location = useLocation()

  const userName = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_name') || 'User Profile') : 'User Profile')
  const userEmail = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_email') || '') : '')

  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase()
  const isPaid = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)

  const planName = {
    free: 'Starter Free',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise'
  }[userPlan] || (isPaid ? 'Premium Plan' : 'Starter Free')

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  // Accordion state for dropdown sections
  const [openDropdowns, setOpenDropdowns] = useState(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    return {
      monitoring: path.includes('/monitoring') || path.includes('/site-health'),
      wordpress: path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/safe-updates'),
      accessControl: path.includes('/blacklist'),
      securityProtection: path.includes('/bulk/tools') || (path.includes('/settings') && path.includes('2fa')),
      securityCenter: path.includes('/security') || path.includes('/threat-intel') || path.includes('/port-scanner')
    }
  })

  // Auto-expand parent dropdown when navigating to matching route
  useEffect(() => {
    const path = location.pathname
    if (path.includes('/monitoring') || path.includes('/site-health')) {
      setOpenDropdowns(prev => ({ ...prev, monitoring: true }))
    } else if (path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/safe-updates')) {
      setOpenDropdowns(prev => ({ ...prev, wordpress: true }))
    } else if (path.includes('/blacklist')) {
      setOpenDropdowns(prev => ({ ...prev, accessControl: true }))
    } else if (path.includes('/bulk/tools')) {
      setOpenDropdowns(prev => ({ ...prev, securityProtection: true }))
    } else if (path.includes('/security') || path.includes('/port-scanner') || path.includes('/threat-intelligence')) {
      setOpenDropdowns(prev => ({ ...prev, securityCenter: true }))
    }
  }, [location.pathname])

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
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

  const getSubNavLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 12px',
    borderRadius: '7px',
    textDecoration: 'none',
    fontSize: '12.5px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
    ...(isActive
      ? { background: 'rgba(232, 121, 47, 0.14)', color: '#F38A3E', fontWeight: 600 }
      : { color: '#889895' })
  })

  // Helper component for Collapsible Dropdown
  const DropdownItem = ({ id, label, icon: Icon, activePrefixes = [], children }) => {
    const isExpanded = !!openDropdowns[id]
    const isChildActive = activePrefixes.some(prefix => location.pathname.includes(prefix))

    return (
      <div style={{ marginBottom: '2px' }}>
        <button
          type="button"
          onClick={() => toggleDropdown(id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 14px',
            borderRadius: '9px',
            background: isChildActive ? 'rgba(232, 121, 47, 0.08)' : 'transparent',
            border: 'none',
            color: isChildActive ? '#F38A3E' : '#94a3b8',
            fontSize: '13.5px',
            fontWeight: isChildActive ? 600 : 500,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            userSelect: 'none'
          }}
          onMouseEnter={e => {
            if (!isChildActive) e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={e => {
            if (!isChildActive) e.currentTarget.style.color = '#94a3b8'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} />
            </span>
            <span>{label}</span>
          </div>
          <ChevronDown
            size={14}
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              color: isChildActive ? '#F38A3E' : '#6A7D78'
            }}
          />
        </button>

        {isExpanded && (
          <div style={{
            paddingLeft: '14px',
            marginTop: '2px',
            marginBottom: '4px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            marginLeft: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {children}
          </div>
        )}
      </div>
    )
  }

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
        {/* NAVIGATION LIST (PRECISE 15-SECTION ARCHITECTURE)                         */}
        {/* ========================================================================= */}
        <nav className="sidebar-nav" style={{ padding: '14px 12px 20px', overflowY: 'auto' }}>
          
          {/* 1. Dashboard */}
          <NavLink to="/user/dashboard" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={17} />
            </span>
            <span>Dashboard</span>
          </NavLink>

          {/* 2. Live Traffic */}
          <NavLink to="/user/logs" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} />
            </span>
            <span>Live Traffic</span>
          </NavLink>

          {/* 3. Monitoring > (Dropdown) */}
          <DropdownItem
            id="monitoring"
            label="Monitoring"
            icon={Activity}
            activePrefixes={['/monitoring', '/bulk/site-health', '/bulk/monitoring']}
          >
            <NavLink to="/user/monitoring/uptime" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Clock size={14} />
              <span>Uptime</span>
            </NavLink>
            <NavLink to="/user/monitoring/performance" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Zap size={14} />
              <span>Performance</span>
            </NavLink>
            <NavLink to="/user/monitoring/broken-links" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <ExternalLink size={14} />
              <span>Broken Links</span>
            </NavLink>
          </DropdownItem>

          {/* 4. WordPress Management > (Dropdown) */}
          <DropdownItem
            id="wordpress"
            label="WordPress Management"
            icon={Boxes}
            activePrefixes={['/bulk/plugins', '/bulk/themes', '/bulk/core', '/bulk/scanner', '/bulk/hardening', '/bulk/safe-updates']}
          >
            <NavLink to="/user/bulk/plugins" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Boxes size={14} />
              <span>Plugins</span>
            </NavLink>
            <NavLink to="/user/bulk/themes" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Palette size={14} />
              <span>Themes</span>
            </NavLink>
            <NavLink to="/user/bulk/core" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Sparkles size={14} />
              <span>WordPress Core</span>
            </NavLink>
            <NavLink to="/user/bulk/scanner" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Bug size={14} />
              <span>Malware Scanner</span>
            </NavLink>
            <NavLink to="/user/bulk/hardening" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Shield size={14} />
              <span>Security Hardening</span>
            </NavLink>
            <NavLink to="/user/bulk/safe-updates" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <RotateCw size={14} />
              <span>Safe Updates</span>
            </NavLink>
          </DropdownItem>

          {/* 5. Access Control & Geo-Blocking > (Dropdown) */}
          <DropdownItem
            id="accessControl"
            label="Access Control & Geo-Blocking"
            icon={Globe}
            activePrefixes={['/blacklist']}
          >
            <NavLink to="/user/blacklist?tab=ip_blacklist" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Ban size={14} />
              <span>IP Blocklist</span>
            </NavLink>
            <NavLink to="/user/blacklist?tab=ip_allowlist" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <ShieldCheck size={14} />
              <span>IP Allowlist</span>
            </NavLink>
            <NavLink to="/user/blacklist?tab=country_blocking" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Globe size={14} />
              <span>Country Blocking</span>
            </NavLink>
          </DropdownItem>

          {/* 6. Backup & Recovery */}
          <NavLink to="/user/bulk/backup" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={17} />
            </span>
            <span>Backup &amp; Recovery</span>
          </NavLink>

          {/* 7. Security Protection > (Dropdown) */}
          <DropdownItem
            id="securityProtection"
            label="Security Protection"
            icon={ShieldCheck}
            activePrefixes={['/bulk/tools', 'tab=2fa']}
          >
            <NavLink to="/user/bulk/tools" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Cpu size={14} />
              <span>Bot Defense &amp; Rate Limiting</span>
            </NavLink>
            <NavLink to="/user/settings?tab=2fa" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Key size={14} />
              <span>Two-Factor Authentication (2FA)</span>
            </NavLink>
          </DropdownItem>

          {/* 8. Security Center > (Dropdown) */}
          <DropdownItem
            id="securityCenter"
            label="Security Center"
            icon={Shield}
            activePrefixes={['/security', '/threat-intelligence', '/port-scanner']}
          >
            <NavLink to="/threat-intelligence" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Flame size={14} />
              <span>Threat Intelligence</span>
            </NavLink>
            <NavLink to="/user/security/port-scanner" onClick={handleLinkClick} style={getSubNavLinkStyle}>
              <Radio size={14} />
              <span>Security &amp; Port Scanner</span>
            </NavLink>
          </DropdownItem>

          {/* 9. WordPress Sites */}
          <NavLink to="/user/websites" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={17} />
            </span>
            <span>WordPress Sites</span>
          </NavLink>

          {/* 10. Custom Domains */}
          <NavLink to="/user/domains" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={17} />
            </span>
            <span>Custom Domains</span>
          </NavLink>

          {/* 11. Team Members */}
          <NavLink to="/user/team" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </span>
            <span>Team Members</span>
          </NavLink>

          {/* 12. Alerts & Notifications */}
          <NavLink to="/user/alerts" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={17} />
            </span>
            <span>Alerts &amp; Notifications</span>
          </NavLink>

          {/* 13. Activity & Audit Logs */}
          <NavLink to="/user/bulk/activity" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={17} />
            </span>
            <span>Activity &amp; Audit Logs</span>
          </NavLink>

          {/* 14. Pricing & Plans */}
          <NavLink to="/user/pricing" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={17} />
            </span>
            <span>Pricing &amp; Plans</span>
          </NavLink>

          {/* 15. Settings */}
          <NavLink to="/user/settings" onClick={handleLinkClick} style={getNavLinkStyle}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={17} />
            </span>
            <span>Settings</span>
          </NavLink>

        </nav>

        {/* ========================================================================= */}
        {/* FOOTER (STATUS, PROFILE & LOGOUT)                                         */}
        {/* ========================================================================= */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 12px' }}>
          
          {/* Active Plan Pill */}
          <div className="sidebar-status" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className={`status-dot ${isPaid ? 'online' : ''}`} style={!isPaid ? { background: '#F59E0B' } : { background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '10.5px', color: '#889895', fontWeight: 500, lineHeight: 1.1 }}>Active Tier</span>
              <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planName}</span>
            </div>
            {isPaid && <Sparkles size={13} color="#E8792F" />}
          </div>

          {/* Profile / Username */}
          <Link
            to="/user/settings"
            onClick={handleLinkClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '7px 10px',
              borderRadius: '8px',
              marginBottom: '8px',
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669 0%, #0B2522 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {userName ? userName[0].toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </span>
              <span style={{ fontSize: '10px', color: '#6A7D78', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail || 'Account Settings'}
              </span>
            </div>
          </Link>

          {/* Sign Out Button */}
          <button
            className="logout-btn"
            onClick={() => window.__doLogout && window.__doLogout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(220, 38, 38, 0.08)',
              color: '#F87171',
              border: '1px solid rgba(220, 38, 38, 0.18)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
