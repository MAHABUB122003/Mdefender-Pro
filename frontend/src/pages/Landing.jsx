import { Link } from 'react-router-dom'

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflowX: 'hidden',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 60px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky',
    top: 0,
    background: 'rgba(15,23,42,0.9)',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#fff',
  },
  navLogoIcon: {
    width: '42px',
    height: '42px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  hero: {
    padding: '120px 60px 100px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: '-40%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '800px',
    height: '800px',
    background: 'radial-gradient(ellipse, rgba(102,126,234,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    background: 'rgba(102,126,234,0.15)',
    border: '1px solid rgba(102,126,234,0.3)',
    borderRadius: '50px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#a5b4fc',
    marginBottom: '32px',
  },
  heroTitle: {
    fontSize: '64px',
    fontWeight: '800',
    lineHeight: '1.1',
    letterSpacing: '-1.5px',
    marginBottom: '24px',
    maxWidth: '800px',
    margin: '0 auto 24px',
  },
  heroGradient: {
    background: 'linear-gradient(135deg, #667eea, #a78bfa, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#94a3b8',
    maxWidth: '600px',
    margin: '0 auto 48px',
    lineHeight: '1.6',
  },
  heroButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 36px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'all 0.3s',
    border: 'none',
    cursor: 'pointer',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 36px',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  features: {
    padding: '100px 60px',
  },
  sectionTitle: {
    fontSize: '42px',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: '16px',
    letterSpacing: '-0.5px',
  },
  sectionSubtitle: {
    fontSize: '18px',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: '64px',
    maxWidth: '500px',
    margin: '0 auto 64px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featureCard: {
    padding: '36px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    transition: 'all 0.3s',
  },
  featureIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '20px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  featureDesc: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.7',
  },
  howItWorks: {
    padding: '100px 60px',
    background: 'rgba(255,255,255,0.02)',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  stepCard: {
    textAlign: 'center',
    padding: '40px 32px',
    position: 'relative',
  },
  stepNumber: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 auto 24px',
  },
  stepTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  stepDesc: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.7',
    marginBottom: '16px',
  },
  codeBlock: {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '14px 20px',
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: '14px',
    color: '#a5b4fc',
    display: 'inline-block',
  },
  pricing: {
    padding: '100px 60px',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '32px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  pricingCard: {
    padding: '40px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  pricingCardFree: {
    background: 'rgba(255,255,255,0.03)',
  },
  pricingCardPremium: {
    background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12))',
    border: '1px solid rgba(102,126,234,0.3)',
  },
  pricingBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '50px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  pricingName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  pricingPrice: {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '4px',
  },
  pricingPeriod: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '32px',
  },
  pricingFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 36px',
  },
  pricingFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    color: '#cbd5e1',
    fontSize: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  pricingBtn: {
    display: 'block',
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.3s',
    cursor: 'pointer',
    border: 'none',
  },
  cta: {
    padding: '100px 60px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))',
  },
  ctaTitle: {
    fontSize: '42px',
    fontWeight: '800',
    marginBottom: '20px',
  },
  ctaSubtitle: {
    fontSize: '18px',
    color: '#94a3b8',
    marginBottom: '40px',
    maxWidth: '500px',
    margin: '0 auto 40px',
  },
  footer: {
    padding: '40px 60px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#64748b',
    fontSize: '13px',
  },
  footerLinks: {
    display: 'flex',
    gap: '24px',
  },
  footerLink: {
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
}

