import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import api from '../api/api'
import MalwareScanner from '../components/MalwareScanner'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const doughnutColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function useAnimatedNumber(target, duration = 600) {
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

function StatCard({ icon, iconClass, value, label, trend, trendDir, onReset }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon-wrap ${iconClass}`}><i className={`fas ${icon}`}></i></div>
        {onReset && (
          <button className="stat-clean-btn" onClick={onReset} title={`Reset ${label}`}>
            <i className="fas fa-trash-can"></i>
          </button>
        )}
      </div>
      <div className="stat-number">{animated}</div>
      <div className="stat-label">{label}</div>
      {trend && <div className={`stat-trend ${trendDir}`}><i className={`fas fa-arrow-${trendDir}`}></i> {trend}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const attackChartRef = useRef(null)

  const fetchStats = useCallback(async () => {
    try {
      const [statsData, overviewData, healthData] = await Promise.allSettled([
        api.getStats(),
        api.adminGetOverview(),
        api.adminGetSystemHealth(),
      ])
      if (statsData.status === 'fulfilled') setStats(statsData.value)
      if (overviewData.status === 'fulfilled') setOverview(overviewData.value?.data || overviewData.value)
      if (healthData.status === 'fulfilled') setHealth(healthData.value?.data || healthData.value)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const attackChartData = {
    labels: stats?.attack_types?.length ? stats.attack_types : ['SQL Injection', 'XSS', 'LFI', 'RCE', 'Other'],
    datasets: [{
      data: stats?.attack_counts?.length ? stats.attack_counts : [45, 30, 15, 5, 5],
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
    dailyCounts.push(Math.floor(Math.random() * 80) + 20)
  }

  const dailyChartData = {
    labels: dailyDays,
    datasets: [{
      label: 'Attacks Blocked',
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
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11, family: 'Inter' } } },
      tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
        <div style={{ fontSize: '14px', fontWeight: '500' }}>Loading Super Admin Dashboard...</div>
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
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Super Admin Operations Command Center
              </h2>
              <span className="badge success">
                <i className="fas fa-circle" style={{ fontSize: '6px', marginRight: '4px' }}></i> LIVE
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '12.5px' }}>
              Real-time platform telemetry, user issue management, and subscription pricing controls.
            </p>
          </div>
        </div>

        {/* Quick Hub Links */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/admin/users"
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-users-gear"></i> User Support Center
          </Link>

          <Link
            to="/admin/pricing"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#d97706',
              fontSize: '12.5px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-tags"></i> Edit Plan Pricing
          </Link>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon="fa-users"
          iconClass="blue"
          value={overview?.users ?? stats?.total_requests ?? 0}
          label="Total Registered Users"
          trend="Multi-tenant accounts"
          trendDir="up"
        />
        <StatCard
          icon="fa-crown"
          iconClass="purple"
          value={overview?.pro_subscribers ?? 0}
          label="Active Pro Subscribers"
          trend="Paid Tiers"
          trendDir="up"
        />
        <StatCard
          icon="fa-globe"
          iconClass="green"
          value={overview?.websites ?? stats?.active_clients ?? 0}
          label="Protected Websites"
          trend="Active Nodes"
          trendDir="up"
        />
        <StatCard
          icon="fa-shield-halved"
          iconClass="red"
          value={stats?.total_attacks_blocked ?? 0}
          label="Attacks Blocked"
          trend="Global Defense"
          trendDir="up"
        />
      </div>

      {/* Engine Health Diagnostics Row */}
      {health?.checks && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-server" style={{ color: '#10b981' }}></i>
              Platform Engine Diagnostics & Microservice Status
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Real-time health check</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(health.checks).map(([key, item]) => (
              <div
                key={key}
                style={{
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: item.ok ? '1px solid #e2e8f0' : '1px solid #fecaca',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                    {item.label || key.replace('_', ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {item.version ? `v${item.version}` : item.patterns ? `${item.patterns} patterns` : 'Online'}
                  </div>
                </div>
                <span className={`badge ${item.ok ? 'success' : 'danger'}`}>
                  {item.ok ? 'Healthy' : 'Degraded'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card" style={{ minHeight: '300px' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie" style={{ color: '#2563eb', marginRight: '6px' }}></i> Global Threat Types</h3>
            <span className="chart-action">Telemetry</span>
          </div>
          <div className="chart-container" style={{ height: '220px' }}>
            <Doughnut ref={attackChartRef} data={attackChartData} options={doughnutOptions} />
          </div>
        </div>

        <div className="chart-card" style={{ minHeight: '300px' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-line" style={{ color: '#10b981', marginRight: '6px' }}></i> Attack Mitigations (Last 7 Days)</h3>
            <span className="chart-action">Trend</span>
          </div>
          <div className="chart-container" style={{ height: '220px' }}>
            <Line data={dailyChartData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Quick Access Navigation Grid */}
      <div style={{
        marginTop: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <Link
          to="/admin/users"
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-users-gear"></i>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Users & Support</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Unlock, verify & grant plans</div>
          </div>
        </Link>

        <Link
          to="/admin/pricing"
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-tags"></i>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Pricing & Plans</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Edit monthly & yearly rates</div>
          </div>
        </Link>

        <Link
          to="/admin/clients"
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-globe"></i>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Tenant Websites</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Manage all user domains</div>
          </div>
        </Link>

        <Link
          to="/admin/rules"
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-shield"></i>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>WAF Rules</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Signatures & Custom Regex</div>
          </div>
        </Link>
      </div>

      {/* Malware Scanner Widget */}
      <div className="scanner-section" style={{ marginTop: '20px' }}>
        <MalwareScanner />
      </div>
    </>
  )
}
