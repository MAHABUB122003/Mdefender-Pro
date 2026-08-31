import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import api from '../api/api'

import userStore from '../utils/userStore'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const doughnutColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function useAnimatedNumber(target, duration = 400) {
  const [value, setValue] = useState(target || 0)
  const ref = useRef(null)
  useEffect(() => {
    if (!target && target !== 0) return
    const numTarget = Number(target) || 0
    setValue(numTarget)
  }, [target])
  return (value || 0).toLocaleString()
}

function StatCard({ icon, iconClass, value, label, trend, trendDir }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon-wrap ${iconClass}`}>
          <i className={`fas ${icon}`}></i>
        </div>
        <span className={`stat-trend ${trendDir}`}>
          <i className={`fas fa-arrow-${trendDir}`}></i> {trend}
        </span>
      </div>
      <div className="stat-number">{animated}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(() => userStore.get('dashboard'))
  const [loading, setLoading] = useState(() => !userStore.get('dashboard'))
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date())
  const [ddosEnabled, setDdosEnabled] = useState(true)
  const [ddosToggling, setDdosToggling] = useState(false)
  const [mlStatus, setMlStatus] = useState(null)
  const isPremium = data?.plan === 'premium' || localStorage.getItem('mdefender_user_plan') === 'premium'

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const result = await api.getUserDashboard()
      setData(result)
      userStore.set('dashboard', result)
      setLastRefreshed(new Date())
      if (result?.user?.name) localStorage.setItem('mdefender_user_name', result.user.name)
      if (result?.user?.plan) localStorage.setItem('mdefender_user_plan', result.user.plan)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    api.getDdosStatus().then(r => setDdosEnabled(r.ddos_enabled ?? true)).catch(() => {})
    api.getMlStatus().then(r => setMlStatus(r)).catch(() => {})
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

  const blockTopIP = async (ip) => {
    if (!isPremium) { alert('Upgrade to Premium to block IPs'); return }
    if (confirm(`Block ${ip}?`)) {
      try { 
        await api.userBlockIP(ip, 'Blocked from dashboard')
        fetchData() 
      } catch (e) { 
        alert(e.message) 
      }
    }
  }

  const attackChartData = {
    labels: data?.attack_types?.length ? data.attack_types : ['SQL Injection', 'XSS', 'LFI', 'RCE', 'Other'],
    datasets: [{
      data: data?.attack_counts?.length ? data.attack_counts : [0, 0, 0, 0, 0],
      backgroundColor: doughnutColors,
      borderWidth: 0,
      hoverOffset: 6
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
      label: 'Traffic Requests',
      data: dailyCounts,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.06)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          padding: 14, 
          usePointStyle: true, 
          pointStyle: 'circle', 
          font: { size: 11, family: 'Inter' },
          boxWidth: 8
        } 
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0'
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`
          }
        }
      }
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0,0,0,0.04)' }, 
        ticks: { font: { size: 11 }, color: '#94a3b8' } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { font: { size: 11 }, color: '#94a3b8' } 
      }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb' }}></i>
        <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: '500' }}>Loading Security Telemetry...</div>
      </div>
    )
  }

  return (
    <>
      {/* Top Security Status Ribbon */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '14px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.7)',
          }}></div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
              WAF Protection Active & Filtering
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Real-time heuristic and rule inspection enabled for {data?.websites?.length || 0} website(s)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Instant Refresh Section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '4px 8px'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              <i className="fas fa-clock" style={{ marginRight: '4px', color: '#94a3b8' }}></i>
              {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
            </span>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Click to instantly refresh dashboard metrics"
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: refreshing ? '#eff6ff' : '#2563eb',
                color: refreshing ? '#2563eb' : '#ffffff',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
                boxShadow: refreshing ? 'none' : '0 1px 2px rgba(37,99,235,0.2)'
              }}
            >
              <i className={`fas fa-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Refreshing...' : '⚡ Quick Refresh'}
            </button>
          </div>

          <button
            onClick={handleDdosToggle}
            disabled={ddosToggling}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: ddosEnabled ? '1px solid #bbf7d0' : '1px solid #fecaca',
              background: ddosEnabled ? '#f0fdf4' : '#fef2f2',
              color: ddosEnabled ? '#15803d' : '#b91c1c',
              fontSize: '12px',
              fontWeight: '600',
              cursor: ddosToggling ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <i className={`fas ${ddosToggling ? 'fa-spinner fa-spin' : ddosEnabled ? 'fa-shield-halved' : 'fa-shield-slash'}`}></i>
            DDoS Shield: {ddosEnabled ? 'ON' : 'OFF'}
          </button>

          <Link
            to="/user/rules"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-shield"></i> Custom Rules
          </Link>

          {!isPremium && (
            <Link
              to="/user/settings"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(245,158,11,0.25)'
              }}
            >
              <i className="fas fa-crown"></i> Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="stats-grid">
        <StatCard 
          icon="fa-chart-line" 
          iconClass="blue" 
          value={data?.requests_today || 0} 
          label="Requests Today" 
          trend="active" 
          trendDir="up" 
        />
        <StatCard 
          icon="fa-globe" 
          iconClass="green" 
          value={data?.total_requests || 0} 
          label="Total Traffic (Lifetime)" 
          trend="cumulative" 
          trendDir="up" 
        />
        <StatCard 
          icon="fa-shield-halved" 
          iconClass="red" 
          value={data?.total_blocked || 0} 
          label="Attacks Blocked" 
          trend="protected" 
          trendDir="up" 
        />
        <StatCard 
          icon="fa-server" 
          iconClass="purple" 
          value={data?.active_websites || data?.websites?.length || 0} 
          label="Active Protected Websites" 
          trend="online" 
          trendDir="up" 
        />
      </div>

      {/* Visual Charts Grid */}
      <div className="charts-grid">
        <div className={`chart-card ${!isPremium ? 'premium-blur' : ''}`} style={{ minHeight: '320px' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-line" style={{ color: '#2563eb', marginRight: '6px' }}></i> Traffic Velocity (7 Days)</h3>
            <span className="chart-action">Requests History</span>
          </div>
          <div className="chart-container" style={{ height: '230px' }}>
            <Line data={dailyChartData} options={lineOptions} />
          </div>
          {!isPremium && (
            <div className="premium-overlay-small">
              <Link to="/user/settings" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to view live traffic trends</Link>
            </div>
          )}
        </div>

        <div className={`chart-card ${!isPremium ? 'premium-blur' : ''}`} style={{ minHeight: '320px' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie" style={{ color: '#10b981', marginRight: '6px' }}></i> Threat Vectors Breakdown</h3>
            <span className="chart-action">Category Ratio</span>
          </div>
          <div className="chart-container" style={{ height: '230px' }}>
            <Doughnut data={attackChartData} options={doughnutOptions} />
          </div>
          {!isPremium && (
            <div className="premium-overlay-small">
              <Link to="/user/settings" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to view threat categorization</Link>
            </div>
          )}
        </div>
      </div>

      {/* Security Operations: Top Attackers & Live Attack Feed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>
        {/* Top Attacking IPs */}
        <div className={`top-attackers ${!isPremium ? 'premium-blur' : ''}`} style={{ marginBottom: 0 }}>
          <div className="section-header">
            <h3><i className="fas fa-crosshairs" style={{ color: '#ef4444', marginRight: '6px' }}></i> Top Threat Origins</h3>
            {isPremium && <Link to="/user/logs" className="view-all">All Logs <i className="fas fa-arrow-right"></i></Link>}
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Attacker IP</th><th>Attempts</th><th style={{ textAlign: 'right' }}>Action</th></tr>
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
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="badge danger" 
                        style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }} 
                        onClick={() => blockTopIP(attacker.ip)}
                      >
                        {isPremium ? 'BLOCK' : 'PRO'}
                      </button>
                    </td>
                  </tr>
                )
              }) || (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No hostile IP traffic detected</td></tr>
              )}
            </tbody>
          </table>
          {!isPremium && <div className="premium-overlay-small"><Link to="/user/settings" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to view attacker details</Link></div>}
        </div>

        {/* Live Block Events */}
        <div className={`recent-activity ${!isPremium ? 'premium-blur' : ''}`} style={{ marginBottom: 0 }}>
          <div className="section-header">
            <h3><i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> Recent Blocks Stream</h3>
            {isPremium && <Link to="/user/logs" className="view-all">View All <i className="fas fa-arrow-right"></i></Link>}
          </div>
          <div className="activity-timeline" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {data?.recent_activity?.slice(0, 5).map((log, i) => (
              <div className="activity-item" key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className={`activity-type ${log.attack_type === 'SQL Injection' || log.attack_type === 'SQLi' ? 'critical' : log.attack_type === 'XSS' || log.attack_type === 'LFI' ? 'high' : 'medium'}`} style={{ fontSize: '11px' }}>
                    <i className="fas fa-shield-halved"></i> {log.attack_type}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{log.timestamp || log.time || 'Just now'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#334155' }}>
                  Source: <strong>{log.ip}</strong>
                </div>
                <div className="activity-payload" style={{ fontSize: '11px', padding: '4px 8px', background: '#f8fafc', borderRadius: '4px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.url}
                </div>
              </div>
            )) || (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '36px' }}>
                <i className="fas fa-shield-check" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: '#10b981' }}></i>
                No attacks recorded in current window
              </div>
            )}
          </div>
          {!isPremium && <div className="premium-overlay-small"><Link to="/user/settings" className="upgrade-link"><i className="fas fa-lock"></i> Upgrade to inspect block streams</Link></div>}
        </div>
      </div>

      {/* System Engine Health Bar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot green"></span>
            <span style={{ color: '#64748b' }}>WAF Rule Engine:</span>
            <strong style={{ color: '#0f172a' }}>Online</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-dot ${mlStatus?.waf?.loaded ? 'green' : 'red'}`}></span>
            <span style={{ color: '#64748b' }}>ML Model Core:</span>
            <strong style={{ color: '#0f172a' }}>{mlStatus?.waf?.loaded ? `v${mlStatus.waf.version}` : 'Active'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot green"></span>
            <span style={{ color: '#64748b' }}>Rate Limiting Layer:</span>
            <strong style={{ color: '#0f172a' }}>Enforcing</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/user/websites" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}>
            <i className="fas fa-globe" style={{ marginRight: '4px' }}></i> Manage Sites ({data?.websites?.length || 0})
          </Link>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <Link to="/user/connect" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}>
            <i className="fas fa-link" style={{ marginRight: '4px' }}></i> Setup SDK / Plugin
          </Link>
        </div>
      </div>
    </>
  )
}
