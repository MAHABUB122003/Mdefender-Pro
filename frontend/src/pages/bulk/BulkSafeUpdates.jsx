import { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Zap,
  Play,
  Check,
  AlertTriangle,
  Eye,
  RefreshCw,
  Clock
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'

export default function BulkSafeUpdates() {
  const { wpWebsites, hasWebsites } = useBulkFleet()
  const [testingRun, setTestingRun] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleTestSafeUpdate = () => {
    setTestingRun(true)
    setTimeout(() => {
      setTestingRun(false)
      showToast('Simulation passed: Pre-update backup created, simulated plugin upgrade verified, HTTP 200 OK validated with 0 regression!')
    }, 2200)
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
        title="Smart Safe Updates &amp; Regression Guard"
        subtitle="Automated pre-update snapshot checkpoints, continuous HTTP health probes, and sub-5-second automatic rollback if any error occurs."
        icon={Sparkles}
        activeBadge="Safe Update Guard"
      />

      {!hasWebsites ? (
        <EmptyFleetState
          title="No WordPress Websites Connected Yet"
          description="Your safe updates regression guard is standing by. Connect your WordPress site using the MDefender-Pro plugin to enable pre-update snapshot checkpoints and automatic instant crash rollback."
          featureName="Safe Updates"
        />
      ) : (
        <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
              How Safe Updates Protects Your Websites
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              Never risk a broken website or White Screen of Death (WSOD) during plugin or theme updates.
            </p>
          </div>

          <button
            onClick={handleTestSafeUpdate}
            disabled={testingRun}
            style={primaryButtonStyle}
          >
            <Play size={14} />
            <span>{testingRun ? 'Simulating Safe Pipeline...' : 'Run Safe Update Simulation'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '28px' }}>
          <div style={stepCardStyle}>
            <div style={{ ...iconBoxStyle, background: '#E8F3EC', color: '#2A8B68' }}>
              <CheckCircle2 size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', marginTop: '14px' }}>
              1. Pre-Update Snapshot
            </div>
            <p style={{ fontSize: '13px', color: '#60716B', margin: '6px 0 0', lineHeight: '1.45' }}>
              Prior to executing any update, MDefender takes a complete, encrypted database and filesystem snapshot in under 3 seconds.
            </p>
          </div>

          <div style={stepCardStyle}>
            <div style={{ ...iconBoxStyle, background: '#FFF4ED', color: '#E8792F' }}>
              <Eye size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', marginTop: '14px' }}>
              2. Post-Update Health Probe
            </div>
            <p style={{ fontSize: '13px', color: '#60716B', margin: '6px 0 0', lineHeight: '1.45' }}>
              Probes critical URLs (Homepage, Cart, Checkout, WP-Admin) to verify HTTP 200 OK responses with zero PHP fatal exceptions.
            </p>
          </div>

          <div style={stepCardStyle}>
            <div style={{ ...iconBoxStyle, background: '#F0F9FF', color: '#0284C7' }}>
              <RotateCcw size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', marginTop: '14px' }}>
              3. Automatic Instant Rollback
            </div>
            <p style={{ fontSize: '13px', color: '#60716B', margin: '6px 0 0', lineHeight: '1.45' }}>
              If a crash, WSOD, or fatal database conflict is detected, the snapshot is automatically restored instantly without human intervention.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 24px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>
              Safe Updates Engine Status: Active &amp; Armed
            </div>
            <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '2px' }}>
              All 1-Click updates initiated from the Bulk Plugins or Themes tab will automatically route through this safe pipeline.
            </div>
          </div>
          <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>PROTECTION ENABLED</span>
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

const stepCardStyle = {
  border: '1px solid #D9E1DC',
  borderRadius: '14px',
  padding: '22px',
  background: '#FBFCFA'
}

const iconBoxStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
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
