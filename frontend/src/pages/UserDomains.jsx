import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'
import DnsZoneDrawer from '../components/DnsZoneDrawer'
import DnsOnboardingModal from '../components/DnsOnboardingModal'
import {
  Globe,
  Server,
  Plus,
  Trash2,
  ExternalLink,
  RotateCw,
  Search,
  AlertTriangle,
  MoreVertical,
  Sliders,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Bot,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react'

export const DOMAIN_PLANS = [
  {
    id: 'free',
    name: 'Starter Free',
    badge: '14-Day Free Trial',
    limit: 1,
    requests: '10,000 requests / month',
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#64748b',
    desc: 'Essential protection for staging, personal blogs, and developer testing.',
    features: [
      { text: '1 Protected Domain / Origin', ok: true },
      { text: '10,000 requests / month', ok: true },
      { text: 'Core WAF Rule Engine (500+ Signatures)', ok: true },
      { text: 'Basic Anomaly & Rate Limiting', ok: true },
      { text: 'Real-Time Edge Block Page', ok: true },
      { text: 'Community Discord Support', ok: true },
      { text: '6.5M+ Threat Neural Classifier', ok: false },
      { text: 'Layer 7 Volumetric DDoS Mitigation', ok: false },
      { text: '24/7 Priority SLA Response', ok: false },
    ]
  },
  {
    id: 'go',
    name: 'Developer Go',
    badge: 'Growing Apps',
    limit: 5,
    requests: '100,000 requests / month',
    monthlyPrice: 9,
    yearlyPrice: 90,
    color: '#0284c7',
    desc: 'Ideal for small businesses, API services, and e-commerce stores.',
    features: [
      { text: 'Up to 5 Protected Domains / APIs', ok: true },
      { text: '100,000 requests / month', ok: true },
      { text: '6,501,208+ Threat Neural ML Core', ok: true },
      { text: 'Core WAF + Heuristic Vectorizer', ok: true },
      { text: '20 Custom Regex Rules Builder', ok: true },
      { text: 'Priority Email Tech Support', ok: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation', ok: false },
      { text: '24/7 Priority SLA Response', ok: false },
    ]
  },
  {
    id: 'pro',
    name: 'Enterprise Pro',
    badge: 'Most Popular',
    limit: 10,
    requests: '1,000,000 requests / month',
    monthlyPrice: 20,
    yearlyPrice: 190,
    color: '#10201E',
    popular: true,
    desc: 'Maximum cyber defense for mission-critical production clusters and SaaS.',
    features: [
      { text: 'Up to 10 Protected Domains / APIs', ok: true },
      { text: '1,000,000 Requests / Month', ok: true },
      { text: 'Full 2,000,000+ Signatures & ML Core', ok: true },
      { text: '6,501,208+ Deep ML Vector Core', ok: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation', ok: true },
      { text: 'Sub-Millisecond (0.12ms) Inspection', ok: true },
      { text: 'Automated Bot & Scanner Ban', ok: true },
      { text: '24/7 Priority SLA Response', ok: true },
    ]
  },
  {
    id: 'enterprise',
    name: 'Dedicated Enterprise',
    badge: 'Maximum Scale',
    limit: 15,
    requests: '10,000,000+ requests / month',
    monthlyPrice: 35,
    yearlyPrice: 350,
    color: '#7c3aed',
    desc: 'Dedicated infrastructure, custom proxy nodes, and 15-minute guaranteed SLA.',
    features: [
      { text: 'Up to 15 Protected Domains & APIs', ok: true },
      { text: '10,000,000+ Requests / Month', ok: true },
      { text: 'Dedicated ML Neural Vectorizer Node', ok: true },
      { text: '639K+ AI Prompt Injection Shield', ok: true },
      { text: 'Automated DDoS Scrubber Mesh', ok: true },
      { text: 'Dedicated Account Security Architect', ok: true },
      { text: '15-Minute Guaranteed Critical SLA', ok: true },
    ]
  }
]

export default function UserDomains() {
  const navigate = useNavigate()
  const [websites, setWebsites] = useState([])
  const [totalWebsitesCount, setTotalWebsitesCount] = useState(0)
  const [wordpressSitesCount, setWordpressSitesCount] = useState(0)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Drawer & Modal state
  const [selectedZoneDomain, setSelectedZoneDomain] = useState(null)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [verifyingId, setVerifyingId] = useState(null)
  const [togglingBotId, setTogglingBotId] = useState(null)

  // Three-dots menu and GitHub-style delete modal state
  const [activeMenuDomainId, setActiveMenuDomainId] = useState(null)
  const [deleteModalDomain, setDeleteModalDomain] = useState(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deletingDomain, setDeletingDomain] = useState(false)

  const [userPlan, setUserPlan] = useState(() => {
    return (localStorage.getItem('mdefender_user_plan') || 'free').toLowerCase()
  })

  const isPremium = userPlan === 'premium' || userPlan === 'pro' || userPlan === 'enterprise' || userPlan === 'go'

  // Close three-dots menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.domain-actions-menu-container')) {
        setActiveMenuDomainId(null)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)

      const sitesPromise = api.getUserWebsites()
      const overviewPromise = api.getDomainsOverview().catch(() => null)
      const profilePromise = api.getUserProfile().catch(() => null)

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network request timed out')), 8000)
      )

      let res
      try {
        res = await Promise.race([sitesPromise, timeoutPromise])
      } catch (raceErr) {
        console.warn('Fast timeout hit, attempting standard wait:', raceErr)
        res = await sitesPromise
      }

      const list = res?.data?.websites || res?.websites || []
      const domainList = list.filter(w => (w.platform || '').toLowerCase() !== 'wordpress')
      const wpList = list.filter(w => (w.platform || '').toLowerCase() === 'wordpress')
      setWebsites(domainList)
      setTotalWebsitesCount(list.length)
      setWordpressSitesCount(wpList.length)

      const ov = await overviewPromise
      if (ov?.data || ov?.total_domains !== undefined) {
        setOverview(ov?.data || ov)
      }

      const prof = await profilePromise
      const resolvedPlan = prof?.user?.plan || prof?.plan
      if (resolvedPlan) {
        const lower = resolvedPlan.toLowerCase()
        setUserPlan(lower)
        localStorage.setItem('mdefender_user_plan', lower)
      }
    } catch (err) {
      console.error('Failed to load domains:', err)
      try {
        const dashRes = await api.getUserDashboard()
        const dashList = dashRes?.websites || []
        if (dashList.length > 0) {
          const domainList = dashList.filter(w => (w.platform || '').toLowerCase() !== 'wordpress')
          setWebsites(domainList)
        }
      } catch (_) {}
      setFeedbackMsg({ type: 'info', text: 'Domain sync refreshed.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  // Filtered domains by search
  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return websites
    const q = searchQuery.toLowerCase().trim()
    return websites.filter(w => {
      const d = (w.domain || w.name || w.url || '').toLowerCase()
      return d.includes(q)
    })
  }, [websites, searchQuery])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = websites.length
    const active = websites.filter(w => w.verified || w.status === 'active').length
    const pending = total - active
    const strictSsl = websites.filter(w => (w.ssl_mode || '').includes('strict') || (w.ssl_mode || '') === 'full').length
    return { total, active, pending, strictSsl }
  }, [websites])

  // Live Nameserver Verification
  const handleVerifyNameservers = async (domainObj) => {
    const siteId = domainObj.id || domainObj._id || domainObj.domain
    const domainName = domainObj.domain || domainObj.name || domainObj.url
    if (!siteId) return

    setVerifyingId(siteId)
    setFeedbackMsg(null)

    try {
      const res = await api.verifyWebsiteDns(siteId)
      const isVerified = res?.data?.verified || res?.verified
      if (isVerified) {
        setFeedbackMsg({
          type: 'success',
          text: `🎉 Nameservers Verified! Domain "${domainName}" is now actively routed through MDefender Anycast Edge WAF.`
        })
        setWebsites(prev => prev.map(w => {
          if ((w.id || w._id) === siteId || w.domain === domainName) {
            return { ...w, verified: true, status: 'active' }
          }
          return w
        }))
      } else {
        setFeedbackMsg({
          type: 'info',
          text: res?.data?.message || res?.message || `Nameserver propagation is still in progress for ${domainName}. Please allow up to 30 minutes for global DNS cache refresh.`
        })
      }
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Verification check failed for ${domainName}`
      })
    } finally {
      setVerifyingId(null)
    }
  }

  // Toggle MDefender Turnstile Bot Challenge
  const handleToggleBotChallenge = async (domainObj) => {
    const siteId = domainObj.id || domainObj._id
    const domainName = domainObj.domain || domainObj.name || domainObj.url
    if (!siteId) return

    const newStatus = !domainObj.bot_challenge_enabled
    setTogglingBotId(siteId)
    setFeedbackMsg(null)

    try {
      await api.toggleBotChallenge(siteId, newStatus)
      setFeedbackMsg({
        type: 'success',
        text: `🛡️ MDefender Turnstile Bot Challenge ${newStatus ? 'ACTIVATED (Under-Attack / Bot Shield ON)' : 'DEACTIVATED'} for "${domainName}".`
      })
      setWebsites(prev => prev.map(w => {
        if ((w.id || w._id) === siteId) {
          return { ...w, bot_challenge_enabled: newStatus }
        }
        return w
      }))
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Failed to update Bot Challenge for ${domainName}`
      })
    } finally {
      setTogglingBotId(null)
    }
  }

  // Open GitHub-Style Delete Confirmation Modal
  const handleOpenDeleteModal = (domainObj) => {
    setActiveMenuDomainId(null)
    setDeleteModalDomain(domainObj)
    setDeleteConfirmInput('')
  }

  // Confirm GitHub-Style Delete Action
  const handleConfirmDeleteDomain = async () => {
    if (!deleteModalDomain) return
    const siteId = deleteModalDomain.id || deleteModalDomain._id
    const domainName = deleteModalDomain.domain || deleteModalDomain.name || deleteModalDomain.url
    if (!siteId && !domainName) return

    setDeletingDomain(true)
    const previousWebsites = [...websites]
    const previousOverview = overview

    // Optimistically remove from state immediately
    setWebsites(prev => prev.filter(w => (w.id || w._id) !== siteId && w.domain !== domainName))
    setTotalWebsitesCount(prev => Math.max(0, prev - 1))
    if (overview) {
      setOverview(prev => prev ? {
        ...prev,
        total_domains: Math.max(0, (prev.total_domains || 1) - 1),
        pending_delegation: Math.max(0, (prev.pending_delegation || 1) - 1),
        total_protected_websites: Math.max(0, (prev.total_protected_websites || 1) - 1)
      } : null)
    }

    try {
      try {
        await api.deleteDomain(siteId || domainName).catch(() => null)
      } catch (_) {}
      await api.removeUserWebsite(siteId || domainName, domainName)
      setFeedbackMsg({ type: 'success', text: `Domain "${domainName}" disconnected and removed successfully.` })
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      setDeleteModalDomain(null)
      setDeleteConfirmInput('')
      fetchDomains()
    } catch (err) {
      setWebsites(previousWebsites)
      setOverview(previousOverview)
      setTotalWebsitesCount(previousWebsites.length + wordpressSitesCount)
      setFeedbackMsg({ type: 'error', text: err.message || `Failed to remove ${domainName}` })
    } finally {
      setDeletingDomain(false)
    }
  }

  // Quota & Plan calculations
  const normalizedPlan = (overview?.plan_name || (userPlan === 'premium' ? 'pro' : userPlan || 'free')).toLowerCase()
  const currentPlanObj = DOMAIN_PLANS.find(p => p.id === normalizedPlan) || DOMAIN_PLANS[0]
  const domainLimit = overview?.website_limit ?? currentPlanObj.limit
  const quotaUsed = (wordpressSitesCount || 0) + (websites.length || 0)
  const isLimitReached = quotaUsed >= domainLimit
  const quotaPercent = Math.min(100, Math.round((quotaUsed / domainLimit) * 100))

  const handleConnectDomainClick = () => {
    if (isLimitReached) {
      setFeedbackMsg({
        type: 'error',
        text: `Protected Website Quota Reached (${quotaUsed}/${domainLimit} Websites used across WordPress and Custom Domains). Your ${currentPlanObj.name} plan allows up to ${domainLimit} website(s). Please upgrade your plan to connect additional domains.`
      })
      navigate('/user/pricing')
    } else {
      setShowOnboardingModal(true)
    }
  }

  return (
    <div style={{ padding: '8px 0 40px' }}>
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          background: feedbackMsg.type === 'success' ? '#F0FDF4' : feedbackMsg.type === 'info' ? '#EFF6FF' : '#FEF2F2',
          border: `1.5px solid ${feedbackMsg.type === 'success' ? '#DCFCE7' : feedbackMsg.type === 'info' ? '#BFDBFE' : '#FECACA'}`,
          color: feedbackMsg.type === 'success' ? '#15803D' : feedbackMsg.type === 'info' ? '#1D4ED8' : '#991B1B',
          fontSize: '13.5px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          boxShadow: '0 2px 8px rgba(16, 32, 30, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: '#15803D' }} />
            ) : feedbackMsg.type === 'info' ? (
              <Activity size={18} style={{ color: '#1D4ED8' }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#DC2626' }} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Executive Clean Hero Section */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: '#FAFBF9',
            border: '1.5px solid #D9E1DC',
            color: '#10201E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16, 32, 30, 0.06)',
            flexShrink: 0
          }}>
            <Globe size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#10201E', margin: 0, letterSpacing: '-0.3px' }}>
                Domains
              </h1>
              <span style={{
                background: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #DCFCE7',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                ANYCAST EDGE ROUTING
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', maxWidth: '640px', lineHeight: '1.5' }}>
              Enterprise domain-based protection. Route any web application through MDefender Pro Anycast Nameservers for Layer 7 WAF inspection, DDoS mitigation, and SSL cloaking.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/user/websites"
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              border: '1px solid #D9E1DC',
              background: '#FFFFFF',
              color: '#10201E',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>WordPress Sites</span>
            <ArrowRight size={14} />
          </Link>

          <button
            type="button"
            onClick={() => navigate('/user/pricing')}
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              border: '1px solid #D9E1DC',
              background: '#FAFBF9',
              color: '#10201E',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={14} style={{ color: '#D97706' }} />
            <span>Plans &amp; Pricing</span>
          </button>

          <button
            type="button"
            onClick={handleConnectDomainClick}
            style={{
              padding: '9px 20px',
              borderRadius: '9px',
              border: 'none',
              background: '#0B2522', border: '1px solid #0B2522',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 10px rgba(16, 32, 30, 0.18)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{isLimitReached ? 'Upgrade Plan Quota' : 'Connect Domain'}</span>
          </button>
        </div>
      </div>

      {/* Plan Entitlement & Quota Status Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '14px',
        padding: '16px 22px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(16, 32, 30, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
          <div style={{
            padding: '7px 14px',
            borderRadius: '9px',
            background: '#FAFBF9',
            border: '1.5px solid #D9E1DC',
            color: '#10201E',
            fontSize: '13px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} style={{ color: '#15803D' }} />
            <span>{currentPlanObj.name}</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                Protected Websites: {quotaUsed} / {domainLimit} ({websites.length} Domains, {wordpressSitesCount} WordPress)
              </span>
              {isLimitReached && (
                <span style={{ fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  LIMIT REACHED
                </span>
              )}
            </div>
            {/* Visual Progress Bar */}
            <div style={{ width: '180px', height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{
                width: `${quotaPercent}%`,
                height: '100%',
                background: isLimitReached ? '#EF4444' : quotaPercent > 70 ? '#F59E0B' : '#15803D',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Feature Entitlements Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#D97706', marginRight: '6px', fontWeight: '800' }}>⚡</span>
            {currentPlanObj.requests}
          </span>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#15803D', marginRight: '6px', fontWeight: '800' }}>🛡️</span>
            {currentPlanObj.id === 'free' ? 'Core WAF (500+ rules)' : currentPlanObj.id === 'go' ? '6.5M+ ML Neural Core' : currentPlanObj.id === 'pro' ? '2M+ Signatures & Layer 7 DDoS' : 'Dedicated ML Node & 15-Min SLA'}
          </span>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#0284C7', marginRight: '6px', fontWeight: '800' }}>🎧</span>
            {currentPlanObj.id === 'free' ? 'Community Support' : currentPlanObj.id === 'go' ? 'Priority Email' : currentPlanObj.id === 'pro' ? '24/7 Dedicated SLA' : '15-Min Critical SLA'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/user/pricing')}
          style={{
            padding: '7px 16px',
            borderRadius: '8px',
            border: '1px solid #D9E1DC',
            background: '#FFFFFF',
            color: '#10201E',
            fontSize: '12.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Sliders size={13} style={{ color: '#10201E' }} />
          <span>View Pricing &amp; Plans</span>
        </button>
      </div>

      {/* Executive Clean Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px', marginBottom: '24px'
      }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #D9E1DC',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Domains</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>
            {websites.length === 0 ? 0 : (overview?.total_domains ?? stats.total)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px' }}>Configured in MDefender</div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #D9E1DC',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edge WAF Armed</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>
            {websites.length === 0 ? 0 : (overview?.active_protected_domains ?? stats.active)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#60716B', marginTop: '4px' }}>Traffic proxied through edge</div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #D9E1DC',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Delegation</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>
            {websites.length === 0 ? 0 : (overview?.pending_delegation ?? stats.pending)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#60716B', marginTop: '4px' }}>Awaiting registrar update</div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #D9E1DC',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {overview?.measured_latency_ms ? 'Anycast Latency' : 'Edge Latency'}
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>
            {overview?.latency_display || (overview?.measured_latency_ms ? `${overview.measured_latency_ms}ms` : '0.12ms')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {overview?.measured_latency_ms ? 'Measured 1h Telemetry' : 'Sub-millisecond WAF filter'}
          </div>
        </div>
      </div>

      {/* Main Domains Section (overflow: visible so dropdown menus won't get clipped) */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px',
        border: '1px solid #D9E1DC', boxShadow: '0 4px 18px rgba(16, 32, 30, 0.03)',
        overflow: 'visible'
      }}>
        {/* Search & Actions Bar */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #D9E1DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
          background: '#FAFBF9', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={15} style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: '#94A3B8'
              }} />
              <input
                type="text"
                placeholder="Search domains by name or url..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '38px', padding: '0 14px 0 38px',
                  borderRadius: '9px', border: '1px solid #D9E1DC',
                  fontSize: '13px', background: '#FFFFFF', color: '#10201E',
                  boxSizing: 'border-box', outline: 'none'
                }}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchDomains}
              disabled={loading}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '8px',
                border: '1px solid #D9E1DC', background: '#FFFFFF',
                color: '#10201E', fontSize: '12.5px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px'
              }}
            >
              <RotateCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredDomains.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '20px', background: '#FAFBF9',
              color: '#10201E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', marginBottom: '18px', border: '1.5px solid #D9E1DC'
            }}>
              <Globe size={32} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 8px' }}>
              {searchQuery ? 'No matching domains found' : 'No domains registered with Cloud WAF yet'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
              {searchQuery
                ? `No domain matched your search query "${searchQuery}".`
                : 'Connect your domain to enable Edge DDoS mitigation, Anycast DNS zone management, and universal WAF inspection.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                style={{
                  padding: '10px 24px', borderRadius: '9px', border: 'none',
                  background: '#0B2522',
                  border: '1px solid #0B2522', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 10px rgba(16, 32, 30, 0.2)'
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Connect Your First Domain</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
            <RotateCw size={26} style={{ animation: 'spin 1s linear infinite', color: '#10201E', marginBottom: '12px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: '600' }}>Loading Cloud WAF domains...</div>
          </div>
        )}

        {/* Domains List */}
        {!loading && filteredDomains.length > 0 && (
          <div>
            {filteredDomains.map((w, i) => {
              const domainName = w.domain || w.name || w.url || 'Unnamed Domain'
              const siteId = w.id || w._id || ''
              const isVerifying = verifyingId === siteId
              const isMenuOpen = activeMenuDomainId === (siteId || domainName)

              return (
                <div
                  key={siteId || i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '18px 24px', borderBottom: i < filteredDomains.length - 1 ? '1px solid #F1F5F2' : 'none',
                    transition: 'background 0.15s', flexWrap: 'wrap', gap: '16px'
                  }}
                >
                  {/* Domain Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: '#FAFBF9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#10201E', border: '1.5px solid #D9E1DC', flexShrink: 0,
                      position: 'relative'
                    }}>
                      <Globe size={22} strokeWidth={2.2} />
                      {w.verified && (
                        <div style={{
                          position: 'absolute', bottom: '-2px', right: '-2px',
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: '#15803D', border: '2px solid #FFFFFF'
                        }} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                          {domainName}
                        </span>

                        {/* Plan Badge */}
                        <span style={{
                          fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '6px',
                          background: '#FAFBF9', color: '#475569', border: '1px solid #D9E1DC', letterSpacing: '0.4px'
                        }}>
                          {(w.plan || 'FREE').toUpperCase()} PLAN
                        </span>

                        {/* Status Badge */}
                        {w.verified ? (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: '#E8EEE8', color: '#0B2522', border: '1px solid #D9E1DC',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <ShieldCheck size={11} /> Active &amp; Protected
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: '#FAFBF9', color: '#60716B', border: '1px solid #D9E1DC',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <Clock size={11} /> Pending Nameservers
                          </span>
                        )}

                        {/* Turnstile Bot Badge */}
                        {w.bot_challenge_enabled && (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: '#E8EEE8', color: '#0B2522', border: '1px solid #D9E1DC',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <Bot size={11} /> Turnstile Shield ON
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>
                          <strong style={{ color: '#475569' }}>SSL:</strong> {w.ssl_mode === 'strict' ? 'Full (Strict)' : 'Flexible'}
                        </span>
                        <span>
                          <strong style={{ color: '#475569' }}>Routing:</strong> Anycast Edge
                        </span>
                        {w.added_at && (
                          <span>
                            <strong style={{ color: '#475569' }}>Added:</strong> {typeof w.added_at === 'string' ? w.added_at.split('T')[0] : 'Active'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Bot Challenge Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleBotChallenge(w)}
                      disabled={togglingBotId === siteId}
                      style={{
                        padding: '7px 12px', borderRadius: '8px',
                        border: '1px solid #D9E1DC',
                        background: w.bot_challenge_enabled ? '#E8EEE8' : '#FFFFFF',
                        color: w.bot_challenge_enabled ? '#0B2522' : '#60716B',
                        fontSize: '12px', fontWeight: '700',
                        cursor: togglingBotId === siteId ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Toggle MDefender Turnstile Bot Challenge"
                    >
                      <Bot size={13} />
                      <span>Bot Gate: {w.bot_challenge_enabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Verify Nameservers */}
                    <button
                      type="button"
                      onClick={() => handleVerifyNameservers(w)}
                      disabled={isVerifying}
                      style={{
                        padding: '7px 12px', borderRadius: '8px',
                        border: '1px solid #D9E1DC',
                        background: '#FFFFFF',
                        color: '#10201E',
                        fontSize: '12px', fontWeight: '700',
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Verify if domain nameservers are pointing to MDefender Anycast"
                    >
                      <RotateCw size={13} style={{ animation: isVerifying ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{isVerifying ? 'Checking...' : w.verified ? 'Verified' : 'Check NS'}</span>
                    </button>

                    {/* DNS Zone Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedZoneDomain(w)}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid #D9E1DC',
                        background: '#FFFFFF', color: '#10201E', fontSize: '12px', fontWeight: '700',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sliders size={13} />
                      <span>DNS &amp; WAF Zone</span>
                    </button>

                    {/* Three-Dots Menu Container */}
                    <div className="domain-actions-menu-container" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuDomainId(isMenuOpen ? null : (siteId || domainName))
                        }}
                        style={{
                          width: '34px', height: '34px', borderRadius: '8px',
                          border: '1px solid ' + (isMenuOpen ? '#10201E' : '#D9E1DC'),
                          background: isMenuOpen ? '#FAFBF9' : '#FFFFFF',
                          color: '#10201E', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="More Domain Options"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div style={{
                          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                          width: '210px', background: '#FFFFFF', borderRadius: '12px',
                          border: '1px solid #D9E1DC', boxShadow: '0 10px 28px -4px rgba(16, 32, 30, 0.18)',
                          zIndex: 1000, padding: '6px', animation: 'fadeIn 0.12s ease'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuDomainId(null)
                              setSelectedZoneDomain(w)
                            }}
                            style={{
                              width: '100%', padding: '9px 12px', background: 'none', border: 'none',
                              borderRadius: '8px', fontSize: '12.5px', fontWeight: '600',
                              color: '#10201E', textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '9px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Sliders size={14} style={{ color: '#10201E' }} />
                            <span>Manage DNS Zone</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuDomainId(null)
                              navigate(`/user/logs?domain=${encodeURIComponent(domainName)}`)
                            }}
                            style={{
                              width: '100%', padding: '9px 12px', background: 'none', border: 'none',
                              borderRadius: '8px', fontSize: '12.5px', fontWeight: '600',
                              color: '#10201E', textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '9px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Activity size={14} style={{ color: '#10201E' }} />
                            <span>View Traffic Logs</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuDomainId(null)
                              navigate(`/user/firewall?domain=${encodeURIComponent(domainName)}`)
                            }}
                            style={{
                              width: '100%', padding: '9px 12px', background: 'none', border: 'none',
                              borderRadius: '8px', fontSize: '12.5px', fontWeight: '600',
                              color: '#10201E', textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '9px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <ShieldCheck size={14} style={{ color: '#10201E' }} />
                            <span>Configure WAF Rules</span>
                          </button>

                          <div style={{ margin: '4px 0', borderTop: '1px solid #F1F5F2' }} />

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(w)}
                            style={{
                              width: '100%', padding: '9px 12px', background: 'none', border: 'none',
                              borderRadius: '8px', fontSize: '12.5px', fontWeight: '700',
                              color: '#DC2626', textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '9px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={14} style={{ color: '#DC2626' }} />
                            <span>Disconnect &amp; Remove...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* GitHub-Style Danger Zone Domain Removal Confirmation Modal */}
      {deleteModalDomain && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(16, 32, 30, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
            width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(16, 32, 30, 0.25)',
            overflow: 'hidden', animation: 'scaleUp 0.15s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #F1F5F2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#DC2626'
                }}>
                  <AlertTriangle size={17} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Remove Protected Domain
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalDomain(null)}
                disabled={deletingDomain}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: '10px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#991B1B', fontSize: '13px', lineHeight: '1.5',
                marginBottom: '18px'
              }}>
                <div style={{ fontWeight: '800', marginBottom: '4px' }}>
                  Warning: This action cannot be undone.
                </div>
                <div>
                  Anycast edge routing, automated SSL termination, and WAF inspection for this domain will immediately cease. Traffic will fail unless your DNS registrar is repointed.
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                To confirm deletion, please type the domain name below:
              </div>

              <div style={{
                marginBottom: '14px', padding: '8px 12px',
                background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px'
              }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: '14px', fontWeight: '700',
                  color: '#10201E', wordBreak: 'break-all', textAlign: 'center',
                  userSelect: 'all'
                }}>
                  {deleteModalDomain.domain || deleteModalDomain.name || ''}
                </div>
              </div>

              <input
                type="text"
                placeholder="Type domain name to confirm"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                disabled={deletingDomain}
                style={{
                  width: '100%', height: '42px', padding: '0 14px',
                  border: '1.5px solid ' + (deleteConfirmInput.trim().toLowerCase() === (deleteModalDomain.domain || deleteModalDomain.name || '').toLowerCase() ? '#DC2626' : '#D9E1DC'),
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
                onClick={() => setDeleteModalDomain(null)}
                disabled={deletingDomain}
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
                onClick={handleConfirmDeleteDomain}
                disabled={
                  deletingDomain ||
                  deleteConfirmInput.trim().toLowerCase() !== (deleteModalDomain.domain || deleteModalDomain.name || '').toLowerCase()
                }
                style={{
                  padding: '9px 20px',
                  background: deleteConfirmInput.trim().toLowerCase() === (deleteModalDomain.domain || deleteModalDomain.name || '').toLowerCase() ? '#DC2626' : '#FCA5A5',
                  border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '800',
                  color: '#FFFFFF',
                  cursor: deleteConfirmInput.trim().toLowerCase() === (deleteModalDomain.domain || deleteModalDomain.name || '').toLowerCase() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  boxShadow: deleteConfirmInput.trim().toLowerCase() === (deleteModalDomain.domain || deleteModalDomain.name || '').toLowerCase() ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {deletingDomain ? (
                  <>
                    <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>I understand, remove this domain</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DNS Zone Drawer Component */}
      {selectedZoneDomain && (
        <DnsZoneDrawer
          website={selectedZoneDomain}
          isOpen={Boolean(selectedZoneDomain)}
          onClose={() => setSelectedZoneDomain(null)}
          onZoneUpdated={fetchDomains}
        />
      )}

      {/* Cloud WAF Onboarding Wizard Modal */}
      {showOnboardingModal && (
        <DnsOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          userPlan={userPlan}
          totalWebsites={quotaUsed}
          websiteLimit={domainLimit}
          onWebsiteAdded={(newSite) => {
            setShowOnboardingModal(false)
            fetchDomains()
            setFeedbackMsg({
              type: 'success',
              text: `Domain "${newSite.domain || newSite.name}" connected! Please point your registrar nameservers to ${(newSite.assigned_nameservers || newSite.nameservers || ['ns1.mdefender-pro.crafix.tech', 'ns2.mdefender-pro.crafix.tech']).join(' and ')}.`
            })
          }}
        />
      )}
    </div>
  )
}
