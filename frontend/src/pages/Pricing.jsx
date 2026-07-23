import { Link } from 'react-router-dom'
import { useState } from 'react'

const plans = [
  {
    name: 'Free',
    desc: 'Perfect for personal projects and testing',
    monthly: 0,
    yearly: 0,
    features: [
      { text: '1 website', included: true },
      { text: '10,000 requests / month', included: true },
      { text: 'Basic WAF rules', included: true },
      { text: 'Community support', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Advanced ML detection', included: false },
      { text: 'Custom rules', included: false },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    btnText: 'Get Started Free',
    btnLink: '/register',
    highlight: false,
    icon: 'fa-rocket',
  },
  {
    name: 'Go',
    desc: 'Best for growing websites and small businesses',
    monthly: 9,
    yearly: 90,
    features: [
      { text: '5 websites', included: true },
      { text: '100,000 requests / month', included: true },
      { text: 'All WAF rules', included: true },
      { text: 'Email support', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Basic ML detection', included: true },
      { text: 'Custom rules (10)', included: true },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    btnText: 'Start Free Trial',
    btnLink: '/register?plan=go',
    highlight: false,
    icon: 'fa-bolt',
  },
  {
    name: 'Pro',
    desc: 'For businesses that need maximum protection',
    monthly: 29,
    yearly: 290,
    features: [
      { text: 'Unlimited websites', included: true },
      { text: 'Unlimited requests', included: true },
      { text: 'All WAF rules + ML engine', included: true },
      { text: 'Priority support 24/7', included: true },
      { text: 'Real-time email alerts', included: true },
      { text: 'Advanced ML detection', included: true },
      { text: 'Unlimited custom rules', included: true },
      { text: 'Full API access', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    btnText: 'Start Free Trial',
    btnLink: '/register?plan=pro',
    highlight: true,
    icon: 'fa-crown',
  },
]

const faqs = [
  { q: 'Is the Free plan truly free?', a: 'Yes. The Free plan is completely free forever — no credit card required. You get 1 website, 10,000 requests per month, basic WAF rules, and community support.' },
  { q: 'What happens after my free trial?', a: 'After your 14-day free trial ends, you can choose to subscribe to the Go or Pro plan. If you don\'t subscribe, your account automatically falls back to the Free plan with no data loss.' },
  { q: 'Can I switch plans at any time?', a: 'Absolutely. You can upgrade, downgrade, or cancel at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing cycle.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual enterprise plans.' },
  { q: 'What happens if I exceed my request limit?', a: 'You\'ll receive a warning at 80% usage. At 100%, protection stays active but new requests may be throttled. Upgrade to remove all limits instantly.' },
  { q: 'Is there a discount for non-profits?', a: 'Yes! We offer 50% off all paid plans for registered non-profit organizations. Contact our support team with your non-profit documentation.' },
]

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  const toggleStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '48px',
  }
  const switchStyle = {
    position: 'relative',
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    background: isYearly ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
  }
  const knobStyle = {
    position: 'absolute',
    top: '3px',
    left: isYearly ? '27px' : '3px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden',
    }}>
      <style>{`
        a:hover { opacity: 0.85; }
        .pricing-nav { padding: 20px 60px; }
        .pricing-nav-links { display: flex; align-items: center; gap: 32px; }
        .pricing-nav-links a { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .pricing-nav-links a:hover { color: #fff; }
        .p-card { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
        .p-card:hover { transform: translateY(-6px); }
        .p-card-free:hover { border-color: rgba(255,255,255,0.15); }
        .p-card-go:hover { border-color: rgba(59,130,246,0.5); box-shadow: 0 20px 60px rgba(59,130,246,0.15); }
        .p-card-pro:hover { border-color: rgba(102,126,234,0.6); box-shadow: 0 20px 60px rgba(102,126,234,0.2); }
        .p-btn-free { transition: all 0.25s; }
        .p-btn-free:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.2) !important; }
        .p-btn-go { transition: all 0.25s; }
        .p-btn-go:hover { box-shadow: 0 8px 30px rgba(59,130,246,0.35); transform: translateY(-1px); }
        .p-btn-pro { transition: all 0.25s; }
        .p-btn-pro:hover { box-shadow: 0 8px 30px rgba(102,126,234,0.45); transform: translateY(-1px); }
        .p-faq-q { transition: background 0.2s; }
        .p-faq-q:hover { background: rgba(255,255,255,0.03); }
        @media (max-width: 1024px) {
          .pricing-nav { padding: 16px 30px !important; }
          .pricing-header { padding: 60px 30px 20px !important; }
          .pricing-cards { padding: 0 30px 60px !important; }
          .pricing-faq { padding: 50px 30px !important; }
          .pricing-footer { padding: 30px !important; flex-direction: column; gap: 16px; }
        }
        @media (max-width: 768px) {
          .pricing-nav { padding: 14px 20px !important; }
          .pricing-nav-links { gap: 16px !important; }
          .pricing-nav-links a { font-size: 13px !important; }
          .pricing-header { padding: 50px 20px 10px !important; }
          .pricing-header h1 { font-size: 28px !important; }
          .pricing-cards { padding: 0 16px 40px !important; }
          .pricing-cards-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .pricing-faq { padding: 40px 20px !important; }
          .pricing-faq h2 { font-size: 24px !important; }
          .pricing-footer { padding: 24px 20px !important; flex-direction: column; gap: 16px; text-align: center; }
        }
        @media (max-width: 480px) {
          .pricing-nav-links a:not(:last-child) { display: none; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', zIndex: 100 }} className="pricing-nav">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#fff' }}>
          <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>MDefender Pro</span>
        </Link>
        <div className="pricing-nav-links">
          <Link to="/">Home</Link>
          <Link to="/docs">Docs</Link>
          <Link to="/user/login">Login</Link>
          <Link to="/register" style={{ color: '#fff', padding: '8px 20px', background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>
            <i className="fas fa-user-plus" style={{ marginRight: '6px' }}></i> Sign Up
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '80px 60px 20px', textAlign: 'center' }} className="pricing-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '50px', fontSize: '12px', fontWeight: '600', color: '#10b981', marginBottom: '24px' }}>
          <i className="fas fa-check-circle"></i> No credit card required
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-1px', lineHeight: '1.1' }}>
          Choose Your Protection
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '540px', margin: '0 auto 36px', lineHeight: '1.6' }}>
          Start free, scale as you grow. Every plan includes our core WAF engine and real-time threat detection.
        </p>

        {/* Toggle */}
        <div style={toggleStyle}>
          <span style={{ fontSize: '14px', color: !isYearly ? '#fff' : '#64748b', fontWeight: !isYearly ? '600' : '400', transition: 'color 0.2s' }}>Monthly</span>
          <div style={switchStyle} onClick={() => setIsYearly(!isYearly)}>
            <div style={knobStyle}></div>
          </div>
          <span style={{ fontSize: '14px', color: isYearly ? '#fff' : '#64748b', fontWeight: isYearly ? '600' : '400', transition: 'color 0.2s' }}>Yearly</span>
          {isYearly && (
            <span style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '50px', fontSize: '11px', fontWeight: '700' }}>
              Save up to 18%
            </span>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '40px 60px 100px', maxWidth: '1100px', margin: '0 auto' }} className="pricing-cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'start' }} className="pricing-cards-grid">
          {plans.map((plan, i) => {
            const price = isYearly ? plan.yearly : plan.monthly
            const perMonth = isYearly ? Math.round(plan.yearly / 12) : plan.monthly
            const isPro = plan.highlight
            const cardBg = isPro
              ? 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))'
              : plan.name === 'Go'
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.02)'
            const cardBorder = isPro
              ? '2px solid rgba(102,126,234,0.4)'
              : '1px solid rgba(255,255,255,0.06)'
            const cardClass = isPro ? 'p-card-pro' : plan.name === 'Go' ? 'p-card-go' : 'p-card-free'
            const iconColor = isPro ? '#667eea' : plan.name === 'Go' ? '#3b82f6' : '#10b981'
            const iconBg = isPro ? 'rgba(102,126,234,0.15)' : plan.name === 'Go' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)'

            return (
              <div key={i} style={{ padding: '36px', borderRadius: '20px', background: cardBg, border: cardBorder, position: 'relative', overflow: 'hidden' }} className={`p-card ${cardClass}`}>
                {isPro && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #667eea)', backgroundSize: '200% 100%' }}></div>
                )}

                {isPro && (
                  <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '50px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Most Popular
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: iconBg, color: iconColor }}>
                    <i className={`fas ${plan.icon}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{plan.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{plan.desc}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '44px', fontWeight: '800', letterSpacing: '-1px' }}>${perMonth}</span>
                  <span style={{ fontSize: '15px', color: '#64748b', marginLeft: '4px' }}>/month</span>
                </div>
                {plan.monthly > 0 && (
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
                    {isYearly ? (
                      <>Billed ${price} annually <span style={{ color: '#10b981', fontWeight: '600' }}>(save ${Math.round((plan.monthly * 12) - plan.yearly)})</span></>
                    ) : (
                      <>Billed monthly, cancel anytime</>
                    )}
                  </div>
                )}
                {plan.monthly === 0 && (
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>Free forever</div>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px' }}></div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', fontSize: '13.5px', color: f.included ? '#cbd5e1' : '#475569', textDecoration: f.included ? 'none' : 'line-through' }}>
                      {f.included ? (
                        <i className="fas fa-check" style={{ color: '#10b981', fontSize: '11px', width: '16px', textAlign: 'center' }}></i>
                      ) : (
                        <i className="fas fa-xmark" style={{ color: '#475569', fontSize: '11px', width: '16px', textAlign: 'center' }}></i>
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Link to={plan.btnLink} style={{
                  display: 'block', width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', textAlign: 'center', cursor: 'pointer', border: 'none',
                  background: isPro ? 'linear-gradient(135deg, #667eea, #764ba2)' : plan.name === 'Go' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  ...(isPro ? {} : { border: '1px solid rgba(255,255,255,0.1)' }),
                }} className={isPro ? 'p-btn-pro' : plan.name === 'Go' ? 'p-btn-go' : 'p-btn-free'}>
                  {plan.btnText} <i className="fas fa-arrow-right" style={{ marginLeft: '6px', fontSize: '12px' }}></i>
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust Bar */}
      <section style={{ padding: '0 60px 80px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap', color: '#475569', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-lock" style={{ color: '#10b981' }}></i> SSL Encrypted
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-shield-halved" style={{ color: '#3b82f6' }}></i> SOC 2 Compliant
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-clock-rotate-left" style={{ color: '#667eea' }}></i> 99.99% Uptime
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-headset" style={{ color: '#a78bfa' }}></i> 24/7 Support
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 60px', maxWidth: '800px', margin: '0 auto' }} className="pricing-faq">
        <h2 style={{ fontSize: '36px', fontWeight: '800', textAlign: 'center', marginBottom: '12px' }}>Frequently Asked Questions</h2>
        <p style={{ fontSize: '15px', color: '#64748b', textAlign: 'center', marginBottom: '48px' }}>Everything you need to know about billing and plans.</p>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              className="p-faq-q"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 8px', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', width: '100%', textAlign: 'left', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', borderRadius: '8px',
              }}
            >
              <span>{faq.q}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '16px', transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }}>
                <i className="fas fa-chevron-down" style={{ fontSize: '11px', color: '#64748b' }}></i>
              </div>
            </button>
            <div style={{
              maxHeight: openFaq === i ? '200px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.35s ease, padding 0.35s ease',
              padding: openFaq === i ? '0 8px 20px' : '0 8px',
            }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>{faq.a}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '80px 60px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>Ready to Protect Your Website?</h2>
        <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>Join hundreds of websites already protected by MDefender Pro.</p>
        <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 40px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: '12px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 8px 30px rgba(102,126,234,0.3)' }} className="p-btn-pro">
          <i className="fas fa-shield-halved"></i> Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 60px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569', fontSize: '13px' }} className="pricing-footer">
        <span>&copy; 2026 MDefender Pro. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link to="/docs" style={{ color: '#64748b', textDecoration: 'none' }}>Docs</Link>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <Link to="/user/login" style={{ color: '#64748b', textDecoration: 'none' }}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
