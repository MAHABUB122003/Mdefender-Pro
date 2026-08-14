import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen }) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <div className="logo">
            <div className="logo-icon"><i className="fas fa-shield-halved"></i></div>
            <div className="logo-text">
              <h2>MDefender</h2>
              <span>Pro WAF</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Main</div>
          <NavLink to="/admin/dashboard">
            <span className="nav-icon"><i className="fas fa-chart-pie"></i></span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/ddos">
            <span className="nav-icon"><i className="fas fa-shield-halved"></i></span>
            <span>DDoS Protection</span>
          </NavLink>
          <NavLink to="/admin/logs">
            <span className="nav-icon"><i className="fas fa-list"></i></span>
            <span>Logs</span>
          </NavLink>
          <NavLink to="/admin/rules">
            <span className="nav-icon"><i className="fas fa-shield"></i></span>
            <span>Rules</span>
          </NavLink>
          <div className="nav-label">Communication</div>
          <NavLink to="/admin/notices">
            <span className="nav-icon"><i className="fas fa-bullhorn"></i></span>
            <span>Notice Board</span>
          </NavLink>
          <div className="nav-label">Management</div>
          <NavLink to="/admin/clients">
            <span className="nav-icon"><i className="fas fa-globe"></i></span>
            <span>Clients</span>
          </NavLink>
          <NavLink to="/admin/blacklist">
            <span className="nav-icon"><i className="fas fa-ban"></i></span>
            <span>Blacklist</span>
          </NavLink>
          <NavLink to="/admin/settings">
            <span className="nav-icon"><i className="fas fa-cog"></i></span>
            <span>Settings</span>
          </NavLink>
          <NavLink to="/connect">
            <span className="nav-icon"><i className="fas fa-link"></i></span>
            <span>Connect</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => window.__doLogout && window.__doLogout()}>
            <i className="fas fa-right-from-bracket"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
