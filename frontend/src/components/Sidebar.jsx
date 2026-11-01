import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen }) {
  const prefetch = (page) => {
    try {
      if (page === 'dashboard') import('../pages/Dashboard')
      else if (page === 'users') import('../pages/AdminUsers')
      else if (page === 'pricing') import('../pages/AdminPricing')
      else if (page === 'clients') import('../pages/Clients')
      else if (page === 'learning') import('../pages/AttackLearning')
      else if (page === 'ddos') import('../pages/DDoSDashboard')
      else if (page === 'logs') import('../pages/Logs')
      else if (page === 'rules') import('../pages/Rules')
      else if (page === 'blacklist') import('../pages/Blacklist')
      else if (page === 'settings') import('../pages/Settings')
      else if (page === 'connect') import('../pages/Connect')
    } catch {}
  }

  useEffect(() => {
    const idlePrefetch = () => {
      prefetch('dashboard')
      prefetch('users')
      prefetch('pricing')
      prefetch('clients')
      prefetch('logs')
      prefetch('rules')
      prefetch('learning')
      prefetch('ddos')
      prefetch('blacklist')
      prefetch('settings')
    }
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(idlePrefetch, { timeout: 1500 })
      } else {
        setTimeout(idlePrefetch, 250)
      }
    }
  }, [])

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div className="logo-icon" style={{ width: '36px', height: '36px', borderRadius: '9px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="logo-text">
              <h2>MDefender</h2>
              <span style={{ color: '#ef4444', fontWeight: '800' }}>SUPER ADMIN</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Platform Control</div>
          <NavLink to="/admin/dashboard" onMouseEnter={() => prefetch('dashboard')} onFocus={() => prefetch('dashboard')}>
            <span className="nav-icon"><i className="fas fa-chart-pie"></i></span>
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-label">Users & Revenue</div>
          <NavLink to="/admin/users" onMouseEnter={() => prefetch('users')} onFocus={() => prefetch('users')}>
            <span className="nav-icon"><i className="fas fa-users-gear"></i></span>
            <span>Users & Support</span>
          </NavLink>
          <NavLink to="/admin/pricing" onMouseEnter={() => prefetch('pricing')} onFocus={() => prefetch('pricing')}>
            <span className="nav-icon"><i className="fas fa-tags"></i></span>
            <span>Pricing & Tiers</span>
          </NavLink>
          <NavLink to="/admin/clients" onMouseEnter={() => prefetch('clients')} onFocus={() => prefetch('clients')}>
            <span className="nav-icon"><i className="fas fa-globe"></i></span>
            <span>Tenant Websites</span>
          </NavLink>

          <div className="nav-label">WAF Security Engine</div>
          <NavLink to="/admin/learning" onMouseEnter={() => prefetch('learning')} onFocus={() => prefetch('learning')}>
            <span className="nav-icon"><i className="fas fa-brain"></i></span>
            <span>Attack Learning Lab</span>
          </NavLink>
          <NavLink to="/admin/ddos" onMouseEnter={() => prefetch('ddos')} onFocus={() => prefetch('ddos')}>
            <span className="nav-icon"><i className="fas fa-shield-halved"></i></span>
            <span>DDoS Shield</span>
          </NavLink>
          <NavLink to="/admin/logs" onMouseEnter={() => prefetch('logs')} onFocus={() => prefetch('logs')}>
            <span className="nav-icon"><i className="fas fa-list"></i></span>
            <span>Global Logs</span>
          </NavLink>
          <NavLink to="/admin/rules" onMouseEnter={() => prefetch('rules')} onFocus={() => prefetch('rules')}>
            <span className="nav-icon"><i className="fas fa-shield"></i></span>
            <span>WAF Rules</span>
          </NavLink>
          <NavLink to="/admin/blacklist" onMouseEnter={() => prefetch('blacklist')} onFocus={() => prefetch('blacklist')}>
            <span className="nav-icon"><i className="fas fa-ban"></i></span>
            <span>IP Blacklist</span>
          </NavLink>

          <div className="nav-label">Platform Admin</div>
          <NavLink to="/admin/settings" onMouseEnter={() => prefetch('settings')} onFocus={() => prefetch('settings')}>
            <span className="nav-icon"><i className="fas fa-cog"></i></span>
            <span>System Settings</span>
          </NavLink>
          <NavLink to="/connect" onMouseEnter={() => prefetch('connect')} onFocus={() => prefetch('connect')}>
            <span className="nav-icon"><i className="fas fa-link"></i></span>
            <span>Connect Node</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => window.__doLogout && window.__doLogout()}>
            <i className="fas fa-right-from-bracket"></i>
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>
    </>
  )
}
