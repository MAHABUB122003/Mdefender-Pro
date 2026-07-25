import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import api from '../api/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const doughnutColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const DDOS_FEATURES = [
  { icon: 'fa-bolt', name: 'Rate Limiting', desc: 'Sliding window per-user rate limits', color: '#2563eb' },
  { icon: 'fa-chart-line', name: 'Traffic Monitoring', desc: 'Real-time traffic analysis & stats', color: '#10b981' },
  { icon: 'fa-user-secret', name: 'Behavioral Analysis', desc: 'Detect abnormal browsing patterns', color: '#8b5cf6' },
  { icon: 'fa-shield-halved', name: 'IP Reputation', desc: 'Auto-score & block malicious IPs', color: '#ef4444' },
  { icon: 'fa-gauge-high', name: 'Burst Detection', desc: 'Identify sudden traffic spikes', color: '#f59e0b' },
  { icon: 'fa-layer-group', name: 'Progressive Blocking', desc: 'Throttle → block → permanent ban', color: '#ec4899' },
  { icon: 'fa-fingerprint', name: 'Request Fingerprinting', desc: 'Track attackers across IPs', color: '#14b8a6' },
  { icon: 'fa-user-tag', name: 'UA Analysis', desc: 'Block bots, scanners & attack tools', color: '#f97316' },
  { icon: 'fa-code', name: 'JS Challenge', desc: 'JavaScript & CAPTCHA verification', color: '#6366f1' },
]

function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const startTime = performance.now()
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(step)
      else setValue(target)
    }
    ref.current = requestAnimationFrame(step)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])
  return value.toLocaleString()
}

