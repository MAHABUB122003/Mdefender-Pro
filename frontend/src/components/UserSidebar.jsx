import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

// Hardware-accelerated CSS Grid Accordion: never destroys DOM nodes, zero jitter
function DropdownItem({
  id,
  label,
  icon: Icon,
  isOpen,
  onToggle,
  isGroupActive,
  children
}) {
  return (
    <div style={{ marginBottom: '2px' }}>
      <button
        type="button"
        className={`user-dropdown-btn ${isGroupActive ? 'active-group' : ''}`}
        onClick={() => onToggle(id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, pointerEvents: 'none' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
            <Icon size={16} />
          </span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {label}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            color: isGroupActive ? '#F38A3E' : '#6A7D78',
            flexShrink: 0,
            pointerEvents: 'none'
          }}
        />
      </button>

      <div className={`user-dropdown-wrapper ${isOpen ? 'is-open' : ''}`}>
        <div className="user-dropdown-inner">
          {children}
        </div>
      </div>
    </div>
  )
}

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

  // Only close drawer on mobile viewports (< 1024px)
  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose()
    }
  }

  // Accordion state for dropdown sections
  const [openDropdowns, setOpenDropdowns] = useState(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    const search = typeof window !== 'undefined' ? window.location.search : ''
    return {
      monitoring: path.includes('/monitoring') || path.includes('/site-health'),
      wordpress: path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/safe-updates'),
      accessControl: path.includes('/blacklist') || path.includes('/access/'),
      securityProtection: path.includes('/security/bot-defense') || path.includes('/security/2fa') || path.includes('/bulk/tools'),
      securityCenter: path.includes('/security') || path.includes('/threat-intel') || path.includes('/port-scanner')
    }
  })

  // Auto-expand parent dropdown when navigating to matching route without closing previously open items
  useEffect(() => {
    const path = location.pathname
    const search = location.search
    if (path.includes('/monitoring') || path.includes('/site-health')) {
      setOpenDropdowns(prev => prev.monitoring ? prev : { ...prev, monitoring: true })
    } else if (path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/safe-updates')) {
      setOpenDropdowns(prev => prev.wordpress ? prev : { ...prev, wordpress: true })
    } else if (path.includes('/blacklist') || path.includes('/access/')) {
      setOpenDropdowns(prev => prev.accessControl ? prev : { ...prev, accessControl: true })
    } else if (path.includes('/bulk/tools') || (path.includes('/settings') && search.includes('2fa'))) {
      setOpenDropdowns(prev => prev.securityProtection ? prev : { ...prev, securityProtection: true })
    } else if (path.includes('/security') || path.includes('/port-scanner') || path.includes('/threat-intelligence')) {
      setOpenDropdowns(prev => prev.securityCenter ? prev : { ...prev, securityCenter: true })
    }
  }, [location.pathname, location.search])

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const currentPath = location.pathname
  const currentSearch = location.search

  // High-accuracy active check for standalone items
  const isLinkActive = (toPath) => {
    if (toPath === '/user/dashboard') {
      return currentPath === '/user/dashboard' || currentPath === '/user'
    }
    if (toPath === '/user/logs') {
      return currentPath === '/user/logs'
    }
    if (toPath === '/user/bulk/backup') {
      return currentPath === '/user/bulk/backup'
    }
    if (toPath === '/user/websites') {
      return currentPath === '/user/websites'
    }
    if (toPath === '/user/domains') {
      return currentPath === '/user/domains'
    }
    if (toPath === '/user/team') {
      return currentPath === '/user/team'
    }
    if (toPath === '/user/alerts') {
      return currentPath === '/user/alerts'
    }
    if (toPath === '/user/bulk/activity') {
      return currentPath === '/user/bulk/activity'
    }
    if (toPath === '/user/pricing') {
      return currentPath === '/user/pricing' || currentPath === '/user/plans'
    }
    if (toPath === '/user/settings') {
      return currentPath === '/user/settings' && !currentSearch.includes('tab=2fa')
    }
    return currentPath === toPath
  }

  // High-accuracy active check for dropdown sublinks with tab disambiguation
  const isSubLinkActive = (toPath, tab = null) => {
    if (tab) {
      if (toPath === '/user/settings') {
        return currentPath === '/user/settings' && currentSearch.includes(`tab=${tab}`)
      }
    }
    if (toPath === '/user/monitoring/uptime') {
      return currentPath === '/user/monitoring/uptime' || currentPath === '/user/monitoring'
    }
    if (toPath === '/user/access/ip-blocklist') {
      return currentPath === '/user/access/ip-blocklist' || (currentPath === '/user/blacklist' && (!currentSearch || currentSearch.includes('ip_blacklist') || currentSearch.includes('tab=ip')))
    }
    if (toPath === '/user/access/ip-allowlist') {
      return currentPath === '/user/access/ip-allowlist' || (currentPath === '/user/blacklist' && (currentSearch.includes('ip_allowlist') || currentSearch.includes('whitelist')))
    }
    if (toPath === '/user/access/country-blocking') {
      return currentPath === '/user/access/country-blocking' || (currentPath === '/user/blacklist' && (currentSearch.includes('country_blocking') || currentSearch.includes('country')))
    }
    if (toPath === '/user/security/bot-defense') {
      return currentPath === '/user/security/bot-defense' || currentPath === '/user/bulk/tools'
    }
    if (toPath === '/user/security/2fa') {
      return currentPath === '/user/security/2fa'
    }
    if (toPath === '/user/security/threat-intelligence') {
      return currentPath === '/user/security/threat-intelligence'
    }
    if (toPath === '/user/security/port-scanner') {
      return currentPath === '/user/security/port-scanner'
    }
    return currentPath === toPath
  }

  // Active status for dropdown parent headers
  const isMonitoringGroupActive = currentPath.includes('/monitoring') || currentPath.includes('/site-health')
  const isWordpressGroupActive = currentPath.includes('/bulk/plugins') || currentPath.includes('/bulk/themes') || currentPath.includes('/bulk/core') || currentPath.includes('/bulk/scanner') || currentPath.includes('/bulk/hardening') || currentPath.includes('/bulk/safe-updates')
  const isAccessControlGroupActive = currentPath === '/user/blacklist' || currentPath.includes('/access/')
  const isSecurityProtectionGroupActive = currentPath.includes('/security/bot-defense') || currentPath.includes('/security/2fa') || currentPath.includes('/bulk/tools')
  const isSecurityCenterGroupActive = currentPath.includes('/security/threat-intelligence') || currentPath.includes('/security/port-scanner') || currentPath === '/threat-intelligence'

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar" style={{ background: '#0c1615', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* ========================================================================= */}
        {/* BRAND LOGO HEADER                                                         */}
        {/* ========================================================================= */}
        <div className="sidebar-brand" style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
              width: '34px',
              height: '34px',
              borderRadius: '8px',
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
              <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>MDefender</h2>
              <span style={{ fontSize: '10px', color: '#E8792F', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase' }}>Enterprise WAF</span>
            </div>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION LIST (PRECISE 15-SECTION ARCHITECTURE)                         */}
        {/* ========================================================================= */}
        <nav className="sidebar-nav">
          
          {/* 1. Dashboard */}
          <Link
            to="/user/dashboard"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/dashboard') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <LayoutDashboard size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Dashboard</span>
          </Link>

          {/* 2. Live Traffic */}
          <Link
            to="/user/logs"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/logs') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <FileText size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Live Traffic</span>
          </Link>

          {/* 3. Monitoring > (Dropdown) */}
          <DropdownItem
            id="monitoring"
            label="Monitoring"
            icon={Activity}
            isOpen={!!openDropdowns.monitoring}
            onToggle={toggleDropdown}
            isGroupActive={isMonitoringGroupActive}
          >
            <Link
              to="/user/monitoring/uptime"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/uptime') ? 'active' : ''}`}
            >
              <Clock size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Uptime</span>
            </Link>
            <Link
              to="/user/monitoring/performance"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/performance') ? 'active' : ''}`}
            >
              <Zap size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Performance</span>
            </Link>
            <Link
              to="/user/monitoring/broken-links"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/broken-links') ? 'active' : ''}`}
            >
              <ExternalLink size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Broken Links</span>
            </Link>
          </DropdownItem>

          {/* 4. WordPress Management > (Dropdown) */}
          <DropdownItem
            id="wordpress"
            label="WordPress Management"
            icon={Boxes}
            isOpen={!!openDropdowns.wordpress}
            onToggle={toggleDropdown}
            isGroupActive={isWordpressGroupActive}
          >
            <Link
              to="/user/bulk/plugins"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/plugins') ? 'active' : ''}`}
            >
              <Boxes size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Plugins</span>
            </Link>
            <Link
              to="/user/bulk/themes"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/themes') ? 'active' : ''}`}
            >
              <Palette size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Themes</span>
            </Link>
            <Link
              to="/user/bulk/core"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/core') ? 'active' : ''}`}
            >
              <Sparkles size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>WordPress Core</span>
            </Link>
            <Link
              to="/user/bulk/scanner"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/scanner') ? 'active' : ''}`}
            >
              <Bug size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Malware Scanner</span>
            </Link>
            <Link
              to="/user/bulk/hardening"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/hardening') ? 'active' : ''}`}
            >
              <Shield size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Security Hardening</span>
            </Link>
            <Link
              to="/user/bulk/safe-updates"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/safe-updates') ? 'active' : ''}`}
            >
              <RotateCw size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Safe Updates</span>
            </Link>
          </DropdownItem>

          {/* 5. Access Control & Geo-Blocking > (Dropdown) */}
          <DropdownItem
            id="accessControl"
            label="Access & Geo-Blocking"
            icon={Globe}
            isOpen={!!openDropdowns.accessControl}
            onToggle={toggleDropdown}
            isGroupActive={isAccessControlGroupActive}
          >
            <Link
              to="/user/access/ip-blocklist"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/access/ip-blocklist') ? 'active' : ''}`}
            >
              <Ban size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>IP Blocklist</span>
            </Link>
            <Link
              to="/user/access/ip-allowlist"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/access/ip-allowlist') ? 'active' : ''}`}
            >
              <ShieldCheck size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>IP Allowlist</span>
            </Link>
            <Link
              to="/user/access/country-blocking"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/access/country-blocking') ? 'active' : ''}`}
            >
              <Globe size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Country Blocking</span>
            </Link>
          </DropdownItem>

          {/* 6. Backup & Recovery */}
          <Link
            to="/user/bulk/backup"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/bulk/backup') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <HardDrive size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Backup &amp; Recovery</span>
          </Link>

          {/* 7. Security Protection > (Dropdown) */}
          <DropdownItem
            id="securityProtection"
            label="Security Protection"
            icon={ShieldCheck}
            isOpen={!!openDropdowns.securityProtection}
            onToggle={toggleDropdown}
            isGroupActive={isSecurityProtectionGroupActive}
          >
            <Link
              to="/user/security/bot-defense"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/bot-defense') ? 'active' : ''}`}
            >
              <Cpu size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Bot Defense &amp; Rate Limits</span>
            </Link>
            <Link
              to="/user/security/2fa"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/2fa') ? 'active' : ''}`}
            >
              <Key size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Two-Factor Auth (2FA)</span>
            </Link>
          </DropdownItem>

          {/* 8. Security Center > (Dropdown) */}
          <DropdownItem
            id="securityCenter"
            label="Security Center"
            icon={Shield}
            isOpen={!!openDropdowns.securityCenter}
            onToggle={toggleDropdown}
            isGroupActive={isSecurityCenterGroupActive}
          >
            <Link
              to="/user/security/threat-intelligence"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/threat-intelligence') ? 'active' : ''}`}
            >
              <Flame size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Threat Intelligence</span>
            </Link>
            <Link
              to="/user/security/port-scanner"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/port-scanner') ? 'active' : ''}`}
            >
              <Radio size={13.5} style={{ flexShrink: 0, pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>Security &amp; Port Scanner</span>
            </Link>
          </DropdownItem>

          {/* 9. WordPress Sites */}
          <Link
            to="/user/websites"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/websites') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Layers size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>WordPress Sites</span>
          </Link>

          {/* 10. Custom Domains */}
          <Link
            to="/user/domains"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/domains') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Cpu size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Custom Domains</span>
          </Link>

          {/* 11. Team Members */}
          <Link
            to="/user/team"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/team') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Users size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Team Members</span>
          </Link>

          {/* 12. Alerts & Notifications */}
          <Link
            to="/user/alerts"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/alerts') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Bell size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Alerts &amp; Notifications</span>
          </Link>

          {/* 13. Activity & Audit Logs */}
          <Link
            to="/user/bulk/activity"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/bulk/activity') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Activity size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Activity &amp; Audit Logs</span>
          </Link>

          {/* 14. Pricing & Plans */}
          <Link
            to="/user/pricing"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/pricing') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Tag size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Pricing &amp; Plans</span>
          </Link>

          {/* 15. Settings */}
          <Link
            to="/user/settings"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/settings') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <Settings size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Settings</span>
          </Link>
        </nav>

        {/* ========================================================================= */}
        {/* FOOTER (STATUS, PROFILE & LOGOUT)                                         */}
        {/* ========================================================================= */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 10px' }}>
          
          {/* Active Plan Pill */}
          <div className="sidebar-status" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6.5px 9px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
            <span className={`status-dot ${isPaid ? 'online' : ''}`} style={!isPaid ? { background: '#F59E0B' } : { background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '10px', color: '#889895', fontWeight: 500, lineHeight: 1.1 }}>Active Tier</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planName}</span>
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
              gap: '9px',
              padding: '6.5px 9px',
              borderRadius: '8px',
              marginBottom: '7px',
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'background-color 0.14s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669 0%, #0B2522 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10.5px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {userName ? userName[0].toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </span>
              <span style={{ fontSize: '9.5px', color: '#6A7D78', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail || 'Account Settings'}
              </span>
            </div>
          </Link>

          {/* Sign Out Button */}
          <button
            className="logout-btn"
            type="button"
            onClick={() => window.__doLogout && window.__doLogout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'rgba(220, 38, 38, 0.08)',
              color: '#F87171',
              border: '1px solid rgba(220, 38, 38, 0.18)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11.5px',
              transition: 'background-color 0.14s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.08)'}
          >
            <LogOut size={13.5} style={{ pointerEvents: 'none' }} />
            <span style={{ pointerEvents: 'none' }}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
