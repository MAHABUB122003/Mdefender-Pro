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
  const [billingData, setBillingData] = useState(() => {
    try {
      const cached = localStorage.getItem('mdefender_cached_billing');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [paymentHistory, setPaymentHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mdefender_cached_invoices');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('mdefender_cached_invoices');
      return !(cached && JSON.parse(cached).length > 0);
    } catch {
      return true;
    }
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [onboardingNotice, setOnboardingNotice] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // Zero-flicker: initialize directly from instant persistent storage
  const [pricingConfig, setPricingConfig] = useState(() => getStoredPricingConfig());

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 5000);
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
    // Only show loading if we don't already have cached transactions to display
    if (!paymentHistory || paymentHistory.length === 0) {
      setLoading(true);
    }

    // Stream each fetch concurrently and update UI state immediately upon arrival (0ms blocking)
    const pProf = api.getProfile().then((res) => {
      const d = res?.data || res;
      if (d) {
        setProfile(d);
        userStore.set('profile', d);
      }
    }).catch(() => {});

    const pHist = api.getPaymentHistory().then((res) => {
      const hist = res?.data || res?.payments || [];
      if (Array.isArray(hist) && hist.length > 0) {
        setPaymentHistory(hist);
        try {
          localStorage.setItem('mdefender_cached_invoices', JSON.stringify(hist));
        } catch {}
      }
    }).catch(() => {});

    const pBill = api.getBillingSubscription().then((res) => {
      const b = res?.data || res;
      if (b) {
        setBillingData(b);
        try {
          localStorage.setItem('mdefender_cached_billing', JSON.stringify(b));
        } catch {}
      }
    }).catch(() => {});

    const pConfig = syncPricingWithBackend(api).then((cfg) => {
      if (cfg?.base_monthly_rate) {
        setPricingConfig(cfg);
      }
    }).catch(() => {});

    try {
      await Promise.allSettled([pProf, pHist, pBill, pConfig]);
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
  const paymentStatus = (profile?.payment_status || billingData?.payment_status || '').toLowerCase();
  const isPaidActive = (currentPlanId !== 'free' && (paymentStatus === 'active' || (billingData?.is_paid && paymentStatus !== 'expired') || (profile?.is_paid && paymentStatus !== 'expired')));
  const isPaidExpired = Boolean(
    !isPaidActive && (
      paymentStatus === 'expired' ||
      paymentStatus === 'past_due' ||
      (currentPlanId !== 'free' && (paymentStatus === 'expired' || paymentStatus === 'canceled' || paymentStatus === 'cancelled' || !profile?.is_paid))
    )
  );
  const allocatedSlots = profile?.website_limit || profile?.website_slots || profile?.purchased_slots || (currentPlanId === 'free' ? 1 : 10);
  const cycleEndDate = profile?.plan_expires || billingData?.plan_expires || billingData?.subscription?.next_billed_at;
  const formattedCycleEnd = cycleEndDate && !isNaN(new Date(cycleEndDate).getTime())
    ? new Date(cycleEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const currentBillingCycle = profile?.billing_cycle || billingData?.billing_cycle || 'monthly';
  const currentRateText = billingData?.current_rate
    ? `$${billingData.current_rate}/${currentBillingCycle === 'yearly' ? 'yr' : 'mo'}`
    : `$${(monthlyRate * allocatedSlots).toFixed(2)}/mo`;

  const configuredTrialDays = Number(pricingConfig?.trial_days) || 14;

  const trialDaysRemaining = (() => {
    if (profile?.trial_days_remaining !== undefined && profile?.trial_days_remaining !== null) {
      return Math.max(0, Number(profile.trial_days_remaining));
    }
    const trialEndsAt = profile?.trial_ends_at || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_ends_at') : null);
    let endsRemaining = null;
    if (trialEndsAt) {
      const endsDt = new Date(trialEndsAt);
      if (!isNaN(endsDt.getTime())) {
        endsRemaining = Math.max(0, Math.ceil((endsDt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      }
    }
    const createdAt = profile?.created_at || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_created_at') : null);
    if (createdAt) {
      const createdDt = new Date(createdAt);
      if (!isNaN(createdDt.getTime())) {
        const daysElapsed = Math.floor((Date.now() - createdDt.getTime()) / (1000 * 60 * 60 * 24));
        const calculated = Math.max(0, configuredTrialDays - daysElapsed);
        return endsRemaining !== null ? Math.max(calculated, endsRemaining) : calculated;
      }
    }
    if (endsRemaining !== null) {
      return endsRemaining;
    }
    const storedTrial = typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_days') : null;
    if (storedTrial !== null && storedTrial !== undefined && storedTrial !== '') {
      return Math.max(0, Number(storedTrial));
    }
    return configuredTrialDays;
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
          window.Paddle.Initialize({
            token: cfg.client_token,
            checkout: {
              settings: {
                locale: 'en',
                displayMode: 'overlay',
                theme: 'light'
              }
            }
          });
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
              locale: 'en',
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
            locale: 'en',
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

      {/* Pro Paid Subscription Expired Banner */}
      {isPaidExpired && (
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
                background: '#DC2626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
            >
              <AlertTriangle size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', background: '#DC2626', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Action Required
                </span>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#991B1B' }}>
                  MDefender Pro Subscription Expired — Fleet Protection Paused
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#7F1D1D', lineHeight: '1.5' }}>
                Your prepaid subscription has concluded. Autonomous edge WAF filtering across your client fleet is currently paused with zero data loss. Select your desired website licenses below and click 'Activate &amp; Pay' to immediately resume Layer-7 protection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 14-Day Free Trial Expired Mandatory Payment Banner */}
      {!isPaidExpired && (searchParams.get('expired') === 'true' || (!profile?.is_admin && !profile?.is_paid && (profile?.payment_status === 'trial_expired' || Number(profile?.trial_days_remaining) <= 0) && profile?.plan === 'free')) && (
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
                  {configuredTrialDays}-Day Free Trial Expired — Fleet Protection Suspended
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#881337', lineHeight: '1.5' }}>
                Your {configuredTrialDays}-day free trial period has concluded. Protected dashboard access and edge security services are paused until a subscription is activated. Select your plan below to restore instant protection.
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
              background: isPaidActive ? '#E8F3EC' : isPaidExpired ? '#FEE2E2' : '#FFF4ED',
              color: isPaidActive ? '#059669' : isPaidExpired ? '#DC2626' : '#E8792F',
              border: `1px solid ${isPaidActive ? '#CFE2D4' : isPaidExpired ? '#FECACA' : '#FCD3B6'}`,
            }}
          >
            {isPaidActive ? 'PRO FLEET' : isPaidExpired ? 'PRO EXPIRED' : 'FREE PLAN'}
          </span>

          <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isPaidActive ? '#059669' : isPaidExpired ? '#DC2626' : '#E8792F',
                boxShadow: isPaidActive ? '0 0 6px rgba(5, 150, 105, 0.4)' : isPaidExpired ? '0 0 6px rgba(220, 38, 38, 0.4)' : 'none',
              }}
            />
            <span>{allocatedSlots} Website {allocatedSlots === 1 ? 'Slot' : 'Slots'}</span>
          </span>

          <span style={{ color: '#CBD5E1', fontSize: '13px' }}>•</span>

          {isPaidActive ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#60716B', flexWrap: 'wrap' }}>
              <span>Plan: <strong style={{ color: '#10201E' }}>{currentRateText}</strong></span>
              {formattedCycleEnd && <span>· License Valid Until: <strong style={{ color: '#047857' }}>{formattedCycleEnd}</strong></span>}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle2 size={11} color="#059669" />
                <span>Prepaid License Active</span>
              </span>
            </div>
          ) : isPaidExpired ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#DC2626', flexWrap: 'wrap' }}>
              <span>Status: <strong style={{ color: '#991B1B' }}>FLEET PROTECTION PAUSED (EXPIRED)</strong></span>
              {formattedCycleEnd && <span>· Ended: <strong style={{ color: '#991B1B' }}>{formattedCycleEnd}</strong></span>}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                }}
              >
                Action Required: Reactivate Below
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
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
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
                  boxShadow: '0 2px 6px rgba(11, 37, 34, 0.15)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#164E48')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0B2522')}
              >
                <Zap size={13} strokeWidth={2.4} style={{ color: '#FCD34D' }} />
                <span>Extend / Renew License</span>
              </button>
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
                const rawInvoices = (paymentHistory && paymentHistory.length > 0)
                  ? paymentHistory
                  : (billingData?.transactions || billingData?.payments || []);

                // Deduplicate transactions by transaction ID
                const seenTxnIds = new Set();
                const allInvoices = rawInvoices.filter(inv => {
                  const tid = inv.transaction_id || inv.invoice_id || inv.id;
                  if (!tid) return true;
                  if (seenTxnIds.has(tid)) return false;
                  seenTxnIds.add(tid);
                  return true;
                });

                if (allInvoices.length === 0) {
                  if (loading) {
                    return (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#60716B' }}>
                          <RefreshCw size={18} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />
                          <span>Loading official receipts...</span>
                        </td>
                      </tr>
                    );
                  }
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
