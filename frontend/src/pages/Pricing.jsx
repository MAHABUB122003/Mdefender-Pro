import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import PaymentModal from '../components/PaymentModal'

const plans = [
  {
    id: 'free',
    name: 'WP Starter',
    badge: 'Free Forever',
    monthly: 0,
    yearly: 0,
    desc: 'Essential security for personal WordPress blogs, portfolios, and staging sites.',
    features: [
      { text: '1 Protected WordPress Site', included: true },
      { text: '10,000 WAF requests / month', included: true },
      { text: 'Core WAF Rule Signatures', included: true },
      { text: 'Login Brute Force Protection', included: true },
      { text: 'Community Support', included: true },
      { text: '2,000 Advanced WP Signatures', included: false },
      { text: '5.2M Dataset Cloud ML Core', included: false },
      { text: 'Core & Theme Malware Scanner', included: false },
      { text: '2FA Admin Security Shield', included: false },
    ],
    btnText: 'Start Free',
    highlight: false
  },
  {
    id: 'go',
    name: 'WP Business Go',
    badge: 'Growing Sites',
    monthly: 9,
    yearly: 90,
    desc: 'Advanced security for WooCommerce stores, agency clients, and multi-site networks.',
    features: [
      { text: '5 Protected WordPress Sites', included: true },
      { text: '100,000 WAF requests / month', included: true },
      { text: 'Real-Time Cloud ML Threat Engine', included: true },
      { text: 'Automated Core & Theme Malware Scan', included: true },
      { text: '2FA TOTP Login Authentication', included: true },
      { text: '20 Custom Regex Firewall Rules', included: true },
      { text: 'Real-Time Email Security Alerts', included: true },
      { text: 'Live Attack Logs & IP Banlist', included: true },
      { text: 'Dedicated Account Manager', included: false },
    ],
    btnText: 'Upgrade to Business Go',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Enterprise Pro WP',
    badge: 'Most Popular',
    monthly: 29,
    yearly: 290,
    desc: 'Maximum cybersecurity defense for high-traffic WordPress & WooCommerce enterprises.',
    features: [
      { text: 'Unlimited Protected WP Sites', included: true },
      { text: 'Unlimited Request Volume', included: true },
      { text: 'Full 2,000+ WP Threat Signatures', included: true },
      { text: '5.2M Dataset Deep ML Core', included: true },
      { text: 'Deep Malware Scanner & Quarantine', included: true },
      { text: 'Layer 7 Volumetric DDoS Shield', included: true },
      { text: 'Sub-Millisecond Edge Telemetry', included: true },
      { text: 'Automated Bot & Exploit Scanner Ban', included: true },
      { text: '24/7 Priority SLA Cybersecurity Support', included: true },
    ],
    btnText: 'Upgrade to Enterprise Pro',
    highlight: true
  }
]

const faqs = [
  {
    q: 'How does MDefender Pro protect my WordPress website?',
    a: 'MDefender Pro operates as a native WordPress plugin coupled with our central cloud intelligence. It inspects all HTTP traffic hitting wp-login.php, xmlrpc.php, contact forms, and REST APIs, blocking SQLi, XSS, RCE, and brute-force attacks in under 0.5ms.'
  },
  {
    q: 'Does MDefender Pro slow down my WordPress website?',
    a: 'Not at all. Static assets (images, CSS, JS) bypass inspection. Dynamic requests are checked with optimized in-memory rules and asynchronous cloud ML evaluation with sub-millisecond latency (<0.5ms).'
  },
  {
    q: 'How does the Core & Plugin Malware Scanner work?',
    a: 'The malware scanner inspects core WordPress files, installed plugins, and active themes. It compares checksums against official WordPress repository releases and scans for obfuscated backdoors, eval injections, and web shells.'
  },
  {
    q: 'Can I switch between Monthly and Yearly billing?',
    a: 'Yes! Upgrading to annual billing gives you up to 18% savings (equivalent to 2 months free). You can switch billing cycles at any time from your account settings.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major Credit/Debit Cards (Visa, Mastercard, American Express, Discover), Direct Bank Wire Transfers (SWIFT / IBAN / ACH), and Online Wallets (PayPal & bKash merchant).'
  }
]

