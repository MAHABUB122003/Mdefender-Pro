import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  Users,
  Ban,
  RotateCw,
  AlertTriangle,
  Play,
  Sliders,
  CheckCircle2,
  Clock,
  Globe,
  ArrowUpRight,
  Search,
  Check,
  Copy,
  Flame,
  Radio,
  Server,
  Terminal
} from 'lucide-react'
import api from '../api/api'
import adminStore from '../utils/adminStore'
import { copyToClipboard } from '../utils/clipboard'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

export default function DDoSDashboard() {
  const cachedData = adminStore.get('ddos_dashboard')
  const [data, setData] = useState(cachedData || null)
  const [loading, setLoading] = useState(!cachedData)
  const [blockIp, setBlockIp] = useState('')
  const [config, setConfig] = useState(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toastMessage, setToastMessage] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleCopy = (id, text) => {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
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
    const interval = setInterval(() => fetchDashboard(false), 10000)
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

  const handleSimulateSpike = async () => {
    setSimulating(true)
    try {
      const res = await api.adminSimulateDDoSSpike({ count: 25, ip: '198.51.100.88', user_type: 'anonymous' })
      setSimulationResult(res)
      showToast(`Simulated 25 RPS Spike: ${res.allowed} Allowed, ${res.blocked_429} Blocked (HTTP 429)!`)
      fetchDashboard(false)
    } catch (err) {
      showToast(err.message || 'Simulation test failed', true)
    } finally {
      setSimulating(false)
    }
  }

  const stats = data?.stats || {}
  const sys = data?.system_metrics || {}
  const topIps = data?.top_offenders || []
  const alertsList = data?.alerts || []

  const timelineLabels = data?.stats?.timeline?.length > 0
    ? data.stats.timeline.map(t => t.time || '')
    : ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00']

  const timelineValues = data?.stats?.timeline?.length > 0
    ? data.stats.timeline.map(t => t.count || 0)
    : [0, 0, 0, 0, 0, 0]

  const timelineData = {
    labels: timelineLabels,
    datasets: [{
      label: 'Requests/sec',
      data: timelineValues,
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37,99,235,0.06)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointRadius: 2,
    }]
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#94A3B8' } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94A3B8', maxTicksLimit: 8 } }
    },
    animation: { duration: 400 }
  }

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: '12.5px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} color="#34D399" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER STRIP — Compact & Clean (100% Logs.jsx Match) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #D9E1DC',
        padding: '10px 16px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#DC2626',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldAlert size={12} />
            <span>L7 Volumetric Shield</span>
          </span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
            Layer 7 Volumetric DDoS Mitigation & Rate Limiting
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSimulateSpike}
            disabled={simulating}
            style={{
              padding: '6px 13px',
              borderRadius: '6px',
              background: '#FAF5FF',
              border: '1px solid #E9D5FF',
              color: '#7C3AED',
              fontSize: '12px',
              fontWeight: '700',
              cursor: simulating ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={12} className={simulating ? 'animate-spin' : ''} />
            <span>{simulating ? 'Testing Spike...' : '🧪 Test Rate-Limiter (Simulate 25 RPS)'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={loading}
            style={{
              padding: '6px 13px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* SIMULATION RESULT ALERT BANNER */}
      {simulationResult && (
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#2563EB" />
            <span style={{ fontSize: '12.5px', color: '#1E40AF', fontWeight: '600' }}>
              <strong>Rate-Limiting Verification Successful:</strong> Injected <strong>{simulationResult.simulated_requests} requests</strong> within 1 sec. Allowed: <strong>{simulationResult.allowed}</strong> &bull; Dropped with HTTP 429: <strong style={{ color: '#DC2626' }}>{simulationResult.blocked_429}</strong> (Token Bucket active).
            </span>
          </div>
          <button
            onClick={() => setSimulationResult(null)}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 DYNAMIC KPI CARDS — High-Density Slim Row (100% Logs.jsx Match) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={13} color="#2563EB" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Requests / sec
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{stats.requests_per_second || 0}</span>
              <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                Live Stream
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={13} color="#DC2626" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active L7 Threats
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#DC2626', lineHeight: '1.1', marginTop: '1px' }}>
              {stats.active_threats || 0} Events
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#FAF5FF',
            border: '1px solid #E9D5FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Ban size={13} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DDoS Blocked IPs
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#7C3AED', lineHeight: '1.1', marginTop: '1px' }}>
              {data?.blocked_count || 0}
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={13} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active HTTP Sessions
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#059669', lineHeight: '1.1', marginTop: '1px' }}>
              {data?.active_sessions || 0}
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR (100% Logs.jsx Match) */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '14px',
        borderBottom: '1px solid #D9E1DC',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'overview', label: 'Live Traffic & Mitigation', icon: Activity },
          { id: 'config', label: 'Shield Configuration & Default Rate Limit', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#2563EB' : '#64748B',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                borderBottom: isActive ? '2.5px solid #2563EB' : '2.5px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ==================== TAB 1: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
            {/* Chart: Request Velocity */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} color="#2563EB" />
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>Volumetric Request Velocity</strong>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                  Real-time Sliding Window
                </span>
              </div>
              <div style={{ height: '190px' }}>
                <Line data={timelineData} options={lineOptions} />
              </div>
            </div>

            {/* Live System Metrics (Real psutil values) */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={14} color="#059669" />
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>WAF Cluster Node Telemetry</strong>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Live Host Load (psutil)</span>
              </div>

              <div>
                {[
                  { label: 'CPU Load Capacity', value: Number(sys.cpu_percent || 0).toFixed(1), unit: '%', color: '#2563EB', icon: Cpu },
                  { label: 'RAM Memory Allocation', value: Number(sys.memory_percent || 0).toFixed(1), unit: '%', color: '#7C3AED', icon: HardDrive },
                  { label: 'Established TCP Sockets', value: sys.active_connections || 0, unit: ' conns', color: '#059669', icon: Radio },
                ].map((item, i) => {
                  const Icon = item.icon
                  const numVal = parseFloat(item.value) || 0
                  return (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                        <span style={{ color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon size={13} color={item.color} />
                          {item.label}
                        </span>
                        <span style={{ fontWeight: '700', color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.value}{item.unit}
                        </span>
                      </div>
                      <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(numVal, 100)}%`, background: item.color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={13} color="#059669" />
                <span>Dynamic rate limiting adjusts multiplier when CPU &gt; 80% or RAM &gt; 85%.</span>
              </div>
            </div>
          </div>

          {/* Dual Action Strip: High-Velocity Attack Sources & Mitigation Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
            {/* Left: High-Velocity Attack Sources */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={14} color="#DC2626" />
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>High-Velocity Attack Sources</strong>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Reputation Engine</span>
              </div>

              <div style={{ padding: '12px 16px' }}>
                <form onSubmit={handleBlockIP} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Enter IP (e.g. 198.51.100.99) to immediately ban..."
                    value={blockIp}
                    onChange={e => setBlockIp(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #D9E1DC', borderRadius: '6px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '7px 14px', borderRadius: '6px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Ban size={12} />
                    <span>Block IP</span>
                  </button>
                </form>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                        <th style={{ padding: '8px 10px' }}>Client IP</th>
                        <th style={{ padding: '8px 10px' }}>Flood Score</th>
                        <th style={{ padding: '8px 10px' }}>Tier</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topIps.length > 0 ? topIps.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700', color: '#0F172A' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span>{item.ip}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.ip, item.ip)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
                              >
                                {copiedId === item.ip ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10.5px', fontWeight: '700', background: (item.score || 0) >= 50 ? '#FEF2F2' : '#FEF3C7', color: (item.score || 0) >= 50 ? '#DC2626' : '#B45309', border: '1px solid ' + ((item.score || 0) >= 50 ? '#FECACA' : '#FDE68A') }}>
                              {item.score || 0}/100
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: '700', color: (item.level || 0) >= 4 ? '#DC2626' : '#B45309' }}>
                              Level {item.level || 4}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleUnblockIP(item.ip)}
                              style={{ padding: '3px 8px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Unblock
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 10px' }}>
                            No active high-velocity flood offenders detected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Real-Time Mitigation Alerts */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#7C3AED" />
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>Real-Time Mitigation Event Log</strong>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Sliding Stream</span>
              </div>

              <div style={{ padding: '12px 16px', maxHeight: '270px', overflowY: 'auto' }}>
                {alertsList.length > 0 ? alertsList.slice(0, 10).map((alert, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F1F5F9', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: alert.severity === 'critical' ? '#FEF2F2' : '#FEF3C7', color: alert.severity === 'critical' ? '#DC2626' : '#B45309', border: '1px solid ' + (alert.severity === 'critical' ? '#FECACA' : '#FDE68A') }}>
                      <AlertTriangle size={12} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {alert.title || alert.message || 'Volumetric Spike Mitigated'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                        Source: <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10201E' }}>{alert.ip || 'Cluster'}</code> &bull; {alert.timestamp || 'Just now'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                    <ShieldCheck size={28} color="#059669" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#10201E' }}>Cluster Traffic Clean</div>
                    <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#87948D' }}>No volumetric request floods recorded in the last 60 minutes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CONFIGURATION ==================== */}
      {activeTab === 'config' && (
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA' }}>
            <h3 style={{ margin: '0 0 2px', fontSize: '14px', color: '#0F172A', fontWeight: '800' }}>DDoS Protection Policy &amp; Default Rate-Limit Baseline</h3>
            <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>Acts as the automatic platform baseline if a tenant has not customized per-site rate limits.</p>
          </div>

          <form onSubmit={handleSaveConfig} style={{ padding: '20px', maxWidth: '640px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Max Requests per Second (per IP)
              </label>
              <input
                type="number"
                value={config?.max_rps || 50}
                onChange={e => setConfig({ ...config, max_rps: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                Connections exceeding this rate will automatically receive HTTP 429 Too Many Requests.
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Temporary Ban Duration (Seconds)
              </label>
              <input
                type="number"
                value={config?.ban_duration_seconds || 3600}
                onChange={e => setConfig({ ...config, ban_duration_seconds: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                Default progressive L4 ban duration (3600s = 1 hour).
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Enforcement Mode
              </label>
              <select
                value={config?.mode || 'protect'}
                onChange={e => setConfig({ ...config, mode: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="protect">Active Mitigation &amp; Rate Drop (Recommended)</option>
                <option value="monitor">Telemetry &amp; Logging Only (Monitor Mode)</option>
                <option value="aggressive">Aggressive Volumetric Shield (Zero Tolerance)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              style={{ padding: '9px 20px', borderRadius: '6px', background: '#2563EB', border: '1px solid #1D4ED8', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: savingConfig ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCw size={13} className={savingConfig ? 'animate-spin' : ''} />
              <span>{savingConfig ? 'Saving Policies...' : 'Save DDoS Policies'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
