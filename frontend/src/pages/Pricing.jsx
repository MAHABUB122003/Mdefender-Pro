import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PaymentModal from '../components/PaymentModal';
import api from '../api/api';
import {
  Shield,
  Zap,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  Lock,
  Globe,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

const PLAN_ICONS = {
  free: Shield,
  go: Zap,
  pro: Sparkles,
  enterprise: Globe,
};

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Starter Free',
    badge: 'Free Forever',
    monthly: 0,
    yearly: 0,
    desc: 'Essential cybersecurity for personal websites, staging environments, and developer test sites.',
    features: [
      { text: '1 Protected Domain & Origin', included: true },
      { text: '10,000 requests / month', included: true },
      { text: 'Core WAF Rule Engine (500+ Signatures)', included: true },
      { text: 'Basic Anomaly & Rate Limiting', included: true },
      { text: 'Real-Time Edge Security Block Page', included: true },
      { text: '6.5M+ Threat Neural Classifier', included: false },
      { text: '639K+ AI Prompt Injection Shield', included: false },
      { text: 'Layer 7 Volumetric DDoS Mitigation', included: false },
      { text: '24/7 Priority SLA Response', included: false },
    ],
    btnText: 'Start Free Forever',
    highlight: false,
  },
  {
    id: 'go',
    name: 'Developer Go',
    badge: 'Fast-Growing Apps',
    monthly: 9,
    yearly: 90,
    desc: 'Active machine learning protection for small businesses, API services, and e-commerce stores.',
    features: [
      { text: '5 Protected Websites & APIs', included: true },
      { text: '100,000 requests / month', included: true },
      { text: 'Core WAF + Heuristic Vectorizer', included: true },
      { text: '6.5M+ Threat Neural Classifier', included: true },
      { text: '50,000+ Threat Signatures & Hashes', included: true },
      { text: '20 Custom Regex Rules Builder', included: true },
      { text: 'Real-Time Security Threat Alerts', included: true },
      { text: 'Priority Email Technical Support', included: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation', included: false },
    ],
    btnText: 'Start Developer Plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Enterprise Pro',
    badge: 'Most Popular',
    monthly: 20,
    yearly: 190,
    desc: 'Maximum cyber defense for mission-critical production clusters, SaaS platforms, and high-traffic stores.',
    features: [
      { text: '10 Protected Domains & APIs', included: true },
      { text: '1,000,000 Requests / Month', included: true },
      { text: 'Full 2,000,000+ Hyper-Scale Signatures', included: true },
      { text: '6,501,208+ Dataset Deep ML Core', included: true },
      { text: '639K+ Generative AI Prompt Shield', included: true },
      { text: 'Unlimited Custom Regex Policies', included: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation', included: true },
      { text: 'Sub-Millisecond (0.12ms) Edge Inspection', included: true },
      { text: 'WordPress RASP Auto-Quarantine', included: true },
      { text: '24/7 Priority Dedicated SLA', included: true },
    ],
    btnText: 'Get Started with Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Dedicated Enterprise',
    badge: 'Maximum Scale',
    monthly: 49,
    yearly: 470,
    desc: 'Dedicated security infrastructure, multi-cluster proxy nodes, and 15-minute guaranteed SLA response.',
    features: [
      { text: '15 Protected Domains & APIs', included: true },
      { text: '10,000,000+ Requests / Month', included: true },
      { text: 'Dedicated ML Neural Vectorizer Node', included: true },
      { text: 'Full 2,000,000+ Hyper-Scale Signatures', included: true },
      { text: '639K+ AI Gateway & LLM Jailbreak Guard', included: true },
      { text: 'Automated Layer 7 DDoS Scrubber', included: true },
      { text: 'Unlimited Custom Zero-Day Rules', included: true },
      { text: 'Dedicated Account Security Architect', included: true },
      { text: 'Custom Webhook & SOC SIEM Export', included: true },
      { text: '15-Minute Guaranteed SLA Response', included: true },
    ],
    btnText: 'Deploy Dedicated Plan',
    highlight: false,
  },
];

const COMPARISON_FEATURES = [
  { name: 'Protected Domains & APIs', free: '1 Domain', go: '5 Domains', pro: '10 Domains', enterprise: '15 Domains' },
  { name: 'Threat Training Dataset', free: '500 Signatures', go: '6.5M Model', pro: '6,501,208+ Neural Core', enterprise: 'Dedicated ML Node' },
  { name: 'Generative AI Prompt Injection Shield', free: '—', go: 'Standard Guard', pro: '639K+ Jailbreak Filter', enterprise: 'Full AI Gateway' },
  { name: 'Active Attack Signatures', free: '500 Signatures', go: '50,000+ Signatures', pro: '2,000,000+ Hyper-Scale', enterprise: 'Full Mesh 2M+' },
  { name: 'Edge Inspection Latency', free: 'Standard (15ms)', go: 'Accelerated (3ms)', pro: 'Single-Pass (0.12ms)', enterprise: 'Ultra-Low (<0.10ms)' },
  { name: 'Layer 7 Volumetric DDoS Shield', free: '—', go: 'Basic Rate Limiter', pro: 'Adaptive Token Bucket', enterprise: '180+ Anycast Mesh' },
  { name: 'Automated Bot & Scanner Ban', free: 'Basic Scrapers', go: 'Known Scanners', pro: 'Zero-Day Fingerprinting', enterprise: 'Behavioral AI Engine' },
  { name: 'WordPress 1-Click Runtime Sync', free: 'Basic Telemetry', go: 'Telemetry & Rules', pro: 'Deep RASP + Auto-Patch', enterprise: 'Multi-Site Fleet Sync' },
  { name: 'Multi-Tenant Centralized SOC Console', free: 'Single User', go: 'Single User', pro: 'Multi-Tenant Workspace', enterprise: 'Role-Based RBAC + SSO' },
  { name: 'Customer Support & SLA Response', free: 'Community', go: 'Priority Email (4h)', pro: '24/7 Dedicated (1h)', enterprise: '15-Minute Critical SLA' },
];

const FAQS = [
  {
    q: 'How does MDefender Pro differ from standard cloud proxies?',
    a: 'MDefender Pro operates a single-pass hybrid inspection engine that unifies deterministic Layer 7 regex rules with an active neural vectorizer trained on over 6,501,208 verified attack payloads. This achieves sub-millisecond (0.12ms) execution without adding latency to your legitimate users.',
  },
  {
    q: 'Can I start for free and upgrade as my traffic grows?',
    a: 'Yes! The Starter Free tier provides genuine, permanent protection for 1 domain with 10,000 monthly requests. When your traffic accelerates or when you need real-time DDoS mitigation, you can upgrade in one click with zero downtime.',
  },
  {
    q: 'How does billing work between monthly and annual plans?',
    a: 'Annual billing provides up to 20% discount (equivalent to 2 full months free). You can switch between monthly and annual cycles at any time from your billing console.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'We support all major Credit/Debit Cards (Visa, Mastercard, American Express) via paddle/stripe encryption, digital bank transfers, and automated invoice billing for enterprise accounts.',
  },
  {
    q: 'Is there a setup fee or long-term lock-in contract?',
    a: 'No contracts, no setup fees, and no lock-in. You can cancel or change your plan at any time with one click from your workspace settings.',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [plansList, setPlansList] = useState(DEFAULT_PLANS);
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');

  useEffect(() => {
    api.getPublicPricing().then((res) => {
      if (res?.data?.plans) {
        const raw = res.data.plans;
        setPlansList((prev) =>
          prev.map((p) => {
            const match = Array.isArray(raw) ? raw.find((r) => r.id === p.id) : raw[p.id];
            if (match) {
              return {
                ...p,
                name: match.name || match.display_name || p.name,
                monthly: match.monthly_price !== undefined ? match.monthly_price : p.monthly,
                yearly: match.yearly_price !== undefined ? match.yearly_price : p.yearly,
              };
            }
            return p;
          })
        );
      }
    }).catch(() => {});
  }, []);

  const handlePlanSelect = (planId) => {
    const cycle = isYearly ? 'yearly' : 'monthly';
    const token = localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');

    if (planId === 'free') {
      if (token) {
        navigate('/user/dashboard');
      } else {
        navigate('/user/login?plan=free');
      }
      return;
    }

    if (token) {
      // User is logged in: navigate to their dashboard's Pricing & Plans page
      navigate(`/user/pricing?plan=${planId}&cycle=${cycle}`);
    } else {
      // Force user to login first: redirect to sign in with plan params so post-login forwards to /user/pricing
      navigate(`/user/login?plan=${planId}&cycle=${cycle}`);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F6F1',
        color: '#10201E',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Subtle Ambient Background Gradients matching Homepage */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '700px',
          height: '600px',
          background: 'radial-gradient(circle at 80% 15%, rgba(232, 238, 232, 0.6) 0%, rgba(247, 246, 241, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '200px',
          left: 0,
          width: '560px',
          height: '560px',
          background: 'radial-gradient(circle at 15% 30%, rgba(234, 244, 255, 0.45) 0%, rgba(247, 246, 241, 0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Global Clean Public Navbar */}
      <PublicNavbar />

      {/* ===================== HERO / HEADER SECTION ===================== */}
      <main id="main-content">
        <section
          style={{
            paddingTop: 'calc(76px + 64px)',
            paddingBottom: '52px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            {/* Eyebrow Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#E8EEE8',
                border: '1px solid #D9E1DC',
                fontSize: '11px',
                fontWeight: 700,
                color: '#E8792F',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              <span>Transparent Enterprise Security</span>
            </div>

            {/* Editorial Heading */}
            <h1
              style={{
                fontSize: 'clamp(36px, 4.6vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.065em',
                color: '#10201E',
                maxWidth: '820px',
                margin: '0 auto 18px',
              }}
            >
              Predictable cyber defense.{' '}
              <span style={{ color: '#E8792F' }}>No hidden surprise fees.</span>
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontSize: 'clamp(15px, 1.8vw, 16.5px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                maxWidth: '640px',
                margin: '0 auto 34px',
              }}
            >
              Scale from a single domain to mission-critical multi-cluster infrastructure. Every plan includes our 6.5M+ attack payload neural core with sub-millisecond edge inspection.
            </p>

            {/* Billing Cycle Toggle */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#E8EEE8',
                padding: '5px',
                borderRadius: '999px',
                border: '1px solid #D9E1DC',
                boxShadow: 'inset 0 1px 3px rgba(11, 37, 34, 0.05)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className="billing-toggle-btn"
                style={{
                  padding: '9px 22px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isYearly ? '#0B2522' : 'transparent',
                  color: !isYearly ? '#FFFFFF' : '#4A5D5A',
                  boxShadow: !isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                Monthly billing
              </button>

              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className="billing-toggle-btn"
                style={{
                  padding: '9px 22px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: isYearly ? '#0B2522' : 'transparent',
                  color: isYearly ? '#FFFFFF' : '#4A5D5A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span>Annual billing</span>
                <span
                  style={{
                    background: '#E8792F',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    boxShadow: '0 1px 4px rgba(232, 121, 47, 0.3)',
                  }}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ===================== 4-PLAN CARDS GRID ===================== */}
        <section
          style={{
            maxWidth: '1180px',
            margin: '0 auto 88px',
            padding: '0 clamp(20px, 3.2vw, 32px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            className="pricing-cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
              gap: '18px',
              alignItems: 'stretch',
            }}
          >
            {plansList.map((p) => {
              const priceVal = isYearly ? p.yearly : p.monthly;
              const isPopular = p.highlight;

              return (
                <div
                  key={p.id}
                  className="pricing-card"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: isPopular ? '1.5px solid #E8792F' : '1px solid #D9E1DC',
                    boxShadow: isPopular
                      ? '0 20px 50px rgba(232, 121, 47, 0.12), 0 4px 18px rgba(11, 37, 34, 0.06)'
                      : '0 4px 20px rgba(11, 37, 34, 0.04)',
                    padding: '30px 24px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Popular Floating Badge */}
                  {isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-11px',
                        right: '20px',
                        background: '#E8792F',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        boxShadow: '0 2px 8px rgba(232, 121, 47, 0.35)',
                      }}
                    >
                      {p.badge}
                    </div>
                  )}

                  <div>
                    {/* Tier Icon & Badge Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                      }}
                    >
                      {(() => {
                        const IconComponent = PLAN_ICONS[p.id] || Shield;
                        return (
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isPopular ? '#FFF4ED' : '#E8EEE8',
                              border: isPopular ? '1px solid #FCD3B6' : '1px solid #D9E1DC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isPopular ? '#E8792F' : '#0B2522',
                            }}
                          >
                            <IconComponent size={19} strokeWidth={2.4} />
                          </div>
                        );
                      })()}

                      {!isPopular && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#60716B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            background: '#E8EEE8',
                            padding: '3px 9px',
                            borderRadius: '999px',
                          }}
                        >
                          {p.badge}
                        </span>
                      )}
                    </div>

                    {/* Plan Name */}
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#10201E',
                        margin: '0 0 6px 0',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {p.name}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#60716B',
                        lineHeight: 1.5,
                        margin: '6px 0 18px',
                        minHeight: '38px',
                      }}
                    >
                      {p.desc}
                    </p>

                    {/* Price Display */}
                    <div
                      style={{
                        marginBottom: '22px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #D9E1DC',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '44px',
                            fontWeight: 850,
                            color: '#10201E',
                            letterSpacing: '-0.05em',
                            lineHeight: 1,
                          }}
                        >
                          ${priceVal}
                        </span>
                        <span style={{ fontSize: '13px', color: '#60716B', fontWeight: 600 }}>
                          {p.id === 'free' ? 'forever' : isYearly ? '/ year' : '/ month'}
                        </span>
                      </div>

                      {p.id !== 'free' && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '11.5px',
                            color: isYearly ? '#E8792F' : '#60716B',
                            fontWeight: 600,
                          }}
                        >
                          {isYearly
                            ? `$${(p.yearly / 12).toFixed(2)}/mo · Save $${p.monthly * 12 - p.yearly}/yr`
                            : 'Billed monthly · Cancel anytime'}
                        </div>
                      )}

                      {p.id === 'free' && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '11.5px',
                            color: '#2A8B68',
                            fontWeight: 600,
                          }}
                        >
                          Zero credit card required
                        </div>
                      )}
                    </div>

                    {/* Action CTA Button */}
                    <button
                      type="button"
                      onClick={() => handlePlanSelect(p.id)}
                      className={
                        isPopular
                          ? 'plan-btn-pro'
                          : p.id === 'free'
                          ? 'plan-btn-free'
                          : 'plan-btn-outline'
                      }
                      style={{
                        width: '100%',
                        height: '46px',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '24px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <span>{p.btnText}</span>
                      <ArrowRight size={14} strokeWidth={2.4} className="btn-arrow-icon" style={{ transition: 'transform 0.2s ease' }} />
                    </button>

                    {/* Features List */}
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#10201E',
                        letterSpacing: '0.12em',
                        marginBottom: '12px',
                      }}
                    >
                      Included Capabilities
                    </div>

                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {p.features.map((f, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '9px',
                            fontSize: '13px',
                            color: f.included ? '#10201E' : '#87948D',
                          }}
                        >
                          {f.included ? (
                            <Check
                              size={14}
                              strokeWidth={2.6}
                              style={{ color: '#2A8B68', marginTop: '2px', flexShrink: 0 }}
                            />
                          ) : (
                            <X
                              size={14}
                              strokeWidth={2}
                              style={{ color: '#CBD8CF', marginTop: '2px', flexShrink: 0 }}
                            />
                          )}
                          <span
                            style={{
                              textDecoration: f.included ? 'none' : 'line-through',
                              lineHeight: 1.45,
                            }}
                          >
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================== TRUST STRIP (#0B2522) ===================== */}
        <section
          style={{
            background: '#0B2522',
            color: '#ffffff',
            minHeight: '68px',
            padding: '16px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              width: '100%',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div
              className="trust-strip-grid"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#E8EEE8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
                <span>99.99% Guaranteed Edge Uptime SLA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} strokeWidth={2.4} style={{ color: '#E8792F' }} />
                <span>30-Day Money-Back Risk-Free Guarantee</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
                <span>&lt;0.12ms Sub-Millisecond Inspection Latency</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== COMPARISON MATRIX (Soft Sage #E8EEE8) ===================== */}
        <section
          style={{
            background: '#E8EEE8',
            padding: '96px 0',
            borderTop: '1px solid #D9E1DC',
            borderBottom: '1px solid #D9E1DC',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '8px',
                }}
              >
                Comprehensive Breakdown
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 42px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.1,
                  marginBottom: '12px',
                }}
              >
                Compare detailed security capabilities.
              </h2>
              <p
                style={{
                  fontSize: '15.5px',
                  lineHeight: 1.6,
                  color: '#4A5D5A',
                  maxWidth: '560px',
                  margin: '0 auto',
                }}
              >
                Side-by-side comparison of automated edge defense, ML vectorization, and SLAs across all tiers.
              </p>
            </div>

            {/* Table Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 12px 36px rgba(11, 37, 34, 0.05)',
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  minWidth: '760px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#FBFCFA',
                      borderBottom: '1px solid #D9E1DC',
                    }}
                  >
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#10201E' }}>
                      Security Capability
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#60716B' }}>
                      Starter Free ($0)
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#60716B' }}>
                      Developer Go ($9)
                    </th>
                    <th
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#E8792F',
                        background: '#FFF8F4',
                        borderLeft: '1px solid #D9E1DC',
                        borderRight: '1px solid #D9E1DC',
                      }}
                    >
                      Enterprise Pro ($20)
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#0B2522' }}>
                      Dedicated Enterprise ($49)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom:
                          idx < COMPARISON_FEATURES.length - 1 ? '1px solid #D9E1DC' : 'none',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '15px 20px', fontSize: '13px', fontWeight: 600, color: '#10201E' }}>
                        {row.name}
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: '12.5px', color: '#4A5D5A' }}>
                        {row.free}
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: '12.5px', color: '#4A5D5A' }}>
                        {row.go}
                      </td>
                      <td
                        style={{
                          padding: '15px 20px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0B2522',
                          background: '#FFF8F4',
                          borderLeft: '1px solid #D9E1DC',
                          borderRight: '1px solid #D9E1DC',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={14} strokeWidth={2.6} style={{ color: '#2A8B68' }} />
                          <span>{row.pro}</span>
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: '13px', fontWeight: 600, color: '#10201E' }}>
                        {row.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===================== FAQS SECTION ===================== */}
        <section
          style={{
            padding: '96px 0',
            background: '#F7F6F1',
          }}
        >
          <div
            style={{
              maxWidth: '820px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '8px',
                }}
              >
                Clear Answers
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 38px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                Frequently asked questions.
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #D9E1DC',
                      padding: '18px 22px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(11, 37, 34, 0.02)',
                      transition: 'border-color 0.15s ease',
                    }}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14.5px',
                        fontWeight: 700,
                        color: '#10201E',
                      }}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2.4}
                        style={{
                          color: isOpen ? '#E8792F' : '#60716B',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease, color 0.15s ease',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    {isOpen && (
                      <p
                        style={{
                          margin: '12px 0 0',
                          fontSize: '13.5px',
                          lineHeight: 1.6,
                          color: '#4A5D5A',
                        }}
                      >
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CALL TO ACTION ===================== */}
        <section
          style={{
            padding: '0 0 96px 0',
            background: '#F7F6F1',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 18px 45px rgba(11, 37, 34, 0.06)',
                padding: '32px 36px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#E8792F',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: '6px',
                  }}
                >
                  Risk-Free 30-Day Guarantee
                </div>
                <h3
                  style={{
                    fontSize: 'clamp(24px, 3vw, 34px)',
                    fontWeight: 800,
                    letterSpacing: '-0.06em',
                    color: '#10201E',
                    marginBottom: '6px',
                    lineHeight: 1.15,
                  }}
                >
                  Ready to protect your digital presence?
                </h3>
                <p style={{ fontSize: '15px', color: '#4A5D5A', margin: 0 }}>
                  Deploy autonomous edge defense in under 5 minutes with zero server downtime.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 24px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#153B34';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B2522';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Start free forever</span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </Link>

                <Link
                  to="/about"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 20px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid #CBD8CF',
                    color: '#10201E',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E8EEE8';
                    e.currentTarget.style.borderColor = '#10201E';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#CBD8CF';
                  }}
                >
                  <span>Contact security architect</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== GLOBAL FOOTER (#FBFCFA) ===================== */}
      <footer
        style={{
          background: '#FBFCFA',
          borderTop: '1px solid #D9E1DC',
          padding: '58px 0 26px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '0 clamp(20px, 3.2vw, 32px)',
          }}
        >
          {/* Four-Column Grid */}
          <div
            className="footer-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              gap: 'clamp(24px, 4vw, 40px)',
              marginBottom: '42px',
            }}
          >
            {/* Col 1 */}
            <div style={{ maxWidth: '320px' }}>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(11, 37, 34, 0.08)',
                    flexShrink: 0,
                  }}
                >
                  <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#10201E', letterSpacing: '-0.02em' }}>
                  MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
                </span>
              </Link>
              <p style={{ fontSize: '12px', color: '#4A5D5A', lineHeight: 1.6, margin: 0 }}>
                Autonomous cloud edge firewall, DDoS mitigation, and WordPress runtime application self-protection for modern engineering teams.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/products/waf" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Cloud WAF</Link>
                <Link to="/products/wordpress" style={{ color: '#4A5D5A', textDecoration: 'none' }}>WordPress Security</Link>
                <Link to="/threat-intelligence" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Threat Intelligence</Link>
                <Link to="/pricing" style={{ color: '#E8792F', textDecoration: 'none', fontWeight: 600 }}>Pricing</Link>
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Resources
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Documentation</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>System Status</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>API Reference</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Security Advisory</Link>
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Company &amp; Legal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }}>About Us</Link>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Trust Center</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Terms of Service</Link>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid #D9E1DC',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '11.5px',
              color: '#6A7E7A',
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} MDefender Pro. All rights reserved. Built for mission-critical web infrastructure.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2A8B68', fontWeight: 600 }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#2A8B68',
                  boxShadow: '0 0 6px #2A8B68',
                }}
              />
              <span>Systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Payment Checkout Modal for Logged-in Users */}
      <PaymentModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        plan={selectedPlan}
        billingCycle={isYearly ? 'yearly' : 'monthly'}
        onSuccess={() => {
          setCheckoutModalOpen(false);
          navigate('/user/dashboard');
        }}
      />

      {/* Responsive Styles & Button Micro-Interactions */}
      <style>{`
        .pricing-card:hover {
          transform: translateY(-4px);
        }

        /* Billing Toggle Buttons */
        .billing-toggle-btn:hover {
          color: #10201E !important;
        }

        /* Featured Enterprise Pro Plan Button */
        .plan-btn-pro {
          background-color: #0B2522 !important;
          color: #FFFFFF !important;
          border: 1.5px solid #0B2522 !important;
          box-shadow: 0 4px 16px rgba(11, 37, 34, 0.22) !important;
        }
        .plan-btn-pro:hover {
          background-color: #153B34 !important;
          border-color: #153B34 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(11, 37, 34, 0.3) !important;
        }
        .plan-btn-pro:active {
          transform: translateY(0) scale(0.98) !important;
        }
        .plan-btn-pro:hover .btn-arrow-icon {
          transform: translateX(4px) !important;
        }

        /* Standard Tier Outline Buttons (Developer Go & Dedicated Enterprise) */
        .plan-btn-outline {
          background-color: #FFFFFF !important;
          color: #0B2522 !important;
          border: 1.5px solid #0B2522 !important;
          box-shadow: 0 2px 6px rgba(11, 37, 34, 0.04) !important;
        }
        .plan-btn-outline:hover {
          background-color: #0B2522 !important;
          color: #FFFFFF !important;
          border-color: #0B2522 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 18px rgba(11, 37, 34, 0.18) !important;
        }
        .plan-btn-outline:active {
          transform: translateY(0) scale(0.98) !important;
        }
        .plan-btn-outline:hover .btn-arrow-icon {
          transform: translateX(4px) !important;
        }

        /* Starter Free Plan Button */
        .plan-btn-free {
          background-color: #FFFFFF !important;
          color: #10201E !important;
          border: 1.5px solid #CBD8CF !important;
          box-shadow: 0 2px 6px rgba(11, 37, 34, 0.04) !important;
        }
        .plan-btn-free:hover {
          background-color: #0B2522 !important;
          color: #FFFFFF !important;
          border-color: #0B2522 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 18px rgba(11, 37, 34, 0.16) !important;
        }
        .plan-btn-free:active {
          transform: translateY(0) scale(0.98) !important;
        }
        .plan-btn-free:hover .btn-arrow-icon {
          transform: translateX(4px) !important;
        }

        @media (max-width: 900px) {
          .pricing-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .pricing-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .trust-strip-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
