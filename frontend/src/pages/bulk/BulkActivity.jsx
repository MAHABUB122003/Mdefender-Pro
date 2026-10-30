import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Filter,
  Check,
  AlertTriangle,
  Clock,
  User,
  Shield,
  HardDrive,
  RefreshCw,
  Sliders,
  Search,
  Activity,
  CheckCircle2,
  Lock,
  Zap,
  Globe
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkActivity() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite } = useBulkFleet()
  const [filterType, setFilterType] = useState('all') // 'all' | 'config' | 'backup' | 'update' | 'security'
  const [searchTerm, setSearchTerm] = useState('')
  const [toastMsg, setToastMsg] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const fetchActivityLogs = async (showNotification = false) => {
    setLoading(true)
    try {
      const params = { limit: 150 }
      if (filterType !== 'all') {
        params.category = filterType
      }
      if (selectedSiteId && selectedSiteId !== 'all') {
        params.website_id = selectedSiteId
      }
      const res = await api.getFleetActivityLogs(params)
      if (res && res.data && Array.isArray(res.data.logs)) {
        setLogs(res.data.logs)
        if (showNotification) {
          showToast(`Activity ledger synced: ${res.data.logs.length} audit records retrieved.`)
        }
      } else if (res && Array.isArray(res.logs)) {
        setLogs(res.logs)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to load fleet activity logs:', err)
      if (showNotification) {
        showToast('Failed to retrieve audit trail logs from cluster', true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityLogs(false)
  }, [filterType, selectedSiteId])

  // Filter logs by search keyword
  const filteredLogs = logs.filter(log => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.target && log.target.toLowerCase().includes(term)) ||
      (log.user && log.user.toLowerCase().includes(term)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(term)) ||
      (log.badge && log.badge.toLowerCase().includes(term))
    )
  })

  // Export Real CSV file for download
  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showToast('No activity logs available to export.', true)
      return
    }

    try {
      const headers = ['Timestamp', 'Action', 'Category', 'Operator', 'Target Site', 'IP Address', 'Status']
      const rows = filteredLogs.map(l => [
        `"${l.timestamp || l.time || ''}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${l.badge || l.type || ''}"`,
        `"${l.user || ''}"`,
        `"${l.target || ''}"`,
        `"${l.ip_address || ''}"`,
        `"${l.status || 'success'}"`
      ])

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `mdefender_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast(`Exported ${filteredLogs.length} audit trail records to CSV successfully!`)
    } catch (err) {
      showToast('Failed to export CSV file', true)
    }
  }

  // Count summaries
  const totalOps = logs.length
  const securityOps = logs.filter(l => l.type === 'security').length
  const configOps = logs.filter(l => l.type === 'config').length
  const backupOps = logs.filter(l => l.type === 'backup').length

  const getActionIcon = (type) => {
    switch (type) {
      case 'security':
        return <Shield size={16} color="#0284C7" />
      case 'backup':
        return <HardDrive size={16} color="#2A8B68" />
      case 'update':
        return <RefreshCw size={16} color="#7C3AED" />
      case 'config':
      default:
        return <Sliders size={16} color="#D97706" />
    }
  }

  const getBadgeColors = (badge) => {
    switch (badge) {
      case 'SECURITY':
      case 'AUTH':
        return { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' }
      case 'BACKUP':
        return { bg: '#E8F3EC', color: '#2A8B68', border: '#CFE2D4' }
      case 'UPDATE':
        return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' }
      case 'CONFIG':
      default:
        return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' }
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMsg.isError ? '#A34F22' : '#0B2522',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(11, 37, 34, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <BulkHeader
        title="Fleet Administrative Activity &amp; Audit Trail"
        subtitle="Immutable timestamped log of all security mitigations, IP quarantines, backup snapshots, and configuration policies."
        icon={FileText}
        activeBadge="Audit Ledger"
      />

      {!hasWebsites ? (
        <EmptyFleetState
          title="No WordPress Websites Connected Yet"
          description="Your activity log is empty because no WordPress sites are connected. Connect your site using the MDefender-Pro plugin to start tracking administrative updates, hardening dispatches, and security events."
          featureName="Activity & Audit Trail"
        />
      ) : (
        <>
          {/* Summary Metric Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Operations
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#10201E', marginTop: '4px' }}>
                {totalOps} Events
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '4px' }}>
                Complete tenant ledger records
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Security &amp; Threats
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284C7', marginTop: '4px' }}>
                {securityOps} Actions
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '4px' }}>
                IP bans, unblocks &amp; sessions
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Policy Dispatches
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#B45309', marginTop: '4px' }}>
                {configOps} Updates
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '4px' }}>
                WAF, Under Attack &amp; Rate limits
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Backup &amp; Recovery
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#2A8B68', marginTop: '4px' }}>
                {backupOps} Snapshots
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '4px' }}>
                Database &amp; filesystem archives
              </div>
            </div>
          </div>

          <div style={contentCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Operations' },
                  { id: 'security', label: 'Threat Mitigation & Auth' },
                  { id: 'config', label: 'WAF & Policies' },
                  { id: 'backup', label: 'Backups' },
                  { id: 'update', label: 'Updates' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: '1px solid #D9E1DC',
                      background: filterType === tab.id ? '#10201E' : '#FAFBF9',
                      color: filterType === tab.id ? '#FFFFFF' : '#10201E',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search Filter Input */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#60716B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search action, IP, target..."
                    style={{
                      padding: '8px 12px 8px 34px',
                      borderRadius: '8px',
                      border: '1px solid #D9E1DC',
                      background: '#ffffff',
                      fontSize: '12.5px',
                      color: '#10201E',
                      outline: 'none',
                      width: '200px'
                    }}
                  />
                </div>

                <button
                  onClick={() => fetchActivityLogs(true)}
                  disabled={loading}
                  style={secondaryButtonStyle}
                  title="Refresh Audit Ledger"
                >
                  <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleExportLogs}
                  disabled={filteredLogs.length === 0}
                  style={{ ...primaryButtonStyle, opacity: filteredLogs.length === 0 ? 0.6 : 1, cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#60716B' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#FAFBF9',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: '#2A8B68'
                  }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', marginBottom: '4px' }}>
                    {searchTerm ? 'No Matching Records Found' : 'No Activity Recorded in this Category'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#60716B', maxWidth: '420px', margin: '0 auto' }}>
                    {searchTerm
                      ? `No audit logs matched "${searchTerm}". Try resetting your search filter.`
                      : 'Administrative operations, security mitigation events, snapshots, and policy dispatches will appear here in the audit log.'}
                  </div>
                </div>
              ) : (
                filteredLogs.map(log => {
                  const bColors = getBadgeColors(log.badge)
                  return (
                    <div
                      key={log.id}
                      style={{
                        border: '1px solid #D9E1DC',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        background: '#FBFCFA',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#ffffff',
                          border: '1px solid #D9E1DC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getActionIcon(log.type)}
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>
                            {log.action}
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '3px' }}>
                            Operator: <strong>{log.user}</strong> • Target: <strong>{log.target}</strong>
                            {log.ip_address && log.ip_address !== 'system' && log.ip_address !== '127.0.0.1' && (
                              <span> • IP: <span style={{ fontFamily: 'monospace' }}>{log.ip_address}</span></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={badgeStyle(bColors.bg, bColors.color, bColors.border)}>
                          {log.badge}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#889895', minWidth: '130px', justifyContent: 'flex-end' }}>
                          <Clock size={12} />
                          <span>{log.time}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const contentCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '24px 28px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
}

const statCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '20px 22px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
}

const primaryButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  background: '#0B2522',
  color: '#ffffff',
  border: 'none',
  fontWeight: '700',
  fontSize: '12.5px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'opacity 0.15s ease'
}

const secondaryButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  background: '#ffffff',
  border: '1px solid #D9E1DC',
  color: '#10201E',
  fontWeight: '600',
  fontSize: '12.5px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px'
}

const badgeStyle = (bg, color, border) => ({
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  background: bg,
  color: color,
  border: `1px solid ${border}`
})
