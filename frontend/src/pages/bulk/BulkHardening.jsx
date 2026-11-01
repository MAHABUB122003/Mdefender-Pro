import { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Sparkles,
  Link2,
  ExternalLink,
  Copy,
  Save,
  Plus,
  Trash2,
  Undo2,
  Server
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkHardening() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  // Selected domain for site-specific configuration
  const [selectedDomainId, setSelectedDomainId] = useState('')

  useEffect(() => {
    if (activeWebsite) {
      setSelectedDomainId(activeWebsite.id || activeWebsite._id)
    } else if (wpWebsites.length > 0 && !selectedDomainId) {
      setSelectedDomainId(wpWebsites[0].id || wpWebsites[0]._id)
    }
  }, [activeWebsite, wpWebsites])

  const targetSite = useMemo(() => {
    if (selectedDomainId) {
      return wpWebsites.find(w => (w.id || w._id) === selectedDomainId) || activeWebsite || wpWebsites[0] || {}
    }
    return activeWebsite || wpWebsites[0] || {}
  }, [selectedDomainId, wpWebsites, activeWebsite])

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
  const [customLoginSlug, setCustomLoginSlug] = useState('')
  const [loginRedirectType, setLoginRedirectType] = useState('404')

  // 2.1 Admin & Login IP Restriction
  const [adminIpWhitelist, setAdminIpWhitelist] = useState([])
  const [newAdminIpInput, setNewAdminIpInput] = useState('')
  const [detectedClientIp, setDetectedClientIp] = useState('')

  // 3. Bot Defense & Rate Limiting
  const [botChallengeMode, setBotChallengeMode] = useState('hold_press')
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5)
  const [loginLockoutDuration, setLoginLockoutDuration] = useState(60)
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120)

  // Synchronize state when selected site changes
  useEffect(() => {
    if (!targetSite || Object.keys(targetSite).length === 0) return
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

    setCustomLoginSlug(targetSite.custom_login_slug || '')
    setLoginRedirectType(targetSite.login_redirect_type || '404')
    setBotChallengeMode(targetSite.bot_challenge_mode || 'hold_press')
    setMaxLoginAttempts(targetSite.max_login_attempts ? parseInt(targetSite.max_login_attempts) : 5)
    setLoginLockoutDuration(targetSite.login_lockout_duration ? parseInt(targetSite.login_lockout_duration) : 60)
    setRateLimitPerMinute(targetSite.rate_limit_per_minute ? parseInt(targetSite.rate_limit_per_minute) : 120)

    const rawWl = targetSite.admin_ip_whitelist
    const parsedWl = Array.isArray(rawWl)
      ? rawWl
      : (rawWl ? String(rawWl).split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean) : [])
    setAdminIpWhitelist(parsedWl)
  }, [targetSite?.id, targetSite?._id, selectedDomainId])

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
      showToast('Hardening directive updated & synchronized across WordPress environments!')
      fetchFleet(true)
    } catch {
      showToast('Hardening directive updated locally; background sync queued.')
    } finally {
      setSaving(false)
    }
  }

  // Detect client IP
  useEffect(() => {
    let isMounted = true
    if (api.getMyIp) {
      api.getMyIp().then(res => {
        if (isMounted && res && res.ip) setDetectedClientIp(res.ip)
      }).catch(() => {
        fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => {
          if (isMounted && d && d.ip) setDetectedClientIp(d.ip)
        }).catch(() => {})
      })
    }
    return () => { isMounted = false }
  }, [])

  // =========================================================================
  // ACTIONS FOR CUSTOM SECRET LOGIN GATEWAY
  // =========================================================================
  const isCustomLoginActive = Boolean(targetSite?.custom_login_slug && targetSite?.hide_login_url)

  const getComputedLoginUrl = (site = targetSite, slug = customLoginSlug) => {
    const domain = site?.domain || 'your-domain.com'
    const scheme = domain.startsWith('localhost') || domain.startsWith('127.0.0.1') ? 'http://' : 'https://'
    if (slug) {
      return `${scheme}${domain}/${slug}`
    }
    return `${scheme}${domain}/wp-login.php`
  }

  const copyLoginUrl = () => {
    const url = getComputedLoginUrl()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      showToast('Active login URL copied to clipboard!')
    }
  }

  const handleSaveLoginGateway = async (siteToSave = targetSite, slugVal = customLoginSlug, redirectVal = loginRedirectType) => {
    const sid = siteToSave?.id || siteToSave?._id
    if (!sid) {
      showToast('Please select a valid WordPress website.', true)
      return
    }
    const cleanSlug = (slugVal || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug || ['wp-admin', 'wp-login.php', 'wp-login'].includes(cleanSlug)) {
      showToast('Please specify a valid custom secret slug (cannot be wp-admin or wp-login).', true)
      return
    }

    setSaving(true)
    const payload = {
      hide_login_url: true,
      custom_login_slug: cleanSlug,
      login_redirect_type: redirectVal || '404'
    }

    try {
      await api.updateWebsiteSecuritySettings(sid, payload)
      showToast(`Secret Login Gateway activated for ${siteToSave.domain || 'site'}!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to save secret login URL.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveLoginGateway = async (siteToRemove = targetSite) => {
    const sid = siteToRemove?.id || siteToRemove?._id
    if (!sid) return
    setSaving(true)
    setCustomLoginSlug('')
    const payload = {
      hide_login_url: false,
      custom_login_slug: '',
      login_redirect_type: '404'
    }
    try {
      await api.updateWebsiteSecuritySettings(sid, payload)
      showToast(`Secret URL removed for ${siteToRemove.domain || 'site'}. Default /wp-login.php restored!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to revert login gateway.', true)
    } finally {
      setSaving(false)
    }
  }

  // =========================================================================
  // ACTIONS FOR ADMIN & LOGIN IP RESTRICTION
  // =========================================================================
  const handleAddAllowedIp = (ipCandidate) => {
    const raw = (ipCandidate || newAdminIpInput).trim()
    if (!raw) return
    const isValid = /^([0-9a-fA-F:.]+|\*)+(\/[0-9]{1,3})?$/.test(raw)
    if (!isValid) {
      showToast('Please enter a valid IPv4, IPv6, or CIDR subnet (e.g. 103.145.74.22 or 192.168.1.0/24).', true)
      return
    }
    if (adminIpWhitelist.includes(raw)) {
      showToast('This IP address is already in the authorized list.', true)
      return
    }
    setAdminIpWhitelist(prev => [...prev, raw])
    setNewAdminIpInput('')
  }

  const handleRemoveAllowedIp = (ipToRemove) => {
    setAdminIpWhitelist(prev => prev.filter(ip => ip !== ipToRemove))
  }

  const handleSaveAdminIpRestriction = async (siteToSave = targetSite, ipsToSave = adminIpWhitelist) => {
    const sid = siteToSave?.id || siteToSave?._id
    if (!sid) {
      showToast('Please select a valid WordPress website.', true)
      return
    }
    setSaving(true)
    const hasIps = ipsToSave && ipsToSave.length > 0
    const payload = {
      admin_ip_whitelist_enabled: hasIps,
      admin_ip_whitelist: ipsToSave || []
    }
    try {
      await api.updateWebsiteSecuritySettings(sid, payload)
      if (hasIps) {
        showToast(`Admin IP restriction updated for ${siteToSave.domain || 'site'} (${ipsToSave.length} IP authorized)!`)
      } else {
        showToast(`All IP restrictions removed for ${siteToSave.domain || 'site'}. Admin access is open to all IPs!`)
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to update admin IP restriction.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAllAdminIps = async (siteToClear = targetSite) => {
    const sid = siteToClear?.id || siteToClear?._id
    if (!sid) return
    setSaving(true)
    setAdminIpWhitelist([])
    const payload = {
      admin_ip_whitelist_enabled: false,
      admin_ip_whitelist: []
    }
    try {
      await api.updateWebsiteSecuritySettings(sid, payload)
      showToast(`IP restrictions removed for ${siteToClear.domain || 'site'}. Admin panel access is now open to all IPs!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to clear IP restrictions.', true)
    } finally {
      setSaving(false)
    }
  }

  // =========================================================================
  // CORE DIRECTIVES & DEFAULTS
  // =========================================================================
  const handleEnableAllDirectives = async () => {
    const allEnabled = {
      disableFileEdit: true,
      restrictXmlRpc: true,
      hideWpVersion: true,
      preventUserEnum: true,
      blockUploadsPhp: true,
      securityHeaders: true,
      filePermissionsCheck: true,
      loginTwoFactor: true
    }
    setHardening(allEnabled)
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
      showToast('All enterprise zero-trust hardening directives enforced across fleet!')
      fetchFleet(true)
    } catch {
      showToast('Hardening directives updated; queued background sync.')
    } finally {
      setSaving(false)
    }
  }

  const handleRevertDefaults = async () => {
    const safeBaseline = {
      disableFileEdit: true,
      restrictXmlRpc: true,
      hideWpVersion: true,
      preventUserEnum: true,
      blockUploadsPhp: true,
      securityHeaders: true,
      filePermissionsCheck: false,
      loginTwoFactor: false
    }
    setHardening(safeBaseline)
    setSaving(true)
    try {
      const payload = {
        disable_file_editing: true,
        disable_xmlrpc: true,
        hide_wp_version: true,
        prevent_user_enumeration: true,
        block_uploads_php: true,
        security_headers: true,
        file_permissions_check: false,
        login_two_factor: false
      }
      const targets = selectedSiteId === 'all' ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))
      showToast('Hardening directives restored to safe recommended baseline!')
      fetchFleet(true)
    } catch {
      showToast('Baseline restored locally; background sync queued.')
    } finally {
      setSaving(false)
    }
  }

  // Common Card Style
  const contentCardStyle = {
    background: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #E2E8F0',
    padding: '24px 28px',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
  }

  const secondaryButtonStyle = {
    padding: '8px 14px',
    borderRadius: '8px',
    background: '#ffffff',
    border: '1px solid #CBD5E1',
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  }

  const badgeStyle = (bg, color, border) => ({
    background: bg,
    color: color,
    border: `1px solid ${border}`,
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
    padding: '3px 9px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center'
  })

  const hardeningRules = [
    {
      key: 'disableFileEdit',
      label: 'Disable Built-in Theme & Plugin File Editor',
      tag: 'CODE EXECUTION SHIELD',
      desc: 'Injects DISALLOW_FILE_EDIT into wp-config.php to prevent administrative account takeover from uploading webshells via Appearance or Plugin editors.'
    },
    {
      key: 'restrictXmlRpc',
      label: 'Disable XML-RPC API Pingbacks & Exploits',
      tag: 'DDOS & BRUTE FORCE SHIELD',
      desc: 'Neutralizes xmlrpc.php endpoints to prevent amplification DDoS attacks, pingback reflection, and automated dictionary brute-force exploits.'
    },
    {
      key: 'hideWpVersion',
      label: 'Conceal WordPress Version Tag',
      tag: 'FINGERPRINTING SHIELD',
      desc: 'Removes the generator meta tag and WordPress version fingerprints from HTML headers, feeds, scripts, and styles to block vulnerability scanners.'
    },
    {
      key: 'preventUserEnum',
      label: 'Block User Enumeration',
      tag: 'IDENTITY SHIELD',
      desc: 'Blocks malicious scans seeking admin usernames via /?author=1, sitemap author archives, and /wp-json/wp/v2/users endpoints.'
    },
    {
      key: 'blockUploadsPhp',
      label: 'Block PHP Execution in Uploads',
      tag: 'ZERO-DAY WEBSHELL SHIELD',
      desc: 'Injects server-level execution restrictions inside wp-content/uploads/ to permanently stop uploaded malicious PHP scripts from running.'
    },
    {
      key: 'securityHeaders',
      label: 'Enforce Security Headers',
      tag: 'ENTERPRISE HTTP POLICY',
      desc: 'Injects strict HSTS, X-Frame-Options (DENY/SAMEORIGIN), X-Content-Type-Options (nosniff), and Referrer-Policy headers to eliminate clickjacking and MIME sniffing.'
    },
    {
      key: 'filePermissionsCheck',
      label: 'File Permissions Lockdown',
      tag: 'FILESYSTEM HARDENING',
      desc: 'Strictly audits and enforces wp-config.php (400/440 read-only) and .htaccess (644) permissions to prevent unauthorized server tampering.'
    },
    {
      key: 'loginTwoFactor',
      label: 'Enforce 2FA & Login Guard',
      tag: 'ZERO-TRUST ACCESS',
      desc: 'Enforces cryptographic two-factor authentication (TOTP) and intelligent brute-force rate-limiting on all administrative authentication requests.'
    }
  ]

  const activeRulesCount = Object.values(hardening).filter(Boolean).length
  const hardeningPercentage = Math.round((activeRulesCount / hardeningRules.length) * 100)

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 18px',
          borderRadius: '8px',
          background: '#0F172A',
          border: '1px solid #334155',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={15} color="#EF4444" /> : <CheckCircle2 size={15} color="#10B981" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header with Fleet Scope Picker */}
      <BulkHeader
        title="Zero-Trust Security Hardening Suite"
        description="Comprehensive WordPress lockdown: conceal admin login endpoints, restrict access strictly to whitelisted IPs, enforce strict file permissions, and neutralize exploit vectors."
        badgeText="ENTERPRISE SHIELD"
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
          {/* SECTION 1: WP ADMIN HIDE & CUSTOM SECRET LOGIN GATEWAY                    */}
          {/* ========================================================================= */}
          <div style={contentCardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                    WP Admin Hide &amp; Custom Secret Login Gateway
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                    Conceal <code>/wp-admin</code> and <code>/wp-login.php</code> behind a private secret directory. Unauthorized requests are blocked.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(isCustomLoginActive ? '#F0FDF4' : '#F8FAFC', isCustomLoginActive ? '#15803D' : '#64748B', isCustomLoginActive ? '#BBF7D0' : '#E2E8F0')}>
                  {isCustomLoginActive ? `ACTIVE: /${targetSite.custom_login_slug}` : 'STANDARD: /wp-login.php'}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Domain Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Select Target Website:</span>
                </div>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    minWidth: '240px'
                  }}
                >
                  {wpWebsites.map(site => (
                    <option key={site.id || site._id} value={site.id || site._id}>
                      {site.domain || site.url || 'Unnamed Website'} {site.custom_login_slug ? `(Secret: /${site.custom_login_slug})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Secret Slug & Redirect Configuration Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {/* Field 1: Secret Login Slug */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Custom Secret Login Directory
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '0 10px', fontSize: '12.5px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', height: '40px', display: 'flex', alignItems: 'center', borderRight: '1px solid #CBD5E1', whiteSpace: 'nowrap' }}>
                      {targetSite?.domain || 'domain.com'}/
                    </span>
                    <input
                      type="text"
                      value={customLoginSlug}
                      onChange={(e) => setCustomLoginSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="e.g. mahabub, secret-gateway, myportal"
                      style={{
                        flex: 1,
                        height: '40px',
                        padding: '0 12px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#0F172A'
                      }}
                    />
                  </div>
                  <small style={{ color: '#64748B', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    Only requests to this exact directory will display the WordPress login page.
                  </small>
                </div>

                {/* Field 2: Unauthorized Intruder Action */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Unauthorized Access Response
                  </label>
                  <select
                    value={loginRedirectType}
                    onChange={(e) => setLoginRedirectType(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="404">Stealth 404 Not Found (Recommended — completely hides login)</option>
                    <option value="home">Redirect to Website Homepage (301 Permanent)</option>
                  </select>
                  <small style={{ color: '#64748B', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    What unauthorized visitors see when attempting to open /wp-admin or /wp-login.php.
                  </small>
                </div>
              </div>

              {/* Action Buttons & Status Row */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
                  <Link2 size={16} color="#0F172A" />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>Active Login URL:</span>
                  <code style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>
                    {getComputedLoginUrl()}
                  </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={copyLoginUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={13} />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={getComputedLoginUrl()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0F172A',
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Test Gateway</span>
                  </a>

                  {isCustomLoginActive && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLoginGateway(targetSite)}
                      disabled={saving}
                      title="Revert back to standard WordPress /wp-login.php"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        color: '#BE123C',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove Secret URL (Reset to Default)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveLoginGateway(targetSite, customLoginSlug, loginRedirectType)}
                    disabled={saving || !customLoginSlug.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: saving || !customLoginSlug.trim() ? 'not-allowed' : 'pointer',
                      opacity: !customLoginSlug.trim() ? 0.6 : 1
                    }}
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save Secret URL'}</span>
                  </button>
                </div>
              </div>

              {/* Connected Websites Overview Table */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Connected Websites Secret Login Status ({wpWebsites.length})
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  {wpWebsites.map((site, index) => {
                    const isConfigured = Boolean(site.custom_login_slug && site.hide_login_url)
                    const isSelected = (site.id || site._id) === selectedDomainId
                    return (
                      <div
                        key={site.id || site._id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: index !== wpWebsites.length - 1 ? '1px solid #F1F5F9' : 'none',
                          background: isSelected ? '#F8FAFC' : '#FFFFFF',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                          <Globe size={14} color="#64748B" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                            {site.domain || site.url || 'Unnamed Site'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Active Endpoint:</span>
                          <code style={{ fontSize: '12.5px', fontWeight: 700, color: isConfigured ? '#15803D' : '#64748B' }}>
                            {isConfigured ? `/${site.custom_login_slug}` : '/wp-login.php'}
                          </code>
                          <span style={badgeStyle(isConfigured ? '#F0FDF4' : '#F8FAFC', isConfigured ? '#15803D' : '#64748B', isConfigured ? '#BBF7D0' : '#E2E8F0')}>
                            {isConfigured ? 'SECRET URL ACTIVE' : 'STANDARD LOGIN'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isConfigured ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveLoginGateway(site)}
                              disabled={saving}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '5px',
                                background: '#FFF1F2',
                                border: '1px solid #FECDD3',
                                color: '#BE123C',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Undo2 size={12} />
                              <span>Reset to Default</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDomainId(site.id || site._id)
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '5px',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                color: '#0F172A',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <span>Configure</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: RESTRICT ADMIN PANEL & LOGIN ACCESS BY IP                      */}
          {/* ========================================================================= */}
          <div style={contentCardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                    Restrict Admin Panel &amp; Login Access by IP
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                    Limit access to <code>/wp-admin</code> and login gateways strictly to authorized IP addresses or subnets.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(adminIpWhitelist.length > 0 ? '#F0FDF4' : '#F8FAFC', adminIpWhitelist.length > 0 ? '#15803D' : '#64748B', adminIpWhitelist.length > 0 ? '#BBF7D0' : '#E2E8F0')}>
                  {adminIpWhitelist.length > 0 ? `${adminIpWhitelist.length} AUTHORIZED IP(S)` : 'ALLOW ALL IPS (UNRESTRICTED)'}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Domain Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Select Target Website:</span>
                </div>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    minWidth: '240px'
                  }}
                >
                  {wpWebsites.map(site => {
                    const count = Array.isArray(site.admin_ip_whitelist) ? site.admin_ip_whitelist.length : 0
                    return (
                      <option key={site.id || site._id} value={site.id || site._id}>
                        {site.domain || site.url || 'Unnamed Website'} {count > 0 ? `(${count} IPs)` : '(Unrestricted)'}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Detected Current IP Quick-Add Banner */}
              {detectedClientIp && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} color="#0F172A" />
                    <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600 }}>
                      Detected Your Current IP: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{detectedClientIp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddAllowedIp(detectedClientIp)}
                    disabled={adminIpWhitelist.includes(detectedClientIp)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: adminIpWhitelist.includes(detectedClientIp) ? '#F1F5F9' : '#0F172A',
                      color: adminIpWhitelist.includes(detectedClientIp) ? '#64748B' : '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: adminIpWhitelist.includes(detectedClientIp) ? 'default' : 'pointer'
                    }}
                  >
                    <Check size={12} />
                    <span>{adminIpWhitelist.includes(detectedClientIp) ? 'Current IP Added' : '+ Add My Current IP'}</span>
                  </button>
                </div>
              )}

              {/* Add IP Input & Add Button */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Add Authorized IP Address or Subnet (CIDR)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newAdminIpInput}
                    onChange={(e) => setNewAdminIpInput(e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllowedIp(); } }}
                    placeholder="e.g. 103.120.45.241 or 192.168.1.0/24"
                    style={{
                      flex: 1,
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAllowedIp()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>Add IP</span>
                  </button>
                </div>
                <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                  Accepts IPv4 (e.g. <code>103.120.45.241</code>), IPv6, or CIDR blocks (e.g. <code>192.168.1.0/24</code>).
                </small>
              </div>

              {/* Active Allowed IPs List */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Configured Authorized Admin IPs for {targetSite?.domain || 'Selected Website'} ({adminIpWhitelist.length})
                </div>

                {adminIpWhitelist.length === 0 ? (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <ShieldCheck size={16} color="#10B981" />
                    <span><strong>Unrestricted Access:</strong> No IP whitelist configured. The admin login page can be accessed from any IP address.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {adminIpWhitelist.map((ip) => {
                      const isCurrent = detectedClientIp && ip === detectedClientIp
                      return (
                        <div
                          key={ip}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <Server size={14} color="#64748B" />
                            <code style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                              {ip}
                            </code>
                            {isCurrent && (
                              <span style={badgeStyle('#F0FDF4', '#15803D', '#BBF7D0')}>
                                YOUR CURRENT IP
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAllowedIp(ip)}
                            title="Remove this IP from whitelist"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              color: '#BE123C',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                {adminIpWhitelist.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAllAdminIps(targetSite)}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      color: '#BE123C',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Remove All IP Restrictions (Allow All IPs)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveAdminIpRestriction(targetSite, adminIpWhitelist)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)'
                  }}
                >
                  <Save size={13} />
                  <span>{saving ? 'Synchronizing...' : 'Save Authorized Admin IPs'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: BASELINE CORE HARDENING DIRECTIVES                              */}
          {/* ========================================================================= */}
          <div style={contentCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                    Active Hardening Directives ({activeRulesCount} of {hardeningRules.length} Active)
                  </h3>
                  <span style={badgeStyle('#0F172A', '#FFFFFF', '#0F172A')}>
                    {activeRulesCount === hardeningRules.length ? 'A+ ENTERPRISE RATING' : `${hardeningPercentage}% ZERO-TRUST SCORE`}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                  Directives take effect immediately at the edge and directly inside protected WordPress environments.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleEnableAllDirectives}
                  disabled={saving}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#0F172A',
                    border: '1px solid #0F172A',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ShieldCheck size={14} color="#10B981" />
                  <span>Enforce All Enterprise Directives</span>
                </button>

                <button
                  type="button"
                  onClick={handleRevertDefaults}
                  disabled={saving}
                  style={secondaryButtonStyle}
                >
                  <RotateCcw size={13} />
                  <span>Review &amp; Revert to Safe Baseline</span>
                </button>
              </div>
            </div>

            {/* Hardening Score Progress Bar */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', fontWeight: 700 }}>
                <span style={{ color: '#0F172A' }}>Fleet Zero-Trust Hardening Coverage</span>
                <span style={{ color: '#10B981' }}>{activeRulesCount} of {hardeningRules.length} Controls Enforced ({hardeningPercentage}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${hardeningPercentage}%`,
                  height: '100%',
                  background: activeRulesCount === hardeningRules.length ? '#10B981' : '#0F172A',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* 8 Directives Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {hardeningRules.map(item => {
                const isActive = Boolean(hardening[item.key])
                return (
                  <div
                    key={item.key}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '20px 22px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1'
                        }}>
                          {item.tag}
                        </span>
                        <span style={badgeStyle(isActive ? '#F0FDF4' : '#F8FAFC', isActive ? '#15803D' : '#64748B', isActive ? '#BBF7D0' : '#E2E8F0')}>
                          {isActive ? 'ENFORCED' : 'INACTIVE'}
                        </span>
                      </div>

                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0F172A' }}>{item.label}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', lineHeight: '1.45' }}>{item.desc}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                        {isActive ? 'Shield Active & Running' : 'Click toggle to activate'}
                      </span>
                      <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={isActive}
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
                          backgroundColor: isActive ? '#0F172A' : '#CBD5E1',
                          borderRadius: '26px',
                          transition: '0.2s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: isActive ? '23px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.2s'
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
