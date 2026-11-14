import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import userStore from '../utils/userStore'
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
  Bot,
  SlidersHorizontal,
  Key,
  Copy,
  Check,
  Flame,
  Radio,
  Layers,
  Users,
  Bell,
  FileBarChart2,
  Tag,
  Settings,
  LogOut,
  ChevronDown,
  ChevronsUpDown,
  CreditCard,
  Laptop,
  ChevronRight,
  LifeBuoy
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

  const cachedProfile = typeof window !== 'undefined' ? (userStore.get('profile') || {}) : {}
  const rawName = cachedProfile.name || cachedProfile.full_name || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_name') : null)
  const userName = rawName || 'SecOps Lead Operator'
  const userEmail = cachedProfile.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_email') : '') || 'operator@mdefender.io'

  const userPlan = (cachedProfile.plan || (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free')).toLowerCase()
  const isPaid = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)

  const userInitials = useMemo(() => {
    if (!userName || userName === 'User Profile') return 'SO'
    const parts = userName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return userName.slice(0, 2).toUpperCase()
  }, [userName])

  const planName = {
    free: 'Starter Free',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise'
  }[userPlan] || (isPaid ? 'Premium Plan' : 'Starter Free')

  const trialDays = (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_days') : null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState(false)
  const [sidebarApiKey, setSidebarApiKey] = useState(() => {
    return (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_api_key') || '') : '')
  })

  // Synchronize API Key with workspace and external events
  useEffect(() => {
    const handleKeyUpdate = (e) => {
      if (e?.detail) {
        setSidebarApiKey(e.detail)
      } else if (typeof localStorage !== 'undefined') {
        setSidebarApiKey(localStorage.getItem('mdefender_api_key') || '')
      }
    }
    window.addEventListener('mdefender_api_key_updated', handleKeyUpdate)

    if (!sidebarApiKey) {
      import('../api/api').then(({ default: api }) => {
        api.getUserProfile().then(res => {
          const key = res?.data?.api_key || res?.data?.user?.api_key || res?.api_key || res?.user?.api_key
          if (key) {
            setSidebarApiKey(key)
            if (typeof localStorage !== 'undefined') localStorage.setItem('mdefender_api_key', key)
          }
        }).catch(() => {})
      }).catch(() => {})
    }

    return () => window.removeEventListener('mdefender_api_key_updated', handleKeyUpdate)
  }, [sidebarApiKey])

  const handleCopyApiKey = async (e) => {
    e.stopPropagation()
    let key = sidebarApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_api_key') : '')
    if (!key) {
      try {
        const { default: api } = await import('../api/api')
        const res = await api.getUserProfile()
        const fetched = res?.data?.api_key || res?.data?.user?.api_key || res?.api_key || res?.user?.api_key
        if (fetched) {
          key = fetched
          setSidebarApiKey(fetched)
          if (typeof localStorage !== 'undefined') localStorage.setItem('mdefender_api_key', fetched)
        }
      } catch (err) {
        console.warn('Failed to fetch api key for copy:', err)
      }
    }
    if (!key) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key)
      } else {
        const { default: copyToClipboard } = await import('../utils/clipboard')
        await copyToClipboard(key)
      }
    } catch {
      // clipboard fallback
    }
    setCopiedApiKey(true)
    setTimeout(() => setCopiedApiKey(false), 2000)
  }
  const profileMenuRef = useRef(null)

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showProfileMenu])

  // Close profile menu on navigation
  useEffect(() => {
    setShowProfileMenu(false)
  }, [location.pathname])

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
      monitoring: path.includes('/monitoring'),
      wordpress: path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/database'),
      accessControl: path.includes('/blacklist') || path.includes('/access/'),
      securityProtection: path.includes('/security/bot-shield') || path.includes('/security/bot-defense') || path.includes('/security/login-gateway') || path.includes('/security/rate-limits') || path.includes('/security/2fa') || path.includes('/security/post-hack') || path.includes('/security/incident-response') || path.includes('/bulk/posthack') || path.includes('/bulk/tools'),
      securityCenter: path.includes('/security/threat-intelligence') || path.includes('/security/port-scanner') || path.includes('/security/breach-intelligence') || path.includes('/security/hibp') || path.includes('/security/pwned') || path.includes('/bulk/breach-intelligence')
    }
  })

  // Auto-expand parent dropdown when navigating to matching route without closing previously open items
  useEffect(() => {
    const path = location.pathname
    const search = location.search
    if (path.includes('/monitoring')) {
      setOpenDropdowns(prev => prev.monitoring ? prev : { ...prev, monitoring: true })
    } else if (path.includes('/bulk/plugins') || path.includes('/bulk/themes') || path.includes('/bulk/core') || path.includes('/bulk/scanner') || path.includes('/bulk/hardening') || path.includes('/bulk/database')) {
      setOpenDropdowns(prev => prev.wordpress ? prev : { ...prev, wordpress: true })
    } else if (path.includes('/blacklist') || path.includes('/access/')) {
      setOpenDropdowns(prev => prev.accessControl ? prev : { ...prev, accessControl: true })
    } else if (path.includes('/security/bot-shield') || path.includes('/security/bot-defense') || path.includes('/security/login-gateway') || path.includes('/security/rate-limits') || path.includes('/security/2fa') || path.includes('/security/post-hack') || path.includes('/security/incident-response') || path.includes('/bulk/posthack') || path.includes('/bulk/tools')) {
      setOpenDropdowns(prev => prev.securityProtection ? prev : { ...prev, securityProtection: true })
    } else if (path.includes('/security/threat-intelligence') || path.includes('/security/port-scanner') || path.includes('/security/breach-intelligence') || path.includes('/security/hibp') || path.includes('/security/pwned') || path.includes('/bulk/breach-intelligence')) {
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
    if (toPath === '/user/team') {
      return currentPath === '/user/team'
    }
    if (toPath === '/user/alerts') {
      return currentPath === '/user/alerts'
    }
    if (toPath === '/user/reports') {
      return currentPath === '/user/reports'
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
    if (toPath === '/user/security/bot-shield') {
      return currentPath === '/user/security/bot-shield' || currentPath === '/user/security/bot-defense'
    }
    if (toPath === '/user/security/login-gateway') {
      return currentPath === '/user/security/login-gateway'
    }
    if (toPath === '/user/security/rate-limits') {
      return currentPath === '/user/security/rate-limits' || currentPath === '/user/bulk/tools'
    }
    if (toPath === '/user/security/2fa') {
      return currentPath === '/user/security/2fa'
    }
    if (toPath === '/user/security/post-hack') {
      return currentPath === '/user/security/post-hack' || currentPath === '/user/security/incident-response' || currentPath === '/user/bulk/posthack'
    }
    if (toPath === '/user/security/threat-intelligence') {
      return currentPath === '/user/security/threat-intelligence'
    }
    if (toPath === '/user/security/port-scanner') {
      return currentPath === '/user/security/port-scanner'
    }
    if (toPath === '/user/security/breach-intelligence') {
      return currentPath === '/user/security/breach-intelligence' || currentPath === '/user/security/hibp' || currentPath === '/user/security/pwned' || currentPath === '/user/bulk/breach-intelligence'
    }
    return currentPath === toPath
  }

  // Active status for dropdown parent headers
  const isMonitoringGroupActive = currentPath.includes('/monitoring')
  const isWordpressGroupActive = currentPath.includes('/bulk/plugins') || currentPath.includes('/bulk/themes') || currentPath.includes('/bulk/core') || currentPath.includes('/bulk/scanner') || currentPath.includes('/bulk/hardening') || currentPath.includes('/bulk/database') || currentPath.includes('/bulk/safe-updates')
  const isAccessControlGroupActive = currentPath === '/user/blacklist' || currentPath.includes('/access/')
  const isSecurityProtectionGroupActive = currentPath.includes('/security/bot-shield') || currentPath.includes('/security/bot-defense') || currentPath.includes('/security/login-gateway') || currentPath.includes('/security/rate-limits') || currentPath.includes('/security/2fa') || currentPath.includes('/security/post-hack') || currentPath.includes('/security/incident-response') || currentPath.includes('/bulk/posthack') || currentPath.includes('/bulk/tools')
  const isSecurityCenterGroupActive = currentPath.includes('/security/threat-intelligence') || currentPath.includes('/security/port-scanner') || currentPath.includes('/security/breach-intelligence') || currentPath.includes('/security/hibp') || currentPath.includes('/security/pwned') || currentPath.includes('/bulk/breach-intelligence') || currentPath === '/threat-intelligence'

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
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>MDefender</h2>
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
              <span style={{ pointerEvents: 'none' }}>Uptime</span>
            </Link>
            <Link
              to="/user/monitoring/performance"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/performance') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Performance</span>
            </Link>
            <Link
              to="/user/monitoring/broken-links"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/broken-links') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Broken Links</span>
            </Link>
            <Link
              to="/user/monitoring/blacklist"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/monitoring/blacklist') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Blacklist Monitor</span>
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
              <span style={{ pointerEvents: 'none' }}>Plugins</span>
            </Link>
            <Link
              to="/user/bulk/themes"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/themes') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Themes</span>
            </Link>
            <Link
              to="/user/bulk/safe-updates"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/safe-updates') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Safe Updates</span>
            </Link>
            <Link
              to="/user/bulk/core"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/core') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>WordPress Core</span>
            </Link>
            <Link
              to="/user/bulk/scanner"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/scanner') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Malware Scanner</span>
            </Link>
            <Link
              to="/user/bulk/hardening"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/hardening') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Security Hardening</span>
            </Link>
            <Link
              to="/user/bulk/database"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/bulk/database') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Database Optimizer</span>
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
              <span style={{ pointerEvents: 'none' }}>IP Blocklist</span>
            </Link>
            <Link
              to="/user/access/ip-allowlist"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/access/ip-allowlist') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>IP Allowlist</span>
            </Link>
            <Link
              to="/user/access/country-blocking"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/access/country-blocking') ? 'active' : ''}`}
            >
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
              to="/user/security/bot-shield"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/bot-shield') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Biometric &amp; Bot Shield</span>
            </Link>
            <Link
              to="/user/security/login-gateway"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/login-gateway') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Login Gateway Security</span>
            </Link>
            <Link
              to="/user/security/rate-limits"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/rate-limits') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Rate Limiting &amp; DDoS</span>
            </Link>
            <Link
              to="/user/security/2fa"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/2fa') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Two-Factor Auth (2FA)</span>
            </Link>
            <Link
              to="/user/security/post-hack"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/post-hack') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Post-Hack Recovery</span>
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
              <span style={{ pointerEvents: 'none' }}>Threat Intelligence &amp; WHOIS</span>
            </Link>
            <Link
              to="/user/security/port-scanner"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/port-scanner') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Security &amp; Port Scanner</span>
            </Link>
            <Link
              to="/user/security/breach-intelligence"
              onClick={handleLinkClick}
              className={`user-subnav-link ${isSubLinkActive('/user/security/breach-intelligence') ? 'active' : ''}`}
            >
              <span style={{ pointerEvents: 'none' }}>Breach Intelligence &amp; HIBP</span>
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

          {/* 10. Team Members */}
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

          {/* Security Reports & Automated Digests */}
          <Link
            to="/user/reports"
            onClick={handleLinkClick}
            className={`user-nav-link ${isLinkActive('/user/reports') ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'none' }}>
              <FileBarChart2 size={16} />
            </span>
            <span style={{ pointerEvents: 'none' }}>Security Reports</span>
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
        </nav>

        {/* ========================================================================= */}
        {/* TECH-GIANT ENTERPRISE FOOTER (PROFILE TRIGGER & ELEVATED POPOVER)        */}
        {/* ========================================================================= */}
        <div className="sidebar-footer" ref={profileMenuRef} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px', position: 'relative', overflow: 'visible', zIndex: 100 }}>
          
          {/* Elevated Floating Popover Menu */}
          {showProfileMenu && (
            <div
              className="profile-popover-menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '10px',
                right: '10px',
                background: '#0d1817',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                padding: '8px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'popoverFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Popover Header: User identity & subscription */}
              <div style={{ padding: '8px 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10B981 0%, #064E3B 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                    flexShrink: 0
                  }}>
                    {userInitials}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {userName}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(232, 121, 47, 0.15)',
                        color: isPaid ? '#10B981' : '#E8792F',
                        border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(232, 121, 47, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {isPaid ? (userPlan === 'enterprise' ? 'ENTERPRISE' : 'PRO') : 'FREE TIER'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userEmail || 'operator@mdefender.io'}
                    </span>
                  </div>
                </div>

                {/* Tier & Trial Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '7px',
                  padding: '6px 8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '6.5px',
                      height: '6.5px',
                      borderRadius: '50%',
                      background: isPaid ? '#10B981' : '#F59E0B',
                      boxShadow: isPaid ? '0 0 6px rgba(16,185,129,0.8)' : 'none'
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#E2E8F0' }}>
                      {planName}
                    </span>
                  </div>
                  {trialDays ? (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#E8792F', background: 'rgba(232,121,47,0.12)', border: '1px solid rgba(232,121,47,0.25)', padding: '2px 6px', borderRadius: '4px' }}>
                      {trialDays}d Trial
                    </span>
                  ) : (
                    <Link
                      to="/user/pricing"
                      onClick={() => { setShowProfileMenu(false); handleLinkClick(); }}
                      style={{ fontSize: '10.5px', fontWeight: 600, color: '#E8792F', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      Manage Plan <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Navigation Options List */}
              <div style={{ padding: '4px 0' }}>
                <Link
                  to="/user/settings"
                  onClick={() => { setShowProfileMenu(false); handleLinkClick(); }}
                  className="popover-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <Settings size={14} />
                    <span>Account Settings</span>
                  </div>
                </Link>

                <Link
                  to="/user/settings?tab=mfa"
                  onClick={() => { setShowProfileMenu(false); handleLinkClick(); }}
                  className="popover-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <ShieldCheck size={14} />
                    <span>Security &amp; 2FA</span>
                  </div>
                </Link>

                <Link
                  to="/user/settings?tab=sessions"
                  onClick={() => { setShowProfileMenu(false); handleLinkClick(); }}
                  className="popover-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <Laptop size={14} />
                    <span>Active Sessions</span>
                  </div>
                </Link>

                <Link
                  to="/user/support"
                  onClick={() => { setShowProfileMenu(false); handleLinkClick(); }}
                  className="popover-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <LifeBuoy size={14} color="#E8792F" />
                    <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Support &amp; Help Desk</span>
                  </div>
                </Link>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />

              {/* Sign Out Option */}
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (window.__doLogout) window.__doLogout();
                }}
                className="popover-logout-btn"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Quick API Key Action Item (Positioned Directly Above Profile Trigger) */}
          <button
            type="button"
            onClick={handleCopyApiKey}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '8px',
              border: copiedApiKey ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: copiedApiKey ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              color: copiedApiKey ? '#10B981' : '#E2E8F0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!copiedApiKey) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (!copiedApiKey) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
              }
            }}
            title="Click to copy your Workspace API Key"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={14} color={copiedApiKey ? '#10B981' : '#F38A3E'} />
              <span>API Key</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: copiedApiKey ? '#10B981' : '#889895' }}>
              {copiedApiKey ? (
                <>
                  <Check size={12} color="#10B981" />
                  <span style={{ fontWeight: 700 }}>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>Copy</span>
                </>
              )}
            </div>
          </button>

          {/* Unified Profile Trigger Bar */}
          <button
            type="button"
            onClick={() => setShowProfileMenu(prev => !prev)}
            className={`profile-trigger-btn ${showProfileMenu ? 'active' : ''}`}
            aria-expanded={showProfileMenu}
            aria-label="User profile and account options"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              {/* Avatar with Live Indicator */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10B981 0%, #064E3B 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                }}>
                  {userInitials}
                </div>
                <span style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isPaid ? '#10B981' : '#F59E0B',
                  border: '2px solid #0B1916',
                  boxShadow: isPaid ? '0 0 6px rgba(16, 185, 129, 0.8)' : 'none'
                }} />
              </div>

              {/* Name & Plan Badge / Email */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#F8FAFC',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    {userName}
                  </span>
                  <span style={{
                    fontSize: '8.5px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(232, 121, 47, 0.15)',
                    color: isPaid ? '#10B981' : '#E8792F',
                    border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(232, 121, 47, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 1.2
                  }}>
                    {isPaid ? (userPlan === 'enterprise' ? 'ENT' : 'PRO') : 'FREE'}
                  </span>
                </div>
                <span style={{
                  fontSize: '10.5px',
                  color: '#94A3B8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                  marginTop: '2px'
                }}>
                  {userEmail || 'operator@mdefender.io'}
                </span>
              </div>
            </div>

            {/* Up/Down Chevrons Indicator */}
            <ChevronsUpDown
              size={14}
              style={{
                color: showProfileMenu ? '#F38A3E' : '#6A7D78',
                flexShrink: 0,
                transition: 'color 0.15s ease'
              }}
            />
          </button>
        </div>
      </aside>
    </>
  )
}
