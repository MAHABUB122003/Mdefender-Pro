import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  Mail,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Send,
  Trash2,
  Plus,
  Pause,
  Play,
  Globe,
  Clock,
  X
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import useBulkFleet from './bulk/useBulkFleet'

const fmtNumber = (val) => {
  const n = Number(val || 0)
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

const fmtDateShort = (iso) => {
  if (!iso) return '—'
  try {
    return (
      new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      }) + ' UTC'
    )
  } catch {
    return String(iso)
  }
}

const csvEscape = (value) => {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const getVerdictStyle = (verdict) => {
  if (verdict === 'critical') {
    return { label: 'CRITICAL', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' }
  }
  if (verdict === 'attention') {
    return { label: 'ATTENTION', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' }
  }
  return { label: 'HEALTHY', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' }
}

const getGradeStyle = (grade) => {
  const g = String(grade || 'B').toUpperCase()
  if (g.startsWith('A')) {
    return { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' }
  }
  if (g === 'B') {
    return { color: '#0F172A', bg: '#F8FAFC', border: '#CBD5E1' }
  }
  if (g === 'C') {
    return { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' }
  }
  return { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' }
}

const SectionHeading = ({ num, title, subtitle, right }) => (
  <div
    className="print-section-head"
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 10,
      paddingBottom: 10,
      borderBottom: '1px solid #0F172A',
      marginBottom: 16
    }}
  >
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#64748B',
            fontFamily: 'ui-monospace, monospace'
          }}
        >
          SECTION {num}
        </span>
        <span style={{ color: '#CBD5E1' }}>&middot;</span>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h3>
      </div>
      {subtitle && <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0 0', lineHeight: 1.45 }}>{subtitle}</p>}
    </div>
    {right && <div>{right}</div>}
  </div>
)

export default function UserReports() {
  const { wpWebsites } = useBulkFleet()
  const cachedUser = userStore.get('user') || {}
  const storedEmail =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_email') : '') || ''
  const defaultEmail = cachedUser.email || storedEmail || ''

  const [activeTab, setActiveTab] = useState('report')
  const [scopeSiteId, setScopeSiteId] = useState('all')
  const [period, setPeriod] = useState('30d')

  const [report, setReport] = useState(null)
  const [knownSites, setKnownSites] = useState([])
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState('')

  const [verdictFilter, setVerdictFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Automated Schedules State
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [creatingSchedule, setCreatingSchedule] = useState(false)
  const [runningScheduleId, setRunningScheduleId] = useState('')
  const [schedForm, setSchedForm] = useState({
    name: 'Weekly Executive Security Digest',
    frequency: 'weekly',
    website_id: 'all',
    recipients: defaultEmail
  })

  const [toast, setToast] = useState(null)
  const showToast = useCallback((text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 4000)
  }, [])

  const fetchReport = useCallback(
    async (targetSite = scopeSiteId, targetPeriod = period) => {
      setLoadingReport(true)
      setReportError('')
      try {
        const res = await api.generateExecutiveReport(targetSite, targetPeriod)
        if (res?.success && res?.data?.report) {
          const rep = res.data.report
          setReport(rep)
          if (targetSite === 'all' && Array.isArray(rep.websites)) {
            setKnownSites(
              rep.websites.map((w) => ({
                id: w.website_id || w.id,
                domain: w.domain,
                url: w.url
              }))
            )
          }
          if (rep?.organization?.email) {
            setSchedForm((prev) => (prev.recipients ? prev : { ...prev, recipients: rep.organization.email }))
          }
        } else {
          setReportError(res?.message || res?.detail || 'Failed to compile executive report.')
        }
      } catch (err) {
        setReportError(err?.message || 'Unable to load cached fleet telemetry.')
      } finally {
        setLoadingReport(false)
      }
    },
    [scopeSiteId, period]
  )

  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true)
    try {
      const res = await api.getReportSchedules()
      if (res?.success && Array.isArray(res?.data?.schedules)) {
        setSchedules(res.data.schedules)
      }
    } catch (err) {
      showToast(err?.message || 'Could not load scheduled digests', 'error')
    } finally {
      setLoadingSchedules(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchReport(scopeSiteId, period)
  }, [scopeSiteId, period, fetchReport])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const scopeOptions = useMemo(() => {
    const map = new Map()
    for (const s of wpWebsites || []) {
      const sid = s.id || s._id
      if (sid) map.set(sid, { id: sid, domain: s.domain || s.url || sid })
    }
    for (const s of knownSites || []) {
      if (s.id) map.set(s.id, { id: s.id, domain: s.domain || s.url || s.id })
    }
    return Array.from(map.values())
  }, [wpWebsites, knownSites])

  const filteredWebsites = useMemo(() => {
    const rows = report?.websites || []
    const q = searchQuery.trim().toLowerCase()
    return rows.filter((row) => {
      if (verdictFilter === 'issues' && row.verdict === 'healthy') return false
      if (verdictFilter === 'healthy' && row.verdict !== 'healthy') return false
      if (q && !row.domain?.toLowerCase().includes(q) && !row.url?.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [report, verdictFilter, searchQuery])

  const handleExportPdf = () => {
    if (!report) return
    window.print()
  }

  const handleExportCsv = () => {
    if (!report) return
    const headers = [
      'Report ID',
      'Domain',
      'Grade',
      'Posture Score',
      'Risk Level',
      'WP Connected',
      'Online',
      'Uptime (%)',
      'Avg Latency (ms)',
      'Requests',
      'Threats Blocked',
      'WAF Mode',
      'Login Cloaked',
      '2FA Enabled',
      'Backups',
      'SSL Status',
      'Malware Clean',
      'Issues Count',
      'Detailed Findings',
      'Site Assessment Summary'
    ]
    const lines = [headers.map(csvEscape).join(',')]
    for (const w of report.websites || []) {
      lines.push(
        [
          report.report_id,
          w.domain,
          w.grade || '',
          w.score,
          w.risk_level || '',
          w.connected ? 'Yes' : 'No',
          w.is_online ? 'Online' : 'Offline',
          w.uptime_pct,
          w.avg_latency_ms,
          w.requests,
          w.blocked,
          w.waf_mode,
          w.login_cloaked ? 'Yes' : 'No',
          w.two_factor ? 'Yes' : 'No',
          w.backups_count,
          w.ssl_status,
          w.malware_clean ? 'Clean' : `${w.malware_hits} Hits`,
          (w.issues || []).length,
          (w.issues || [])
            .map((iss) => (typeof iss === 'string' ? iss : `${iss?.title || ''}: ${iss?.finding || ''}`))
            .filter(Boolean)
            .join(' | '),
          w.narrative || ''
        ]
          .map(csvEscape)
          .join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.report_id || 'mdefender-report'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Exported ${(report.websites || []).length} website audit records to CSV.`)
  }

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    if (creatingSchedule) return
    setCreatingSchedule(true)
    try {
      const payload = {
        name: schedForm.name.trim() || `${schedForm.frequency} Executive Security Digest`,
        frequency: schedForm.frequency,
        website_id: schedForm.website_id || 'all',
        recipients: schedForm.recipients
      }
      const res = await api.createReportSchedule(payload)
      if (res?.success && res?.data?.schedule) {
        setSchedules((prev) => [res.data.schedule, ...prev])
        showToast('Automated digest schedule created.')
      } else {
        showToast(res?.message || 'Failed to create schedule.', 'error')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to create schedule.', 'error')
    } finally {
      setCreatingSchedule(false)
    }
  }

  const handleToggleSchedule = async (sched) => {
    try {
      const res = await api.updateReportSchedule(sched.id, { enabled: !sched.enabled })
      if (res?.success && res?.data?.schedule) {
        setSchedules((prev) => prev.map((s) => (s.id === sched.id ? res.data.schedule : s)))
        showToast(res.data.schedule.enabled ? 'Schedule resumed.' : 'Schedule paused.')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to update schedule.', 'error')
    }
  }

  const handleDeleteSchedule = async (id) => {
    try {
      const res = await api.deleteReportSchedule(id)
      if (res?.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== id))
        showToast('Schedule removed.')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to delete schedule.', 'error')
    }
  }

  const handleRunNow = async (id) => {
    if (runningScheduleId) return
    setRunningScheduleId(id)
    try {
      const res = await api.runReportScheduleNow(id)
      if (res?.success && res?.data?.schedule) {
        setSchedules((prev) => prev.map((s) => (s.id === id ? res.data.schedule : s)))
        showToast('Executive digest email dispatched successfully.')
      } else {
        showToast(res?.message || 'Failed to dispatch digest.', 'error')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to dispatch digest.', 'error')
    } finally {
      setRunningScheduleId('')
    }
  }

  const summary = report?.summary || {}
  const org = report?.organization || {}
  const brief = report?.executive_brief || {}
  const rubric = report?.scoring_rubric || []
  const threatIntel = report?.threat_intelligence || {}
  const playbooks = report?.remediation_playbooks || []
  const incidents = report?.incidents || []
  const gradeStyle = getGradeStyle(brief.grade || summary.grade)

  const siteLabelById = useMemo(() => {
    const map = { all: 'All Connected Sites' }
    for (const s of scopeOptions) {
      map[s.id] = s.domain || s.id
    }
    return map
  }, [scopeOptions])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 44, color: '#0F172A' }}>
      <style>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .print-only-header, .print-only-footer { display: none; }
        .print-page-table, .print-page-tbody, .print-page-tbody > tr, .print-page-cell {
          display: block;
          width: 100%;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body, #root, .user-layout, .user-main {
            height: auto !important;
            overflow: visible !important;
            background: #FFFFFF !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          #mdefender-executive-report-sheet, #mdefender-executive-report-sheet * {
            visibility: visible;
          }
          #mdefender-executive-report-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
          .print-page-table { display: table !important; width: 100% !important; border-collapse: collapse !important; }
          .print-only-header { display: table-header-group !important; }
          .print-only-footer { display: table-footer-group !important; }
          .print-page-tbody { display: table-row-group !important; }
          .print-page-tbody > tr { display: table-row !important; break-inside: auto !important; }
          .print-page-cell { display: table-cell !important; padding: 0 11mm !important; }
          .print-section-head { break-after: avoid !important; page-break-after: avoid !important; padding-bottom: 6px !important; margin-bottom: 10px !important; }
          .print-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          .print-section { margin-bottom: 16px !important; }
          .print-masthead { flex-wrap: nowrap !important; gap: 14px !important; padding-bottom: 12px !important; margin-bottom: 14px !important; }
          .print-masthead h2 { font-size: 19px !important; }
          .print-grid-hero { grid-template-columns: 165px minmax(0, 1fr) !important; gap: 10px !important; margin-bottom: 10px !important; }
          .print-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
          .print-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; margin-bottom: 10px !important; }
          .print-card { padding: 9px 11px !important; }
          .print-dossier-list { gap: 8px !important; }
          .print-dossier-head { padding: 7px 11px !important; }
          .print-dossier-body { padding: 8px 11px !important; }
          .print-dossier-narrative { margin: 0 0 7px !important; padding: 5px 9px !important; font-size: 10.5px !important; line-height: 1.38 !important; }
          .print-dossier-controls { gap: 5px !important; margin-bottom: 7px !important; }
          .print-dossier-ctrl-box { padding: 4px 6px !important; }
          .print-dossier-issue { padding: 5px 8px !important; font-size: 10.2px !important; line-height: 1.35 !important; }
          .print-compact-text { font-size: 10.5px !important; line-height: 1.4 !important; }
          .print-kpi-num { font-size: 20px !important; margin-top: 3px !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Non-blocking Toast */}
      {toast && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            background: '#0F172A',
            color: '#FFFFFF',
            border: `1px solid ${toast.type === 'error' ? '#EF4444' : '#334155'}`,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)'
          }}
        >
          {toast.type === 'error' ? (
            <AlertTriangle size={15} color="#F87171" />
          ) : (
            <CheckCircle2 size={15} color="#4ADE80" />
          )}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Page Header & Mode Tabs */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18
        }}
      >
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
            Executive Telemetry &amp; Compliance
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
            Security Reports &amp; Automated Digests
          </h1>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
            International audit-grade security posture dossiers with per-website diagnostics, threat intelligence, and step-by-step remediation playbooks.
          </p>
        </div>

        {/* Monochrome Tab Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            padding: 3
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'report' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'report' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'report' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none'
            }}
          >
            <FileText size={14} />
            Executive Report &amp; Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'schedules' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'schedules' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'schedules' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none'
            }}
          >
            <CalendarClock size={14} />
            Automated Email Digests
            <span
              className="tabular-nums"
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 99,
                background: activeTab === 'schedules' ? '#0F172A' : '#E2E8F0',
                color: activeTab === 'schedules' ? '#FFFFFF' : '#334155'
              }}
            >
              {schedules.filter((s) => s.enabled).length}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INTERNATIONAL EXECUTIVE SECURITY REPORT                        */}
      {/* ===================================================================== */}
      {activeTab === 'report' && (
        <>
          {/* Controls Toolbar */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 18
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Scope:</label>
                <select
                  value={scopeSiteId}
                  onChange={(e) => setScopeSiteId(e.target.value)}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    minWidth: 210
                  }}
                >
                  <option value="all">All Connected Websites ({scopeOptions.length})</option>
                  {scopeOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.domain}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Window:</label>
                <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
                  {[
                    { id: '24h', label: '24H' },
                    { id: '7d', label: '7D' },
                    { id: '30d', label: '30D' },
                    { id: '90d', label: '90D' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      style={{
                        padding: '6px 11px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        borderRight: p.id !== '90d' ? '1px solid #CBD5E1' : 'none',
                        cursor: 'pointer',
                        background: period === p.id ? '#0F172A' : '#FFFFFF',
                        color: period === p.id ? '#FFFFFF' : '#334155'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchReport(scopeSiteId, period)}
                disabled={loadingReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={loadingReport ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!report || loadingReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: !report || loadingReport ? 'not-allowed' : 'pointer'
                }}
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!report || loadingReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: '1px solid #0F172A',
                  borderRadius: 6,
                  cursor: !report || loadingReport ? 'not-allowed' : 'pointer'
                }}
              >
                <Printer size={14} />
                Export PDF
              </button>
            </div>
          </div>

          {reportError && (
            <div
              style={{
                padding: 16,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#B91C1C',
                fontSize: 13,
                marginBottom: 16
              }}
            >
              {reportError}
            </div>
          )}

          {loadingReport && !report && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: 48,
                textAlign: 'center',
                color: '#64748B',
                fontSize: 14
              }}
            >
              Compiling international executive security posture report from cached telemetry...
            </div>
          )}

          {/* Monochrome International Executive Document */}
          {report && (
            <div
              id="mdefender-executive-report-sheet"
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '38px 40px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <table className="print-page-table">
                <thead className="print-only-header">
                  <tr>
                    <td>
                      <div
                        className="tabular-nums"
                        style={{
                          padding: '9mm 11mm 3.5mm',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 9.5,
                          color: '#64748B',
                          borderBottom: '1px solid #E2E8F0',
                          marginBottom: 10
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#0F172A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          MDefender Pro &middot; Enterprise Security Assessment
                        </span>
                        <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                          {report.report_id} &middot; {report.scope_label}
                        </span>
                      </div>
                    </td>
                  </tr>
                </thead>
                <tfoot className="print-only-footer">
                  <tr>
                    <td>
                      <div
                        style={{
                          padding: '3.5mm 11mm 8mm',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 9.5,
                          color: '#64748B',
                          borderTop: '1px solid #E2E8F0',
                          marginTop: 10
                        }}
                      >
                        <span>Confidential Security Posture Report &middot; Prepared for {org.name || 'Workspace Organization'}</span>
                        <span>Zero-Origin Cached Telemetry &middot; {report.generated_at_label}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
                <tbody className="print-page-tbody">
                  <tr>
                    <td className="print-page-cell">
              {/* DOCUMENT MASTHEAD */}
              <div
                className="print-masthead"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 20,
                  paddingBottom: 22,
                  borderBottom: '2px solid #0F172A',
                  marginBottom: 28
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13
                      }}
                    >
                      M
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F172A' }}>
                      MDefender Pro &middot; Enterprise Security Assessment
                    </span>
                  </div>
                  <h2 style={{ fontSize: 25, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                    Security Posture, Threat Intelligence &amp; Operations Report
                  </h2>
                  <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0' }}>
                    Prepared for <strong>{org.name || 'Workspace Organization'}</strong> &middot; Account Tier: <strong>{org.plan || 'PRO'}</strong> &middot; Classification: <strong>CONFIDENTIAL</strong>
                  </p>
                  {brief.methodology_note && (
                    <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0', lineHeight: 1.5 }}>
                      <strong>Audit Scope &amp; Collection Method:</strong> {brief.methodology_note}
                    </p>
                  )}
                </div>

                {/* Formal Metadata Ledger */}
                <div
                  className="tabular-nums"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto',
                    columnGap: 18,
                    rowGap: 5,
                    fontSize: 12,
                    color: '#334155',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px'
                  }}
                >
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Document ID</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0F172A' }}>{report.report_id}</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Generated</span>
                  <span>{report.generated_at_label}</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Scope</span>
                  <span style={{ fontWeight: 600 }}>{report.scope_label}</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Observation</span>
                  <span>Last {report.period_days} Days</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Frameworks</span>
                  <span>OWASP / CIS WP / SOC-2</span>
                </div>
              </div>

              {/* SECTION 01: EXECUTIVE ASSESSMENT & SECURITY GRADE */}
              <div className="print-section" style={{ marginBottom: 34 }}>
                <SectionHeading
                  num="01"
                  title="Executive Security Assessment & Verdict"
                  subtitle="Plain-language management briefing summarizing overall risk posture, verified strengths, and immediate 7-day remediation priorities."
                />

                <div
                  className="print-grid-hero print-avoid-break"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)',
                    gap: 18,
                    alignItems: 'stretch',
                    marginBottom: 16
                  }}
                >
                  {/* Security Grade Scorecard Tile */}
                  <div
                    className="tabular-nums print-card"
                    style={{
                      border: `1px solid ${gradeStyle.border}`,
                      background: gradeStyle.bg,
                      borderRadius: 6,
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>
                        Overall Rating
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                        <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: gradeStyle.color }}>
                          {brief.grade || 'B'}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                          {summary.fleet_score ?? 0}/100
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${gradeStyle.border}` }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: gradeStyle.color, letterSpacing: '0.04em' }}>
                        {brief.risk_level || summary.risk_level || 'MODERATE RISK'}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 3, lineHeight: 1.4 }}>
                        {brief.summary_label || 'Security Posture Evaluated'}
                      </div>
                    </div>
                  </div>

                  {/* Narrative Paragraphs */}
                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '16px 20px', background: '#FFFFFF' }}>
                    {brief.headline && (
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.45 }}>
                        {brief.headline}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(brief.sections || []).map((sec) => (
                        <div key={sec.heading} className="print-compact-text" style={{ fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
                          <strong style={{ color: '#0F172A' }}>{sec.heading}: </strong>
                          <span>{sec.body}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strengths vs 7-Day Action Plan */}
                <div
                  className="print-grid-2 print-avoid-break"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 16
                  }}
                >
                  <div className="print-card" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803D', marginBottom: 6 }}>
                      Verified Security Strengths
                    </div>
                    <ul className="print-compact-text" style={{ margin: '0 0 0 16px', padding: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                      {(brief.key_strengths || []).map((st, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {st}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="print-card" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A', marginBottom: 6 }}>
                      Immediate 7-Day Action Plan
                    </div>
                    <ol className="print-compact-text" style={{ margin: '0 0 0 16px', padding: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                      {(brief.action_plan_7d || []).map((act, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {act}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* SECTION 02: KEY METRICS, DEFENSE COVERAGE & SCORING METHODOLOGY */}
              <div className="print-section" style={{ marginBottom: 34 }}>
                <SectionHeading
                  num="02"
                  title="Operational Metrics & Scoring Methodology"
                  subtitle="Quantitative KPI summary alongside the transparent 100-point rubric explaining how each property's security grade is calculated."
                />

                {/* 4 Executive KPI Cards with explanatory interpretations */}
                <div
                  className="tabular-nums print-grid-4 print-avoid-break"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: 14,
                    marginBottom: 18
                  }}
                >
                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>
                      Properties Audited
                    </div>
                    <div className="print-kpi-num" style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {summary.site_count ?? 0}
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4, fontWeight: 600 }}>
                      {summary.healthy_sites ?? 0} compliant &middot; {summary.attention_sites ?? 0} require action
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 1.35 }}>
                      Evaluated across 7 controls.
                    </div>
                  </div>

                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>
                      Origin Availability SLA
                    </div>
                    <div className="print-kpi-num" style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {Number(summary.fleet_uptime_pct ?? 100).toFixed(2)}%
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4, fontWeight: 600 }}>
                      {incidents.length} recorded outage event(s)
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 1.35 }}>
                      5-min probes; SLA target &ge;99.90%.
                    </div>
                  </div>

                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>
                      Edge Traffic Inspected
                    </div>
                    <div className="print-kpi-num" style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {fmtNumber(summary.total_requests)}
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4, fontWeight: 600 }}>
                      {summary.block_rate_pct ?? 0}% malicious block rate
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 1.35 }}>
                      Screened at Edge before PHP.
                    </div>
                  </div>

                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>
                      Threats Neutralized
                    </div>
                    <div className="print-kpi-num" style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {fmtNumber(summary.total_blocked)}
                    </div>
                    <div style={{ fontSize: 12, color: summary.critical_advisories > 0 ? '#B91C1C' : '#334155', marginTop: 4, fontWeight: 600 }}>
                      {summary.critical_advisories ?? 0} critical &middot; {summary.warning_advisories ?? 0} warnings
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 1.35 }}>
                      Blocked before origin impact.
                    </div>
                  </div>
                </div>

                {/* Rubric Table + Defense Control Coverage */}
                <div
                  className="print-grid-2 print-avoid-break"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 18
                  }}
                >
                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                      Posture Scoring Methodology (100-Point Scale)
                    </div>
                    <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 8px', lineHeight: 1.35 }}>
                      Grade Scale: A+ (95–100), A (88–94), B (78–87), C (65–77), D (50–64), F (&lt;50).
                    </p>
                    <table className="tabular-nums print-compact-text" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 10.5, textTransform: 'uppercase' }}>
                          <th style={{ padding: '4px 0', textAlign: 'left' }}>Security Dimension &amp; Criteria</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Avg / Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rubric.map((r) => (
                          <tr key={r.dimension} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '4px 0' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.dimension}</div>
                              <div style={{ fontSize: 10.5, color: '#64748B', lineHeight: 1.3 }}>{r.criteria}</div>
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: '#0F172A', verticalAlign: 'top' }}>
                              {r.earned_avg} / {r.max_points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        Fleet Control Enforcement Coverage
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>% of Scope</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 12px', lineHeight: 1.4 }}>
                      Proportion of connected domains enforcing each proactive defense control.
                    </p>

                    <div className="tabular-nums" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      {(report.coverage || []).map((item) => (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                            <span style={{ fontWeight: 500, color: '#1E293B' }}>{item.label}</span>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>
                              {item.enabled}/{item.total} ({item.pct}%)
                            </span>
                          </div>
                          <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.pct}%`,
                                height: '100%',
                                background: '#0F172A',
                                borderRadius: 99
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 03: THREAT INTELLIGENCE & ATTACK VECTOR TELEMETRY */}
              <div className="print-section" style={{ marginBottom: 34 }}>
                <SectionHeading
                  num="03"
                  title="Threat Landscape & Blocked Attack Intelligence"
                  subtitle={`Forensic breakdown of ${fmtNumber(threatIntel.events_logged || 0)} malicious request signature(s) intercepted by MDefender Semantic WAAP & OWASP rules over the last ${report.period_days} days.`}
                />

                {(threatIntel.top_vectors || []).length === 0 ? (
                  <div
                    className="print-card"
                    style={{
                      padding: '16px 18px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#475569'
                    }}
                  >
                    No individual forensic attack signatures were logged in the selected {report.period_days}-day window. Edge WAF rules remained active and ready.
                  </div>
                ) : (
                  <div
                    className="print-grid-2 print-avoid-break"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: 18
                    }}
                  >
                    <div className="print-card" style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                        Attack Vector Distribution &amp; Threat Intent
                      </div>
                      <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 12px' }}>
                        Categories classified from blocked HTTP payloads across the audited domains.
                      </p>
                      <div className="tabular-nums" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(threatIntel.top_vectors || []).map((vec) => (
                          <div key={vec.type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{vec.type}</span>
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {fmtNumber(vec.count)} ({vec.pct}%)
                              </span>
                            </div>
                            <div style={{ height: 5, background: '#E2E8F0', borderRadius: 99, margin: '5px 0', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, vec.pct)}%`, height: '100%', background: '#0F172A' }} />
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>{vec.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                          Top Offensive Source IP Addresses
                        </div>
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 10px' }}>
                          Highest-volume hostile IPs automatically throttled and blocked at the edge.
                        </p>
                        <table className="tabular-nums" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>
                              <th style={{ padding: '5px 0', textAlign: 'left' }}>Source IP</th>
                              <th style={{ padding: '5px 8px', textAlign: 'left' }}>Primary Vector</th>
                              <th style={{ padding: '5px 0', textAlign: 'right' }}>Blocked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(threatIntel.top_ips || []).map((row) => (
                              <tr key={row.ip} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '6px 0', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#0F172A' }}>
                                  {row.ip}
                                </td>
                                <td style={{ padding: '6px 8px', color: '#475569' }}>{row.top_vector}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                  {fmtNumber(row.count)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {(threatIntel.top_paths || []).length > 0 && (
                        <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                            Most Targeted Application Endpoints
                          </div>
                          <table className="tabular-nums" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {(threatIntel.top_paths || []).map((p) => (
                                <tr key={p.path} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '5px 0', fontFamily: 'ui-monospace, monospace', color: '#334155', wordBreak: 'break-all' }}>
                                    {p.path}
                                  </td>
                                  <td style={{ padding: '5px 0 5px 10px', textAlign: 'right', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                    {fmtNumber(p.count)} hits
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 04: FLEET REMEDIATION PLAYBOOK & COMPLIANCE MAPPING */}
              <div className="print-section" style={{ marginBottom: 34 }}>
                {playbooks.length === 0 ? (
                  <div className="print-avoid-break">
                    <SectionHeading
                      num="04"
                      title="Risk Findings, Compliance Impact & Fleet Remediation Playbook"
                      subtitle="Root-cause security gaps grouped across the fleet, mapped to OWASP / CIS / SOC-2 controls with exact remediation instructions."
                      right={
                        <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                          0 unique control gap(s)
                        </span>
                      }
                    />
                    <div
                      className="print-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '16px 18px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 6,
                        fontSize: 13,
                        color: '#15803D',
                        fontWeight: 500
                      }}
                    >
                      <ShieldCheck size={17} />
                      <span>Zero open risk findings or hardening gaps were detected across the audited scope.</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {playbooks.map((pb, pIdx) => {
                      const isCrit = pb.severity === 'critical'
                      const cardEl = (
                        <div
                          className="print-avoid-break print-card"
                          style={{
                            border: '1px solid #E2E8F0',
                            borderLeft: `4px solid ${isCrit ? '#DC2626' : '#D97706'}`,
                            borderRadius: 6,
                            padding: '14px 18px',
                            background: '#FFFFFF'
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: isCrit ? '#FEF2F2' : '#FFFBEB',
                                  color: isCrit ? '#B91C1C' : '#B45309',
                                  border: `1px solid ${isCrit ? '#FECACA' : '#FDE68A'}`
                                }}
                              >
                                {pb.severity} &middot; {pb.category}
                              </span>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{pb.title}</span>
                              {pb.compliance && (
                                <span style={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', color: '#475569', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>
                                  {pb.compliance}
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums" style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A' }}>
                              Affected ({pb.affected_count}): {(pb.affected_domains || []).join(', ')}
                            </span>
                          </div>

                          <div className="print-grid-2 print-compact-text" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, fontSize: 12.5, lineHeight: 1.5 }}>
                            <div>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>Business &amp; Security Impact: </span>
                              <span style={{ color: '#334155' }}>{pb.impact}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>Remediation Playbook: </span>
                              <span style={{ color: '#334155' }}>{pb.remediation}</span>
                              {pb.points_at_stake > 0 && (
                                <span className="tabular-nums" style={{ display: 'inline-block', marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#15803D' }}>
                                  (+{pb.points_at_stake} pts on completion)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                      if (pIdx === 0) {
                        return (
                          <div key={pb.code || pb.title} className="print-avoid-break">
                            <SectionHeading
                              num="04"
                              title="Risk Findings, Compliance Impact & Fleet Remediation Playbook"
                              subtitle="Root-cause security gaps grouped across the fleet, mapped to OWASP / CIS / SOC-2 controls with exact remediation instructions."
                              right={
                                <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                                  {playbooks.length} unique control gap(s)
                                </span>
                              }
                            />
                            {cardEl}
                          </div>
                        )
                      }
                      return <div key={pb.code || pb.title}>{cardEl}</div>
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 05: AVAILABILITY SLA & DOWNTIME INCIDENT LOG */}
              <div className="print-avoid-break print-section" style={{ marginBottom: 34 }}>
                <SectionHeading
                  num="05"
                  title="Availability SLA & Origin Incident Audit Log"
                  subtitle="Outages confirmed by two consecutive failed health checks from the MDefender Watchdog before alerting."
                />

                {incidents.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 18px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#334155'
                    }}
                  >
                    <CheckCircle2 size={16} color="#15803D" />
                    <span>Zero origin downtime or timeout incidents occurred across audited properties during this {report.period_days}-day period.</span>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                    <table className="tabular-nums" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ padding: '9px 12px', fontWeight: 700 }}>Property</th>
                          <th style={{ padding: '9px 10px', fontWeight: 700 }}>Started (UTC)</th>
                          <th style={{ padding: '9px 10px', fontWeight: 700 }}>Duration</th>
                          <th style={{ padding: '9px 10px', fontWeight: 700 }}>Diagnostic Reason</th>
                          <th style={{ padding: '9px 12px', fontWeight: 700 }}>State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.map((inc, i) => (
                          <tr key={`${inc.domain}-${i}`} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0F172A' }}>{inc.domain}</td>
                            <td style={{ padding: '9px 10px', color: '#475569' }}>{inc.started_at}</td>
                            <td style={{ padding: '9px 10px', fontWeight: 600, color: '#0F172A' }}>{inc.duration_label}</td>
                            <td style={{ padding: '9px 10px', color: '#334155' }}>
                              {inc.status_code ? `HTTP ${inc.status_code} — ` : ''}
                              {inc.error_message}
                            </td>
                            <td style={{ padding: '9px 12px' }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: inc.status === 'ONGOING' ? '#FEF2F2' : '#F0FDF4',
                                  color: inc.status === 'ONGOING' ? '#B91C1C' : '#15803D',
                                  border: `1px solid ${inc.status === 'ONGOING' ? '#FECACA' : '#BBF7D0'}`
                                }}
                              >
                                {inc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 06: INDIVIDUAL PROPERTY SECURITY DOSSIERS (SITE-BY-SITE DIAGNOSTICS) */}
              <div className="print-section" style={{ marginBottom: 34 }}>
                {filteredWebsites.length === 0 ? (
                  <div className="print-avoid-break">
                    <SectionHeading
                      num="06"
                      title="Individual Property Security Dossiers (Site-by-Site Analysis)"
                      subtitle="Granular per-website audit detailing each property's unique risk narrative, control verification state, targeted threats, and full issue breakdown."
                      right={
                        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
                            {[
                              { id: 'all', label: 'All Sites' },
                              { id: 'issues', label: 'Issues Only' },
                              { id: 'healthy', label: 'Healthy Only' }
                            ].map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setVerdictFilter(f.id)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  border: 'none',
                                  borderRight: f.id !== 'healthy' ? '1px solid #CBD5E1' : 'none',
                                  cursor: 'pointer',
                                  background: verdictFilter === f.id ? '#0F172A' : '#FFFFFF',
                                  color: verdictFilter === f.id ? '#FFFFFF' : '#475569'
                                }}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <Search
                              size={13}
                              color="#94A3B8"
                              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Filter domain..."
                              style={{
                                padding: '5px 10px 5px 28px',
                                fontSize: 12.5,
                                border: '1px solid #CBD5E1',
                                borderRadius: 6,
                                color: '#0F172A',
                                width: 180
                              }}
                            />
                          </div>
                        </div>
                      }
                    />
                    <div style={{ padding: 28, textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}>
                      No websites match the current filter criteria.
                    </div>
                  </div>
                ) : (
                  <div className="print-dossier-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredWebsites.map((site, idx) => {
                      const vStyle = getVerdictStyle(site.verdict)
                      const sGrade = getGradeStyle(site.grade)
                      const siteIssues = site.issues || []
                      const controls = [
                        { label: 'Edge WAF', ok: site.waf_active, detail: String(site.waf_mode || 'protect').toUpperCase() },
                        { label: 'Availability', ok: site.is_online, detail: `${site.uptime_pct}% (${site.avg_latency_ms}ms)` },
                        { label: 'Malware Clean', ok: site.malware_clean, detail: site.malware_clean ? 'Verified Clean' : `${site.malware_hits} Hit(s)` },
                        { label: 'Login Cloak', ok: site.login_cloaked || site.ip_lock_enabled, detail: site.login_cloaked ? 'Stealth Active' : (site.ip_lock_enabled ? 'IP Locked' : 'Exposed') },
                        { label: 'Bot Shield', ok: site.bot_shield, detail: site.bot_shield ? 'Enforced' : 'Inactive' },
                        { label: '2FA Auth', ok: site.two_factor, detail: site.two_factor ? 'Enabled' : 'Not Active' },
                        { label: 'SSL / TLS', ok: site.ssl_status !== 'expired', detail: site.ssl_status === 'local_http' ? 'Local HTTP' : `${String(site.ssl_status || 'valid').toUpperCase()} (${site.ssl_grade || 'A'})` },
                        { label: 'Backups', ok: site.backups_count > 0, detail: `${site.backups_count} Snapshot(s)` }
                      ]

                      const dossierCard = (
                        <div
                          className="print-avoid-break"
                          style={{
                            border: '1px solid #CBD5E1',
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#FFFFFF'
                          }}
                        >
                          {/* Property Header Bar */}
                          <div
                            className="print-dossier-head"
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 18px',
                              background: '#F8FAFC',
                              borderBottom: '1px solid #E2E8F0'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="tabular-nums" style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#64748B' }}>
                                  #{idx + 1}
                                </span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{site.domain}</span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background: vStyle.bg,
                                    color: vStyle.color,
                                    border: `1px solid ${vStyle.border}`
                                  }}
                                >
                                  <span style={{ width: 6, height: 6, borderRadius: 99, background: vStyle.dot }} />
                                  {vStyle.label}
                                </span>
                              </div>
                              <div className="tabular-nums" style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                                Endpoint: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{site.url}</span> &middot; WP Agent: <strong>{site.connected ? 'Connected' : 'Disconnected'}</strong> &middot; Edge Traffic: <strong>{fmtNumber(site.requests)} req</strong> ({fmtNumber(site.blocked)} blocked)
                              </div>
                            </div>

                            <div
                              className="tabular-nums"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '5px 11px',
                                borderRadius: 6,
                                background: sGrade.bg,
                                border: `1px solid ${sGrade.border}`
                              }}
                            >
                              <span style={{ fontSize: 18, fontWeight: 800, color: sGrade.color }}>{site.grade || 'B'}</span>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{site.score}/100</div>
                                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{site.risk_level || 'EVALUATED'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Property Diagnostic Body */}
                          <div className="print-dossier-body" style={{ padding: '14px 18px' }}>
                            {/* Site-specific Executive Narrative */}
                            {site.narrative && (
                              <p className="print-compact-text print-dossier-narrative" style={{ fontSize: 12.5, color: '#1E293B', lineHeight: 1.5, margin: '0 0 10px', padding: '8px 11px', background: '#F8FAFC', borderLeft: '3px solid #0F172A', borderRadius: '0 4px 4px 0' }}>
                                <strong>Property Assessment: </strong>{site.narrative}
                              </p>
                            )}

                            {/* 8-Control Verification Grid */}
                            <div
                              className="tabular-nums print-grid-4 print-dossier-controls"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
                                gap: 8,
                                marginBottom: 10
                              }}
                            >
                              {controls.map((c) => (
                                <div
                                  key={c.label}
                                  className="print-dossier-ctrl-box"
                                  style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 5,
                                    padding: '5px 8px',
                                    background: '#FFFFFF'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                    <span>{c.label}</span>
                                    <span style={{ color: c.ok ? '#15803D' : '#B91C1C' }}>{c.ok ? 'PASS' : 'GAP'}</span>
                                  </div>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A', marginTop: 2 }}>{c.detail}</div>
                                </div>
                              ))}
                            </div>

                            {/* Site-specific Attack Vector Chips (if any logged for this property) */}
                            {(site.top_vectors || []).length > 0 && (
                              <div className="print-compact-text" style={{ fontSize: 11.5, color: '#334155', marginBottom: 8 }}>
                                <strong style={{ color: '#0F172A' }}>Targeted Vectors Logged on {site.domain}: </strong>
                                {(site.top_vectors || []).map((v) => (
                                  <span
                                    key={v.type}
                                    className="tabular-nums"
                                    style={{
                                      display: 'inline-block',
                                      marginRight: 6,
                                      marginTop: 3,
                                      padding: '1px 7px',
                                      background: '#F1F5F9',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 600
                                    }}
                                  >
                                    {v.type}: {fmtNumber(v.count)}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* ALL Issues Found on THIS Specific Website */}
                            {siteIssues.length === 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>
                                <CheckCircle2 size={15} />
                                <span>All security, availability, integrity, and continuity checks passed on {site.domain}.</span>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0F172A', marginBottom: 6 }}>
                                  Detected Issues &amp; Site-Specific Remediation ({siteIssues.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {siteIssues.map((iss, ii) => {
                                    const isCrit = iss.severity === 'critical'
                                    return (
                                      <div
                                        key={`${site.domain}-${iss.code || ii}`}
                                        className="print-dossier-issue"
                                        style={{
                                          border: '1px solid #E2E8F0',
                                          borderLeft: `3px solid ${isCrit ? '#DC2626' : '#D97706'}`,
                                          borderRadius: 4,
                                          padding: '8px 11px',
                                          fontSize: 12,
                                          lineHeight: 1.45
                                        }}
                                      >
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                                            {ii + 1}. {iss.title || iss.finding}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              textTransform: 'uppercase',
                                              color: isCrit ? '#B91C1C' : '#B45309'
                                            }}
                                          >
                                            {iss.severity} &middot; {iss.category}
                                            {iss.points_at_stake > 0 ? ` (+${iss.points_at_stake} pts)` : ''}
                                          </span>
                                        </div>
                                        <div style={{ color: '#334155' }}>
                                          <strong>Finding:</strong> {iss.finding} &mdash; <strong>Impact:</strong> {iss.impact}
                                        </div>
                                        <div style={{ color: '#0F172A', marginTop: 2 }}>
                                          <strong>Fix Step:</strong> {iss.remediation}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )

                      if (idx === 0) {
                        return (
                          <div key={site.website_id || site.domain} className="print-avoid-break">
                            <SectionHeading
                              num="06"
                              title="Individual Property Security Dossiers (Site-by-Site Analysis)"
                              subtitle="Granular per-website audit detailing each property's unique risk narrative, control verification state, targeted threats, and full issue breakdown."
                              right={
                                <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                                  <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
                                    {[
                                      { id: 'all', label: 'All Sites' },
                                      { id: 'issues', label: 'Issues Only' },
                                      { id: 'healthy', label: 'Healthy Only' }
                                    ].map((f) => (
                                      <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setVerdictFilter(f.id)}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: 12,
                                          fontWeight: 600,
                                          border: 'none',
                                          borderRight: f.id !== 'healthy' ? '1px solid #CBD5E1' : 'none',
                                          cursor: 'pointer',
                                          background: verdictFilter === f.id ? '#0F172A' : '#FFFFFF',
                                          color: verdictFilter === f.id ? '#FFFFFF' : '#475569'
                                        }}
                                      >
                                        {f.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ position: 'relative' }}>
                                    <Search
                                      size={13}
                                      color="#94A3B8"
                                      style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                    <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      placeholder="Filter domain..."
                                      style={{
                                        padding: '5px 10px 5px 28px',
                                        fontSize: 12.5,
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 6,
                                        color: '#0F172A',
                                        width: 180
                                      }}
                                    />
                                  </div>
                                </div>
                              }
                            />
                            {dossierCard}
                          </div>
                        )
                      }
                      return <div key={site.website_id || site.domain}>{dossierCard}</div>
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 07: FLEET SUMMARY MATRIX & COMPLIANCE ATTESTATION */}
              <div>
                <SectionHeading
                  num="07"
                  title="Fleet Comparison Summary Matrix & Audit Attestation"
                  subtitle={`Consolidated side-by-side overview across ${filteredWebsites.length} property(ies) for executive sign-off.`}
                />

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                  <table
                    className="tabular-nums"
                    style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}
                  >
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Website</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700 }}>Availability</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, textAlign: 'right' }}>Traffic / Blocked</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700 }}>Hardening</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700 }}>SSL / Malware</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, textAlign: 'right' }}>Grade / Score</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status &amp; Open Findings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWebsites.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748B' }}>
                            No websites match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredWebsites.map((site) => {
                          const vStyle = getVerdictStyle(site.verdict)
                          const issueNames = (site.issues || [])
                            .map((iss) => (typeof iss === 'string' ? iss : iss?.title || iss?.finding))
                            .filter(Boolean)
                          return (
                            <tr
                              key={site.website_id || site.id || site.domain}
                              style={{ borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}
                            >
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{site.domain}</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                  WP Agent: {site.connected ? 'Connected' : 'Disconnected'} &middot; Backups: {site.backups_count}
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px' }}>
                                <div style={{ fontWeight: 600, color: site.is_online ? '#0F172A' : '#B91C1C' }}>
                                  {site.is_online ? 'Online' : 'Offline'} ({site.uptime_pct}%)
                                </div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                  Latency: {site.avg_latency_ms} ms
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{fmtNumber(site.requests)}</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                  {fmtNumber(site.blocked)} blocked
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px' }}>
                                <div style={{ color: '#0F172A' }}>
                                  WAF: <strong style={{ textTransform: 'uppercase' }}>{site.waf_mode}</strong>
                                </div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                  Login: {site.login_cloaked ? 'Stealth' : (site.ip_lock_enabled ? 'IP Lock' : 'Off')} &middot; 2FA: {site.two_factor ? 'On' : 'Off'}
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px' }}>
                                <div style={{ color: site.ssl_status === 'expired' ? '#B91C1C' : '#0F172A', fontWeight: 500 }}>
                                  SSL: {site.ssl_status === 'local_http' ? 'Local HTTP' : `${String(site.ssl_status || 'valid').toUpperCase()} (${site.ssl_grade || 'A'})`}
                                </div>
                                <div style={{ fontSize: 11, color: site.malware_clean ? '#64748B' : '#B91C1C', marginTop: 2 }}>
                                  Scan: {site.malware_clean ? 'Clean' : `${site.malware_hits} Threats`}
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                                {site.grade || 'B'} ({site.score})
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background: vStyle.bg,
                                    color: vStyle.color,
                                    border: `1px solid ${vStyle.border}`
                                  }}
                                >
                                  <span style={{ width: 6, height: 6, borderRadius: 99, background: vStyle.dot }} />
                                  {vStyle.label}
                                </span>
                                {issueNames.length > 0 && (
                                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, maxWidth: 250, lineHeight: 1.4 }}>
                                    <strong>{issueNames.length} finding(s):</strong> {issueNames.join('; ')}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Attestation Note */}
                <div
                  className="print-avoid-break print-card print-compact-text"
                  style={{
                    marginTop: 18,
                    padding: '14px 16px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#475569',
                    lineHeight: 1.55
                  }}
                >
                  <strong style={{ color: '#0F172A' }}>Audit Telemetry Attestation:</strong> This document represents an automated point-in-time security and availability evaluation generated by the MDefender Pro Control Plane for <strong>{org.name || 'Workspace Organization'}</strong>. All figures are derived deterministically from verified Edge WAF inspection logs, Watchdog origin probes, TLS certificate monitors, and WordPress agent hardening states without executing intrusive live vulnerability scans against customer origins.
                </div>
              </div>

              {/* Compliance Sign-off Footer (screen-only because print tfoot already stamps every page) */}
              <div
                className="no-print"
                style={{
                  marginTop: 24,
                  paddingTop: 14,
                  borderTop: '1px solid #CBD5E1',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 11,
                  color: '#64748B'
                }}
              >
                <span>MDefender Pro Enterprise Security Operations &middot; Confidential Executive &amp; Compliance Report</span>
                <span>Zero-Origin-Load Telemetry Digest &middot; {report.report_id}</span>
              </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: AUTOMATED EMAIL DIGESTS                                        */}
      {/* ===================================================================== */}
      {activeTab === 'schedules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '14px 18px'
            }}
          >
            <Mail size={18} color="#0F172A" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              <strong style={{ color: '#0F172A' }}>Zero-Load Automated Executive Digests:</strong> Each schedule stores only a lightweight policy configuration (~300 bytes) with zero PDF blobs stored in the database. At dispatch time, the scheduler compiles your Grade, Executive Summary, and Priority Remediation Playbook directly from cached telemetry.
            </div>
          </div>

          <form
            onSubmit={handleCreateSchedule}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Plus size={16} color="#0F172A" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Create Automated Digest Schedule
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 14,
                marginBottom: 16
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={schedForm.name}
                  onChange={(e) => setSchedForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Weekly Executive Security Digest"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    color: '#0F172A'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                  Cadence
                </label>
                <select
                  value={schedForm.frequency}
                  onChange={(e) => setSchedForm((p) => ({ ...p, frequency: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="daily">Daily Briefing (Last 24h)</option>
                  <option value="weekly">Weekly Executive Digest (Last 7d)</option>
                  <option value="monthly">Monthly Compliance Summary (Last 30d)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                  Website Scope
                </label>
                <select
                  value={schedForm.website_id}
                  onChange={(e) => setSchedForm((p) => ({ ...p, website_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="all">All Connected Websites ({scopeOptions.length})</option>
                  {scopeOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.domain}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                  Recipient Email(s)
                </label>
                <input
                  type="text"
                  value={schedForm.recipients}
                  onChange={(e) => setSchedForm((p) => ({ ...p, recipients: e.target.value }))}
                  placeholder="secops@company.com, ciso@company.com"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    color: '#0F172A'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingSchedule}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid #0F172A',
                borderRadius: 6,
                cursor: creatingSchedule ? 'wait' : 'pointer'
              }}
            >
              <CalendarClock size={14} />
              {creatingSchedule ? 'Saving Schedule...' : 'Create Automated Digest'}
            </button>
          </form>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid #E2E8F0'
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Configured Digest Schedules ({schedules.length})
              </h3>
              <button
                type="button"
                onClick={fetchSchedules}
                disabled={loadingSchedules}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            {loadingSchedules && schedules.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                Loading digest schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No automated digest schedules configured yet. Create one above to begin scheduled stakeholder reporting.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {schedules.map((sched, idx) => (
                  <div
                    key={sched.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      padding: '14px 18px',
                      borderBottom: idx < schedules.length - 1 ? '1px solid #E2E8F0' : 'none'
                    }}
                  >
                    <div style={{ minWidth: 260, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{sched.name}</span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: sched.enabled ? '#F0FDF4' : '#F1F5F9',
                            color: sched.enabled ? '#15803D' : '#64748B',
                            border: `1px solid ${sched.enabled ? '#BBF7D0' : '#CBD5E1'}`
                          }}
                        >
                          {sched.enabled ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: '#F8FAFC',
                            color: '#334155',
                            border: '1px solid #E2E8F0'
                          }}
                        >
                          {sched.frequency}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#475569', marginTop: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Globe size={12} color="#64748B" />
                          {siteLabelById[sched.website_id] || sched.website_id}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} color="#64748B" />
                          {(sched.recipients || []).join(', ') || 'Account Owner'}
                        </span>
                        <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color="#64748B" />
                          Next: {fmtDateShort(sched.next_run_at)}
                        </span>
                        {sched.last_sent_at && (
                          <span className="tabular-nums">
                            Last sent: {fmtDateShort(sched.last_sent_at)} ({sched.last_status})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleRunNow(sched.id)}
                        disabled={runningScheduleId === sched.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 11px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#0F172A',
                          color: '#FFFFFF',
                          border: '1px solid #0F172A',
                          borderRadius: 6,
                          cursor: runningScheduleId === sched.id ? 'wait' : 'pointer'
                        }}
                      >
                        <Send size={12} />
                        {runningScheduleId === sched.id ? 'Sending...' : 'Send Now'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSchedule(sched)}
                        title={sched.enabled ? 'Pause schedule' : 'Resume schedule'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#FFFFFF',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        {sched.enabled ? <Pause size={12} /> : <Play size={12} />}
                        {sched.enabled ? 'Pause' : 'Resume'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(sched.id)}
                        title="Delete schedule"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 8px',
                          background: '#FFFFFF',
                          color: '#B91C1C',
                          border: '1px solid #FECACA',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
