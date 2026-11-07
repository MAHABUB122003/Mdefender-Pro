import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/api';
import userStore from '../utils/userStore';
import PaymentModal from '../components/PaymentModal';
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
  Plus,
  Minus,
  Layers,
  Database,
  RotateCcw,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const CAPABILITIES = [
  {
    title: 'Next-Gen WAF & Layer-7 DDoS Shield',
    desc: 'Sub-millisecond (<0.12ms) line-rate inspection with AST machine learning and PoW bot challenge.',
    icon: Shield,
    color: '#059669',
  },
  {
    title: 'IP Blacklist / Whitelist & Geo-Fencing',
    desc: 'CIDR subnet blocking, sovereign country fences, and instant automated IP reputation bans.',
    icon: Globe,
    color: '#E8792F',
  },
  {
    title: '5.24M+ Checksum Malware Hunter',
    desc: 'Instant 0.01ms file integrity checks against official WP core hashes with AST code analysis.',
    icon: Database,
    color: '#2563EB',
  },
  {
    title: 'Post-Hack Recovery & Rapid Clean',
    desc: '1-click compromised site disinfection, secret salts rotation, and rogue admin purge.',
    icon: RotateCcw,
    color: '#DC2626',
  },
  {
    title: 'Live Logs & Forensic Event Stream',
    desc: 'Real-time HTTP request inspector, raw payload dumps, and multi-channel instant alerts.',
    icon: Activity,
    color: '#0284C7',
  },
  {
    title: 'WordPress Hardening & RASP',
    desc: 'Stealth admin gateway, native RFC-6238 2FA, uploads PHP lockdown, and security headers.',
    icon: Lock,
    color: '#7C3AED',
  },
  {
    title: 'Multi-Site Fleet Safe Updates',
    desc: 'Bulk 1-click plugin/theme updates with automated pre-update snapshot safety rollback.',
    icon: Layers,
    color: '#0F2C26',
  },
  {
    title: 'Dark Web Breach Intel & Reports',
    desc: 'Credential leak monitoring, fleet-wide 404 crawler, and white-label client PDF audit exports.',
    icon: Sparkles,
    color: '#D97706',
  },
];

