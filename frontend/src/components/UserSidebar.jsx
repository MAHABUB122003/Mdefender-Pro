import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Link2,
  Tag,
  Ban,
  Globe,
  Layers,
  Wrench,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react'

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
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar" style={{ background: '#0c1615', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="sidebar-brand" style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link
            to="/"
            title="Return to Website Homepage"
            className="logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div className="logo-icon" style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="logo-text">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>MDefender</h2>
              <span style={{ fontSize: '10.5px', color: '#E8792F', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase' }}>Enterprise WAF</span>
            </div>
          </Link>
        </div>
        <nav className="sidebar-nav" style={{ padding: '16px 12px' }}>
          <div className="nav-label" style={{ color: '#6A7D78', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>Security Ops</div>
          <NavLink to="/user/dashboard" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={17} />
            </span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/user/logs" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} />
            </span>
            <span>Logs</span>
          </NavLink>
          <NavLink to="/user/rules" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={17} />
            </span>
            <span>Rules</span>
            {!isCustomRulesAllowed && (
              <span className="pro-badge" style={{ background: '#E8792F', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto' }}>
                CORE
              </span>
            )}
          </NavLink>

          <div className="nav-label" style={{ color: '#6A7D78', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', marginTop: '16px' }}>Edge &amp; Config</div>
          <NavLink to="/user/connect" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={17} />
            </span>
            <span>Connect</span>
          </NavLink>
          <NavLink to="/user/pricing" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={17} />
            </span>
            <span>Pricing &amp; Plans</span>
          </NavLink>
          <NavLink to="/user/blacklist" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ban size={17} />
            </span>
            <span>Blacklist</span>
          </NavLink>
          <NavLink to="/user/domains" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={17} />
            </span>
            <span>Domains</span>
          </NavLink>
          <NavLink to="/user/websites" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={17} />
            </span>
            <span>WordPress Sites</span>
          </NavLink>
          <NavLink to="/user/tools" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={17} />
            </span>
            <span>Tools</span>
          </NavLink>
          <NavLink to="/user/settings" style={({ isActive }) => isActive ? { background: 'rgba(232, 121, 47, 0.12)', color: '#F38A3E' } : {}}>
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={17} />
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 14px' }}>
          <div className="sidebar-status" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className={`status-dot ${isPaid ? 'online' : ''}`} style={!isPaid ? { background: '#F59E0B' } : { background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#889895', fontWeight: 500, lineHeight: 1.1 }}>Active Tier</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planName}</span>
            </div>
            {isPaid && <Sparkles size={14} color="#E8792F" />}
          </div>
          <button
            className="logout-btn"
            onClick={() => window.__doLogout && window.__doLogout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'rgba(220, 38, 38, 0.1)',
              color: '#F87171',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12.5px',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