function StatCard({ icon, iconClass, value, label, trend, trendDir }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon-wrap ${iconClass}`}><i className={`fas ${icon}`}></i></div>
      </div>
      <div className="stat-number">{animated}</div>
      <div className="stat-label">{label}</div>
      <div className={`stat-trend ${trendDir}`}><i className={`fas fa-arrow-${trendDir}`}></i> {trend}</div>
    </div>
  )
}

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <div className="qa-icon" style={{ background: `${color}15`, color }}><i className={`fas ${icon}`}></i></div>
      <span>{label}</span>
    </button>
  )
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [ddosEnabled, setDdosEnabled] = useState(true)
  const [ddosToggling, setDdosToggling] = useState(false)
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
      if (result?.user?.name) localStorage.setItem('mdefender_user_name', result.user.name)
      if (result?.user?.plan) localStorage.setItem('mdefender_user_plan', result.user.plan)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    api.getDdosStatus().then(r => setDdosEnabled(r.ddos_enabled ?? true)).catch(() => {})
  }, [fetchData])

  const handleDdosToggle = async () => {
    setDdosToggling(true)
    try {
      const newState = !ddosEnabled
      await api.toggleDdos(newState)
      setDdosEnabled(newState)
    } catch (err) {
      alert(err.message || 'Failed to toggle DDoS protection')
    } finally {
      setDdosToggling(false)
    }
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

  const blockTopIP = async (ip) => {
    if (!isPremium) { alert('Upgrade to Premium to block IPs'); return }
    if (confirm(`Block ${ip}?`)) {
      try { await api.userBlockIP(ip, 'Blocked from dashboard'); fetchData() } catch (e) { alert(e.message) }
    }
  }

  const attackChartData = {
    labels: data?.attack_types?.length ? data.attack_types : ['SQL Injection', 'XSS', 'LFI', 'RCE', 'Other'],
    datasets: [{
      data: data?.attack_counts?.length ? data.attack_counts : [0, 0, 0, 0, 0],
      backgroundColor: doughnutColors,
      borderWidth: 0,
      hoverOffset: 8
    }]
  }

  const dailyDays = []
  const dailyCounts = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dailyDays.push(d.toLocaleDateString('en', { weekday: 'short' }))
    dailyCounts.push(data?.daily_requests?.[i] || 0)
  }

  const dailyChartData = {
    labels: dailyDays,
    datasets: [{
      label: 'Requests',
      data: dailyCounts,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#0f172a', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8,
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0'
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`
          }
        }
      }
    },
    animation: { animateRotate: true, duration: 1000 }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8, intersect: false, mode: 'index' } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }
    },
    interaction: { intersect: false, mode: 'index' },
    animation: { duration: 1200, easing: 'easeInOutQuart' }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  return (
    <>
      {/* User Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '24px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700',
          }}>
            {(data?.user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>Welcome back, {data?.user?.name || 'User'}</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{data?.user?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
            background: isPremium ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <i className={`fas ${isPremium ? 'fa-crown' : 'fa-star'}`} style={{ marginRight: '6px' }}></i>
            {(data?.user?.plan || 'free').toUpperCase()} PLAN
          </span>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>Since {data?.user?.created_at || 'N/A'}</span>
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1px solid #f59e0b',
          borderRadius: '14px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', background: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff',
            }}>
              <i className="fas fa-crown"></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>Upgrade to Premium</div>
              <div style={{ fontSize: '12px', color: '#a16207' }}>Unlock Attack Logs, WAF Rules, unlimited websites & more</div>
            </div>
          </div>
          <Link to="/user/settings" style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
          }}>
            <i className="fas fa-arrow-up"></i> Upgrade Now
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon="fa-chart-line" iconClass="blue" value={data?.requests_today || 0} label="Requests Today" trend="active" trendDir="up" />
        <StatCard icon="fa-globe" iconClass="green" value={data?.total_requests || 0} label="Total Requests" trend="cumulative" trendDir="up" />
        <StatCard icon="fa-shield-halved" iconClass="red" value={data?.total_blocked || 0} label="Attacks Blocked" trend="protected" trendDir="up" />
        <StatCard icon="fa-server" iconClass="purple" value={data?.active_websites || 0} label="Active Websites" trend="online" trendDir="up" />
      </div>

      {/* DDoS Protection Section */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '24px',
        border: ddosEnabled ? '1px solid #d1fae5' : '1px solid #fecaca',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: ddosEnabled ? '#ecfdf5' : '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                color: ddosEnabled ? '#10b981' : '#ef4444',
              }}>
                <i className={`fas ${ddosEnabled ? 'fa-shield-halved' : 'fa-shield-slash'}`}></i>
              </div>
              <div>
                <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '700', margin: 0 }}>DDoS Protection</h3>
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: ddosEnabled ? '#10b981' : '#ef4444',
                }}>
                  {ddosEnabled ? 'Active & Protecting' : 'Disabled'}
                </span>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 56px', lineHeight: '1.5' }}>
              {ddosEnabled
                ? 'Your websites are protected against DDoS attacks, traffic floods, and malicious bots in real-time.'
                : 'Your websites are NOT protected from DDoS attacks. Enable protection to stay safe.'}
            </p>
          </div>
          <button
            onClick={handleDdosToggle}
            disabled={ddosToggling}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: ddosToggling ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: ddosEnabled
                ? '#fef2f2'
                : '#ecfdf5',
              color: ddosEnabled ? '#ef4444' : '#10b981',
              minWidth: '140px',
              justifyContent: 'center',
            }}
          >
            <i className={`fas ${ddosToggling ? 'fa-spinner fa-spin' : ddosEnabled ? 'fa-power-off' : 'fa-shield-halved'}`}></i>
            {ddosToggling ? 'Updating...' : ddosEnabled ? 'Turn Off' : 'Turn On'}
          </button>
        </div>

        {/* DDoS Feature Tags */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          marginTop: '20px', paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
        }}>
          {DDOS_FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              background: ddosEnabled ? '#f8fafc' : '#f8fafc',
              border: '1px solid #e2e8f0',
              opacity: ddosEnabled ? 1 : 0.5,
              transition: 'all 0.2s',
            }}>
              <i className={`fas ${f.icon}`} style={{ color: ddosEnabled ? f.color : '#94a3b8', fontSize: '11px' }}></i>
              <span style={{ color: ddosEnabled ? '#334155' : '#94a3b8', fontSize: '11px', fontWeight: '500' }}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className={`chart-card ${!isPremium ? 'premium-blur' : ''}`}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie" style={{ color: '#2563eb', marginRight: '6px' }}></i> Attack Types</h3>
            <span className="chart-action">Distribution</span>
          </div>
          <div className="chart-container">
            <Doughnut data={attackChartData} options={doughnutOptions} />
          </div>
          {!isPremium && (
            <div className="premium-overlay-small">
              <Link to="/pricing" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to Premium</Link>
            </div>
          )}
        </div>
        <div className={`chart-card ${!isPremium ? 'premium-blur' : ''}`}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-bar" style={{ color: '#10b981', marginRight: '6px' }}></i> Requests Over Time</h3>
            <span className="chart-action">Last 7 days</span>
          </div>
          <div className="chart-container">
            <Line data={dailyChartData} options={lineOptions} />
          </div>
          {!isPremium && (
            <div className="premium-overlay-small">
              <Link to="/pricing" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to Premium</Link>
            </div>
          )}
        </div>
      </div>

      {/* Top Attackers */}
      <div className={`top-attackers ${!isPremium ? 'premium-blur' : ''}`}>
        <div className="section-header">
          <h3><i className="fas fa-crosshairs" style={{ color: '#ef4444', marginRight: '6px' }}></i> Top Attacking IPs</h3>
          {isPremium && <Link to="/user/logs" className="view-all">View All <i className="fas fa-arrow-right"></i></Link>}
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>IP Address</th><th>Attacks</th><th>Action</th></tr>
          </thead>
          <tbody>
            {data?.top_attackers?.slice(0, 5).map((attacker, i) => {
              const maxAttacks = data.top_attackers[0]?.count || 1
              return (
                <tr key={i}>
                  <td><span className={`rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>{i + 1}</span></td>
                  <td><span className="attacker-ip">{attacker.ip}</span></td>
                  <td>
                    <div className="attack-progress">
                      <div className="progress-bar">
                        <div className="fill" style={{
                          width: `${(attacker.count / maxAttacks * 100)}%`,
                          background: i === 0 ? 'linear-gradient(90deg,#ef4444,#f87171)' : i === 1 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#2563eb,#60a5fa)'
                        }}></div>
                      </div>
                      <span className="count">{attacker.count}</span>
                    </div>
                  </td>
                  <td>
                    <button className="badge danger" style={{ cursor: 'pointer', border: 'none' }} onClick={() => blockTopIP(attacker.ip)}>
                      {isPremium ? 'Block' : 'PRO'}
                    </button>
                  </td>
                </tr>
              )
            }) || (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No attack data available</td></tr>
            )}
          </tbody>
        </table>
        {!isPremium && <div className="premium-overlay-small"><Link to="/pricing" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to Premium to view attacker details</Link></div>}
      </div>

      {/* Recent Activity */}
      <div className={`recent-activity ${!isPremium ? 'premium-blur' : ''}`}>
        <div className="section-header">
          <h3><i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> Recent Attacks Blocked</h3>
          {isPremium && <Link to="/user/logs" className="view-all">View All <i className="fas fa-arrow-right"></i></Link>}
        </div>
        <div className="activity-timeline">
          {data?.recent_activity?.slice(0, 5).map((log, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-time">{log.timestamp || log.time || ''}</div>
              <div className="activity-content">
                <span className={`activity-type ${log.attack_type === 'SQL Injection' || log.attack_type === 'SQLi' ? 'critical' : log.attack_type === 'XSS' || log.attack_type === 'LFI' ? 'high' : 'medium'}`}>
                  <i className="fas fa-bug"></i> {log.attack_type}
                </span>
                <div className="activity-detail">From <strong>{log.ip}</strong></div>
                <div className="activity-payload">{log.url}</div>
              </div>
            </div>
          )) || (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
              <i className="fas fa-shield-check" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
              No attacks recorded yet
            </div>
          )}
        </div>
        {!isPremium && <div className="premium-overlay-small"><Link to="/pricing" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to Premium for full attack history</Link></div>}
      </div>

      {/* Quick Actions & System Status */}
      <div className="quick-actions-section">
        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
             <QuickAction icon="fa-globe" label="Add Website" color="#10b981" onClick={() => navigate('/user/websites')} />
            <QuickAction icon="fa-key" label="Copy API Key" color="#8b5cf6" onClick={copyApiKey} />
             <QuickAction icon="fa-link" label="Connect" color="#2563eb" onClick={() => navigate('/user/connect')} />
             <QuickAction icon="fa-money-bill-wave" label="Finance" color="#10b981" onClick={() => navigate('/user/finance')} />
             <QuickAction icon="fa-ban" label="Blacklist" color="#ef4444" onClick={() => navigate('/user/blacklist')} />
             <QuickAction icon="fa-cog" label="Settings" color="#64748b" onClick={() => navigate('/user/settings')} />
          </div>
        </div>

        <div className="system-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-server" style={{ color: '#10b981', marginRight: '6px' }}></i> System Status</h3>
            <span className="status-pill online"><i className="fas fa-circle" style={{ fontSize: '7px' }}></i> Operational</span>
          </div>
          <div className="system-grid">
            <div className="system-item">
              <span className="system-label">DDoS Protection</span>
              <span className="system-status"><span className={`status-dot ${ddosEnabled ? 'green' : ''}`} style={!ddosEnabled ? { background: '#ef4444' } : {}}></span> {ddosEnabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div className="system-item">
              <span className="system-label">WAF Engine</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">Rate Limiter</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">SSL/TLS</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Websites & Account Info */}
      <div className="quick-actions-section">
        {/* My Websites */}
        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-globe" style={{ color: '#10b981', marginRight: '6px' }}></i> My Websites</h3>
            <Link to="/user/websites" className="view-all">Manage <i className="fas fa-arrow-right"></i></Link>
          </div>
          <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '14px' }}>
            <input
              type="text" placeholder="example.com" value={newWebsite}
              onChange={e => setNewWebsite(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
              required
            />
            <button type="submit" disabled={adding} style={{
              padding: '10px 16px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <i className={`fas ${adding ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i> Add
            </button>
          </form>
          <div>
            {data?.websites?.slice(0, 3).map((w, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-globe" style={{ color: '#10b981', fontSize: '13px' }}></i>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{w.domain || w.url || w}</span>
                    {w.added_at && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{w.added_at}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: '#ecfdf5', color: '#10b981' }}>
                    {w.status || 'active'}
                  </span>
                  <button onClick={() => handleRemoveWebsite(w.id)} style={{
                    padding: '4px 8px', background: '#fef2f2', color: '#ef4444', border: 'none',
                    borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}
            {(!data?.websites || data.websites.length === 0) && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px', fontSize: '13px' }}>
                No websites added yet
              </div>
            )}
            {data?.websites?.length > 3 && (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <Link to="/user/websites" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
                  View all {data.websites.length} websites <i className="fas fa-arrow-right" style={{ fontSize: '10px' }}></i>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Account Info & API Key */}
        <div>
          {/* API Key */}
          <div className="quick-actions-card" style={{ marginBottom: '18px' }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <h3><i className="fas fa-key" style={{ color: '#a78bfa', marginRight: '6px' }}></i> API Key</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '10px 0' }}>Use this key to integrate MDefender into your application.</p>
            <div style={{
              padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', fontSize: '13px', fontFamily: "'Fira Code', Consolas, monospace",
              color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '10px',
            }}>
              {data?.api_key ? data.api_key.slice(0, 16) + '••••••••••••' : 'No key generated'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={copyApiKey} style={{
                padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: 'none',
                borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i> {copySuccess ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleRegenerateKey} style={{
                padding: '8px 14px', background: '#fffbeb', color: '#d97706', border: 'none',
                borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <i className="fas fa-arrow-rotate-right"></i> Regenerate
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="quick-actions-card">
            <div className="section-header" style={{ marginBottom: 0 }}>
              <h3><i className="fas fa-user-circle" style={{ color: '#3b82f6', marginRight: '6px' }}></i> Account Info</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {[
                { label: 'Name', value: data?.user?.name || '—' },
                { label: 'Email', value: data?.user?.email || '—' },
                { label: 'Plan', value: (data?.user?.plan || 'free').toUpperCase(), color: isPremium ? '#8b5cf6' : '#64748b' },
                { label: 'Role', value: data?.user?.role || 'readonly' },
                { label: 'Member Since', value: data?.user?.created_at || '—' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: item.color || '#0f172a' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
