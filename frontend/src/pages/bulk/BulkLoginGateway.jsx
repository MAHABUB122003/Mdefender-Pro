import { useState, useEffect, useMemo, useRef } from 'react'
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
  Layers,
  MoreVertical,
  ShieldAlert,
  ShieldOff
} from 'lucide-react'
import BulkHeader from './BulkHeader'
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
  const [resettingAllIps, setResettingAllIps] = useState(false)
  const [deletingIp, setDeletingIp] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Floating 3-Dots Portal Dropdowns
  const [openGatewayDropdownId, setOpenGatewayDropdownId] = useState(null)
  const [selectedGatewaySite, setSelectedGatewaySite] = useState(null)
  const [gatewayDropdownPos, setGatewayDropdownPos] = useState({ top: 0, right: 0 })
  const gatewayDropdownRef = useRef(null)

  const [openIpDropdownId, setOpenIpDropdownId] = useState(null)
  const [selectedIpRule, setSelectedIpRule] = useState(null)
  const [ipDropdownPos, setIpDropdownPos] = useState({ top: 0, right: 0 })
  const ipDropdownRef = useRef(null)

  // Auto-close dropdowns on click outside, scroll, or resize
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gatewayDropdownRef.current && !gatewayDropdownRef.current.contains(e.target)) {
        setOpenGatewayDropdownId(null)
        setSelectedGatewaySite(null)
      }
      if (ipDropdownRef.current && !ipDropdownRef.current.contains(e.target)) {
        setOpenIpDropdownId(null)
        setSelectedIpRule(null)
      }
    }
    const handleScrollOrResize = (e) => {
      if (gatewayDropdownRef.current && gatewayDropdownRef.current.contains(e.target)) return
      if (ipDropdownRef.current && ipDropdownRef.current.contains(e.target)) return
      setOpenGatewayDropdownId(null)
      setSelectedGatewaySite(null)
      setOpenIpDropdownId(null)
      setSelectedIpRule(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [])

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
  }, [activeTargetSite?.id, activeTargetSite?._id, activeTargetSite?.custom_login_slug, activeTargetSite?.admin_ip_whitelist, selectedSiteId])

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
    let domain = (site?.domain || site?.url || '').trim()
    domain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    if (!domain) domain = 'your-domain.com'
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
      showToast('Please specify a valid secret directory (e.g. mahabub, portal, secure-admin).', true)
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
    setOpenGatewayDropdownId(null)
    setSelectedGatewaySite(null)
    const siteKey = siteToReset.id || siteToReset._id
    const siteDom = siteToReset.domain || siteToReset.url || 'this website'
    if (!window.confirm(`Are you sure you want to delete the secret login gateway for "${siteDom}"? This will restore standard /wp-login.php.`)) {
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

      showToast(`Secret URL deleted for ${siteDom}. Default /wp-login.php restored successfully!`)
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
      const targetSites = isAllTarget ? wpWebsites : [activeTargetSite]

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
        showToast(`Admin IP restriction saved for ${isAllTarget ? 'All Domains' : (targetSites[0]?.domain || 'selected domain')} (${listToSave.length} IP authorized)!`)
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
    setOpenIpDropdownId(null)
    setSelectedIpRule(null)
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
        showToast(`IP ${ipToRemove} deleted for ${targetSite.domain || 'website'}.`)
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
    if (!window.confirm('Are you sure you want to clear all IP restrictions? Admin login will be open to all IPs.')) {
      return
    }
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

  // Active Secret Gateways List (Only show websites that have a custom secret slug configured)
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

  // Card Styles
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

  return (
    <div className="bulk-login-gateway-page" style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      
      {/* Top Banner & Unified Domain Scope Header */}
      <BulkHeader
        badge="GATEWAY PROTECTION"
        title="WP Admin & Login Gateway Security"
        description="Conceal WordPress admin login URLs behind private secret directories and restrict administrative login access strictly to authorized IPs."
      />

      {/* Floating Status Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: toastMsg.isError ? '#DC2626' : '#0B2522',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMsg.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} color="#4ADE80" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {!hasWebsites ? (
        <EmptyFleetState title="No Connected WordPress Sites Found" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
          
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
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                    WP Admin Hide & Custom Secret Login Gateway
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B', lineHeight: '1.45' }}>
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
              
              {/* Secret Slug Form (Clean 2-Column Layout, Redundant Domain Dropdown Removed) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                
                {/* Field 1: Custom Secret Directory Slug */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Custom Secret Directory Slug
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '0 12px', fontSize: '12px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', height: '40px', display: 'flex', alignItems: 'center', borderRight: '1px solid #CBD5E1', whiteSpace: 'nowrap' }}>
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
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0F172A'
                      }}
                    />
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11px', marginTop: '5px', display: 'block' }}>
                    Target Scope: <strong>{isAllTarget ? 'All Domains' : activeTargetSite.domain}</strong>. Only requests to this path will show WordPress login.
                  </small>
                </div>

                {/* Field 2: Unauthorized Intruder Action & Save Button */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Unauthorized Access Action
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      value={loginRedirectType}
                      onChange={(e) => setLoginRedirectType(e.target.value)}
                      style={{
                        flex: '1 1 200px',
                        minWidth: '180px',
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
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 18px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: savingSecret || !customLoginSlug.trim() ? 'not-allowed' : 'pointer',
                        opacity: !customLoginSlug.trim() ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        flex: '0 0 auto'
                      }}
                    >
                      <Save size={14} />
                      <span>{savingSecret ? 'Saving...' : 'Save Secret Gateway'}</span>
                    </button>
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11px', marginTop: '5px', display: 'block' }}>
                    What unauthorized visitors see when attempting to access default /wp-admin.
                  </small>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* CONFIG-REGISTRY TABLE: ACTIVE SECRET LOGIN GATEWAYS                       */}
              {/* ========================================================================= */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#0B2522', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Key size={15} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                        Active Secret Login Gateways & Fleet Registry
                      </h4>
                      <span style={{ fontSize: '11px', color: '#60716B' }}>
                        Concealed WordPress login paths actively protected by MDefender WAF
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#E8F3EC', color: '#2A8B68', border: '1px solid #CFE2D4' }}>
                      {activeSecretGateways.length} Gateways Protected
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#F1F5F3', color: '#60716B', border: '1px solid #D9E1DC' }}>
                      Active Registry
                    </span>
                  </div>
                </div>

                {activeSecretGateways.length === 0 ? (
                  <div style={{
                    padding: '14px 18px',
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#64748B',
                    fontSize: '13px'
                  }}>
                    <Key size={18} color="#94A3B8" />
                    <span>No custom secret login slug configured yet. Standard <code>/wp-login.php</code> is active. Enter a slug above and click Save to conceal it.</span>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', overflowY: 'visible', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', width: '50px' }}>#</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Website / Domain</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Gateway Status</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Secret Login URL</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Unauthorized Action</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSecretGateways.map((site, idx) => {
                          const effectiveSlug = site.custom_login_slug || site.hardening?.custom_login_slug || ''
                          const activeUrl = getComputedLoginUrl(site, effectiveSlug)
                          const siteKey = site.id || site._id || idx
                          const isDropdownOpen = openGatewayDropdownId === siteKey

                          return (
                            <tr
                              key={siteKey}
                              style={{
                                borderBottom: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '14px', color: '#64748B', fontWeight: 700 }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Globe size={14} color="#0F172A" />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                                      {site.domain || site.url || 'Connected Site'}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                                      WordPress Agent v4.1
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '14px' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  padding: '3px 10px', borderRadius: '16px',
                                  background: '#DCFCE7', color: '#166534',
                                  border: '1px solid #86EFAC', fontSize: '11px', fontWeight: 700
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                                  Active & Concealed (/{effectiveSlug})
                                </span>
                              </td>
                              <td style={{ padding: '14px' }}>
                                <a
                                  href={activeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ textDecoration: 'none', display: 'inline-block' }}
                                  title="Click to test secret login in new tab"
                                >
                                  <code style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', background: '#F0FDF4', padding: '4px 9px', borderRadius: '4px', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    {activeUrl}
                                    <ExternalLink size={12} color="#16A34A" />
                                  </code>
                                </a>
                              </td>
                              <td style={{ padding: '14px', color: '#334155', fontWeight: 600 }}>
                                {(site.login_redirect_type === 'home' || site.hardening?.login_redirect_type === 'home') ? 'Homepage (301)' : 'Stealth (404)'}
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDropdownOpen) {
                                      setOpenGatewayDropdownId(null);
                                      setSelectedGatewaySite(null);
                                      return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const menuHeight = 150;
                                    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;
                                    setGatewayDropdownPos({
                                      top: openUpwards ? (rect.top - menuHeight - 4) : (rect.bottom + 6),
                                      right: Math.max(16, window.innerWidth - rect.right)
                                    });
                                    setOpenGatewayDropdownId(siteKey);
                                    setSelectedGatewaySite(site);
                                  }}
                                  style={{
                                    width: '32px', height: '32px', borderRadius: '6px',
                                    border: '1px solid #CBD5E1', background: isDropdownOpen ? '#0F172A' : '#FFFFFF',
                                    color: isDropdownOpen ? '#FFFFFF' : '#0F172A', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Manage Gateway Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                    Restrict Admin Panel & Login Access by IP
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B', lineHeight: '1.45' }}>
                    Limit access to <code>/wp-admin</code> and login gateways strictly to authorized IP addresses. Unauthorized visitors are blocked with 403.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badgeStyle(displayedIpRules.length > 0 ? '#F0FDF4' : '#F8FAFC', displayedIpRules.length > 0 ? '#15803D' : '#64748B', displayedIpRules.length > 0 ? '#BBF7D0' : '#E2E8F0')}>
                  {displayedIpRules.length > 0 ? `${displayedIpRules.length} ACTIVE IP RULE(S)` : 'ALLOW ALL IPS (UNRESTRICTED)'}
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

              {/* Add IP Input & Action Buttons (No Redundant Dropdown!) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Authorize Admin IP Address or CIDR Subnet
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
                      minWidth: '240px',
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
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} />
                    <span>Add IP to List</span>
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
                      fontSize: '12px',
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
                <small style={{ color: '#64748B', fontSize: '11px', marginTop: '5px', display: 'block' }}>
                  Target Scope: <strong>{isAllTarget ? 'All Domains' : (activeTargetSite.domain || 'Selected Site')}</strong>. Accepts single IPv4, IPv6, or CIDR blocks.
                </small>
              </div>

              {/* ========================================================================= */}
              {/* CONFIG-REGISTRY TABLE: AUTHORIZED ADMIN IP ACCESS                         */}
              {/* ========================================================================= */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#0B2522', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                        Authorized Admin IP Access Registry
                      </h4>
                      <span style={{ fontSize: '11px', color: '#60716B' }}>
                        Strict IP whitelist rules for WordPress administrator login gateways
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: displayedIpRules.length > 0 ? '#E8F3EC' : '#F1F5F3', color: displayedIpRules.length > 0 ? '#2A8B68' : '#64748B', border: '1px solid #CFE2D4' }}>
                      {displayedIpRules.length > 0 ? `${displayedIpRules.length} Authorized IPs` : 'Allow All IPs (Unrestricted)'}
                    </span>
                    {displayedIpRules.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAllAdminIps()}
                        disabled={resettingAllIps}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: resettingAllIps ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{resettingAllIps ? 'Clearing...' : 'Clear All IPs'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {displayedIpRules.length === 0 ? (
                  <div style={{
                    padding: '14px 18px',
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#64748B',
                    fontSize: '13px'
                  }}>
                    <ShieldCheck size={18} color="#94A3B8" />
                    <span>No IP restrictions active. WordPress admin login is accessible from all IP addresses. Add an IP above to lock access.</span>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', overflowY: 'visible', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', width: '50px' }}>#</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Authorized IP / Subnet</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Domain Scope</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Access Permission</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>Enforcement</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedIpRules.map(({ ip, site }, idx) => {
                          const isCurrent = detectedClientIp && ip === detectedClientIp
                          const ruleKey = `${site?.id || site?.domain || idx}-${ip}`
                          const isDropdownOpen = openIpDropdownId === ruleKey

                          return (
                            <tr
                              key={ruleKey}
                              style={{
                                borderBottom: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '14px', color: '#64748B', fontWeight: 700 }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Server size={14} color="#0F172A" />
                                  </div>
                                  <code style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                                    {ip}
                                  </code>
                                  {isCurrent && (
                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '12px', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
                                      YOUR CURRENT IP
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '14px', color: '#0F172A', fontWeight: 700 }}>
                                {site?.domain || 'All Domains'}
                              </td>
                              <td style={{ padding: '14px' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  padding: '3px 9px', borderRadius: '14px',
                                  background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                                  fontSize: '11px', fontWeight: 700
                                }}>
                                  <ShieldCheck size={13} color="#16A34A" />
                                  Admin Login Allowed
                                </span>
                              </td>
                              <td style={{ padding: '14px', color: '#64748B', fontSize: '12px' }}>
                                Strict Whitelist Active
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDropdownOpen) {
                                      setOpenIpDropdownId(null);
                                      setSelectedIpRule(null);
                                      return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const menuHeight = 120;
                                    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;
                                    setIpDropdownPos({
                                      top: openUpwards ? (rect.top - menuHeight - 4) : (rect.bottom + 6),
                                      right: Math.max(16, window.innerWidth - rect.right)
                                    });
                                    setOpenIpDropdownId(ruleKey);
                                    setSelectedIpRule({ ip, site });
                                  }}
                                  style={{
                                    width: '32px', height: '32px', borderRadius: '6px',
                                    border: '1px solid #CBD5E1', background: isDropdownOpen ? '#0F172A' : '#FFFFFF',
                                    color: isDropdownOpen ? '#FFFFFF' : '#0F172A', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Manage IP Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* FLOATING ACTION DROPDOWN FOR SECRET GATEWAY                               */}
          {/* ========================================================================= */}
          {openGatewayDropdownId && selectedGatewaySite && (
            <div
              ref={gatewayDropdownRef}
              style={{
                position: 'fixed',
                top: `${gatewayDropdownPos.top}px`,
                right: `${gatewayDropdownPos.right}px`,
                width: '220px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06)',
                zIndex: 99999,
                padding: '6px',
                textAlign: 'left'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={getComputedLoginUrl(selectedGatewaySite, selectedGatewaySite.custom_login_slug || selectedGatewaySite.hardening?.custom_login_slug)}
                target="_blank"
                rel="noreferrer"
                onClick={() => { setOpenGatewayDropdownId(null); setSelectedGatewaySite(null); }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: 'none', background: 'transparent', textAlign: 'left',
                  fontSize: '12px', fontWeight: 600, color: '#0F172A',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  textDecoration: 'none', boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ExternalLink size={14} color="#0F172A" />
                <span>Test Secret Gateway</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const u = getComputedLoginUrl(selectedGatewaySite, selectedGatewaySite.custom_login_slug || selectedGatewaySite.hardening?.custom_login_slug);
                  copyLoginUrl(u, selectedGatewaySite.id || selectedGatewaySite._id);
                  setOpenGatewayDropdownId(null);
                  setSelectedGatewaySite(null);
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: 'none', background: 'transparent', textAlign: 'left',
                  fontSize: '12px', fontWeight: 600, color: '#0F172A',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Copy size={14} color="#0F172A" />
                <span>Copy Secret URL</span>
              </button>

              <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }} />

              <button
                type="button"
                onClick={() => {
                  handleResetLoginGateway(selectedGatewaySite);
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: 'none', background: 'transparent', textAlign: 'left',
                  fontSize: '12px', fontWeight: 700, color: '#DC2626',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Undo2 size={14} color="#DC2626" />
                <span>Remove / Reset Gateway</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FLOATING ACTION DROPDOWN FOR AUTHORIZED IP                                */}
          {/* ========================================================================= */}
          {openIpDropdownId && selectedIpRule && (
            <div
              ref={ipDropdownRef}
              style={{
                position: 'fixed',
                top: `${ipDropdownPos.top}px`,
                right: `${ipDropdownPos.right}px`,
                width: '210px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06)',
                zIndex: 99999,
                padding: '6px',
                textAlign: 'left'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(selectedIpRule.ip);
                    showToast(`IP ${selectedIpRule.ip} copied to clipboard!`);
                  }
                  setOpenIpDropdownId(null);
                  setSelectedIpRule(null);
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: 'none', background: 'transparent', textAlign: 'left',
                  fontSize: '12px', fontWeight: 600, color: '#0F172A',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Copy size={14} color="#0F172A" />
                <span>Copy IP Address</span>
              </button>

              <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }} />

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove IP "${selectedIpRule.ip}" from authorized access for ${selectedIpRule.site?.domain || 'this website'}?`)) {
                    handleRemoveAllowedIp(selectedIpRule.ip, selectedIpRule.site);
                  }
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: 'none', background: 'transparent', textAlign: 'left',
                  fontSize: '12px', fontWeight: 700, color: '#DC2626',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={14} color="#DC2626" />
                <span>Remove / Delete IP Access</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
