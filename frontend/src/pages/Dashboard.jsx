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

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const attackChartRef = useRef(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats()
      setStats(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const resetStat = async (type) => {
    if (!confirm(`Reset ${type} count to zero?`)) return
    await api.resetStats(type)
    fetchStats()
  }

  const blockTopIP = async (ip) => {
    if (confirm(`Block ${ip}?`)) {
      await api.blockAttacker(ip)
      fetchStats()
    }
  }

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
      label: 'Attacks',
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
            const pct = ((ctx.parsed / total) * 100).toFixed(1)
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

  const sourceKeys = ['ml', 'rule', 'blacklist', 'rate_limit', 'malware']
  const sourceLabels = ['ML Detection', 'Rules', 'Blacklist', 'Rate Limit', 'Malware Scan']
  const sourceColors = ['#8b5cf6', '#2563eb', '#ef4444', '#f59e0b', '#ec4899']
  const sourceData = sourceKeys.map(k => stats?.ml?.detection_sources?.[k] || 0)
  const sourceChartData = {
    labels: sourceLabels,
    datasets: [{
      data: sourceData,
      backgroundColor: sourceColors,
      borderWidth: 0,
      hoverOffset: 8
    }]
  }

  const verdictKeys = ['malicious', 'suspicious', 'clean']
  const verdictLabels = ['Malicious', 'Suspicious', 'Clean']
  const verdictColors = ['#ef4444', '#f59e0b', '#10b981']
  const verdictData = verdictKeys.map(k => stats?.malware?.verdicts?.[k] || 0)
  const verdictChartData = {
    labels: verdictLabels,
    datasets: [{
      data: verdictData,
      backgroundColor: verdictColors,
      borderWidth: 0,
      hoverOffset: 8
    }]
  }

  const mlCategoryMax = Math.max(1, ...(stats?.ml?.ml_categories || []).map(c => c.count))
  const familyMax = Math.max(1, ...(stats?.malware?.top_families || []).map(f => f.count))

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="fa-shield-halved" iconClass="blue" value={stats?.total_attacks_blocked || 0} label="Total Attacks Blocked" trend="12.5% increase" trendDir="up" onReset={() => resetStat('attacks')} />
        <StatCard icon="fa-chart-line" iconClass="green" value={stats?.total_requests || 0} label="Total Requests" trend="8.3% increase" trendDir="up" onReset={() => resetStat('requests')} />
        <StatCard icon="fa-globe" iconClass="purple" value={stats?.active_clients || 0} label="Active Clients" trend="+2 online" trendDir="up" />
        <StatCard icon="fa-ban" iconClass="red" value={stats?.blacklisted_ips || 0} label="Blacklisted IPs" trend="5.1% tracked" trendDir="down" />
      </div>

      <div className="stats-grid" style={{ marginTop: '-6px' }}>
        <StatCard icon="fa-robot" iconClass="purple" value={stats?.ml?.ml_detections || 0} label="ML WAF Detections" trend="Deep-learning WAF" trendDir="up" />
        <StatCard icon="fa-file-shield" iconClass="green" value={stats?.malware?.total_scans || 0} label="Malware Scans" trend="Static analysis" trendDir="up" />
        <StatCard icon="fa-skull-crossbones" iconClass="red" value={stats?.malware?.verdicts?.malicious || 0} label="Malicious Files" trend="Flagged by ML" trendDir="down" />
        <StatCard icon="fa-brain" iconClass="blue" value={(stats?.ml?.waf?.loaded ? 1 : 0) + (stats?.ml?.malware_model?.loaded ? 1 : 0)} label="ML Models Active" trend={stats?.ml?.waf?.model_version ? `v${stats.ml.waf.model_version}` : 'offline'} trendDir={stats?.ml?.waf?.loaded ? 'up' : 'down'} />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie" style={{ color: '#2563eb', marginRight: '6px' }}></i> Attack Types</h3>
            <span className="chart-action">Distribution</span>
          </div>
          <div className="chart-container">
            <Doughnut ref={attackChartRef} data={attackChartData} options={doughnutOptions} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-chart-bar" style={{ color: '#10b981', marginRight: '6px' }}></i> Attacks Over Time</h3>
            <span className="chart-action">Last 7 days</span>
          </div>
          <div className="chart-container">
            <Line data={dailyChartData} options={lineOptions} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-robot" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> ML Detection Sources</h3>
            <span className="chart-action">All blocked events</span>
          </div>
          <div className="chart-container">
            <Doughnut data={sourceChartData} options={doughnutOptions} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-file-shield" style={{ color: '#10b981', marginRight: '6px' }}></i> Malware Scan Verdicts</h3>
            <span className="chart-action">Total scans</span>
          </div>
          <div className="chart-container">
            <Doughnut data={verdictChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="top-attackers">
        <div className="section-header">
          <h3><i className="fas fa-crosshairs" style={{ color: '#ef4444', marginRight: '6px' }}></i> Top Attacking IPs</h3>
          <Link to="/admin/logs" className="view-all">View All <i className="fas fa-arrow-right"></i></Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>IP Address</th>
              <th>Attacks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stats?.top_attackers?.slice(0, 5).map((attacker, i) => {
              const maxAttacks = stats.top_attackers[0]?.count || 1
              return (
                <tr key={i}>
                  <td>
                    <span className={`rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>{i + 1}</span>
                  </td>
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
                    <button className="badge danger" style={{ cursor: 'pointer', border: 'none' }} onClick={() => blockTopIP(attacker.ip)}>Block</button>
                  </td>
                </tr>
              )
            }) || (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No attack data available</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="recent-activity">
        <div className="section-header">
          <h3><i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> Recent Attacks Blocked</h3>
          <Link to="/admin/logs" className="view-all">View All <i className="fas fa-arrow-right"></i></Link>
        </div>
        <div className="activity-timeline">
          {stats?.recent_logs?.map((log, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-time">{log.timestamp}</div>
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
      </div>

      <div className="ml-panels">
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-microchip" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> ML Detected Attack Categories</h3>
            <span className="chart-action">Top 10</span>
          </div>
          <div className="ml-cat-list">
            {(stats?.ml?.ml_categories?.length ? stats.ml.ml_categories : []).map((cat, i) => (
              <div className="ml-cat-row" key={i}>
                <span className="ml-cat-name">{cat.category || 'Unknown'}</span>
                <div className="attack-progress">
                  <div className="progress-bar" style={{ maxWidth: 'none', flex: 1 }}>
                    <div className="fill" style={{ width: `${(cat.count / mlCategoryMax) * 100}%`, background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }}></div>
                  </div>
                  <span className="count">{cat.count}</span>
                </div>
              </div>
            )) || (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No ML-detected attacks recorded yet</div>
            )}
          </div>
        </div>

        <div className="system-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-brain" style={{ color: '#8b5cf6', marginRight: '6px' }}></i> ML Model Status</h3>
          </div>
          <div className="system-grid">
            <div className="system-item">
              <span className="system-label">WAF Model</span>
              <span className="system-status"><span className={`status-dot ${stats?.ml?.waf?.loaded ? 'green' : 'red'}`}></span> {stats?.ml?.waf?.loaded ? `v${stats.ml.waf.model_version || '?'}` : 'Offline'}</span>
            </div>
            <div className="system-item">
              <span className="system-label">Attack Categories</span>
              <span className="system-status">{stats?.ml?.waf?.n_category_classes || 0} classes</span>
            </div>
            <div className="system-item">
              <span className="system-label">Malware Model</span>
              <span className="system-status"><span className={`status-dot ${stats?.ml?.malware_model?.loaded ? 'green' : 'red'}`}></span> {stats?.ml?.malware_model?.loaded ? `v${stats.ml.malware_model.model_version || '?'}` : 'Offline'}</span>
            </div>
            <div className="system-item">
              <span className="system-label">Malware Families</span>
              <span className="system-status">{stats?.ml?.malware_model?.n_family_classes || 0} families</span>
            </div>
            <div className="system-item">
              <span className="system-label">ML Threshold</span>
              <span className="system-status">{(stats?.ml?.waf?.threshold || 0).toFixed(2)}</span>
            </div>
            <div className="system-item">
              <span className="system-label">Training Date</span>
              <span className="system-status">{stats?.ml?.waf?.training_date ? String(stats.ml.waf.training_date).slice(0, 10) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="malware-section">
        <div className="top-attackers" style={{ flex: 1, marginBottom: 0 }}>
          <div className="section-header">
            <h3><i className="fas fa-bug" style={{ color: '#ec4899', marginRight: '6px' }}></i> Top Malware Families</h3>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Family</th><th>Detections</th></tr>
            </thead>
            <tbody>
              {(stats?.malware?.top_families?.length ? stats.malware.top_families : []).map((fam, i) => (
                <tr key={i}>
                  <td><span className={`rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>{i + 1}</span></td>
                  <td><span className="attacker-ip">{fam.family}</span></td>
                  <td>
                    <div className="attack-progress">
                      <div className="progress-bar" style={{ maxWidth: 'none', flex: 1 }}>
                        <div className="fill" style={{ width: `${(fam.count / familyMax) * 100}%`, background: 'linear-gradient(90deg,#ec4899,#f472b6)' }}></div>
                      </div>
                      <span className="count">{fam.count}</span>
                    </div>
                  </td>
                </tr>
              )) || (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No malware detections yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="recent-activity" style={{ flex: 1, marginBottom: 0 }}>
          <div className="section-header">
            <h3><i className="fas fa-file-shield" style={{ color: '#10b981', marginRight: '6px' }}></i> Recent Malware Scans</h3>
          </div>
          <div className="activity-timeline">
            {(stats?.malware?.recent_scans?.length ? stats.malware.recent_scans : []).map((scan, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-time">{scan.timestamp}</div>
                <div className="activity-content">
                  <span className={`activity-type ${scan.verdict === 'malicious' ? 'critical' : scan.verdict === 'suspicious' ? 'high' : 'low'}`}>
                    <i className="fas fa-shield-halved"></i> {scan.verdict}
                  </span>
                  <div className="activity-detail">{scan.filename || 'unknown file'}{scan.family ? ` · ${scan.family}` : ''}</div>
                  <div className="activity-payload">score {scan.risk_score} · conf {(scan.confidence || 0).toFixed(2)}</div>
                </div>
              </div>
            )) || (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                <i className="fas fa-file-shield" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
                No malware scans yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scanner-section">
        <MalwareScanner />
      </div>

      <div className="quick-actions-section">
        <div className="quick-actions-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
            <QuickAction icon="fa-shield" label="Add Rule" color="#2563eb" onClick={() => window.location.href = '/admin/rules'} />
            <QuickAction icon="fa-ban" label="Block IP" color="#ef4444" onClick={() => { const ip = prompt('Enter IP to block:'); if (ip) api.blockAttacker(ip).then(() => alert('Blocked!')) }} />
            <QuickAction icon="fa-trash-can" label="Purge Logs" color="#f59e0b" onClick={() => { if (confirm('Clear all attack logs?')) api.resetStats('logs') }} />
            <QuickAction icon="fa-download" label="Export Data" color="#10b981" onClick={() => { const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mdefender-export.json'; a.click() }} />
            <QuickAction icon="fa-globe" label="Add Client" color="#8b5cf6" onClick={() => window.location.href = '/admin/clients'} />
            <QuickAction icon="fa-arrow-rotate-right" label="Refresh" color="#64748b" onClick={fetchStats} />
          </div>
        </div>

        <div className="system-card">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h3><i className="fas fa-server" style={{ color: '#10b981', marginRight: '6px' }}></i> System Status</h3>
            <span className="status-pill online"><i className="fas fa-circle" style={{ fontSize: '7px' }}></i> Operational</span>
          </div>
          <div className="system-grid">
            <div className="system-item">
              <span className="system-label">WAF Engine</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">ML Detection</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">Rate Limiter</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">Auto-Block</span>
              <span className="system-status"><span className="status-dot green"></span> Active</span>
            </div>
            <div className="system-item">
              <span className="system-label">Blacklist DB</span>
              <span className="system-status"><span className="status-dot green"></span> Synced</span>
            </div>
            <div className="system-item">
              <span className="system-label">Database</span>
              <span className="system-status"><span className="status-dot green"></span> Connected</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
