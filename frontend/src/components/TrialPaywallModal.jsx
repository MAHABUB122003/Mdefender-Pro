import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  Lock,
  Zap,
  ArrowRight,
  LogOut,
  CreditCard,
  Plus,
  Minus,
  Sparkles,
  Layers,
  Activity,
  Globe,
  Clock,
  ExternalLink,
  RotateCcw,
  Database,
  Cpu,
  KeyRound,
  FileText,
  AlertTriangle,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import userStore from '../utils/userStore';
import api from '../api/api';

const brandTokens = {
  deepForest: '#0B2522',
  deepForestHover: '#153B34',
  emeraldDark: '#081D1A',
  emeraldPrimary: '#28745D',
  emeraldHover: '#205E4B',
  emeraldLight: '#E8F3EC',
  emeraldBorder: '#CFE2D4',
  accentOrange: '#E8792F',
  accentOrangeHover: '#D26720',
  bodyBg: '#F7F6F1',
  cardBg: '#FFFFFF',
  cardBorder: '#D9E1DC',
  cardBorderHover: '#10201E',
  textHeading: '#10201E',
  textBody: '#4A5D5A',
  textMuted: '#7A8C89',
  pillBg: '#E8EEE8',
  shadowSm: '0 1px 3px rgba(11, 37, 34, 0.05)',
  shadowMd: '0 4px 14px rgba(11, 37, 34, 0.08)',
  shadowLg: '0 10px 25px rgba(11, 37, 34, 0.12)'
};

