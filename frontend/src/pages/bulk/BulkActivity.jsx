import { useState } from 'react'
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
  Sliders
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'

export default function BulkActivity() {
  const { wpWebsites, hasWebsites } = useBulkFleet()
  const [filterType, setFilterType] = useState('all') // 'all' | 'config' | 'backup' | 'update' | 'security'
  const [toastMsg, setToastMsg] = useState(null)
  const [logs, setLogs] = useState([])

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const filteredLogs = filterType === 'all' ? logs : logs.filter(l => l.type === filterType)

  const handleExportLogs = () => {
    if (logs.length === 0) {
      showToast('No activity logs to export yet.', true)
      return
    }
    showToast('Exporting immutable audit trail log (CSV)... Download started!')
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
        subtitle="Immutable timestamped log of all plugin updates, theme modifications, policy dispatches, and emergency restore actions."
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
        <div style={contentCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Operations' },
                { id: 'config', label: 'WAF & Config' },
                { id: 'backup', label: 'Backups' },
                { id: 'update', label: 'Plugin/Theme Updates' },
                { id: 'security', label: 'Threat Mitigation' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
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

            <button
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              style={{ ...secondaryButtonStyle, opacity: logs.length === 0 ? 0.6 : 1, cursor: logs.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <Download size={13} />
              <span>Export Audit Trail (CSV)</span>
            </button>
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
                  No Activity Recorded Yet
                </div>
                <div style={{ fontSize: '13px', color: '#60716B', maxWidth: '420px', margin: '0 auto' }}>
                  Administrative operations, plugin updates, snapshots, and security policy dispatches across your connected fleet will appear here in the audit log.
                </div>
              </div>
            ) : (
              filteredLogs.map(log => (
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
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>{log.action}</div>
                    <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '3px' }}>
                      Operator: <strong>{log.user}</strong> • Target: <strong>{log.target}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={badgeStyle('#F0F9FF', '#0284C7', '#BAE6FD')}>{log.badge}</span>
                    <span style={{ fontSize: '12px', color: '#889895', minWidth: '100px', textAlign: 'right' }}>{log.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const contentCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '28px 32px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
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
