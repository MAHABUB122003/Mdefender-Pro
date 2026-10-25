import { useState } from 'react'
import {
  Sliders,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  XCircle,
  ShieldCheck
} from 'lucide-react'
import BulkHeader from './BulkHeader'

export default function BulkPlugins() {
  const [plugins, setPlugins] = useState([
    { id: 'mdefender-pro', name: 'MDefender Pro Enterprise WAF', currentVersion: '4.2.2', latestVersion: '4.2.2', updateAvailable: false, status: 'active', siteCount: 3 },
    { id: 'woocommerce', name: 'WooCommerce Core', currentVersion: '8.4.0', latestVersion: '8.5.2', updateAvailable: true, status: 'active', siteCount: 2 },
    { id: 'elementor', name: 'Elementor Website Builder', currentVersion: '3.18.3', latestVersion: '3.19.1', updateAvailable: true, status: 'active', siteCount: 3 },
    { id: 'contact-form-7', name: 'Contact Form 7', currentVersion: '5.8.5', latestVersion: '5.9.0', updateAvailable: true, status: 'active', siteCount: 1 },
    { id: 'wp-super-cache', name: 'WP Super Cache', currentVersion: '1.9.4', latestVersion: '1.9.4', updateAvailable: false, status: 'active', siteCount: 2 },
    { id: 'yoast-seo', name: 'Yoast SEO', currentVersion: '21.7', latestVersion: '21.8', updateAvailable: true, status: 'inactive', siteCount: 1 }
  ])
  const [updating, setUpdating] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text) => {
    setToastMsg(text)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleBulkUpdate = () => {
    setUpdating(true)
    setTimeout(() => {
      setPlugins(prev => prev.map(p => ({ ...p, updateAvailable: false, currentVersion: p.latestVersion })))
      setUpdating(false)
      showToast('All plugins successfully updated to latest verified releases across selected fleet!')
    }, 1800)
  }

  const handleToggleStatus = (id) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'active' ? 'inactive' : 'active'
        showToast(`${p.name} set to ${nextStatus.toUpperCase()}`)
        return { ...p, status: nextStatus }
      }
      return p
    }))
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0B2522',
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
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      <BulkHeader
        title="Fleet Plugins &amp; Bulk Updates"
        subtitle="Manage installed plugins across all WordPress sites. Run 1-click bulk updates and toggle activation state with pre-flight health validation."
        icon={Sliders}
        activeBadge="Plugin Orchestrator"
      />

      <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
              Installed Plugins Fleet
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              4 updates available across 3 connected WordPress origins
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleBulkUpdate}
              disabled={updating}
              style={primaryButtonStyle}
            >
              <Sparkles size={14} />
              <span>{updating ? 'Updating Fleet Plugins...' : '1-Click Bulk Update Plugins'}</span>
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ padding: '12px 14px' }}>Plugin Name</th>
              <th style={{ padding: '12px 14px' }}>Installed</th>
              <th style={{ padding: '12px 14px' }}>Latest</th>
              <th style={{ padding: '12px 14px' }}>State</th>
              <th style={{ padding: '12px 14px' }}>Update Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plugins.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F3' }}>
                <td style={{ padding: '14px', fontWeight: '700', color: '#10201E' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F1F5F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B2522' }}>
                      <Sliders size={16} />
                    </div>
                    <div>
                      <div>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#60716B', fontWeight: '500' }}>Active on {p.siteCount} WordPress site(s)</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px', fontFamily: 'monospace' }}>v{p.currentVersion}</td>
                <td style={{ padding: '14px', fontFamily: 'monospace' }}>v{p.latestVersion}</td>
                <td style={{ padding: '14px' }}>
                  <button
                    onClick={() => handleToggleStatus(p.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <span style={p.status === 'active' ? badgeStyle('#F0FDF4', '#15803D', '#DCFCE7') : badgeStyle('#F8FAFC', '#475569', '#E2E8F0')}>
                      {p.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </td>
                <td style={{ padding: '14px' }}>
                  {p.updateAvailable ? (
                    <span style={badgeStyle('#FFFBEB', '#B45309', '#FEF3C7')}>
                      Update to v{p.latestVersion}
                    </span>
                  ) : (
                    <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>
                      Up to date
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    {p.updateAvailable && (
                      <button
                        onClick={() => {
                          setPlugins(prev => prev.map(item => item.id === p.id ? { ...item, currentVersion: item.latestVersion, updateAvailable: false } : item))
                          showToast(`Updated ${p.name} to v${p.latestVersion}!`)
                        }}
                        style={{ ...primaryButtonStyle, padding: '5px 12px', fontSize: '11.5px' }}
                      >
                        Update
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(p.id)}
                      style={{ ...secondaryButtonStyle, padding: '5px 10px', fontSize: '11.5px' }}
                    >
                      {p.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const contentCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '26px 28px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
}

const badgeStyle = (bg, color, border) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 8px',
  borderRadius: '5px',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.02em',
  background: bg,
  color: color,
  border: `1px solid ${border}`
})

const primaryButtonStyle = {
  padding: '9px 18px',
  borderRadius: '8px',
  background: '#0B2522',
  color: '#ffffff',
  border: 'none',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
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
