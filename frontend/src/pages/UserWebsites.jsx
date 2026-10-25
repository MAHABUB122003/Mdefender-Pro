import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'
import DnsZoneDrawer from '../components/DnsZoneDrawer'
import WordPressLogo from '../components/WordPressLogo'
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Key,
  RotateCw,
  Plus,
  Trash2,
  ExternalLink,
  Flame,
  Check,
  Copy,
  Eye,
  EyeOff,
  Download,
  Server,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  ArrowRight,
  Lock,
  MoreVertical,
  Sliders,
  Activity,
  FileText
} from 'lucide-react'

export default function UserWebsites() {
  const cachedData = userStore.get('websites') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Dedicated WordPress Websites (Filtered to exclude pure domains)
  const wpWebsites = useMemo(() => {
    const list = data?.websites || []
    return list.filter(w => {
      const p = (w.platform || '').toLowerCase()
      return p === 'wordpress' || p === 'wp' || p.startsWith('wordpress')
    })
  }, [data])

  // Domain Zone Management Modal (if needed for edge routing)
  const [selectedZoneWebsite, setSelectedZoneWebsite] = useState(null)

  const rawPlan = data?.user?.plan || data?.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_plan') : null) || 'free'
  const userPlan = (typeof rawPlan === 'string' ? rawPlan : (rawPlan?.id || rawPlan?.name || 'free')).toLowerCase()
  const isPremium = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)

  // API Key & Integration Modal State
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [modalKey, setModalKey] = useState('')
  const [modalDomain, setModalDomain] = useState('')
  const [modalWebsiteId, setModalWebsiteId] = useState('')
  const [modalTab, setModalTab] = useState('wordpress')
  const [isMasked, setIsMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Upgrade prompt modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [togglingAttack, setTogglingAttack] = useState({})

  // Three-dots dropdown menu state
  const [activeMenuSiteId, setActiveMenuSiteId] = useState(null)

  // GitHub-Style Delete Confirmation Modal State
  const [deleteModalSite, setDeleteModalSite] = useState(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deletingSite, setDeletingSite] = useState(false)

  // Close 3-dots dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.site-actions-menu-container')) {
        setActiveMenuSiteId(null)
      }
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const apiEndpoint = window.location.origin

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
      userStore.set('websites', result)
      userStore.set('dashboard', result)
    } catch (err) {
      console.error('Error fetching websites dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddWebsite = async (e) => {
    e.preventDefault()
    setFeedbackMsg(null)
    if (!newWebsite.trim()) return

    // Clean up domain: strip http(s)://, trailing slash, path
    let cleanDomain = newWebsite.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    cleanDomain = cleanDomain.split('/')[0].trim().toLowerCase()

    if (!cleanDomain) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid website domain or hostname.' })
      return
    }

    setAdding(true)
    try {
      const res = await api.addUserWebsite({ domain: cleanDomain, platform: 'wordpress' })
      if (res?.status === 'error') {
        if (res.message && res.message.toLowerCase().includes('upgrade to premium')) {
          setShowUpgradeModal(true)
        } else {
          setFeedbackMsg({ type: 'error', text: res.message || 'Failed to connect website.' })
        }
        return
      }

      const siteKey = res?.api_key || res?.website?.api_key || ''
      setModalKey(siteKey)
      setModalDomain(cleanDomain)
      setModalWebsiteId(res?.website?._id || res?.website?.id || '')
      setModalTab('wordpress')
      setIsMasked(false)
      setShowKeyModal(true)

      setNewWebsite('')
      setFeedbackMsg({ type: 'success', text: `WordPress site "${cleanDomain}" connected successfully!` })
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchData()
    } catch (err) {
      const errMsg = err.message || 'Failed to connect website. Please try again.'
      if (errMsg.toLowerCase().includes('upgrade') || errMsg.toLowerCase().includes('limit')) {
        setShowUpgradeModal(true)
      } else {
        setFeedbackMsg({ type: 'error', text: errMsg })
      }
    } finally {
      setAdding(false)
    }
  }

  const handleOpenKeyModal = (w) => {
    const domain = w.domain || w.name || w.url || 'My Website'
    const id = w.id || w._id || ''
    setModalDomain(domain)
    setModalWebsiteId(id)
    const key = w.api_key || data?.api_key || ''
    setModalKey(key)
    setIsMasked(true)
    setModalTab('wordpress')
    setShowKeyModal(true)
  }

  const [verifyingDnsId, setVerifyingDnsId] = useState(null)

  const handleVerifyDns = async (w) => {
    const siteId = w.id || w._id || ''
    const domainName = w.domain || w.name || w.url || ''
    if (!siteId) return
    setVerifyingDnsId(siteId)
    setFeedbackMsg(null)
    try {
      const res = await api.verifyWebsiteDns(siteId)
      const isVerified = res?.data?.verified || res?.verified
      if (isVerified) {
        setFeedbackMsg({
          type: 'success',
          text: `🎉 DNS Verified! Domain "${domainName}" is now actively routed through MDefender Anycast Edge.`
        })
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res?.data?.message || res?.message || `DNS verification pending for ${domainName}. Please ensure your NS or CNAME records have propagated.`
        })
      }
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchData()
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Failed to verify DNS for ${domainName}`
      })
    } finally {
      setVerifyingDnsId(null)
    }
  }

  const handleToggleUnderAttack = async (w) => {
    const siteId = w.id || w._id
    if (!siteId) return
    const currentVal = Boolean(w.under_attack_mode)
    const newVal = !currentVal

    // Optimistic UI update
    setData(prev => {
      if (!prev) return prev
      const updatedList = (prev.websites || []).map(item => {
        if ((item.id || item._id) === siteId) {
          return { ...item, under_attack_mode: newVal }
        }
        return item
      })
      return { ...prev, websites: updatedList }
    })

    setTogglingAttack(prev => ({ ...prev, [siteId]: true }))
    try {
      const res = await api.toggleWebsiteUnderAttack(siteId, newVal)
      if (res?.status === 'success' || res?.data?.under_attack_mode !== undefined) {
        setFeedbackMsg({
          type: 'success',
          text: newVal
            ? `⚡ "I'm Under Attack" Mode ACTIVATED for ${w.domain || 'site'}! All incoming bot floods will be stopped with Proof-of-Work challenge.`
            : `✅ "I'm Under Attack" Mode DEACTIVATED for ${w.domain || 'site'}. Standard WAF protection resumed.`
        })
        userStore.invalidate('websites')
        userStore.invalidate('dashboard')
      }
    } catch (err) {
      console.error('Failed to toggle under attack mode:', err)
      // Rollback on failure
      setData(prev => {
        if (!prev) return prev
        const updatedList = (prev.websites || []).map(item => {
          if ((item.id || item._id) === siteId) {
            return { ...item, under_attack_mode: currentVal }
          }
          return item
        })
        return { ...prev, websites: updatedList }
      })
      setFeedbackMsg({ type: 'error', text: 'Failed to update Under Attack Mode: ' + (err.message || 'Server error') })
    } finally {
      setTogglingAttack(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const handleRegenerateKey = async () => {
    if (!confirm(`Are you sure you want to regenerate the API key for ${modalDomain}? Any active connections using the old key will be disconnected.`)) return
    setRegenerating(true)
    try {
      const res = await api.regenerateApiKey({ website_id: modalWebsiteId })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setIsMasked(false)
        userStore.invalidate('websites')
        userStore.invalidate('dashboard')
        fetchData()
      } else {
        alert('Failed to regenerate key')
      }
    } catch (err) {
      alert(err.message || 'Error regenerating key')
    } finally {
      setRegenerating(false)
    }
  }

  const handleInitiateDelete = (w) => {
    setActiveMenuSiteId(null)
    setDeleteModalSite(w)
    setDeleteConfirmInput('')
  }

  const handleConfirmDeleteWebsite = async () => {
    if (!deleteModalSite) return
    const domainName = deleteModalSite.domain || deleteModalSite.name || deleteModalSite.url || ''
    if (deleteConfirmInput.trim().toLowerCase() !== domainName.toLowerCase()) return

    const targetId = deleteModalSite.id || deleteModalSite._id || deleteModalSite.website_id || domainName
    setDeletingSite(true)
    try {
      await api.removeUserWebsite(targetId)
      setFeedbackMsg({ type: 'success', text: `Website "${domainName}" disconnected and removed successfully.` })
      userStore.clear()
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      setDeleteModalSite(null)
      setDeleteConfirmInput('')
      await fetchData()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to remove website' })
    } finally {
      setDeletingSite(false)
    }
  }

  const handleCopyKey = async () => {
    if (!modalKey) return
    const ok = await copyToClipboard(modalKey)
    if (ok) {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2200)
    }
  }

  const handleCopyEndpoint = async () => {
    const ok = await copyToClipboard(apiEndpoint)
    if (ok) {
      setCopiedEndpoint(true)
      setTimeout(() => setCopiedEndpoint(false), 2200)
    }
  }

  const handleCopySnippet = async (code) => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2200)
    }
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
        <div>Loading your protected websites...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0 40px' }}>
      {/* Premium Banner */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '12px', border: '1px solid #fde68a',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-crown" style={{ fontSize: '20px', color: '#d97706' }}></i>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#92400e' }}>Free Tier Active</div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>Upgrade to Enterprise Pro for up to 10 protected domains, real-time ML rules &amp; priority telemetry.</div>
            </div>
          </div>
          <a href="/user/settings" style={{
            padding: '8px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}>
            <i className="fas fa-arrow-up"></i> Upgrade to Premium
          </a>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div style={{
          padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: feedbackMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: feedbackMsg.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WORDPRESS SECURITY & CONNECT FLEET HERO CARD                           */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)',
        padding: '24px 26px',
        marginBottom: '24px',
        position: 'relative'
      }}>
        {/* Top Integration Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBF9 60%, #F5F9F6 100%)',
          borderRadius: '12px',
          border: '1px solid #D9E1DC',
          padding: '18px 22px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#FAFBF9',
              border: '1.5px solid #D9E1DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 32, 30, 0.04)',
              position: 'relative',
              flexShrink: 0
            }}>
              <WordPressLogo size={28} color="#10201E" />
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #FFFFFF'
              }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Official MDefender Pro WordPress Security
                </h3>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#F0FDF4',
                  color: '#15803D',
                  border: '1px solid #DCFCE7'
                }}>
                  v2.0 ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>
                Kernel-level PHP AST engine, real-time Layer 7 WAF, and autonomous malware quarantine.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/api/v1/wordpress/download"
              download="mdefender-pro.zip"
              style={{
                padding: '9px 18px',
                background: '#15803D',
                color: '#FFFFFF',
                borderRadius: '9px',
                fontSize: '12.5px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(21, 128, 61, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={14} />
              <span>Download Plugin (.ZIP)</span>
            </a>

            <Link
              to="/user/domains"
              style={{
                padding: '9px 16px',
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                color: '#10201E',
                borderRadius: '9px',
                fontSize: '12.5px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Globe size={14} color="#2A8B68" />
              <span>Cloud WAF Domains &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Connect Form */}
        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
          Connect a WordPress website to generate a dedicated Site API Key:
        </div>

        <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <Globe size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#87948D' }} />
            <input
              type="text"
              placeholder="e.g. mahabub.shop or blog.company.com"
              value={newWebsite}
              onChange={e => setNewWebsite(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 16px 0 40px',
                border: '1.5px solid #D9E1DC',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontFamily: 'inherit',
                background: '#FAFBF9',
                color: '#10201E',
                fontWeight: '600',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            style={{
              height: '44px',
              padding: '0 24px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: adding ? 'not-allowed' : 'pointer',
              background: '#10201E',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 2px 8px rgba(16, 32, 30, 0.2)',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            {adding ? (
              <>
                <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WordPressLogo size={18} variant="stencil" color="#FFFFFF" />
                <span>Connect WordPress Site</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROTECTED WORDPRESS WEBSITES LIST                                      */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)',
        overflow: 'visible'
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #F1F5F2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Protected WordPress Websites</span>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#F1F5F3',
                color: '#10201E',
                fontWeight: '800',
                border: '1px solid #D9E1DC'
              }}>
                {wpWebsites.length}
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B' }}>
              Manage WordPress site API keys, edge security status, and Under Attack enforcement.
            </p>
          </div>

          <button
            onClick={fetchData}
            style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#10201E'
            }}
          >
            <RotateCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        <div>
          {wpWebsites.length ? wpWebsites.map((w, i) => {
            const domainName = w.domain || w.url || w.name || w
            const isAttacked = !!w.under_attack_mode

            return (
              <div
                key={w.id || w._id || i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 24px',
                  borderBottom: i < wpWebsites.length - 1 ? '1px solid #F1F5F2' : 'none',
                  transition: 'background 0.15s ease',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                {/* Left: Authentic Vector WordPress Logo + Domain Telemetry */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#FAFBF9',
                    border: '1.5px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(16, 32, 30, 0.04)',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <WordPressLogo size={28} color="#10201E" />
                    <span style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#10B981',
                      border: '2px solid #FFFFFF'
                    }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={`https://${domainName}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#10201E',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>{domainName}</span>
                        <ExternalLink size={12} color="#87948D" />
                      </a>

                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#F0FDF4',
                        color: '#15803D',
                        border: '1px solid #DCFCE7',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
                        <span>{w.status || 'Active'}</span>
                      </span>

                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#F1F5F3',
                        color: '#1E293B',
                        border: '1px solid #D9E1DC',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <WordPressLogo size={12} color="#10201E" />
                        <span>WordPress Plugin</span>
                      </span>

                      {isAttacked && (
                        <span style={{
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Flame size={12} />
                          <span>Under Attack Mode Active</span>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#87948D', marginTop: '3px' }}>
                      Connected: {w.added_at ? (typeof w.added_at === 'string' ? w.added_at.split('T')[0] : 'Protected') : 'Protected'} &bull; Real-time Edge WAF Synced
                    </div>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Under Attack Toggle */}
                  <button
                    onClick={() => handleToggleUnderAttack(w)}
                    disabled={togglingAttack[w.id || w._id]}
                    title={isAttacked ? "Under Attack Mode is ACTIVE (Proof-of-Work challenge active for all bots). Click to disable." : "Click to activate 'I'm Under Attack' Mode to block aggressive DDoS & botnets"}
                    style={{
                      padding: '7px 14px',
                      background: isAttacked ? '#FEF2F2' : '#FFFFFF',
                      color: isAttacked ? '#DC2626' : '#475569',
                      border: isAttacked ? '1px solid #FECACA' : '1px solid #D9E1DC',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Flame size={13} color={isAttacked ? '#DC2626' : '#87948D'} />
                    <span>{isAttacked ? 'Under Attack: ON' : "I'm Under Attack"}</span>
                  </button>

                  {/* Setup Guide & Key */}
                  <button
                    onClick={() => handleOpenKeyModal(w)}
                    style={{
                      padding: '7px 16px',
                      background: '#10201E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(16, 32, 30, 0.15)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Key size={13} />
                    <span>Setup Guide &amp; Key</span>
                  </button>

                  {/* Three-Dots Actions Dropdown Menu */}
                  <div className="site-actions-menu-container" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const sId = w.id || w._id || i
                        setActiveMenuSiteId(activeMenuSiteId === sId ? null : sId)
                      }}
                      title="More Options"
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: '1px solid #D9E1DC',
                        background: activeMenuSiteId === (w.id || w._id || i) ? '#F1F5F3' : '#FFFFFF',
                        color: '#10201E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3' }}
                      onMouseLeave={e => {
                        if (activeMenuSiteId !== (w.id || w._id || i)) e.currentTarget.style.background = '#FFFFFF'
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown Menu Popup */}
                    {activeMenuSiteId === (w.id || w._id || i) && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 'calc(100% + 6px)',
                          background: '#FFFFFF',
                          border: '1px solid #D9E1DC',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(16, 32, 30, 0.12), 0 0 1px rgba(0,0,0,0.1)',
                          width: '210px',
                          zIndex: 1000,
                          padding: '6px',
                          animation: 'fadeIn 0.15s ease'
                        }}
                      >
                        <a
                          href={`https://${domainName}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#10201E',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            boxSizing: 'border-box',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <ExternalLink size={14} color="#15803D" />
                          <span>Visit Website</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuSiteId(null)
                            handleOpenKeyModal(w)
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#10201E',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <Key size={14} color="#D97706" />
                          <span>Setup Guide &amp; Key</span>
                        </button>

                        <a
                          href={`/user/logs?domain=${encodeURIComponent(domainName)}`}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#10201E',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            boxSizing: 'border-box',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <Activity size={14} color="#2563EB" />
                          <span>View Traffic Logs</span>
                        </a>

                        <a
                          href="/user/rules"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#10201E',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            boxSizing: 'border-box',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <Sliders size={14} color="#6366F1" />
                          <span>Configure WAF Rules</span>
                        </a>

                        <div style={{ height: '1px', background: '#F1F5F2', margin: '4px 0' }} />

                        <button
                          type="button"
                          onClick={() => handleInitiateDelete(w)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#DC2626',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <Trash2 size={14} />
                          <span>Disconnect &amp; Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: '#64748B' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                boxShadow: '0 2px 8px rgba(16, 32, 30, 0.04)'
              }}>
                <WordPressLogo size={34} color="#10201E" />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                No WordPress Sites Connected Yet
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#87948D' }}>
                Enter your website domain above to generate your dedicated API key and activate real-time WAF protection.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENTERPRISE-GRADE PRO API KEY & INTEGRATION HUB MODAL (WHITE DASHBOARD THEME) */}
      {/* ========================================================================= */}
      {showKeyModal && (
        <div
          onClick={() => setShowKeyModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '24px 16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              width: '100%', maxWidth: '720px', maxHeight: '90vh',
              overflowY: 'auto', display: 'flex', flexDirection: 'column',
              color: '#0f172a',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 26px',
              borderBottom: '1px solid #D9E1DC',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: '#FAFBF9',
                  border: '1.5px solid #D9E1DC',
                  boxShadow: '0 2px 6px rgba(16, 32, 30, 0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative'
                }}>
                  <WordPressLogo size={28} color="#10201E" />
                  <span style={{
                    position: 'absolute', bottom: '-2px', right: '-2px',
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: '#10B981', border: '2px solid #FFFFFF'
                  }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E', letterSpacing: '-0.2px' }}>
                      WordPress Security &amp; API Integration Hub
                    </h3>
                    <span style={{
                      fontSize: '10.5px', fontWeight: '800', color: '#15803D',
                      background: '#F0FDF4', border: '1px solid #DCFCE7',
                      padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                      Active WAF
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Target Host:</span>
                    <strong style={{
                      color: '#10201E', background: '#FAFBF9', padding: '1px 8px',
                      borderRadius: '6px', border: '1px solid #D9E1DC', fontFamily: 'Consolas, Monaco, monospace'
                    }}>
                      {modalDomain}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowKeyModal(false)}
                aria-label="Close modal"
                style={{
                  background: '#FAFBF9', border: '1px solid #D9E1DC',
                  color: '#64748B', width: '34px', height: '34px', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3'; e.currentTarget.style.color = '#10201E'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FAFBF9'; e.currentTarget.style.color = '#64748B'; }}
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 26px' }}>
              
              {/* API Key Vault Card */}
              <div style={{
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                borderRadius: '14px', padding: '16px 18px', marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(16, 32, 30, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-lock" style={{ fontSize: '12px', color: '#10201E' }}></i>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#10201E' }}>
                      Dedicated WordPress API Key
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: '800', color: '#15803D',
                      background: '#F0FDF4', border: '1px solid #DCFCE7', padding: '1px 6px', borderRadius: '4px',
                      marginLeft: '4px'
                    }}>
                      PRODUCTION
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    style={{
                      background: '#FFFFFF', border: '1px solid #D9E1DC',
                      color: '#475569', padding: '4px 10px', borderRadius: '6px',
                      fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F3'; e.currentTarget.style.color = '#10201E'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <i className={`fas ${isMasked ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    <span>{isMasked ? 'Reveal Key' : 'Hide Key'}</span>
                  </button>
                </div>

                {/* Key Display & One-Click Copy */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#FFFFFF', border: '1.5px solid #D9E1DC',
                  borderRadius: '10px', padding: '6px 6px 6px 14px',
                  boxShadow: 'inset 0 1px 2px rgba(16, 32, 30, 0.02)'
                }}>
                  <div style={{
                    flex: 1, fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13px', color: isMasked ? '#87948D' : '#10201E',
                    letterSpacing: isMasked ? '2px' : '0.4px', wordBreak: 'break-all',
                    fontWeight: '700', userSelect: isMasked ? 'none' : 'all'
                  }}>
                    {isMasked
                      ? (modalKey ? '•'.repeat(Math.min(modalKey.length || 32, 34)) : '••••••••••••••••••••••••••••••••')
                      : (modalKey || 'No API key generated')}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      padding: '8px 16px',
                      background: copiedKey ? '#15803D' : '#10201E',
                      color: '#FFFFFF', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 2px 6px rgba(16, 32, 30, 0.15)',
                      transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    <i className={`fas ${copiedKey ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                {/* Security footer under key */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-shield-halved" style={{ color: '#15803D' }}></i>
                    <span>Enter this key inside MDefender Pro WordPress plugin settings.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    style={{
                      background: 'none', border: 'none', color: '#DC2626',
                      fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      opacity: regenerating ? 0.6 : 1
                    }}
                  >
                    <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                    <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
                  </button>
                </div>
              </div>

              {/* Integration Guides Hub */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <WordPressLogo size={18} color="#10201E" />
                      <span>WordPress Plugin Setup (3 Easy Steps)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      Follow these simple steps to connect and arm MDefender Pro on your WordPress site.
                    </div>
                  </div>
                </div>

                {/* WordPress Setup Guide Card */}
                <div style={{
                  background: '#FFFFFF', border: '1px solid #D9E1DC',
                  borderRadius: '14px', padding: '18px', color: '#334155'
                }}>
                  {/* WordPress Download Card */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#FAFBF9',
                    border: '1px solid #D9E1DC', borderRadius: '12px',
                    padding: '14px 16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '10px',
                        background: '#FAFBF9',
                        border: '1px solid #D9E1DC',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0
                      }}>
                        <WordPressLogo size={30} color="#10201E" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#10201E' }}>
                          MDefender Pro WordPress Security Plugin
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          Official release v2.0 &bull; Real-time Layer 7 WAF &amp; Malware scanner
                        </div>
                      </div>
                    </div>

                    <a
                      href="/api/v1/wordpress/download"
                      download="mdefender-pro.zip"
                      style={{
                        padding: '8px 16px', background: '#15803D',
                        color: '#FFFFFF', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                        boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Download size={14} />
                      <span>Download Plugin (.ZIP)</span>
                    </a>
                  </div>

                  {/* Step-by-Step Setup */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%', background: '#F1F5F3',
                        color: '#10201E', border: '1px solid #D9E1DC', fontSize: '11px', fontWeight: '800', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>1</span>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                        Upload the plugin in your WordPress Dashboard under <strong>Plugins &rarr; Add New Plugin &rarr; Upload Plugin</strong> and click <strong>Activate</strong>.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%', background: '#F1F5F3',
                        color: '#10201E', border: '1px solid #D9E1DC', fontSize: '11px', fontWeight: '800', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>2</span>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155', flex: 1 }}>
                        In WP Admin &rarr; <strong>MDefender Pro &rarr; Settings</strong>, paste your <strong>Site Secret API Key</strong>:
                        <div style={{
                          marginTop: '6px', background: '#FAFBF9', border: '1px solid #D9E1DC',
                          borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: '8px'
                        }}>
                          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#10201E', wordBreak: 'break-all', fontWeight: '700' }}>
                            {modalKey || 'API_KEY_HERE'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyKey}
                            style={{
                              background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#10201E',
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <i className={`fas ${copiedKey ? 'fa-check text-green-600' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                            {copiedKey ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%', background: '#F1F5F3',
                        color: '#10201E', border: '1px solid #D9E1DC', fontSize: '11px', fontWeight: '800', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>3</span>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155', flex: 1 }}>
                        Set <strong>API Endpoint URL</strong> to:
                        <div style={{
                          marginTop: '6px', background: '#FAFBF9', border: '1px solid #D9E1DC',
                          borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: '8px'
                        }}>
                          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#10201E', fontWeight: '700' }}>
                            {apiEndpoint}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyEndpoint}
                            style={{
                              background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#10201E',
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <i className={`fas ${copiedEndpoint ? 'fa-check text-green-600' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                            {copiedEndpoint ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 26px',
              borderTop: '1px solid #D9E1DC',
              background: '#FAFBF9',
              borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-book-open" style={{ color: '#10201E' }}></i>
                <span>Need setup help? Check the <a href="/docs" target="_blank" rel="noreferrer" style={{ color: '#15803D', textDecoration: 'none', fontWeight: '700' }}>WAF Documentation &rarr;</a></span>
              </div>

              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  height: '38px', padding: '0 24px', borderRadius: '9px', fontSize: '13px', fontWeight: '800',
                  background: '#10201E', color: '#FFFFFF',
                  border: 'none', boxShadow: '0 2px 8px rgba(16, 32, 30, 0.2)', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Done &amp; Activated
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Limit Prompt Modal (Clean White Theme) */}
      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)', width: '100%', maxWidth: '480px',
              padding: '32px', textAlign: 'center', color: '#0f172a'
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              marginBottom: '18px', boxShadow: '0 8px 20px rgba(217, 119, 6, 0.25)'
            }}>
              <i className="fas fa-crown"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px' }}>
              Upgrade to Premium Plan
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }}>
              Your current plan website limit has been reached. Upgrade to Enterprise Pro to connect up to 10 protected domains, unlock real-time ML threat detection, and priority support.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Close
              </button>
              <a
                href="/user/settings"
                style={{
                  padding: '10px 24px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)'
                }}
              >
                <i className="fas fa-bolt"></i> Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* GITHUB-STYLE DELETE / DISCONNECT CONFIRMATION MODAL                       */}
      {/* ========================================================================= */}
      {deleteModalSite && (
        <div
          onClick={() => !deletingSite && setDeleteModalSite(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(16, 32, 30, 0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '18px',
              border: '1.5px solid #FECACA',
              boxShadow: '0 25px 60px -15px rgba(220, 38, 38, 0.25)',
              width: '100%', maxWidth: '480px',
              overflow: 'hidden', color: '#10201E'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #FEE2E2',
              background: '#FEF2F2',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: '#FFFFFF', border: '1px solid #FECACA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#DC2626'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#991B1B' }}>
                    Disconnect &amp; Delete Website
                  </h3>
                  <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '1px' }}>
                    Irreversible destructive action
                  </div>
                </div>
              </div>
              <button
                onClick={() => !deletingSite && setDeleteModalSite(null)}
                style={{
                  background: 'none', border: 'none', color: '#991B1B',
                  cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                This will permanently disconnect <strong>{deleteModalSite.domain || deleteModalSite.name || 'this website'}</strong> from MDefender Pro. All active Layer 7 edge filtering, malware quarantining, and dedicated API keys will be immediately revoked.
              </p>

              <div style={{
                background: '#FAFBF9', border: '1px solid #D9E1DC',
                borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
                fontSize: '12.5px', color: '#10201E'
              }}>
                <div>To confirm, type the exact domain name below:</div>
                <div style={{
                  marginTop: '6px', fontFamily: 'Consolas, Monaco, monospace',
                  fontWeight: '800', color: '#DC2626', background: '#FFFFFF',
                  padding: '6px 10px', borderRadius: '6px', border: '1px dashed #FECACA',
                  userSelect: 'all'
                }}>
                  {deleteModalSite.domain || deleteModalSite.name || ''}
                </div>
              </div>

              <input
                type="text"
                placeholder="Type domain name to confirm"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                disabled={deletingSite}
                style={{
                  width: '100%', height: '42px', padding: '0 14px',
                  border: '1.5px solid ' + (deleteConfirmInput.trim().toLowerCase() === (deleteModalSite.domain || deleteModalSite.name || '').toLowerCase() ? '#DC2626' : '#D9E1DC'),
                  borderRadius: '9px', fontSize: '13.5px', fontWeight: '600',
                  background: '#FFFFFF', color: '#10201E', outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #F1F5F2',
              background: '#FAFBF9', display: 'flex', justifyContent: 'flex-end', gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setDeleteModalSite(null)}
                disabled={deletingSite}
                style={{
                  padding: '9px 18px', background: '#FFFFFF', border: '1px solid #D9E1DC',
                  borderRadius: '8px', fontSize: '12.5px', fontWeight: '700',
                  color: '#475569', cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteWebsite}
                disabled={
                  deletingSite ||
                  deleteConfirmInput.trim().toLowerCase() !== (deleteModalSite.domain || deleteModalSite.name || '').toLowerCase()
                }
                style={{
                  padding: '9px 20px',
                  background: deleteConfirmInput.trim().toLowerCase() === (deleteModalSite.domain || deleteModalSite.name || '').toLowerCase() ? '#DC2626' : '#FCA5A5',
                  border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '800',
                  color: '#FFFFFF',
                  cursor: deleteConfirmInput.trim().toLowerCase() === (deleteModalSite.domain || deleteModalSite.name || '').toLowerCase() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  boxShadow: deleteConfirmInput.trim().toLowerCase() === (deleteModalSite.domain || deleteModalSite.name || '').toLowerCase() ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {deletingSite ? (
                  <>
                    <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>I understand, delete this website</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      <DnsZoneDrawer
        isOpen={!!selectedZoneWebsite}
        website={selectedZoneWebsite}
        onClose={() => setSelectedZoneWebsite(null)}
        onRecordUpdated={async () => {
          userStore.invalidate('websites')
          userStore.invalidate('dashboard')
          await fetchData()
        }}
      />
    </div>
  )
}
