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
  Sparkles,
  Check,
  Search,
  X,
  RotateCcw,
  Shield
} from 'lucide-react'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkLoginGateway() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  const isAllTarget = !selectedSiteId || selectedSiteId === 'all'
  const activeTargetSite = useMemo(() => {
    if (isAllTarget) return activeWebsite || wpWebsites[0] || {}
    return wpWebsites.find(w => (w.id || w._id) === selectedSiteId) || activeWebsite || wpWebsites[0] || {}
  }, [selectedSiteId, isAllTarget, activeWebsite, wpWebsites])

  const targetDomainName = useMemo(() => {
    if (isAllTarget) {
      if (activeWebsite?.domain) return activeWebsite.domain
      if (wpWebsites && wpWebsites[0]?.domain) return wpWebsites[0].domain
      return 'All Connected Sites'
    }
    return activeTargetSite.domain || activeTargetSite.url || 'mahabubur.shop'
  }, [isAllTarget, activeWebsite, wpWebsites, activeTargetSite])

  // 1. WP Admin Hide & Custom Login URL
  const [customLoginSlug, setCustomLoginSlug] = useState('')
  const [loginRedirectType, setLoginRedirectType] = useState('404')

  // 2. Admin & Login IP Restriction
  const [adminIpWhitelist, setAdminIpWhitelist] = useState([])
  const [newAdminIpInput, setNewAdminIpInput] = useState('')
  const [detectedClientIp, setDetectedClientIp] = useState('')

  // Loading & Action States
  const [savingSecret, setSavingSecret] = useState(false)
  const [savingIp, setSavingIp] = useState(false)
  const [resettingSecretSiteId, setResettingSecretSiteId] = useState(null)
  const [deletingIp, setDeletingIp] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Real-Time Table Search State
  const [gatewaySearchQuery, setGatewaySearchQuery] = useState('')
  const [ipSearchQuery, setIpSearchQuery] = useState('')

  // Populate form fields whenever the target site changes
  useEffect(() => {
    if (!activeTargetSite || Object.keys(activeTargetSite).length === 0) return
    const h = activeTargetSite.hardening || {}

    const effectiveSlug = activeTargetSite.custom_login_slug || h.custom_login_slug || ''
    setCustomLoginSlug(effectiveSlug)
    setLoginRedirectType(activeTargetSite.login_redirect_type || h.login_redirect_type || '404')

    const rawWl = activeTargetSite.admin_ip_whitelist ?? h.admin_ip_whitelist
    const parsedWl = Array.isArray(rawWl)
      ? rawWl
      : (rawWl ? String(rawWl).split(/[,\r\n]+/).map(s => s.trim()).filter(Boolean) : [])
    setAdminIpWhitelist(parsedWl)
  }, [activeTargetSite?.id, activeTargetSite?._id, activeTargetSite?.custom_login_slug, JSON.stringify(activeTargetSite?.admin_ip_whitelist ?? activeTargetSite?.hardening?.admin_ip_whitelist ?? []), selectedSiteId])

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

  const getComputedLoginUrl = (site, slug) => {
    let domain = (site?.domain || site?.url || '').trim()
    domain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    if (!domain) domain = 'mahabubur.shop'
    const isLocal = domain.startsWith('localhost') || domain.startsWith('127.0.0.1')
    const scheme = isLocal ? 'http://' : 'https://'
    const base = `${scheme}${domain}`
    if (slug) {
      const cleanSlug = String(slug).trim().replace(/^\/+/, '').replace(/\/+$/, '')
      return `${base}/${cleanSlug}`
    }
    return `${base}/wp-login.php`
  }

  const copyLoginUrl = (url, id) => {
    const validUrl = url && (url.startsWith('http://') || url.startsWith('https://')) ? url : `https://${url || ''}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(validUrl)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('Login URL copied to clipboard: ' + validUrl)
    }
  }

  const handleSaveLoginGateway = async () => {
    const cleanSlug = customLoginSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug || ['wp-admin', 'wp-login.php', 'wp-login'].includes(cleanSlug)) {
      showToast('Please specify a valid secret directory (e.g. portal, mahabub, secure-admin).', true)
      return
    }

    setSavingSecret(true)
    const payload = {
      hide_login_url: true,
      custom_login_slug: cleanSlug,
      login_redirect_type: loginRedirectType || '404'
    }

    try {
      const targets = (selectedSiteId && selectedSiteId !== 'all')
        ? [activeTargetSite]
        : (wpWebsites.length > 0 ? wpWebsites : [activeTargetSite])
      const validTargets = targets.filter(t => t && (t.id || t._id))

      if (validTargets.length === 0) {
        showToast('No target WordPress site available.', true)
        return
      }

      const results = await Promise.allSettled(
        validTargets.map(site => api.updateWebsiteSecuritySettings(site.id || site._id, payload))
      )

      const successCount = results.filter(r => r.status === 'fulfilled' && (!r.value || r.value.success !== false)).length
      if (successCount > 0) {
        validTargets.forEach(site => {
          site.custom_login_slug = cleanSlug
          site.hide_login_url = true
          site.login_redirect_type = loginRedirectType || '404'
          if (site.hardening) {
            site.hardening.custom_login_slug = cleanSlug
            site.hardening.hide_login_url = true
            site.hardening.login_redirect_type = loginRedirectType || '404'
          }
        })
        showToast(`Secret Login Gateway (/${cleanSlug}) saved successfully!`)
        fetchFleet(true)
      } else {
        const firstErr = results.find(r => r.status === 'rejected')?.reason?.message || 'Failed to save secret login gateway.'
        showToast(firstErr, true)
      }
    } catch (err) {
      showToast(err.message || 'Failed to save secret login gateway.', true)
    } finally {
      setSavingSecret(false)
    }
  }

  const handleResetLoginGateway = async (siteToReset) => {
    const siteKey = siteToReset.id || siteToReset._id
    const siteDom = siteToReset.domain || siteToReset.url || 'this website'
    if (!window.confirm(`Are you sure you want to restore standard /wp-login.php for "${siteDom}"?`)) {
      return
    }
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

      showToast(`Standard /wp-login.php restored successfully for ${siteDom}.`)
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

  const handleAddAllowedIp = (ipCandidate) => {
    const raw = (ipCandidate || newAdminIpInput).trim()
    if (!raw) return
    const isValid = /^([0-9a-fA-F:.]+|\*)+(\/[0-9]{1,3})?$/.test(raw)
    if (!isValid) {
      showToast('Please enter a valid IPv4, IPv6, or CIDR subnet (e.g. 103.120.45.241 or 192.168.1.0/24).', true)
      return
    }
    if (adminIpWhitelist.includes(raw)) {
      showToast('This IP address is already in the authorized list.', true)
      return
    }
    const updated = [...adminIpWhitelist, raw]
    setAdminIpWhitelist(updated)
    setNewAdminIpInput('')
    handleSaveAdminIpRestriction(updated)
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
      const targets = (selectedSiteId && selectedSiteId !== 'all')
        ? [activeTargetSite]
        : (wpWebsites.length > 0 ? wpWebsites : [activeTargetSite])
      const validTargets = targets.filter(t => t && (t.id || t._id))

      if (validTargets.length === 0) {
        showToast('No target WordPress site available.', true)
        return
      }

      const results = await Promise.allSettled(
        validTargets.map(site => api.updateWebsiteSecuritySettings(site.id || site._id, payload))
      )

      const successCount = results.filter(r => r.status === 'fulfilled' && (!r.value || r.value.success !== false)).length
      if (successCount > 0) {
        validTargets.forEach(site => {
          site.admin_ip_whitelist = listToSave
          site.admin_ip_whitelist_enabled = hasIps
          if (site.hardening) {
            site.hardening.admin_ip_whitelist = listToSave
            site.hardening.admin_ip_whitelist_enabled = hasIps
          }
        })

        if (hasIps) {
          showToast(`Admin IP restriction active (${listToSave.length} IP authorized). Unauthorized IPs blocked with 403!`)
        } else {
          showToast('All IP restrictions removed. Admin login access is now unrestricted.')
        }
        fetchFleet(true)
      } else {
        const firstErr = results.find(r => r.status === 'rejected')?.reason?.message || 'Failed to save admin IP restriction.'
        showToast(firstErr, true)
      }
    } catch (err) {
      showToast(err.message || 'Failed to save admin IP restriction.', true)
    } finally {
      setSavingIp(false)
    }
  }

  const handleRemoveAllowedIp = async (ipToRemove, fromSite = null) => {
    setDeletingIp(ipToRemove)
    try {
      const targetSite = fromSite || activeTargetSite
      if (targetSite && (targetSite.id || targetSite._id)) {
        const currentList = Array.isArray(targetSite.admin_ip_whitelist) ? targetSite.admin_ip_whitelist : []
        const updated = currentList.filter(ip => ip !== ipToRemove)
        const payload = {
          admin_ip_whitelist_enabled: updated.length > 0,
          admin_ip_whitelist: updated
        }
        await api.updateWebsiteSecuritySettings(targetSite.id || targetSite._id, payload)
        targetSite.admin_ip_whitelist = updated
        targetSite.admin_ip_whitelist_enabled = updated.length > 0
        if (targetSite.id === activeTargetSite.id || targetSite._id === activeTargetSite._id) {
          setAdminIpWhitelist(updated)
        }
        showToast(`IP ${ipToRemove} removed from whitelist.`)
      } else {
        const updated = adminIpWhitelist.filter(ip => ip !== ipToRemove)
        setAdminIpWhitelist(updated)
        await handleSaveAdminIpRestriction(updated)
        showToast(`IP ${ipToRemove} removed.`)
      }
      fetchFleet(true)
    } catch (err) {
      showToast(err.message || 'Failed to remove IP.', true)
    } finally {
      setDeletingIp(null)
    }
  }

  // Active Secret Gateways List
  const activeSecretGateways = useMemo(() => {
    const list = (wpWebsites || []).filter(site => {
      const effectiveSlug = site.custom_login_slug || site.hardening?.custom_login_slug || ''
      return Boolean(
        effectiveSlug &&
        site.hide_login_url !== false &&
        !['wp-admin', 'wp-login.php', 'wp-login'].includes(effectiveSlug.toLowerCase())
      )
    })
    if (selectedSiteId && selectedSiteId !== 'all') {
      return list.filter(site => (site.id || site._id) === selectedSiteId)
    }
    return list
  }, [wpWebsites, selectedSiteId])

  const filteredSecretGateways = useMemo(() => {
    if (!gatewaySearchQuery.trim()) return activeSecretGateways
    const q = gatewaySearchQuery.trim().toLowerCase()
    return activeSecretGateways.filter(site => {
      const dom = (site.domain || site.url || '').toLowerCase()
      const slug = (site.custom_login_slug || site.hardening?.custom_login_slug || '').toLowerCase()
      const title = (site.site_title || site.name || '').toLowerCase()
      return dom.includes(q) || slug.includes(q) || title.includes(q)
    })
  }, [activeSecretGateways, gatewaySearchQuery])

  // Active IP Rules List
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

  const displayedIpRules = useMemo(() => {
    if (selectedSiteId && selectedSiteId !== 'all') {
      return allFleetIpRules.filter(r => (r.site?.id || r.site?._id) === selectedSiteId)
    }
    return allFleetIpRules
  }, [allFleetIpRules, selectedSiteId])

  const filteredIpRules = useMemo(() => {
    if (!ipSearchQuery.trim()) return displayedIpRules
    const q = ipSearchQuery.trim().toLowerCase()
    return displayedIpRules.filter(({ ip, site }) => {
      const ipStr = String(ip || '').toLowerCase()
      const dom = (site?.domain || site?.url || '').toLowerCase()
      return ipStr.includes(q) || dom.includes(q)
    })
  }, [displayedIpRules, ipSearchQuery])

  const isCustomSlugActive = Boolean(
    customLoginSlug &&
    !['wp-admin', 'wp-login.php', 'wp-login'].includes(customLoginSlug.toLowerCase())
  )

  const activeLoginUrl = getComputedLoginUrl(activeTargetSite, customLoginSlug)

  return (
    <div className="bulk-login-gateway-page" style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0 32px' }}>

      {/* Floating Status Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: toastMsg.isError ? '#DC2626' : '#0B2522',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '12.5px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} color="#4ADE80" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {!hasWebsites ? (
        <EmptyFleetState title="No Connected WordPress Sites Found" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ========================================================================= */}
          {/* ROW 1: CONFIGURATION CARDS (EQUAL HEIGHT, EQUAL PADDING)                  */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            
            {/* 1A: WP Admin Hide Configuration Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F8FAF9',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0B2522'
                  }}>
                    <Key size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                      WP Admin Hide & Secret Login Gateway
                    </h3>
                  </div>
                </div>

                {/* Target Domain Badge */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#1E293B',
                  letterSpacing: '0.04em'
                }}>
                  TARGET: <span style={{ fontWeight: 800, color: '#0B2522' }}>{targetDomainName}</span>
                </div>
              </div>

              {/* Form Controls - 2 Separate Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                {/* Row 1: Custom Secret Directory Slug */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Custom Secret Directory Slug
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    overflow: 'hidden',
                    height: '38px'
                  }}>
                    <span style={{
                      padding: '0 12px',
                      fontSize: '12px',
                      color: '#64748B',
                      background: '#F8FAFC',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      borderRight: '1px solid #E2E8F0',
                      whiteSpace: 'nowrap',
                      fontWeight: 600
                    }}>
                      {targetDomainName}/
                    </span>
                    <input
                      type="text"
                      value={customLoginSlug}
                      onChange={(e) => setCustomLoginSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveLoginGateway(); } }}
                      placeholder="e.g. mahabub, portal, secure-admin"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: '100%',
                        padding: '0 12px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '12.5px',
                        color: '#0F172A',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Unauthorized Access Action */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Unauthorized Access Action
                  </label>
                  <select
                    value={loginRedirectType}
                    onChange={(e) => setLoginRedirectType(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '7px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    <option value="404">Stealth 404 Not Found (Recommended)</option>
                    <option value="403">Block with HTTP 403 Forbidden Screen</option>
                    <option value="home">Redirect to Website Homepage (301)</option>
                  </select>
                </div>
              </div>

              {/* Action Button Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleSaveLoginGateway}
                  disabled={savingSecret || !customLoginSlug.trim()}
                  className="mdf-btn-primary"
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    borderRadius: '7px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: savingSecret || !customLoginSlug.trim() ? 'not-allowed' : 'pointer',
                    opacity: !customLoginSlug.trim() ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(11,37,34,0.15)'
                  }}
                >
                  <Save size={13} />
                  <span>{savingSecret ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* 2A: Restrict Admin IP Configuration Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F8FAF9',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0B2522'
                  }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                      Restrict Admin Panel & Login Access by IP
                    </h3>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: adminIpWhitelist.length > 0 ? '#ECFDF5' : '#F8FAFC',
                  border: adminIpWhitelist.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                  color: adminIpWhitelist.length > 0 ? '#059669' : '#64748B',
                  letterSpacing: '0.04em'
                }}>
                  {adminIpWhitelist.length > 0 ? `LOCKED (${adminIpWhitelist.length} AUTHORIZED IPS)` : 'ALLOW ALL IPS (UNRESTRICTED)'}
                </div>
              </div>

              {/* Form Controls - 2 Separate Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                {/* Row 1: Detected Public IP Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Detected Public IP Address
                  </label>
                  <div style={{
                    background: '#F8FAF9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    height: '38px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} color="#0B2522" />
                      <span style={{ fontSize: '12px', color: '#1E293B', fontWeight: 600 }}>
                        Current IP: <strong style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#0B2522' }}>{detectedClientIp || '127.0.0.1'}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => detectedClientIp && handleAddAllowedIp(detectedClientIp)}
                      disabled={!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)}
                      style={{
                        height: '26px',
                        padding: '0 10px',
                        borderRadius: '5px',
                        background: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#E2E8F0' : '#0B2522',
                        color: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? '#475569' : '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: (!detectedClientIp || adminIpWhitelist.includes(detectedClientIp)) ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={11} />
                      <span>{adminIpWhitelist.includes(detectedClientIp) ? 'Whitelisted' : '+ Add Current IP'}</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Authorize Admin IP Input Form Row */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Authorize Admin IP Address or CIDR Subnet
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={newAdminIpInput}
                      onChange={(e) => setNewAdminIpInput(e.target.value.trim())}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllowedIp(); } }}
                      placeholder="e.g. 103.120.45.241 or 192.168.1.0/24"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '7px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        color: '#0F172A',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleAddAllowedIp()}
                      disabled={!newAdminIpInput.trim()}
                      style={{
                        height: '38px',
                        padding: '0 16px',
                        borderRadius: '7px',
                        background: '#F1F5F9',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: !newAdminIpInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: !newAdminIpInput.trim() ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={13} />
                      <span>Add IP</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveAdminIpRestriction()}
                  disabled={savingIp}
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    borderRadius: '7px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: savingIp ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(11,37,34,0.15)'
                  }}
                >
                  <Save size={13} />
                  <span>{savingIp ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ROW 2: ACTIVE FLEET REGISTRY CARDS (EQUAL HEIGHT, EQUAL PADDING)          */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>

            {/* 1B: Active Secret Login Gateways & Fleet Registry (Dedicated Card) */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header (Matching 2FA Registry Style) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                      Active Secret Login Gateways & Fleet Registry
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#60716B' }}>
                      Centralized directory of concealed WordPress login entrypoints.
                    </p>
                  </div>
                </div>

                {/* Quick Status Counters & Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {activeSecretGateways.length > 0 && (
                    <div style={{ position: 'relative', width: '170px' }}>
                      <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Search gateways..."
                        value={gatewaySearchQuery}
                        onChange={(e) => setGatewaySearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          height: '28px',
                          padding: '0 20px 0 26px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '11px',
                          color: '#0F172A',
                          outline: 'none'
                        }}
                      />
                      {gatewaySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setGatewaySearchQuery('')}
                          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: activeSecretGateways.length > 0 ? '#E8F3EC' : '#F1F5F3',
                    color: activeSecretGateways.length > 0 ? '#2A8B68' : '#60716B',
                    border: activeSecretGateways.length > 0 ? '1px solid #CFE2D4' : '1px solid #D9E1DC'
                  }}>
                    {activeSecretGateways.length} Sites Protected
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#F1F5F3',
                    color: '#60716B',
                    border: '1px solid #D9E1DC'
                  }}>
                    Active Registry
                  </span>
                </div>
              </div>

              {/* Registry Body: Empty State or Table */}
              {activeSecretGateways.length === 0 ? (
                <div style={{
                  padding: '38px 20px',
                  textAlign: 'center',
                  background: '#FAFBF9',
                  borderRadius: '12px',
                  border: '1px dashed #D9E1DC',
                  margin: '4px 0'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#F1F5F3',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px'
                  }}>
                    <Key size={22} color="#60716B" />
                  </div>
                  <div style={{ fontWeight: 800, color: '#10201E', fontSize: '15px', marginBottom: '4px' }}>
                    No Secret Login Gateways Configured
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#60716B', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.5' }}>
                    Standard <code>/wp-login.php</code> is active across your fleet. Enter a secret directory slug above and click Save to conceal your WordPress administrator gateway.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#F8FAFC' }}>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Target Website</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Login Gateway Slug</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Direct URL</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSecretGateways.map((site, idx) => {
                        const effectiveSlug = site.custom_login_slug || site.hardening?.custom_login_slug || ''
                        const activeUrl = getComputedLoginUrl(site, effectiveSlug)
                        const siteKey = site.id || site._id || idx

                        return (
                          <tr key={siteKey} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Globe size={13} color="#2A8B68" />
                                <span>{site.domain || site.url || 'Connected Site'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <code style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                                /{effectiveSlug}
                              </code>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748B', fontFamily: 'monospace', fontSize: '11.5px' }}>
                              {activeUrl}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => copyLoginUrl(activeUrl, siteKey)}
                                  title="Copy URL"
                                  style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '11px', color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  {copiedId === siteKey ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                  <span>{copiedId === siteKey ? 'Copied' : 'Copy'}</span>
                                </button>
                                <a
                                  href={activeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open in new tab"
                                  style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <ExternalLink size={11} />
                                  <span>Test</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleResetLoginGateway(site)}
                                  disabled={resettingSecretSiteId === siteKey}
                                  title="Remove secret slug & restore /wp-login.php"
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #FECACA',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    cursor: resettingSecretSiteId === siteKey ? 'wait' : 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Trash2 size={11} />
                                  <span>{resettingSecretSiteId === siteKey ? 'Removing...' : 'Remove'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2B: Authorized Admin IP Access Registry (Dedicated Card) */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header (Matching 2FA Registry Style) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                      Authorized Admin IP Access Registry
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#60716B' }}>
                      Strict IP whitelist directory governing administrative access.
                    </p>
                  </div>
                </div>

                {/* Quick Status Counters & Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {allFleetIpRules.length > 0 && (
                    <div style={{ position: 'relative', width: '170px' }}>
                      <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Search IP / domain..."
                        value={ipSearchQuery}
                        onChange={(e) => setIpSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          height: '28px',
                          padding: '0 20px 0 26px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '11px',
                          color: '#0F172A',
                          outline: 'none'
                        }}
                      />
                      {ipSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setIpSearchQuery('')}
                          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: allFleetIpRules.length > 0 ? '#E8F3EC' : '#F1F5F3',
                    color: allFleetIpRules.length > 0 ? '#2A8B68' : '#60716B',
                    border: allFleetIpRules.length > 0 ? '1px solid #CFE2D4' : '1px solid #D9E1DC'
                  }}>
                    {allFleetIpRules.length} Authorized IPs
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#F1F5F3',
                    color: '#60716B',
                    border: '1px solid #D9E1DC'
                  }}>
                    Active Registry
                  </span>
                </div>
              </div>

              {/* Registry Body: Empty State or Table */}
              {allFleetIpRules.length === 0 ? (
                <div style={{
                  padding: '38px 20px',
                  textAlign: 'center',
                  background: '#FAFBF9',
                  borderRadius: '12px',
                  border: '1px dashed #D9E1DC',
                  margin: '4px 0'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#F1F5F3',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px'
                  }}>
                    <ShieldCheck size={22} color="#60716B" />
                  </div>
                  <div style={{ fontWeight: 800, color: '#10201E', fontSize: '15px', marginBottom: '4px' }}>
                    No Admin IP Restrictions Active
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#60716B', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.5' }}>
                    WordPress administrator login is currently accessible from all IP addresses worldwide. Add your public IP or CIDR subnet above to restrict admin access.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#F8FAFC' }}>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Authorized IP / Subnet</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Target Scope</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Access Status</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#64748B', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIpRules.map(({ ip, site }, idx) => {
                        const isCurrent = detectedClientIp && ip === detectedClientIp
                        const ruleKey = `${site?.id || site?.domain || idx}-${ip}`

                        return (
                          <tr key={ruleKey} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>{ip}</span>
                                {isCurrent && (
                                  <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#E8F3EC', color: '#2A8B68', border: '1px solid #CFE2D4', padding: '1px 6px', borderRadius: '4px' }}>
                                    You
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748B' }}>
                              {site?.domain || 'Global Fleet'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                                ✓ Allowed
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveAllowedIp(ip, site)}
                                disabled={deletingIp === ip}
                                title="Remove IP"
                                style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', fontSize: '11px', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Trash2 size={11} />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
