import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'

const pageNames = {
  '/user/dashboard': 'Dashboard',
  '/user/logs': 'Attack Logs',
  '/user/rules': 'Rules Management',
  '/user/notices': 'Notice Board',
  '/user/websites': 'My Websites',
  '/user/settings': 'Settings',
}

const iconMap = {
  '/user/dashboard': 'fa-chart-pie',
  '/user/logs': 'fa-list',
  '/user/rules': 'fa-shield',
  '/user/notices': 'fa-bullhorn',
  '/user/websites': 'fa-globe',
  '/user/settings': 'fa-cog',
}

export default function UserHeader({ onToggleSidebar, onLogout }) {
  const [time, setTime] = useState({ date: '', time: '' })
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const storedName = localStorage.getItem('mdefender_user_name') || 'User'
  const userName = storedName
  const location = useLocation()
  const pageName = pageNames[location.pathname] || 'Dashboard'
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

  useEffect(() => {
    window.__doLogout = onLogout
  }, [onLogout])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      setTime({
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => { clearInterval(id); delete window.__doLogout }
  }, [])

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
        <span className="header-threat-badge" style={isPremium ? {} : { background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderColor: '#fde68a', color: '#d97706' }}>
          <i className={`fas ${isPremium ? 'fa-shield-halved' : 'fa-crown'}`}></i> {isPremium ? 'Premium' : 'Free Plan'}
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
                <span className="panel-count">0 new</span>
              </div>
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                <i className="fas fa-bell-slash" style={{ fontSize: '20px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                No new notifications
              </div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="user-pill" onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); setShowNotifications(false) }}>
              <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
              <span className="user-name">{userName}</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/user/settings" onClick={() => setShowDropdown(false)}><i className="fas fa-user"></i> Profile</Link>
              <Link to="/user/settings" onClick={() => setShowDropdown(false)}><i className="fas fa-cog"></i> Settings</Link>
              <div className="divider"></div>
              <button onClick={onLogout}><i className="fas fa-right-from-bracket"></i> Logout</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
