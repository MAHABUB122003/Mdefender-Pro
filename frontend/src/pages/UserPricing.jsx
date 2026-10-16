import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api/api'
import userStore from '../utils/userStore'

const DEFAULT_USER_PLANS = [
  {
    id: 'free',
    name: 'Starter Free',
    badge: 'Free Forever',
    badgeColor: '#64748b',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Essential L7 protection for personal blogs and developer test sites.',
    features: [
      '1 Protected Website / Origin',
      'Core WAF Rule Engine (500+ Signatures)',
      '10,000 Edge Requests / Month',
      'Basic Anomaly & Rate Limiting',
      'Real-Time Edge Security Block Page',
      'Community Forum Support'
    ],
    notIncluded: [
      '6.5M+ Threat Neural Classifier',
      '639K+ Generative AI Prompt Shield',
      'Layer 7 DDoS Volumetric Mitigation',
      'Custom Regex Policy Authoring',
      '24/7 Dedicated SLA Response'
    ]
  },
  {
    id: 'go',
    name: 'Developer Go',
    badge: 'Growing Apps',
    badgeColor: '#0ea5e9',
    monthlyPrice: 9,
    yearlyPrice: 90,
    description: 'Advanced edge security, bot defense, and rate limiting for growing web services.',
    features: [
      '5 Protected Websites / APIs',
      '100,000 Edge Requests / Month',
      'Core WAF + Heuristic Vectorizer',
      '6.5M+ Threat Neural Classifier',
      '50,000+ Threat Signatures & Hashes',
      '20 Custom Regex Policies',
      'Priority Email Support'
    ],
    notIncluded: [
      'Full 2,000,000+ Signatures Matrix',
      'Layer 7 DDoS Volumetric Scrubber',
      '24/7 Dedicated SLA Response'
    ]
  },
  {
    id: 'pro',
    name: 'Enterprise Pro',
    badge: 'Most Popular',
    badgeColor: '#6366f1',
    isPopular: true,
    monthlyPrice: 20,
    yearlyPrice: 190,
    description: 'Maximum cyber defense for mission-critical SaaS, e-commerce, and high-traffic origins.',
    features: [
      '10 Protected Websites & APIs',
      '1,000,000 Edge Requests / Month',
      'Full 2,000,000+ Hyper-Scale Signatures',
      '6,501,208+ Dataset Deep ML Core',
      '639K+ AI Prompt Injection Shield',
      'Unlimited Custom Regex Policies',
      'Layer 7 Volumetric DDoS Mitigation',
      'Sub-Millisecond (0.12ms) Edge Inspection',
      '24/7 Priority SLA Response'
    ],
    notIncluded: []
  },
  {
    id: 'enterprise',
    name: 'Dedicated Enterprise',
    badge: 'Maximum Scale',
    badgeColor: '#8b5cf6',
    monthlyPrice: 49,
    yearlyPrice: 470,
    description: 'Dedicated security infrastructure, multi-cluster proxy nodes, and 15-minute SLA.',
    features: [
      '15 Protected Websites & APIs',
      '10,000,000+ Edge Requests / Month',
      'Dedicated Neural Vectorizer Node',
      'Full 2,000,000+ Signatures Matrix',
      '639K+ AI Gateway & Jailbreak Guard',
      'Automated DDoS Scrubber Mesh',
      'Unlimited Zero-Day Custom Policies',
      'Dedicated Security Architect',
      '15-Minute Guaranteed SLA Response'
    ],
    notIncluded: []
  }
]

