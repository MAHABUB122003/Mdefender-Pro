import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import PublicNavbar from '../components/PublicNavbar'

const plans = [
  {
    name: 'Free', desc: 'Perfect for personal projects and testing',
    monthly: 0, yearly: 0, icon: 'fa-rocket',
    features: [
      { text: '1 website', included: true }, { text: '10,000 requests / month', included: true },
      { text: 'Basic WAF rules', included: true }, { text: 'Community support', included: true },
      { text: 'Email notifications', included: true }, { text: 'Advanced ML detection', included: false },
      { text: 'Custom rules', included: false }, { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    btnText: 'Get Started Free', btnLink: '/register', highlight: false,
  },
  {
    name: 'Go', desc: 'Best for growing websites and small businesses',
    monthly: 9, yearly: 90, icon: 'fa-bolt',
    features: [
      { text: '5 websites', included: true }, { text: '100,000 requests / month', included: true },
      { text: 'All WAF rules', included: true }, { text: 'Email support', included: true },
      { text: 'Email notifications', included: true }, { text: 'Basic ML detection', included: true },
      { text: 'Custom rules (10)', included: true }, { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    btnText: 'Start Free Trial', btnLink: '/register?plan=go', highlight: false,
  },
  {
    name: 'Pro', desc: 'For businesses that need maximum protection',
    monthly: 29, yearly: 290, icon: 'fa-crown',
    features: [
      { text: 'Unlimited websites', included: true }, { text: 'Unlimited requests', included: true },
      { text: 'All WAF rules + ML engine', included: true }, { text: 'Priority support 24/7', included: true },
      { text: 'Real-time email alerts', included: true }, { text: 'Advanced ML detection', included: true },
      { text: 'Unlimited custom rules', included: true }, { text: 'Full API access', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    btnText: 'Start Free Trial', btnLink: '/register?plan=pro', highlight: true,
  },
]

const faqs = [
  { q: 'Is the Free plan truly free?', a: 'Yes. The Free plan is completely free forever — no credit card required. You get 1 website, 10,000 requests per month, basic WAF rules, and community support.' },
  { q: 'What happens after my free trial?', a: "After your 14-day free trial ends, you can choose to subscribe to the Go or Pro plan. If you don't subscribe, your account automatically falls back to the Free plan with no data loss." },
  { q: 'Can I switch plans at any time?', a: 'Absolutely. You can upgrade, downgrade, or cancel at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing cycle.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual enterprise plans.' },
  { q: 'What happens if I exceed my request limit?', a: "You'll receive a warning at 80% usage. At 100%, protection stays active but new requests may be throttled. Upgrade to remove all limits instantly." },
  { q: 'Is there a discount for non-profits?', a: 'Yes! We offer 50% off all paid plans for registered non-profit organizations. Contact our support team with your non-profit documentation.' },
]

export default function Pricing() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: s.bg, color: s.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflowX: 'hidden', transition: 'background 0.3s, color 0.3s' }}>
      <style>{`
        .price-card { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
        .price-card:hover { transform: translateY(-6px); }
        .price-btn { transition: all 0.25s; }
        .price-btn:hover { transform: translateY(-1px); }
        .price-faq:hover { background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; }
        @media (max-width: 1024px) {
          .price-cards-grid { padding: 0 30px !important; }
        }
        @media (max-width: 768px) {
          .price-cards-grid { grid-template-columns: 1fr !important; gap: 20px !important; padding: 0 16px !important; }
          .price-header h1 { font-size: 28px !important; }
        }
      `}</style>

      <PublicNavbar />

      {/* Header */}
      <section style={{ padding: '120px 60px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 50, fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 24 }}>
          <i className="fas fa-check-circle"></i> No credit card required
        </div>
        <h1 className="price-header" style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, letterSpacing: '-1px', lineHeight: 1.1 }}>Choose Your Protection</h1>
        <p style={{ fontSize: 18, color: s.textSecondary, maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Start free, scale as you grow. Every plan includes our core WAF engine and real-time threat detection.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <span style={{ fontSize: 14, color: !isYearly ? s.text : s.textMuted, fontWeight: !isYearly ? 600 : 400, transition: 'color 0.2s' }}>Monthly</span>
          <div onClick={() => setIsYearly(!isYearly)} style={{
            position: 'relative', width: 52, height: 28, borderRadius: 14,
            background: isYearly ? 'linear-gradient(135deg, #667eea, #764ba2)' : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
            border: `1px solid ${s.border}`, cursor: 'pointer', transition: 'all 0.3s',
          }}>
            <div style={{ position: 'absolute', top: 3, left: isYearly ? 27 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
          </div>
          <span style={{ fontSize: 14, color: isYearly ? s.text : s.textMuted, fontWeight: isYearly ? 600 : 400, transition: 'color 0.2s' }}>Yearly</span>
          {isYearly && <span style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 50, fontSize: 11, fontWeight: 700 }}>Save up to 18%</span>}
        </div>
      </section>

      {/* Cards */}
      <section className="price-cards-grid" style={{ padding: '40px 60px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
          {plans.map((plan, i) => {
            const price = isYearly ? plan.yearly : plan.monthly
            const perMonth = isYearly ? Math.round(plan.yearly / 12) : plan.monthly
            const isPro = plan.highlight
            const cardBg = isPro ? (dark ? 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))' : 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06))') : s.bgCard
            const cardBorder = isPro ? '2px solid rgba(102,126,234,0.4)' : `1px solid ${s.borderLight}`
            const iconColor = isPro ? '#667eea' : plan.name === 'Go' ? '#3b82f6' : '#10b981'
            const iconBg = isPro ? 'rgba(102,126,234,0.15)' : plan.name === 'Go' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)'

            return (
              <div key={i} className="price-card" style={{ padding: 36, borderRadius: 20, background: cardBg, border: cardBorder, position: 'relative', overflow: 'hidden' }}>
                {isPro && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #667eea, #764ba2, #667eea)', backgroundSize: '200% 100%' }}></div>}
                {isPro && <div style={{ position: 'absolute', top: 16, right: 16, padding: '4px 12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 50, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Most Popular</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: iconBg, color: iconColor }}>
                    <i className={`fas ${plan.icon}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: s.textMuted }}>{plan.desc}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>${perMonth}</span>
                  <span style={{ fontSize: 15, color: s.textMuted, marginLeft: 4 }}>/month</span>
                </div>
                {plan.monthly > 0 ? (
                  <div style={{ fontSize: 13, color: s.textMuted, marginBottom: 28 }}>
                    {isYearly ? <>Billed ${price} annually <span style={{ color: '#10b981', fontWeight: 600 }}>(save ${Math.round((plan.monthly * 12) - plan.yearly)})</span></> : <>Billed monthly, cancel anytime</>}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: s.textMuted, marginBottom: 28 }}>Free forever</div>
                )}

                <div style={{ height: 1, background: s.borderLight, marginBottom: 24 }}></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13.5, color: f.included ? s.textSecondary : (dark ? '#475569' : '#cbd5e1'), textDecoration: f.included ? 'none' : 'line-through' }}>
                      {f.included ? <i className="fas fa-check" style={{ color: '#10b981', fontSize: 11, width: 16, textAlign: 'center' }}></i> : <i className="fas fa-xmark" style={{ color: dark ? '#475569' : '#cbd5e1', fontSize: 11, width: 16, textAlign: 'center' }}></i>}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Link to={plan.btnLink} className="price-btn" style={{
                  display: 'block', width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center', cursor: 'pointer', border: 'none',
                  background: isPro ? 'linear-gradient(135deg, #667eea, #764ba2)' : plan.name === 'Go' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  color: '#fff',
                  ...(!isPro ? { border: `1px solid ${s.border}` } : {}),
                }}>
                  {plan.btnText} <i className="fas fa-arrow-right" style={{ marginLeft: 6, fontSize: 12 }}></i>
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust */}
      <section style={{ padding: '0 60px 80px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap', color: s.textMuted, fontSize: 13 }}>
          {[['fa-lock', '#10b981', 'SSL Encrypted'], ['fa-shield-halved', '#3b82f6', 'SOC 2 Compliant'], ['fa-clock-rotate-left', '#667eea', '99.99% Uptime'], ['fa-headset', '#a78bfa', '24/7 Support']].map(([icon, color, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className={`fas ${icon}`} style={{ color }}></i> {text}</div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 60px', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Frequently Asked Questions</h2>
        <p style={{ fontSize: 15, color: s.textMuted, textAlign: 'center', marginBottom: 48 }}>Everything you need to know about billing and plans.</p>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
            <button className="price-faq" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 8px',
              cursor: 'pointer', background: 'none', border: 'none', color: s.text, width: '100%',
              textAlign: 'left', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', borderRadius: 8,
            }}>
              <span>{faq.q}</span>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 16, transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }}>
                <i className="fas fa-chevron-down" style={{ fontSize: 11, color: s.textMuted }}></i>
              </div>
            </button>
            <div style={{ maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease, padding 0.35s ease', padding: openFaq === i ? '0 8px 20px' : '0 8px' }}>
              <p style={{ color: s.textSecondary, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 60px', textAlign: 'center', background: dark ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))' : 'linear-gradient(135deg, rgba(102,126,234,0.04), rgba(118,75,162,0.04))', borderTop: `1px solid ${s.borderLight}` }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Ready to Protect Your Website?</h2>
        <p style={{ fontSize: 16, color: s.textSecondary, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>Join hundreds of websites already protected by MDefender Pro.</p>
        <Link to="/register" className="price-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 30px rgba(102,126,234,0.3)' }}>
          <i className="fas fa-shield-halved"></i> Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 60px', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: s.textMuted, fontSize: 13 }}>
        <span>&copy; 2026 MDefender Pro. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/docs" style={{ color: s.textMuted, textDecoration: 'none' }}>Docs</Link>
          <Link to="/" style={{ color: s.textMuted, textDecoration: 'none' }}>Home</Link>
          <Link to="/user/login" style={{ color: s.textMuted, textDecoration: 'none' }}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
