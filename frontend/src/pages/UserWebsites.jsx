import { useState, useEffect, useCallback, useMemo } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import api from '../api/api'

import userStore from '../utils/userStore'

import copyToClipboard from '../utils/clipboard'

// DnsZoneDrawer removed

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

  const [feedbackMsg, setFeedbackMsg] = useState(null)



  // Dedicated WordPress Websites
  const wpWebsites = useMemo(() => {
    const list = data?.websites || []
    return list.filter(w => (w.platform || '').toLowerCase() === 'wordpress' || (w.platform || '').toLowerCase().startsWith('wp'))
  }, [data])



  // Domain Zone Management Modal (if needed for edge routing)

  const [selectedZoneWebsite, setSelectedZoneWebsite] = useState(null)



  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const testTrialParam = urlParams ? urlParams.get('test_trial_days') : null
  const testProParam = urlParams ? urlParams.get('test_pro') : null

  const accountApiKey = data?.api_key || data?.user?.api_key || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_api_key') : null) || ''
  const rawPlan = testProParam === 'true'
    ? 'pro'
    : (data?.user?.plan || data?.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_plan') : null) || 'free')

  const userPlan = (typeof rawPlan === 'string' ? rawPlan : (rawPlan?.id || rawPlan?.name || 'free')).toLowerCase()

  const isPremium = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan)
  const displayTrialDays = testTrialParam !== null
    ? Number(testTrialParam)
    : (data?.user?.trial_days_remaining !== undefined ? data.user.trial_days_remaining : 14)



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
  const [ssoLoadingId, setSsoLoadingId] = useState(null)
  const [copiedAccountKey, setCopiedAccountKey] = useState(false)
  const [showAccountKey, setShowAccountKey] = useState(false)
  const [currentAccountKey, setCurrentAccountKey] = useState(() => accountApiKey)
  const [regeneratingAccountKey, setRegeneratingAccountKey] = useState(false)

  useEffect(() => {
    if (accountApiKey && accountApiKey !== currentAccountKey) {
      setCurrentAccountKey(accountApiKey)
    }
  }, [accountApiKey])

  useEffect(() => {
    const handleKeyUpdate = (e) => {
      if (e?.detail) {
        setCurrentAccountKey(e.detail)
      }
    }
    window.addEventListener('mdefender_api_key_updated', handleKeyUpdate)
    return () => window.removeEventListener('mdefender_api_key_updated', handleKeyUpdate)
  }, [])



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



  const fetchData = useCallback(async (force = false) => {

    try {

      const [dashRes, sitesRes] = await Promise.allSettled([

        api.getUserDashboard(force ? { refresh: '1' } : {}),

        api.getUserWebsites()

      ])



      const dashData = dashRes.status === 'fulfilled' ? dashRes.value : null

      const sitesData = sitesRes.status === 'fulfilled' ? sitesRes.value : null



      const dashList = dashData?.websites || dashData?.data?.websites || []

      const v1List = sitesData?.data?.websites || sitesData?.websites || []



      // Merge both sources by domain / id so nothing is ever dropped

      const mergedMap = new Map()

      for (const w of [...dashList, ...v1List]) {

        const key = (w.domain || w.id || w._id || '').toLowerCase()

        if (key) {

          mergedMap.set(key, { ...(mergedMap.get(key) || {}), ...w })

        }

      }

      const allWebsites = Array.from(mergedMap.values())



      const finalData = {

        ...(dashData || {}),

        websites: allWebsites

      }



      setData(finalData)

      userStore.set('websites', finalData)

      userStore.set('dashboard', finalData)

    } catch (err) {

      console.error('Error fetching websites dashboard:', err)

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    fetchData(true)

  }, [fetchData])


  const handleOpenKeyModal = (w) => {
    const domain = w.domain || w.name || w.url || 'My Website'
    const id = w.id || w._id || ''
    setModalDomain(domain)
    setModalWebsiteId(id)
    // Synchronize directly with active Workspace API Key so WordPress pairing is 100% unified
    const key = currentAccountKey || accountApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_api_key') : '') || w.api_key || ''
    setModalKey(key)
    setIsMasked(true)
    setModalTab(w.platform === 'custom_sdk' ? 'sdk' : 'wordpress')
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



  const handleOneClickSso = async (w) => {
    const siteId = w.id || w._id
    if (!siteId) return
    setSsoLoadingId(siteId)
    setFeedbackMsg(null)

    // Synchronously open tab immediately on click to prevent browser popup block & lag
    const newTab = window.open('about:blank', '_blank')
    if (newTab) {
      try {
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>MDefender Pro &bull; Opening WP Admin</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #0B2522;
                color: #FFFFFF;
              }
              .box {
                text-align: center;
                padding: 32px 36px;
                background: #10201E;
                border: 1px solid #1E3A34;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                max-width: 360px;
              }
              .spinner {
                width: 34px;
                height: 34px;
                border: 3px solid rgba(255,255,255,0.15);
                border-top-color: #10B981;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              h3 { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #FFFFFF; }
              p { margin: 0; font-size: 12.5px; color: #94A3B8; line-height: 1.4; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="spinner"></div>
              <h3>Connecting WP Admin...</h3>
              <p>Authenticating remote session via cryptographic single-use token.</p>
            </div>
          </body>
          </html>
        `)
      } catch (e) {
        // Safe fallback
      }
    }

    const fallbackUrl = ((w.url || ('https://' + w.domain)).replace(/\/+$/, '')) + '/wp-login.php'

    try {
      const res = await api.getWordpressSsoToken(siteId)
      const ssoUrl = res?.data?.sso_url || res?.sso_url || res?.data?.url || res?.url
      if (ssoUrl) {
        if (newTab) {
          newTab.location.href = ssoUrl
        } else {
          window.open(ssoUrl, '_blank', 'noopener,noreferrer')
        }
      } else {
        if (newTab) {
          newTab.location.href = fallbackUrl
        }
        setFeedbackMsg({
          type: 'warning',
          text: 'Remote SSO is disabled on this site. Opened standard WordPress login.'
        })
      }
    } catch (err) {
      if (newTab) {
        newTab.location.href = fallbackUrl
      }
      setFeedbackMsg({
        type: 'warning',
        text: 'Remote SSO unavailable. Opened standard WordPress login.'
      })
    } finally {
      setSsoLoadingId(null)
    }
  }

  const handleRegenerateAccountKey = async () => {
    if (!confirm('Are you sure you want to regenerate your MDefender Pro API Key? Any connected WordPress sites using the current key will need to be updated with the new key.')) {
      return
    }
    setRegeneratingAccountKey(true)
    try {
      const res = await api.regenerateApiKey()
      const newKey = res?.api_key || res?.data?.api_key
      if (newKey) {
        setCurrentAccountKey(newKey)
        setModalKey(newKey)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mdefender_api_key', newKey)
        }
        window.dispatchEvent(new CustomEvent('mdefender_api_key_updated', { detail: newKey }))
        setFeedbackMsg({ type: 'success', text: 'MDefender Pro API Key regenerated successfully!' })
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to regenerate API Key.' })
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error regenerating API Key' })
    } finally {
      setRegeneratingAccountKey(false)
    }
  }

  const handleRegenerateKey = async () => {

    if (!confirm(`Are you sure you want to regenerate the API key for ${modalDomain}? Any active connections using the old key will be disconnected.`)) return

    setRegenerating(true)

    try {

      const res = await api.regenerateApiKey({ website_id: modalWebsiteId })

      if (res && res.api_key) {
        setModalKey(res.api_key)
        setCurrentAccountKey(res.api_key)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mdefender_api_key', res.api_key)
        }
        window.dispatchEvent(new CustomEvent('mdefender_api_key_updated', { detail: res.api_key }))
        setIsMasked(false)
        userStore.invalidate('websites')
        userStore.invalidate('dashboard')
        fetchData()
        setFeedbackMsg({ type: 'success', text: `API key regenerated successfully.` })
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to regenerate site API key.' })
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error regenerating site API key' })
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



    // 1. Optimistic removal: instantly drop from screen

    setData(prev => {

      const prevList = prev?.websites || []

      const updatedList = prevList.filter(w => {

        const wDom = (w.domain || w.name || w.url || '').toLowerCase()

        const wId = String(w.id || w._id || '')

        return wDom !== domainName.toLowerCase() && wId !== String(targetId)

      })

      const updated = { ...(prev || {}), websites: updatedList }

      userStore.set('websites', updated)

      userStore.set('dashboard', updated)

      return updated

    })



    try {

      await api.removeUserWebsite(targetId, domainName)

      setFeedbackMsg({ type: 'success', text: `Website "${domainName}" disconnected and removed successfully.` })

      userStore.clear()

      userStore.invalidate('websites')

      userStore.invalidate('dashboard')

      setDeleteModalSite(null)

      setDeleteConfirmInput('')

      await fetchData(true)

    } catch (err) {

      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to remove website' })

      await fetchData(true)

    } finally {

      setDeletingSite(false)

    }

  }



  const handleCopyKey = async () => {
    const keyToCopy = modalKey || currentAccountKey || accountApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_api_key') : '') || ''
    if (!keyToCopy) return

    const ok = await copyToClipboard(keyToCopy)
    if (ok) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mdefender_api_key', keyToCopy)
      }
      window.dispatchEvent(new CustomEvent('mdefender_api_key_updated', { detail: keyToCopy }))
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

      {/* Modern 14-Day Enterprise Trial Bar (Hidden permanently for PRO subscribers) */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(11, 37, 34, 0.04), rgba(42, 139, 104, 0.08))',
          borderRadius: '12px',
          border: '1px solid rgba(42, 139, 104, 0.25)',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0B2522, #164E48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
              boxShadow: '0 2px 6px rgba(11, 37, 34, 0.2)'
            }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '16px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>14-Day Enterprise Trial Active</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#E0F2FE',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                  padding: '2px 8px',
                  borderRadius: '20px'
                }}>
                  {displayTrialDays !== undefined ? `${displayTrialDays} Days Remaining` : 'Full Access'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                All autonomous WAF rules, AI threat heuristics, and malware defenses are fully active on all your connected sites.
              </div>
            </div>
          </div>
          <a href="/user/pricing" style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg, #0B2522, #1A4D45)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(11, 37, 34, 0.15)',
            transition: 'all 0.15s ease'
          }}>
            <i className="fas fa-bolt" style={{ color: '#FCD34D' }}></i> Upgrade to PRO ($4/mo)
          </a>
        </div>
      )}



      {/* Feedback Banner */}

      {feedbackMsg && (

        <div style={{

          padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600',

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

                  fontSize: '10px',

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

              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>

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

                background: '#0B2522',

                color: '#FFFFFF',

                borderRadius: '9px',

                fontSize: '12px',

                fontWeight: '700',

                textDecoration: 'none',

                display: 'inline-flex',

                alignItems: 'center',

                gap: '6px',

                boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',

                transition: 'all 0.15s ease'

              }}

            >

              <Download size={14} />

              <span>Download Plugin (.ZIP)</span>

            </a>

          </div>

        </div>



        {/* Sleek Minimalist Workspace API Key Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={15} color="#0B2522" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                Workspace API Key
              </span>
              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0'
              }}>
                Auto-Pairing
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#64748B' }}>
              Used to pair and authenticate WordPress websites with MDefender Pro
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Monospace Key Display with Mask Toggle */}
            <div style={{
              flex: '1 1 360px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '7px',
              padding: '7px 12px',
              fontFamily: 'Consolas, monospace',
              fontSize: '12.5px',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              letterSpacing: '0.02em'
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {showAccountKey
                  ? (currentAccountKey || accountApiKey || '••••••••••••••••••••••••••••••••')
                  : (currentAccountKey || accountApiKey
                      ? `${(currentAccountKey || accountApiKey).slice(0, 10)}••••••••••••••••••••••••${(currentAccountKey || accountApiKey).slice(-8)}`
                      : '••••••••••••••••••••••••••••••••')
                }
              </span>
              <button
                type="button"
                onClick={() => setShowAccountKey(!showAccountKey)}
                title={showAccountKey ? 'Mask API Key' : 'Reveal API Key'}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 4px', marginLeft: '8px' }}
              >
                {showAccountKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => {
                const keyToCopy = currentAccountKey || accountApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_api_key') : '') || ''
                if (!keyToCopy) return
                copyToClipboard(keyToCopy)
                setCopiedAccountKey(true)
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('mdefender_api_key', keyToCopy)
                }
                window.dispatchEvent(new CustomEvent('mdefender_api_key_updated', { detail: keyToCopy }))
                setTimeout(() => setCopiedAccountKey(false), 2000)
              }}
              style={{
                height: '34px',
                padding: '0 16px',
                background: '#0B2522',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(11, 37, 34, 0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              {copiedAccountKey ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              <span>{copiedAccountKey ? 'Copied Key!' : 'Copy API Key'}</span>
            </button>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRegenerateAccountKey}
              disabled={regeneratingAccountKey}
              style={{
                height: '34px',
                padding: '0 13px',
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: regeneratingAccountKey ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Rotate your Workspace Connect Key"
            >
              <RotateCw size={12} className={regeneratingAccountKey ? 'animate-spin' : ''} />
              <span>{regeneratingAccountKey ? 'Rotating...' : 'Rotate Key'}</span>
            </button>
          </div>
        </div>
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

            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>

              Manage WordPress site API keys, edge security status, and Under Attack enforcement.

            </p>

          </div>



          <button

            onClick={() => fetchData(true)}

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

                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

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

                        fontSize: '10px',

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
                        fontSize: '10px',
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

                      {(w.trial_days_remaining !== undefined && w.trial_days_remaining !== null) ? (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: w.trial_days_remaining > 0 ? '#EFF6FF' : '#FEF2F2',
                          color: w.trial_days_remaining > 0 ? '#1D4ED8' : '#DC2626',
                          border: w.trial_days_remaining > 0 ? '1px solid #BFDBFE' : '1px solid #FECACA',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Sparkles size={11} color={w.trial_days_remaining > 0 ? '#2563EB' : '#DC2626'} />
                          <span>{w.trial_days_remaining > 0 ? `${w.trial_days_remaining}d Trial Active` : 'Trial Expired'}</span>
                        </span>
                      ) : (w.subscription_status === 'active' || isPremium) ? (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#F0FDF4',
                          color: '#15803D',
                          border: '1px solid #DCFCE7',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle2 size={11} color="#15803D" />
                          <span>Pro Active</span>
                        </span>
                      ) : null}



                      {isAttacked && (

                        <span style={{

                          fontSize: '10px',

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



                    <div style={{ fontSize: '11px', color: '#87948D', marginTop: '3px' }}>

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



                  {/* 1-Click Cryptographic Remote WP-Admin Login */}
                  <button
                    type="button"
                    onClick={() => handleOneClickSso(w)}
                    disabled={ssoLoadingId === (w.id || w._id)}
                    title="1-Click Cryptographic Remote WP-Admin Login"
                    style={{
                      padding: '7px 14px',
                      background: '#047857',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: ssoLoadingId === (w.id || w._id) ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#065F46' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#047857' }}
                  >
                    {ssoLoadingId === (w.id || w._id) ? (
                      <RotateCw size={13} className="animate-spin" />
                    ) : (
                      <Zap size={13} color="#FBBF24" />
                    )}
                    <span>{ssoLoadingId === (w.id || w._id) ? 'Opening...' : 'Open WP-Admin'}</span>
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

                      fontSize: '12px',

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

                            fontSize: '12px',

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
                            handleOneClickSso(w)
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#047857',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ECFDF5' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <Zap size={14} color="#059669" />
                          <span>Open WP-Admin (1-Click SSO)</span>
                        </button>



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

                            fontSize: '12px',

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

                            fontSize: '12px',

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

                            fontSize: '12px',

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
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px 16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '18px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.6)',
              width: '100%', maxWidth: '540px',
              display: 'flex', flexDirection: 'column',
              color: '#0F172A',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative'
                }}>
                  <WordPressLogo size={24} color="#0F172A" />
                  <span style={{
                    position: 'absolute', bottom: '-2px', right: '-2px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#10B981', border: '2px solid #FFFFFF'
                  }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.2px' }}>
                      WordPress API Key
                    </h3>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', color: '#059669',
                      background: '#ECFDF5', border: '1px solid #A7F3D0',
                      padding: '2px 7px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                      Active WAF
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Target Host:</span>
                    <code style={{
                      color: '#0F172A', background: '#F1F5F9', padding: '1px 6px',
                      borderRadius: '5px', fontFamily: 'Consolas, Monaco, monospace', fontSize: '11px', fontWeight: '600'
                    }}>
                      {modalDomain}
                    </code>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowKeyModal(false)}
                aria-label="Close modal"
                style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                  color: '#64748B', width: '32px', height: '32px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>
              {/* API Key Vault Card */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px', padding: '16px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-key" style={{ fontSize: '11px', color: '#059669' }}></i>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0F172A' }}>
                      Site Secret API Key
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    style={{
                      background: '#FFFFFF', border: '1px solid #CBD5E1',
                      color: '#475569', padding: '4px 10px', borderRadius: '6px',
                      fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <i className={`fas ${isMasked ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    <span>{isMasked ? 'Reveal Key' : 'Hide Key'}</span>
                  </button>
                </div>

                {/* Key Display & One-Click Copy */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#FFFFFF', border: '1.5px solid #CBD5E1',
                  borderRadius: '10px', padding: '6px 6px 6px 12px',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)'
                }}>
                  <div style={{
                    flex: 1, fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13px', color: isMasked ? '#94A3B8' : '#0F172A',
                    letterSpacing: isMasked ? '2px' : '0.4px', wordBreak: 'break-all',
                    fontWeight: '700', userSelect: isMasked ? 'none' : 'all'
                  }}>
                    {isMasked
                      ? (modalKey
                        ? `${modalKey.slice(0, 10)}••••••••••••••••••••••••${modalKey.slice(-8)}`
                        : '••••••••••••••••••••••••••••••••')
                      : (modalKey || 'No API key generated')}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      padding: '7px 14px',
                      background: copiedKey ? '#ECFDF5' : '#2563EB',
                      color: copiedKey ? '#059669' : '#FFFFFF',
                      border: `1px solid ${copiedKey ? '#A7F3D0' : '#2563EB'}`,
                      borderRadius: '7px',
                      cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
                      transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    <i className={`fas ${copiedKey ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                {/* Actions & Hint */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-shield-halved" style={{ color: '#059669' }}></i>
                    <span>Enter this key inside MDefender Pro WordPress plugin settings.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    style={{
                      background: 'none', border: 'none', color: '#DC2626',
                      fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      opacity: regenerating ? 0.6 : 1
                    }}
                  >
                    <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                    <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
                  </button>
                </div>
              </div>

              {/* Status Metadata Strip */}
              <div style={{
                marginTop: '16px',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px'
              }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Integration</div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <WordPressLogo size={14} color="#0F172A" /> WordPress
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Authentication</div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    Bearer Token
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WAF Shield</div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#059669', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span> Armed
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-lock" style={{ color: '#94A3B8' }}></i>
                <span>Keep this key private. Never expose it in client code.</span>
              </div>

              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{
                  height: '36px', padding: '0 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                  background: '#0F172A', color: '#FFFFFF',
                  border: 'none', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Done
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
              width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #0B2522 0%, #1A4D45 100%)',
              color: '#34D399', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              marginBottom: '18px', boxShadow: '0 8px 20px rgba(11, 37, 34, 0.25)'
            }}>
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px' }}>
              Expand Your Fleet Capacity
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }}>
              Your current site limit has been reached. Upgrade to Enterprise Pro for just $4.00/site/month (or $40/year with 2 months free) to protect additional domains with sub-millisecond edge ML filtering.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  padding: '10px 20px', background: '#FFFFFF', color: '#10201E', border: '1px solid #D9E1DC',
                  borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Close
              </button>
              <a
                href="/user/pricing"
                style={{
                  padding: '10px 24px', background: 'linear-gradient(135deg, #0B2522 0%, #1A4D45 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(11, 37, 34, 0.3)'
                }}
              >
                <i className="fas fa-bolt"></i> View Pricing &amp; Plans
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

                  <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '1px' }}>

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

                fontSize: '12px', color: '#10201E'

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

                  borderRadius: '9px', fontSize: '13px', fontWeight: '600',

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

                  borderRadius: '8px', fontSize: '12px', fontWeight: '700',

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

                  border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '800',

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







    </div>

  )

}