export default function UserPricing() {
  const { dark } = useTheme()
  const [searchParams] = useSearchParams()
  const initialPlanParam = searchParams.get('plan') || null
  const initialCycleParam = searchParams.get('cycle') || 'monthly'

  const cachedUser = userStore.get('profile') || userStore.get('dashboard')?.user || null
  const [profile, setProfile] = useState(() => cachedUser)
  const [plansList, setPlansList] = useState(DEFAULT_USER_PLANS)
  const [billingCycle, setBillingCycle] = useState(initialCycleParam)
  const [billingData, setBillingData] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [onboardingNotice, setOnboardingNotice] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 5000)
  }

  const isYearly = billingCycle === 'yearly'

  const fetchBilling = async () => {
    setLoading(true)
    try {
      const [profRes, billRes, histRes] = await Promise.allSettled([
        api.getProfile(),
        api.getBillingSubscription(),
        api.getPaymentHistory()
      ])

      if (profRes.status === 'fulfilled' && profRes.value) {
        const u = profRes.value.user || profRes.value
        setProfile(u)
        userStore.set('profile', u)
        if (u.plan) localStorage.setItem('mdefender_user_plan', u.plan)
      }

      if (billRes.status === 'fulfilled' && billRes.value) {
        const b = billRes.value.data || billRes.value
        setBillingData(b)
      }

      if (histRes.status === 'fulfilled' && histRes.value) {
        setPaymentHistory(histRes.value || [])
      }
    } catch (e) {
      console.warn('Failed to fetch billing details:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBilling()
  }, [])

  // Dynamic admin pricing sync: reflect any live overrides from Admin Pricing panel
  useEffect(() => {
    api.getPublicPricing()
      .then(res => {
        if (res?.data?.plans) {
          const raw = res.data.plans
          setPlansList(prev => prev.map(p => {
            const match = Array.isArray(raw) ? raw.find(r => r.id === p.id) : raw[p.id]
            if (match) {
              return {
                ...p,
                name: match.name || match.display_name || p.name,
                monthlyPrice: match.monthly_price !== undefined ? match.monthly_price : p.monthlyPrice,
                yearlyPrice: match.yearly_price !== undefined ? match.yearly_price : p.yearlyPrice,
              }
            }
            return p
          }))
        }
      })
      .catch(() => {})
  }, [])

  // Auto-init Paddle SDK once config is fetched
  useEffect(() => {
    api.getBillingConfig()
      .then(res => {
        const cfg = res?.data || res
        if (cfg?.client_token && window.Paddle) {
          try {
            if (cfg.environment === 'sandbox') {
              window.Paddle.Environment.set('sandbox')
            }
            window.Paddle.Initialize({
              token: cfg.client_token
            })
          } catch (e) {
            console.warn('Paddle Init Warning:', e)
          }
        }
      })
      .catch(() => {})
  }, [])

  const currentPlanId = (profile?.plan || billingData?.plan_id || 'free').toLowerCase()
  const isPaidActive = currentPlanId !== 'free' && profile?.payment_status === 'active'

  // Direct 1-Click Paddle Checkout Handler
  const handleCheckout = async (planId) => {
    if (planId === currentPlanId) {
      showToast(`You are currently on the ${planId.toUpperCase()} plan.`, false)
      return
    }

    if (planId === 'free') {
      if (!confirm('Are you sure you want to downgrade to Starter Free? High-volume protection and premium engines will be paused.')) return
      setActionLoading(true)
      try {
        await api.downgradePlan()
        showToast('Downgraded to Free Starter plan.')
        fetchBilling()
      } catch (err) {
        showToast(err.message || 'Downgrade failed', true)
      } finally {
        setActionLoading(false)
      }
      return
    }

    setCheckoutLoadingPlan(planId)
    setOnboardingNotice(null)

    try {
      // 1. Fetch live config and ensure Paddle SDK is ready
      const cfgRes = await api.getBillingConfig()
      const cfg = cfgRes?.data || cfgRes
      if (window.Paddle && cfg?.client_token) {
        try {
          if (cfg.environment === 'sandbox') {
            window.Paddle.Environment.set('sandbox')
          }
          window.Paddle.Initialize({ token: cfg.client_token })
        } catch (initErr) {
          console.warn('Paddle init error:', initErr)
        }
      }

      // 2. Request backend to create transaction
      const res = await api.createPaddleCheckout({
        plan: planId,
        billing_cycle: billingCycle,
        return_url: window.location.href,
        success_url: window.location.origin + '/payment/success?plan=' + planId + '&cycle=' + billingCycle
      })

      if (!res.success && res.error) {
        if (res.error.code === 'transaction_checkout_not_enabled') {
          setOnboardingNotice({
            title: 'Paddle Live Onboarding Pending',
            message: res.error.message || 'Checkouts are not enabled for your live Paddle account. Please complete your business verification and website domain approval in your Paddle Dashboard.',
            url: 'https://vendors.paddle.com'
          })
          return
        }
        throw new Error(res.error.message || 'Failed to initiate checkout.')
      }

      const checkoutData = res.data || res

      // 3. Open Paddle Checkout directly
      if (checkoutData.checkout_id && window.Paddle) {
        try {
          window.Paddle.Checkout.open({
            transactionId: checkoutData.checkout_id,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: window.location.origin + '/payment/success?plan=' + planId + '&cycle=' + billingCycle
            }
          })
          return
        } catch (overlayErr) {
          console.warn('Overlay error, falling back to URL:', overlayErr)
        }
      }

      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url
        return
      }

      if (checkoutData.price_id && window.Paddle) {
        window.Paddle.Checkout.open({
          items: [{ priceId: checkoutData.price_id, quantity: 1 }],
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            successUrl: window.location.origin + '/payment/success?plan=' + planId + '&cycle=' + billingCycle
          }
        })
        return
      }

      if (checkoutData.message && !checkoutData.checkout_url && !checkoutData.checkout_id && !checkoutData.price_id) {
        showToast(checkoutData.message, true)
        return
      }

      throw new Error('Unable to launch checkout session. Please try again.')
    } catch (err) {
      showToast(err.message || 'Failed to launch Paddle Checkout', true)
    } finally {
      setCheckoutLoadingPlan(null)
    }
  }

  // Trigger checkout automatically if query param present
  useEffect(() => {
    if (initialPlanParam && initialPlanParam !== 'free' && initialPlanParam !== currentPlanId) {
      handleCheckout(initialPlanParam)
    }
  }, [initialPlanParam])

  return (
    <div style={{
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Paddle Onboarding Pending Notice Banner */}
      {onboardingNotice && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fcd34d',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#92400e' }}>
                {onboardingNotice.title}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: '1.5' }}>
                {onboardingNotice.message}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href={onboardingNotice.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#d97706',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Complete in Paddle</span>
              <i className="fas fa-arrow-up-right-from-square" style={{ fontSize: '11px' }}></i>
            </a>
            <button
              onClick={() => setOnboardingNotice(null)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #fcd34d',
                color: '#78350f',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header Banner - Matching Dashboard White Style */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}>
              <i className="fas fa-shield-halved" style={{ marginRight: '5px' }}></i> Active Security
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: isPaidActive ? '#ecfdf5' : '#f8fafc',
              color: isPaidActive ? '#059669' : '#64748b',
              border: `1px solid ${isPaidActive ? '#a7f3d0' : '#e2e8f0'}`
            }}>
              Current Plan: {currentPlanId.toUpperCase()}
            </span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: '#0f172a' }}>
            Subscription &amp; Protection Plans
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', maxWidth: '640px', lineHeight: '1.5' }}>
            Instant self-service checkout. Upgrade to protect more domains, deploy 2M+ attack signatures, and unlock 6.5M+ neural threat inspection.
          </p>
        </div>

        {/* Quick User Plan Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          minWidth: '220px'
        }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
            Account Status
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className={`fas ${isPaidActive ? 'fa-circle-check' : 'fa-shield'}`} style={{ color: isPaidActive ? '#10b981' : '#2563eb' }}></i>
            {currentPlanId === 'go' ? 'Developer Go' : currentPlanId === 'enterprise' ? 'Dedicated Enterprise' : currentPlanId === 'pro' ? 'Enterprise Pro' : 'Starter Free'}
          </div>
          {profile?.plan_expires && (
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              Valid through: {new Date(profile.plan_expires).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Monthly / Annual Billing Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          display: 'inline-flex',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              border: 'none',
              background: !isYearly ? '#ffffff' : 'transparent',
              color: !isYearly ? '#0f172a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: !isYearly ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              border: 'none',
              background: isYearly ? '#ffffff' : 'transparent',
              color: isYearly ? '#0f172a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: isYearly ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <span>Annual Billing</span>
            <span style={{
              background: '#10b981',
              color: '#ffffff',
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: '800'
            }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* 4 Pricing Plan Cards - Matching Dashboard White Style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {plansList.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice
          const isPopular = plan.isPopular
          const isCheckingOut = checkoutLoadingPlan === plan.id

          return (
            <div
              key={plan.id}
              style={{
                background: '#ffffff',
                border: isPopular
                  ? '2px solid #6366f1'
                  : isCurrent
                    ? '2px solid #10b981'
                    : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: isPopular
                  ? '0 10px 30px rgba(99, 102, 241, 0.12)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {/* Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  background: isPopular ? '#eef2ff' : '#f8fafc',
                  color: isPopular ? '#6366f1' : plan.badgeColor,
                  border: isPopular ? '1px solid #c7d2fe' : '1px solid #e2e8f0'
                }}>
                  {plan.badge}
                </span>

                {isCurrent && (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    background: '#10b981',
                    color: '#ffffff'
                  }}>
                    ACTIVE PLAN
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px', color: '#0f172a' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, minHeight: '36px', lineHeight: '1.45' }}>
                  {plan.description}
                </p>
              </div>

              {/* Price display */}
              <div style={{
                marginBottom: '20px',
                padding: '14px 0',
                borderTop: '1px solid #f1f5f9',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                    {plan.monthlyPrice === 0 ? 'USD / forever' : isYearly ? 'USD / year' : 'USD / month'}
                  </span>
                </div>
                {isYearly && plan.monthlyPrice > 0 && (
                  <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: '700', marginTop: '3px' }}>
                    Equals ${(price / 12).toFixed(1)}/month (Billed annually)
                  </div>
                )}
              </div>

              {/* Clean Action Button */}
              <button
                type="button"
                onClick={() => handleCheckout(plan.id)}
                disabled={isCurrent || isCheckingOut || actionLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: isCurrent ? '1px solid #e2e8f0' : 'none',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: isCurrent ? 'default' : isCheckingOut ? 'wait' : 'pointer',
                  background: isCurrent
                    ? '#f8fafc'
                    : isPopular
                      ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                      : '#2563eb',
                  color: isCurrent ? '#64748b' : '#ffffff',
                  boxShadow: isCurrent ? 'none' : '0 2px 8px rgba(37,99,235,0.25)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s'
                }}
              >
                {isCheckingOut ? (
                  <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                ) : isCurrent ? (
                  <><i className="fas fa-check"></i> Current Plan</>
                ) : plan.id === 'free' ? (
                  'Downgrade to Free'
                ) : (
                  <><i className="fas fa-arrow-up"></i> Upgrade Plan</>
                )}
              </button>

              {/* Feature List */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>
                  Features Included:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  {plan.features.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                      <i className="fas fa-check" style={{ color: '#10b981', fontSize: '11px', flexShrink: 0 }}></i>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <i className="fas fa-xmark" style={{ color: '#cbd5e1', fontSize: '11px', flexShrink: 0 }}></i>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invoices & Transaction History - Matching Dashboard White Style */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              <i className="fas fa-file-invoice" style={{ marginRight: '8px', color: '#2563eb' }}></i>
              Billing Receipts &amp; Transactions
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Official transaction receipts and payment history.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchBilling}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-rotate"></i> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px' }}>Transaction ID</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>Amount</th>
                <th style={{ padding: '10px 14px' }}>Method</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length > 0 ? (
                paymentHistory.map((inv, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '600', color: '#2563eb' }}>
                      {inv.invoice_id || inv.transaction_id || `TXN-${idx + 1}`}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {inv.created_at || inv.billed_at || 'Recent'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>
                      ${inv.amount || 20}.00 USD
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      <i className="fas fa-credit-card" style={{ marginRight: '6px' }}></i> Electronic Payment
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        fontSize: '11px',
                        fontWeight: '800'
                      }}>
                        PAID &amp; ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 14px', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-receipt" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', opacity: 0.4 }}></i>
                    No prior invoices recorded. Your account is on {currentPlanId.toUpperCase()} tier.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
