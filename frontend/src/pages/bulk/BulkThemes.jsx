import { useState } from 'react'
import {
  Palette,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Eye,
  Sliders,
  ExternalLink
} from 'lucide-react'
import BulkHeader from './BulkHeader'

export default function BulkThemes() {
  const [themes, setThemes] = useState([
    { id: 'astra-pro', name: 'Astra Pro Theme', currentVersion: '4.6.4', latestVersion: '4.6.5', updateAvailable: true, status: 'active', siteCount: 1, author: 'Brainstorm Force' },
    { id: 'twentytwentyfour', name: 'Twenty Twenty-Four', currentVersion: '1.2.0', latestVersion: '1.2.0', updateAvailable: false, status: 'standby', siteCount: 0, author: 'WordPress.org Team' },
    { id: 'hello-elementor', name: 'Hello Elementor', currentVersion: '3.1.0', latestVersion: '3.1.2', updateAvailable: true, status: 'standby', siteCount: 0, author: 'Elementor Team' },
    { id: 'generatepress', name: 'GeneratePress Premium', currentVersion: '3.4.0', latestVersion: '3.4.0', updateAvailable: false, status: 'standby', siteCount: 0, author: 'Tom Usborne' },
    { id: 'oceanwp', name: 'OceanWP Multipurpose', currentVersion: '3.5.1', latestVersion: '3.5.4', updateAvailable: true, status: 'standby', siteCount: 0, author: 'OceanWP' }
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
      setThemes(prev => prev.map(t => ({ ...t, updateAvailable: false, currentVersion: t.latestVersion })))
      setUpdating(false)
      showToast('All themes successfully updated to latest verified versions across selected fleet!')
    }, 1800)
  }

  const handleActivateTheme = (id) => {
    setThemes(prev => prev.map(t => {
      if (t.id === id) {
        showToast(`${t.name} is now the ACTIVE frontend theme!`)
        return { ...t, status: 'active', siteCount: 1 }
      }
      return { ...t, status: 'standby', siteCount: 0 }
    }))
  }

  const handleSingleUpdate = (id) => {
    setThemes(prev => prev.map(t => {
      if (t.id === id) {
        showToast(`${t.name} updated to v${t.latestVersion}!`)
        return { ...t, currentVersion: t.latestVersion, updateAvailable: false }
      }
      return t
    }))
  }

  const pendingUpdates = themes.filter(t => t.updateAvailable).length

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
        title="Fleet Themes &amp; Bulk Updates"
        subtitle="Manage installed WordPress themes across all sites. Run 1-click bulk updates and switch active themes with automatic pre-update snapshots."
        icon={Palette}
        activeBadge="Theme Fleet Manager"
      />

      <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
              Installed Themes Fleet ({themes.length})
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              {pendingUpdates > 0 ? `${pendingUpdates} theme update(s) available across connected WordPress sites` : 'All themes are up to date with official releases'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleBulkUpdate}
              disabled={updating || pendingUpdates === 0}
              style={{
                ...primaryButtonStyle,
                opacity: pendingUpdates === 0 ? 0.7 : 1,
                cursor: pendingUpdates === 0 ? 'default' : 'pointer'
              }}
            >
              <Sparkles size={14} />
              <span>{updating ? 'Updating Fleet Themes...' : `1-Click Bulk Update Themes (${pendingUpdates})`}</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 14px' }}>Theme Name &amp; Author</th>
                <th style={{ padding: '12px 14px' }}>Installed</th>
                <th style={{ padding: '12px 14px' }}>Latest</th>
                <th style={{ padding: '12px 14px' }}>Activation State</th>
                <th style={{ padding: '12px 14px' }}>Update Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {themes.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F3' }}>
                  <td style={{ padding: '14px', fontWeight: '700', color: '#10201E' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: t.status === 'active' ? '#E8F3EC' : '#F1F5F3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: t.status === 'active' ? '#2A8B68' : '#60716B',
                        flexShrink: 0
                      }}>
                        <Palette size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', color: '#10201E' }}>{t.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#60716B', fontWeight: '500' }}>
                          By {t.author} {t.status === 'active' ? '• Primary Live Theme' : '• Standby'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', fontFamily: 'monospace' }}>v{t.currentVersion}</td>
                  <td style={{ padding: '14px', fontFamily: 'monospace' }}>v{t.latestVersion}</td>
                  <td style={{ padding: '14px' }}>
                    {t.status === 'active' ? (
                      <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>
                        Active Theme
                      </span>
                    ) : (
                      <span style={badgeStyle('#F8FAFC', '#475569', '#E2E8F0')}>
                        Standby
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px' }}>
                    {t.updateAvailable ? (
                      <span style={badgeStyle('#FFFBEB', '#B45309', '#FEF3C7')}>
                        Update to v{t.latestVersion}
                      </span>
                    ) : (
                      <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>
                        Up to date
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                      {t.updateAvailable && (
                        <button
                          onClick={() => handleSingleUpdate(t.id)}
                          style={{ ...secondaryButtonStyle, padding: '5px 12px', fontSize: '12px', color: '#D97706', borderColor: '#FCD3B6' }}
                        >
                          Update
                        </button>
                      )}
                      {t.status !== 'active' ? (
                        <button
                          onClick={() => handleActivateTheme(t.id)}
                          style={{ ...secondaryButtonStyle, padding: '5px 12px', fontSize: '12px', color: '#2A8B68', borderColor: '#CFE2D4' }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Activate</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', padding: '5px 8px' }}>
                          Current Live
                        </span>
                      )}
                      <button
                        onClick={() => showToast(`Previewing theme: ${t.name}`)}
                        style={{ ...secondaryButtonStyle, padding: '5px 9px', fontSize: '12px' }}
                        title="Theme Preview"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