export default function UserPricing() {
  const { dark } = useTheme();
  const [searchParams] = useSearchParams();

  // URL parameters if coming from public pricing page
  const initialSitesParam = parseInt(searchParams.get('sites') || '3', 10);
  const initialCycleParam = searchParams.get('cycle') || 'monthly';

  const cachedUser = userStore.get('profile') || userStore.get('dashboard')?.user || null;
  const [profile, setProfile] = useState(() => cachedUser);
  const [billingCycle, setBillingCycle] = useState(initialCycleParam);
  const [sitesCount, setSitesCount] = useState(isNaN(initialSitesParam) || initialSitesParam < 1 ? 3 : initialSitesParam);
  const [billingData, setBillingData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [onboardingNotice, setOnboardingNotice] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const isYearly = billingCycle === 'yearly';

  // Pricing configuration: $4/month or $40/year per site
  const monthlyRate = 4;
  const yearlyRate = 40; // $3.33/mo equivalent (2 months free)

  const totalPrice = isYearly ? sitesCount * yearlyRate : sitesCount * monthlyRate;
  const effectiveMonthly = isYearly ? (totalPrice / 12).toFixed(2) : totalPrice.toFixed(2);
  const savingsAmount = isYearly ? sitesCount * (monthlyRate * 12 - yearlyRate) : 0;

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const [profRes, billRes, histRes] = await Promise.allSettled([
        api.getProfile(),
        api.getBillingSubscription(),
        api.getPaymentHistory(),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value?.data) {
        setProfile(profRes.value.data);
        userStore.set('profile', profRes.value.data);
      }
      if (billRes.status === 'fulfilled') {
        setBillingData(billRes.value?.data || billRes.value);
      }
      if (histRes.status === 'fulfilled') {
        const hist = histRes.value?.data || histRes.value?.payments || [];
        setPaymentHistory(Array.isArray(hist) ? hist : []);
      }
    } catch (e) {
      console.warn('Failed to fetch billing info:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const currentPlanId = (profile?.plan || billingData?.plan_id || 'free').toLowerCase();
  const isPaidActive = currentPlanId !== 'free' && profile?.payment_status === 'active';
  const allocatedSlots = profile?.website_limit || profile?.website_slots || (currentPlanId === 'free' ? 1 : 10);

  const handleSitesChange = (val) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 500) {
      setSitesCount(num);
    }
  };

  // Launch direct checkout for the selected number of websites
  const handleLaunchCheckout = async () => {
    setCheckoutLoading(true);
    setOnboardingNotice(null);

    try {
      // 1. Fetch live config and ensure payment SDK is ready
      const cfgRes = await api.getBillingConfig();
      const cfg = cfgRes?.data || cfgRes;
      if (window.Paddle && cfg?.client_token) {
        try {
          if (cfg.environment === 'sandbox') {
            window.Paddle.Environment.set('sandbox');
          }
          window.Paddle.Initialize({ token: cfg.client_token });
        } catch (initErr) {
          console.warn('Init error:', initErr);
        }
      }

      // 2. Request backend to create transaction with custom quantity
      const res = await api.createPaddleCheckout({
        plan: 'pro',
        quantity: sitesCount,
        sites: sitesCount,
        billing_cycle: billingCycle,
        return_url: window.location.href,
        success_url: `${window.location.origin}/payment/success?plan=pro&cycle=${billingCycle}&sites=${sitesCount}`,
      });

      if (!res.success && res.error) {
        if (res.error.code === 'transaction_checkout_not_enabled') {
          setOnboardingNotice({
            title: 'Payment Gateway Setup Pending',
            message: res.error.message || 'Payment checkouts are currently being configured for your account. Please try again shortly or contact support.',
            url: '#',
          });
          return;
        }
        throw new Error(res.error.message || 'Failed to initiate checkout.');
      }

      const checkoutData = res.data || res;

      // 3. Open Checkout Overlay
      if (checkoutData.checkout_id && window.Paddle) {
        try {
          window.Paddle.Checkout.open({
            transactionId: checkoutData.checkout_id,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: `${window.location.origin}/payment/success?plan=pro&cycle=${billingCycle}&sites=${sitesCount}`,
            },
          });
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
          items: [{ priceId: checkoutData.price_id, quantity: sitesCount }],
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            successUrl: `${window.location.origin}/payment/success?plan=pro&cycle=${billingCycle}&sites=${sitesCount}`,
          },
        });
        return;
      }

      // Fallback: Open Card & Bank Payment Modal
      setPaymentModalOpen(true);
    } catch (err) {
      // Fallback to internal card modal
      setPaymentModalOpen(true);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '28px 24px 68px',
        color: '#10201E',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
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
            fontSize: '13.5px',
          }}
        >
          {toastMessage.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Payment Gateway Setup Pending Notice */}
      {onboardingNotice && (
        <div
          style={{
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
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FFF4ED',
                color: '#E8792F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
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
            <button
              onClick={() => setPaymentModalOpen(true)}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#0B2522',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <span>Pay with Card / Bank Transfer</span>
            </button>
            <button
              onClick={() => setOnboardingNotice(null)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD8CF',
                background: '#ffffff',
                color: '#60716B',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header Banner & Status Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '28px',
          border: '1px solid #D9E1DC',
          boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
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
                gap: '6px',
              }}
            >
              <ShieldCheck size={13} strokeWidth={2.4} style={{ color: '#059669' }} />
              <span>Active Security Workspace</span>
            </span>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: isPaidActive ? '#E8F3EC' : '#FFF4ED',
                color: isPaidActive ? '#059669' : '#E8792F',
                border: `1px solid ${isPaidActive ? '#CFE2D4' : '#FCD3B6'}`,
              }}
            >
              {isPaidActive ? 'PRO SUBSCRIPTION ACTIVE' : '14-DAY FREE TRIAL'}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: '#10201E', letterSpacing: '-0.03em' }}>
            Subscription &amp; Website Slots
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#60716B', maxWidth: '640px', lineHeight: '1.55' }}>
            Predictable per-website licensing: exactly <strong>$4 / website / month</strong>. Scale up or down anytime.
            Every connected website receives full enterprise AI WAF, 5.24M checksum malware scanning, and post-hack recovery.
          </p>
        </div>

        {/* Current Account Status Quick Box */}
        <div
          style={{
            background: '#F7F6F1',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '16px 22px',
            minWidth: '240px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#60716B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Allocated Website Licenses
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isPaidActive ? '#059669' : '#E8792F',
                boxShadow: isPaidActive ? '0 0 6px rgba(5, 150, 105, 0.4)' : 'none',
              }}
            />
            <span>{allocatedSlots} Website {allocatedSlots === 1 ? 'Slot' : 'Slots'}</span>
          </div>
          {profile?.plan_expires && (
            <div style={{ fontSize: '11.5px', color: '#60716B', marginTop: '4px' }}>
              Current cycle valid through: {new Date(profile.plan_expires).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* ===================== INTERACTIVE UPGRADE & SCALE CALCULATOR ===================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '2px solid #E6ECE8',
          boxShadow: '0 16px 45px rgba(11, 37, 34, 0.06)',
          padding: 'clamp(28px, 4vw, 40px)',
          marginBottom: '36px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          {/* Left: Site Counter & Billing Cycle Toggle */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#E8792F',
                marginBottom: '6px',
              }}
            >
              Expand or Renew Your Fleet
            </div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#10201E',
                margin: '0 0 10px',
              }}
            >
              Select Number of Websites to Protect
            </h2>
            <p style={{ fontSize: '14px', color: '#60716B', lineHeight: '1.55', margin: '0 0 22px' }}>
              Need to protect 1, 5, or 25 client websites? Add or remove site licenses dynamically at $4/month per site.
            </p>

            {/* Billing Cycle Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '22px' }}>
              <div
                style={{
                  background: '#E8EEE8',
                  padding: '4px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  gap: '4px',
                  border: '1px solid #D9E1DC',
                }}
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '7px 20px',
                    borderRadius: '999px',
                    border: 'none',
                    background: !isYearly ? '#0B2522' : 'transparent',
                    color: !isYearly ? '#ffffff' : '#60716B',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Monthly ($4 / site)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '7px 20px',
                    borderRadius: '999px',
                    border: 'none',
                    background: isYearly ? '#0B2522' : 'transparent',
                    color: isYearly ? '#ffffff' : '#60716B',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Annual ($40 / site)</span>
                  <span
                    style={{
                      background: '#E8792F',
                      color: '#ffffff',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontWeight: '800',
                    }}
                  >
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Counter Widget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setSitesCount((prev) => Math.max(1, prev - 1))}
                disabled={sitesCount <= 1}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD8CF',
                  background: sitesCount <= 1 ? '#F7F6F1' : '#FFFFFF',
                  color: sitesCount <= 1 ? '#CBD8CF' : '#0B2522',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: sitesCount <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <Minus size={18} strokeWidth={2.6} />
              </button>

              <input
                type="number"
                min="1"
                max="500"
                value={sitesCount}
                onChange={(e) => handleSitesChange(e.target.value)}
                style={{
                  width: '100px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '2px solid #0B2522',
                  background: '#FBFCFA',
                  textAlign: 'center',
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0B2522',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => setSitesCount((prev) => Math.min(500, prev + 1))}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #0B2522',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} strokeWidth={2.6} />
              </button>

              <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#10201E', marginLeft: '6px' }}>
                {sitesCount === 1 ? 'Website License' : 'Website Licenses'}
              </span>
            </div>

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#7A928B', alignSelf: 'center' }}>Presets:</span>
              {[1, 3, 5, 10, 20, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSitesCount(num)}
                  style={{
                    padding: '3px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: sitesCount === num ? '1.5px solid #059669' : '1px solid #D9E1DC',
                    background: sitesCount === num ? '#E8EEE8' : '#FFFFFF',
                    color: sitesCount === num ? '#059669' : '#4A5D5A',
                    cursor: 'pointer',
                  }}
                >
                  {num} {num === 1 ? 'Site' : 'Sites'}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Price Total & Checkout CTA Box */}
          <div
            style={{
              background: '#F7F6F1',
              borderRadius: '18px',
              border: '1px solid #D9E1DC',
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                border: '1px solid #CBD8CF',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#059669',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              <CheckCircle2 size={13} strokeWidth={2.4} />
              <span>Full Enterprise Capabilities Included</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900, color: '#10201E', letterSpacing: '-0.05em', lineHeight: 1 }}>
                ${totalPrice}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#5B756E' }}>
                {isYearly ? '/ year total' : '/ month total'}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#5B756E', fontWeight: 600, marginBottom: '20px' }}>
              {isYearly ? (
                <span>
                  Effective <strong>${effectiveMonthly}/mo</strong> (${(yearlyRate / 12).toFixed(2)}/site/mo) ·{' '}
                  <strong style={{ color: '#E8792F' }}>Save ${savingsAmount}/yr</strong>
                </span>
              ) : (
                <span>
                  Billed monthly at <strong>${monthlyRate}.00 per website</strong> · Cancel anytime
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleLaunchCheckout}
              disabled={checkoutLoading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: '#0B2522',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 800,
                border: 'none',
                cursor: checkoutLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(11, 37, 34, 0.2)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#153B34')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0B2522')}
            >
              {checkoutLoading ? (
                <span>Preparing Secure Checkout...</span>
              ) : (
                <>
                  <span>Activate &amp; Pay for {sitesCount} {sitesCount === 1 ? 'Site' : 'Sites'}</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </>
              )}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '11.5px',
                color: '#5B756E',
                fontWeight: 600,
                marginTop: '14px',
              }}
            >
              <span>✓ Instant Slot Activation</span>
              <span>✓ 256-Bit Encrypted</span>
              <span>✓ Card &amp; Bank Transfer</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== 8 ENTERPRISE CAPABILITIES SNAPSHOT ===================== */}
      <div style={{ marginBottom: '44px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            What is Included with Every Website License ($4/mo)
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#60716B' }}>
            Zero tiered limitations. Every single connected website receives 100% of our enterprise tools.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {CAPABILITIES.map((cap, idx) => {
            const IconComp = cap.icon;
            return (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #D9E1DC',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(11, 37, 34, 0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#F7F6F1',
                    border: '1px solid #E6ECE8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cap.color,
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                    {cap.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#5B756E', lineHeight: '1.5' }}>
                    {cap.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================== INVOICES & TRANSACTION HISTORY ===================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #D9E1DC',
          padding: '26px 28px',
          boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
        }}
      >
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
              transition: 'all 0.15s ease',
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
                      ${inv.amount || totalPrice}.00 USD
                    </td>
                    <td style={{ padding: '14px 16px', color: '#60716B' }}>
                      <CreditCard size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                      <span>Electronic Gateway</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: '#E8F3EC',
                          color: '#28745D',
                          border: '1px solid #CFE2D4',
                          fontSize: '11px',
                          fontWeight: '800',
                        }}
                      >
                        PAID &amp; ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: '#60716B' }}>
                    <FileText size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                    No prior invoices recorded. Your account has {allocatedSlots} website {allocatedSlots === 1 ? 'slot' : 'slots'} available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Payment Modal for Card/Bank Checkout */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        plan="pro"
        billingCycle={isYearly ? 'yearly' : 'monthly'}
        onSuccess={() => {
          setPaymentModalOpen(false);
          showToast(`Successfully upgraded to ${sitesCount} website licenses!`, false);
          fetchBilling();
        }}
      />
    </div>
  );
}
