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
  ExternalLink
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
    // Initial fetch of profile and fleet size
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

  const pricePerSite = billingCycle === 'yearly' ? 40 : 4;
  const totalAmount = siteCount * pricePerSite;
  const yearlyEquivalent = billingCycle === 'yearly' ? (totalAmount / 12).toFixed(2) : totalAmount;

  const handleStartSubscription = () => {
    // Navigate cleanly to checkout / pricing with pre-selected parameters
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
          TOP NAVIGATION HEADER (Matching Onboarding Page Aesthetic)
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
          maxWidth: '1040px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Logo & Brand Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: brandTokens.deepForest,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
              boxShadow: '0 2px 6px rgba(11, 37, 34, 0.25)'
            }}>
              <Shield size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.02em', color: brandTokens.textHeading }}>
                MDefender<span style={{ color: brandTokens.accentOrange }}> Pro</span>
              </div>
              <div style={{ fontSize: '11px', color: brandTokens.textMuted, fontWeight: '600' }}>
                Cloud Security &amp; Fleet Firewall
              </div>
            </div>
          </div>

          {/* Right Header Status & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
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
                  <span>Trial Period Ended</span>
                </>
              ) : (
                <>
                  <Clock size={12} strokeWidth={2.5} />
                  <span>{trialDays} Days Left in Trial</span>
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
          MAIN BODY WRAPPER (WP Umbrella Full Page Architecture)
          ===================================================================== */}
      <main style={{ maxWidth: '1040px', margin: '36px auto 60px auto', padding: '0 20px' }}>
        
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
                <span>Protection Paused</span>
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
            {isHardLockout ? 'Your 14-Day Free Trial Is Over' : 'Keep Your Websites Protected'}
          </h1>
          <p style={{
            fontSize: '15px',
            color: brandTokens.textBody,
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            {isHardLockout
              ? 'Choose your subscription to instantly reactivate autonomous Layer-7 WAF, daily malware scanning, and fleet telemetry. Everything picks up right where you left it.'
              : 'Add your payment method today to ensure zero interruption when your trial completes. You will not be billed today ($0 hold) — your subscription begins automatically after Day 14.'}
          </p>
        </div>

        {/* =====================================================================
            CARD 1: YOUR SUBSCRIPTION (WP Umbrella Exact Replica Design)
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
            alignItems: 'center'
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
              Transparent pricing: <strong>$4.00 / site / month</strong>
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
                <div style={{ fontSize: '14px', fontWeight: '700', color: brandTokens.textHeading }}>
                  {siteCount} {siteCount === 1 ? 'Protected Website' : 'Protected Websites'}
                </div>
                <div style={{ fontSize: '12.5px', color: brandTokens.textMuted, marginTop: '2px' }}>
                  {billingCycle === 'yearly' ? '$40.00 per site, annual billing (Save 17%)' : '$4.00 per site, monthly billing'}
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
                  onClick={() => setSiteCount(prev => Math.min(250, prev + 1))}
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
                  Choose monthly flexibility or save with 2 months free on annual billing
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
                  Monthly ($4/mo)
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
                  <span>Yearly ($40/yr)</span>
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

            {/* Row 3: Trial / Special Discount Line (WP Umbrella style) */}
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
                  {isSoftPrompt ? '14-Day Free Trial Auto-Renew Guarantee' : 'Autonomous Security & Threat Intel Fleet'}
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
                  Billed in USD ($) • Cancel anytime with 1 click
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
                      ${totalAmount}.00 <span style={{ fontSize: '14px', fontWeight: '600', color: brandTokens.textMuted }}>
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: brandTokens.textMuted, marginTop: '2px' }}>
                  {isSoftPrompt ? (
                    `then $${totalAmount}.00 / ${billingCycle === 'yearly' ? 'year' : 'month'} after Day 14`
                  ) : (
                    billingCycle === 'yearly' ? `effective $${yearlyEquivalent} / month across ${siteCount} sites` : 'billed monthly per connected site'
                  )}
                </div>
              </div>
            </div>

            {/* Primary Action Button (Brand Deep Forest / Emerald Theme) */}
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
            CARD 2: EVERYTHING IS INCLUDED (WP Umbrella 3-Column Architecture)
            ===================================================================== */}
        <div style={{
          background: brandTokens.cardBg,
          border: `1.5px solid ${brandTokens.cardBorder}`,
          borderRadius: '16px',
          boxShadow: brandTokens.shadowSm,
          padding: '32px 28px',
          marginBottom: '36px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              color: brandTokens.textHeading,
              margin: '0 0 6px 0'
            }}>
              Everything is included.
            </h2>
            <p style={{ fontSize: '13.5px', color: brandTokens.textBody, margin: 0 }}>
              One flat price per site ($4/month), every enterprise defense feature, and unlimited team operators.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px'
          }}>
            {/* Column 1: Fleet Control & Hardening */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '800',
                color: brandTokens.textHeading,
                marginBottom: '14px'
              }}>
                <Layers size={16} color={brandTokens.deepForest} />
                <span>Fleet Control &amp; Hardening</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Centralized multi-site fleet dashboard',
                  '1-Click WP-Admin SSO gateway login',
                  'Bulk updates with pre-rollback safety snapshot',
                  'Automated database hygiene & MySQL optimization',
                  'Stealth admin URL & uploads PHP lockdown'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: brandTokens.textBody }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} style={{ flexShrink: 0, marginTop: '2px' }} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Security & Threat Intelligence */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '800',
                color: brandTokens.textHeading,
                marginBottom: '14px'
              }}>
                <ShieldCheck size={16} color={brandTokens.emeraldPrimary} />
                <span>Security &amp; Threat Intelligence</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Sub-millisecond (<0.12ms) Layer-7 WAF inspection',
                  '5.24M+ official WP core malware checksum scanner',
                  'Autonomous AST AI neural threat heuristics',
                  'Proof-of-Work (PoW) bot challenge & DDoS scrubber',
                  'Global IP reputation blacklist & geo-fencing'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: brandTokens.textBody }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} style={{ flexShrink: 0, marginTop: '2px' }} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Clients, Forensics & Support */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '800',
                color: brandTokens.textHeading,
                marginBottom: '14px'
              }}>
                <Activity size={16} color={brandTokens.accentOrange} />
                <span>Forensics, Audit &amp; Support</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'White-label executive client PDF audit reports',
                  'Real-time HTTP log inspector with raw payloads',
                  'Unlimited team operators with role-based access',
                  'Instant Slack, Telegram & Email security alerts',
                  '24/7 dedicated cybersecurity engineering SLA'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: brandTokens.textBody }}>
                    <Check size={14} color={brandTokens.emeraldPrimary} style={{ flexShrink: 0, marginTop: '2px' }} strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 3: WHY TRUST MDEFENDER? (Enterprise Trust Bar)
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