export default function TrialPaywallModal() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [siteCount, setSiteCount] = useState(1);
  const [dynamicPricing, setDynamicPricing] = useState({
    base_monthly_rate: 4.0,
    base_yearly_rate: 40.0,
    currency: 'USD',
    currency_symbol: '$',
    trial_days: 14,
    bulk_tiers: [
      { min_sites: 1, max_sites: 9, discount_percent: 0, label: 'Starter Fleet' },
      { min_sites: 10, max_sites: 24, discount_percent: 10, label: 'Growth Agency' },
      { min_sites: 25, max_sites: 49, discount_percent: 15, label: 'Scale Partner' },
      { min_sites: 50, max_sites: 500, discount_percent: 25, label: 'Enterprise MSP' }
    ]
  });

  // Check URL query param for instant live testing (e.g. ?test_trial_days=4 or ?test_trial_days=0)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const testTrialParam = urlParams ? urlParams.get('test_trial_days') : null;
  const testProParam = urlParams ? urlParams.get('test_pro') : null;

  const cachedProfile = userStore.get('profile') || userStore.get('dashboard')?.user || null;
  const [profile, setProfile] = useState(() => cachedProfile);

  const userPlan = (testProParam === 'true'
    ? 'pro'
    : (profile?.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_plan') : null) || 'free')
  ).toLowerCase();
  const isPro = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);

  const rawTrial = testTrialParam !== null
    ? Number(testTrialParam)
    : (profile?.trial_days_remaining !== undefined
      ? profile.trial_days_remaining
      : (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_days') : null));
  const trialDays = rawTrial !== null ? Number(rawTrial) : 14;

  useEffect(() => {
    // If URL testing param is present, allow testing soft modal repeatedly without getting blocked by dismissed flag
    if (testTrialParam !== null) {
      sessionStorage.removeItem('mdf_soft_trial_dismissed');
      setDismissed(false);
      return;
    }
    const isDismissedThisSession = sessionStorage.getItem('mdf_soft_trial_dismissed') === 'true';
    if (isDismissedThisSession) {
      setDismissed(true);
    }
  }, [testTrialParam]);

  useEffect(() => {
    // 1. Fetch live public dynamic pricing directly from database (ensuring zero fake data)
    api.getPublicPricingConfig().then(res => {
      const cfg = res?.data || res;
      if (cfg && cfg.base_monthly_rate) {
        setDynamicPricing(prev => ({ ...prev, ...cfg }));
      }
    }).catch(() => {});

    // 2. Fetch authenticated profile to resolve current user's website count
    api.getProfile().then(res => {
      const data = res?.data || res;
      if (data) {
        setProfile(data);
        if (data.websites_count && data.websites_count > 0) {
          setSiteCount(data.websites_count);
        }
      }
    }).catch(() => {});
  }, []);

  // 1. If PRO, never show paywall
  if (isPro) return null;

  // 2. Days 1 to 9: Silent (modal hidden, full dashboard access)
  if (trialDays > 4) return null;

  const isHardLockout = trialDays <= 0;
  const isSoftPrompt = trialDays > 0 && trialDays <= 4;

  // If soft prompt was dismissed for this browser session, don't show it again
  if (isSoftPrompt && dismissed) return null;

  const handleDismissSoft = () => {
    sessionStorage.setItem('mdf_soft_trial_dismissed', 'true');
    setDismissed(true);
  };

  const handleSignOut = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    navigate('/login');
  };

  // Dynamic calculations based on live database values
  const monthlyRate = Number(dynamicPricing.base_monthly_rate) || 4.0;
  const yearlyRate = Number(dynamicPricing.base_yearly_rate) || 40.0;

  const getDiscount = (count) => {
    const tiers = dynamicPricing.bulk_tiers || [];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (count >= tiers[i].min_sites) {
        return tiers[i];
      }
    }
    return { discount_percent: 0, label: 'Standard' };
  };

  const activeTier = getDiscount(siteCount);
  const rawBase = billingCycle === 'yearly' ? siteCount * yearlyRate : siteCount * monthlyRate;
  const discountAmount = (rawBase * activeTier.discount_percent) / 100;
  const totalAmount = Math.max(0, rawBase - discountAmount);
  const yearlyEquivalent = billingCycle === 'yearly' ? (totalAmount / 12).toFixed(2) : totalAmount;

  const handleStartSubscription = () => {
    navigate(`/user/pricing?sites=${siteCount}&cycle=${billingCycle}`);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: brandTokens.bodyBg,
      overflowY: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: brandTokens.textHeading
    }}>
      {/* =====================================================================
          TOP NAVIGATION HEADER (Authentic MDefender Brand Identity)
          ===================================================================== */}
      <header style={{
        background: brandTokens.cardBg,
        borderBottom: `1px solid ${brandTokens.cardBorder}`,
        padding: '14px 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: brandTokens.shadowSm
      }}>
        <div style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Authentic Brand Logo & Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <img
                src="/assets/mdefender_logo.png"
                alt="MDefender Pro"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em', color: brandTokens.textHeading }}>
                MDefender<span style={{ color: brandTokens.accentOrange }}> Pro</span>
              </div>
              <div style={{ fontSize: '11px', color: brandTokens.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Autonomous AI Enterprise WAF &amp; Cloud Fleet
              </div>
            </div>
          </div>

          {/* Right Header Status & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isHardLockout ? '#FEF2F2' : brandTokens.emeraldLight,
              color: isHardLockout ? '#DC2626' : brandTokens.emeraldPrimary,
              border: `1px solid ${isHardLockout ? '#FECACA' : brandTokens.emeraldBorder}`,
              fontSize: '11.5px',
              fontWeight: '700'
            }}>
              {isHardLockout ? (
                <>
                  <Lock size={12} strokeWidth={2.5} />
                  <span>14-Day Trial Concluded</span>
                </>
              ) : (
                <>
                  <Clock size={12} strokeWidth={2.5} />
                  <span>{trialDays} Days Left in Free Trial</span>
                </>
              )}
            </span>

            <div style={{ fontSize: '12.5px', color: brandTokens.textBody }} className="hidden-mobile">
              Logged in as <strong style={{ color: brandTokens.textHeading }}>{profile?.email || 'Operator'}</strong>
            </div>

            {/* If soft prompt, allow continuing to dashboard; if hard lockout, allow sign out */}
            {isSoftPrompt ? (
              <button
                type="button"
                onClick={handleDismissSoft}
                style={{
                  background: brandTokens.cardBg,
                  border: `1px solid ${brandTokens.cardBorder}`,
                  borderRadius: '7px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: brandTokens.textBody,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: brandTokens.shadowSm,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = brandTokens.textHeading;
                  e.currentTarget.style.color = brandTokens.textHeading;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = brandTokens.cardBorder;
                  e.currentTarget.style.color = brandTokens.textBody;
                }}
              >
                <span>Continue to Dashboard</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  background: brandTokens.cardBg,
                  border: `1px solid ${brandTokens.cardBorder}`,
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: brandTokens.textBody,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: brandTokens.shadowSm
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN BODY WRAPPER (Enterprise Full Page Architecture)
          ===================================================================== */}
      <main style={{ maxWidth: '1080px', margin: '36px auto 60px auto', padding: '0 20px' }}>
        
        {/* Page Top Heading */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            background: isHardLockout ? '#FEF2F2' : brandTokens.emeraldLight,
            border: `1px solid ${isHardLockout ? '#FECACA' : brandTokens.emeraldBorder}`,
            color: isHardLockout ? '#DC2626' : brandTokens.emeraldPrimary,
            fontSize: '11.5px',
            fontWeight: '800',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '14px'
          }}>
            {isHardLockout ? (
              <>
                <Lock size={12} strokeWidth={2.4} />
                <span>Edge Protection Paused</span>
              </>
            ) : (
              <>
                <Sparkles size={12} strokeWidth={2.4} />
                <span>Zero-Interruption Guarantee</span>
              </>
            )}
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            letterSpacing: '-0.025em',
            color: brandTokens.textHeading,
            margin: '0 0 10px 0'
          }}>
            {isHardLockout ? 'Your 14-Day Free Trial Has Concluded' : 'Keep Your Fleet Protected with Enterprise SecOps'}
          </h1>
          <p style={{
            fontSize: '15px',
            color: brandTokens.textBody,
            maxWidth: '720px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            {isHardLockout
              ? 'Select your subscription to instantly resume sub-millisecond edge WAF filtering, automated 5.24M+ malware hunting, and fleet telemetry. All your policies and sites remain perfectly saved.'
              : 'Add your payment method today to guarantee zero downtime when your trial completes. You will not be billed today ($0 hold) — your subscription begins automatically only after Day 14.'}
          </p>
        </div>

        {/* =====================================================================
            CARD 1: YOUR SUBSCRIPTION (Dynamic Admin-Connected Pricing)
            ===================================================================== */}
        <div style={{
          background: brandTokens.cardBg,
          border: `1.5px solid ${brandTokens.cardBorder}`,
          borderRadius: '16px',
          boxShadow: brandTokens.shadowMd,
          overflow: 'hidden',
          marginBottom: '36px'
        }}>
          {/* Card Top Title Bar */}
          <div style={{
            padding: '16px 24px',
            background: '#FAFBF9',
            borderBottom: `1px solid ${brandTokens.cardBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '800',
              color: brandTokens.textHeading,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Your subscription</span>
            </h2>
            <div style={{ fontSize: '12px', color: brandTokens.textMuted }}>
              Configured rate: <strong>${monthlyRate.toFixed(2)} / site / month</strong> (${yearlyRate.toFixed(2)} / site / year)
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Row 1: Site Count Selection */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '18px',
              borderBottom: '1px solid #F1F5F2',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: brandTokens.textHeading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{siteCount} {siteCount === 1 ? 'Protected Website' : 'Protected Websites'}</span>
                  {activeTier.discount_percent > 0 && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      background: '#FEF3C7',
                      color: '#B45309',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {activeTier.discount_percent}% Volume Discount ({activeTier.label})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: brandTokens.textMuted, marginTop: '2px' }}>
                  {billingCycle === 'yearly'
                    ? `$${yearlyRate.toFixed(2)} per site annually (Save 17% / 2 Months Free)`
                    : `$${monthlyRate.toFixed(2)} per site, flexible monthly billing`}
                </div>
              </div>

              {/* Stepper Control */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#F8FAF9',
                border: `1px solid ${brandTokens.cardBorder}`,
                borderRadius: '8px',
                padding: '3px'
              }}>
                <button
                  type="button"
                  onClick={() => setSiteCount(prev => Math.max(1, prev - 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: siteCount <= 1 ? 'not-allowed' : 'pointer',
                    color: brandTokens.textHeading,
                    opacity: siteCount <= 1 ? 0.4 : 1
                  }}
                  disabled={siteCount <= 1}
                >
                  <Minus size={14} />
                </button>
                <span style={{
                  minWidth: '44px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '800',
                  color: brandTokens.textHeading
                }}>
                  {siteCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSiteCount(prev => Math.min(500, prev + 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: brandTokens.textHeading
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Row 2: Billing Cycle Switcher */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 0',
              borderBottom: '1px solid #F1F5F2',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: brandTokens.textHeading }}>
                  Billing Frequency
                </div>
                <div style={{ fontSize: '12px', color: brandTokens.textMuted }}>
                  Monthly flexibility or save 17% with 2 months free on annual plans
                </div>
              </div>

              <div style={{
                display: 'inline-flex',
                background: '#F1F5F2',
                padding: '3px',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                    color: billingCycle === 'monthly' ? brandTokens.textHeading : brandTokens.textBody,
                    boxShadow: billingCycle === 'monthly' ? brandTokens.shadowSm : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Monthly (${monthlyRate}/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: billingCycle === 'yearly' ? '#FFFFFF' : 'transparent',
                    color: billingCycle === 'yearly' ? brandTokens.textHeading : brandTokens.textBody,
                    boxShadow: billingCycle === 'yearly' ? brandTokens.shadowSm : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Yearly (${yearlyRate}/yr)</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    background: brandTokens.emeraldLight,
                    color: brandTokens.emeraldPrimary,
                    padding: '1px 6px',
                    borderRadius: '999px'
                  }}>
                    2 MO FREE
                  </span>
                </button>
              </div>
            </div>

            {/* Row 3: Trial / Special Guarantee Line */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: '1.5px dashed #D9E1DC',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ fontWeight: '700', color: brandTokens.emeraldPrimary }}>
                  {isSoftPrompt ? '14-Day Free Trial Auto-Renew Guarantee' : 'Autonomous AI Edge Firewall Fleet Protection'}
                </span>
                <div style={{ fontSize: '11.5px', color: brandTokens.textMuted }}>
                  Includes AST Machine Learning, 5.24M+ Checksums &amp; Anycast L7 DDoS Scrubber
                </div>
              </div>
              <div style={{ fontWeight: '800', color: brandTokens.emeraldPrimary }}>
                {isSoftPrompt ? '-$0.00 Today' : 'Included'}
              </div>
            </div>

            {/* Row 4: Total & Calculation Breakdown */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              padding: '20px 0 24px 0',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: brandTokens.textHeading }}>
                  Total
                </div>
                <div style={{ fontSize: '12px', color: brandTokens.textMuted }}>
                  Billed in USD ($) • Cancel anytime with 1 click • Zero hidden fees
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: brandTokens.textHeading, letterSpacing: '-0.02em' }}>
                  {isSoftPrompt ? (
                    <>
                      $0.00 <span style={{ fontSize: '14px', fontWeight: '600', color: brandTokens.textMuted }}>today</span>
                    </>
                  ) : (
                    <>
                      ${totalAmount.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: '600', color: brandTokens.textMuted }}>
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: brandTokens.textMuted, marginTop: '2px' }}>
                  {isSoftPrompt ? (
                    `then $${totalAmount.toFixed(2)} / ${billingCycle === 'yearly' ? 'year' : 'month'} after Day 14`
                  ) : (
                    billingCycle === 'yearly'
                      ? `effective $${yearlyEquivalent} / month across ${siteCount} sites`
                      : 'billed monthly per connected site'
                  )}
                </div>
              </div>
            </div>

            {/* Primary Action Button (Brand Deep Forest Theme) */}
            <button
              type="button"
              onClick={handleStartSubscription}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: brandTokens.deepForest,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: brandTokens.shadowMd,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = brandTokens.deepForestHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = brandTokens.deepForest;
              }}
            >
              <span>{isSoftPrompt ? 'Keep My Websites Protected & Auto-Renew' : 'Start My Subscription'}</span>
              <ArrowRight size={16} />
            </button>

            {/* Trust Markers Below Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '14px',
              fontSize: '11.5px',
              color: brandTokens.textMuted,
              flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} />
                256-Bit SSL Encrypted
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={12} />
                Secure Payment by Stripe / Paddle
              </span>
              <span>•</span>
              <span>Cancel Anytime with 1-Click</span>
            </div>

            {/* Soft Prompt Remind Me Later Option */}
            {isSoftPrompt && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleDismissSoft}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: brandTokens.textMuted,
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = brandTokens.textHeading;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = brandTokens.textMuted;
                  }}
                >
                  Remind me later &bull; Continue to dashboard for now ({trialDays} days left)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            CARD 2: EVERYTHING IS INCLUDED (Comprehensive 4-Column Breakdown)
            Inspired by WP Umbrella's Clean Architecture + MDefender Enterprise Superpowers
            ===================================================================== */}
        <div style={{
          background: brandTokens.cardBg,
          border: `1.5px solid ${brandTokens.cardBorder}`,
          borderRadius: '16px',
          boxShadow: brandTokens.shadowSm,
          padding: '32px 28px',
          marginBottom: '36px'
        }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid #EEF2EF'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: brandTokens.emeraldPrimary,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '6px'
              }}>
                <Sparkles size={13} />
                <span>Zero Hidden Add-ons • Zero Tiered Lockouts</span>
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '800',
                color: brandTokens.textHeading,
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Everything is included.
              </h2>
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: brandTokens.textMuted,
              maxWidth: '460px',
              textAlign: 'right'
            }}>
              One flat price per site (${monthlyRate.toFixed(2)}/mo), every proprietary enterprise superpower, unlimited team members.
            </div>
          </div>

          {/* 4 Clean Columns Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px'
          }}>
            {/* Column 1: Next-Gen Cloud WAF & DDoS */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid #F1F5F2'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: brandTokens.emeraldLight,
                  color: brandTokens.emeraldPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={16} strokeWidth={2.4} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                  Next-Gen WAF &amp; DDoS
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {[
                  'Sub-millisecond (<0.12ms) L7 Edge Inspection',
                  'Full OWASP Top 10 mitigation (SQLi, XSS, RCE, SSRF)',
                  'Autonomous zero-day virtual patching DFA',
                  'Proof-of-Work (PoW) Anti-DDoS (Zero Captchas)',
                  'AI prompt injection barrier & LLM firewall',
                  'Sovereign country geo-fencing & CIDR IP rules',
                  'Dynamic rate limiting & auto scraper ban'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.45' }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: 5.24M+ Malware Hunter & Disinfection */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid #F1F5F2'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Database size={16} strokeWidth={2.4} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                  5.24M+ Malware Hunter
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {[
                  '5.24M+ WP core & plugin checksums (0.01ms SQLite)',
                  'AST heuristic obfuscated code & backdoor scanner',
                  '1-Click post-hack disinfection (Zero downtime)',
                  'Instant rogue admin purge & security salts rotation',
                  'Uploads directory PHP execution lockdown',
                  'Hidden malicious cron jobs & task killer',
                  '1-Click automated quarantine & safe restore'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.45' }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Fleet Management & Automation (All WP Umbrella Features) */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid #F1F5F2'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: brandTokens.pillBg,
                  color: brandTokens.deepForest,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={16} strokeWidth={2.4} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                  Fleet &amp; Maintenance
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {[
                  '1-Click passwordless WP-Admin SSO access',
                  'Bulk safe updates with pre-rollback snapshot',
                  '50-day encrypted cloud backups & 1-click restore',
                  'Deep database hygiene & MySQL optimization',
                  '24/7 uptime, domain, SSL & PHP error monitoring',
                  'Broken links & Core Web Vitals diagnostics',
                  'Router DNS edge network firewall integration'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.45' }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Forensics, White-Label & Clients */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid #F1F5F2'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: '#FFFBEB',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={16} strokeWidth={2.4} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                  Forensics &amp; White-Label
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {[
                  'Live HTTP attack inspector & raw payload dumps',
                  'White-label executive client PDF audit exports',
                  'Native RFC-6238 2FA multi-factor authentication',
                  'Stealth WP-Admin gateway & URL camouflage',
                  'Multi-channel alerts (Slack, Telegram, Email, Webhook)',
                  'Unlimited team operators with granular RBAC',
                  'Public REST API, MCP & automation webhooks'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.45' }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 3: HEAD-TO-HEAD COMPARISON MATRIX (MDefender Pro vs Competitors)
            Proving Beyond Doubt Why MDefender Pro Is 10x Superior to WP Umbrella
            ===================================================================== */}
        <div style={{
          background: brandTokens.cardBg,
          border: `1.5px solid ${brandTokens.cardBorder}`,
          borderRadius: '16px',
          boxShadow: brandTokens.shadowSm,
          overflow: 'hidden',
          marginBottom: '36px'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 28px',
            background: 'linear-gradient(135deg, rgba(11, 37, 34, 0.03), rgba(40, 116, 93, 0.06))',
            borderBottom: `1px solid ${brandTokens.cardBorder}`
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              color: brandTokens.emeraldPrimary,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px'
            }}>
              <Award size={13} />
              <span>Head-to-Head Capability Comparison</span>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '800',
              color: brandTokens.textHeading,
              margin: '0 0 4px 0'
            }}>
              Why Agencies &amp; Enterprises Switch from WP Umbrella to MDefender Pro
            </h3>
            <p style={{ fontSize: '13px', color: brandTokens.textBody, margin: 0 }}>
              WP Umbrella charges extra for basic security add-ons without providing any real edge WAF or malware remediation. MDefender Pro delivers the entire security and fleet suite in one unified engine.
            </p>
          </div>

          {/* Responsive Comparison Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: `1px solid ${brandTokens.cardBorder}` }}>
                  <th style={{ padding: '14px 20px', fontWeight: '800', color: brandTokens.textHeading }}>
                    Key Capability / Superpower
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: brandTokens.textMuted, textAlign: 'center' }}>
                    WP Umbrella ($4.19/site)
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: brandTokens.textMuted, textAlign: 'center' }}>
                    Cloudflare Pro ($25.00/site)
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: brandTokens.textMuted, textAlign: 'center' }}>
                    Wordfence ($12.42/site)
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    fontWeight: '800',
                    color: brandTokens.deepForest,
                    background: brandTokens.emeraldLight,
                    textAlign: 'center',
                    borderLeft: `1px solid ${brandTokens.emeraldBorder}`,
                    borderRight: `1px solid ${brandTokens.emeraldBorder}`
                  }}>
                    MDefender Pro ($4.00/site)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feat: 'Layer-7 Cloud Edge WAF (<0.12ms)',
                    desc: 'Stops SQLi, XSS, RCE, SSRF before touching the server',
                    wp: { text: 'None', ok: false },
                    cf: { text: 'Basic ($25/mo)', ok: 'warn' },
                    wf: { text: 'PHP-only (Slow)', ok: false },
                    md: { text: 'Included (<0.12ms Edge)', ok: true }
                  },
                  {
                    feat: '5.24M+ SQLite Malware Hunter',
                    desc: 'Official WordPress checksums with 0.01ms instant lookup',
                    wp: { text: '+$2.00/mo Add-on', ok: 'warn' },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'Slow PHP scanning', ok: 'warn' },
                    md: { text: 'Included (5.24M+ Hashes)', ok: true }
                  },
                  {
                    feat: '1-Click Post-Hack Remediation',
                    desc: 'Rogue admin purge, salt rotation & zero-downtime disinfection',
                    wp: { text: 'None', ok: false },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'Manual ($490 Clean)', ok: false },
                    md: { text: 'Included (1-Click Clean)', ok: true }
                  },
                  {
                    feat: 'Zero-Day Virtual Patching Engine',
                    desc: 'DFA state machine virtual patching without waiting for updates',
                    wp: { text: '+$2.00/mo Add-on', ok: 'warn' },
                    cf: { text: 'Pro tier required', ok: 'warn' },
                    wf: { text: '$149/yr tier only', ok: 'warn' },
                    md: { text: 'Included Autonomous', ok: true }
                  },
                  {
                    feat: 'Anti-DDoS Proof-of-Work (PoW)',
                    desc: 'Autonomous scrubber without frustrating visual captchas',
                    wp: { text: 'None', ok: false },
                    cf: { text: 'Visual CAPTCHAs', ok: 'warn' },
                    wf: { text: 'None', ok: false },
                    md: { text: 'Included (Zero CAPTCHAs)', ok: true }
                  },
                  {
                    feat: '1-Click Passwordless WP-Admin SSO',
                    desc: 'Direct secure access to all WordPress dashboards',
                    wp: { text: 'Included', ok: true },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'None', ok: false },
                    md: { text: 'Included (Fleet SSO)', ok: true }
                  },
                  {
                    feat: 'Bulk Safe Updates with Rollback',
                    desc: 'Pre-update snapshot verification with automated recovery',
                    wp: { text: 'Included', ok: true },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'None', ok: false },
                    md: { text: 'Included (Automated)', ok: true }
                  },
                  {
                    feat: 'Router & Edge DNS Network Firewall',
                    desc: 'Hardware router DNS protection + WordPress WAF unified',
                    wp: { text: 'None', ok: false },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'None', ok: false },
                    md: { text: 'Included Proprietary', ok: true }
                  },
                  {
                    feat: 'White-Label Executive Client PDF Reports',
                    desc: 'Branded executive reports for digital agencies and clients',
                    wp: { text: 'High tiers only', ok: 'warn' },
                    cf: { text: 'None', ok: false },
                    wf: { text: 'None', ok: false },
                    md: { text: 'Included Unlimited', ok: true }
                  },
                  {
                    feat: 'Effective Monthly Price',
                    desc: 'Per website protected with every capability included',
                    wp: { text: '$4.19 / site / mo', ok: 'warn' },
                    cf: { text: '$25.00+ / site / mo', ok: false },
                    wf: { text: '$12.42 / site / mo', ok: false },
                    md: { text: '$4.00 / site / mo ($3.33/yr)', ok: 'highlight' }
                  }
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx === 9 ? 'none' : '1px solid #F1F5F2',
                      background: idx % 2 === 1 ? '#FAFBF9' : '#FFFFFF'
                    }}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: '750', color: brandTokens.textHeading, fontSize: '13px' }}>
                        {row.feat}
                      </div>
                      <div style={{ fontSize: '11px', color: brandTokens.textMuted, marginTop: '2px' }}>
                        {row.desc}
                      </div>
                    </td>

                    {/* WP Umbrella */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: row.wp.ok === true ? brandTokens.emeraldPrimary : row.wp.ok === 'warn' ? '#B45309' : '#DC2626', fontWeight: '600' }}>
                      {row.wp.text}
                    </td>

                    {/* Cloudflare Pro */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: row.cf.ok === true ? brandTokens.emeraldPrimary : row.cf.ok === 'warn' ? '#B45309' : '#DC2626', fontWeight: '600' }}>
                      {row.cf.text}
                    </td>

                    {/* Wordfence */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: row.wf.ok === true ? brandTokens.emeraldPrimary : row.wf.ok === 'warn' ? '#B45309' : '#DC2626', fontWeight: '600' }}>
                      {row.wf.text}
                    </td>

                    {/* MDefender Pro */}
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center',
                      background: row.md.ok === 'highlight' ? brandTokens.emeraldPrimary : brandTokens.emeraldLight,
                      color: row.md.ok === 'highlight' ? '#FFFFFF' : brandTokens.emeraldPrimary,
                      fontWeight: '800',
                      borderLeft: `1px solid ${brandTokens.emeraldBorder}`,
                      borderRight: `1px solid ${brandTokens.emeraldBorder}`
                    }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {row.md.ok !== 'highlight' && <Check size={14} strokeWidth={3} />}
                        <span>{row.md.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            CARD 3: REAL MDEFENDER SUPERPOWERS (High-Impact Enterprise Grid)
            ===================================================================== */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              color: brandTokens.textHeading,
              margin: '0 0 6px 0'
            }}>
              Everything Included in Every Connected Website
            </h2>
            <p style={{ fontSize: '13.5px', color: brandTokens.textBody, margin: 0 }}>
              Full access to every proprietary security capability without tiered paywalls or arbitrary feature gating.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {/* Superpower 1: Autonomous Layer-7 WAF & PoW Anti-DDoS */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: brandTokens.emeraldLight,
                  color: brandTokens.emeraldPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    Next-Gen L7 WAF &amp; Anti-DDoS
                  </h4>
                  <span style={{ fontSize: '11px', color: brandTokens.emeraldPrimary, fontWeight: '700' }}>
                    &lt;0.12ms Edge Latency
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Autonomous sub-millisecond line-rate request inspection powered by hybrid DFA deterministic rules and real-time machine learning.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  'Full OWASP Top 10 mitigation (SQLi, XSS, RCE, LFI, SSRF)',
                  'Generative AI prompt injection barrier & LLM guard',
                  'Proof-of-Work (PoW) Anti-DDoS (Zero visual captchas)',
                  'Dynamic rate limiting & scraper automated IP ban'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Superpower 2: Deep File Integrity & 5.24M+ Checksum Malware Hunter */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Database size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    5.24M+ SQLite Malware Hunter
                  </h4>
                  <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: '700' }}>
                    Official WP Core Signatures
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Ultra-fast file integrity auditing against official WordPress repository checksums with AST obfuscated code pattern detection.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  'Official WordPress Checksums Database (0.01ms lookup)',
                  'AST heuristic scanner for obfuscated PHP code & backdoors',
                  '1-Click automated quarantine with safe restoration',
                  'Zero-day web-shell, crypto-miner, & DB injector purge'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Superpower 3: 1-Click Post-Hack Remediation & Rogue Admin Purge */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RotateCcw size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    1-Click Post-Hack Remediation
                  </h4>
                  <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>
                    Zero-Downtime Disinfection
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Disinfect hacked environments in minutes without restoring obsolete backups or losing recent orders and content.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  'Instant rogue admin purge & secret security salts rotation',
                  'Forced administrator password reset & active session wipe',
                  'Hidden malicious cron jobs & backdoor tasks eradication',
                  'Uploads directory PHP execution lockdown & stealth gateway'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Superpower 4: Multi-Site Fleet Management & WP-Admin SSO */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: brandTokens.pillBg,
                  color: brandTokens.deepForest,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    Centralized Multi-Site Fleet
                  </h4>
                  <span style={{ fontSize: '11px', color: brandTokens.deepForest, fontWeight: '700' }}>
                    1-Click WP-Admin SSO
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Control all client and company WordPress endpoints from one single cloud cockpit with zero password management hassles.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  '1-Click direct WP-Admin SSO login gateway (Zero passwords)',
                  'Bulk safe updates with pre-rollback snapshot protection',
                  'Automated database hygiene & MySQL overhead optimization',
                  'Native RFC-6238 TOTP two-factor authentication (2FA)'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Superpower 5: Live Forensics, Alerts & White-Label Audits */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#FFFBEB',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    Live Forensics &amp; White-Label
                  </h4>
                  <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '700' }}>
                    Client PDF Audit Reports
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Full visibility into every blocked request, raw payload forensics, and agency white-label reports for your clients.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  'Live HTTP request inspector with raw attack payload dumps',
                  'CIDR subnet blacklisting & sovereign country geo-fencing',
                  'White-label executive client PDF audit exports',
                  'Multi-channel alerts via Slack, Telegram, Email & Webhook'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Superpower 6: Dedicated Cybersecurity SLA & 24/7 Engineers */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '14px',
              padding: '22px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#F5F3FF',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Cpu size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: brandTokens.textHeading }}>
                    Enterprise SecOps Support
                  </h4>
                  <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: '700' }}>
                    24/7 Security Engineers
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: brandTokens.textBody, lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Direct access to certified cybersecurity operators ready to assist with active attacks, complex custom WAF rules, and investigations.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  '24/7 priority emergency incident response team',
                  'Unlimited team operator accounts with granular RBAC',
                  'Zero-Trust fleet architecture with encrypted audit logs',
                  'Guaranteed 15-minute critical security SLA response'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: brandTokens.textBody }}>
                    <Check size={13} color={brandTokens.emeraldPrimary} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 4: WHY TRUST MDEFENDER? (Enterprise Trust Bar)
            ===================================================================== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: brandTokens.cardBg,
            border: `1px solid ${brandTokens.cardBorder}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: brandTokens.shadowSm
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: brandTokens.emeraldLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandTokens.emeraldPrimary
              }}>
                <Zap size={16} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                99.99% Edge Uptime SLA
              </div>
            </div>
            <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.5' }}>
              High-throughput edge proxies across global Anycast points of presence guarantee uninterrupted protection.
            </div>
          </div>

          <div style={{
            background: brandTokens.cardBg,
            border: `1px solid ${brandTokens.cardBorder}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: brandTokens.shadowSm
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706'
              }}>
                <Shield size={16} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                0.00% False Positive Rate
              </div>
            </div>
            <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.5' }}>
              Patented AST threat heuristics isolate actual malicious exploits without blocking legitimate customer checkouts.
            </div>
          </div>

          <div style={{
            background: brandTokens.cardBg,
            border: `1px solid ${brandTokens.cardBorder}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: brandTokens.shadowSm
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#EDE9FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7C3AED'
              }}>
                <Lock size={16} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: brandTokens.textHeading }}>
                Zero-Trust Site Isolation
              </div>
            </div>
            <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.5' }}>
              Cryptographically unique 64-character tokens ensure strict isolation across your entire WordPress fleet.
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: brandTokens.textMuted,
          paddingTop: '20px',
          borderTop: `1px solid ${brandTokens.cardBorder}`
        }}>
          &copy; {new Date().getFullYear()} MDefender Pro Enterprise Fleet Defense. All Rights Reserved. &bull; SOC2 Type II Certified Architecture
        </div>

      </main>
    </div>
  );
}
