import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'

const features = [
  { icon: 'fa-shield-halved', title: 'Real-time Protection', desc: 'Monitor and block threats in real-time with zero latency on your application.', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { icon: 'fa-brain', title: 'AI-Powered Detection', desc: 'Advanced machine learning models detect zero-day attacks and novel threats.', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { icon: 'fa-plug', title: 'Easy Integration', desc: 'Integrate with a single line of code. Works with Express, Koa, Fastify and more.', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { icon: 'fa-chart-line', title: 'Dashboard & Analytics', desc: 'Beautiful dashboard with real-time analytics, attack maps, and threat reports.', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { icon: 'fa-ban', title: 'Instant Blocking', desc: 'Automatically block malicious IPs and patterns before they reach your server.', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { icon: 'fa-clock', title: '24/7 Monitoring', desc: 'Round-the-clock monitoring with instant alerts and automated incident response.', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
]

const pricingPreview = [
  { name: 'Free', price: '$0', period: 'Free forever', features: ['1 website', '10,000 requests/month', 'Basic WAF rules', 'Community support'], link: '/register', btnBg: 'rgba(255,255,255,0.06)', btnBorder: true, color: '#64748b' },
  { name: 'Go', price: '$9', period: 'Billed monthly', features: ['5 websites', '100,000 requests/month', 'All WAF rules', 'Basic ML detection', 'Email support'], link: '/register?plan=go', btnBg: 'linear-gradient(135deg, #2563eb, #3b82f6)', btnBorder: false, color: '#3b82f6' },
  { name: 'Pro', price: '$29', period: 'Billed monthly', features: ['Unlimited websites', 'Unlimited requests', 'Advanced ML engine', 'Priority 24/7 support', 'Full API access'], link: '/register?plan=pro', btnBg: 'linear-gradient(135deg, #667eea, #764ba2)', btnBorder: false, popular: true, color: '#a5b4fc' },
]

export default function Landing() {
  const { dark } = useTheme()
  const s = theme(dark)

  return (
    <div style={{ minHeight: '100vh', background: s.bg, color: s.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflowX: 'hidden', transition: 'background 0.3s, color 0.3s' }}>
      <style>{`
        .land-fcard:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3) !important; }
        .land-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.4); }
        .land-link { transition: opacity 0.2s; }
        .land-link:hover { opacity: 0.8; }
        @media (max-width: 1024px) {
          .land-hero { padding: 100px 30px 60px !important; }
          .land-hero h1 { font-size: 42px !important; }
          .land-section { padding: 60px 30px !important; }
          .land-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .land-steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .land-footer { padding: 30px !important; flex-direction: column; gap: 16px; }
        }
        @media (max-width: 768px) {
          .land-hero { padding: 80px 20px 40px !important; }
          .land-hero h1 { font-size: 32px !important; }
          .land-section { padding: 50px 20px !important; }
          .land-section h2 { font-size: 28px !important; }
          .land-features-grid { grid-template-columns: 1fr !important; }
          .land-steps-grid { grid-template-columns: 1fr !important; }
          .land-pricing-grid { grid-template-columns: 1fr !important; }
          .land-footer { padding: 24px 20px !important; }
        }
      `}</style>

      <PublicNavbar />

      {/* Hero */}
      <section className="land-hero" style={{ padding: '140px 60px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: `radial-gradient(ellipse, ${dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: s.primaryBg, border: `1px solid ${s.primaryBorder}`, borderRadius: 50, fontSize: 13, fontWeight: 600, color: s.primary, marginBottom: 32 }}>
            <i className="fas fa-bolt"></i> Trusted by 500+ websites worldwide
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
            Protect Your Website with{' '}
            <span style={{ background: 'linear-gradient(135deg, #667eea, #a78bfa, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MDefender Pro</span>
          </h1>
          <p style={{ fontSize: 20, color: s.textSecondary, maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.6 }}>
            AI-powered Web Application Firewall that shields your applications from SQL injection, XSS, DDoS, and zero-day attacks — in real-time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/register" className="land-btn land-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>
              <i className="fas fa-rocket"></i> Get Started Free
            </Link>
            <a href={`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/v1/wordpress/plugin`} className="land-btn land-link" download style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: s.text, borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: `1px solid ${s.border}`, transition: 'all 0.3s', cursor: 'pointer' }}>
              <i className="fas fa-download"></i> Download WP Plugin
            </a>
            <Link to="/docs" className="land-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: s.text, borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: `1px solid ${s.border}`, transition: 'all 0.3s', cursor: 'pointer' }}>
              <i className="fas fa-book"></i> View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="land-section" style={{ padding: '100px 60px' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, textAlign: 'center', marginBottom: 16, letterSpacing: '-0.5px' }}>Everything You Need to Stay Secure</h2>
        <p style={{ fontSize: 18, color: s.textSecondary, textAlign: 'center', marginBottom: 64, maxWidth: 500, margin: '0 auto 64px' }}>Powerful features designed to keep your web applications safe from modern threats.</p>
        <div className="land-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
          {features.map((f, i) => (
            <div key={i} className="land-fcard" style={{ padding: 36, background: s.bgCard, border: `1px solid ${s.borderLight}`, borderRadius: 16, transition: 'all 0.3s' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, background: f.bg, color: f.color }}>
                <i className={`fas ${f.icon}`}></i>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: s.textSecondary, fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download Plugin */}
      <section className="land-section" style={{ padding: '100px 60px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: s.primaryBg, border: `1px solid ${s.primaryBorder}`, borderRadius: 50, fontSize: 13, fontWeight: 600, color: s.primary, marginBottom: 24 }}>
            <i className="fas fa-wordpress"></i> WordPress Plugin
          </div>
          <h2 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.5px' }}>Download the MDefender Pro WP Plugin</h2>
          <p style={{ fontSize: 18, color: s.textSecondary, marginBottom: 40, maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Protect your WordPress site in minutes. Download the plugin, install it, connect it with your API key, and get instant WAF protection.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            <a href={`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/v1/wordpress/plugin`} className="land-btn land-link" download style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>
              <i className="fas fa-download"></i> Download Plugin (.zip)
            </a>
            <Link to="/register" className="land-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: s.text, borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: `1px solid ${s.border}`, transition: 'all 0.3s' }}>
              <i className="fas fa-key"></i> Get an API Key
            </Link>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: s.bgCard, border: `1px solid ${s.borderLight}`, borderRadius: 12, color: s.textSecondary, fontSize: 13 }}>
            <i className="fas fa-circle-check" style={{ color: '#10b981' }}></i> Free to download · Easy install · Compatible with WordPress 5.0+
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="land-section" style={{ padding: '100px 60px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, textAlign: 'center', marginBottom: 16, letterSpacing: '-0.5px' }}>How It Works</h2>
        <p style={{ fontSize: 18, color: s.textSecondary, textAlign: 'center', marginBottom: 64, maxWidth: 500, margin: '0 auto 64px' }}>Get protected in three simple steps. No complex configuration needed.</p>
        <div className="land-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { n: 1, title: 'Install', desc: 'Install the MDefender Pro package with npm.', code: 'npm i mdefender-pro', codeColor: '#a5b4fc' },
            { n: 2, title: 'Configure', desc: 'Add your API key from the dashboard.', code: 'mdefender.config.js', codeColor: '#a5b4fc' },
            { n: 3, title: 'Protected', desc: 'Your site is now secured with enterprise-grade WAF.', code: '✓ Protected', codeColor: '#10b981' },
          ].map(s => (
            <div key={s.n} style={{ textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, margin: '0 auto 24px', color: '#fff' }}>{s.n}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
              <p style={{ color: s.textSecondary, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{s.desc}</p>
              <div style={{ background: s.bgCode, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '14px 20px', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 14, color: s.codeColor || '#a5b4fc', display: 'inline-block' }}>{s.code}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="land-section" style={{ padding: '100px 60px' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, textAlign: 'center', marginBottom: 16, letterSpacing: '-0.5px' }}>Simple, Transparent Pricing</h2>
        <p style={{ fontSize: 18, color: s.textSecondary, textAlign: 'center', marginBottom: 64, maxWidth: 500, margin: '0 auto 64px' }}>Start for free. Upgrade when you need more power.</p>
        <div className="land-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {pricingPreview.map((p, i) => (
            <div key={i} style={{ padding: 32, background: p.popular ? (dark ? 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12))' : 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06))') : s.bgCard, border: p.popular ? `2px solid rgba(102,126,234,0.35)` : `1px solid ${s.borderLight}`, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
              {p.popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>}
              {p.popular && <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 50, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Popular</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: p.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>{p.price}</div>
              <div style={{ color: s.textMuted, fontSize: 13, marginBottom: 24 }}>{p.period}</div>
              <div style={{ height: 1, background: s.borderLight, marginBottom: 20 }}></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', color: s.textSecondary, fontSize: 13 }}>
                    <i className="fas fa-check" style={{ color: '#10b981', fontSize: 11 }}></i> {f}
                  </li>
                ))}
              </ul>
              <Link to={p.link} className="land-link" style={{ display: 'block', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center', background: p.btnBg, color: '#fff', border: p.btnBorder ? `1px solid ${s.border}` : 'none' }}>
                {p.name === 'Free' ? 'Get Started' : 'Start Free Trial'}
              </Link>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/pricing" style={{ color: s.textSecondary, fontSize: 14, fontWeight: 500 }}>
            View full pricing comparison <i className="fas fa-arrow-right" style={{ marginLeft: 6, fontSize: 12 }}></i>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="land-section" style={{ padding: '100px 60px', textAlign: 'center', background: dark ? 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))' : 'linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05))', borderTop: `1px solid ${s.borderLight}` }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, marginBottom: 20 }}>Get Started in 5 Minutes</h2>
        <p style={{ fontSize: 18, color: s.textSecondary, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>Join hundreds of websites already protected by MDefender Pro.</p>
        <Link to="/register" className="land-btn land-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 48px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>
          <i className="fas fa-shield-halved"></i> Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="land-footer" style={{ padding: '40px 60px', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: s.textMuted, fontSize: 13 }}>
        <span>&copy; 2026 MDefender Pro. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/docs" className="land-link" style={{ color: s.textMuted, textDecoration: 'none' }}>Documentation</Link>
          <Link to="/pricing" className="land-link" style={{ color: s.textMuted, textDecoration: 'none' }}>Pricing</Link>
          <Link to="/user/login" className="land-link" style={{ color: s.textMuted, textDecoration: 'none' }}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
