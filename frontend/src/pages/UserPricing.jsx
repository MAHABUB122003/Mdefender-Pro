import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api/api'
import userStore from '../utils/userStore'
import {
  Shield,
  Check,
  X,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Sparkles,
  Globe,
  RefreshCw,
  FileText,
  AlertTriangle,
  CreditCard,
  Lock,
} from 'lucide-react'

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
      padding: '28px 24px 68px',
      color: '#10201E',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#A34F22' : '#0B2522',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(11, 37, 34, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px'
        }}>
          {toastMessage.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Paddle Onboarding Pending Notice Banner */}
      {onboardingNotice && (
        <div style={{
          background: '#FFF8F4',
          border: '1.5px solid #FCD3B6',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(232, 121, 47, 0.08)',
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
              background: '#FFF4ED',
              color: '#E8792F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#A34F22' }}>
                {onboardingNotice.title}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#873B11', lineHeight: '1.5' }}>
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
                background: '#0B2522',
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
              <ArrowUpRight size={13} strokeWidth={2.4} />
            </a>
            <button
              onClick={() => setOnboardingNotice(null)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #D9E1DC',
                color: '#10201E',
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

      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid #D9E1DC',
        boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
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
              letterSpacing: '0.08em',
              background: '#E8EEE8',
              color: '#0B2522',
              border: '1px solid #D9E1DC',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={12} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
              <span>Active Security Workspace</span>
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: isPaidActive ? '#E8F3EC' : '#F7F6F1',
              color: isPaidActive ? '#2A8B68' : '#60716B',
              border: `1px solid ${isPaidActive ? '#CFE2D4' : '#D9E1DC'}`
            }}>
              Current Plan: {currentPlanId.toUpperCase()}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: '#10201E', letterSpacing: '-0.03em' }}>
            Subscription &amp; Protection Plans
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#60716B', maxWidth: '640px', lineHeight: '1.55' }}>
            Self-service upgrade with instant activation. Protect more domains, deploy 2M+ attack signatures, and unlock 6.5M+ neural threat vectorizer.
          </p>
        </div>

        {/* Quick User Plan Card */}
        <div style={{
          background: '#FBFCFA',
          border: '1px solid #D9E1DC',
          borderRadius: '12px',
          padding: '16px 20px',
          minWidth: '220px'
        }}>
          <div style={{ fontSize: '11px', color: '#60716B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Account Status
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isPaidActive ? '#2A8B68' : '#E8792F',
              boxShadow: isPaidActive ? '0 0 6px #2A8B68' : 'none'
            }} />
            <span>{currentPlanId === 'go' ? 'Developer Go' : currentPlanId === 'enterprise' ? 'Dedicated Enterprise' : currentPlanId === 'pro' ? 'Enterprise Pro' : 'Starter Free'}</span>
          </div>
          {profile?.plan_expires && (
            <div style={{ fontSize: '11.5px', color: '#60716B', marginTop: '4px' }}>
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
          background: '#E8EEE8',
          padding: '5px',
          borderRadius: '999px',
          display: 'inline-flex',
          gap: '5px',
          border: '1px solid #D9E1DC',
          boxShadow: 'inset 0 1px 3px rgba(11, 37, 34, 0.05)'
        }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 22px',
              borderRadius: '999px',
              border: 'none',
              background: !isYearly ? '#0B2522' : 'transparent',
              color: !isYearly ? '#ffffff' : '#60716B',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: !isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 22px',
              borderRadius: '999px',
              border: 'none',
              background: isYearly ? '#0B2522' : 'transparent',
              color: isYearly ? '#ffffff' : '#60716B',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.18s ease'
            }}
          >
            <span>Annual Billing</span>
            <span style={{
              background: '#E8792F',
              color: '#ffffff',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: '800',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* 4 Pricing Plan Cards */}
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
          const PlanIcon = plan.id === 'go' ? Zap : plan.id === 'enterprise' ? Globe : plan.id === 'pro' ? Sparkles : Shield

          return (
            <div
              key={plan.id}
              style={{
                background: '#ffffff',
                border: isPopular
                  ? '1.5px solid #E8792F'
                  : isCurrent
                    ? '1.5px solid #2A8B68'
                    : '1px solid #D9E1DC',
                borderRadius: '16px',
                padding: '26px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: isPopular
                  ? '0 16px 40px rgba(232, 121, 47, 0.12), 0 4px 18px rgba(11, 37, 34, 0.04)'
                  : isCurrent
                    ? '0 10px 30px rgba(42, 139, 104, 0.08)'
                    : '0 4px 20px rgba(11, 37, 34, 0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div>
                {/* Header Row: Icon & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isPopular ? '#FFF4ED' : '#E8EEE8',
                    border: isPopular ? '1px solid #FCD3B6' : '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isPopular ? '#E8792F' : '#0B2522'
                  }}>
                    <PlanIcon size={19} strokeWidth={2.4} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCurrent && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        background: '#E8F3EC',
                        color: '#2A8B68',
                        border: '1px solid #CFE2D4',
                        letterSpacing: '0.04em'
                      }}>
                        ACTIVE PLAN
                      </span>
                    )}
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: isPopular ? '#E8792F' : '#E8EEE8',
                      color: isPopular ? '#ffffff' : '#60716B',
                      boxShadow: isPopular ? '0 2px 6px rgba(232, 121, 47, 0.3)' : 'none'
                    }}>
                      {plan.badge}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: '800', margin: '0 0 6px', color: '#10201E', letterSpacing: '-0.02em' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#60716B', margin: 0, minHeight: '36px', lineHeight: '1.5' }}>
                    {plan.description}
                  </p>
                </div>

                {/* Price display */}
                <div style={{
                  marginBottom: '20px',
                  padding: '14px 0',
                  borderTop: '1px solid #D9E1DC',
                  borderBottom: '1px solid #D9E1DC'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '38px', fontWeight: '850', color: '#10201E', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      ${price}
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#60716B', fontWeight: '600' }}>
                      {plan.monthlyPrice === 0 ? 'forever' : isYearly ? '/ year' : '/ month'}
                    </span>
                  </div>
                  {isYearly && plan.monthlyPrice > 0 && (
                    <div style={{ fontSize: '11.5px', color: '#E8792F', fontWeight: '700', marginTop: '4px' }}>
                      ${(price / 12).toFixed(2)}/mo &middot; Save ${plan.monthlyPrice * 12 - plan.yearlyPrice}/yr
                    </div>
                  )}
                  {plan.monthlyPrice === 0 && (
                    <div style={{ fontSize: '11.5px', color: '#2A8B68', fontWeight: '600', marginTop: '4px' }}>
                      Free tier active
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || isCheckingOut || actionLoading}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '10px',
                    border: isCurrent ? '1px solid #D9E1DC' : 'none',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: isCurrent ? 'default' : isCheckingOut ? 'wait' : 'pointer',
                    background: isCurrent
                      ? '#E8EEE8'
                      : '#0B2522',
                    color: isCurrent ? '#60716B' : '#ffffff',
                    boxShadow: isCurrent ? 'none' : '0 4px 14px rgba(11, 37, 34, 0.2)',
                    marginBottom: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent && !isCheckingOut) e.currentTarget.style.background = '#153B34'
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent && !isCheckingOut) e.currentTarget.style.background = '#0B2522'
                  }}
                >
                  {isCheckingOut ? (
                    <><span>Launching Checkout...</span></>
                  ) : isCurrent ? (
                    <><Check size={15} strokeWidth={2.4} style={{ color: '#2A8B68' }} /><span>Current Active Plan</span></>
                  ) : plan.id === 'free' ? (
                    'Downgrade to Free'
                  ) : (
                    <><span>Deploy &amp; Activate Plan</span><ArrowRight size={14} strokeWidth={2.4} /></>
                  )}
                </button>

                {/* Feature List */}
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#10201E', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    Capabilities Snapshot
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '13px' }}>
                    {plan.features.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10201E' }}>
                        <Check size={14} strokeWidth={2.6} style={{ color: '#2A8B68', flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#87948D', textDecoration: 'line-through' }}>
                        <X size={14} strokeWidth={2} style={{ color: '#CBD8CF', flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invoices & Transaction History */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        padding: '26px 28px',
        boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={17} strokeWidth={2.4} style={{ color: '#E8792F' }} />
              <span>Billing Receipts &amp; Transactions</span>
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              Official payment receipts and subscription records.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchBilling}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              background: '#FBFCFA',
              border: '1px solid #D9E1DC',
              color: '#10201E',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E8EEE8')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FBFCFA')}
          >
            <RefreshCw size={13} strokeWidth={2.2} />
            <span>Refresh</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBFCFA', color: '#60716B', borderBottom: '1px solid #D9E1DC' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Transaction ID</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Method</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length > 0 ? (
                paymentHistory.map((inv, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #D9E1DC' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '600', color: '#0B2522' }}>
                      {inv.invoice_id || inv.transaction_id || `TXN-${idx + 1}`}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#60716B' }}>
                      {inv.created_at || inv.billed_at || 'Recent'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '750', color: '#10201E' }}>
                      ${inv.amount || 20}.00 USD
                    </td>
                    <td style={{ padding: '14px 16px', color: '#60716B' }}>
                      <CreditCard size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                      <span>Electronic Gateway</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: '#E8F3EC',
                        color: '#28745D',
                        border: '1px solid #CFE2D4',
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
                  <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: '#60716B' }}>
                    <FileText size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
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
