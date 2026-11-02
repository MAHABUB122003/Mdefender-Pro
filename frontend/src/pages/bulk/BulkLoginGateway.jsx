import { useState, useEffect } from 'react'
import {
  Key,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Save,
  Plus,
  Trash2,
  Undo2,
  Sparkles,
  Server,
  Check
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkLoginGateway() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  // Target websites determined by top Domain Scope
  const isAllDomains = selectedSiteId === 'all'
  const targetSite = activeWebsite || wpWebsites[0] || {}

  // 1. WP Admin Hide & Custom Login URL
  const [customLoginSlug, setCustomLoginSlug] = useState('')
  const [loginRedirectType, setLoginRedirectType] = useState('404')

  // 2. Admin & Login IP Restriction
  const [adminIpWhitelist, setAdminIpWhitelist] = useState([])
  const [newAdminIpInput, setNewAdminIpInput] = useState('')
  const [detectedClientIp, setDetectedClientIp] = useState('')

  // State management
  const [savingSecret, setSavingSecret] = useState(false)
  const [savingIp, setSavingIp] = useState(false)
  const [resettingSecretSiteId, setResettingSecretSiteId] = useState(null)
  const [resettingAllIps, setResettingAllIps] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Synchronize state when top domain scope changes or fresh fleet data arrives
  useEffect(() => {
    if (!targetSite || Object.keys(targetSite).length === 0) return
    const h = targetSite.hardening || {}

    const effectiveSlug = targetSite.custom_login_slug || h.custom_login_slug || ''
    setCustomLoginSlug(effectiveSlug)
    setLoginRedirectType(targetSite.login_redirect_type || h.login_redirect_type || '404')

    const rawWl = targetSite.admin_ip_whitelist || h.admin_ip_whitelist
    const parsedWl = Array.isArray(rawWl)
      ? rawWl
      : (rawWl ? String(rawWl).split(/[,\r\n]+/).map(s => s.trim()).filter(Boolean) : [])
    setAdminIpWhitelist(parsedWl)
  }, [targetSite?.id, targetSite?._id, targetSite?.custom_login_slug, targetSite?.admin_ip_whitelist, selectedSiteId])

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
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
  const getComputedLoginUrl = (site, slug) => {
    const domain = site?.domain || 'your-domain.com'
    const scheme = domain.startsWith('localhost') || domain.startsWith('127.0.0.1') ? 'http://' : 'https://'
    if (slug) {
      return `${scheme}${domain}/${slug}`
    }
    return `${scheme}${domain}/wp-login.php`
  }

  const copyLoginUrl = (url, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('Login URL copied to clipboard!')
    }
  }

  const handleSaveLoginGateway = async () => {
    const cleanSlug = customLoginSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug || ['wp-admin', 'wp-login.php', 'wp-login'].includes(cleanSlug)) {
      showToast('Please specify a valid secret directory (e.g. mahabub, portal, secret-gateway).', true)
      return
    }

    setSavingSecret(true)
    const payload = {
      hide_login_url: true,
      custom_login_slug: cleanSlug,
      login_redirect_type: loginRedirectType || '404'
    }

    try {
      const targets = isAllDomains ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.custom_login_slug = cleanSlug
        site.hide_login_url = true
        site.login_redirect_type = loginRedirectType || '404'
      })

      showToast(`Secret Login Gateway (/${cleanSlug}) saved for ${isAllDomains ? 'All Domains' : (targetSite.domain || 'site')}!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to save secret login gateway.', true)
    } finally {
      setSavingSecret(false)
    }
  }

  const handleResetLoginGateway = async (siteToReset = null) => {
    const siteKey = siteToReset ? (siteToReset.id || siteToReset._id) : (targetSite.id || targetSite._id || 'all')
    setResettingSecretSiteId(siteKey)
    const payload = {
      hide_login_url: false,
      custom_login_slug: '',
      login_redirect_type: '404'
    }
    try {
      const targets = siteToReset ? [siteToReset] : (isAllDomains ? wpWebsites : [targetSite])
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.custom_login_slug = ''
        site.hide_login_url = false
      })

      showToast('Custom secret URL deleted. Default /wp-login.php restored successfully!')
      if (!siteToReset || siteToReset.id === targetSite.id || siteToReset._id === targetSite._id) {
        setCustomLoginSlug('')
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to reset login gateway.', true)
    } finally {
      setResettingSecretSiteId(null)
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
      showToast('Please enter a valid IPv4, IPv6, or CIDR subnet (e.g. 103.120.45.241 or 192.168.1.0/24).', true)
      return
    }
    if (adminIpWhitelist.includes(raw)) {
      showToast('This IP address is already in the list.', true)
      return
    }
    setAdminIpWhitelist(prev => [...prev, raw])
    setNewAdminIpInput('')
  }

  const handleSaveAdminIpRestriction = async (overrideList = null) => {
    setSavingIp(true)
    const listToSave = Array.isArray(overrideList) ? overrideList : adminIpWhitelist
    const hasIps = listToSave && listToSave.length > 0
    const payload = {
      admin_ip_whitelist_enabled: hasIps,
      admin_ip_whitelist: listToSave || []
    }
    try {
      const targets = isAllDomains ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.admin_ip_whitelist = listToSave
        site.admin_ip_whitelist_enabled = hasIps
      })

      if (hasIps) {
        showToast(`Admin IP restriction saved for ${isAllDomains ? 'All Domains' : (targetSite.domain || 'site')} (${listToSave.length} IP authorized)!`)
      } else {
        showToast(`All IP restrictions removed for ${isAllDomains ? 'All Domains' : (targetSite.domain || 'site')}. Admin access is open to all IPs!`)
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to save admin IP restriction.', true)
    } finally {
      setSavingIp(false)
    }
  }

  const handleRemoveAllowedIp = async (ipToRemove) => {
    const updated = adminIpWhitelist.filter(ip => ip !== ipToRemove)
    setAdminIpWhitelist(updated)
    await handleSaveAdminIpRestriction(updated)
  }

  const handleRemoveAllAdminIps = async () => {
    setResettingAllIps(true)
    setAdminIpWhitelist([])
    const payload = {
      admin_ip_whitelist_enabled: false,
      admin_ip_whitelist: []
    }
    try {
      const targets = isAllDomains ? wpWebsites : [targetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.admin_ip_whitelist = []
        site.admin_ip_whitelist_enabled = false
      })

      showToast(`All IP restrictions removed for ${isAllDomains ? 'All Domains' : (targetSite.domain || 'site')}. Admin access is now 100% open to all IPs!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to clear IP restrictions.', true)
    } finally {
      setResettingAllIps(false)
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

  const currentScopeTitle = isAllDomains
    ? `All Domains (${wpWebsites.length} Sites)`
    : (targetSite.domain || targetSite.url || 'Selected Site')

  const displayedSites = isAllDomains ? wpWebsites : (targetSite && (targetSite.id || targetSite._id || targetSite.domain) ? [targetSite] : wpWebsites.slice(0, 1))

  return (
    <div className="bulk-login-gateway-page" style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      
      {/* Toast Notification Banner */}
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
        title="WP Admin &amp; Login Gateway Security"
        subtitle="Conceal WordPress admin login URLs behind private secret directories and restrict administrative login access strictly to authorized IPs."
        icon={Key}
        activeBadge="Gateway Protection"
      />

      {!hasWebsites ? (
        <EmptyFleetState
          title="No WordPress Websites Connected Yet"
          description="Your login gateway security dashboard is empty because no WordPress sites are connected. Connect your site using the MDefender-Pro plugin to conceal wp-admin and restrict login access by IP."
          featureName="Gateway Protection"
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
                <span style={badgeStyle('#F1F5F9', '#0F172A', '#CBD5E1')}>
                  {isAllDomains ? 'SCOPE: ALL DOMAINS' : `SCOPE: ${targetSite.domain || 'CURRENT SITE'}`}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Secret Slug & Redirect Configuration Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {/* Field 1: Secret Login Slug */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Custom Secret Login Directory
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '0 10px', fontSize: '12.5px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', height: '40px', display: 'flex', alignItems: 'center', borderRight: '1px solid #CBD5E1', whiteSpace: 'nowrap' }}>
                      {isAllDomains ? '[domain]' : targetSite.domain}/
                    </span>
                    <input
                      type="text"
                      value={customLoginSlug}
                      onChange={(e) => setCustomLoginSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="e.g. mahabub, portal, secret-gateway"
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
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={loginRedirectType}
                      onChange={(e) => setLoginRedirectType(e.target.value)}
                      style={{
                        flex: 1,
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
                      <option value="404">Stealth 404 Not Found (Recommended)</option>
                      <option value="home">Redirect to Website Homepage (301 Permanent)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleSaveLoginGateway}
                      disabled={savingSecret || !customLoginSlug.trim()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 18px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: savingSecret || !customLoginSlug.trim() ? 'not-allowed' : 'pointer',
                        opacity: !customLoginSlug.trim() ? 0.6 : 1,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Save size={14} />
                      <span>{savingSecret ? 'Saving Gateway...' : 'Save Secret Gateway'}</span>
                    </button>
                  </div>
                  <small style={{ color: '#64748B', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    What unauthorized visitors see when attempting to open /wp-admin or /wp-login.php.
                  </small>
                </div>
              </div>

              {/* Active Configured Gateways List */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Configured Secret Gateways &amp; Test Links ({displayedSites.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedSites.map((site, index) => {
                    const isSiteConn = site?.wordpress_connection?.connected !== false && (site?.api_key || site?.status === 'active')
                    const effectiveSlug = (site.id === targetSite.id || site._id === targetSite._id)
                      ? (site.custom_login_slug || customLoginSlug)
                      : site.custom_login_slug
                    const isConfigured = isSiteConn && Boolean(
                      effectiveSlug &&
                      site.hide_login_url !== false &&
                      !['wp-admin', 'wp-login.php', 'wp-login'].includes(effectiveSlug.toLowerCase())
                    )
                    const activeUrl = isConfigured
                      ? getComputedLoginUrl(site, effectiveSlug)
                      : getComputedLoginUrl(site, '')
                    const siteKey = site.id || site._id || index
                    const isResettingThis = resettingSecretSiteId === siteKey

                    return (
                      <div
                        key={siteKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          background: '#FFFFFF',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                          <Globe size={15} color="#0F172A" />
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                            {site.domain || site.url || 'Connected Site'}
                          </span>
                          {!isSiteConn ? (
                            <span style={badgeStyle('#FEF3C7', '#92400E', '#FDE68A')}>
                              DISCONNECTED (API KEY REQUIRED)
                            </span>
                          ) : isConfigured ? (
                            <span style={badgeStyle('#DCFCE7', '#166534', '#86EFAC')}>
                              SECRET GATEWAY ACTIVE (/{effectiveSlug})
                            </span>
                          ) : (
                            <span style={badgeStyle('#F1F5F9', '#475569', '#CBD5E1')}>
                              DEFAULT (/wp-login.php)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Login Gateway:</span>
                          <code style={{ fontSize: '13px', fontWeight: 700, color: isConfigured ? '#15803D' : '#0F172A', wordBreak: 'break-all' }}>
                            {activeUrl}
                          </code>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <a
                            href={activeUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#F8FAFC',
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

                          <button
                            type="button"
                            onClick={() => copyLoginUrl(activeUrl, siteKey)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
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
                            <span>{copiedId === siteKey ? 'Copied!' : 'Copy Link'}</span>
                          </button>

                          {isConfigured && (
                            <button
                              type="button"
                              onClick={() => handleResetLoginGateway(site)}
                              disabled={isResettingThis}
                              title="Cancel secret URL and restore default /wp-login.php"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#FFF1F2',
                                border: '1px solid #FECDD3',
                                color: '#BE123C',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: isResettingThis ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Undo2 size={13} />
                              <span>{isResettingThis ? 'Cancelling...' : 'Cancel / Delete Secret URL'}</span>
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
                    Limit access to <code>/wp-admin</code> and login gateways strictly to authorized IP addresses.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(adminIpWhitelist.length > 0 ? '#F0FDF4' : '#F8FAFC', adminIpWhitelist.length > 0 ? '#15803D' : '#64748B', adminIpWhitelist.length > 0 ? '#BBF7D0' : '#E2E8F0')}>
                  {adminIpWhitelist.length > 0 ? `${adminIpWhitelist.length} AUTHORIZED IP(S)` : 'ALLOW ALL IPS (UNRESTRICTED)'}
                </span>
                <span style={badgeStyle('#F1F5F9', '#0F172A', '#CBD5E1')}>
                  {isAllDomains ? 'SCOPE: ALL DOMAINS' : `SCOPE: ${targetSite.domain || 'CURRENT SITE'}`}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Detected Current IP Quick-Add Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                minHeight: '44px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={15} color="#0F172A" />
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600 }}>
                    Detected Your Current IP: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{detectedClientIp || 'Detecting...'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => detectedClientIp && handleAddAllowedIp(detectedClientIp)}
                  disabled={!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#F1F5F9' : '#0F172A',
                    color: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#64748B' : '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? 'default' : 'pointer'
                  }}
                >
                  <Check size={12} />
                  <span>{adminIpWhitelist.includes(detectedClientIp) ? 'Current IP Added' : '+ Add My Current IP'}</span>
                </button>
              </div>

              {/* Add IP Input & Action Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Add Authorized IP Address or Subnet (CIDR)
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newAdminIpInput}
                    onChange={(e) => setNewAdminIpInput(e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllowedIp(); } }}
                    placeholder="e.g. 103.120.45.241 or 192.168.1.0/24"
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      height: '40px',
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
                      height: '40px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} />
                    <span>Add IP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAdminIpRestriction()}
                    disabled={savingIp}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 18px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: savingIp ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Save size={14} />
                    <span>{savingIp ? 'Saving IPs...' : 'Save Authorized IPs'}</span>
                  </button>
                </div>
                <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '5px', display: 'block' }}>
                  Target Scope: <strong>{currentScopeTitle}</strong>. Accepts single IPv4, IPv6, or CIDR blocks.
                </small>
              </div>

              {/* Active Allowed IPs List */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Authorized Admin IP Rules for {currentScopeTitle} ({adminIpWhitelist.length})
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
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                              Scope: <strong style={{ color: '#0F172A' }}>{isAllDomains ? 'All Domains' : targetSite.domain}</strong>
                            </span>
                            {isCurrent && (
                              <span style={badgeStyle('#F0FDF4', '#15803D', '#BBF7D0')}>
                                YOUR CURRENT IP
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAllowedIp(ip)}
                            title="Remove this IP"
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

              {/* Reset All IP Restrictions Button */}
              {adminIpWhitelist.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllAdminIps()}
                    disabled={resettingAllIps}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      color: '#BE123C',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: resettingAllIps ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>{resettingAllIps ? 'Removing All...' : 'Remove All IP Restrictions (Allow All IPs)'}</span>
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  )
}

