import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'
import DnsZoneDrawer from '../components/DnsZoneDrawer'
import DnsOnboardingModal from '../components/DnsOnboardingModal'
import PaymentModal from '../components/PaymentModal'

export const DOMAIN_PLANS = [
  {
    id: 'free',
    name: 'Starter Free',
    badge: 'Free Forever',
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
    color: '#4f46e5',
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
    monthlyPrice: 49,
    yearlyPrice: 470,
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
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Drawer & Modal state
  const [selectedZoneDomain, setSelectedZoneDomain] = useState(null)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [pricingCycle, setPricingCycle] = useState('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [verifyingId, setVerifyingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingBotId, setTogglingBotId] = useState(null)

  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('mdefender_user_plan') || 'free'
  })

  const isPremium = userPlan === 'premium' || userPlan === 'pro' || userPlan === 'enterprise'

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      const [sitesRes, dashRes] = await Promise.allSettled([
        api.getUserWebsites(),
        api.getUserDashboard()
      ])

      if (sitesRes.status === 'fulfilled') {
        const list = sitesRes.value?.data?.websites || sitesRes.value?.websites || []
        const domainList = list.filter(w => (w.platform || '').toLowerCase() !== 'wordpress')
        setWebsites(domainList)
      }

      if (dashRes.status === 'fulfilled') {
        const resolved = dashRes.value?.user?.plan || dashRes.value?.plan
        if (resolved) {
          const lower = resolved.toLowerCase()
          setUserPlan(lower)
          localStorage.setItem('mdefender_user_plan', lower)
        }
      }
    } catch (err) {
      console.error('Failed to load domains:', err)
      setFeedbackMsg({ type: 'error', text: 'Failed to load domains from server.' })
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
      } else {
        setFeedbackMsg({
          type: 'info',
          text: res?.data?.message || res?.message || `Nameserver propagation is still in progress for ${domainName}. Please allow up to 30 minutes for global DNS cache refresh.`
        })
      }
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchDomains()
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
      // Update local state immediately
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

  // Delete Domain
  const handleDeleteDomain = async (domainObj) => {
    const siteId = domainObj.id || domainObj._id
    const domainName = domainObj.domain || domainObj.name || domainObj.url
    if (!siteId) return

    if (!window.confirm(`Are you sure you want to remove "${domainName}" from MDefender? This will immediately disable edge routing and active WAF protection.`)) {
      return
    }

    setDeletingId(siteId)
    setFeedbackMsg(null)
    try {
      await api.removeUserWebsite(siteId)
      setFeedbackMsg({ type: 'success', text: `Domain "${domainName}" removed successfully.` })
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchDomains()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || `Failed to remove ${domainName}` })
    } finally {
      setDeletingId(null)
    }
  }

  // Quota & Plan calculations
  const normalizedPlan = (userPlan === 'premium' ? 'pro' : userPlan || 'free').toLowerCase()
  const currentPlanObj = DOMAIN_PLANS.find(p => p.id === normalizedPlan) || DOMAIN_PLANS[0]
  const domainLimit = currentPlanObj.limit
  const quotaUsed = websites.length
  const isLimitReached = quotaUsed >= domainLimit
  const quotaPercent = Math.min(100, Math.round((quotaUsed / domainLimit) * 100))

  const handleConnectDomainClick = () => {
    if (isLimitReached) {
      setFeedbackMsg({
        type: 'error',
        text: `Domain Limit Reached (${quotaUsed}/${domainLimit} Domains). Your ${currentPlanObj.name} plan allows up to ${domainLimit} domain(s). Please upgrade your plan to connect additional domains.`
      })
      setShowPricingModal(true)
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
          background: feedbackMsg.type === 'success' ? '#ecfdf5' : feedbackMsg.type === 'info' ? '#eff6ff' : '#fef2f2',
          border: `1.5px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : feedbackMsg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          color: feedbackMsg.type === 'success' ? '#065f46' : feedbackMsg.type === 'info' ? '#1e40af' : '#991b1b',
          fontSize: '13.5px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle text-emerald-600' : feedbackMsg.type === 'info' ? 'fa-circle-info text-blue-600' : 'fa-triangle-exclamation text-rose-600'}`} style={{ fontSize: '18px' }}></i>
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1528 0%, #172554 100%)',
        borderRadius: '16px', padding: '26px 30px', marginBottom: '20px',
        border: '1px solid #1e3a8a', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', flexShrink: 0
          }}>
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Domains
              </h1>
              <span style={{
                background: 'rgba(37, 99, 235, 0.25)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px'
              }}>
                ANYCAST EDGE ROUTING
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', maxWidth: '640px', lineHeight: '1.5' }}>
              Enterprise domain-based protection. Route any web application through MDefender Pro Anycast Nameservers for Layer 7 WAF inspection, DDoS mitigation, and SSL cloaking.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowPricingModal(true)}
            style={{
              padding: '11px 18px', borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fas fa-crown" style={{ color: '#fbbf24' }}></i>
            <span>Plans &amp; Pricing</span>
          </button>

          <button
            type="button"
            onClick={handleConnectDomainClick}
            style={{
              padding: '11px 22px', borderRadius: '10px', border: 'none',
              background: isLimitReached
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: isLimitReached
                ? '0 4px 14px rgba(217, 119, 6, 0.35)'
                : '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <i className={`fas ${isLimitReached ? 'fa-arrow-up-right-from-square' : 'fa-plus-circle'}`}></i>
            <span>{isLimitReached ? 'Upgrade Plan Quota' : 'Connect Domain'}</span>
          </button>
        </div>
      </div>

      {/* Plan Entitlement & Quota Status Bar */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '14px',
        padding: '16px 22px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
          <div style={{
            padding: '7px 14px',
            borderRadius: '10px',
            background: `${currentPlanObj.color}15`,
            border: `1.5px solid ${currentPlanObj.color}35`,
            color: currentPlanObj.color,
            fontSize: '13px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-shield-halved"></i>
            <span>{currentPlanObj.name}</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
                Domain Quota: {quotaUsed} / {domainLimit} Used
              </span>
              {isLimitReached && (
                <span style={{ fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  LIMIT REACHED
                </span>
              )}
            </div>
            {/* Visual Progress Bar */}
            <div style={{ width: '180px', height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
              <div style={{
                width: `${quotaPercent}%`,
                height: '100%',
                background: isLimitReached ? '#ef4444' : quotaPercent > 70 ? '#f59e0b' : '#10b981',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Feature Entitlements Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
            <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '5px' }}></i>
            {currentPlanObj.requests}
          </span>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
            <i className="fas fa-microchip" style={{ color: '#3b82f6', marginRight: '5px' }}></i>
            {currentPlanObj.id === 'free' ? 'Core WAF (500+ rules)' : currentPlanObj.id === 'go' ? '6.5M+ ML Neural Core' : currentPlanObj.id === 'pro' ? '2M+ Signatures & Layer 7 DDoS' : 'Dedicated ML Node & 15-Min SLA'}
          </span>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
            <i className="fas fa-headset" style={{ color: '#10b981', marginRight: '5px' }}></i>
            {currentPlanObj.id === 'free' ? 'Community Support' : currentPlanObj.id === 'go' ? 'Priority Email' : currentPlanObj.id === 'pro' ? '24/7 Dedicated SLA' : '15-Min Critical SLA'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowPricingModal(true)}
          style={{
            padding: '7px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#1e293b',
            fontSize: '12.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-sliders" style={{ color: '#6366f1' }}></i>
          <span>View Pricing &amp; Plans</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px', marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Domains</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{stats.total}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Configured in MDefender</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Edge WAF Armed</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{stats.active}</div>
          <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '4px' }}>Traffic proxied through edge</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Pending Delegation</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{stats.pending}</div>
          <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px' }}>Awaiting registrar update</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>Anycast Latency</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', marginTop: '6px' }}>0.35ms</div>
          <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '4px' }}>Sub-millisecond Edge core</div>
        </div>
      </div>

      {/* Main Domains Section */}
      <div style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {/* Search & Actions Bar */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
          background: 'var(--input-bg, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
              <i className="fas fa-search" style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: '13px'
              }}></i>
              <input
                type="text"
                placeholder="Search domains by name or url..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '40px', padding: '0 14px 0 38px',
                  borderRadius: '9px', border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '13px', background: '#ffffff', color: 'var(--text-main, #0f172a)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
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
                height: '40px', padding: '0 16px', borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)', background: '#ffffff',
                color: 'var(--text-main, #334155)', fontSize: '13px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredDomains.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '22px', background: '#f0f9ff',
              color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '34px', marginBottom: '18px', border: '1.5px solid #bae6fd'
            }}>
              <i className="fas fa-globe"></i>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
              {searchQuery ? 'No matching domains found' : 'No domains registered with Cloud WAF yet'}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
              {searchQuery
                ? `No domain matched your search query "${searchQuery}".`
                : 'Connect your domain to enable Edge DDoS mitigation, Anycast DNS zone management, and universal WAF inspection.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                style={{
                  padding: '11px 26px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                <i className="fas fa-plus"></i>
                <span>Connect Your First Domain</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading Cloud WAF domains...</div>
          </div>
        )}

        {/* Domains List */}
        {!loading && filteredDomains.length > 0 && (
          <div>
            {filteredDomains.map((w, i) => {
              const domainName = w.domain || w.name || w.url || 'Unnamed Domain'
              const siteId = w.id || w._id || ''
              const isVerifying = verifyingId === siteId
              const isDeleting = deletingId === siteId

              return (
                <div
                  key={siteId || i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: i < filteredDomains.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none',
                    transition: 'background 0.15s', flexWrap: 'wrap', gap: '16px'
                  }}
                >
                  {/* Domain Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', color: '#2563eb', border: '1px solid #bfdbfe', flexShrink: 0
                    }}>
                      <i className="fas fa-shield-halved"></i>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-main, #0f172a)' }}>
                          {domainName}
                        </span>

                        {/* Plan Badge */}
                        <span style={{
                          fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                          background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', letterSpacing: '0.4px'
                        }}>
                          {(w.plan || 'FREE').toUpperCase()} PLAN
                        </span>

                        {/* Status Badge */}
                        {w.verified ? (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <i className="fas fa-shield-halved" style={{ fontSize: '9px' }}></i> Active &amp; Protected
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <i className="fas fa-clock" style={{ fontSize: '9px' }}></i> Pending Nameservers
                          </span>
                        )}

                        {/* Turnstile Bot Badge */}
                        {w.bot_challenge_enabled && (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <i className="fas fa-robot" style={{ fontSize: '9px' }}></i> Turnstile Shield ON
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
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

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Bot Challenge Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleBotChallenge(w)}
                      disabled={togglingBotId === siteId}
                      style={{
                        padding: '8px 14px', borderRadius: '8px',
                        border: `1.5px solid ${w.bot_challenge_enabled ? '#a7f3d0' : '#e2e8f0'}`,
                        background: w.bot_challenge_enabled ? '#ecfdf5' : '#f8fafc',
                        color: w.bot_challenge_enabled ? '#047857' : '#64748b',
                        fontSize: '12.5px', fontWeight: '700',
                        cursor: togglingBotId === siteId ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Toggle MDefender Turnstile (Bot Challenge & Interstitial Gate)"
                    >
                      <i className={`fas ${togglingBotId === siteId ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                      <span>Bot Challenge: {w.bot_challenge_enabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* DNS Zone Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedZoneDomain(w)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #bfdbfe',
                        background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className="fas fa-shield-halved"></i>
                      <span>DNS &amp; WAF Zone</span>
                    </button>

                    {/* Verify Nameservers */}
                    <button
                      type="button"
                      onClick={() => handleVerifyNameservers(w)}
                      disabled={isVerifying}
                      style={{
                        padding: '8px 14px', borderRadius: '8px',
                        border: `1.5px solid ${w.verified ? '#bbf7d0' : '#fde68a'}`,
                        background: w.verified ? '#f0fdf4' : '#fffbeb',
                        color: w.verified ? '#15803d' : '#b45309',
                        fontSize: '12.5px', fontWeight: '700',
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                      title="Verify if domain nameservers are pointing to ns1.mdefender.pro and ns2.mdefender.pro"
                    >
                      <i className={`fas ${isVerifying ? 'fa-spinner fa-spin' : w.verified ? 'fa-check' : 'fa-arrows-rotate'}`}></i>
                      <span>{isVerifying ? 'Checking...' : w.verified ? 'Verified' : 'Check NS'}</span>
                    </button>

                    {/* Delete Domain */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDomain(w)}
                      disabled={isDeleting}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca',
                        background: '#fef2f2', color: '#b91c1c', fontSize: '12.5px', fontWeight: '700',
                        cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center'
                      }}
                      title="Remove domain from Cloud WAF"
                    >
                      <i className={`fas ${isDeleting ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
          onWebsiteAdded={(newSite) => {
            setShowOnboardingModal(false)
            fetchDomains()
            setFeedbackMsg({
              type: 'success',
              text: `Domain "${newSite.domain || newSite.name}" connected! Please point your registrar nameservers to ns1.mdefender.pro and ns2.mdefender.pro.`
            })
          }}
        />
      )}

      {/* Synchronized Pricing & Entitlements Modal */}
      {showPricingModal && (
        <div
          onClick={() => setShowPricingModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px 16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '22px', border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              width: '100%', maxWidth: '1140px', maxHeight: '92vh',
              overflowY: 'auto', display: 'flex', flexDirection: 'column',
              color: '#0f172a', position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: '#ffffff', zIndex: 10
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}>
                    <i className="fas fa-tags"></i>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18.5px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                      Subscription Pricing &amp; Domain Quota Plans
                    </h2>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                      Transparent pricing with zero hidden fees. Upgrade or downgrade anytime.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Billing Cycle Switcher */}
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setPricingCycle('monthly')}
                    style={{
                      padding: '5px 14px', borderRadius: '7px', border: 'none',
                      background: pricingCycle === 'monthly' ? '#2563eb' : 'transparent',
                      color: pricingCycle === 'monthly' ? '#ffffff' : '#64748b',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingCycle('yearly')}
                    style={{
                      padding: '5px 14px', borderRadius: '7px', border: 'none',
                      background: pricingCycle === 'yearly' ? '#2563eb' : 'transparent',
                      color: pricingCycle === 'yearly' ? '#ffffff' : '#64748b',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '5px'
                    }}
                  >
                    <span>Yearly</span>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#10b981', color: '#ffffff' }}>SAVE 20%</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowPricingModal(false)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* 4 Plans Grid */}
            <div style={{ padding: '24px 28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
              {DOMAIN_PLANS.map((plan) => {
                const isCurrent = normalizedPlan === plan.id
                const isHighlighted = plan.popular
                const price = pricingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                return (
                  <div
                    key={plan.id}
                    style={{
                      borderRadius: '16px',
                      border: isHighlighted
                        ? '1.5px solid rgba(99, 102, 241, 0.45)'
                        : isCurrent
                          ? `1.5px solid ${plan.color}`
                          : '1px solid #e2e8f0',
                      background: isHighlighted ? '#faf5ff' : '#ffffff',
                      boxShadow: isHighlighted ? '0 8px 25px rgba(99, 102, 241, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    {isHighlighted && (
                      <div style={{
                        position: 'absolute', top: '-11px', right: '16px',
                        background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                        color: '#ffffff', fontSize: '10px', fontWeight: '800',
                        padding: '2px 10px', borderRadius: '20px', textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        ★ Most Popular
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{plan.name}</span>
                        {isCurrent && (
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', minHeight: '34px', lineHeight: 1.45 }}>
                        {plan.desc}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '18px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '900', color: isHighlighted ? '#4f46e5' : '#0f172a' }}>
                          ${price}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {plan.id === 'free' ? 'forever' : pricingCycle === 'yearly' ? '/year' : '/mo'}
                        </span>
                      </div>

                      {/* Quota Highlights */}
                      <div style={{
                        background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px',
                        border: '1px solid #f1f5f9', fontSize: '12px', color: '#334155'
                      }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                          <i className="fas fa-globe" style={{ color: plan.color, marginRight: '6px' }}></i>
                          {plan.limit} Protected Domain{plan.limit > 1 ? 's' : ''}
                        </div>
                        <div style={{ color: '#64748b' }}>
                          <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
                          {plan.requests}
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {plan.features.map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: f.ok ? '#334155' : '#94a3b8' }}>
                            <i className={`fas ${f.ok ? 'fa-check' : 'fa-times'}`} style={{ color: f.ok ? '#10b981' : '#cbd5e1', marginTop: '2px', fontSize: '11px', flexShrink: 0 }}></i>
                            <span style={{ textDecoration: f.ok ? 'none' : 'line-through' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isCurrent ? (
                      <button
                        disabled
                        style={{
                          width: '100%', padding: '10px', borderRadius: '9px',
                          background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
                          fontSize: '13px', fontWeight: '700', cursor: 'default'
                        }}
                      >
                        Current Plan
                      </button>
                    ) : plan.id === 'free' ? (
                      <button
                        onClick={async () => {
                          try {
                            if (api.updateUserPlan) {
                              await api.updateUserPlan('free')
                            }
                            setUserPlan('free')
                            localStorage.setItem('mdefender_user_plan', 'free')
                            setShowPricingModal(false)
                            fetchDomains()
                          } catch (err) {
                            setFeedbackMsg({ type: 'error', text: err.message || 'Failed to switch to Free plan' })
                          }
                        }}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '9px',
                          background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1',
                          fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Select Free Forever
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCheckoutPlan(plan.id)
                          setShowPricingModal(false)
                        }}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '9px',
                          background: isHighlighted ? 'linear-gradient(135deg, #4338ca, #6366f1)' : plan.color,
                          color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: '700',
                          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        Upgrade to {plan.name}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Integrated Checkout Payment Modal */}
      {checkoutPlan && (
        <PaymentModal
          isOpen={Boolean(checkoutPlan)}
          plan={checkoutPlan}
          billingCycle={pricingCycle}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            setCheckoutPlan(null)
            setUserPlan(checkoutPlan)
            localStorage.setItem('mdefender_user_plan', checkoutPlan)
            setFeedbackMsg({
              type: 'success',
              text: `🎉 Plan upgraded to ${DOMAIN_PLANS.find(p => p.id === checkoutPlan)?.name || 'Enterprise Pro'}! Your new domain quota is now active.`
            })
            fetchDomains()
          }}
        />
      )}
    </div>
  )
}
