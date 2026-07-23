import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'

const pageNames = {
  '/admin/dashboard': 'Dashboard',
  '/admin/logs': 'Attack Logs',
  '/admin/rules': 'Rules Management',
  '/admin/clients': 'Clients Management',
  '/admin/blacklist': 'Blacklist Management',
  '/admin/settings': 'Settings',
  '/connect': 'Website Connection',
}

export default function Header({ onToggleSidebar, onLogout }) {
  const [time, setTime] = useState({ date: '', time: '' })
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const location = useLocation()
  const pageName = pageNames[location.pathname] || 'Dashboard'

  const iconMap = {
    '/admin/dashboard': 'fa-chart-pie',
    '/admin/logs': 'fa-list',
    '/admin/rules': 'fa-shield',
    '/admin/clients': 'fa-globe',
    '/admin/blacklist': 'fa-ban',
    '/admin/settings': 'fa-cog',
    '/connect': 'fa-link',
  }

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
    const close = () => { setShowDropdown(false); setShowNotifications(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" id="menuToggle" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="header-title-group">
          <div className="header-page-icon"><i className={`fas ${iconMap[location.pathname] || 'fa-chart-pie'}`}></i></div>
          <div>
            <h1>{pageName}</h1>
            <div className="breadcrumb">
              MDefender / <span>{pageName}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="header-right">
        <span className="header-threat-badge">
          <i className="fas fa-shield-halved"></i> Systems Secure
        </span>
        <div className="header-clock">
          <i className="fas fa-clock"></i>
          <span className="clock-time">{time.time}</span>
          <span className="clock-date">{time.date}</span>
        </div>
        <div className="header-actions">
          <div style={{ position: 'relative' }}>
            <button className="header-action-btn" onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowDropdown(false) }}>
              <i className="fas fa-bell"></i>
              <span className="notif-dot"></span>
            </button>
            <div className={`notification-panel ${showNotifications ? 'show' : ''}`}>
              <div className="panel-header">
                <span>Notifications</span>
                <span className="panel-count">3 new</span>
              </div>
              <div className="panel-item">
                <div className="panel-icon critical"><i className="fas fa-bug"></i></div>
                <div className="panel-body">
                  <div className="panel-text">SQL Injection blocked from 192.168.1.100</div>
                  <div className="panel-meta">2 minutes ago</div>
                </div>
              </div>
              <div className="panel-item">
                <div className="panel-icon warning"><i className="fas fa-bug"></i></div>
                <div className="panel-body">
                  <div className="panel-text">XSS attack detected on /search</div>
                  <div className="panel-meta">5 minutes ago</div>
                </div>
              </div>
              <div className="panel-item">
                <div className="panel-icon success"><i className="fas fa-check-circle"></i></div>
                <div className="panel-body">
                  <div className="panel-text">New client "example.com" connected</div>
                  <div className="panel-meta">1 hour ago</div>
                </div>
              </div>
              <Link to="/admin/logs" className="panel-footer">
                View All <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="user-pill" onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); setShowNotifications(false) }}>
              <div className="avatar">A</div>
              <span className="user-name">Admin</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/admin/settings" onClick={() => setShowDropdown(false)}><i className="fas fa-user"></i> Profile</Link>
              <Link to="/admin/settings" onClick={() => setShowDropdown(false)}><i className="fas fa-cog"></i> Settings</Link>
              <div className="divider"></div>
              <button onClick={onLogout}><i className="fas fa-right-from-bracket"></i> Logout</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