export default function Pricing() {
  const navigate = useNavigate()
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  // Payment Modal State
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
      background: '#070b14',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden'
    }}>
      <PublicNavbar />

      {/* Header Section */}
      <section style={{ padding: '130px 24px 40px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: '30px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#34d399',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          <i className="fab fa-wordpress"></i> WordPress Cloud Security Pricing
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: '900',
          letterSpacing: '-0.03em',
          marginBottom: '16px',
          color: '#ffffff'
        }}>
          Complete WordPress Security &amp; Cloud ML
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          maxWidth: '680px',
          margin: '0 auto 36px',
          lineHeight: '1.6'
        }}>
          Arm your WordPress websites with our 5.2M dataset ML classifier, 2,000+ threat signatures, 2FA defense, and real-time malware scanner.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', background: '#0c1222', padding: '6px 14px', borderRadius: '30px', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: !isYearly ? '#ffffff' : '#64748b' }}>Monthly</span>
          <div
            onClick={() => setIsYearly(!isYearly)}
            style={{
              width: '46px',
              height: '24px',
              borderRadius: '12px',
              background: isYearly ? '#2563eb' : '#1e293b',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: isYearly ? '25px' : '3px',
              transition: 'left 0.2s'
            }}></div>
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: isYearly ? '#ffffff' : '#64748b' }}>Yearly</span>
          {isYearly && (
            <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '11px', fontWeight: '700' }}>
              Save up to 18%
            </span>
          )}
        </div>
      </section>

      {/* Plan Cards Grid */}
      <section style={{ padding: '30px 24px 80px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {plans.map(p => {
            const priceVal = isYearly ? p.yearly : p.monthly
            return (
              <div
                key={p.id}
                style={{
                  background: '#0c1222',
                  borderRadius: '16px',
                  border: p.highlight ? '2px solid #2563eb' : '1px solid #1e293b',
                  padding: '36px 30px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: p.highlight ? '0 10px 40px rgba(37,99,235,0.25)' : '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {p.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '28px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {p.badge}
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0 20px', minHeight: '38px', lineHeight: '1.5' }}>
                    {p.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '42px', fontWeight: '900', color: p.highlight ? '#38bdf8' : '#ffffff', letterSpacing: '-0.03em' }}>
                      ${priceVal}
                    </span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                      {p.id === 'free' ? 'forever' : isYearly ? '/ year' : '/ month'}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePlanSelect(p.id)}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '10px',
                      background: p.highlight ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#070b14',
                      border: p.highlight ? 'none' : '1px solid #1e293b',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: p.highlight ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                      transition: 'all 0.15s',
                      marginBottom: '28px'
                    }}
                  >
                    {p.btnText}
                  </button>

                  {/* Features List */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {p.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: f.included ? '#cbd5e1' : '#475569' }}>
                        <i className={`fas ${f.included ? 'fa-check' : 'fa-times'}`} style={{ color: f.included ? '#10b981' : '#334155', width: '14px' }}></i>
                        <span style={{ textDecoration: f.included ? 'none' : 'line-through' }}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQs Section */}
      <section style={{ padding: '40px 24px 100px', maxWidth: '860px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', textAlign: 'center', marginBottom: '40px', color: '#ffffff' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: '#0c1222',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                padding: '20px 24px',
                cursor: 'pointer'
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '15px', color: '#ffffff' }}>
                <span>{faq.q}</span>
                <i className={`fas ${openFaq === i ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '12px', color: '#64748b' }}></i>
              </div>
              {openFaq === i && (
                <p style={{ margin: '12px 0 0', fontSize: '13px', lineHeight: '1.6', color: '#94a3b8' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Payment Modal */}
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
