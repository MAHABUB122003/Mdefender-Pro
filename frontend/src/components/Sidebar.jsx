import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  LifeBuoy,
  Users,
  Globe,
  CreditCard,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'

export default function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onCloseMobile }) {
  const location = useLocation()
  const currentPath = location.pathname

  const isLinkActive = (toPath) => {
    if (toPath === '/admin/dashboard') {
      return currentPath === '/admin' || currentPath === '/admin/dashboard'
    }
    if (toPath === '/admin/clients') {
      return currentPath === '/admin/clients' || currentPath === '/admin/websites'
    }
    if (toPath === '/admin/support') {
      return currentPath.startsWith('/admin/support')
    }
    if (toPath === '/admin/pricing') {
      return currentPath.startsWith('/admin/pricing')
    }
    return currentPath === toPath
  }

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      to: '/admin/support',
      label: 'Support Desk',
      icon: LifeBuoy,
      badge: { text: 'Helpdesk', type: 'primary' }
    },
    {
      to: '/admin/users',
      label: 'Tenants & Users',
      icon: Users
    },
    {
      to: '/admin/clients',
      label: 'Protected Websites',
      icon: Globe
    },
    {
      to: '/admin/pricing',
      label: 'Plans & Pricing',
      icon: CreditCard
    },
    {
      to: '/admin/blacklist',
      label: 'Firewall & IP Rules',
      icon: ShieldAlert
    },
    {
      to: '/admin/settings',
      label: 'Platform Settings',
      icon: Settings
    }
  ]

  return (
    <aside
      className={`admin-sidebar ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      id="adminSidebar"
    >
      {/* Brand Header */}
      <div className="admin-sidebar-brand">
        <Link
          to="/admin/dashboard"
          className="brand-wrap"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={onCloseMobile}
        >
          <div className="brand-logo-icon">
            <img src="/assets/mdefender_logo.png" alt="MDefender Pro" />
          </div>
          {!isCollapsed && (
            <div className="brand-text">
              <span className="brand-name">MDefender</span>
              <span className="brand-badge">HQ CONSOLE</span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          className="admin-collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar ( [ )' : 'Collapse Sidebar ( [ )'}
          aria-label="Toggle Sidebar Width"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation List - Pure Direct Links (Zero Bloat, Zero Accordion Confusion) */}
      <nav className="admin-sidebar-nav" style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {!isCollapsed && (
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#94A3B8',
            padding: '4px 12px 8px',
            userSelect: 'none'
          }}>
            Mission Control
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          const active = isLinkActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={`admin-nav-item ${active ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="admin-nav-icon">
                <Icon size={17} strokeWidth={active ? 2.3 : 2} />
              </span>
              {!isCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span className="admin-nav-label" style={{ fontWeight: active ? '700' : '500' }}>
                    {item.label}
                  </span>
                  {item.badge && !active && (
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #DBEAFE'
                    }}>
                      {item.badge.text}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Tech Giant Standard Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-profile-card">
          <div className="admin-profile-avatar" title="Platform Owner (Super Admin)">
            <span>HQ</span>
            <span className="avatar-status-dot" title="Mission Control 99.99% Operational" />
          </div>

          {!isCollapsed && (
            <div className="admin-profile-info">
              <span className="admin-name">Platform Owner</span>
              <span className="admin-status-text">
                <span className="status-pulse-dot" />
                SecOps HQ 99.99%
              </span>
            </div>
          )}

          <button
            className="admin-profile-logout-btn"
            onClick={() => window.__doLogout && window.__doLogout()}
            title="Sign Out of Mission Control"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
