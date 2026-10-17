import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import userStore from '../utils/userStore';
import {
  Shield,
  Check,
  Lock,
  X,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  CreditCard,
} from 'lucide-react';

const PLAN_META = {
  go: {
    name: 'Developer Go',
    icon: Zap,
    monthlyPrice: 9,
    yearlyPrice: 90,
    features: [
      '5 Protected Domains & Origin Endpoints',
      '100,000 monthly clean requests',
      '6.5M+ Threat Neural Classifier',
      '20 Custom Regex Rules Builder',
      'Priority Email Technical SLA',
    ],
  },
  pro: {
    name: 'Enterprise Pro',
    icon: Sparkles,
    monthlyPrice: 20,
    yearlyPrice: 190,
    features: [
      '10 Protected Domains & APIs',
      '1,000,000 monthly clean requests',
      'Full 2,000,000+ Hyper-Scale Signatures',
      '639K+ Generative AI Prompt Injection Shield',
      'Sub-Millisecond (0.12ms) Edge Inspection Latency',
      '24/7 Priority Dedicated SLA Support',
    ],
  },
  enterprise: {
    name: 'Dedicated Enterprise',
    icon: Globe,
    monthlyPrice: 49,
    yearlyPrice: 470,
    features: [
      '15 Protected Domains & Custom Fleet',
      '10,000,000+ monthly edge requests',
      'Dedicated ML Neural Vectorizer Node',
      'Full Anycast Layer 7 DDoS Scrubber',
      '15-Minute Guaranteed SLA Response',
    ],
  },
};

