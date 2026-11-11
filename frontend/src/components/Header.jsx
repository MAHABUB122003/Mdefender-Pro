import { useState, useEffect, useCallback } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  User,
  ExternalLink
} from 'lucide-react'

const pageNames = {
  '/admin/dashboard': 'Global Overview',
  '/admin/users': 'Users & Fleets',
  '/admin/pricing': 'Dynamic SaaS Pricing',
  '/admin/clients': 'Protected Websites',
  '/admin/ddos': 'DDoS Shield',
  '/admin/logs': 'Fleet Audit Logs',
  '/admin/rules': 'Virtual Patches & Rules',
  '/admin/blacklist': 'IP Threat Network',
  '/admin/learning': 'Attack Evasion Lab',
  '/admin/settings': 'System Settings',
  '/connect': 'Cluster Nodes',
}

export default function Header({ isCollapsed, onToggleCollapse, onToggleSidebar, onLogout }) {
  const [time, setTime] = useState({ date: '', time: '' })
  const [showNotifications, setShowNotifications] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const location = useLocation()
  const pageName = pageNames[location.pathname] || 'Control Center'

  useEffect(() => {
    window.__doLogout = onLogout
    const update = () => {
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      setTime({
        date: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => { clearInterval(id); delete window.__doLogout }
  }, [onLogout])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    const close = () => setShowNotifications(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <header className="admin-header">
      {/* Left: Breadcrumbs & Toggle */}
      <div className="admin-header-left">
        {/* Mobile menu trigger */}
        <button 
          className="admin-mobile-menu-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle Mobile Menu"
        >
          <Menu size={19} />
        </button>

        {/* Desktop collapse toggle */}
        <button
          className="admin-desktop-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar ( [ )' : 'Collapse Sidebar ( [ )'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="admin-page-breadcrumbs">
          <span className="crumb-root">MDefender Super Admin</span>
          <span className="crumb-sep">/</span>
          <h1 className="crumb-current">{pageName}</h1>
        </div>
      </div>

      {/* Middle: Universal Search Bar */}
      <div className="admin-header-center">
        <div className="admin-global-search">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search 500,000+ domains, CVEs, users, or IPs..." 
            readOnly
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
              window.dispatchEvent(event)
            }}
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>
      </div>

      {/* Right: Metrics, Clock, Ultra-Wide Fullscreen & Actions */}
      <div className="admin-header-right">
        {/* Fleet Security Badge */}
        <div className="admin-fleet-badge">
          <span className="badge-pulse-dot" />
          <span className="badge-text">Cluster Protected</span>
        </div>

        {/* UTC / Local Clock */}
        <div className="admin-header-clock">
          <Clock size={14} className="clock-icon" />
          <span className="time-val">{time.time}</span>
        </div>

        {/* Ultra-Wide Fullscreen Workspace Expander */}
        <button
          className="admin-header-icon-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen Canvas' : 'Expand to Ultra-Wide Full Screen Canvas'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="admin-notif-wrap" style={{ position: 'relative' }}>
          <button 
            className="admin-header-icon-btn" 
            onClick={(e) => { 
              e.stopPropagation()
              setShowNotifications(prev => !prev) 
            }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            <span className="admin-notif-ping" />
          </button>

          {showNotifications && (
            <div className="admin-notif-popover" onClick={e => e.stopPropagation()}>
              <div className="popover-head">
                <span className="head-title">Fleet Security Alerts</span>
                <span className="head-badge">Real-Time</span>
              </div>
              <div className="popover-list">
                <div className="alert-row">
                  <div className="alert-icon-wrap red">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="alert-body">
                    <div className="alert-msg">CVE-2026-4439 probe auto-dropped</div>
                    <div className="alert-sub">Target: elementor-core • 2m ago</div>
                  </div>
                </div>
                <div className="alert-row">
                  <div className="alert-icon-wrap green">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="alert-body">
                    <div className="alert-msg">Global Hot Patch v4.1 deployed</div>
                    <div className="alert-sub">Syncing to 512,840 sites • 12m ago</div>
                  </div>
                </div>
              </div>
              <div className="popover-foot">
                <Link to="/admin/logs" onClick={() => setShowNotifications(false)}>
                  View All Fleet Audit Logs →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="admin-user-pill">
          <div className="user-avatar">SA</div>
          <div className="user-details">
            <span className="user-role-label">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
