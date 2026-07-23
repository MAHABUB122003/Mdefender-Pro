import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/api'

const s = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(15,23,42,0.95)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  topbarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#fff',
  },
  topbarIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  topbarUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  content: {
    padding: '32px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    transition: 'all 0.3s',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    marginBottom: '16px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    marginBottom: '32px',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  badge: (color) => ({
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    background: `${color}18`,
    color: color,
  }),
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  btn: (bg, color) => ({
    padding: '8px 16px',
    background: bg,
    color: color,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  }),
  apiKeyBox: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '12px',
  },
  apiKeyValue: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#a5b4fc',
    fontSize: '13px',
    fontFamily: "'Fira Code', Consolas, monospace",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  websiteItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  removeBtn: {
    padding: '4px 10px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const token = localStorage.getItem('mdefender_user_token')

  useEffect(() => {
    if (!token) {
      navigate('/user/login')
      return
    }
    fetchData()
  }, [token, navigate])

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
    } catch (err) {
      console.error(err)
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('mdefender_user_token')
        navigate('/user/login')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('mdefender_user_token')
    navigate('/user/login')
  }

  const handleAddWebsite = async (e) => {
    e.preventDefault()
    if (!newWebsite.trim()) return
    setAdding(true)
    try {
      await api.addUserWebsite({ domain: newWebsite.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') })
      setNewWebsite('')
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to add website')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveWebsite = async (id) => {
    if (!confirm('Remove this website?')) return
    try {
      await api.removeUserWebsite(id)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to remove website')
    }
  }

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerate API key? Your old key will stop working immediately.')) return
    try {
      await api.regenerateApiKey()
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to regenerate key')
    }
  }

  const copyApiKey = () => {
    if (data?.api_key) {
      navigator.clipboard.writeText(data.api_key)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#667eea' }}></i>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <style>{`
        .udash-card:hover { border-color: rgba(102,126,234,0.2); }
        .udash-remove:hover { background: rgba(239,68,68,0.2) !important; }
        @media (max-width: 1024px) {
          .udash-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .udash-section { grid-template-columns: 1fr !important; }
          .udash-content { padding: 24px 20px !important; }
        }
        @media (max-width: 768px) {
          .udash-topbar { padding: 12px 16px !important; flex-wrap: wrap; gap: 10px; }
          .udash-topbar-right { gap: 10px !important; }
          .udash-topbar-user span { display: none; }
          .udash-content { padding: 16px !important; }
          .udash-stats { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .udash-table-wrap { overflow-x: auto; }
        }
        @media (max-width: 480px) {
          .udash-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Top Bar */}
      <div style={s.topbar} className="udash-topbar">
        <Link to="/" style={s.topbarLogo}>
          <div style={s.topbarIcon}>
            <i className="fas fa-shield-halved" style={{ color: '#fff' }}></i>
          </div>
          <span style={{ fontSize: '17px', fontWeight: '700' }}>MDefender Pro</span>
        </Link>
        <div style={s.topbarRight} className="udash-topbar-right">
          <div style={s.topbarUser}>
            <i className="fas fa-user-circle" style={{ fontSize: '16px', color: '#667eea' }}></i>
            {data?.user?.name || data?.user?.email || 'User'}
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <i className="fas fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </div>

      <div style={s.content} className="udash-content">
        {/* Stats */}
        <div style={s.statsGrid} className="udash-stats">
          <div style={s.statCard} className="udash-card">
            <div style={{ ...s.statIcon, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <i className="fas fa-chart-bar"></i>
            </div>
            <div style={s.statValue}>{data?.requests_today?.toLocaleString() || '0'}</div>
            <div style={s.statLabel}>Requests Today</div>
          </div>
          <div style={s.statCard} className="udash-card">
            <div style={{ ...s.statIcon, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <i className="fas fa-globe"></i>
            </div>
            <div style={s.statValue}>{data?.total_requests?.toLocaleString() || '0'}</div>
            <div style={s.statLabel}>Total Requests</div>
          </div>
          <div style={s.statCard} className="udash-card">
            <div style={{ ...s.statIcon, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              <i className="fas fa-shield-halved"></i>
            </div>
            <div style={s.statValue}>{data?.total_blocked?.toLocaleString() || '0'}</div>
            <div style={s.statLabel}>Total Blocked</div>
          </div>
          <div style={s.statCard} className="udash-card">
            <div style={{ ...s.statIcon, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
              <i className="fas fa-server"></i>
            </div>
            <div style={s.statValue}>{data?.active_websites || 0}</div>
            <div style={s.statLabel}>Active Websites</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={s.sectionGrid} className="udash-section">
          {/* Recent Activity */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>
                <i className="fas fa-clock-rotate-left" style={{ color: '#f59e0b' }}></i>
                Recent Activity
              </div>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Time</th>
                  <th style={s.th}>IP Address</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>URL</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_activity?.length ? data.recent_activity.slice(0, 10).map((log, i) => (
                  <tr key={i}>
                    <td style={s.td}>{log.timestamp || log.time || '—'}</td>
                    <td style={{ ...s.td, fontFamily: "'Fira Code', Consolas, monospace", fontSize: '12px' }}>{log.ip}</td>
                    <td style={s.td}>
                      <span style={s.badge(log.attack_type === 'SQL Injection' || log.attack_type === 'SQLi' ? '#ef4444' : log.attack_type === 'XSS' ? '#f59e0b' : '#3b82f6')}>
                        {log.attack_type}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.url}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ ...s.td, textAlign: 'center', color: '#64748b', padding: '32px' }}>
                      <i className="fas fa-shield-check" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}></i>
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Account Info */}
          <div>
            {/* API Key */}
            <div style={{ ...s.card, marginBottom: '24px' }}>
              <div style={s.cardHeader}>
                <div style={s.cardTitle}>
                  <i className="fas fa-key" style={{ color: '#a78bfa' }}></i>
                  API Key
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>Use this key to integrate MDefender into your application.</p>
              <div style={s.apiKeyValue}>
                {data?.api_key ? data.api_key.slice(0, 12) + '••••••••••••' : 'No key generated'}
              </div>
              <div style={s.apiKeyBox}>
                <button onClick={copyApiKey} style={s.btn('rgba(102,126,234,0.15)', '#a5b4fc')}>
                  <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={handleRegenerateKey} style={s.btn('rgba(245,158,11,0.15)', '#f59e0b')}>
                  <i className="fas fa-arrow-rotate-right"></i> Regenerate
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardTitle}>
                  <i className="fas fa-user-circle" style={{ color: '#3b82f6' }}></i>
                  Account Info
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Name</span>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{data?.user?.name || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Email</span>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{data?.user?.email || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Plan</span>
                  <span style={{ fontSize: '13px', color: data?.user?.plan === 'premium' ? '#a5b4fc' : '#94a3b8', fontWeight: '600' }}>
                    {(data?.user?.plan || 'free').toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Member Since</span>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{data?.user?.created_at || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Websites Section */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>
              <i className="fas fa-globe" style={{ color: '#10b981' }}></i>
              My Websites
            </div>
          </div>
          <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="example.com"
              value={newWebsite}
              onChange={e => setNewWebsite(e.target.value)}
              style={{ ...s.input, flex: 1 }}
              required
            />
            <button type="submit" disabled={adding} style={s.btn('linear-gradient(135deg, #667eea, #764ba2)', '#fff')}>
              <i className={`fas ${adding ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i> Add Website
            </button>
          </form>
          <div>
            {data?.websites?.length ? data.websites.map((w, i) => (
              <div key={i} style={s.websiteItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-globe" style={{ color: '#10b981', fontSize: '14px' }}></i>
                  <div>
                    <span style={{ fontSize: '14px', display: 'block' }}>{w.domain || w.url || w}</span>
                    {w.added_at && <span style={{ fontSize: '11px', color: '#64748b' }}>Added {w.added_at}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    {w.status || 'active'}
                  </span>
                  <button onClick={() => handleRemoveWebsite(w.id)} style={s.removeBtn} className="udash-remove">
                    <i className="fas fa-trash-can"></i> Remove
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '32px', fontSize: '13px' }}>
                <i className="fas fa-globe" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}></i>
                No websites added yet. Add your first website above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