export default function PaymentModal({ isOpen, onClose, plan = 'pro', billingCycle = 'monthly', onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [onboardingNotice, setOnboardingNotice] = useState(null);

  const isYearly = billingCycle.toLowerCase() === 'yearly';
  const meta = PLAN_META[plan] || PLAN_META.pro;
  const planName = meta.name;
  const usdPrice = isYearly ? meta.yearlyPrice : meta.monthlyPrice;
  const PlanIcon = meta.icon;

  const cachedUser = userStore.get('profile') || null;
  const loggedInEmail = cachedUser?.email || '';

  useEffect(() => {
    if (isOpen) {
      setError('');
      setOnboardingNotice(null);

      // Initialize Paddle SDK
      api.getBillingConfig()
        .then((res) => {
          const cfg = res?.data || res;
          if (cfg?.client_token && window.Paddle) {
            try {
              if (cfg.environment === 'sandbox') {
                window.Paddle.Environment.set('sandbox');
              }
              window.Paddle.Initialize({
                token: cfg.client_token,
              });
            } catch (e) {
              console.warn('Paddle Init Warning:', e);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setOnboardingNotice(null);

    const emailToSend = loggedInEmail || guestEmail.trim();

    if (!loggedInEmail && !emailToSend) {
      setError('Please provide an email address for your license and receipt.');
      setLoading(false);
      return;
    }

    if (emailToSend && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSend)) {
      setError('Please provide a valid email address.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch live config and ensure Paddle SDK is ready
      const cfgRes = await api.getBillingConfig();
      const cfg = cfgRes?.data || cfgRes;
      if (window.Paddle && cfg?.client_token) {
        try {
          if (cfg.environment === 'sandbox') {
            window.Paddle.Environment.set('sandbox');
          }
          window.Paddle.Initialize({ token: cfg.client_token });
        } catch (initErr) {
          console.warn('Paddle init error:', initErr);
        }
      }

      // 2. Request backend to create transaction
      const res = await api.createPaddleCheckout({
        plan,
        billing_cycle: billingCycle,
        customer_email: emailToSend,
        email: emailToSend,
        return_url: window.location.href,
        success_url: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle,
      });

      if (!res.success && res.error) {
        if (res.error.code === 'transaction_checkout_not_enabled') {
          setOnboardingNotice({
            title: 'Paddle Live Onboarding Pending',
            message: res.error.message || 'Checkouts are not enabled yet for your live Paddle account. Please complete your business verification and website domain approval in your Paddle Dashboard.',
            url: 'https://vendors.paddle.com',
          });
          return;
        }
        throw new Error(res.error.message || 'Failed to initiate checkout session.');
      }

      const checkoutData = res.data || res;

      // 3. Open Paddle Checkout directly
      if (checkoutData.checkout_id && window.Paddle) {
        try {
          window.Paddle.Checkout.open({
            transactionId: checkoutData.checkout_id,
            customer: emailToSend ? { email: emailToSend } : undefined,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle,
            },
          });
          onClose();
          return;
        } catch (overlayErr) {
          console.warn('Overlay error, falling back to URL:', overlayErr);
        }
      }

      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
        return;
      }

      if (checkoutData.price_id && window.Paddle) {
        window.Paddle.Checkout.open({
          items: [{ priceId: checkoutData.price_id, quantity: 1 }],
          customer: emailToSend ? { email: emailToSend } : undefined,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            successUrl: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle,
          },
        });
        onClose();
        return;
      }

      throw new Error(checkoutData.message || 'Unable to launch automated checkout. Please verify gateway settings.');
    } catch (err) {
      setError(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 37, 34, 0.68)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'modalFadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(11, 37, 34, 0.22)',
          color: '#10201E',
          position: 'relative',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid #D9E1DC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FBFCFA',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#E8EEE8',
                border: '1px solid #D9E1DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B2522',
              }}
            >
              <PlanIcon size={20} strokeWidth={2.4} style={{ color: '#E8792F' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2A8B68' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#10201E', letterSpacing: '-0.02em' }}>
                  Secured Checkout
                </h3>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#60716B', fontWeight: 500 }}>
                {planName} &middot; {isYearly ? `Annual Cycle ($${usdPrice}/yr)` : `Monthly Cycle ($${usdPrice}/mo)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '9px',
              width: '32px',
              height: '32px',
              color: '#60716B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10201E';
              e.currentTarget.style.color = '#10201E';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#D9E1DC';
              e.currentTarget.style.color = '#60716B';
            }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 26px 28px' }}>
          {/* Onboarding Notice Banner */}
          {onboardingNotice && (
            <div
              style={{
                background: '#FFF8F4',
                border: '1px solid #FCD3B6',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} style={{ color: '#E8792F', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 800, color: '#A34F22' }}>
                    {onboardingNotice.title}
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#873B11', lineHeight: 1.5 }}>
                    {onboardingNotice.message}
                  </p>
                  <a
                    href={onboardingNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#0B2522',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open Paddle Dashboard</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Plan Summary Card */}
          <div
            style={{
              background: '#F7F6F1',
              border: '1px solid #D9E1DC',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '10px',
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                }}
              >
                Plan Selection
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10201E', marginTop: '2px' }}>
                {planName}
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>
                {isYearly ? 'Billed annually (Includes 20% discount)' : 'Billed monthly · Cancel anytime'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 850,
                  color: '#10201E',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                ${usdPrice}
              </div>
              <div style={{ fontSize: '11px', color: '#60716B', fontWeight: 600, marginTop: '2px' }}>
                USD
              </div>
            </div>
          </div>

          {/* Included Features Snapshot */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#60716B',
                letterSpacing: '0.1em',
                marginBottom: '10px',
              }}
            >
              Included In This Deployment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {meta.features.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#10201E' }}>
                  <Check size={14} strokeWidth={2.6} style={{ color: '#2A8B68', flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Email input for unauthenticated / guest checkout */}
          {!loggedInEmail ? (
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#10201E',
                  marginBottom: '6px',
                }}
              >
                Your Email Address <span style={{ color: '#E8792F' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD8CF',
                  background: '#FFFFFF',
                  fontSize: '13.5px',
                  color: '#10201E',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0B2522')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD8CF')}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '6px',
                  fontSize: '11.5px',
                  color: '#60716B',
                }}
              >
                <span>For receipt and edge license key</span>
                <Link
                  to="/user/login"
                  style={{ color: '#E8792F', textDecoration: 'none', fontWeight: 600 }}
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginBottom: '20px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#E8EEE8',
                fontSize: '12px',
                color: '#10201E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Logged in as: <strong>{loggedInEmail}</strong></span>
              <span style={{ color: '#2A8B68', fontWeight: 700 }}>Active</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FFF4ED',
                border: '1px solid #FCD3B6',
                color: '#A34F22',
                fontSize: '12.5px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Checkout Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '10px',
              background: '#0B2522',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(11, 37, 34, 0.22)',
              marginBottom: '16px',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#153B34';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#0B2522';
            }}
          >
            {loading ? (
              <span>Preparing Secured Gateway...</span>
            ) : (
              <>
                <Lock size={15} strokeWidth={2.4} />
                <span>Proceed to Secured Checkout &middot; ${usdPrice}</span>
                <ArrowRight size={14} strokeWidth={2.4} />
              </>
            )}
          </button>

          {/* Security Guarantee Strip */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#60716B',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} style={{ color: '#2A8B68', flexShrink: 0 }} />
            <span>256-bit encrypted edge transaction. 30-day money-back guarantee.</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
