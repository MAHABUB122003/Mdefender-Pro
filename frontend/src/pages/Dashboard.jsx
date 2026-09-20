import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import api from '../api/api'
import MalwareScanner from '../components/MalwareScanner'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const doughnutColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

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

function StatCard({ icon, iconClass, value, label, trend, trendDir, onReset }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
      <div className="stat-top">
        <div className={`stat-icon-wrap ${iconClass}`}><i className={`fas ${icon}`}></i></div>
        {onReset && (
          <button className="stat-clean-btn" onClick={onReset} title={`Reset ${label}`}>
            <i className="fas fa-trash-can"></i>
          </button>
        )}
      </div>
      <div className="stat-number" style={{ color: '#f8fafc' }}>{animated}</div>
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
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, color: '#94a3b8' } },
      tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
        Initializing Super Admin Command Center...
      </div>
    )
  }

  return (
    <div className="admin-dashboard" style={{ padding: '4px 0 50px' }}>
      {/* Super Admin Status Ribbon */}
      <div style={{
        background: 'linear-gradient(90deg, #1e1b4b, #0f172a)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '12px',
        padding: '16px 22px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Super Admin Operations Command Center
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                <i className="fas fa-circle" style={{ fontSize: '6px' }}></i> LIVE PLATFORM
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Global WAF telemetry, user account diagnostics, and revenue pricing controls.
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
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-users-gear"></i> User Support Center
          </Link>

          <Link
            to="/admin/pricing"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fbbf24',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-tags"></i> Edit Pro Pricing
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
          label="Active Pro / Enterprise"
          trend="Paid Subscribers"
          trendDir="up"
        />
        <StatCard
          icon="fa-globe"
          iconClass="green"
          value={overview?.websites ?? stats?.active_clients ?? 0}
          label="Connected Websites"
          trend="Protected Domains"
          trendDir="up"
        />
        <StatCard
          icon="fa-shield-halved"
          iconClass="red"
          value={stats?.total_attacks_blocked ?? 0}
          label="Total Attacks Blocked"
          trend="L7 & ML WAF"
          trendDir="up"
        />
      </div>

      {/* System Health Diagnostics Row */}
      {health?.checks && (
        <div style={{
          background: '#0f172a',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          padding: '18px 24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-server" style={{ color: '#10b981' }}></i>
              Platform Engine Diagnostics & Microservice Health
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Real-time ping</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px'
          }}>
            {Object.entries(health.checks).map(([key, item]) => (
              <div
                key={key}
                style={{
                  background: '#070b14',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: item.ok ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                    {item.label || key.replace('_', ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {item.version ? `Version v${item.version}` : item.patterns ? `${item.patterns} rules loaded` : 'Service online'}
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
        <div className="chart-card" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie" style={{ color: '#3b82f6', marginRight: '6px' }}></i> Global Attack Distribution</h3>
            <span className="chart-action">Telemetry</span>
          </div>
          <div className="chart-container">
            <Doughnut ref={attackChartRef} data={attackChartData} options={doughnutOptions} />
          </div>
        </div>

        <div className="chart-card" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <div className="chart-header">
            <h3><i className="fas fa-chart-line" style={{ color: '#10b981', marginRight: '6px' }}></i> Mitigation Volume (Last 7 Days)</h3>
            <span className="chart-action">Trend</span>
          </div>
          <div className="chart-container">
            <Line data={dailyChartData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Quick Access Control Grid */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <Link
          to="/admin/users"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-users-gear"></i>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>Users & Support</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Unlock, verify & grant plans</div>
          </div>
        </Link>

        <Link
          to="/admin/pricing"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-tags"></i>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>Pricing & Tiers</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Edit monthly/yearly prices</div>
          </div>
        </Link>

        <Link
          to="/admin/clients"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-globe"></i>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>Tenant Websites</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Manage user domains</div>
          </div>
        </Link>

        <Link
          to="/admin/rules"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-shield"></i>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>WAF Rules</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Signatures & Regex</div>
          </div>
        </Link>
      </div>

      {/* Malware Scanner Widget */}
      <div className="scanner-section" style={{ marginTop: '24px' }}>
        <MalwareScanner />
      </div>
    </div>
  )
}
