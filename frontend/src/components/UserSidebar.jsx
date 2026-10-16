import { NavLink } from 'react-router-dom'

export default function UserSidebar({ isOpen }) {
  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase()
  const isPaid = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)
  const isCustomRulesAllowed = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)

  const planName = {
    free: 'Starter Free',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise'
  }[userPlan] || (isPaid ? 'Premium Plan' : 'Starter Free')

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-icon" style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(99,102,241,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#070b14'
            }}>
              <picture>
                <source srcSet="/assets/mdefender_logo.webp" type="image/webp" />
                <img src="/assets/mdefender_logo.jpg" alt="MDefender" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="eager" decoding="async" />
              </picture>
            </div>
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
          <NavLink to="/user/logs">
            <span className="nav-icon"><i className="fas fa-list"></i></span>
            <span>Logs</span>
          </NavLink>
          <NavLink to="/user/rules">
            <span className="nav-icon"><i className="fas fa-shield"></i></span>
            <span>Rules</span>
            {!isCustomRulesAllowed && <span className="pro-badge" style={{ background: '#f59e0b', color: '#fff', fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px' }}>CORE</span>}
          </NavLink>
          <div className="nav-label">Management</div>
          <NavLink to="/user/connect">
            <span className="nav-icon"><i className="fas fa-link"></i></span>
            <span>Connect</span>
          </NavLink>
          <NavLink to="/user/pricing">
            <span className="nav-icon"><i className="fas fa-tags"></i></span>
            <span>Pricing &amp; Plans</span>
          </NavLink>
          <NavLink to="/user/blacklist">
            <span className="nav-icon"><i className="fas fa-ban"></i></span>
            <span>Blacklist</span>
          </NavLink>
          <NavLink to="/user/domains">
            <span className="nav-icon"><i className="fas fa-network-wired"></i></span>
            <span>Domains</span>
          </NavLink>
          <NavLink to="/user/websites">
            <span className="nav-icon"><i className="fab fa-wordpress"></i></span>
            <span>WordPress Sites</span>
          </NavLink>
          <NavLink to="/user/tools">
            <span className="nav-icon"><i className="fas fa-screwdriver-wrench"></i></span>
            <span>Tools</span>
          </NavLink>
          <NavLink to="/user/settings">
            <span className="nav-icon"><i className="fas fa-cog"></i></span>
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className={`status-dot ${isPaid ? 'online' : ''}`} style={!isPaid ? { background: '#f59e0b' } : {}}></span>
            <span style={{ fontSize: '12px', fontWeight: '700' }}>{planName}</span>
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
