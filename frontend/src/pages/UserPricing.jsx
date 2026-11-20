import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/api';
import userStore from '../utils/userStore';
import { getStoredPricingConfig, subscribePricing, syncPricingWithBackend } from '../utils/pricingStore';
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
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';

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
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  // Zero-flicker: initialize directly from instant persistent storage
  const [pricingConfig, setPricingConfig] = useState(() => getStoredPricingConfig());

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCancelAutoRenew = async () => {
    setCancelling(true);
    try {
      const res = await api.cancelAutoRenew();
      if (res?.success || res?.status === 'success') {
        showToast(res?.message || 'Auto-renewal has been turned off.');
        setCancelModalOpen(false);
        fetchBilling();
      } else {
        showToast(res?.error?.message || 'Failed to cancel auto-renewal', true);
      }
    } catch (e) {
      showToast(e?.message || 'Cancellation error', true);
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateAutoRenew = async () => {
    setReactivating(true);
    try {
      const res = await api.reactivateAutoRenew();
      if (res?.success || res?.status === 'success') {
        showToast(res?.message || 'Auto-renewal reactivated successfully.');
        fetchBilling();
      } else {
        showToast(res?.error?.message || 'Failed to reactivate auto-renewal', true);
      }
    } catch (e) {
      showToast(e?.message || 'Reactivation error', true);
    } finally {
      setReactivating(false);
    }
  };

  const isYearly = billingCycle === 'yearly';

  // Dynamic pricing configuration synced with Super Admin
  const monthlyRate = Number(pricingConfig?.base_monthly_rate) || 4;
  const yearlyRate = Number(pricingConfig?.base_yearly_rate) || 40;

  const getDiscount = (count) => {
    const tiers = (pricingConfig && Array.isArray(pricingConfig.bulk_tiers)) ? pricingConfig.bulk_tiers : [];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (tiers[i] && count >= (tiers[i].min_sites || 0)) {
        return tiers[i];
      }
    }
    return { discount_percent: 0, label: 'Standard' };
  };

  const activeTier = getDiscount(sitesCount) || { discount_percent: 0, label: 'Standard' };
  const rawBase = isYearly ? sitesCount * yearlyRate : sitesCount * monthlyRate;
  const discountAmount = (rawBase * (activeTier.discount_percent || 0)) / 100;
  const totalPrice = Math.max(0, rawBase - discountAmount);
  const effectiveMonthly = isYearly ? (totalPrice / 12).toFixed(2) : totalPrice.toFixed(2);
  const savingsAmount = isYearly ? (sitesCount * monthlyRate * 12 - totalPrice).toFixed(2) : 0;

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const [profRes, billRes, histRes, configRes] = await Promise.allSettled([
        api.getProfile(),
        api.getBillingSubscription(),
        api.getPaymentHistory(),
        syncPricingWithBackend(api),
      ]);

      if (configRes.status === 'fulfilled' && configRes.value?.base_monthly_rate) {
        setPricingConfig(configRes.value);
      }

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

    // Subscribe to cross-tab administrative pricing updates
    const unsubscribe = subscribePricing((newCfg) => {
      if (newCfg) {
        setPricingConfig(newCfg);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const currentPlanId = (profile?.plan || billingData?.plan_id || 'free').toLowerCase();
  const isPaidActive = (currentPlanId !== 'free' && (profile?.payment_status === 'active' || billingData?.is_paid || profile?.is_paid));
  const allocatedSlots = profile?.website_limit || profile?.website_slots || profile?.purchased_slots || (currentPlanId === 'free' ? 1 : 10);
  const isAutoRenewOn = billingData?.auto_renew !== undefined
    ? Boolean(billingData.auto_renew && !billingData.cancel_at_period_end)
    : Boolean(profile?.auto_renew !== false && !profile?.cancel_at_period_end);
  const cycleEndDate = profile?.plan_expires || billingData?.plan_expires || billingData?.subscription?.next_billed_at;
  const formattedCycleEnd = cycleEndDate && !isNaN(new Date(cycleEndDate).getTime())
    ? new Date(cycleEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const currentBillingCycle = profile?.billing_cycle || billingData?.billing_cycle || 'monthly';
  const currentRateText = billingData?.current_rate
    ? `$${billingData.current_rate}/${currentBillingCycle === 'yearly' ? 'yr' : 'mo'}`
    : `$${(monthlyRate * allocatedSlots).toFixed(2)}/mo`;

  const trialDaysRemaining = (() => {
    if (profile?.trial_days_remaining !== undefined && profile?.trial_days_remaining !== null) {
      return Math.max(0, Number(profile.trial_days_remaining));
    }
    const trialEndsAt = profile?.trial_ends_at || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_ends_at') : null);
    if (trialEndsAt) {
      const endsDt = new Date(trialEndsAt);
      if (!isNaN(endsDt.getTime())) {
        const msRemaining = endsDt.getTime() - Date.now();
        return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      }
    }
    const createdAt = profile?.created_at || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_created_at') : null);
    if (createdAt) {
      const createdDt = new Date(createdAt);
      if (!isNaN(createdDt.getTime())) {
        const daysElapsed = Math.floor((Date.now() - createdDt.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, 14 - daysElapsed);
      }
    }
    const storedTrial = typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_days') : null;
    if (storedTrial !== null && storedTrial !== undefined && storedTrial !== '') {
      return Math.max(0, Number(storedTrial));
    }
    return 14;
  })();

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

      // 2. Request backend to create transaction with custom quantity and dynamic discount
      const userEmail = profile?.email || userStore.get('profile')?.email || '';
      const res = await api.createPaddleCheckout({
        plan: 'pro',
        sites_count: sitesCount,
        quantity: sitesCount,
        sites: sitesCount,
        billing_cycle: billingCycle,
        customer_email: userEmail,
        email: userEmail,
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

      // 1. Open Paddle Checkout directly over this screen (Instant, smooth, zero redirection loops)
      if (checkoutData.checkout_id && window.Paddle) {
        try {
          window.Paddle.Checkout.open({
            transactionId: checkoutData.checkout_id,
            customer: userEmail ? { email: userEmail } : undefined,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: `${window.location.origin}/payment/success?plan=pro&cycle=${billingCycle}&sites=${sitesCount}${checkoutData.checkout_id ? `&txn_id=${checkoutData.checkout_id}` : ''}`,
            },
          });
          return;
        } catch (overlayErr) {
          console.warn('Overlay error, falling back to URL:', overlayErr);
        }
      }

      // 2. Fallback to checkout URL if Paddle SDK overlay is unavailable
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
            fontSize: '13px',
          }}
        >
          {toastMessage.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 14-Day Free Trial Expired Mandatory Payment Banner */}
      {(searchParams.get('expired') === 'true' || (!profile?.is_admin && !profile?.is_paid && (profile?.payment_status === 'trial_expired' || Number(profile?.trial_days_remaining) <= 0) && profile?.plan === 'free')) && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
            border: '2px solid #FDA4AF',
            borderRadius: '16px',
            padding: '22px 26px',
            marginBottom: '28px',
            boxShadow: '0 6px 20px rgba(225, 29, 72, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#F43F5E',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
              }}
            >
              <Lock size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', background: '#E11D48', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Action Required
                </span>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#9F1239' }}>
                  14-Day Free Trial Expired — Fleet Protection Suspended
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#881337', lineHeight: '1.5' }}>
                Your 14-day free trial period has concluded. Protected dashboard access and edge security services are paused until a subscription is activated. Select your plan below to restore instant protection.
              </p>
            </div>
          </div>
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

      {/* Sleek Single-Row Active Security Workspace Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '14px 22px',
          marginBottom: '24px',
          border: '1px solid #D9E1DC',
          boxShadow: '0 2px 10px rgba(11, 37, 34, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Left Side: Inline Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
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
              letterSpacing: '0.06em',
              background: isPaidActive ? '#E8F3EC' : '#FFF4ED',
              color: isPaidActive ? '#059669' : '#E8792F',
              border: `1px solid ${isPaidActive ? '#CFE2D4' : '#FCD3B6'}`,
            }}
          >
            {isPaidActive ? 'PRO FLEET' : 'FREE PLAN'}
          </span>

          <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isPaidActive ? '#059669' : '#E8792F',
                boxShadow: isPaidActive ? '0 0 6px rgba(5, 150, 105, 0.4)' : 'none',
              }}
            />
            <span>{allocatedSlots} Website {allocatedSlots === 1 ? 'Slot' : 'Slots'}</span>
          </span>

          <span style={{ color: '#CBD5E1', fontSize: '13px' }}>•</span>

          {isPaidActive ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#60716B', flexWrap: 'wrap' }}>
              <span>Rate: <strong style={{ color: '#10201E' }}>{currentRateText}</strong></span>
              {formattedCycleEnd && <span>· Valid: <strong style={{ color: '#10201E' }}>{formattedCycleEnd}</strong></span>}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: isAutoRenewOn ? '#ECFDF5' : '#FFFBEB',
                  color: isAutoRenewOn ? '#047857' : '#B45309',
                  border: `1px solid ${isAutoRenewOn ? '#A7F3D0' : '#FCD34D'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isAutoRenewOn ? '#059669' : '#D97706',
                  }}
                />
                <span>{isAutoRenewOn ? 'Auto-Renew: ON' : 'Auto-Renew: OFF'}</span>
              </span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#60716B' }}>
              <span>
                Trial: <strong style={{ color: trialDaysRemaining <= 4 ? '#DC2626' : '#059669' }}>{trialDaysRemaining} Days</strong>
              </span>
              <span style={{ fontSize: '11.5px', color: '#87948D' }}>· Full Layer-7 AST WAF Active</span>
            </div>
          )}
        </div>

        {/* Right Side: Sleek Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isPaidActive ? (
            <>
              {isAutoRenewOn ? (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  style={{
                    padding: '7px 13px',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                >
                  <RotateCcw size={12} strokeWidth={2.2} />
                  <span>Cancel Auto-Renew</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivateAutoRenew}
                  disabled={reactivating}
                  style={{
                    padding: '7px 13px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: reactivating ? 'wait' : 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {reactivating ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Reactivating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} strokeWidth={2.4} />
                      <span>Turn Auto-Renew Back ON</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('fleet-calculator')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '7px 13px',
                  borderRadius: '8px',
                  border: '1px solid #D9E1DC',
                  background: '#FFFFFF',
                  color: '#10201E',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAF9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
              >
                Scale Fleet
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById('fleet-calculator')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#0B2522',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(11, 37, 34, 0.15)',
              }}
            >
              <span>Upgrade to Pro Fleet</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ===================== INTERACTIVE UPGRADE & SCALE CALCULATOR ===================== */}
      <div
        id="fleet-calculator"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
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
              Need to protect 1, 5, or 25 client websites? Add or remove site licenses dynamically at {pricingConfig.currency_symbol || '$'}{monthlyRate}/month per site.
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
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Monthly ({pricingConfig.currency_symbol || '$'}{monthlyRate} / site)
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
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Annual ({pricingConfig.currency_symbol || '$'}{yearlyRate} / site)</span>
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

              <span style={{ fontSize: '16px', fontWeight: 700, color: '#10201E', marginLeft: '6px' }}>
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
              <span style={{ fontSize: '52px', fontWeight: '700', color: '#10201E', letterSpacing: '-0.05em', lineHeight: 1 }}>
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
                fontSize: '14px',
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
                fontSize: '11px',
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
              fontSize: '12px',
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
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allInvoices = (paymentHistory && paymentHistory.length > 0)
                  ? paymentHistory
                  : (billingData?.transactions || billingData?.payments || []);

                if (allInvoices.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#60716B' }}>
                        <FileText size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                        No prior invoices recorded. Your account has {allocatedSlots} website {allocatedSlots === 1 ? 'slot' : 'slots'} available.
                      </td>
                    </tr>
                  );
                }

                return allInvoices.map((inv, idx) => {
                  const rawAmount = inv.amount !== undefined && inv.amount !== null ? inv.amount : totalPrice;
                  const numAmt = parseFloat(rawAmount);
                  const displayAmt = !isNaN(numAmt) ? `$${numAmt.toFixed(2)} USD` : `${rawAmount} USD`;

                  const rawDate = inv.billed_at || inv.created_at;
                  let displayDate = 'Recent';
                  if (rawDate) {
                    const parsed = new Date(rawDate);
                    displayDate = !isNaN(parsed.getTime())
                      ? parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : String(rawDate);
                  }

                  const txnId = inv.transaction_id || inv.invoice_id || inv.id || `TXN-${idx + 1}`;
                  const isPaidStatus = String(inv.status || 'paid').toLowerCase() === 'paid' || String(inv.status || '').toLowerCase() === 'completed';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #D9E1DC' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '600', color: '#0B2522' }}>
                        {txnId}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#60716B' }}>
                        {displayDate}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '750', color: '#10201E' }}>
                        {displayAmt}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#60716B' }}>
                        <CreditCard size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        <span>Paddle Gateway / Card</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: isPaidStatus ? '#E8F3EC' : '#FFF4ED',
                            color: isPaidStatus ? '#28745D' : '#E8792F',
                            border: `1px solid ${isPaidStatus ? '#CFE2D4' : '#FCD3B6'}`,
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          {isPaidStatus ? 'PAID & ACTIVE' : String(inv.status || 'PROCESSED').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {inv.receipt_url && inv.receipt_url !== '#' ? (
                          <a
                            href={inv.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#059669',
                              fontWeight: '700',
                              fontSize: '12px',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Receipt</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Official Receipt</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Auto-Renew Confirmation Modal */}
      {cancelModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 37, 34, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              border: '1px solid #D9E1DC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} strokeWidth={2.2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
                  Turn Off Automatic Renewal?
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
                  Review what happens when automatic renewal is cancelled.
                </p>
              </div>
            </div>

            <div style={{ background: '#F8FAF9', borderRadius: '12px', padding: '18px', marginBottom: '22px', border: '1px solid #E6ECE8', fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#10201E' }}>Full protection remains active</strong> until <strong>{formattedCycleEnd || 'the end of your current period'}</strong>. No sudden disconnection.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#10201E' }}>Zero recurring charges ($0)</strong> after period ends. Your card will never be charged automatically.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#10201E' }}>Safe pause &amp; zero data loss</strong> — When expired, protection safely pauses. Your websites, settings, and logs remain completely intact.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#10201E' }}>Zero retroactive fees</strong> — If you stay inactive for 1 or 2 months, you owe $0 for that time. When you decide to renew, your new cycle begins fresh on that day.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: '1px solid #D9E1DC',
                  background: '#ffffff',
                  color: '#10201E',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Keep Auto-Renew Active
              </button>
              <button
                type="button"
                onClick={handleCancelAutoRenew}
                disabled={cancelling}
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: cancelling ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
                }}
              >
                {cancelling ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Turning off...</span>
                  </>
                ) : (
                  <span>Yes, Turn Off Auto-Renew</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Payment Modal for Card/Bank Checkout */}
      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          plan="pro"
          billingCycle={isYearly ? 'yearly' : 'monthly'}
          siteCount={sitesCount}
          pricingConfig={pricingConfig}
          onSuccess={() => {
            setPaymentModalOpen(false);
            showToast(`Successfully upgraded to ${sitesCount} website licenses!`, false);
            fetchBilling();
          }}
        />
      )}
    </div>
  );
}
