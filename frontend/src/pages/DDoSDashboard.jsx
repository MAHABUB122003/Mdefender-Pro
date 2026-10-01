import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import api from '../api/api'
import adminStore from '../utils/adminStore'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

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
  const cachedData = adminStore.get('ddos_dashboard')
  const [data, setData] = useState(cachedData || null)
  const [loading, setLoading] = useState(!cachedData)
  const [blockIp, setBlockIp] = useState('')
  const [config, setConfig] = useState(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await api.adminGetDDoSStats()
      if (res) {
        setData(res)
        adminStore.set('ddos_dashboard', res)
      }
    } catch (err) {
      console.error('Failed to fetch DDoS metrics:', err)
      if (!adminStore.get('ddos_dashboard')) {
        showToast('Failed to load DDoS protection telemetry', true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.adminGetDDoSConfig()
      if (res) {
        setConfig(res.config || res)
      }
    } catch (err) {
      console.error('Failed to fetch DDoS config:', err)
    }
  }, [])

  useEffect(() => {
    fetchDashboard(!adminStore.get('ddos_dashboard'))
    fetchConfig()
    const interval = setInterval(() => fetchDashboard(false), 12000)
    return () => clearInterval(interval)
  }, [fetchDashboard, fetchConfig])

  const handleBlockIP = async (e) => {
    if (e) e.preventDefault()
    if (!blockIp.trim()) return
    try {
      await api.adminBlockDDoSIp(blockIp.trim(), 4, 3600)
      showToast(`IP ${blockIp} added to volumetric reputation blocklist!`)
      setBlockIp('')
      fetchDashboard(false)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', true)
    }
  }

  const handleUnblockIP = async (ip) => {
    try {
      await api.adminUnblockDDoSIp(ip)
      showToast(`IP ${ip} unblocked successfully!`)
      fetchDashboard(false)
    } catch (err) {
      showToast(err.message || 'Failed to unblock IP', true)
    }
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    if (!config) return
    setSavingConfig(true)
    try {
      await api.adminUpdateDDoSConfig(config)
      showToast('DDoS Shield thresholds & volumetric policies updated!')
    } catch (err) {
      showToast(err.message || 'Failed to save DDoS config', true)
    } finally {
      setSavingConfig(false)
    }
  }

  const timelineData = {
    labels: data?.stats?.timeline?.map(t => t.time || '') || ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'],
    datasets: [{
      label: 'Requests/sec',
      data: data?.stats?.timeline?.map(t => t.count || 0) || [12, 19, 14, 25, 20, 18],
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

  const stats = data?.stats || {}
  const sys = data?.system_metrics || {}
  const topIps = data?.top_offenders || []
  const alertsList = data?.alerts || []

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #fee2e2, #fecdd3)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Layer 7 Volumetric DDoS Mitigation Shield
            </h1>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '3px 0 0' }}>
              Real-time volumetric flood mitigation, IP reputation scoring, and automated rate-limiting policies.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-rotate"></i> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon="fa-bolt" iconClass="blue" value={stats.requests_per_second || 0} label="Requests / sec" trend="live stream" />
        <StatCard icon="fa-shield-virus" iconClass="red" value={stats.active_threats || 0} label="Active Layer 7 Threats" />
        <StatCard icon="fa-ban" iconClass="purple" value={data?.blocked_count || 0} label="DDoS Blocked IPs" />
        <StatCard icon="fa-users" iconClass="green" value={data?.active_sessions || 0} label="Active HTTP Sessions" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'white', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        {[
          { id: 'overview', label: 'Live Traffic & Resources', icon: 'fa-chart-line' },
          { id: 'reputation', label: 'Offending IPs & Ban List', icon: 'fa-ban' },
          { id: 'alerts', label: `Security Alerts (${alertsList.length})`, icon: 'fa-bell' },
          { id: 'config', label: 'Shield Configuration', icon: 'fa-sliders' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? '#2563eb' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h3><i className="fas fa-chart-line" style={{ color: '#2563eb', marginRight: '6px' }}></i> Volumetric Request Velocity</h3>
                <span className="chart-action">Live Stream</span>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Line data={timelineData} options={lineOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3><i className="fas fa-server" style={{ color: '#10b981', marginRight: '6px' }}></i> WAF Cluster Health</h3>
              </div>
              <div style={{ padding: '10px 0' }}>
                {[
                  { label: 'CPU Load Capacity', value: sys.cpu_percent || 14.2, color: '#2563eb' },
                  { label: 'RAM Memory Allocation', value: sys.memory_percent || 28.6, color: '#8b5cf6' },
                  { label: 'HTTP Connection Pool', value: Math.min((sys.active_connections || 15) * 2, 100), color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{Number(item.value).toFixed(1)}%</span>
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
                <h3><i className="fas fa-crosshairs" style={{ color: '#ef4444', marginRight: '6px' }}></i> High-Velocity Attack Sources</h3>
              </div>
              <form onSubmit={handleBlockIP} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder="Enter IP to immediately rate-limit / block"
                  value={blockIp}
                  onChange={e => setBlockIp(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}
                />
                <button type="submit" className="btn-primary" style={{ background: '#dc2626', padding: '8px 16px' }}>
                  <i className="fas fa-ban"></i> Block IP
                </button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Client IP</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Threat Score</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reputation Tier</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topIps.length > 0 ? topIps.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontSize: '12px' }}>{i + 1}</td>
                      <td style={{ padding: '10px', fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '600' }}>{item.ip}</td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: (item.score || 0) >= 50 ? '#fee2e2' : '#fef3c7', color: (item.score || 0) >= 50 ? '#dc2626' : '#b45309' }}>
                          {item.score || 0}/100
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <span className={`badge ${(item.level || 0) >= 4 ? 'danger' : 'warning'}`}>
                          Level {item.level || 0}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button onClick={() => handleUnblockIP(item.ip)} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}>
                          Unblock
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No high-velocity flood offenders detected</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="quick-actions-card">
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <h3><i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> Real-Time DDoS Mitigation Alerts</h3>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {alertsList.length > 0 ? alertsList.slice(0, 10).map((alert, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, background: alert.severity === 'critical' ? '#fee2e2' : '#fef3c7', color: alert.severity === 'critical' ? '#dc2626' : '#b45309' }}>
                      <i className={`fas ${alert.severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{alert.title || alert.message || 'Volumetric Spike Mitigated'}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{alert.timestamp || 'Just now'} &bull; {alert.ip || 'Cluster Shield'}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
                    <i className="fas fa-shield-check" style={{ fontSize: '24px', color: '#16a34a', marginBottom: '8px', display: 'block' }}></i>
                    All systems normal. No volumetric DDoS spikes in the last 60 minutes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Reputation Blocklist */}
      {activeTab === 'reputation' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: '#0f172a' }}>Active Reputation Blacklist</h3>
          <p style={{ color: '#64748b', fontSize: '12.5px', marginBottom: '16px' }}>
            IPs that repeatedly exceeded volumetric thresholds or triggered aggressive HTTP request floods.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>IP Address</th>
                <th style={{ padding: '10px 14px' }}>Flood Score</th>
                <th style={{ padding: '10px 14px' }}>Enforcement Level</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topIps.length > 0 ? topIps.map((ipObj, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '600' }}>{ipObj.ip}</td>
                  <td style={{ padding: '12px 14px' }}>{ipObj.score || 0}/100</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge danger">L{ipObj.level || 4} - Active Drop</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button onClick={() => handleUnblockIP(ipObj.ip)} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Unblock IP
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No active reputation blocks</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Alerts */}
      {activeTab === 'alerts' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: '#0f172a' }}>DDoS Mitigation Incident Log</h3>
          {alertsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alertsList.map((al, idx) => (
                <div key={idx} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{al.title || al.message || 'Volumetric Flood Blocked'}</strong>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Source: {al.ip || 'Unknown'} &bull; Severity: <span style={{ color: al.severity === 'critical' ? '#dc2626' : '#d97706', fontWeight: '700' }}>{al.severity || 'high'}</span></div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{al.timestamp || 'Just now'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No recent DDoS alerts recorded.</div>
          )}
        </div>
      )}

      {/* Tab 4: Configuration */}
      {activeTab === 'config' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: '#0f172a' }}>DDoS Protection Policy & Rate Limits</h3>
          <form onSubmit={handleSaveConfig} style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Max Requests per Second (per IP)
              </label>
              <input
                type="number"
                value={config?.max_rps || 50}
                onChange={e => setConfig({ ...config, max_rps: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Connections exceeding this rate will receive HTTP 429 / CAPTCHA challenge.</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Temporary Ban Duration (Seconds)
              </label>
              <input
                type="number"
                value={config?.ban_duration_seconds || 3600}
                onChange={e => setConfig({ ...config, ban_duration_seconds: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Enforcement Mode
              </label>
              <select
                value={config?.mode || 'protect'}
                onChange={e => setConfig({ ...config, mode: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
              >
                <option value="protect">Active Mitigation & Rate Drop (Recommended)</option>
                <option value="monitor">Telemetry & Logging Only (Monitor Mode)</option>
                <option value="aggressive">Aggressive Volumetric Shield (Zero Tolerance)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="btn-primary"
              style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '600' }}
            >
              <i className={`fas ${savingConfig ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
              {savingConfig ? 'Saving...' : 'Save DDoS Policies'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
