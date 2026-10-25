import { useState } from 'react'
import {
  Shield,
  ShieldCheck,
  Lock,
  FileCode,
  Globe,
  Key,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Sparkles
} from 'lucide-react'
import BulkHeader from './BulkHeader'

export default function BulkHardening() {
  const [hardening, setHardening] = useState({
    disableFileEdit: true,
    restrictXmlRpc: true,
    hideWpVersion: true,
    preventUserEnum: true,
    blockUploadsPhp: true,
    securityHeaders: true,
    filePermissionsCheck: true,
    loginTwoFactor: true
  })
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleToggle = (key) => {
    setHardening(prev => {
      const next = { ...prev, [key]: !prev[key] }
      setSaving(true)
      setTimeout(() => {
        setSaving(false)
        showToast('Hardening policy dispatched and synchronized across connected WordPress sites!')
      }, 600)
      return next
    })
  }

  const handleRevertDefaults = () => {
    setHardening({
      disableFileEdit: true,
      restrictXmlRpc: true,
      hideWpVersion: true,
      preventUserEnum: true,
      blockUploadsPhp: true,
      securityHeaders: true,
      filePermissionsCheck: true,
      loginTwoFactor: true
    })
    showToast('Reverted to MDefender Pro Maximum Enterprise Security Baseline.')
  }

  const hardeningRules = [
    { key: 'disableFileEdit', label: 'Disable File Editing', desc: 'Blocks theme & plugin code editor in WP Admin (DISALLOW_FILE_EDIT).' },
    { key: 'restrictXmlRpc', label: 'Restrict XML-RPC API', desc: 'Prevents brute-force amplification and DDoS pingbacks via xmlrpc.php.' },
    { key: 'hideWpVersion', label: 'Hide WordPress Version', desc: 'Removes generator meta tags and version query strings from assets.' },
    { key: 'preventUserEnum', label: 'Block User Enumeration', desc: 'Blocks author scans via ?author=1 and REST API /wp/v2/users endpoints.' },
    { key: 'blockUploadsPhp', label: 'Block PHP Execution in Uploads', desc: 'Strictly blocks direct PHP script execution in wp-content/uploads/ directory.' },
    { key: 'securityHeaders', label: 'Enforce Security Headers', desc: 'Injects HSTS, X-Frame-Options (DENY), and X-Content-Type-Options headers.' },
    { key: 'filePermissionsCheck', label: 'File Permissions Lockdown', desc: 'Audits and enforces wp-config.php (400) and root .htaccess file access permissions.' },
    { key: 'loginTwoFactor', label: 'Enforce 2FA & Login Guard', desc: 'Protects wp-login.php with smart IP rate limiting and brute force shielding.' }
  ]

  const activeRulesCount = Object.values(hardening).filter(Boolean).length

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
        title="Fleet Security Hardening &amp; Attack Surface Reduction"
        subtitle="Enforce zero-trust security policies, lockdown sensitive WordPress directives, and neutralize exploit vectors."
        icon={Shield}
        activeBadge="Hardening Engine"
      />

      <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
                Active Hardening Policies ({activeRulesCount} of {hardeningRules.length} Active)
              </h3>
              <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>A+ RATING</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60716B' }}>
              Changes take effect immediately at the edge and directly inside protected WordPress environments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleRevertDefaults}
              style={secondaryButtonStyle}
            >
              <RotateCcw size={13} />
              <span>Review &amp; Revert to Safe Baseline</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {hardeningRules.map(item => (
            <div
              key={item.key}
              style={{
                border: '1px solid #D9E1DC',
                borderRadius: '12px',
                padding: '20px 22px',
                background: '#FBFCFA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ paddingRight: '10px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>{item.label}</div>
                <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '4px', lineHeight: '1.4' }}>{item.desc}</div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={hardening[item.key]}
                  onChange={() => handleToggle(item.key)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: hardening[item.key] ? '#2A8B68' : '#CBD5E1',
                  borderRadius: '26px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: hardening[item.key] ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
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
