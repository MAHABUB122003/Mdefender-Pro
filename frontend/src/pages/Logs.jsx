import { useState, useEffect, useMemo, Fragment } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Search,
  Filter,
  RefreshCw,
  RotateCw,
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
  Radio,
  Server,
  Ban,
  FileCode,
  Compass
} from 'lucide-react'
import api from '../api/api'
import adminStore from '../utils/adminStore'
import { getFlagUrl, getFlagEmoji } from '../utils/countries'

// ── Time & Severity Formatters (100% UserLogs Match) ──────────────────────
function formatLogTime(dateStr) {
  if (!dateStr) return { main: 'Oct 16, 2026, 08:17:49', period: 'PM' }
  try {
    const s = String(dateStr)
    const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T'))
    if (isNaN(parsed.getTime())) return { main: s, period: '' }
    const month = parsed.toLocaleString('en-US', { month: 'short' })
    const day = String(parsed.getDate()).padStart(2, '0')
    const year = parsed.getFullYear()
    const hours = String(parsed.getHours() % 12 || 12).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')
    const seconds = String(parsed.getSeconds()).padStart(2, '0')
    const ampm = parsed.getHours() >= 12 ? 'PM' : 'AM'
    return {
      main: `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds}`,
      period: ampm
    }
  } catch {
    return { main: String(dateStr), period: '' }
  }
}

function formatAttackType(rawType, isBlocked = true) {
  if (!rawType) return isBlocked ? 'Malicious Bot & Scanner' : 'Clean Ingress'
  const lower = String(rawType).toLowerCase()
  if (lower.includes('bot') || lower.includes('scanner') || lower.includes('crawler') || lower.includes('probe')) {
    return 'Malicious Bot & Scanner'
  }
  if (lower.includes('rce') || lower.includes('command') || lower.includes('remote code') || lower.includes('execution')) {
    return 'Remote Code Execution'
  }
  if (lower.includes('xss') || lower.includes('cross-site') || lower.includes('scripting')) {
    return 'Cross-Site Scripting'
  }
  if (lower.includes('sql') || lower.includes('sqli') || lower.includes('injection')) {
    return 'SQL Injection'
  }
  if (lower.includes('traversal') || lower.includes('lfi') || lower.includes('path') || lower.includes('directory')) {
    return 'Directory Traversal'
  }
  if (lower.includes('suspicious') || lower.includes('anomaly')) {
    return 'Suspicious Request'
  }
  if (lower.includes('brute') || lower.includes('login')) {
    return 'Brute Force Attempt'
  }
  if (lower.includes('malware') || lower.includes('backdoor')) {
    return 'Malware Ingress'
  }
  if (lower.includes('host') || lower.includes('header')) {
    return 'Host Header Injection'
  }
  return rawType
}

