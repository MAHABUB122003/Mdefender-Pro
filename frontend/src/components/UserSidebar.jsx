import { NavLink } from 'react-router-dom'

export default function UserSidebar({ isOpen }) {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

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
          <NavLink to="/user/dashboard">
            <span className="nav-icon"><i className="fas fa-chart-pie"></i></span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/user/logs" className={!isPremium ? 'premium-nav' : ''}>
            <span className="nav-icon"><i className="fas fa-list"></i></span>
            <span>Logs</span>
            {!isPremium && <span className="pro-badge">PRO</span>}
          </NavLink>
          <NavLink to="/user/rules" className={!isPremium ? 'premium-nav' : ''}>
            <span className="nav-icon"><i className="fas fa-shield"></i></span>
            <span>Rules</span>
            {!isPremium && <span className="pro-badge">PRO</span>}
          </NavLink>
          <div className="nav-label">Finance</div>
          <NavLink to="/user/finance">
            <span className="nav-icon"><i className="fas fa-money-bill-wave"></i></span>
            <span>Finance</span>
          </NavLink>
          <div className="nav-label">Management</div>
          <NavLink to="/user/connect">
            <span className="nav-icon"><i className="fas fa-link"></i></span>
            <span>Connect</span>
          </NavLink>
          <NavLink to="/user/blacklist">
            <span className="nav-icon"><i className="fas fa-ban"></i></span>
            <span>Blacklist</span>
          </NavLink>
          <NavLink to="/user/websites">
            <span className="nav-icon"><i className="fas fa-globe"></i></span>
            <span>Websites</span>
          </NavLink>
          <NavLink to="/user/settings">
            <span className="nav-icon"><i className="fas fa-cog"></i></span>
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className={`status-dot ${isPremium ? 'online' : ''}`} style={!isPremium ? { background: '#f59e0b' } : {}}></span>
            <span>{isPremium ? 'Premium Plan' : 'Free Plan'}</span>
          </div>
          <button className="logout-btn" onClick={() => window.__doLogout && window.__doLogout()}>
            <i className="fas fa-right-from-bracket"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
