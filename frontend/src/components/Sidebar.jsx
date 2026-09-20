import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen }) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <div className="logo">
            <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #7c3aed)' }}>
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="logo-text">
              <h2>MDefender</h2>
              <span style={{ color: '#ef4444', fontWeight: '800' }}>SUPER ADMIN</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Platform Control</div>
          <NavLink to="/admin/dashboard">
            <span className="nav-icon"><i className="fas fa-chart-pie"></i></span>
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-label">Users & Revenue</div>
          <NavLink to="/admin/users">
            <span className="nav-icon"><i className="fas fa-users-gear"></i></span>
            <span>Users & Support</span>
          </NavLink>
          <NavLink to="/admin/pricing">
            <span className="nav-icon"><i className="fas fa-tags"></i></span>
            <span>Pricing & Tiers</span>
          </NavLink>
          <NavLink to="/admin/clients">
            <span className="nav-icon"><i className="fas fa-globe"></i></span>
            <span>Tenant Websites</span>
          </NavLink>

          <div className="nav-label">WAF Security Engine</div>
          <NavLink to="/admin/ddos">
            <span className="nav-icon"><i className="fas fa-shield-halved"></i></span>
            <span>DDoS Shield</span>
          </NavLink>
          <NavLink to="/admin/logs">
            <span className="nav-icon"><i className="fas fa-list"></i></span>
            <span>Global Logs</span>
          </NavLink>
          <NavLink to="/admin/rules">
            <span className="nav-icon"><i className="fas fa-shield"></i></span>
            <span>WAF Rules</span>
          </NavLink>
          <NavLink to="/admin/blacklist">
            <span className="nav-icon"><i className="fas fa-ban"></i></span>
            <span>IP Blacklist</span>
          </NavLink>

          <div className="nav-label">Platform Admin</div>
          <NavLink to="/admin/notices">
            <span className="nav-icon"><i className="fas fa-bullhorn"></i></span>
            <span>Notice Broadcast</span>
          </NavLink>
          <NavLink to="/admin/settings">
            <span className="nav-icon"><i className="fas fa-cog"></i></span>
            <span>System Settings</span>
          </NavLink>
          <NavLink to="/connect">
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