const features = [
  { icon: 'fa-shield-halved', title: 'Real-time Protection', desc: 'Monitor and block threats in real-time with zero latency on your application.', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { icon: 'fa-brain', title: 'AI-Powered Detection', desc: 'Advanced machine learning models detect zero-day attacks and novel threats.', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { icon: 'fa-plug', title: 'Easy Integration', desc: 'Integrate with a single line of code. Works with Express, Koa, Fastify and more.', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { icon: 'fa-chart-line', title: 'Dashboard & Analytics', desc: 'Beautiful dashboard with real-time analytics, attack maps, and threat reports.', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { icon: 'fa-ban', title: 'Instant Blocking', desc: 'Automatically block malicious IPs and patterns before they reach your server.', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { icon: 'fa-clock', title: '24/7 Monitoring', desc: 'Round-the-clock monitoring with instant alerts and automated incident response.', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
]

export default function Landing() {
  return (
    <div style={styles.page}>
      <style>{`
        a:hover { opacity: 0.85; }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(102,126,234,0.3); background: rgba(255,255,255,0.05); }
        .pricing-card-free:hover { border-color: rgba(255,255,255,0.12); }
        .pricing-card-premium:hover { border-color: rgba(102,126,234,0.5); }
        .btn-primary-landing:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(102,126,234,0.4); }
        .btn-secondary-landing:hover { background: rgba(255,255,255,0.08); }
        .btn-outline-landing:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        @media (max-width: 1024px) {
          .landing-nav { padding: 16px 30px !important; }
          .landing-hero { padding: 80px 30px 60px !important; }
          .landing-hero h1 { font-size: 42px !important; }
          .landing-section { padding: 60px 30px !important; }
          .landing-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-cta-section { padding: 60px 30px !important; }
          .landing-footer { padding: 30px !important; flex-direction: column; gap: 16px; }
        }
        @media (max-width: 768px) {
          .landing-nav { padding: 14px 20px !important; }
          .landing-nav-links { gap: 16px !important; }
          .landing-hero { padding: 60px 20px 40px !important; }
          .landing-hero h1 { font-size: 32px !important; }
          .landing-hero p { font-size: 16px !important; }
          .landing-section { padding: 50px 20px !important; }
          .landing-section h2 { font-size: 28px !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-steps-grid { grid-template-columns: 1fr !important; }
          .landing-pricing-grid { grid-template-columns: 1fr !important; }
          .landing-cta-section { padding: 50px 20px !important; }
          .landing-cta-section h2 { font-size: 28px !important; }
          .landing-footer { padding: 24px 20px !important; flex-direction: column; gap: 16px; text-align: center; }
        }
        @media (max-width: 480px) {
          .landing-nav-links a:not(:last-child) { display: none; }
          .landing-hero h1 { font-size: 26px !important; }
        }
      `}</style>

      {/* Navigation */}
      <nav style={styles.nav} className="landing-nav">
        <Link to="/" style={styles.navLogo}>
          <div style={styles.navLogoIcon}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>MDefender Pro</span>
        </Link>
        <div style={styles.navLinks} className="landing-nav-links">
          <Link to="/pricing" style={styles.navLink}>Pricing</Link>
          <Link to="/docs" style={styles.navLink}>Documentation</Link>
          <Link to="/user/login" style={styles.navLink}>Login</Link>
          <Link to="/register" style={{ ...styles.btnPrimary, padding: '10px 24px', fontSize: '14px' }} className="btn-primary-landing">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={styles.hero} className="landing-hero">
        <div style={styles.heroGlow}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={styles.heroBadge}>
            <i className="fas fa-bolt"></i>
            Trusted by 500+ websites worldwide
          </div>
          <h1 style={styles.heroTitle}>
            Protect Your Website with{' '}
            <span style={styles.heroGradient}>MDefender Pro</span>
          </h1>
          <p style={styles.heroSubtitle}>
            AI-powered Web Application Firewall that shields your applications from SQL injection, XSS, DDoS, and zero-day attacks — in real-time.
          </p>
          <div style={styles.heroButtons}>
            <Link to="/register" style={styles.btnPrimary} className="btn-primary-landing">
              <i className="fas fa-rocket"></i> Get Started Free
            </Link>
            <Link to="/docs" style={styles.btnSecondary} className="btn-secondary-landing">
              <i className="fas fa-book"></i> View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features} className="landing-section">
        <h2 style={styles.sectionTitle}>Everything You Need to Stay Secure</h2>
        <p style={styles.sectionSubtitle}>Powerful features designed to keep your web applications safe from modern threats.</p>
        <div style={styles.featuresGrid} className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} style={styles.featureCard} className="feature-card">
              <div style={{ ...styles.featureIcon, background: f.bg, color: f.color }}>
                <i className={`fas ${f.icon}`}></i>
              </div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={styles.howItWorks} className="landing-section">
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <p style={styles.sectionSubtitle}>Get protected in three simple steps. No complex configuration needed.</p>
        <div style={styles.stepsGrid} className="landing-steps-grid">
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <h3 style={styles.stepTitle}>Install</h3>
            <p style={styles.stepDesc}>Install the MDefender package with npm.</p>
            <div style={styles.codeBlock}>npm i mdefender</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <h3 style={styles.stepTitle}>Configure</h3>
            <p style={styles.stepDesc}>Add your API key from the dashboard.</p>
            <div style={styles.codeBlock}>mdefender.config.js</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <h3 style={styles.stepTitle}>Protected</h3>
            <p style={styles.stepDesc}>Your site is now secured with enterprise-grade WAF.</p>
            <div style={{ ...styles.codeBlock, color: '#10b981' }}>
              <i className="fas fa-check-circle"></i> Protected
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={styles.pricing} className="landing-section">
        <h2 style={styles.sectionTitle}>Simple, Transparent Pricing</h2>
        <p style={styles.sectionSubtitle}>Start for free. Upgrade when you need more power.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1000px', margin: '0 auto' }} className="landing-pricing-grid">
          {/* Free */}
          <div style={{ padding: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }} className="pricing-card-free">
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Free</div>
            <div style={{ fontSize: '40px', fontWeight: '800', marginBottom: '4px' }}>$0</div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Free forever</div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }}></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {['1 website', '10,000 requests/month', 'Basic WAF rules', 'Community support'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', color: '#cbd5e1', fontSize: '13px' }}>
                  <i className="fas fa-check" style={{ color: '#10b981', fontSize: '11px' }}></i> {f}
                </li>
              ))}
            </ul>
            <Link to="/register" style={{ display: 'block', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', textAlign: 'center', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} className="btn-outline-landing">
              Get Started
            </Link>
          </div>
          {/* Go */}
          <div style={{ padding: '32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '16px' }} className="pricing-card-free">
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Go</div>
            <div style={{ fontSize: '40px', fontWeight: '800', marginBottom: '4px' }}>$9<span style={{ fontSize: '16px', color: '#64748b', fontWeight: '400' }}>/mo</span></div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Billed monthly</div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }}></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {['5 websites', '100,000 requests/month', 'All WAF rules', 'Basic ML detection', 'Email support'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', color: '#cbd5e1', fontSize: '13px' }}>
                  <i className="fas fa-check" style={{ color: '#10b981', fontSize: '11px' }}></i> {f}
                </li>
              ))}
            </ul>
            <Link to="/register?plan=go" style={{ display: 'block', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', border: 'none' }} className="btn-primary-landing">
              Start Free Trial
            </Link>
          </div>
          {/* Pro */}
          <div style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12))', border: '2px solid rgba(102,126,234,0.35)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }} className="pricing-card-premium">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>
            <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 10px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '50px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Popular</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pro</div>
            <div style={{ fontSize: '40px', fontWeight: '800', marginBottom: '4px' }}>$29<span style={{ fontSize: '16px', color: '#64748b', fontWeight: '400' }}>/mo</span></div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Billed monthly</div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }}></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {['Unlimited websites', 'Unlimited requests', 'Advanced ML engine', 'Priority 24/7 support', 'Full API access'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', color: '#cbd5e1', fontSize: '13px' }}>
                  <i className="fas fa-check" style={{ color: '#10b981', fontSize: '11px' }}></i> {f}
                </li>
              ))}
            </ul>
            <Link to="/register?plan=pro" style={{ display: 'block', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none' }} className="btn-primary-landing">
              Start Free Trial
            </Link>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link to="/pricing" style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
            View full pricing comparison <i className="fas fa-arrow-right" style={{ marginLeft: '6px', fontSize: '12px' }}></i>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta} className="landing-cta-section">
        <h2 style={styles.ctaTitle}>Get Started in 5 Minutes</h2>
        <p style={styles.ctaSubtitle}>Join hundreds of websites already protected by MDefender Pro.</p>
        <Link to="/register" style={{ ...styles.btnPrimary, padding: '18px 48px', fontSize: '18px' }} className="btn-primary-landing">
          <i className="fas fa-shield-halved"></i> Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer style={styles.footer} className="landing-footer">
        <span>&copy; 2026 MDefender Pro. All rights reserved.</span>
        <div style={styles.footerLinks}>
          <Link to="/docs" style={styles.footerLink}>Documentation</Link>
          <Link to="/pricing" style={styles.footerLink}>Pricing</Link>
          <Link to="/user/login" style={styles.footerLink}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
