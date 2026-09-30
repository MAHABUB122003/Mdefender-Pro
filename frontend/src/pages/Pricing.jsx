import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import PaymentModal from '../components/PaymentModal'
import theme from '../utils/theme'

const plans = [
  {
    id: 'free',
    name: 'Starter Free',
    badge: 'Free Forever',
    monthly: 0,
    yearly: 0,
    desc: 'Essential cybersecurity for personal projects, staging environments, and developer test sites.',
    features: [
      { text: '1 Protected Domain / Origin', included: true },
      { text: '10,000 requests / month', included: true },
      { text: 'Core WAF Rule Engine (500+ Signatures)', included: true },
      { text: 'Basic Anomaly & Rate Limiting', included: true },
      { text: 'Real-Time Edge Security Block Page', included: true },
      { text: '5.48M+ Dataset ML Classifier', included: false },
      { text: '2,000+ Advanced WAF Matrix Rules', included: false },
      { text: 'Custom Regex Rules Builder', included: false },
      { text: 'Layer 7 Volumetric DDoS Mitigation', included: false },
      { text: '24/7 Priority SLA Response', included: false },
    ],
    btnText: 'Start Free Forever',
    highlight: false,
    color: '#64748b',
  },
  {
    id: 'go',
    name: 'Developer Go',
    badge: 'Fast-Growing Apps',
    monthly: 9,
    yearly: 90,
    desc: 'Ideal for small businesses, API services, and e-commerce stores requiring active machine learning protection.',
    features: [
      { text: '5 Protected Websites / APIs', included: true },
      { text: '100,000 requests / month', included: true },
      { text: 'Core WAF + Heuristic Vectorizer', included: true },
      { text: '5.48M+ Dataset ML Classifier', included: true },
      { text: '20 Custom Regex Rules Builder', included: true },
      { text: 'Real-Time Email Security Threat Alerts', included: true },
      { text: 'Global IP Blacklist & Threat Telemetry', included: true },
      { text: 'Priority Email Technical Support', included: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation', included: false },
      { text: 'Dedicated Account Security Architect', included: false },
    ],
    btnText: 'Upgrade to Developer Go',
    highlight: false,
    color: '#3b82f6',
  },
  {
    id: 'pro',
    name: 'Enterprise Pro',
    badge: 'Most Popular',
    monthly: 29,
    yearly: 290,
    desc: 'Maximum cyber defense for mission-critical production clusters, SaaS platforms, and enterprise stores.',
    features: [
      { text: 'Unlimited Protected Domains & APIs', included: true },
      { text: 'Unlimited Request Volume & Bandwidth', included: true },
      { text: 'Full 2,000+ Advanced WAF Matrix', included: true },
      { text: '5,489,242+ Dataset Deep ML Core', included: true },
      { text: 'Unlimited Custom Regex Policies', included: true },
      { text: 'Layer 7 Volumetric DDoS Mitigation Shield', included: true },
      { text: 'Sub-Millisecond (<0.85ms) Edge Inspection', included: true },
      { text: 'Automated Bot & Scanner Ban (sqlmap/Nikto)', included: true },
      { text: 'Attack Learning & Autonomous Adaptation', included: true },
      { text: '24/7 Priority SLA & Dedicated Response', included: true },
    ],
    btnText: 'Deploy Enterprise Pro',
    highlight: true,
    color: '#6366f1',
  }
]

const comparisonFeatures = [
  { name: 'Attack Payload Training Dataset', free: 'Basic (100k)', go: '5.48M Model', pro: '5,489,242+ Neural Core' },
  { name: 'Active WAF Inspection Rules', free: '500 Signatures', go: '1,200 Signatures', pro: '2,000+ Full Matrix' },
  { name: 'Sub-Millisecond Edge Latency (<0.85ms)', free: 'Standard (15ms)', go: 'Accelerated (3ms)', pro: 'Sub-Millisecond (<0.85ms)' },
  { name: 'Zero-Day & Polymorphic AI Detection', free: 'No', go: 'Heuristic Scoring', pro: 'Neural AST Vectorizer' },
  { name: 'Layer 7 DDoS Volumetric Flood Shield', free: 'No', go: 'Basic Rate Limiter', pro: 'Active Volumetric Shield' },
  { name: 'Automated Bot & Offensive Tool Ban', free: 'Basic Scrapers', go: 'Scanner Signatures', pro: 'Zero-Day Fingerprinting' },
  { name: 'WordPress 1-Click Native Plugin Sync', free: 'Yes', go: 'Yes', pro: 'Yes + Edge Accelerator' },
  { name: 'Multi-Tenant Centralized SOC Console', free: 'Single User', go: 'Single User', pro: 'Multi-Tenant Enterprise' },
  { name: 'Attack Learning Feedback Engine', free: 'No', go: 'Weekly Feed', pro: 'Real-Time Continuous' },
  { name: 'Customer Support & SLA Response', free: 'Community', go: 'Priority Email (4h)', pro: '24/7 Dedicated SLA (15m)' },
]

const faqs = [
  {
    q: 'How does the 5,489,242+ dataset Machine Learning model protect my website?',
    a: 'MDefender Pro unifies a deterministic 2,000-rule regex matrix with an active neural vectorizer trained on over 5,489,242 real-world attack payloads. This enables sub-millisecond recognition of zero-day exploits, obfuscated SQL injection, cross-site scripting (XSS), and polymorphic evasions before they reach your backend servers.'
  },
  {
    q: 'Which payment methods do you support for subscriptions?',
    a: 'We support all major Credit/Debit Cards (Visa, Mastercard, American Express, Discover) via 256-bit encrypted Stripe, instant digital wallets (bKash with 1-click activation), direct Bank Wire Transfers (SWIFT / IBAN), and PayPal.'
  },
  {
    q: 'Can I switch between monthly and annual billing at any time?',
    a: 'Yes! You can upgrade or switch to annual billing from your dashboard anytime. Annual billing includes up to 18% savings (2 full months free).'
  },
  {
    q: 'What happens if my site experiences a massive Layer 7 DDoS attack?',
    a: 'On our Enterprise Pro tier, MDefender Pro’s adaptive token-bucket rate limiter and volumetric flood shield automatically absorbs and drops flood waves at the edge in real-time, preventing your origin servers and databases from becoming overwhelmed.'
  },
  {
    q: 'Is there a long-term contract or cancellation fee?',
    a: 'No contracts, no setup fees, and no lock-in. You can upgrade, downgrade, or cancel your subscription at any time with one click from your settings.'
  }
]

export default function Pricing() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const s = theme(dark)

  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('pro')

  const handlePlanSelect = (planId) => {
    if (planId === 'free') {
      navigate('/register')
      return
    }
    const token = localStorage.getItem('mdefender_user_token')
    if (!token) {
      navigate(`/register?plan=${planId}`)
      return
    }
    setSelectedPlan(planId)
    setCheckoutModalOpen(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#070b14' : '#f8fafc',
      color: s.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden',
      transition: 'background 0.3s, color 0.3s'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity:0.3; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.05); } }

        .pricing-card {
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: ${dark ? '0 25px 60px rgba(0,0,0,0.65)' : '0 15px 40px rgba(0,0,0,0.08)'};
        }

        .toggle-switch {
          display: inline-flex;
          align-items: center;
          background: ${dark ? 'rgba(15,23,42,0.85)' : '#e2e8f0'};
          padding: 5px 6px;
          border-radius: 30px;
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#cbd5e1'};
          cursor: pointer;
        }
        .toggle-option {
          padding: 8px 18px;
          border-radius: 24px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.25s;
          color: ${dark ? '#94a3b8' : '#64748b'};
        }
        .toggle-option.active {
          background: #6366f1;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(99,102,241,0.35);
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      <PublicNavbar />

      {/* Header Section */}
      <section style={{
        padding: '140px 24px 50px',
        textAlign: 'center',
        maxWidth: 1240,
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 450,
          background: `radial-gradient(circle, ${dark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite'
        }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease-out forwards' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
            border: `1px solid ${dark ? 'rgba(16,185,129,0.3)' : '#a7f3d0'}`,
            color: '#10b981',
            fontSize: 12.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 18
          }}>
            <i className="fas fa-shield-check"></i> Enterprise Transparent Pricing
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 54px)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            maxWidth: 920,
            margin: '0 auto 18px',
            color: s.text
          }}>
            Predictable Cyber Defense Built for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              High-Velocity Web Applications
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            lineHeight: 1.6,
            color: s.textSecondary,
            maxWidth: 720,
            margin: '0 auto 36px'
          }}>
            Protect your origins with <strong>2,000+ deterministic security rules</strong> and our <strong>5,489,242+ attack payload trained ML Neural Core</strong>. Simple pricing, zero hidden fees.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <div className="toggle-switch" onClick={() => setIsYearly(!isYearly)}>
              <span className={`toggle-option ${!isYearly ? 'active' : ''}`}>Monthly</span>
              <span className={`toggle-option ${isYearly ? 'active' : ''}`}>
                Yearly <span style={{ fontSize: 11, marginLeft: 4, background: '#10b981', padding: '2px 7px', borderRadius: 10, color: '#fff' }}>Save 18%</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Cards Grid */}
      <section style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 28,
          alignItems: 'stretch'
        }}>
          {plans.map(p => {
            const priceVal = isYearly ? p.yearly : p.monthly
            return (
              <div
                key={p.id}
                className="pricing-card"
                style={{
                  background: dark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
                  borderRadius: 22,
                  border: p.highlight
                    ? '2px solid #6366f1'
                    : `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                  padding: '40px 32px 34px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: p.highlight
                    ? (dark ? '0 15px 50px rgba(99,102,241,0.3)' : '0 10px 40px rgba(99,102,241,0.15)')
                    : (dark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)')
                }}
              >
                {/* Popular Highlight Badge */}
                {p.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: -14,
                    right: 28,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: '4px 14px',
                    borderRadius: 20,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
                  }}>
                    <i className="fas fa-crown" style={{ marginRight: 5 }}></i>
                    {p.badge}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 900, color: s.text, margin: 0 }}>
                      {p.name}
                    </h3>
                    {!p.highlight && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: s.textSecondary, textTransform: 'uppercase' }}>
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 13.5, color: s.textSecondary, margin: '8px 0 24px', minHeight: 40, lineHeight: 1.55 }}>
                    {p.desc}
                  </p>

                  {/* Price Banner */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
                    <span style={{
                      fontSize: 48,
                      fontWeight: 900,
                      color: p.highlight ? '#6366f1' : s.text,
                      letterSpacing: '-1.5px',
                      lineHeight: 1
                    }}>
                      ${priceVal}
                    </span>
                    <span style={{ fontSize: 14, color: s.textSecondary, fontWeight: 600 }}>
                      {p.id === 'free' ? 'forever' : isYearly ? '/ year' : '/ month'}
                    </span>
                  </div>

                  {/* Action CTA */}
                  <button
                    onClick={() => handlePlanSelect(p.id)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 12,
                      background: p.highlight
                        ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                        : dark ? 'rgba(255,255,255,0.06)' : '#0f172a',
                      border: p.highlight ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#1e293b'}`,
                      color: '#ffffff',
                      fontSize: 14.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: p.highlight ? '0 4px 18px rgba(99,102,241,0.4)' : 'none',
                      transition: 'all 0.2s',
                      marginBottom: 30
                    }}
                  >
                    {p.btnText}
                  </button>

                  {/* Features List */}
                  <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: s.textSecondary, letterSpacing: '0.5px', marginBottom: 14 }}>
                    Included Capabilities:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {p.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: f.included ? s.text : dark ? '#475569' : '#94a3b8' }}>
                        <i className={`fas ${f.included ? 'fa-check' : 'fa-times'}`} style={{ color: f.included ? '#10b981' : dark ? '#334155' : '#cbd5e1', marginTop: 3, flexShrink: 0, fontSize: 13 }}></i>
                        <span style={{ textDecoration: f.included ? 'none' : 'line-through', lineHeight: 1.45 }}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust & Guarantee Strip */}
      <section style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          background: dark ? 'rgba(15,23,42,0.6)' : '#ffffff',
          borderRadius: 18,
          padding: '30px 24px',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
          boxShadow: dark ? '0 10px 40px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          {[
            { icon: 'fa-lock', title: '256-Bit SSL Encrypted', desc: 'PCI-DSS Level 1 certified checkout.' },
            { icon: 'fa-shield-heart', title: '30-Day Money Back', desc: '100% risk-free money-back guarantee.' },
            { icon: 'fa-bolt', title: 'Instant Cloud Sync', desc: 'Activate protection in under 2 minutes.' },
            { icon: 'fa-headset', title: '24/7 Security Engineers', desc: 'Dedicated expert team on standby.' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(99,102,241,0.12)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0
              }}>
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: s.text }}>{item.title}</div>
                <div style={{ fontSize: 12.5, color: s.textSecondary, marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section style={{
        padding: '80px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: s.text, letterSpacing: '-0.6px', marginBottom: 10 }}>
            Compare Plan Capabilities
          </h2>
          <p style={{ fontSize: 15.5, color: s.textSecondary, maxWidth: 640, margin: '0 auto' }}>
            Detailed breakdown of technical features included in each subscription tier.
          </p>
        </div>

        <div className="table-wrap" style={{
          background: dark ? 'rgba(15,23,42,0.7)' : '#ffffff',
          borderRadius: 16,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{ background: dark ? 'rgba(30,41,59,0.6)' : '#f1f5f9', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                <th style={{ padding: '16px 22px', fontSize: 13.5, fontWeight: 700, color: s.text }}>Security Capability</th>
                <th style={{ padding: '16px 22px', fontSize: 13.5, fontWeight: 600, color: s.textSecondary }}>Starter Free</th>
                <th style={{ padding: '16px 22px', fontSize: 13.5, fontWeight: 600, color: s.textSecondary }}>Developer Go</th>
                <th style={{ padding: '16px 22px', fontSize: 13.5, fontWeight: 800, color: '#6366f1', background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff' }}>
                  Enterprise Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row, idx) => (
                <tr key={idx} style={{
                  borderBottom: idx < comparisonFeatures.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}` : 'none'
                }}>
                  <td style={{ padding: '16px 22px', fontSize: 13.5, fontWeight: 700, color: s.text }}>
                    {row.name}
                  </td>
                  <td style={{ padding: '16px 22px', fontSize: 13, color: s.textSecondary }}>
                    {row.free}
                  </td>
                  <td style={{ padding: '16px 22px', fontSize: 13, color: s.textSecondary }}>
                    {row.go}
                  </td>
                  <td style={{
                    padding: '16px 22px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: '#10b981',
                    background: dark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                      <span>{row.pro}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQs Section */}
      <section style={{ padding: '40px 24px 100px', maxWidth: 880, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, textAlign: 'center', marginBottom: 36, color: s.text, letterSpacing: '-0.5px' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: dark ? 'rgba(15,23,42,0.7)' : '#ffffff',
                borderRadius: 14,
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                padding: '22px 26px',
                cursor: 'pointer'
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 15.5, color: s.text }}>
                <span>{faq.q}</span>
                <i className={`fas ${openFaq === i ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: 13, color: '#6366f1' }}></i>
              </div>
              {openFaq === i && (
                <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.65, color: s.textSecondary }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Global Footer */}
      <footer style={{
        padding: '36px 40px',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        color: s.textSecondary,
        fontSize: 13,
        maxWidth: 1240,
        margin: '0 auto'
      }}>
        <span>&copy; 2026 MDefender Pro. All rights reserved. Enterprise AI Web Defense.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/" style={{ color: s.textSecondary, textDecoration: 'none' }}>Home</Link>
          <Link to="/about" style={{ color: s.textSecondary, textDecoration: 'none' }}>About</Link>
          <Link to="/blog" style={{ color: s.textSecondary, textDecoration: 'none' }}>Blog</Link>
          <Link to="/pricing" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Pricing</Link>
          <Link to="/docs" style={{ color: s.textSecondary, textDecoration: 'none' }}>Docs</Link>
          <Link to="/user/login" style={{ color: s.textSecondary, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </footer>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        plan={selectedPlan}
        billingCycle={isYearly ? 'yearly' : 'monthly'}
        onSuccess={() => {
          setCheckoutModalOpen(false)
          navigate('/user/dashboard')
        }}
      />
    </div>
  )
}
