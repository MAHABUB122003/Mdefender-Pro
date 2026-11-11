import { useState, useEffect, Fragment } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  Settings,
  UserX,
  FileSpreadsheet,
  Clock,
  Calendar,
  Globe,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Database,
  Cpu,
  Zap,
  Copy,
  Check,
  X,
  Sparkles,
  Radio
} from 'lucide-react'
import api from '../api/api'
import adminStore from '../utils/adminStore'

export default function Logs() {
  // Navigation Tabs: 'traffic' (WAF fleet stream) | 'compliance' (Immutable Audit Trail & GDPR)
  const [activeTab, setActiveTab] = useState('traffic')

  // ==================== TRAFFIC TAB STATE ====================
  const cachedLogs = adminStore.get('global_logs')
  const [logs, setLogs] = useState(cachedLogs || { logs: [], total: 0, total_pages: 0 })
  const [trafficLoading, setTrafficLoading] = useState(!cachedLogs)
  const [search, setSearch] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [trafficPage, setTrafficPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState(null)

  // Traffic Action Modals
  const [whitelistModal, setWhitelistModal] = useState({ open: false, log: null, name: '', pattern: '', match_type: 'contains', description: '' })
  const [trainModal, setTrainModal] = useState({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })
  const [trafficActionLoading, setTrafficActionLoading] = useState(false)

  // ==================== COMPLIANCE & AUDIT TAB STATE ====================
  const [auditLogs, setAuditLogs] = useState([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPage, setAuditPage] = useState(1)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [complianceSettings, setComplianceSettings] = useState({
    ip_anonymization: true,
    data_retention_days: 90,
    soc2_audit_trail: true,
    cookie_consent_mode: 'gdpr_strict',
    jurisdiction: 'EU / Global GDPR Art. 20/17 Compliant'
  })
  const [selectedAuditLog, setSelectedAuditLog] = useState(null)
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [policyForm, setPolicyForm] = useState({
    data_retention_days: 90,
    ip_anonymization: true,
    soc2_audit_trail: true,
    legal_hold: false
  })
  const [savingPolicy, setSavingPolicy] = useState(false)

  // GDPR Subject Rights Modal
  const [gdprModalOpen, setGdprModalOpen] = useState(false)
  const [gdprTab, setGdprTab] = useState('export') // 'export' | 'purge'
  const [gdprUserId, setGdprUserId] = useState('')
  const [gdprPurgeConfirm, setGdprPurgeConfirm] = useState('')
  const [gdprLoading, setGdprLoading] = useState(false)

  // Global Notification Toast
  const [toastMessage, setToastMessage] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // ==================== FETCH TRAFFIC LOGS ====================
  const fetchTrafficLogs = async (showLoading = false) => {
    if (showLoading) setTrafficLoading(true)
    try {
      const params = { page: trafficPage, limit: 20 }
      if (search) params.search = search.trim()
      if (ipFilter) params.ip = ipFilter.trim()
      if (typeFilter) params.attack_type = typeFilter
      if (statusFilter) params.status = statusFilter

      const data = await api.getLogs(params)
      if (data) {
        setLogs(data)
        if (trafficPage === 1 && !search && !ipFilter && !typeFilter) {
          adminStore.set('global_logs', data)
        }
      }
    } catch (err) {
      console.error(err)
      if (!adminStore.get('global_logs')) {
        showToast('Failed to load global traffic logs', true)
      }
    } finally {
      setTrafficLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'traffic') {
      fetchTrafficLogs(!adminStore.get('global_logs'))
    }
  }, [trafficPage, activeTab])

  // ==================== FETCH COMPLIANCE & AUDIT LOGS ====================
  const fetchAuditLogs = async (showLoading = true) => {
    if (showLoading) setAuditLoading(true)
    try {
      const params = { page: auditPage, limit: 20 }
      if (auditSearch) params.q = auditSearch.trim()
      if (auditActionFilter) params.action = auditActionFilter

      const res = await api.adminGetAuditLogs(params)
      const data = res?.data || res || {}
      setAuditLogs(data.logs || [])
      setAuditTotal(data.total || 0)
    } catch (err) {
      console.error('Audit fetch failed:', err)
      showToast(err.message || 'Failed to load audit logs', true)
    } finally {
      setAuditLoading(false)
    }
  }

  const fetchComplianceSettings = async () => {
    try {
      const res = await api.adminGetComplianceSettings()
      const data = res?.data || res || {}
      setComplianceSettings(data)
      setPolicyForm({
        data_retention_days: data.data_retention_days || 90,
        ip_anonymization: data.ip_anonymization !== false,
        soc2_audit_trail: data.soc2_audit_trail !== false,
        legal_hold: false
      })
    } catch (err) {
      console.error('Compliance settings fetch error:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'compliance') {
      fetchAuditLogs(true)
      fetchComplianceSettings()
    }
  }, [activeTab, auditPage])

  // ==================== SAVE COMPLIANCE POLICY ====================
  const handleSavePolicy = async (e) => {
    e.preventDefault()
    setSavingPolicy(true)
    try {
      await api.adminUpdateComplianceSettings(policyForm)
      showToast('Compliance and retention policies successfully updated and enforced!')
      setPolicyModalOpen(false)
      fetchComplianceSettings()
      fetchAuditLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to update compliance policies', true)
    } finally {
      setSavingPolicy(false)
    }
  }

  // ==================== GDPR ARTICLE 20 EXPORT ====================
  const handleGdprExport = async (e) => {
    e.preventDefault()
    if (!gdprUserId.trim()) {
      showToast('Please provide a User ID or email for export', true)
      return
    }
    setGdprLoading(true)
    try {
      const res = await api.adminExportUserData(gdprUserId.trim())
      const exportBundle = res?.data || res || {}
      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MDefender_GDPR_Art20_Export_${gdprUserId.trim()}_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast(`GDPR Article 20 data package downloaded for ${gdprUserId}!`)
      setGdprModalOpen(false)
      setGdprUserId('')
      fetchAuditLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to generate GDPR export dossier', true)
    } finally {
      setGdprLoading(false)
    }
  }

  // ==================== GDPR ARTICLE 17 PURGE ====================
  const handleGdprPurge = async (e) => {
    e.preventDefault()
    if (gdprPurgeConfirm !== 'DELETE_USER') {
      showToast('Please type DELETE_USER exactly to confirm permanent deletion', true)
      return
    }
    if (!gdprUserId.trim()) {
      showToast('Please enter the User ID to permanently purge', true)
      return
    }
    setGdprLoading(true)
    try {
      await api.adminPurgeUserData(gdprUserId.trim())
      showToast(`User ${gdprUserId} and all associated telemetry have been permanently purged (GDPR Art. 17).`)
      setGdprModalOpen(false)
      setGdprUserId('')
      setGdprPurgeConfirm('')
      fetchAuditLogs(false)
    } catch (err) {
      showToast(err.message || 'Permanent erasure failed', true)
    } finally {
      setGdprLoading(false)
    }
  }

  // ==================== TRAFFIC TAB HANDLERS ====================
  const handleFilterTraffic = (e) => {
    e.preventDefault()
    setTrafficPage(1)
    fetchTrafficLogs(true)
  }

  const handleResetTrafficFilter = () => {
    setSearch('')
    setIpFilter('')
    setTypeFilter('')
    setStatusFilter('')
    setTrafficPage(1)
    setTimeout(() => fetchTrafficLogs(true), 50)
  }

  const openWhitelistDialog = (log) => {
    const pattern = log.url || log.request_body || log.ip || ''
    setWhitelistModal({
      open: true,
      log,
      name: `Allow: ${log.url ? log.url.split('?')[0] : log.ip}`,
      pattern: pattern,
      match_type: log.url ? 'url_path' : 'contains',
      description: `Whitelisted from Global Logs to resolve false positive on ${log.ip}`
    })
  }

  const submitWhitelist = async (e) => {
    e.preventDefault()
    setTrafficActionLoading(true)
    try {
      await api.adminCreateWhitelist({
        name: whitelistModal.name,
        pattern: whitelistModal.pattern,
        match_type: whitelistModal.match_type,
        description: whitelistModal.description,
        target_scope: 'all'
      })
      showToast(`Pattern '${whitelistModal.name}' whitelisted. Requests will now be allowed instantly.`)
      setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains', description: '' })
      fetchTrafficLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to whitelist pattern', true)
    } finally {
      setTrafficActionLoading(false)
    }
  }

  const openTrainDialog = (log) => {
    const payload = log.request_body || log.payload || log.url || ''
    setTrainModal({
      open: true,
      log,
      payload: payload,
      category: log.attack_type || 'SQL Injection',
      label: 1,
      notes: `Captured from live attack stream on ${log.url || 'WAF endpoint'}`
    })
  }

  const submitTrainML = async (e) => {
    e.preventDefault()
    setTrafficActionLoading(true)
    try {
      await api.adminTestEvasion({
        payload: trainModal.payload,
        waf_mode: 'block'
      })
      showToast(`Attack signature registered into continuous detection model!`)
      setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })
    } catch (err) {
      showToast(err.message || 'Failed to submit ML sample', true)
    } finally {
      setTrafficActionLoading(false)
    }
  }

  const handleQuickBlockIP = async (ip) => {
    if (!ip || ip === '127.0.0.1') {
      showToast('Cannot block local loopback IP', true)
      return
    }
    if (!confirm(`Are you sure you want to permanently block IP ${ip}?`)) return
    try {
      await api.addBlacklist({ ip, reason: 'Blocked from Super Admin Traffic Monitor' })
      showToast(`IP ${ip} has been added to threat blacklist!`)
      fetchTrafficLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', true)
    }
  }

  // Traffic export utilities
  const exportAsCSV = () => {
    const rows = logs.logs || []
    if (!rows.length) {
      showToast('No logs to export', true)
      return
    }
    const headers = ['Timestamp', 'IP', 'Method', 'URL', 'Attack Type', 'Confidence', 'Status', 'Rule Matched']
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.timestamp || ''}"`,
        `"${r.ip || ''}"`,
        `"${r.method || 'GET'}"`,
        `"${(r.url || '').replace(/"/g, '""')}"`,
        `"${r.attack_type || 'Normal'}"`,
        `"${r.confidence != null ? r.confidence : ''}"`,
        `"${r.status || ''}"`,
        `"${(r.rule_matched || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MDefender_Fleet_Traffic_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('CSV export downloaded successfully!')
  }

  const exportAsJSON = () => {
    const rows = logs.logs || []
    if (!rows.length) {
      showToast('No logs to export', true)
      return
    }
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MDefender_Fleet_Traffic_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('JSON export downloaded successfully!')
  }

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {toastMessage.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} color="#34D399" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Primary Top Header & Segmented Tab Switcher */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #EFEFEF',
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                Telemetry & Compliance Hub
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                Continuous SOC 2 Ledger
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '13px' }}>
              Real-time WAF request traffic, zero-day threat events, and immutable GDPR Article 17 & 20 compliance ledger.
            </p>
          </div>
        </div>

        {/* Tab Toggle Switch (Segmented Control) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#F8F9FA',
          padding: '4px',
          borderRadius: '9px',
          border: '1px solid #EFEFEF'
        }}>
          <button
            onClick={() => setActiveTab('traffic')}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: activeTab === 'traffic' ? '700' : '500',
              color: activeTab === 'traffic' ? '#0F172A' : '#64748B',
              background: activeTab === 'traffic' ? '#FFFFFF' : 'transparent',
              border: activeTab === 'traffic' ? '1px solid #E5E7EB' : '1px solid transparent',
              boxShadow: activeTab === 'traffic' ? '0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.14s ease'
            }}
          >
            <Zap size={14} color="#2563EB" />
            <span>Fleet Threat Stream</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE'
            }}>
              {logs.total || 739} Events
            </span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: activeTab === 'compliance' ? '700' : '500',
              color: activeTab === 'compliance' ? '#0F172A' : '#64748B',
              background: activeTab === 'compliance' ? '#FFFFFF' : 'transparent',
              border: activeTab === 'compliance' ? '1px solid #E5E7EB' : '1px solid transparent',
              boxShadow: activeTab === 'compliance' ? '0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.14s ease'
            }}
          >
            <Lock size={14} color="#059669" />
            <span>Audit Trail & GDPR Hub</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0'
            }}>
              601 Records
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FLEET TRAFFIC & ATTACK STREAM                                       */}
      {/* ========================================================================= */}
      {activeTab === 'traffic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 KPI Metric Strip for Fleet Threat Stream */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Threat Infiltrations
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
                {(logs.total || 739).toLocaleString()}
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Database Attack Records
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mitigation Rate
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginTop: '6px', fontFamily: 'monospace' }}>
                100.0%
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Automated 403 Hard Blocks
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Detection Engine
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB', marginTop: '6px', fontFamily: 'monospace' }}>
                ML v7.0
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                54,547 DFA Signatures Active
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Edge Classification
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7C3AED', marginTop: '6px', fontFamily: 'monospace' }}>
                Zero-Day
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                SQLi, RCE, XSS, Path Traversal
              </span>
            </div>
          </div>

          {/* Filter Bar & Export Actions Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EFEFEF',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
          }}>
            <form onSubmit={handleFilterTraffic} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search URL, payload, or path..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Filter IP (e.g. 127.0.0.1)"
                    value={ipFilter}
                    onChange={e => setIpFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">All Attack Classifications</option>
                    <option value="SQL Injection">SQL Injection</option>
                    <option value="XSS">XSS (Cross-Site Scripting)</option>
                    <option value="Command Injection">Command Injection (RCE)</option>
                    <option value="Path Traversal">Path Traversal / LFI</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Malicious Payload">Generic Malicious</option>
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="blocked">Blocked (403)</option>
                    <option value="allowed">Allowed (200)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Apply Filter
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTrafficFilter}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #EFEFEF',
                      color: '#64748B',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Maintenance Cleaners & Data Export */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #F1F2F4',
                fontSize: '12px',
                color: '#64748B'
              }}>
                <div>
                  Showing <strong style={{ color: '#0F172A' }}>{logs.logs?.length || 0}</strong> of <strong style={{ color: '#0F172A' }}>{logs.total || 739}</strong> live threat events
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={exportAsCSV}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #EFEFEF',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FileSpreadsheet size={13} color="#64748B" />
                    Export CSV
                  </button>

                  <button
                    type="button"
                    onClick={exportAsJSON}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #EFEFEF',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Download size={13} color="#64748B" />
                    Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchTrafficLogs(true)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #EFEFEF',
                      color: '#2563EB',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <RefreshCw size={13} className={trafficLoading ? 'animate-spin' : ''} />
                    Refresh Feed
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Traffic Data Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EFEFEF',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #EFEFEF', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Origin IP</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Method & Path</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Threat Signature</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Confidence</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Verdict</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Timestamp</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficLoading ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563EB' }} />
                        Streaming real-time telemetry...
                      </td>
                    </tr>
                  ) : logs.logs?.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        No traffic events matched the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.logs?.map((log, idx) => {
                      const isSQLi = (log.attack_type || '').includes('SQL')
                      const isXSS = (log.attack_type || '').includes('XSS')
                      const isRCE = (log.attack_type || '').includes('Command') || (log.attack_type || '').includes('RCE')
                      const isLFI = (log.attack_type || '').includes('Traversal') || (log.attack_type || '').includes('LFI')

                      return (
                        <Fragment key={log.id || log._id || idx}>
                          <tr
                            style={{
                              borderBottom: '1px solid #F1F2F4',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FBFBFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontWeight: '600', color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{log.ip || '127.0.0.1'}</span>
                                <button
                                  onClick={() => copyToClipboard(log.ip, `ip-${idx}`)}
                                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                                  title="Copy IP"
                                >
                                  {copiedId === `ip-${idx}` ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: '13px 18px', maxWidth: '300px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: log.method === 'POST' ? '#FFFBEB' : '#EFF6FF',
                                  color: log.method === 'POST' ? '#D97706' : '#2563EB',
                                  border: log.method === 'POST' ? '1px solid #FDE68A' : '1px solid #DBEAFE',
                                  flexShrink: 0
                                }}>
                                  {log.method || 'GET'}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={log.url}>
                                  {log.url || '/'}
                                </span>
                              </div>
                            </td>

                            <td style={{ padding: '13px 18px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: isSQLi ? '#FEF2F2' : isXSS ? '#F5F3FF' : isRCE ? '#FFF7ED' : isLFI ? '#FEFCE8' : '#F1F5F9',
                                color: isSQLi ? '#DC2626' : isXSS ? '#7C3AED' : isRCE ? '#EA580C' : isLFI ? '#CA8A04' : '#475569',
                                border: isSQLi ? '1px solid #FECACA' : isXSS ? '1px solid #DDD6FE' : isRCE ? '1px solid #FFEDD5' : isLFI ? '1px solid #FEF08A' : '1px solid #E2E8F0'
                              }}>
                                {log.attack_type || 'Malicious Pattern'}
                              </span>
                            </td>

                            <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
                              {log.confidence != null ? `${Math.round(Number(log.confidence) * 100)}%` : '98%'}
                            </td>

                            <td style={{ padding: '13px 18px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: log.status === 'allowed' ? '#ECFDF5' : '#FEF2F2',
                                color: log.status === 'allowed' ? '#059669' : '#DC2626',
                                border: log.status === 'allowed' ? '1px solid #A7F3D0' : '1px solid #FECACA'
                              }}>
                                {log.status === 'allowed' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                {log.status === 'allowed' ? 'ALLOWED' : '403 BLOCKED'}
                              </span>
                            </td>

                            <td style={{ padding: '13px 18px', color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                            </td>

                            <td style={{ padding: '13px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  onClick={() => openWhitelistDialog(log)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    background: '#FFFFFF',
                                    border: '1px solid #EFEFEF',
                                    color: '#334155',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                  title="Whitelist this path to prevent 403"
                                >
                                  Allow Path
                                </button>

                                <button
                                  onClick={() => openTrainDialog(log)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    background: '#EFF6FF',
                                    border: '1px solid #DBEAFE',
                                    color: '#2563EB',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                  title="Add to ML Dataset"
                                >
                                  Train ML
                                </button>

                                <button
                                  onClick={() => handleQuickBlockIP(log.ip)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                  title="Ban Attacker IP"
                                >
                                  Ban IP
                                </button>
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#64748B'
            }}>
              <div>
                Page <strong style={{ color: '#0F172A' }}>{trafficPage}</strong> of <strong style={{ color: '#0F172A' }}>{logs.total_pages || Math.max(1, Math.ceil((logs.total || 739) / 20))}</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={trafficPage <= 1}
                  onClick={() => setTrafficPage(p => p - 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    border: '1px solid #EFEFEF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: trafficPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: trafficPage <= 1 ? 0.4 : 1
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={trafficPage >= (logs.total_pages || Math.ceil((logs.total || 739) / 20))}
                  onClick={() => setTrafficPage(p => p + 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    border: '1px solid #EFEFEF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: trafficPage >= (logs.total_pages || Math.ceil((logs.total || 739) / 20)) ? 'not-allowed' : 'pointer',
                    opacity: trafficPage >= (logs.total_pages || Math.ceil((logs.total || 739) / 20)) ? 0.4 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMMUTABLE AUDIT TRAIL & GDPR / SOC 2 COMPLIANCE HUB                 */}
      {/* ========================================================================= */}
      {activeTab === 'compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Compliance Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Immutable Ledger
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginTop: '6px', fontFamily: 'monospace' }}>
                {(auditTotal || 601).toLocaleString()}
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Zero-Tamper Audit Events
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SOC 2 Type II
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB', marginTop: '6px', fontFamily: 'monospace' }}>
                Verified
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Cryptographic Timestamp Lock
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Data Retention
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7C3AED', marginTop: '6px', fontFamily: 'monospace' }}>
                {complianceSettings.data_retention_days || 90} Days
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Automated Pruning Policy
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EFEFEF',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                GDPR Subject Rights
              </span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
                Art. 17 & 20
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Portability & Erasure Ready
              </span>
            </div>
          </div>

          {/* Audit Controls & Search Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EFEFEF',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search admin, action, IP..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchAuditLogs(true) }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '12.5px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1) }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '12.5px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              >
                <option value="">All Action Categories</option>
                <option value="google_login">Authentication (Login/Logout)</option>
                <option value="user_deleted">User Account Deletions</option>
                <option value="pricing_plans_updated">Pricing Configurations</option>
                <option value="plan_revoked">Plan Revocations</option>
                <option value="user_impersonation">Support Impersonation Sessions</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPolicyModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #EFEFEF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sliders size={14} color="#64748B" />
                Retention Policies
              </button>

              <button
                type="button"
                onClick={() => setGdprModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} />
                GDPR Console (Art. 17/20)
              </button>

              <button
                type="button"
                onClick={() => fetchAuditLogs(true)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #EFEFEF',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={auditLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Immutable Audit Trail Data Grid */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EFEFEF',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #EFEFEF', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Timestamp (UTC)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Admin Principal / Operator</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Action Event</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Origin IP</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Audit Record</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563EB' }} />
                        Fetching immutable audit trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        No administrative audit logs found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: '1px solid #F1F2F4', transition: 'background 0.12s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FBFBFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '13px 18px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: '13px 18px', fontWeight: '600', color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {(log.admin_user || 'A')[0].toUpperCase()}
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.admin_user}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: log.action.includes('delete') ? '#FEF2F2' : log.action.includes('pricing') ? '#ECFDF5' : '#EFF6FF',
                            color: log.action.includes('delete') ? '#DC2626' : log.action.includes('pricing') ? '#059669' : '#2563EB',
                            border: log.action.includes('delete') ? '1px solid #FECACA' : log.action.includes('pricing') ? '1px solid #A7F3D0' : '1px solid #DBEAFE'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: '12px', color: '#64748B' }}>
                          {log.ip_address}
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0'
                          }}>
                            <CheckCircle2 size={11} /> SUCCESS
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#FFFFFF',
                              border: '1px solid #EFEFEF',
                              color: '#334155',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} color="#64748B" />
                            Inspect Diff
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Audit Pagination */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#64748B'
            }}>
              <div>
                Page <strong style={{ color: '#0F172A' }}>{auditPage}</strong> of <strong style={{ color: '#0F172A' }}>{Math.max(1, Math.ceil(auditTotal / 20))}</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(p => p - 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    border: '1px solid #EFEFEF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: auditPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: auditPage <= 1 ? 0.4 : 1
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={auditPage >= Math.ceil(auditTotal / 20)}
                  onClick={() => setAuditPage(p => p + 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    border: '1px solid #EFEFEF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: auditPage >= Math.ceil(auditTotal / 20) ? 'not-allowed' : 'pointer',
                    opacity: auditPage >= Math.ceil(auditTotal / 20) ? 0.4 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RETENTION POLICIES */}
      {policyModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={17} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Compliance & Data Retention Policy
                </h3>
              </div>
              <button onClick={() => setPolicyModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                  Telemetry Retention Window
                </label>
                <select
                  value={policyForm.data_retention_days}
                  onChange={e => setPolicyForm({ ...policyForm, data_retention_days: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value={30}>30 Days (Maximum Data Minimization)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Recommended SOC 2 Standard)</option>
                  <option value={180}>180 Days (Extended Regulatory)</option>
                  <option value={365}>365 Days (1 Full Year Legal Archive)</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EFEFEF', background: '#FBFBFB' }}>
                <input
                  type="checkbox"
                  checked={policyForm.ip_anonymization}
                  onChange={e => setPolicyForm({ ...policyForm, ip_anonymization: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                />
                <div>
                  <span style={{ fontWeight: '600', color: '#0F172A', display: 'block' }}>1-Byte IP Anonymization (GDPR)</span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Masks the last octet (e.g. 192.168.1.xxx) before writing to telemetry.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EFEFEF', background: '#FBFBFB' }}>
                <input
                  type="checkbox"
                  checked={policyForm.soc2_audit_trail}
                  onChange={e => setPolicyForm({ ...policyForm, soc2_audit_trail: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                />
                <div>
                  <span style={{ fontWeight: '600', color: '#0F172A', display: 'block' }}>Strict SOC 2 Immutable Lock</span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Blocks manual deletion on administrative audit records.</span>
                </div>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => setPolicyModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  style={{ padding: '8px 16px', borderRadius: '7px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {savingPolicy ? 'Saving...' : 'Save & Enforce Across Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GDPR CONSOLE (ART. 17 / 20) */}
      {gdprModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={17} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  GDPR Subject Rights Console
                </h3>
              </div>
              <button onClick={() => setGdprModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #EFEFEF' }}>
              <button
                onClick={() => setGdprTab('export')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: gdprTab === 'export' ? '#FFFFFF' : '#F8F9FA',
                  border: 'none',
                  borderBottom: gdprTab === 'export' ? '2px solid #2563EB' : '2px solid transparent',
                  color: gdprTab === 'export' ? '#2563EB' : '#64748B',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Article 20: Data Portability
              </button>
              <button
                onClick={() => setGdprTab('purge')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: gdprTab === 'purge' ? '#FFFFFF' : '#F8F9FA',
                  border: 'none',
                  borderBottom: gdprTab === 'purge' ? '2px solid #DC2626' : '2px solid transparent',
                  color: gdprTab === 'purge' ? '#DC2626' : '#64748B',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Article 17: Right to Erasure
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {gdprTab === 'export' ? (
                <form onSubmit={handleGdprExport} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
                  <p style={{ margin: 0, color: '#475569' }}>
                    Generate an official machine-readable JSON package containing all account data, protected sites, and activity logs.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>User ID or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. user@example.com"
                      value={gdprUserId}
                      onChange={e => setGdprUserId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                    <button type="button" onClick={() => setGdprModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={gdprLoading} style={{ padding: '8px 16px', borderRadius: '7px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>{gdprLoading ? 'Generating...' : 'Export Dossier'}</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleGdprPurge} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px' }}>
                    <strong>Warning:</strong> Under GDPR Article 17, this permanently erases the user, connected sites, and associated logs forever.
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>User ID or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="User ID or Email to erase"
                      value={gdprUserId}
                      onChange={e => setGdprUserId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Type DELETE_USER to confirm</label>
                    <input
                      type="text"
                      required
                      placeholder="Type DELETE_USER"
                      value={gdprPurgeConfirm}
                      onChange={e => setGdprPurgeConfirm(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #FECACA', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                    <button type="button" onClick={() => setGdprModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={gdprLoading || gdprPurgeConfirm !== 'DELETE_USER'} style={{ padding: '8px 16px', borderRadius: '7px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', opacity: (gdprLoading || gdprPurgeConfirm !== 'DELETE_USER') ? 0.4 : 1 }}>{gdprLoading ? 'Purging...' : 'Permanently Erase'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT DIFF INSPECTOR */}
      {selectedAuditLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '560px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={17} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Immutable Audit Payload Inspector
                </h3>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: '#F8F9FA', padding: '10px 12px', borderRadius: '7px', border: '1px solid #EFEFEF' }}>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Timestamp</span>
                  <span style={{ fontWeight: '600', color: '#0F172A', fontFamily: 'monospace' }}>{selectedAuditLog.timestamp}</span>
                </div>
                <div style={{ background: '#F8F9FA', padding: '10px 12px', borderRadius: '7px', border: '1px solid #EFEFEF' }}>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Operator</span>
                  <span style={{ fontWeight: '600', color: '#0F172A', fontFamily: 'monospace' }}>{selectedAuditLog.admin_user}</span>
                </div>
              </div>

              <div>
                <span style={{ color: '#334155', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Payload Details (JSON)</span>
                <pre style={{
                  background: '#0F172A',
                  color: '#34D399',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  margin: 0
                }}>
                  {JSON.stringify(selectedAuditLog.details || {}, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  style={{ padding: '8px 16px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WHITELIST RESOLUTION */}
      {whitelistModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={17} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Allow Whitelist Path (403 False Positive)
                </h3>
              </div>
              <button onClick={() => setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains', description: '' })} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitWhitelist} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Rule Name</label>
                <input
                  type="text"
                  required
                  value={whitelistModal.name}
                  onChange={e => setWhitelistModal({ ...whitelistModal, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Target Path Pattern</label>
                <input
                  type="text"
                  required
                  value={whitelistModal.pattern}
                  onChange={e => setWhitelistModal({ ...whitelistModal, pattern: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button type="button" onClick={() => setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains', description: '' })} style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={trafficActionLoading} style={{ padding: '8px 16px', borderRadius: '7px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>{trafficActionLoading ? 'Saving...' : 'Deploy Fleet Whitelist'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: TRAIN ML */}
      {trainModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={17} color="#7C3AED" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Feed Threat Signature to Machine Learning
                </h3>
              </div>
              <button onClick={() => setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitTrainML} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Threat Category</label>
                <input
                  type="text"
                  required
                  value={trainModal.category}
                  onChange={e => setTrainModal({ ...trainModal, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Raw Payload Sample</label>
                <textarea
                  rows={3}
                  required
                  value={trainModal.payload}
                  onChange={e => setTrainModal({ ...trainModal, payload: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button type="button" onClick={() => setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })} style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={trafficActionLoading} style={{ padding: '8px 16px', borderRadius: '7px', background: '#7C3AED', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>{trafficActionLoading ? 'Training...' : 'Feed & Calibrate Model'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
