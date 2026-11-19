import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import userStore from '../utils/userStore';
import { getStoredPricingConfig } from '../utils/pricingStore';
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
  ChevronLeft,
  Info,
} from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'BD', name: 'Bangladesh' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'OTHER', name: 'Other Countries' },
];

export default function PaymentModal({
  isOpen,
  onClose,
  plan = 'pro',
  billingCycle = 'monthly',
  siteCount = 1,
  pricingConfig,
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [onboardingNotice, setOnboardingNotice] = useState(null);

  // Billing form state
  const [fullName, setFullName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('BD');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saveInfo, setSaveInfo] = useState(true);

  // Mock Card fields (visual alignment with Stripe/Paddle enterprise checkout)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Promo code state
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const activePricing = pricingConfig || getStoredPricingConfig();
  const monthlyBase = Number(activePricing?.base_monthly_rate) || 4;
  const yearlyBase = Number(activePricing?.base_yearly_rate) || 40;
  const sym = activePricing?.currency_symbol || '$';
  const count = Math.max(1, Number(siteCount) || 1);

  // Dynamic tiers discount
  const tiers = activePricing?.bulk_tiers || [];
  let discountPercent = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (count >= tiers[i].min_sites) {
      discountPercent = tiers[i].discount_percent;
      break;
    }
  }

  const isYearly = billingCycle.toLowerCase() === 'yearly';
  const unitRate = isYearly ? yearlyBase : monthlyBase;
  const rawTotal = count * unitRate;
  const discountVal = (rawTotal * discountPercent) / 100;
  const finalPrice = Math.max(0, rawTotal - discountVal);
  const formattedPrice = finalPrice.toFixed(2);

  const cachedUser = userStore.get('profile') || null;
  const loggedInEmail = cachedUser?.email || '';

  useEffect(() => {
    if (cachedUser?.name) {
      setFullName(cachedUser.name);
    }
  }, [cachedUser]);

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
        sites_count: count,
        customer_email: emailToSend,
        email: emailToSend,
        billing_country: selectedCountry,
        full_name: fullName,
        return_url: window.location.href,
        success_url: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle + '&sites=' + count,
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
              successUrl: `${window.location.origin}/payment/success?plan=${plan}&cycle=${billingCycle}&sites=${count}${checkoutData.checkout_id ? `&txn_id=${checkoutData.checkout_id}` : ''}`,
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
          items: [{ priceId: checkoutData.price_id, quantity: count }],
          customer: emailToSend ? { email: emailToSend } : undefined,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            successUrl: `${window.location.origin}/payment/success?plan=${plan}&cycle=${billingCycle}&sites=${count}`,
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
        background: 'rgba(11, 37, 34, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000005,
        padding: '16px',
        animation: 'mdfModalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mdf-checkout-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '94vh',
          display: 'flex',
          boxShadow: '0 30px 90px rgba(11, 37, 34, 0.35)',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
          border: '1px solid #D9E1DC',
        }}
      >
        {/* =========================================================================
            LEFT COLUMN: Order Summary & Itemized Breakdown (WP Umbrella / Stripe style)
            ========================================================================= */}
        <div
          className="mdf-checkout-left"
          style={{
            flex: '0 0 44%',
            background: '#F8FAF9',
            borderRight: '1px solid #E5EBE7',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
          }}
        >
          <div>
            {/* Brand Logo & Back control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#0B2522',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(11, 37, 34, 0.25)',
                  flexShrink: 0,
                }}
              >
                <Shield size={22} strokeWidth={2.4} style={{ color: '#E8792F' }} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  MDefender<span style={{ color: '#E8792F' }}> Pro</span>
                </div>
                <div style={{ fontSize: '10px', color: '#60716B', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Enterprise WAF & Cloud Fleet
                </div>
              </div>
            </div>

            {/* Subscription Title & Big Price */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '13.5px', color: '#60716B', fontWeight: 600, marginBottom: '4px' }}>
                Subscribe to MDefender Pro Fleet
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: 850, color: '#10201E', letterSpacing: '-0.04em' }}>
                  {sym}{formattedPrice}
                </span>
                <span style={{ fontSize: '13.5px', color: '#60716B', fontWeight: 600 }}>
                  per {isYearly ? 'year' : 'month'}
                </span>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {/* Primary Line Item */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10201E' }}>
                    MDefender Pro Fleet Security
                  </div>
                  <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>
                    {count} {count > 1 ? 'Websites' : 'Website'} &middot; Billed {isYearly ? 'annually' : 'monthly'}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10201E' }}>
                  {sym}{rawTotal.toFixed(2)}
                </div>
              </div>

              {/* Volume Fleet Discount (if applicable) */}
              {discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#2A8B68' }}>
                      Volume Fleet Discount ({discountPercent}%)
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A8B68' }}>
                    -{sym}{discountVal.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Standard Enterprise Inclusions (WP Umbrella Style) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12.5px', color: '#31443E', fontWeight: 500 }}>
                    AST Machine Learning Edge WAF
                  </div>
                  <div style={{ fontSize: '11px', color: '#82938D' }}>
                    Sub-millisecond latency inspection
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A8B68', background: '#EAF5F0', padding: '2px 8px', borderRadius: '4px' }}>
                  Included
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12.5px', color: '#31443E', fontWeight: 500 }}>
                    5.24M+ Checksum Malware Scanner
                  </div>
                  <div style={{ fontSize: '11px', color: '#82938D' }}>
                    Continuous automated core integrity
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A8B68', background: '#EAF5F0', padding: '2px 8px', borderRadius: '4px' }}>
                  Included
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12.5px', color: '#31443E', fontWeight: 500 }}>
                    L7 Anycast DDoS Mitigation
                  </div>
                  <div style={{ fontSize: '11px', color: '#82938D' }}>
                    Unlimited scrubbing capacity
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A8B68', background: '#EAF5F0', padding: '2px 8px', borderRadius: '4px' }}>
                  Included
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: '1px solid #E5EBE7', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#60716B' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#10201E' }}>{sym}{formattedPrice}</span>
              </div>

              {/* Promotion Code Section */}
              {!showPromoInput ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPromoInput(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#0B2522',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline',
                    }}
                  >
                    <span>Add promotion code</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    style={{
                      flex: 1,
                      height: '32px',
                      padding: '0 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD8CF',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (promoCode.trim()) setPromoApplied(true);
                    }}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}

              {promoApplied && (
                <div style={{ fontSize: '11.5px', color: '#2A8B68', fontWeight: 600 }}>
                  ✓ Promotion code {promoCode} verified
                </div>
              )}

              {/* Tax / VAT Calculation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#60716B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Tax (VAT / GST)
                  <span
                    title="Estimated VAT/GST calculated based on billing location. Collected by Paddle as Merchant of Record."
                    style={{ cursor: 'help', fontSize: '11.5px', color: '#82938D' }}
                  >
                    <Info size={12} />
                  </span>
                </span>
                <span style={{ fontWeight: 600, color: '#10201E' }}>{sym}0.00</span>
              </div>

              {/* Total Due Today */}
              <div
                style={{
                  borderTop: '1px solid #10201E',
                  paddingTop: '14px',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                  Total due today
                </span>
                <span style={{ fontSize: '22px', fontWeight: 850, color: '#10201E', letterSpacing: '-0.03em' }}>
                  {sym}{formattedPrice}
                </span>
              </div>
            </div>
          </div>

          {/* Money-Back Assurance */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid #E5EBE7',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11.5px',
              color: '#60716B',
            }}
          >
            <Shield size={14} style={{ color: '#2A8B68', flexShrink: 0 }} />
            <span>30-day money-back guarantee &middot; Cancel anytime with 1-click</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Payment Method, Contact & Billing Details (Enterprise Split)
            ========================================================================= */}
        <div
          className="mdf-checkout-right"
          style={{
            flex: '1 1 56%',
            background: '#FFFFFF',
            padding: '36px 36px',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#F0F4F2',
              border: 'none',
              borderRadius: '50%',
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
              e.currentTarget.style.background = '#E2EBE6';
              e.currentTarget.style.color = '#10201E';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F0F4F2';
              e.currentTarget.style.color = '#60716B';
            }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>

          {/* Express Payment Badges (Apple Pay / Google Pay / 1-Click) */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                style={{
                  height: '42px',
                  background: '#000000',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                }}
              >
                <span> Pay</span>
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                style={{
                  height: '42px',
                  background: '#00D66F',
                  color: '#0B2522',
                  borderRadius: '8px',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: loading ? 'wait' : 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                <span>› link</span>
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0 14px',
                color: '#82938D',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#E5EBE7' }} />
              <span style={{ padding: '0 12px' }}>OR PAY WITH CARD</span>
              <div style={{ flex: 1, height: '1px', background: '#E5EBE7' }} />
            </div>
          </div>

          {/* Contact Section */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#10201E',
                marginBottom: '6px',
              }}
            >
              Contact Email <span style={{ color: '#E8792F' }}>*</span>
            </label>
            <input
              type="email"
              required
              readOnly={Boolean(loggedInEmail)}
              value={loggedInEmail || guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@domain.com"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1.5px solid #CBD8CF',
                background: loggedInEmail ? '#F8FAF9' : '#FFFFFF',
                fontSize: '13.5px',
                color: '#10201E',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Payment Method Section */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#10201E',
                marginBottom: '6px',
              }}
            >
              Payment method
            </label>
            <div
              style={{
                border: '1.5px solid #CBD8CF',
                borderRadius: '8px',
                background: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {/* Tab Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  background: '#F8FAF9',
                  borderBottom: '1px solid #CBD8CF',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#10201E',
                }}
              >
                <CreditCard size={15} style={{ color: '#0B2522' }} />
                <span>Card</span>
              </div>

              {/* Card Inputs */}
              <div style={{ padding: '12px' }}>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Card number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD8CF',
                      fontSize: '13px',
                      color: '#10201E',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                      fontSize: '10px',
                      color: '#82938D',
                      fontWeight: 700,
                    }}
                  >
                    <span>VISA</span>
                    <span>MC</span>
                    <span>AMEX</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD8CF',
                      fontSize: '13px',
                      color: '#10201E',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Security code (CVC)"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    maxLength={4}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD8CF',
                      fontSize: '13px',
                      color: '#10201E',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#60716B', marginTop: '6px', lineHeight: 1.4 }}>
              By subscribing, you authorize MDefender Pro to charge your selected payment method according to the terms until you cancel.
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#10201E',
                marginTop: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={saveInfo}
                onChange={(e) => setSaveInfo(e.target.checked)}
                style={{ accentColor: '#0B2522' }}
              />
              <span>Save my information for faster 1-click checkout</span>
            </label>
          </div>

          {/* Billing Details Section */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#10201E',
                marginBottom: '6px',
              }}
            >
              Billing details
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD8CF',
                  fontSize: '13px',
                  color: '#10201E',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Country Dropdown */}
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD8CF',
                  fontSize: '13px',
                  color: '#10201E',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Address line 1"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD8CF',
                  fontSize: '13px',
                  color: '#10201E',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD8CF',
                    fontSize: '13px',
                    color: '#10201E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  placeholder="Postal code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD8CF',
                    fontSize: '13px',
                    color: '#10201E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Onboarding Notice Banner */}
          {onboardingNotice && (
            <div
              style={{
                background: '#FFF8F4',
                border: '1px solid #FCD3B6',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ color: '#E8792F', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#A34F22' }}>
                    {onboardingNotice.title}
                  </h4>
                  <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: '#873B11', lineHeight: 1.4 }}>
                    {onboardingNotice.message}
                  </p>
                  <a
                    href={onboardingNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: '#0B2522',
                      color: '#ffffff',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open Paddle Dashboard</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
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
                fontSize: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Primary CTA Button (WP Umbrella / Stripe Style: Clear "Subscribe") */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '8px',
              background: '#0B2522',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(11, 37, 34, 0.22)',
              marginBottom: '14px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#133E39';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#0B2522';
            }}
          >
            {loading ? (
              <span>Connecting to Secured Gateway...</span>
            ) : (
              <>
                <Lock size={15} strokeWidth={2.4} />
                <span>Subscribe</span>
              </>
            )}
          </button>

          {/* Security & MoR Assurance */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#82938D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Shield size={12} style={{ color: '#2A8B68', flexShrink: 0 }} />
            <span>Encrypted Edge Transaction &middot; Powered by Paddle Merchant of Record</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mdfModalFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 768px) {
          .mdf-checkout-card {
            flex-direction: column !important;
            max-height: 96vh !important;
          }
          .mdf-checkout-left {
            flex: none !important;
            padding: 24px 20px !important;
            border-right: none !important;
            border-bottom: 1px solid #E5EBE7 !important;
          }
          .mdf-checkout-right {
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
