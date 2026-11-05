import { useState, useEffect, useMemo } from 'react'
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
  Check,
  Lock,
  Layers
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkLoginGateway() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  // Specific target selection within this screen (defaults to top scope)
  const [formTargetSiteId, setFormTargetSiteId] = useState(selectedSiteId || 'all')

  // Keep form target site id in sync when top domain scope changes
  useEffect(() => {
    setFormTargetSiteId(selectedSiteId || 'all')
  }, [selectedSiteId])

  const isAllTarget = formTargetSiteId === 'all'
  const activeTargetSite = useMemo(() => {
    if (isAllTarget) return activeWebsite || wpWebsites[0] || {}
    return wpWebsites.find(w => (w.id || w._id) === formTargetSiteId) || wpWebsites[0] || {}
  }, [formTargetSiteId, isAllTarget, activeWebsite, wpWebsites])

  // 1. WP Admin Hide & Custom Login URL
  const [customLoginSlug, setCustomLoginSlug] = useState('')
  const [loginRedirectType, setLoginRedirectType] = useState('404')

  // 2. Admin & Login IP Restriction
  const [adminIpWhitelist, setAdminIpWhitelist] = useState([])
  const [newAdminIpInput, setNewAdminIpInput] = useState('')
  const [ipTargetSiteId, setIpTargetSiteId] = useState('all')
  const [detectedClientIp, setDetectedClientIp] = useState('')

  // Loading & Action States
  const [savingSecret, setSavingSecret] = useState(false)
  const [savingIp, setSavingIp] = useState(false)
  const [resettingSecretSiteId, setResettingSecretSiteId] = useState(null)
  const [resettingAllIps, setResettingAllIps] = useState(false)
  const [deletingIp, setDeletingIp] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Populate form fields whenever the target site changes
  useEffect(() => {
    if (!activeTargetSite || Object.keys(activeTargetSite).length === 0) return
    const h = activeTargetSite.hardening || {}

    const effectiveSlug = activeTargetSite.custom_login_slug || h.custom_login_slug || ''
    setCustomLoginSlug(effectiveSlug)
    setLoginRedirectType(activeTargetSite.login_redirect_type || h.login_redirect_type || '404')

    const rawWl = activeTargetSite.admin_ip_whitelist || h.admin_ip_whitelist
    const parsedWl = Array.isArray(rawWl)
      ? rawWl
      : (rawWl ? String(rawWl).split(/[,\r\n]+/).map(s => s.trim()).filter(Boolean) : [])
    setAdminIpWhitelist(parsedWl)
  }, [activeTargetSite?.id, activeTargetSite?._id, activeTargetSite?.custom_login_slug, activeTargetSite?.admin_ip_whitelist, formTargetSiteId])

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Detect client IP on mount
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
    const rawUrl = site?.url || ''
    const domain = site?.domain || 'your-domain.com'
    let base = rawUrl ? rawUrl.replace(/\/$/, '') : ''
    if (!base) {
      const scheme = domain.startsWith('localhost') || domain.startsWith('127.0.0.1') ? 'http://' : 'https://'
      base = `${scheme}${domain}`
    }
    if (slug) {
      return `${base}/${slug}`
    }
    return `${base}/wp-login.php`
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
      const targets = isAllTarget ? wpWebsites : [activeTargetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.custom_login_slug = cleanSlug
        site.hide_login_url = true
        site.login_redirect_type = loginRedirectType || '404'
        if (site.hardening) {
          site.hardening.custom_login_slug = cleanSlug
          site.hardening.hide_login_url = true
          site.hardening.login_redirect_type = loginRedirectType || '404'
        }
      })

      showToast(`Secret Login Gateway (/${cleanSlug}) saved for ${isAllTarget ? 'All Domains' : (activeTargetSite.domain || 'site')}!`)
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to save secret login gateway.', true)
    } finally {
      setSavingSecret(false)
    }
  }

  const handleResetLoginGateway = async (siteToReset) => {
    const siteKey = siteToReset.id || siteToReset._id
    setResettingSecretSiteId(siteKey)
    const payload = {
      hide_login_url: false,
      custom_login_slug: '',
      login_redirect_type: '404'
    }
    try {
      await api.updateWebsiteSecuritySettings(siteKey, payload)

      siteToReset.custom_login_slug = ''
      siteToReset.hide_login_url = false
      if (siteToReset.hardening) {
        siteToReset.hardening.custom_login_slug = ''
        siteToReset.hardening.hide_login_url = false
      }

      showToast(`Secret URL deleted for ${siteToReset.domain || 'site'}. Default /wp-login.php restored successfully!`)
      if (siteToReset.id === activeTargetSite.id || siteToReset._id === activeTargetSite._id) {
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
    const updated = [...adminIpWhitelist, raw]
    setAdminIpWhitelist(updated)
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
      const isFleetScope = ipTargetSiteId === 'all'
      const targetSites = isFleetScope
        ? wpWebsites
        : wpWebsites.filter(w => (w.id || w._id) === ipTargetSiteId)

      await Promise.all(targetSites.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targetSites.forEach(site => {
        site.admin_ip_whitelist = listToSave
        site.admin_ip_whitelist_enabled = hasIps
        if (site.hardening) {
          site.hardening.admin_ip_whitelist = listToSave
          site.hardening.admin_ip_whitelist_enabled = hasIps
        }
      })

      if (hasIps) {
        showToast(`Admin IP restriction saved for ${isFleetScope ? 'All Domains' : (targetSites[0]?.domain || 'selected domain')} (${listToSave.length} IP authorized)!`)
      } else {
        showToast(`All IP restrictions removed. Admin login access is now unrestricted!`)
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to save admin IP restriction.', true)
    } finally {
      setSavingIp(false)
    }
  }

  const handleRemoveAllowedIp = async (ipToRemove, fromSite = null) => {
    setDeletingIp(ipToRemove)
    try {
      if (fromSite && fromSite.id) {
        const currentList = Array.isArray(fromSite.admin_ip_whitelist) ? fromSite.admin_ip_whitelist : []
        const updated = currentList.filter(ip => ip !== ipToRemove)
        const payload = {
          admin_ip_whitelist_enabled: updated.length > 0,
          admin_ip_whitelist: updated
        }
        await api.updateWebsiteSecuritySettings(fromSite.id || fromSite._id, payload)
        fromSite.admin_ip_whitelist = updated
        fromSite.admin_ip_whitelist_enabled = updated.length > 0
        if (fromSite.id === activeTargetSite.id || fromSite._id === activeTargetSite._id) {
          setAdminIpWhitelist(updated)
        }
        showToast(`IP ${ipToRemove} deleted for ${fromSite.domain}.`)
      } else {
        const updated = adminIpWhitelist.filter(ip => ip !== ipToRemove)
        setAdminIpWhitelist(updated)
        await handleSaveAdminIpRestriction(updated)
        showToast(`IP ${ipToRemove} deleted.`)
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to remove IP.', true)
    } finally {
      setDeletingIp(null)
    }
  }

  const handleRemoveAllAdminIps = async () => {
    setResettingAllIps(true)
    setAdminIpWhitelist([])
    const payload = {
      admin_ip_whitelist_enabled: false,
      admin_ip_whitelist: []
    }
    try {
      const targets = isAllTarget ? wpWebsites : [activeTargetSite]
      await Promise.all(targets.filter(t => t && (t.id || t._id)).map(site => {
        const sid = site.id || site._id
        return api.updateWebsiteSecuritySettings(sid, payload)
      }))

      targets.forEach(site => {
        site.admin_ip_whitelist = []
        site.admin_ip_whitelist_enabled = false
        if (site.hardening) {
          site.hardening.admin_ip_whitelist = []
          site.hardening.admin_ip_whitelist_enabled = false
        }
      })

      showToast(`All IP restrictions removed. Admin access is 100% open for all IPs!`)
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

  // Professional Dark / Black Action Button Styling (Strictly NO RED)
  const darkActionButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    background: '#0F172A',
    border: '1px solid #1E293B',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
    transition: 'all 0.15s ease'
  }

  // Compute aggregated list of configured IP rules across all sites
  const allFleetIpRules = useMemo(() => {
    const list = []
    wpWebsites.forEach(site => {
      const raw = site.admin_ip_whitelist || site.hardening?.admin_ip_whitelist
      const parsed = Array.isArray(raw)
        ? raw
        : (raw ? String(raw).split(/[,\r\n]+/).map(s => s.trim()).filter(Boolean) : [])
      parsed.forEach(ip => {
        list.push({ ip, site })
      })
    })
    return list
  }, [wpWebsites])

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
          {toastMsg.isError ? <AlertTriangle size={15} color="#F59E0B" /> : <CheckCircle2 size={15} color="#10B981" />}
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
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '700', color: '#0F172A' }}>
                    WP Admin Hide &amp; Custom Secret Login Gateway
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: '1.45' }}>
                    Conceal <code>/wp-admin</code> and <code>/wp-login.php</code> behind a private secret slug. Unauthorized requests are blocked with 404 or redirected to homepage.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle('#F1F5F9', '#0F172A', '#CBD5E1')}>
                  {isAllTarget ? 'FLEET SCOPE: ALL DOMAINS' : `TARGET: ${activeTargetSite.domain || 'SELECTED SITE'}`}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Target Domain Selector & Secret Slug Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                
                {/* Field 0: Choose Target Domain (All or Single) */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Apply Secret Gateway To
                  </label>
                  <select
                    value={formTargetSiteId}
                    onChange={(e) => setFormTargetSiteId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    <option value="all">Apply to All Domains (Fleet-Wide)</option>
                    {wpWebsites.map(site => (
                      <option key={site.id || site._id} value={site.id || site._id}>
                        {site.domain || site.url} {site.custom_login_slug ? `(Current: /${site.custom_login_slug})` : ''}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    Choose whether to hide wp-admin across all sites or for a specific website.
                  </small>
                </div>

                {/* Field 1: Secret Login Slug */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Custom Secret Directory Slug
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '0 10px', fontSize: '12.5px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', height: '40px', display: 'flex', alignItems: 'center', borderRight: '1px solid #CBD5E1', whiteSpace: 'nowrap' }}>
                      {isAllTarget ? '[domain]' : activeTargetSite.domain}/
                    </span>
                    <input
                      type="text"
                      value={customLoginSlug}
                      onChange={(e) => setCustomLoginSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="e.g. mahabub, portal, secure-admin"
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
                  <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    Only requests to this exact path will show WordPress login.
                  </small>
                </div>

                {/* Field 2: Unauthorized Intruder Action */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Unauthorized Access Action
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                        background: '#FFFFFF',
                        outline: 'none'
                      }}
                    >
                      <option value="404">Stealth 404 Not Found (Recommended)</option>
                      <option value="home">Redirect to Website Homepage (301)</option>
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
                      <span>{savingSecret ? 'Saving...' : 'Save Secret Gateway'}</span>
                    </button>
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    What unauthorized visitors see when attempting to access /wp-admin.
                  </small>
                </div>
              </div>

              {/* Configured Secret Gateways Table (Rows with details and sleek dark delete button) */}
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} />
                    <span>Configured Secret Gateways &amp; Domain Fleet ({wpWebsites.length} Websites)</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Settings are stored in each website's database and synced live
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {wpWebsites.map((site, index) => {
                    const effectiveSlug = site.custom_login_slug || site.hardening?.custom_login_slug || ''
                    const isConfigured = Boolean(
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
                          padding: '14px 18px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          background: '#FFFFFF',
                          flexWrap: 'wrap',
                          gap: '12px',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)'
                        }}
                      >
                        {/* Column 1: Domain Name & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Globe size={16} color="#0F172A" />
                          </div>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                              {site.domain || site.url || 'Connected Site'}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              {isConfigured ? (
                                <span style={badgeStyle('#DCFCE7', '#166534', '#86EFAC')}>
                                  SECRET GATEWAY ACTIVE (/{effectiveSlug})
                                </span>
                              ) : (
                                <span style={badgeStyle('#F1F5F9', '#475569', '#CBD5E1')}>
                                  DEFAULT (/wp-login.php)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Full Active Login URL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '240px' }}>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Login Gateway URL
                          </span>
                          <code style={{ fontSize: '13px', fontWeight: 700, color: isConfigured ? '#15803D' : '#0F172A', wordBreak: 'break-all' }}>
                            {activeUrl}
                          </code>
                        </div>

                        {/* Column 3: Action & Mode */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>Action:</span>
                          <span style={badgeStyle('#F8FAFC', '#334155', '#E2E8F0')}>
                            {(site.login_redirect_type === 'home' || site.hardening?.login_redirect_type === 'home') ? 'Homepage 301' : 'Stealth 404'}
                          </span>
                        </div>

                        {/* Column 4: Action Buttons (Test, Copy, Delete) */}
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

                          {/* Professional Dark/Black Delete Button - STRICTLY NO RED */}
                          {isConfigured && (
                            <button
                              type="button"
                              onClick={() => handleResetLoginGateway(site)}
                              disabled={isResettingThis}
                              title="Delete secret slug and restore standard /wp-login.php"
                              style={{
                                ...darkActionButtonStyle,
                                opacity: isResettingThis ? 0.6 : 1,
                                cursor: isResettingThis ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Undo2 size={13} />
                              <span>{isResettingThis ? 'Restoring...' : 'Delete Secret URL'}</span>
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
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '700', color: '#0F172A' }}>
                    Restrict Admin Panel &amp; Login Access by IP
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: '1.45' }}>
                    Limit access to <code>/wp-admin</code> and login gateways strictly to authorized IP addresses. Unauthorized visitors are blocked with 403.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(allFleetIpRules.length > 0 ? '#F0FDF4' : '#F8FAFC', allFleetIpRules.length > 0 ? '#15803D' : '#64748B', allFleetIpRules.length > 0 ? '#BBF7D0' : '#E2E8F0')}>
                  {allFleetIpRules.length > 0 ? `${allFleetIpRules.length} ACTIVE IP RULE(S)` : 'ALLOW ALL IPS (UNRESTRICTED)'}
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Detected Current IP Quick-Add Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                minHeight: '44px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600 }}>
                    Detected Your Current Public IP: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{detectedClientIp || 'Detecting...'}</strong>
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
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#F1F5F9' : '#0F172A',
                    color: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#64748B' : '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? 'default' : 'pointer'
                  }}
                >
                  <Check size={13} />
                  <span>{adminIpWhitelist.includes(detectedClientIp) ? 'Current IP In List' : '+ Add My Current IP'}</span>
                </button>
              </div>

              {/* Add IP Input & Action Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Authorize Admin IP Address or CIDR Subnet
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  
                  {/* Select target domain for this IP */}
                  <select
                    value={ipTargetSiteId}
                    onChange={(e) => setIpTargetSiteId(e.target.value)}
                    style={{
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      minWidth: '220px',
                      outline: 'none'
                    }}
                  >
                    <option value="all">Apply to All Domains</option>
                    {wpWebsites.map(site => (
                      <option key={site.id || site._id} value={site.id || site._id}>
                        {site.domain || site.url}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={newAdminIpInput}
                    onChange={(e) => setNewAdminIpInput(e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllowedIp(); } }}
                    placeholder="e.g. 103.120.45.241 or 192.168.1.0/24"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none'
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
                    <span>{savingIp ? 'Saving...' : 'Save Authorized IPs'}</span>
                  </button>
                </div>
                <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '5px', display: 'block' }}>
                  Target Scope: <strong>{ipTargetSiteId === 'all' ? 'All Domains' : (wpWebsites.find(w => (w.id || w._id) === ipTargetSiteId)?.domain || 'Selected Site')}</strong>. Accepts single IPv4, IPv6, or CIDR blocks.
                </small>
              </div>

              {/* Active Allowed IPs List in Rows with Sleek Dark Delete Button */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} />
                    <span>Authorized Admin IP Rules ({allFleetIpRules.length > 0 ? allFleetIpRules.length : adminIpWhitelist.length})</span>
                  </div>
                  {allFleetIpRules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAllAdminIps()}
                      disabled={resettingAllIps}
                      style={{
                        ...darkActionButtonStyle,
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        opacity: resettingAllIps ? 0.6 : 1
                      }}
                    >
                      <Trash2 size={12} />
                      <span>{resettingAllIps ? 'Clearing...' : 'Clear All IP Restrictions'}</span>
                    </button>
                  )}
                </div>

                {allFleetIpRules.length === 0 && adminIpWhitelist.length === 0 ? (
                  <div style={{
                    padding: '14px 16px',
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
                    <span><strong>Unrestricted Access:</strong> No IP whitelist configured. WordPress administrative login is open from any IP address.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Render each configured IP entry */}
                    {(allFleetIpRules.length > 0 ? allFleetIpRules : adminIpWhitelist.map(ip => ({ ip, site: activeTargetSite }))).map(({ ip, site }, idx) => {
                      const isCurrent = detectedClientIp && ip === detectedClientIp
                      const key = `${site?.id || site?.domain || idx}-${ip}`
                      const isDeletingThis = deletingIp === ip

                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Server size={14} color="#0F172A" />
                            </div>
                            
                            <code style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '3px 10px', borderRadius: '5px' }}>
                              {ip}
                            </code>

                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                              Domain Scope: <strong style={{ color: '#0F172A' }}>{site?.domain || 'All Domains'}</strong>
                            </span>

                            {isCurrent && (
                              <span style={badgeStyle('#F0FDF4', '#15803D', '#BBF7D0')}>
                                YOUR CURRENT IP
                              </span>
                            )}
                          </div>

                          {/* Professional Dark/Black Delete Button - STRICTLY NO RED */}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllowedIp(ip, site)}
                            disabled={isDeletingThis}
                            title="Delete this authorized IP"
                            style={{
                              ...darkActionButtonStyle,
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              opacity: isDeletingThis ? 0.6 : 1,
                              cursor: isDeletingThis ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>{isDeletingThis ? 'Deleting...' : 'Delete IP'}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  )
}