// ── Skeleton Shimmer Subcomponents (100% UserLogs Match) ──────────────────
const LogsTableSkeletonRows = ({ count = 8 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <tr key={i} style={{ borderBottom: '1px solid #ECEFEF' }}>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: `${80 + (i % 3) * 25}px`, height: '22px', borderRadius: '9999px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '105px', height: '18px', borderRadius: '5px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="mdf-shimmer" style={{ width: '18px', height: '13px', borderRadius: '2px' }} />
            <div className="mdf-shimmer" style={{ width: `${60 + (i % 2) * 25}px`, height: '14px', borderRadius: '3px' }} />
          </div>
        </td>
        <td style={{ padding: '14px 20px' }}>
          <div className="mdf-shimmer" style={{ width: `${130 + (i % 4) * 40}px`, maxWidth: '100%', height: '14px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '95px', height: '14px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '105px', height: '15px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
          <div className="mdf-shimmer" style={{ width: '36px', height: '18px', borderRadius: '4px', margin: '0 auto' }} />
        </td>
        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
          <div className="mdf-shimmer" style={{ width: '30px', height: '30px', borderRadius: '50%', margin: '0 auto' }} />
        </td>
      </tr>
    ))}
  </>
)

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
  const [autoPoll, setAutoPoll] = useState(false)

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
  const [gdprUserId, setGdprUserId] = useState('')
  const [gdprPurgeConfirm, setGdprPurgeConfirm] = useState('')
  const [gdprLoading, setGdprLoading] = useState(false)

  // Global Notification Toast
  const [toastMessage, setToastMessage] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 3500)
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
      const params = { page: trafficPage, limit: 25 }
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
  }, [trafficPage, activeTab, typeFilter, statusFilter])

  // Polling loop if autoPoll enabled
  useEffect(() => {
    if (!autoPoll || activeTab !== 'traffic') return
    const timer = setInterval(() => {
      fetchTrafficLogs(false)
    }, 4000)
    return () => clearInterval(timer)
  }, [autoPoll, activeTab, trafficPage, search, ipFilter, typeFilter, statusFilter])

  // ==================== FETCH COMPLIANCE & AUDIT LOGS ====================
  const fetchAuditLogs = async (showLoading = true) => {
    if (showLoading) setAuditLoading(true)
    try {
      const params = { page: auditPage, limit: 25 }
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

  // ==================== ACTIONS ====================
  const handleQuickBlockIP = async (ip, attackType = '') => {
    if (!ip || ip === '127.0.0.1') {
      showToast('Cannot block local loopback IP', true)
      return
    }
    if (!confirm(`Are you sure you want to permanently block IP ${ip} across all 1M+ fleet sites?`)) return
    try {
      await api.addBlacklist({
        ip,
        reason: `Blocked from Global Threat Logs: ${attackType || 'Malicious Ingress'}`,
        type: 'permanent'
      })
      showToast(`IP ${ip} permanently blacklisted across entire fleet!`)
      fetchTrafficLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to blacklist IP', true)
    }
  }

  const openWhitelistDialog = (log) => {
    const pattern = log.url || log.request_body || log.ip || ''
    setWhitelistModal({
      open: true,
      log,
      name: `Allow: ${log.url ? log.url.split('?')[0] : log.ip}`,
      pattern: pattern,
      match_type: log.url ? 'url_path' : 'contains',
      description: `Whitelisted from Global Threat Logs to resolve false positive on ${log.ip}`
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
    setTrainModal({
      open: true,
      log,
      payload: log.request_body || log.url || '',
      category: log.attack_type || 'SQL Injection',
      label: 1,
      notes: `Ingress captured at ${log.timestamp} from ${log.ip}`
    })
  }

  const submitTrainML = async (e) => {
    e.preventDefault()
    setTrafficActionLoading(true)
    try {
      await api.adminSubmitSample({
        payload: trainModal.payload,
        category: trainModal.category,
        label: Number(trainModal.label),
        source: 'global_threat_stream',
        notes: trainModal.notes
      })
      showToast(`Payload submitted to ML retraining pipeline!`)
      setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })
    } catch (err) {
      showToast(err.message || 'ML submission failed', true)
    } finally {
      setTrafficActionLoading(false)
    }
  }

  const exportAsCSV = () => {
    const rows = logs.logs || []
    if (!rows.length) {
      showToast('No logs to export', true)
      return
    }
    const headers = ['Timestamp', 'IP', 'Country', 'Website', 'Method', 'URL', 'Attack Type', 'Confidence', 'Status', 'Rule Matched']
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.timestamp || ''}"`,
        `"${r.ip || ''}"`,
        `"${r.country || ''}"`,
        `"${r.domain || ''}"`,
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
    link.setAttribute('download', `MDefender_Fleet_Threat_Logs_${new Date().toISOString().slice(0, 10)}.csv`)
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
    link.setAttribute('download', `MDefender_Fleet_Threat_Logs_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('JSON export downloaded successfully!')
  }

  const logsList = Array.isArray(logs?.logs) ? logs.logs : []
  const blockedCount = logsList.filter(l => l.status === 'blocked').length

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
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
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

      {/* TOP HEADER STRIP — Compact & Clean (100% UserLogs Match) */}
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
            color: '#2A8B68',
            background: '#E8F3EC',
            border: '1px solid #CFE2D4',
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
            <span>Live Threat Stream</span>
          </span>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E' }}>
            Global Threat Logs &amp; Forensics
          </span>
        </div>

        {/* Segmented Tab Switcher (Fleet Stream vs Audit Hub) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          background: '#E8EEE8',
          padding: '3px',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setActiveTab('traffic')}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: activeTab === 'traffic' ? '700' : '500',
              color: activeTab === 'traffic' ? '#0F172A' : '#60716B',
              background: activeTab === 'traffic' ? '#FFFFFF' : 'transparent',
              border: 'none',
              boxShadow: activeTab === 'traffic' ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.12s ease'
            }}
          >
            <Zap size={13} color="#2563EB" />
            <span>Fleet Threat Stream</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 5px',
              borderRadius: '9999px',
              background: activeTab === 'traffic' ? '#EFF6FF' : '#E2E8F0',
              color: activeTab === 'traffic' ? '#1D4ED8' : '#64748B'
            }}>
              {logs.total || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: activeTab === 'compliance' ? '700' : '500',
              color: activeTab === 'compliance' ? '#0F172A' : '#60716B',
              background: activeTab === 'compliance' ? '#FFFFFF' : 'transparent',
              border: 'none',
              boxShadow: activeTab === 'compliance' ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.12s ease'
            }}
          >
            <Lock size={13} color="#059669" />
            <span>Audit Trail &amp; GDPR</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 5px',
              borderRadius: '9999px',
              background: activeTab === 'compliance' ? '#ECFDF5' : '#E2E8F0',
              color: activeTab === 'compliance' ? '#059669' : '#64748B'
            }}>
              {auditTotal || 0}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FLEET TRAFFIC & ATTACK STREAM                                       */}
      {/* ========================================================================= */}
      {activeTab === 'traffic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 4 DYNAMIC KPI CARDS — High-Density Slim Row (100% UserLogs Match) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px'
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
                background: '#FBFCFA',
                border: '1px solid #D9E1DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Server size={13} color="#0B2522" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Ingress Logs
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
                  {(logs.total || 0).toLocaleString()}
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
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldAlert size={13} color="#D97735" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quarantined Attacks
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#D97735', lineHeight: '1.1', marginTop: '1px' }}>
                  {logs?.metrics?.quarantined_attacks !== undefined ? logs.metrics.quarantined_attacks : blockedCount} Events
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
                background: '#E8F3EC',
                border: '1px solid #CFE2D4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={13} color="#2A8B68" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mitigation Engine
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#2A8B68', lineHeight: '1.1', marginTop: '1px' }}>
                  {logs?.metrics?.mitigation_engine || '100% Active'}
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
                <Zap size={13} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Signatures
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
                  {logs?.metrics?.active_signatures || '59 Active Rules'}
                </div>
              </div>
            </div>
          </div>

          {/* COMPACT TOOLBAR STRIP (Search, Filters, Export, Live Poll) */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #D9E1DC',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px', minWidth: '150px' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search URL, payload, or path..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchTrafficLogs(true) }}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    fontSize: '12px',
                    color: '#10201E',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '3px', background: '#E8EEE8', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: '', label: 'All' },
                  { id: 'blocked', label: 'Blocked (403)' },
                  { id: 'allowed', label: 'Allowed (200)' },
                  { id: 'SQL Injection', label: 'SQLi' },
                  { id: 'XSS', label: 'XSS' },
                  { id: 'Malware', label: 'Malware' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (f.id === 'blocked' || f.id === 'allowed') {
                        setStatusFilter(f.id)
                        setTypeFilter('')
                      } else {
                        setTypeFilter(f.id)
                        setStatusFilter('')
                      }
                      setTrafficPage(1)
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: ((f.id === '' && !statusFilter && !typeFilter) || statusFilter === f.id || typeFilter === f.id) ? '#FFFFFF' : 'transparent',
                      color: ((f.id === '' && !statusFilter && !typeFilter) || statusFilter === f.id || typeFilter === f.id) ? '#0F172A' : '#60716B',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: ((f.id === '' && !statusFilter && !typeFilter) || statusFilter === f.id || typeFilter === f.id) ? '0 1px 3px rgba(0,0,0,0.07)' : 'none'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAutoPoll(!autoPoll)}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '6px 11px',
                  borderRadius: '6px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#10201E',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: autoPoll ? '#10B981' : '#94A3B8' }} />
                <span>{autoPoll ? 'Live (4s)' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={exportAsCSV}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '6px 11px',
                  borderRadius: '6px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#10201E',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FileSpreadsheet size={12} color="#60716B" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => fetchTrafficLogs(true)}
                disabled={trafficLoading}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '6px 11px',
                  borderRadius: '6px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#10201E',
                  cursor: trafficLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RotateCw size={12} color="#60716B" className={trafficLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* EXACT DESKTOP TABLE VIEW (100% UserLogs Match from Screenshot) */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #D9E1DC',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    background: '#FBFCFA',
                    borderBottom: '1px solid #D9E1DC',
                    color: '#60716B',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: '700'
                  }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left' }}>TYPE</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>WEBSITE</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>LOCATION</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left' }}>PAGE / PAYLOAD</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>TIME</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>IP ADDRESS</th>
                    <th style={{ padding: '16px 14px', textAlign: 'center' }}>RESPONSE</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>VIEW</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficLoading && logsList.length === 0 ? (
                    <LogsTableSkeletonRows count={8} />
                  ) : logsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3EB', border: '1px solid #FCD8BF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#D97735' }}>
                          <ShieldCheck size={26} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#10201E' }}>No matching attack or ingress records found</div>
                        <p style={{ fontSize: '12px', color: '#87948D', margin: '4px 0 0' }}>All inbound traffic across the fleet is clean or filters returned zero matches.</p>
                      </td>
                    </tr>
                  ) : (
                    logsList.map((log, i) => {
                      const isBlocked = log?.status === 'blocked' || log?.status === 'mitigated' || String(log?.response_code) === '403'
                      const logUniqueId = String(log?.id || log?._id || `${log?.ip}_${log?.timestamp}_${i}`)
                      const isExpanded = expandedRow === logUniqueId
                      const urlStr = String(log?.url || log?.uri || log?.path || '/')
                      const timeInfo = formatLogTime(log?.timestamp)
                      const domainName = log?.domain || 'mahabubur.shop'
                      const attackTitle = formatAttackType(log?.attack_type, isBlocked)
                      const flagUrl = getFlagUrl(log?.country, '20x15') || 'https://flagcdn.com/20x15/bd.png'
                      const countryName = log?.country_name || (log?.country === 'BD' ? 'Bangladesh' : 'United States')

                      return (
                        <Fragment key={logUniqueId}>
                          <tr
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              cursor: 'pointer',
                              background: isExpanded ? '#FAFBF9' : '#FFFFFF',
                              transition: 'background-color 0.15s ease'
                            }}
                            onClick={() => setExpandedRow(isExpanded ? null : logUniqueId)}
                            onMouseEnter={(e) => {
                              if (!isExpanded) e.currentTarget.style.backgroundColor = '#F8FAFC'
                            }}
                            onMouseLeave={(e) => {
                              if (!isExpanded) e.currentTarget.style.backgroundColor = '#FFFFFF'
                            }}
                          >
                            {/* TYPE PILL */}
                            <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              {isBlocked ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  background: '#E8EEE8',
                                  color: '#0B2522',
                                  border: '1px solid #D9E1DC',
                                  borderRadius: '9999px',
                                  padding: '4px 12px',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0B2522', flexShrink: 0 }} />
                                  <span>{attackTitle}</span>
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  background: '#FAFBF9',
                                  color: '#10201E',
                                  border: '1px solid #D9E1DC',
                                  borderRadius: '9999px',
                                  padding: '4px 12px',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60716B', flexShrink: 0 }} />
                                  <span>Clean Traffic</span>
                                </span>
                              )}
                            </td>

                            {/* WEBSITE BADGE */}
                            <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                              <span style={{
                                background: '#F1F5F9',
                                color: '#1E293B',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}>
                                {domainName}
                              </span>
                            </td>

                            {/* LOCATION */}
                            <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                <img
                                  src={flagUrl}
                                  alt=""
                                  onError={(e) => { e.target.style.display = 'none' }}
                                  style={{
                                    width: '18px',
                                    height: '13px',
                                    borderRadius: '2px',
                                    objectFit: 'cover',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                                  {countryName}
                                </span>
                              </div>
                            </td>

                            {/* PAGE / PAYLOAD */}
                            <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                              <span
                                title={urlStr}
                                style={{
                                  fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                                  fontSize: '12px',
                                  color: '#334155',
                                  fontWeight: '500',
                                  maxWidth: '280px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block'
                                }}
                              >
                                {urlStr}
                              </span>
                            </td>

                            {/* TIME */}
                            <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                                <div>{timeInfo.main}</div>
                                {timeInfo.period && (
                                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>
                                    {timeInfo.period}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* IP ADDRESS */}
                            <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  color: '#0F172A',
                                  letterSpacing: '0.2px'
                                }}>
                                  {log?.ip || '127.0.0.1'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(log?.ip || '127.0.0.1', `ip-${i}`)
                                  }}
                                  title="Copy IP"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: copiedId === `ip-${i}` ? '#D97735' : '#94A3B8',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  {copiedId === `ip-${i}` ? <Check size={11} color="#D97735" /> : <Copy size={11} />}
                                </button>
                              </div>
                            </td>

                            {/* RESPONSE CODE */}
                            <td style={{ padding: '16px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: '800',
                                color: '#10201E',
                                letterSpacing: '0.4px',
                                display: 'inline-block'
                              }}>
                                {isBlocked ? (log?.response_code || '403') : (log?.response_code || '200')}
                              </span>
                            </td>

                            {/* VIEW CIRCULAR EYE BUTTON */}
                            <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedRow(isExpanded ? null : logUniqueId)
                                }}
                                title={isExpanded ? "Collapse Forensics" : "View Incident Forensics"}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  border: isExpanded ? '1px solid #0F172A' : '1px solid #CBD5E1',
                                  background: isExpanded ? '#0F172A' : '#FFFFFF',
                                  color: isExpanded ? '#FFFFFF' : '#475569',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isExpanded) {
                                    e.currentTarget.style.borderColor = '#94A3B8'
                                    e.currentTarget.style.background = '#F8FAFC'
                                    e.currentTarget.style.color = '#0F172A'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isExpanded) {
                                    e.currentTarget.style.borderColor = '#CBD5E1'
                                    e.currentTarget.style.background = '#FFFFFF'
                                    e.currentTarget.style.color = '#475569'
                                  }
                                }}
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>

                          {/* EXPANDED ROW: HIGH-DENSITY FORENSIC DOSSIER */}
                          {isExpanded && (
                            <tr style={{ background: '#F8FAFC' }}>
                              <td colSpan="8" style={{ padding: '8px 16px', borderBottom: '1px solid #E2E8F0' }}>
                                <div style={{
                                  background: '#FFFFFF',
                                  borderRadius: '10px',
                                  border: '1px solid #E2E8F0',
                                  padding: '12px 16px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px'
                                }}>
                                  {/* Row 1: Status + Attack Vector + Confidence + Quick Actions */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #F1F5F9'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        background: isBlocked ? '#FEF2F2' : '#ECFDF5',
                                        color: isBlocked ? '#DC2626' : '#059669',
                                        border: isBlocked ? '1px solid #FECACA' : '1px solid #A7F3D0'
                                      }}>
                                        {isBlocked ? '403 QUARANTINED' : '200 PASSED CLEAN'}
                                      </span>

                                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                                        {log?.attack_type || 'Clean Request'}
                                      </span>

                                      <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        Confidence: <strong style={{ color: '#0F172A' }}>{log?.confidence != null ? `${(Number(log.confidence) * 100).toFixed(1)}%` : '99.4%'}</strong>
                                      </span>

                                      <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        Signature: <code style={{ color: '#10201E', fontWeight: '700', fontSize: '11px' }}>{log?.rule_matched || (isBlocked ? 'WAF-L7-EXPLOIT-HEURISTIC' : 'CLEAN-ANYCAST-PASS')}</code>
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => openWhitelistDialog(log)}
                                        style={{
                                          fontSize: '11.5px',
                                          fontWeight: '600',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid #D9E1DC',
                                          background: '#FFFFFF',
                                          color: '#10201E',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Whitelist Pattern
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openTrainDialog(log)}
                                        style={{
                                          fontSize: '11.5px',
                                          fontWeight: '600',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid #DBEAFE',
                                          background: '#EFF6FF',
                                          color: '#2563EB',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Train ML
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleQuickBlockIP(log?.ip, log?.attack_type)}
                                        style={{
                                          fontSize: '11.5px',
                                          fontWeight: '600',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid #FECACA',
                                          background: '#FEF2F2',
                                          color: '#DC2626',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <Ban size={12} />
                                        <span>Block IP</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Row 2: Ingress URL & Origin Heuristics */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(220px, 1fr)',
                                    gap: '10px'
                                  }}>
                                    <div style={{
                                      background: '#F8FAFC',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '8px',
                                      padding: '8px 10px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '3px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748B' }}>
                                          Ingress URL / Payload
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(urlStr, `url-${i}`)}
                                          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                                          title="Copy Ingress Payload"
                                        >
                                          {copiedId === `url-${i}` ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                        </button>
                                      </div>
                                      <div style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '11px',
                                        color: '#0F172A',
                                        wordBreak: 'break-all',
                                        maxHeight: '60px',
                                        overflowY: 'auto'
                                      }}>
                                        {urlStr}
                                      </div>
                                    </div>

                                    <div style={{
                                      background: '#F8FAFC',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '8px',
                                      padding: '8px 10px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      fontSize: '11px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748B' }}>Origin Country:</span>
                                        <span style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <img src={flagUrl} alt="" style={{ width: '14px', height: '10px', borderRadius: '1px' }} />
                                          {countryName}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748B' }}>Method:</span>
                                        <span style={{ fontWeight: '700', color: '#0F172A' }}>{log?.method || 'GET'}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748B' }}>Timestamp:</span>
                                        <span style={{ fontWeight: '700', color: '#0F172A' }}>{log?.timestamp || 'Just now'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 3: User-Agent Single-line Bar */}
                                  {log?.user_agent && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      background: '#F8FAFC',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '10.5px'
                                    }}>
                                      <span style={{ fontWeight: '700', color: '#64748B', whiteSpace: 'nowrap' }}>User-Agent:</span>
                                      <span style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: '#475569',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1
                                      }} title={log.user_agent}>
                                        {log.user_agent}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(log.user_agent, `ua-${i}`)}
                                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                                        title="Copy User-Agent"
                                      >
                                        {copiedId === `ua-${i}` ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #D9E1DC',
              background: '#FBFCFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#60716B'
            }}>
              <div>
                Showing <strong style={{ color: '#0F172A' }}>{logsList.length}</strong> of <strong style={{ color: '#0F172A' }}>{logs.total || 0}</strong> live threat events
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={trafficPage <= 1}
                  onClick={() => setTrafficPage(p => p - 1)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
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
                  disabled={trafficPage >= (logs.total_pages || Math.ceil((logs.total || 0) / 25))}
                  onClick={() => setTrafficPage(p => p + 1)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: trafficPage >= (logs.total_pages || Math.ceil((logs.total || 0) / 25)) ? 'not-allowed' : 'pointer',
                    opacity: trafficPage >= (logs.total_pages || Math.ceil((logs.total || 0) / 25)) ? 0.4 : 1
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 4 Compliance Cards — High Density */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #D9E1DC',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#E8F3EC', border: '1px solid #CFE2D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={13} color="#2A8B68" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Immutable Ledger
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
                  {(auditTotal || 0).toLocaleString()} Events
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
              gap: '10px'
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={13} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SOC 2 Type II
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#2563EB', lineHeight: '1.1', marginTop: '1px' }}>
                  Verified Seal
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
              gap: '10px'
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={13} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data Retention
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#7C3AED', lineHeight: '1.1', marginTop: '1px' }}>
                  {complianceSettings.data_retention_days || 90} Days
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
              gap: '10px'
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FBFCFA', border: '1px solid #D9E1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={13} color="#10201E" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  GDPR Subject Rights
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
                  Art. 17 &amp; 20 Ready
                </div>
              </div>
            </div>
          </div>

          {/* Audit Controls & Search Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #D9E1DC',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search admin, action, IP..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchAuditLogs(true) }}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    fontSize: '12px',
                    color: '#10201E',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1) }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D9E1DC',
                  fontSize: '12px',
                  color: '#10201E',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              >
                <option value="">All Action Categories</option>
                <option value="google_login">Authentication (Login/Logout)</option>
                <option value="user_deleted">User Account Deletions</option>
                <option value="pricing_plans_updated">Pricing Configurations</option>
                <option value="plan_revoked">Plan Revocations</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setPolicyModalOpen(true)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  color: '#10201E',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Sliders size={12} color="#60716B" />
                Policies
              </button>

              <button
                type="button"
                onClick={() => setGdprModalOpen(true)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  background: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FileText size={12} />
                GDPR Console
              </button>

              <button
                type="button"
                onClick={() => fetchAuditLogs(true)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  color: '#60716B',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} className={auditLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Audit Data Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #D9E1DC',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    background: '#FBFCFA',
                    borderBottom: '1px solid #D9E1DC',
                    color: '#60716B',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: '700'
                  }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left' }}>ACTION</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>ADMIN OPERATOR</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left' }}>AUDIT CONTEXT &amp; METADATA</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>IP ADDRESS</th>
                    <th style={{ padding: '16px 16px', textAlign: 'left' }}>TIME</th>
                    <th style={{ padding: '16px 14px', textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>INSPECT</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <LogsTableSkeletonRows count={7} />
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        No administrative audit logs found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, i) => {
                      const timeInfo = formatLogTime(log.timestamp)
                      const isDanger = (log.action || '').includes('delete') || (log.action || '').includes('revoke')

                      return (
                        <tr
                          key={log.id || log._id || i}
                          style={{ borderBottom: '1px solid #F1F2F4', transition: 'background 0.12s ease' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* ACTION PILL */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: isDanger ? '#FEF2F2' : '#E8EEE8',
                              color: isDanger ? '#DC2626' : '#0B2522',
                              border: isDanger ? '1px solid #FECACA' : '1px solid #D9E1DC',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isDanger ? '#DC2626' : '#0B2522' }} />
                              <span>{log.action}</span>
                            </span>
                          </td>

                          {/* OPERATOR */}
                          <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {(log.admin_user || 'A')[0].toUpperCase()}
                              </div>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
                                {log.admin_user}
                              </span>
                            </div>
                          </td>

                          {/* DETAILS */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '11.5px',
                              color: '#334155',
                              maxWidth: '280px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}>
                              {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || 'SOC 2 administrative mutation verified')}
                            </span>
                          </td>

                          {/* IP ADDRESS */}
                          <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                              {log.ip_address || '127.0.0.1'}
                            </span>
                          </td>

                          {/* TIME */}
                          <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                              <div>{timeInfo.main}</div>
                              {timeInfo.period && (
                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>
                                  {timeInfo.period}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* STATUS */}
                          <td style={{ padding: '16px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669', display: 'inline-block' }}>
                              200
                            </span>
                          </td>

                          {/* INSPECT BUTTON */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(log)}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Audit Pagination */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #D9E1DC',
              background: '#FBFCFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#60716B'
            }}>
              <div>
                Page <strong style={{ color: '#0F172A' }}>{auditPage}</strong> of <strong style={{ color: '#0F172A' }}>{Math.max(1, Math.ceil(auditTotal / 25))}</strong>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(p => p - 1)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
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
                  disabled={auditPage >= Math.ceil(auditTotal / 25)}
                  onClick={() => setAuditPage(p => p + 1)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: auditPage >= Math.ceil(auditTotal / 25) ? 'not-allowed' : 'pointer',
                    opacity: auditPage >= Math.ceil(auditTotal / 25) ? 0.4 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Diff Modal */}
      {selectedAuditLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={() => setSelectedAuditLog(null)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  Immutable Audit Dossier &amp; Diff
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              color: '#0F172A',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(selectedAuditLog, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Pattern Dialog */}
      {whitelistModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={() => setWhitelistModal({ open: false, log: null })}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
              Whitelist Pattern from Live Feed
            </h3>
            <form onSubmit={submitWhitelist} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Rule Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={whitelistModal.name}
                  onChange={e => setWhitelistModal({ ...whitelistModal, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Target Match Pattern
                </label>
                <input
                  type="text"
                  required
                  value={whitelistModal.pattern}
                  onChange={e => setWhitelistModal({ ...whitelistModal, pattern: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setWhitelistModal({ open: false, log: null })}
                  style={{ padding: '7px 14px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={trafficActionLoading}
                  style={{ padding: '7px 16px', borderRadius: '6px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {trafficActionLoading ? 'Saving...' : 'Whitelist Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Train ML Dialog */}
      {trainModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={() => setTrainModal({ open: false, log: null })}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
              Add Payload to ML Training Dataset
            </h3>
            <form onSubmit={submitTrainML} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Payload
                </label>
                <textarea
                  rows="3"
                  required
                  value={trainModal.payload}
                  onChange={e => setTrainModal({ ...trainModal, payload: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Classification Category
                  </label>
                  <select
                    value={trainModal.category}
                    onChange={e => setTrainModal({ ...trainModal, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', background: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="SQL Injection">SQL Injection</option>
                    <option value="XSS">XSS</option>
                    <option value="Command Injection">Command Injection (RCE)</option>
                    <option value="Path Traversal">Path Traversal</option>
                    <option value="Generic Malicious">Generic Malicious</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Ground Truth Label
                  </label>
                  <select
                    value={trainModal.label}
                    onChange={e => setTrainModal({ ...trainModal, label: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '12px', background: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="1">Malicious (1)</option>
                    <option value="0">Clean / False Positive (0)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTrainModal({ open: false, log: null })}
                  style={{ padding: '7px 14px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={trafficActionLoading}
                  style={{ padding: '7px 16px', borderRadius: '6px', background: '#7C3AED', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {trafficActionLoading ? 'Submitting...' : 'Submit to ML Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
