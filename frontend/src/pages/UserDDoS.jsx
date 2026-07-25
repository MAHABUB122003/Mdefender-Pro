import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'

export default function UserDDoS() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  const totalRequests = data?.total_requests || 0
  const totalBlocked = data?.total_blocked || 0
  const websites = data?.websites || []
  const threatLevel = totalBlocked > 100 ? 'High' : totalBlocked > 20 ? 'Medium' : 'Low'
  const threatColor = totalBlocked > 100 ? '#ef4444' : totalBlocked > 20 ? '#f59e0b' : '#10b981'
  const threatBg = totalBlocked > 100 ? '#fef2f2' : totalBlocked > 20 ? '#fffbeb' : '#ecfdf5'

  const features = [
    { name: 'Rate Limiting', icon: 'fa-gauge-high', enabled: true, desc: 'Protects against request flooding', color: '#2563eb' },
    { name: 'IP Reputation', icon: 'fa-fingerprint', enabled: true, desc: 'Tracks and scores IP behavior', color: '#8b5cf6' },
    { name: 'Bot Protection', icon: 'fa-robot', enabled: true, desc: 'Detects automated threats', color: '#10b981' },
    { name: 'DDoS Shield', icon: 'fa-shield-halved', enabled: true, desc: 'Real-time attack mitigation', color: '#ef4444' },
    { name: 'Geo Blocking', icon: 'fa-earth-americas', enabled: false, desc: 'Block traffic by region', color: '#f59e0b' },
    { name: 'CAPTCHA Challenge', icon: 'fa-circle-check', enabled: true, desc: 'Verify human visitors', color: '#06b6d4' },
  ]

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '14px', padding: '24px', marginBottom: '24px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40%', left: '-20%', width: '140%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>DDoS Protection</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Your websites are protected by MDefender</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-circle" style={{ fontSize: '7px', color: '#10b981' }}></i> Protected
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-wrap blue"><i className="fas fa-chart-line"></i></div></div>
          <div className="stat-number">{totalRequests.toLocaleString()}</div>
          <div className="stat-label">Total Requests</div>
          <div className="stat-trend up"><i className="fas fa-arrow-up"></i> cumulative</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-wrap red"><i className="fas fa-shield-halved"></i></div></div>
          <div className="stat-number">{totalBlocked.toLocaleString()}</div>
          <div className="stat-label">Attacks Blocked</div>
          <div className="stat-trend up"><i className="fas fa-arrow-up"></i> protected</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrap" style={{ background: threatBg, color: threatColor }}><i className="fas fa-triangle-exclamation"></i></div>
          </div>
          <div className="stat-number" style={{ color: threatColor }}>{threatLevel}</div>
          <div className="stat-label">Threat Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-wrap green"><i className="fas fa-globe"></i></div></div>
          <div className="stat-number">{websites.length}</div>
          <div className="stat-label">Protected Sites</div>
          <div className="stat-trend up"><i className="fas fa-arrow-up"></i> active</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '18px',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            animation: `fadeInUp 0.5s ease forwards`, animationDelay: `${i * 0.05}s`, opacity: 0,
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${f.color}15`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              <i className={`fas ${f.icon}`}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{f.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', background: f.enabled ? '#ecfdf5' : '#f1f5f9', color: f.enabled ? '#059669' : '#94a3b8' }}>
                  {f.enabled ? 'Active' : 'Off'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="quick-actions-section">
        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3><i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Quick Actions</h3>
          </div>
          <div className="quick-actions-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[
              { icon: 'fa-list', label: 'View Logs', color: '#2563eb', action: () => navigate('/user/logs') },
              { icon: 'fa-globe', label: 'Websites', color: '#10b981', action: () => navigate('/user/websites') },
              { icon: 'fa-ban', label: 'Block IP', color: '#ef4444', action: () => navigate('/user/blacklist') },
              { icon: 'fa-link', label: 'Connect', color: '#8b5cf6', action: () => navigate('/user/connect') },
            ].map((item, i) => (
              <button key={i} className="quick-action" onClick={item.action}>
                <div className="qa-icon" style={{ background: `${item.color}15`, color: item.color }}><i className={`fas ${item.icon}`}></i></div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3><i className="fas fa-server" style={{ color: '#10b981', marginRight: '6px' }}></i> Protection Health</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'WAF Engine', status: 'Active', color: '#10b981' },
              { label: 'Rate Limiter', status: 'Active', color: '#10b981' },
              { label: 'DDoS Shield', status: 'Active', color: '#10b981' },
              { label: 'Bot Detection', status: 'Active', color: '#10b981' },
              { label: 'Database', status: 'Connected', color: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>{item.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}40` }}></span> {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
