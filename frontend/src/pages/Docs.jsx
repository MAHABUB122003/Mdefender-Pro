import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

function MethodBadge({ method }) {
  const colors = { POST: '#16a34a', GET: '#2563eb', PUT: '#d97706', DELETE: '#dc2626' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff',
      backgroundColor: colors[method] || '#6b7280', marginRight: '8px', minWidth: '52px', textAlign: 'center',
    }}>{method}</span>
  );
}

function CodeBlock({ children, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div style={{ 
      borderRadius: '8px', 
      overflow: 'hidden', 
      margin: '16px 0',
      backgroundColor: '#1e293b',
      border: '1px solid #334155'
    }}>
      {label && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '8px 16px', 
          background: '#0f172a',
          borderBottom: '1px solid #334155',
          fontSize: '12px', 
          color: '#94a3b8',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span style={{ color: '#64748b' }}>{label}</span>
          <button 
            onClick={handleCopy} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: copied ? '#4ade80' : '#64748b', 
              cursor: 'pointer', 
              fontSize: '12px', 
              fontFamily: "'JetBrains Mono', monospace", 
              padding: '4px 8px', 
              borderRadius: '4px', 
              transition: 'color 0.2s',
              backgroundColor: copied ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre style={{ 
        background: '#1e293b',
        color: '#e2e8f0', 
        padding: '20px 24px', 
        margin: 0, 
        fontSize: '14px', 
        lineHeight: 1.8, 
        fontFamily: "'Fira Code', 'JetBrains Mono', 'SF Mono', monospace",
        overflowX: 'auto', 
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-all',
      }}>
        <code style={{ 
          backgroundColor: 'transparent',
          color: '#e2e8f0',
          fontFamily: "'Fira Code', 'JetBrains Mono', 'SF Mono', monospace",
        }}>{children}</code>
      </pre>
    </div>
  );
}

const faqData = [
  { q: 'What is MDefender Pro and how does it work?', a: 'MDefender Pro is an AI-powered Web Application Firewall (WAF) that sits between your application and the internet. It inspects incoming traffic in real-time, detects malicious payloads using machine learning models and pattern analysis, and blocks threats before they reach your server. It supports all major frameworks and languages.' },
  { q: 'Does MDefender Pro slow down my application?', a: 'No. MDefender Pro is designed for zero-latency protection. The AI inference engine processes requests in under 1ms on average. In production benchmarks, applications running behind MDefender showed less than 0.3% increase in average response time.' },
  { q: 'Which programming languages and frameworks are supported?', a: 'MDefender Pro provides official SDKs for Node.js, Python, PHP, Go, Ruby, and Rust. It also offers native middleware for Express, Flask, Django, Laravel, and generic HTTP servers. Nginx and Apache are supported via Lua and mod_lua modules respectively.' },
  { q: 'How does the AI detect zero-day vulnerabilities?', a: 'Our AI model is trained on millions of known attack patterns and anomalous traffic behaviors. It uses unsupervised learning to detect deviations from normal request patterns, allowing it to identify never-before-seen (zero-day) attacks based on structural similarity to known threat categories.' },
  { q: 'Is MDefender Pro compliant with GDPR and SOC 2?', a: 'Yes. MDefender Pro is fully GDPR compliant and holds SOC 2 Type II certification. All traffic data is processed in-memory and is never stored permanently. We also support regional data residency requirements for EU customers.' },
  { q: 'Can I run MDefender Pro in monitor mode before blocking?', a: 'Absolutely. You can set mode: "monitor" in your configuration to log all detected threats without blocking them. This allows you to tune your rules and understand your threat landscape before activating blocking mode.' },
  { q: 'What happens if MDefender Pro goes down?', a: 'MDefender Pro has a 99.99% uptime SLA. In the unlikely event of a service disruption, the SDK includes a built-in fail-open mechanism that allows traffic to pass through rather than blocking legitimate users. You can configure this behavior in your config file.' },
  { q: 'How do I get enterprise support?', a: 'Enterprise support is available 24/7 via phone at 01715044575, or through our dedicated enterprise portal. Enterprise customers receive priority response times, custom rule development, dedicated infrastructure, and a named account manager.' },
];

const sidebarSections = [
  { title: 'Overview', items: [
    { id: 'what-is-mdefender', label: 'What is MDefender', icon: '◎' },
    { id: 'security-features', label: 'Security Features', icon: '◈' },
    { id: 'compliance', label: 'Compliance', icon: '◆' },
  ]},
  { title: 'Quick Start', items: [
    { id: 'getting-started', label: 'Getting Started', icon: '→' },
    { id: 'installation', label: 'Installation', icon: '↓' },
    { id: 'configuration', label: 'Configuration', icon: '≡' },
  ]},
  { title: 'Platform Guides', items: [
    { id: 'nodejs-express', label: 'Node.js / Express', icon: '⬡' },
    { id: 'python-flask-django', label: 'Python / Flask / Django', icon: '◇' },
    { id: 'php-laravel', label: 'PHP / Laravel', icon: '◇' },
    { id: 'nginx-apache', label: 'Nginx / Apache', icon: '◇' },
  ]},
  { title: 'API Reference', items: [
    { id: 'api-auth', label: 'Authentication', icon: '⊞' },
    { id: 'api-user', label: 'User Endpoints', icon: '⊟' },
    { id: 'api-websites', label: 'Website Management', icon: '⊟' },
  ]},
  { title: 'Resources', items: [
    { id: 'sdks', label: 'SDKs', icon: '⊞' },
    { id: 'faq', label: 'FAQ', icon: '？' },
    { id: 'enterprise', label: 'Enterprise Support', icon: '★' },
  ]},
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('what-is-mdefender');
  const [openFaq, setOpenFaq] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = sidebarSections.flatMap((s) => s.items);
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setSidebarOpen(false); }
  };

  const sectionStyle = { scrollMarginTop: '100px' };
  const headingStyle = { fontSize: '28px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', fontFamily: "'Inter', sans-serif" };
  const subheadingStyle = { fontSize: '20px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px', fontFamily: "'Inter', sans-serif" };

  const sectionHeading = (text) => <h2 className="docs-section-title" style={headingStyle}>{text}</h2>;
  const subHeading = (text) => <div className="docs-sub-title" style={subheadingStyle}>{text}</div>;
  const bodyStyle = { fontSize: '15px', lineHeight: 1.7, color: '#94a3b8', fontFamily: "'Inter', sans-serif" };
  const cardStyle = { border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.03)', transition: 'border-color 0.2s' };
  const divider = <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: '40px' }} />;
  const tableRow = { borderBottom: '1px solid rgba(255,255,255,0.06)' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: '#e2e8f0', fontWeight: 600 };
  const tdStyle = { padding: '10px 12px', color: '#94a3b8' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        a { text-decoration: none; color: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }

        .docs-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .docs-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        @media (max-width: 1024px) {
          .docs-sidebar { display: none !important; }
          .docs-sidebar.open {
            display: block !important; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
            width: 280px; background: #0f172a; box-shadow: 4px 0 24px rgba(0,0,0,0.5);
            border-right: 1px solid rgba(255,255,255,0.08);
          }
          .docs-main { margin-left: 0 !important; padding: 32px 24px !important; }
          .mobile-toggle { display: flex !important; }
          .nav-links { display: none !important; }
        }
        @media (max-width: 768px) {
          .docs-sidebar.open { width: 100%; }
          .docs-main { padding: 24px 16px !important; }
          .docs-grid-3 { grid-template-columns: 1fr !important; }
          .docs-grid-2 { grid-template-columns: 1fr !important; }
          .docs-page-title { font-size: 28px !important; }
          .docs-page-desc { font-size: 15px !important; }
          .docs-section-title { font-size: 22px !important; }
          .docs-sub-title { font-size: 17px !important; }
          .docs-nav-brand span { display: none !important; }
          .docs-table-wrap { font-size: 12px !important; }
        }
        @media (max-width: 480px) {
          .docs-main { padding: 20px 12px !important; }
          .docs-page-title { font-size: 24px !important; }
        }
      `}</style>

      {/* Top Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px' }}>
              <i className="fas fa-shield-halved"></i>
            </div>
            <span className="docs-nav-brand" style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>MDefender Pro</span>
          </Link>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }} className="nav-links">
            <Link to="/" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Home</Link>
            <Link to="/pricing" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Pricing</Link>
            <Link to="/docs" style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, borderBottom: '2px solid #6366f1', paddingBottom: '2px' }}>Docs</Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/login" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Login</Link>
          <Link to="/signup" style={{ fontSize: '14px', color: '#fff', backgroundColor: '#6366f1', padding: '8px 20px', borderRadius: '6px', fontWeight: 600 }}>Sign Up</Link>
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: '#1e293b', cursor: 'pointer', fontSize: '18px', color: '#e2e8f0' }}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`} style={{
          width: '260px', minWidth: '260px', backgroundColor: '#0f172a',
          borderRight: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: '64px',
          height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '24px 0',
        }}>
          <div style={{ padding: '0 16px' }}>
            {sidebarSections.map((section) => (
              <div key={section.title} style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', padding: '0 12px', marginBottom: '8px' }}>
                  {section.title}
                </div>
                {section.items.map((item) => (
                  <button key={item.id} onClick={() => scrollTo(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                    fontWeight: activeSection === item.id ? 600 : 400,
                    color: activeSection === item.id ? '#e2e8f0' : '#94a3b8',
                    backgroundColor: activeSection === item.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                    textAlign: 'left', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '10px', opacity: 0.5 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ margin: '0 16px', padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>24/7 Support</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Round-the-clock assistance</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1' }}>📞 01715044575</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="docs-main" style={{ flex: 1, marginLeft: '0', maxWidth: '900px', padding: '40px 48px', backgroundColor: '#0f172a' }}>
          {/* Page Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#6366f1', marginBottom: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
              Documentation
            </div>
            <h1 className="docs-page-title" style={{ fontSize: '36px', fontWeight: 800, color: '#e2e8f0', marginBottom: '12px', lineHeight: 1.2 }}>MDefender Pro Documentation</h1>
            <p className="docs-page-desc" style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '640px' }}>
              Everything you need to integrate, configure, and optimize MDefender Pro — the AI-powered WAF protecting international businesses worldwide.
            </p>
          </div>
          {divider}

          {/* What is MDefender */}
          <section id="what-is-mdefender" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>What is MDefender Pro</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              MDefender Pro is a next-generation, AI-powered Web Application Firewall built for modern international businesses. It provides real-time threat detection and prevention, protecting your applications from SQL injection, XSS, CSRF, zero-day exploits, and more — without adding latency to your response times.
            </p>
            <div className="docs-grid-3" style={{ marginBottom: '40px' }}>
              {[
                { icon: '🧠', title: 'AI Detection', desc: 'Machine learning models trained on millions of attack patterns detect threats in real-time.' },
                { icon: '🌐', title: 'Universal Compat', desc: 'Native SDKs for Node.js, Python, PHP, Go, Ruby, and Rust. Works with any HTTP server.' },
                { icon: '⚡', title: 'Zero Latency', desc: 'Sub-millisecond inference engine adds less than 0.3% overhead to your average response time.' },
              ].map((c) => (
                <div key={c.title} style={cardStyle}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>{c.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>{c.title}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* Security Features */}
          <section id="security-features" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Security Features</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              MDefender Pro provides comprehensive protection against the OWASP Top 10 and beyond, with AI-powered detection that evolves with emerging threats.
            </p>
            <div className="docs-grid-2" style={{ marginBottom: '40px' }}>
              {[
                { title: 'SQL Injection', desc: 'Detects and blocks SQLi payloads including blind, time-based, and union-based attacks.' },
                { title: 'Cross-Site Scripting', desc: 'Stops stored, reflected, and DOM-based XSS with contextual output encoding.' },
                { title: 'CSRF Protection', desc: 'Automatic token validation and same-origin policy enforcement for state-changing requests.' },
                { title: 'LFI / RFI', desc: 'Prevents local and remote file inclusion attacks via path traversal and URL injection.' },
                { title: 'Command Injection', desc: 'Blocks OS command injection through shell metacharacter detection and input sanitization.' },
                { title: 'Path Traversal', desc: 'Detects directory traversal attempts including encoded variants and null bytes.' },
                { title: 'Zero-Day Detection', desc: 'AI anomaly detection identifies never-before-seen attacks based on behavioral patterns.' },
                { title: 'Bot Blocking', desc: 'Identifies and rate-limits malicious bots, scrapers, and automated crawlers.' },
              ].map((f) => (
                <div key={f.title} style={cardStyle}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>{f.title}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* Compliance */}
          <section id="compliance" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Compliance</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              MDefender Pro meets the highest industry standards for security, availability, and data protection compliance.
            </p>
            <div className="docs-grid-2" style={{ marginBottom: '40px' }}>
              {[
                { title: 'SSL / TLS Encryption', desc: 'End-to-end TLS 1.3 encryption for all API communications and data in transit.' },
                { title: 'SOC 2 Type II', desc: 'Independently audited controls for security, availability, and confidentiality.' },
                { title: '99.99% Uptime SLA', desc: 'Guaranteed availability with built-in failover and automatic recovery mechanisms.' },
                { title: 'GDPR Compliant', desc: 'Full compliance with EU data protection regulations and regional data residency support.' },
              ].map((c) => (
                <div key={c.title} style={cardStyle}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>{c.title}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* Getting Started */}
          <section id="getting-started" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Getting Started</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              Get MDefender Pro running in your project in three simple steps.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {[
                { step: 1, title: 'Create an account', desc: 'Sign up at mdefender.io and obtain your API key from the dashboard.' },
                { step: 2, title: 'Install the SDK', desc: 'Choose your language SDK and install it using your preferred package manager.' },
                { step: 3, title: 'Configure and deploy', desc: 'Add your API key to your configuration, initialize MDefender, and deploy.' },
              ].map((s) => (
                <div key={s.step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{s.title}</div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* Installation */}
          <section id="installation" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Installation</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Install MDefender Pro using the package manager for your language.</p>
            <CodeBlock label="npm">{'npm install mdefender'}</CodeBlock>
            <CodeBlock label="yarn">{'yarn add mdefender'}</CodeBlock>
            <CodeBlock label="pnpm">{'pnpm add mdefender'}</CodeBlock>
            <CodeBlock label="pip (Python)">{'pip install mdefender'}</CodeBlock>
            <CodeBlock label="composer (PHP)">{'composer require mdefender/mdefender'}</CodeBlock>
          </section>

          {divider}

          {/* Configuration */}
          <section id="configuration" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Configuration</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Create a configuration file in your project root to customize MDefender's behavior.</p>
            <CodeBlock label="mdefender.config.js">{`module.exports = {
  apiKey: process.env.MDEFENDER_API_KEY,
  mode: "protect",
  logLevel: "info",
  failOpen: true,
  rules: {
    sqlInjection: true,
    xss: true,
    csrf: true,
    lfiRfi: true,
    commandInjection: true,
    pathTraversal: true,
    zeroDay: true,
    botBlocking: true,
  },
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000,
  },
};`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Configuration Options</div>
            <div className="docs-table-wrap" style={{ overflowX: 'auto', marginBottom: '40px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={thStyle}>Option</th><th style={thStyle}>Type</th><th style={thStyle}>Default</th><th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['apiKey', 'string', 'required', 'Your MDefender Pro API key'],
                    ['mode', 'string', '"protect"', '"protect" or "monitor"'],
                    ['logLevel', 'string', '"info"', '"debug", "info", "warn", "error"'],
                    ['failOpen', 'boolean', 'true', 'Allow traffic if service is unreachable'],
                    ['rateLimit.enabled', 'boolean', 'true', 'Enable request rate limiting'],
                    ['rateLimit.maxRequests', 'number', '100', 'Max requests per window'],
                    ['rateLimit.windowMs', 'number', '60000', 'Rate limit window in ms'],
                  ].map((row) => (
                    <tr key={row[0]} style={tableRow}>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#60a5fa' }}>{row[0]}</td>
                      <td style={tdStyle}>{row[1]}</td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{row[2]}</td>
                      <td style={tdStyle}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {divider}

          {/* Node.js / Express */}
          <section id="nodejs-express" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Node.js / Express</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Integrate MDefender into your Express application in minutes.</p>
            <CodeBlock label="app.js">{`const express = require("express");
const { MDefender } = require("mdefender");

const app = express();
const waf = new MDefender({ apiKey: process.env.MDEFENDER_API_KEY });

app.use(waf.middleware());

app.get("/", (req, res) => {
  res.json({ status: "ok", threats: req.mdefender.threats });
});

app.listen(3000);`}</CodeBlock>
            <CodeBlock label=".env">{`MDEFENDER_API_KEY=md_live_your_api_key_here`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Monitor Mode</div>
            <CodeBlock label="mdefender.config.js">{`module.exports = {
  apiKey: process.env.MDEFENDER_API_KEY,
  mode: "monitor",
};`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Accessing Threat Data</div>
            <p style={{ ...bodyStyle, marginBottom: '12px' }}>
              Each request object includes a <code style={{ backgroundColor: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: '#c084fc' }}>req.mdefender</code> property with threat detection results.
            </p>
            <CodeBlock>{`app.use((req, res, next) => {
  console.log("Threats:", req.mdefender.threats);
  console.log("Score:", req.mdefender.riskScore);
  console.log("Blocked:", req.mdefender.blocked);
  next();
});`}</CodeBlock>
          </section>

          {divider}

          {/* Python / Flask / Django */}
          <section id="python-flask-django" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Python / Flask / Django</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Protect your Python applications with MDefender's Flask or Django integration.</p>
            <div style={subheadingStyle}>Flask</div>
            <CodeBlock label="app.py">{`from flask import Flask, request, jsonify
from mdefender import MDefender

app = Flask(__name__)
waf = MDefender(api_key="md_live_your_api_key_here")

@app.before_request
def protect():
    result = waf.inspect(request)
    if result.blocked:
        return jsonify({"error": "Blocked"}), 403

@app.route("/")
def index():
    return jsonify({"status": "ok"})

app.run(port=5000)`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Django</div>
            <CodeBlock label="middleware.py">{`from mdefender import MDefender

class MDefenderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.waf = MDefender(api_key="md_live_your_api_key_here")

    def __call__(self, request):
        result = self.waf.inspect(request)
        if result.blocked:
            from django.http import JsonResponse
            return JsonResponse({"error": "Blocked"}, status=403)
        response = self.get_response(request)
        return response`}</CodeBlock>
            <CodeBlock label="settings.py">{`MIDDLEWARE = [
    "your_app.middleware.MDefenderMiddleware",
    # ... other middleware
];`}</CodeBlock>
          </section>

          {divider}

          {/* PHP / Laravel */}
          <section id="php-laravel" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>PHP / Laravel</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Integrate MDefender into plain PHP or Laravel projects.</p>
            <div style={subheadingStyle}>Plain PHP</div>
            <CodeBlock label="index.php">{`<?php
$apiKey = getenv("MDEFENDER_API_KEY");
$payload = file_get_contents("php://input");

$ch = curl_init("https://api.mdefender.io/v1/inspect");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $apiKey,
        "Content-Type: application/json",
    ],
    CURLOPT_RETURNTRANSFER => true,
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($response["blocked"] ?? false) {
    http_response_code(403);
    echo json_encode(["error" => "Blocked"]);
    exit;
}
?>`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Laravel Middleware</div>
            <CodeBlock label="app/Http/Middleware/MDefender.php">{`<?php
namespace App\Http\Middleware;

use Closure;
use MDefender\MDefender as WAF;

class MDefenderMiddleware
{
    protected $waf;

    public function __construct()
    {
        $this->waf = new WAF(env("MDEFENDER_API_KEY"));
    }

    public function handle($request, Closure $next)
    {
        $result = $this->waf->inspect($request->all());
        if ($result->blocked) {
            return response()->json(["error" => "Blocked"], 403);
        }
        return $next($request);
    }
}
?>`}</CodeBlock>
          </section>

          {divider}

          {/* Nginx / Apache */}
          <section id="nginx-apache" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Nginx / Apache</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Use MDefender at the web server level for language-agnostic protection.</p>
            <div style={subheadingStyle}>Nginx + Lua</div>
            <CodeBlock label="nginx.conf">{`lua_shared_dict mdefender_cache 10m;

server {
    listen 80;
    server_name example.com;

    access_by_lua_block {
        local mdefender = require "mdefender"
        local result = mdefender:inspect({
            api_key = os.getenv("MDEFENDER_API_KEY"),
            request_uri = ngx.var.request_uri,
            request_method = ngx.var.request_method,
        })
        if result.blocked then
            ngx.status = 403
            ngx.say('{"error":"Blocked"}')
            return ngx.exit(403)
        end
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: '24px' }}>Apache + mod_lua</div>
            <CodeBlock label="apache.conf">{`<VirtualHost *:80>
    ServerName example.com

    <Location />
        LuaHookAccess mdefender_access.lua mdefender_check
    </Location>
</VirtualHost>`}</CodeBlock>
            <CodeBlock label="mdefender_access.lua">{`function mdefender_check()
    local mdefender = require "mdefender"
    local result = mdefender:inspect({
        api_key = os.getenv("MDEFENDER_API_KEY"),
        uri = apache.request_uri(),
        method = apache.request_method(),
    })
    if result.blocked then
        apache.set_status(403)
        return apache.DENY
    end
    return apache.OK
end`}</CodeBlock>
          </section>

          {divider}

          {/* API Authentication */}
          <section id="api-auth" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>API Authentication</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>All API requests require authentication via Bearer token in the Authorization header.</p>
            <div style={{ ...bodyStyle, marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              Base URL: https://api.mdefender.io/v1
            </div>
            <div className="docs-table-wrap" style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th><th style={thStyle}>Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['POST', '/auth/register', 'Create a new account', 'No'],
                    ['POST', '/auth/login', 'Login and get token', 'No'],
                    ['GET', '/auth/profile', 'Get current user profile', 'Yes'],
                    ['PUT', '/auth/update-profile', 'Update user profile', 'Yes'],
                    ['PUT', '/auth/change-password', 'Change account password', 'Yes'],
                  ].map((row) => (
                    <tr key={row[1]} style={tableRow}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                      <td style={{ ...tdStyle, color: row[3] === 'Yes' ? '#4ade80' : '#64748b' }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={subheadingStyle}>Register Request</div>
            <CodeBlock label="POST /auth/register">{`{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}`}</CodeBlock>
            <div style={subheadingStyle}>Register Response</div>
            <CodeBlock label="201 Created">{`{
  "success": true,
  "data": {
    "id": "usr_a1b2c3d4e5",
    "name": "John Doe",
    "email": "john@example.com",
    "apiKey": "md_live_xxxxxxxxxxxxxxxx",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}`}</CodeBlock>
            <div style={subheadingStyle}>Login Request</div>
            <CodeBlock label="POST /auth/login">{`{
  "email": "john@example.com",
  "password": "securePassword123"
}`}</CodeBlock>
            <div style={subheadingStyle}>Login Response</div>
            <CodeBlock label="200 OK">{`{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}`}</CodeBlock>
          </section>

          {divider}

          {/* API User Endpoints */}
          <section id="api-user" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>User Endpoints</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Manage your account, API keys, and view security dashboard data.</p>
            <div className="docs-table-wrap" style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['POST', '/user/regenerate-key', 'Generate a new API key'],
                    ['GET', '/user/dashboard', 'Get security dashboard data'],
                    ['PUT', '/user/profile', 'Update user profile'],
                    ['PUT', '/user/change-password', 'Change account password'],
                  ].map((row) => (
                    <tr key={row[1]} style={tableRow}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={subheadingStyle}>Update Profile Request Body</div>
            <CodeBlock label="PUT /user/profile">{`{
  "name": "Jane Doe",
  "email": "jane@example.com"
}`}</CodeBlock>
            <div style={subheadingStyle}>Change Password Request Body</div>
            <CodeBlock label="PUT /user/change-password">{`{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}`}</CodeBlock>
            <div style={subheadingStyle}>Dashboard Response</div>
            <CodeBlock label="GET /user/dashboard">{`{
  "success": true,
  "data": {
    "totalRequests": 1245893,
    "blockedRequests": 3421,
    "topThreats": [
      { "type": "sql_injection", "count": 1204 },
      { "type": "xss", "count": 891 },
      { "type": "bot_traffic", "count": 654 }
    ],
    "uptime": "99.99%",
    "avgResponseTime": "0.8ms"
  }
}`}</CodeBlock>
          </section>

          {divider}

          {/* API Websites */}
          <section id="api-websites" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Website Management</h2>
            <p style={{ ...bodyStyle, marginBottom: '16px', maxWidth: '680px' }}>Register and manage the websites protected by MDefender Pro.</p>
            <div className="docs-table-wrap" style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['POST', '/websites', 'Add a new website'],
                    ['GET', '/websites', 'List all websites'],
                    ['GET', '/websites/:id', 'Get website details'],
                    ['PUT', '/websites/:id', 'Update website settings'],
                    ['DELETE', '/websites/:id', 'Remove a website'],
                  ].map((row) => (
                    <tr key={row[1]} style={tableRow}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={subheadingStyle}>Add Website Request</div>
            <CodeBlock label="POST /websites">{`{
  "domain": "example.com",
  "plan": "professional",
  "settings": {
    "waf": true,
    "ddos": true,
    "botManagement": true
  }
}`}</CodeBlock>
            <div style={subheadingStyle}>Add Website Response</div>
            <CodeBlock label="201 Created">{`{
  "success": true,
  "data": {
    "id": "web_x1y2z3w4",
    "domain": "example.com",
    "plan": "professional",
    "nameservers": [
      "ns1.mdefender.io",
      "ns2.mdefender.io"
    ],
    "status": "active",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}`}</CodeBlock>
          </section>

          {divider}

          {/* SDKs */}
          <section id="sdks" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>SDKs</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              Official SDKs for all major programming languages. Each SDK includes type definitions, automatic retry logic, and built-in telemetry.
            </p>
            <div className="docs-grid-3" style={{ marginBottom: '40px' }}>
              {[
                { name: 'Node.js', cmd: 'npm install mdefender', icon: '⬡' },
                { name: 'Python', cmd: 'pip install mdefender', icon: '◇' },
                { name: 'PHP', cmd: 'composer require mdefender/mdefender', icon: '◇' },
                { name: 'Go', cmd: 'go get github.com/mdefender/mdefender-go', icon: '◇' },
                { name: 'Ruby', cmd: 'gem install mdefender', icon: '◇' },
                { name: 'Rust', cmd: 'cargo add mdefender', icon: '◇' },
              ].map((sdk) => (
                <div key={sdk.name} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px', opacity: 0.5 }}>{sdk.icon}</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{sdk.name}</span>
                  </div>
                  <CodeBlock>{sdk.cmd}</CodeBlock>
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* FAQ */}
          <section id="faq" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Frequently Asked Questions</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>Common questions about MDefender Pro.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
              {faqData.map((item, i) => (
                <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                    textAlign: 'left', fontFamily: "'Inter', sans-serif",
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', paddingRight: '16px' }}>{item.q}</span>
                    <span style={{ fontSize: '18px', color: '#64748b', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 20px 16px 20px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.7 }}>{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {divider}

          {/* Enterprise Support */}
          <section id="enterprise" style={sectionStyle}>
            <h2 className="docs-section-title" style={headingStyle}>Enterprise Support</h2>
            <p style={{ ...bodyStyle, marginBottom: '24px', maxWidth: '680px' }}>
              For large-scale deployments, custom integrations, and priority support, contact our enterprise team.
            </p>
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏢</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>Enterprise Support</div>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                24/7 priority support, custom rule development, dedicated infrastructure, and a named account manager.
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1', marginBottom: '8px' }}>📞 01715044575</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Available 24/7 for enterprise customers</div>
            </div>
          </section>

          <div style={{ height: '40px' }} />
        </main>
      </div>
    </div>
  );
}