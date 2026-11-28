import { Link, useLocation } from 'react-router-dom'
import { Fragment } from 'react'
import userStore from '../utils/userStore'
import {
  LayoutDashboard,
  LifeBuoy,
  Users,
  Globe,
  CreditCard,
  Settings,
  ShieldCheck,
  Brain,
  Activity,
  Search,
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
      return currentPath === '/admin/support' || currentPath === '/admin/support/inquiries'
    }
    if (toPath === '/admin/support/inspector') {
      return currentPath === '/admin/support/inspector'
    }
    if (toPath === '/admin/pricing') {
      return currentPath.startsWith('/admin/pricing')
    }
    return currentPath === toPath
  }

  const adminProfile = userStore.get('admin_profile') || userStore.get('profile') || {}
  const perms = Array.isArray(adminProfile.permissions) ? adminProfile.permissions : []
  const isOwner = Boolean(
    adminProfile.role === 'super_admin' ||
    adminProfile.role === 'admin' ||
    adminProfile.is_owner ||
    perms.includes('*')
  )
  const canSee = (item) => {
    if (isOwner) return true
    if (!item.requiredPerm) return true
    if (item.requiredPerm === 'owner_only') return false
    return perms.includes(item.requiredPerm)
  }

  const navGroups = [
    {
      label: 'Operations',
      items: [
        { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/support', label: 'Support Desk', icon: LifeBuoy, requiredPerm: 'support.tickets' }
      ]
    },
    {
      label: 'Customers',
      items: [
        { to: '/admin/users', label: 'Tenants & Users', icon: Users, requiredPerm: 'users.view' },
        { to: '/admin/clients', label: 'Protected Websites', icon: Globe, requiredPerm: 'users.view' },
        { to: '/admin/pricing', label: 'Plans & Pricing', icon: CreditCard, requiredPerm: 'owner_only' }
      ]
    },
    {
      label: 'Security operations',
      items: [
        { to: '/admin/rules', label: 'Patches & Rules', icon: ShieldCheck, requiredPerm: 'owner_only' },
        { to: '/admin/learning', label: 'Evasion Lab', icon: Brain, requiredPerm: 'owner_only' },
        { to: '/admin/ddos', label: 'DDoS Shield', icon: Activity, requiredPerm: 'owner_only' },
        { to: '/admin/support/inspector', label: 'Remote Inspector', icon: Search, requiredPerm: 'support.inspector' }
      ]
    },
    {
      label: 'Platform',
      items: [
        { to: '/admin/settings', label: 'Settings', icon: Settings }
      ]
    }
  ].map(g => ({ ...g, items: g.items.filter(canSee) })).filter(g => g.items.length > 0)

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
              <span className="brand-badge">ADMIN</span>
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

      {/* Grouped navigation: Operations / Customers / Security / Platform */}
      <nav className="admin-sidebar-nav" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navGroups.map((group) => (
          <Fragment key={group.label}>
            {!isCollapsed && (
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8A9A95',
                padding: '14px 12px 6px',
                userSelect: 'none'
              }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
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
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.9} />
                  </span>
                  {!isCollapsed && (
                    <span className="admin-nav-label" style={{ fontWeight: active ? '650' : '500' }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </Fragment>
        ))}
      </nav>

      {/* Admin footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-profile-card">
          <div className="admin-profile-avatar" title="Administrator">
            <span>AD</span>
            <span className="avatar-status-dot" title="Signed in" />
          </div>

          {!isCollapsed && (
            <div className="admin-profile-info">
              <span className="admin-name">Administrator</span>
              <span className="admin-status-text">
                <span className="status-pulse-dot" />
                Signed in
              </span>
            </div>
          )}

          <button
            className="admin-profile-logout-btn"
            onClick={() => window.__doLogout && window.__doLogout()}
            title="Sign out"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
