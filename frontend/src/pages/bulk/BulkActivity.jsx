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

export default function BulkActivity() {
  const [filterType, setFilterType] = useState('all') // 'all' | 'config' | 'backup' | 'update' | 'security'
  const [toastMsg, setToastMsg] = useState(null)

  const logs = [
    { id: 1, action: 'Edge WAF Rule Synchronization Dispatched', user: 'Mahabub (Owner)', target: 'mahabub.shop', time: '10 minutes ago', badge: 'CONFIG', type: 'config' },
    { id: 2, action: 'Automated Snapshot Created (Pre-Update Checkpoint)', user: 'System Vault Runner', target: 'fleet-global', time: '1 hour ago', badge: 'BACKUP', type: 'backup' },
    { id: 3, action: 'Bulk Plugin Update: WooCommerce updated to v8.5.2', user: 'Mahabub', target: 'mahabub.shop', time: '3 hours ago', badge: 'UPDATE', type: 'update' },
    { id: 4, action: 'Malware Threat Quarantined & Blocked', user: 'MDefender Neural Core', target: 'mahabub.shop', time: 'Yesterday, 11:20 PM', badge: 'SECURITY', type: 'security' },
    { id: 5, action: 'Hardening Policy: Restrict XML-RPC enabled', user: 'Mahabub', target: 'mahabub.shop', time: 'Oct 23, 2026', badge: 'CONFIG', type: 'config' },
    { id: 6, action: 'Theme Activated: Astra Pro v4.6.4', user: 'Mahabub', target: 'mahabub.shop', time: 'Oct 22, 2026', badge: 'UPDATE', type: 'update' },
    { id: 7, action: 'Snapshot Checkpoint Restored: Oct 15 Point', user: 'Mahabub', target: 'mahabub.shop', time: 'Oct 16, 2026', badge: 'BACKUP', type: 'backup' }
  ]

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const filteredLogs = filterType === 'all' ? logs : logs.filter(l => l.type === filterType)

  const handleExportLogs = () => {
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
        title="Admin Activity History &amp; Fleet Operations Audit"
        subtitle="Complete tamper-evident audit trail of administrative actions, plugin/theme updates, snapshot events, and security dispatches."
        icon={FileText}
        activeBadge="Audit Log Engine"
      />

      <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
              Fleet Operations Timeline
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              Showing {filteredLogs.length} logged operations across fleet sites
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F3', padding: '4px', borderRadius: '10px' }}>
              {[
                { id: 'all', label: 'All Events' },
                { id: 'config', label: 'Config' },
                { id: 'update', label: 'Updates' },
                { id: 'backup', label: 'Backups' },
                { id: 'security', label: 'Security' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: filterType === f.id ? '#ffffff' : 'transparent',
                    color: filterType === f.id ? '#10201E' : '#60716B',
                    boxShadow: filterType === f.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportLogs}
              style={secondaryButtonStyle}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLogs.map(log => (
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
          ))}
        </div>
      </div>
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
