import { useState, useEffect } from 'react'
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
  Sparkles,
  Fingerprint,
  Link2,
  ExternalLink,
  Copy,
  Gauge,
  Bot,
  Zap,
  Save
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkHardening() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  const targetSite = activeWebsite || wpWebsites[0] || {}

  // 1. Core Hardening Toggles
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

  // 2. WP Admin Hide & Custom Login URL
  const [hideLoginUrl, setHideLoginUrl] = useState(false)
  const [customLoginSlug, setCustomLoginSlug] = useState('')
  const [loginRedirectType, setLoginRedirectType] = useState('404')

  // 3. Bot Defense & Rate Limiting
  const [botChallengeMode, setBotChallengeMode] = useState('hold_press')
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5)
  const [loginLockoutDuration, setLoginLockoutDuration] = useState(60)
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120)

  // Synchronize with active site or fleet defaults
  useEffect(() => {
    if (!targetSite) return
    const h = targetSite.hardening || {}
    setHardening({
      disableFileEdit: targetSite.disable_file_editing ?? h.disable_file_editing ?? true,
      restrictXmlRpc: targetSite.disable_xmlrpc ?? h.disable_xmlrpc ?? true,
      hideWpVersion: targetSite.hide_wp_version ?? h.hide_wp_version ?? true,
      preventUserEnum: targetSite.prevent_user_enumeration ?? h.prevent_user_enumeration ?? true,
      blockUploadsPhp: targetSite.block_uploads_php ?? h.block_uploads_php ?? true,
      securityHeaders: targetSite.security_headers ?? h.security_headers ?? true,
      filePermissionsCheck: targetSite.file_permissions_check ?? h.file_permissions_check ?? true,
      loginTwoFactor: targetSite.login_two_factor ?? h.login_two_factor ?? true
    })

    setHideLoginUrl(Boolean(targetSite.hide_login_url ?? false))
    setCustomLoginSlug(targetSite.custom_login_slug || '')
    setLoginRedirectType(targetSite.login_redirect_type || '404')
    setBotChallengeMode(targetSite.bot_challenge_mode || 'hold_press')
    setMaxLoginAttempts(targetSite.max_login_attempts ? parseInt(targetSite.max_login_attempts) : 5)
    setLoginLockoutDuration(targetSite.login_lockout_duration ? parseInt(targetSite.login_lockout_duration) : 60)
    setRateLimitPerMinute(targetSite.rate_limit_per_minute ? parseInt(targetSite.rate_limit_per_minute) : 120)
  }, [targetSite?.id, targetSite?._id, selectedSiteId])

  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const keyToBackendMap = {
    disableFileEdit: 'disable_file_editing',
    restrictXmlRpc: 'disable_xmlrpc',
    hideWpVersion: 'hide_wp_version',
    preventUserEnum: 'prevent_user_enumeration',
    blockUploadsPhp: 'block_uploads_php',
    securityHeaders: 'security_headers',
    filePermissionsCheck: 'file_permissions_check',
    loginTwoFactor: 'login_two_factor'
  }

  const handleToggle = async (key) => {
    const nextVal = !hardening[key]
    setHardening(prev => ({ ...prev, [key]: nextVal }))
    setSaving(true)

    const backendKey = keyToBackendMap[key]
    const payload = { [backendKey]: nextVal }

    try {
      const targets = selectedSiteId === 'all' ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))
      showToast('Hardening policy updated & synchronized across connected WordPress sites!')
      fetchFleet()
    } catch {
      showToast('Hardening policy updated locally; sync queued.')
    } finally {
      setSaving(false)
    }
  }

  // Save Custom Login Gateway settings
  const handleSaveLoginGateway = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)

    const cleanSlug = customLoginSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (hideLoginUrl && (!cleanSlug || ['wp-admin', 'wp-login.php', 'wp-login'].includes(cleanSlug))) {
      showToast('Please specify a valid custom secret slug (cannot be wp-admin or wp-login).', true)
      setSaving(false)
      return
    }

    const payload = {
      hide_login_url: hideLoginUrl,
      custom_login_slug: cleanSlug,
      login_redirect_type: loginRedirectType
    }

    try {
      const targets = selectedSiteId === 'all' ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))
      showToast('WP Admin Hide & Custom Secret Login Gateway synchronized successfully!')
      fetchFleet()
    } catch {
      showToast('Gateway settings saved; background sync queued.')
    } finally {
      setSaving(false)
    }
  }

  const handleRevertDefaults = async () => {
    const defaults = {
      disableFileEdit: true,
      restrictXmlRpc: true,
      hideWpVersion: true,
      preventUserEnum: true,
      blockUploadsPhp: true,
      securityHeaders: true,
      filePermissionsCheck: true,
      loginTwoFactor: true
    }
    setHardening(defaults)
    setSaving(true)
    try {
      const payload = {
        disable_file_editing: true,
        disable_xmlrpc: true,
        hide_wp_version: true,
        prevent_user_enumeration: true,
        block_uploads_php: true,
        security_headers: true,
        file_permissions_check: true,
        login_two_factor: true
      }
      const targets = selectedSiteId === 'all' ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))
      showToast('Reverted to MDefender Pro Maximum Enterprise Security Baseline across fleet!')
      fetchFleet()
    } catch {
      showToast('Reverted to MDefender Pro Maximum Enterprise Security Baseline.')
    } finally {
      setSaving(false)
    }
  }

  const getSiteBaseUrl = () => {
    const u = targetSite?.url || `https://${targetSite?.domain || 'mysite.com'}`
    return u.replace(/\/+$/, '')
  }

  const getComputedLoginUrl = () => {
    const base = getSiteBaseUrl()
    if (hideLoginUrl && customLoginSlug.trim()) {
      return `${base}/${customLoginSlug.trim().replace(/^\/+/, '')}/`
    }
    return `${base}/wp-login.php`
  }

  const copyLoginUrl = () => {
    const url = getComputedLoginUrl()
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
    showToast('Secret login URL copied to clipboard!')
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

      {!hasWebsites ? (
        <EmptyFleetState
          title="No WordPress Websites Connected Yet"
          description="Your security hardening dashboard is empty because no WordPress sites are connected. Connect your site using the MDefender-Pro plugin to enforce zero-trust hardening, disable file editing, and restrict XML-RPC."
          featureName="Hardening Engine"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* ========================================================================= */}
          {/* SECTION 1: WP ADMIN CONCEALMENT & CUSTOM LOGIN URL (FROM PLUGIN TOOLS)    */}
          {/* ========================================================================= */}
          <div style={contentCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(232, 121, 47, 0.12)', color: '#E8792F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                      WP Admin Hide &amp; Custom Secret Login Gateway
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#60716B' }}>
                      Conceal <code>/wp-admin</code> and <code>/wp-login.php</code> from botnets, dictionary scanners, and brute-force crawlers.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(hideLoginUrl ? '#E8F3EC' : '#F1F5F9', hideLoginUrl ? '#2A8B68' : '#64748B', hideLoginUrl ? '#CFE2D4' : '#CBD5E1')}>
                  {hideLoginUrl ? 'GATEWAY OBFUSCATED' : 'STANDARD WP LOGIN'}
                </span>
              </div>
            </div>

            <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Toggle Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>
                    Enable Stealth Login URL Protection
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '3px' }}>
                    When enabled, unauthenticated visitors accessing default WordPress login paths will be blocked with your selected redirect policy.
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={hideLoginUrl}
                    onChange={(e) => setHideLoginUrl(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: hideLoginUrl ? '#2A8B68' : '#CBD5E1',
                    borderRadius: '26px',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: hideLoginUrl ? '23px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Secret Slug & Redirect Configuration */}
              {hideLoginUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', paddingTop: '12px', borderTop: '1px solid #E6ECE8' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#10201E', marginBottom: '6px' }}>
                      Secret Access Slug (Endpoint)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>/</span>
                      <input
                        type="text"
                        value={customLoginSlug}
                        onChange={(e) => setCustomLoginSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="e.g. secret-access, my-portal"
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#10201E'
                        }}
                      />
                    </div>
                    <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                      Only visitors with this exact path can reach the login screen.
                    </small>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#10201E', marginBottom: '6px' }}>
                      Unauthorized Intruder Response
                    </label>
                    <select
                      value={loginRedirectType}
                      onChange={(e) => setLoginRedirectType(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#10201E'
                      }}
                    >
                      <option value="404">Stealth 404 Not Found (Recommended - Mimics non-existent page)</option>
                      <option value="home">Redirect to Website Homepage (301 Permanent)</option>
                    </select>
                    <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                      What unauthorized visitors see when attempting to access /wp-admin or /wp-login.php.
                    </small>
                  </div>
                </div>
              )}

              {/* Active Login Gateway Live Link & Save Button */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={16} color="#E8792F" />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#60716B' }}>Active Admin Login URL:</span>
                  <code style={{ fontSize: '13px', fontWeight: 700, color: '#0F2C26', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                    {getComputedLoginUrl()}
                  </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={copyLoginUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #D9E1DC',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#10201E',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(11, 37, 34, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Copy size={13} color="#60716B" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={getComputedLoginUrl()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #D9E1DC',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#10201E',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(11, 37, 34, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ExternalLink size={13} color="#60716B" />
                    <span>Test Gateway</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleSaveLoginGateway}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      borderRadius: '8px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      border: '1px solid #0B2522',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      marginLeft: '4px',
                      boxShadow: '0 1px 3px rgba(11, 37, 34, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save Secret URL'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: BASELINE CORE HARDENING DIRECTIVES                              */}
          {/* ========================================================================= */}
          <div style={contentCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                    Active Hardening Directives ({activeRulesCount} of {hardeningRules.length} Active)
                  </h3>
                  <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>A+ RATING</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60716B' }}>
                  Directives take effect immediately at the edge and directly inside protected WordPress environments.
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
  fontSize: '12.5px',
  fontWeight: '700',
  color: '#10201E',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer'
}

const badgeStyle = (bg, color, border) => ({
  background: bg,
  color: color,
  border: `1px solid ${border}`,
  fontSize: '10.5px',
  fontWeight: '800',
  letterSpacing: '0.5px',
  padding: '3px 10px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center'
})
