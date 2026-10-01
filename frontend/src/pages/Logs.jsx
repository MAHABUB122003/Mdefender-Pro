import { useState, useEffect, Fragment } from 'react'
import api from '../api/api'
import adminStore from '../utils/adminStore'

export default function Logs() {
  const cachedLogs = adminStore.get('global_logs')
  const [logs, setLogs] = useState(cachedLogs || { logs: [], total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(!cachedLogs)
  const [search, setSearch] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Action Modals
  const [whitelistModal, setWhitelistModal] = useState({ open: false, log: null, name: '', pattern: '', match_type: 'contains' })
  const [trainModal, setTrainModal] = useState({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const perPage = 20

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchLogs = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const params = { page, limit: perPage }
      if (search) params.search = search
      if (ipFilter) params.ip = ipFilter
      if (typeFilter) params.attack_type = typeFilter
      if (statusFilter) params.status = statusFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const data = await api.getLogs(params)
      if (data) {
        setLogs(data)
        if (page === 1 && !search && !ipFilter && !typeFilter) {
          adminStore.set('global_logs', data)
        }
      }
    } catch (err) {
      console.error(err)
      if (!adminStore.get('global_logs')) {
        showToast('Failed to load global logs', true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(!adminStore.get('global_logs'))
  }, [page])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(true)
  }

  const handleResetFilter = () => {
    setSearch('')
    setIpFilter('')
    setTypeFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    setTimeout(() => fetchLogs(true), 50)
  }

  // ==================== 1-CLICK WHITELIST (FIX 403) ====================
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
    setActionLoading(true)
    try {
      await api.adminWhitelistPattern({
        name: whitelistModal.name,
        pattern: whitelistModal.pattern,
        match_type: whitelistModal.match_type,
        description: whitelistModal.description,
        target_payload: whitelistModal.pattern
      })
      showToast(`Success! Pattern '${whitelistModal.name}' whitelisted. Requests will no longer be blocked (403 fixed).`)
      setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains' })
      fetchLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to whitelist pattern', true)
    } finally {
      setActionLoading(false)
    }
  }

  // ==================== 1-CLICK TRAIN ML ATTACK ====================
  const openTrainDialog = (log) => {
    const payload = log.request_body || log.payload || log.url || ''
    setTrainModal({
      open: true,
      log,
      payload: payload,
      category: log.attack_type || 'SQL Injection',
      label: 1,
      notes: `Captured from live attack log against ${log.url || 'WAF endpoint'}`
    })
  }

  const submitTrainML = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.adminAddLearnedSample({
        payload: trainModal.payload,
        label: trainModal.label,
        category: trainModal.category,
        notes: trainModal.notes
      })
      showToast(`Attack pattern fed into Machine Learning dataset! Model will learn this threat pattern.`)
      setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })
    } catch (err) {
      showToast(err.message || 'Failed to submit training sample', true)
    } finally {
      setActionLoading(false)
    }
  }

  // ==================== 1-CLICK BLOCK IP ====================
  const handleQuickBlockIP = async (ip) => {
    if (!ip || ip === '127.0.0.1') {
      showToast('Cannot block local loopback IP', true)
      return
    }
    if (!confirm(`Are you sure you want to permanently block IP ${ip}?`)) return
    try {
      await api.addBlacklist({ ip, reason: 'Blocked from Super Admin Global Logs' })
      showToast(`IP ${ip} has been added to blacklist!`)
      fetchLogs(false)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', true)
    }
  }

  // ==================== EXPORT UTILITIES ====================
  const exportAsCSV = () => {
    const rows = logs.logs || []
    if (!rows.length) {
      showToast('No logs to export', true)
      return
    }
    const headers = ['Timestamp', 'IP', 'Method', 'URL', 'Attack Type', 'Confidence', 'Status', 'Rule Matched', 'User Agent']
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
        `"${(r.rule_matched || '').replace(/"/g, '""')}"`,
        `"${(r.user_agent || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MDefender_Global_Logs_${new Date().toISOString().slice(0, 10)}.csv`)
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
    link.setAttribute('download', `MDefender_Global_Logs_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('JSON export downloaded successfully!')
  }

  const exportAsDocxReport = () => {
    const rows = logs.logs || []
    if (!rows.length) {
      showToast('No logs to export', true)
      return
    }
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>MDefender Global Security Incident Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
        h1 { color: #dc2626; font-size: 18pt; border-bottom: 2px solid #dc2626; padding-bottom: 6px; }
        h2 { color: #334155; font-size: 14pt; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        th { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10pt; }
        td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
        .blocked { color: #dc2626; font-weight: bold; }
        .allowed { color: #16a34a; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>MDefender Pro - Global Security Audit & Threat Report</h1>
        <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Inspected Events:</strong> ${rows.length}</p>
        <p><strong>Summary:</strong> Comprehensive WAF event audit log, including blocked cyber attacks, machine learning detections, and user traffic telemetry.</p>
        
        <h2>Incident Log Details</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp</th>
              <th>IP Address</th>
              <th>Method & URL</th>
              <th>Threat Classification</th>
              <th>Confidence</th>
              <th>Action / Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${r.timestamp || 'N/A'}</td>
                <td>${r.ip || 'N/A'}</td>
                <td><strong>${r.method || 'GET'}</strong> ${r.url || '/'}</td>
                <td>${r.attack_type || 'Normal'}</td>
                <td>${r.confidence != null ? Number(r.confidence).toFixed(2) : '-'}</td>
                <td class="${r.status === 'blocked' ? 'blocked' : 'allowed'}">${r.status || 'allowed'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MDefender_Security_Report_${new Date().toISOString().slice(0, 10)}.doc`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Word Document (.doc/.docx) report generated and downloaded!')
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
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
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-list-check"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Global Traffic & Threat Audit Logs
            </h1>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '3px 0 0' }}>
              Real-time inspection of all tenant requests, automated ML attack learning, and 1-click false-positive 403 resolution.
            </p>
          </div>
        </div>

        {/* Multi-Format Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportAsCSV}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-file-csv"></i> Export CSV
          </button>

          <button
            type="button"
            onClick={exportAsJSON}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#7c3aed',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-file-code"></i> Export JSON
          </button>

          <button
            type="button"
            onClick={exportAsDocxReport}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-file-word"></i> Export .DOCX Report
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8', fontSize: '13px' }}></i>
            <input
              type="text"
              placeholder="Search IP, URL, Request Body, Attack..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            />
          </div>

          <input
            type="text"
            placeholder="Filter IP (e.g. 192.168.1.1)"
            value={ipFilter}
            onChange={e => setIpFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '180px'
            }}
          />

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: 'white'
            }}
          >
            <option value="">All Attack Types</option>
            <option value="SQL Injection">SQL Injection</option>
            <option value="XSS">XSS (Cross-Site Scripting)</option>
            <option value="Command Injection">Command Injection (RCE)</option>
            <option value="Path Traversal">Path Traversal / LFI</option>
            <option value="Malicious Bot">Malicious Bot</option>
            <option value="Country Block">Country Blocked</option>
            <option value="IP Blacklist">IP Blacklist</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: 'white'
            }}
          >
            <option value="">All Statuses</option>
            <option value="blocked">Blocked (403)</option>
            <option value="allowed">Allowed (200/Pass)</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Date From"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px'
            }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Date To"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px'
            }}
          />

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-filter"></i> Apply Filters
          </button>

          <button
            type="button"
            onClick={handleResetFilter}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </form>

        {/* Quick maintenance cleaners */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{logs.logs?.length || 0}</strong> of <strong>{logs.total || 0}</strong> recorded events
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={async () => { if (confirm('Delete all logs older than 7 days?')) { await api.cleanLogs(7); fetchLogs(true) } }}
              style={{ padding: '4px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11.5px', cursor: 'pointer' }}
            >
              <i className="fas fa-clock"></i> Clean 7+ Days
            </button>
            <button
              onClick={async () => { if (confirm('Delete all logs older than 30 days?')) { await api.cleanLogs(30); fetchLogs(true) } }}
              style={{ padding: '4px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11.5px', cursor: 'pointer' }}
            >
              <i className="fas fa-calendar"></i> Clean 30+ Days
            </button>
            <button
              onClick={async () => { if (confirm('WARNING: Delete ALL logs?') && confirm('Are you completely sure?')) { await api.cleanAllLogs(); fetchLogs(true) } }}
              style={{ padding: '4px 10px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              <i className="fas fa-trash"></i> Clean All Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>#</th>
                <th style={{ padding: '12px 16px' }}>Client IP</th>
                <th style={{ padding: '12px 16px' }}>Method & URL</th>
                <th style={{ padding: '12px 16px' }}>Attack Classification</th>
                <th style={{ padding: '12px 16px' }}>ML Score</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions & Learning</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading traffic stream...
                  </td>
                </tr>
              ) : logs.logs?.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                    No security events found matching the criteria.
                  </td>
                </tr>
              ) : (
                logs.logs?.map((log, i) => (
                  <Fragment key={i}>
                    <tr
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: expandedRow === i ? '#f8fafc' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '500' }}>
                        {(page - 1) * perPage + i + 1}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: '600' }}>
                          {log.ip}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: log.method === 'POST' ? '#fef3c7' : '#e0f2fe',
                            color: log.method === 'POST' ? '#b45309' : '#0369a1'
                          }}>
                            {log.method || 'GET'}
                          </span>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#334155',
                            fontWeight: '500'
                          }} title={log.url}>
                            {log.url || '/'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          background: log.status === 'blocked' ? '#fee2e2' : '#f1f5f9',
                          color: log.status === 'blocked' ? '#dc2626' : '#475569'
                        }}>
                          <i className={`fas ${log.status === 'blocked' ? 'fa-shield-halved' : 'fa-check'}`}></i>
                          {log.attack_type || 'Normal Traffic'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {log.confidence != null ? (
                          <span style={{
                            fontWeight: '700',
                            color: Number(log.confidence) > 0.8 ? '#dc2626' : Number(log.confidence) > 0.5 ? '#d97706' : '#16a34a'
                          }}>
                            {(Number(log.confidence) * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: log.status === 'blocked' ? '#fee2e2' : '#dcfce7',
                          color: log.status === 'blocked' ? '#dc2626' : '#16a34a'
                        }}>
                          {log.status === 'blocked' ? '403 Blocked' : 'Allowed'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* 1-Click Fix 403 Whitelist Button */}
                          <button
                            type="button"
                            onClick={() => openWhitelistDialog(log)}
                            title="Whitelist this URL/Pattern to fix False Positive 403"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#16a34a',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fas fa-shield-heart"></i> Whitelist (Fix 403)
                          </button>

                          {/* 1-Click Train ML Attack Button */}
                          <button
                            type="button"
                            onClick={() => openTrainDialog(log)}
                            title="Feed attack pattern into ML continuous active learning engine"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              background: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              color: '#7c3aed',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fas fa-brain"></i> Train ML
                          </button>

                          {/* 1-Click Block IP */}
                          <button
                            type="button"
                            onClick={() => handleQuickBlockIP(log.ip)}
                            title="Block this IP address immediately"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fas fa-ban"></i>
                          </button>

                          {/* Details Toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#475569',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <i className={`fas ${expandedRow === i ? 'fa-chevron-up' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Row View */}
                    {expandedRow === i && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan="8" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '12.5px' }}>
                            <div>
                              <p style={{ margin: '0 0 6px', color: '#64748b' }}><strong>Full URL:</strong></p>
                              <code style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', display: 'block', wordBreak: 'break-all' }}>
                                {log.url || '/'}
                              </code>
                            </div>

                            <div>
                              <p style={{ margin: '0 0 6px', color: '#64748b' }}><strong>Matched Rule / Engine:</strong></p>
                              <code style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', display: 'block', color: '#dc2626' }}>
                                {log.rule_matched || 'Machine Learning Vectorizer / Hyper Rule Engine'}
                              </code>
                            </div>

                            <div>
                              <p style={{ margin: '0 0 6px', color: '#64748b' }}><strong>User Agent:</strong></p>
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', color: '#475569', fontSize: '11.5px', wordBreak: 'break-all' }}>
                                {log.user_agent || 'Standard HTTP Client'}
                              </div>
                            </div>

                            <div>
                              <p style={{ margin: '0 0 6px', color: '#64748b' }}><strong>Request Payload / Body:</strong></p>
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', color: '#0f172a', fontFamily: 'monospace', fontSize: '11.5px', maxHeight: '100px', overflowY: 'auto' }}>
                                {log.request_body || log.payload || '(None / GET parameters only)'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.total_pages > 1 && (
          <div style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ color: '#64748b', fontSize: '12.5px' }}>
              Page <strong>{page}</strong> of <strong>{logs.total_pages}</strong> ({logs.total} total logs)
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', cursor: 'pointer' }}
                >
                  Previous
                </button>
              )}
              {Array.from({ length: logs.total_pages }, (_, i) => i + 1)
                .filter(p => p >= page - 2 && p <= page + 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: p === page ? '#2563eb' : 'white',
                      border: '1px solid #e2e8f0',
                      color: p === page ? 'white' : '#475569',
                      fontSize: '12px',
                      fontWeight: p === page ? '700' : '500',
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
              {page < logs.total_pages && (
                <button
                  onClick={() => setPage(page + 1)}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', cursor: 'pointer' }}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL: WHITELIST FALSE POSITIVE (FIX 403) ==================== */}
      {whitelistModal.open && (
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
          <div style={{
            background: 'white',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-shield-heart"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                  Whitelist Legitimate Request (Fix 403)
                </h3>
              </div>
              <button
                onClick={() => setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains' })}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={submitWhitelist} style={{ padding: '20px' }}>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
                Adding this whitelist entry will immediately stop WAF from 403-blocking this request URL/payload and train the ML engine with a benign sample.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Rule Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={whitelistModal.name}
                  onChange={e => setWhitelistModal({ ...whitelistModal, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Match Type
                </label>
                <select
                  value={whitelistModal.match_type}
                  onChange={e => setWhitelistModal({ ...whitelistModal, match_type: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value="url_path">URL Path (e.g. /wp-admin/admin-ajax.php)</option>
                  <option value="contains">Contains Substring</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Pattern / URL to Whitelist
                </label>
                <textarea
                  rows="3"
                  required
                  value={whitelistModal.pattern}
                  onChange={e => setWhitelistModal({ ...whitelistModal, pattern: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setWhitelistModal({ open: false, log: null, name: '', pattern: '', match_type: 'contains' })}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={`fas ${actionLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                  {actionLoading ? 'Whitelisting...' : 'Apply Whitelist & Fix 403'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TRAIN ML ATTACK ==================== */}
      {trainModal.open && (
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
          <div style={{
            background: 'white',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-brain"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                  Train WAF Machine Learning Model
                </h3>
              </div>
              <button
                onClick={() => setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={submitTrainML} style={{ padding: '20px' }}>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
                Feed this new attack pattern into the continuous active learning dataset so the AI security model will automatically recognize and 403-block similar threats.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Attack Classification Category
                </label>
                <select
                  value={trainModal.category}
                  onChange={e => setTrainModal({ ...trainModal, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value="SQL Injection">SQL Injection</option>
                  <option value="XSS">XSS (Cross-Site Scripting)</option>
                  <option value="Command Injection">Command Injection (RCE)</option>
                  <option value="Path Traversal">Path Traversal / LFI</option>
                  <option value="SSRF">SSRF (Server-Side Request Forgery)</option>
                  <option value="Malicious Payload">Generic Malicious Payload</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Attack Payload / Signature
                </label>
                <textarea
                  rows="3"
                  required
                  value={trainModal.payload}
                  onChange={e => setTrainModal({ ...trainModal, payload: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Model Target Classification
                </label>
                <select
                  value={trainModal.label}
                  onChange={e => setTrainModal({ ...trainModal, label: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value={1}>Attack Sample (Label = 1: Should Block 403)</option>
                  <option value={0}>Benign Sample (Label = 0: Should Allow 200)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setTrainModal({ open: false, log: null, payload: '', category: 'SQL Injection', label: 1, notes: '' })}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={`fas ${actionLoading ? 'fa-spinner fa-spin' : 'fa-brain'}`}></i>
                  {actionLoading ? 'Feeding ML...' : 'Feed to ML Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
