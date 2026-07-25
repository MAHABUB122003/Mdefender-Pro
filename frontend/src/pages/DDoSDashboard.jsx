import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Link } from 'react-router-dom'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

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

function StatCard({ icon, iconClass, value, label, trend }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon-wrap ${iconClass}`}><i className={`fas ${icon}`}></i></div>
      </div>
      <div className="stat-number">{animated}</div>
      <div className="stat-label">{label}</div>
      {trend && <div className="stat-trend up"><i className="fas fa-arrow-up"></i> {trend}</div>}
    </div>
  )
}

export default function DDoSDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blockIp, setBlockIp] = useState('')
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const token = localStorage.getItem('mdefender_token')

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ddos/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [token])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ddos/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const result = await res.json()
        setConfig(result.config || result)
      }
    } catch (err) { console.error(err) }
  }, [token])

  useEffect(() => {
    if (!token) { window.location.href = '/admin/login'; return }
    fetchDashboard()
    fetchConfig()
    const interval = setInterval(fetchDashboard, 10000)
    return () => clearInterval(interval)
  }, [token, fetchDashboard, fetchConfig])

  const handleBlockIP = async () => {
    if (!blockIp.trim()) return
    try {
      await fetch(`${API_BASE}/api/admin/ddos/reputation/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: blockIp, level: 4, duration: 3600 })
      })
      setBlockIp('')
      fetchDashboard()
    } catch (err) { console.error(err) }
  }

  const handleUnblockIP = async (ip) => {
    try {
      await fetch(`${API_BASE}/api/admin/ddos/reputation/unblock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      })
      fetchDashboard()
    } catch (err) { console.error(err) }
  }

  const timelineData = {
    labels: data?.stats?.timeline?.map(t => t.time || '') || [],
    datasets: [{
      label: 'Requests/sec',
      data: data?.stats?.timeline?.map(t => t.count || 0) || [],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointRadius: 2,
    }]
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8', maxTicksLimit: 10 } }
    },
    animation: { duration: 600 }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>

  const stats = data?.stats || {}
  const sys = data?.system_metrics || {}
  const topIps = data?.top_offenders || []
  const alertsList = data?.alerts || []
  const sessionStats = data?.session_stats || {}

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="fa-bolt" iconClass="blue" value={stats.requests_per_second || 0} label="Requests/sec" trend="live" />
        <StatCard icon="fa-skull-crosshours" iconClass="red" value={stats.active_threats || 0} label="Active Threats" />
        <StatCard icon="fa-ban" iconClass="purple" value={data?.blocked_count || 0} label="Blocked IPs" />
        <StatCard icon="fa-users" iconClass="green" value={data?.active_sessions || 0} label="Active Sessions" />
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '18px' }}>
        {['overview', 'reputation', 'alerts', 'config'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            background: activeTab === tab ? '#2563eb' : '#f1f5f9',
            color: activeTab === tab ? '#fff' : '#64748b',
            fontFamily: 'inherit', textTransform: 'capitalize',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h3><i className="fas fa-chart-line" style={{ color: '#2563eb', marginRight: '6px' }}></i> Traffic Timeline</h3>
                <span className="chart-action">Last 5 min</span>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Line data={timelineData} options={lineOptions} />
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <h3><i className="fas fa-server" style={{ color: '#10b981', marginRight: '6px' }}></i> System Resources</h3>
              </div>
              <div style={{ padding: '10px 0' }}>
                {[
                  { label: 'CPU Usage', value: sys.cpu_percent || 0, color: '#2563eb' },
                  { label: 'Memory Usage', value: sys.memory_percent || 0, color: '#8b5cf6' },
                  { label: 'Active Connections', value: Math.min((sys.active_connections || 0) / 10, 100), color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{item.value.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(item.value, 100)}%`, background: item.color, borderRadius: '4px', transition: 'width 0.5s' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="quick-actions-section">
            <div className="quick-actions-card">
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <h3><i className="fas fa-crosshairs" style={{ color: '#ef4444', marginRight: '6px' }}></i> Top Offending IPs</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input type="text" placeholder="IP to block" value={blockIp} onChange={e => setBlockIp(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }} />
                <button onClick={handleBlockIP} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <i className="fas fa-ban" style={{ marginRight: '4px' }}></i> Block
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>IP Address</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Level</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Action</th></tr>
                </thead>
                <tbody>
                  {topIps.length > 0 ? topIps.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontSize: '13px' }}><span className={`rank-badge ${i < 3 ? `top${i + 1}` : ''}`}>{i + 1}</span></td>
                      <td style={{ padding: '10px', fontSize: '13px', fontFamily: 'monospace' }}>{item.ip}</td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: (item.score || 0) >= 50 ? '#fef2f2' : (item.score || 0) >= 20 ? '#fffbeb' : '#ecfdf5', color: (item.score || 0) >= 50 ? '#dc2626' : (item.score || 0) >= 20 ? '#d97706' : '#059669' }}>
                          {item.score || 0}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>
                        <span className={`badge ${(item.level || 0) >= 4 ? 'danger' : (item.level || 0) >= 2 ? 'warning' : 'success'}`}>
                          L{item.level || 0}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button onClick={() => handleUnblockIP(item.ip)} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Unblock</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No offenders detected</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="quick-actions-card">
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <h3><i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> Recent Alerts</h3>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {alertsList.length > 0 ? alertsList.slice(0, 10).map((alert, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 8px', borderBottom: '1px solid #f1f5f9', borderRadius: '6px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, background: alert.severity === 'critical' ? '#fef2f2' : alert.severity === 'high' ? '#fff7ed' : '#eff6ff', color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#2563eb' }}>
                      <i className={`fas ${alert.severity === 'critical' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{alert.type || 'Alert'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.message || ''}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{alert.timestamp ? new Date(alert.timestamp * 1000).toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No alerts</div>
                )}
              </div>
            </div>
          </div>

          <div className="quick-actions-section">
            <div className="quick-actions-card">
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <h3><i className="fas fa-shield-halved" style={{ color: '#2563eb', marginRight: '6px' }}></i> Protection Status</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'Rate Limiting', enabled: true, detail: `${config?.rate_limits?.anonymous_rps || 10} rps (anonymous)` },
                  { name: 'IP Reputation', enabled: true, detail: `Block threshold: ${config?.reputation?.block_threshold || 50}` },
                  { name: 'Geo Protection', enabled: config?.geo?.enabled || false, detail: config?.geo?.enabled ? `${(config?.geo?.blacklist_countries || []).length} countries blocked` : 'Disabled' },
                  { name: 'Bot Protection', enabled: true, detail: 'User-Agent analysis active' },
                  { name: 'DDoS Shield', enabled: true, detail: 'Burst detection active' },
                  { name: 'Dynamic Limits', enabled: config?.dynamic_limits?.enabled || false, detail: `CPU threshold: ${config?.dynamic_limits?.cpu_threshold || 80}%` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.enabled ? '#10b981' : '#94a3b8', flexShrink: 0 }}></span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.detail}</div>
                      </div>
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: item.enabled ? '#ecfdf5' : '#f1f5f9', color: item.enabled ? '#059669' : '#94a3b8' }}>
                      {item.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="quick-actions-card">
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <h3><i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Quick Actions</h3>
              </div>
              <div className="quick-actions-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { icon: 'fa-ban', label: 'Block IP', color: '#ef4444', action: () => setBlockIp('') },
                  { icon: 'fa-trash-can', label: 'Purge Logs', color: '#f59e0b', action: () => fetch(`${API_BASE}/api/admin/ddos/logs/cleanup`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 7 }) }) },
                  { icon: 'fa-download', label: 'Export', color: '#10b981', action: () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ddos-report.json'; a.click() } },
                  { icon: 'fa-arrow-rotate-right', label: 'Refresh', color: '#64748b', action: fetchDashboard },
                ].map((item, i) => (
                  <button key={i} className="quick-action" onClick={item.action}>
                    <div className="qa-icon" style={{ background: `${item.color}15`, color: item.color }}><i className={`fas ${item.icon}`}></i></div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'config' && config && (
        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3><i className="fas fa-cog" style={{ color: '#64748b', marginRight: '6px' }}></i> DDoS Protection Configuration</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {[
              { title: 'Rate Limits', data: config.rate_limits },
              { title: 'Reputation', data: config.reputation },
              { title: 'Challenge', data: config.challenge },
              { title: 'Dynamic Limits', data: config.dynamic_limits },
            ].map((section, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>{section.title}</h4>
                {section.data && Object.entries(section.data).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <span style={{ color: '#64748b', textTransform: 'replace', letterSpacing: '0.3px' }}>{key.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
