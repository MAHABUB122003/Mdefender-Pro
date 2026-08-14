import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import theme from '../utils/theme';

function MethodBadge({ method }) {
  const colors = { POST: '#16a34a', GET: '#2563eb', PUT: '#d97706', DELETE: '#dc2626' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff', backgroundColor: colors[method] || '#6b7280', marginRight: 8, minWidth: 52, textAlign: 'center' }}>{method}</span>
  );
}

function CodeBlock({ children, label, dark }) {
  const s = theme(dark);
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }, [children]);

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', margin: '16px 0', backgroundColor: s.bgCode, border: `1px solid ${s.borderLight}` }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: dark ? '#18181b' : '#e2e8f0', borderBottom: `1px solid ${s.borderLight}`, fontSize: 12, color: s.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>{label}</span>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : s.textMuted, cursor: 'pointer', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: '4px 8px', borderRadius: 4, transition: 'color 0.2s', backgroundColor: copied ? 'rgba(74,222,128,0.1)' : 'transparent' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre style={{ background: s.bgCode, color: s.textCode, padding: '20px 24px', margin: 0, fontSize: 14, lineHeight: 1.8, fontFamily: "'Fira Code', 'JetBrains Mono', 'SF Mono', monospace", overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

const faqData = [
  { q: 'What is MDefender Pro and how does it work?', a: 'MDefender Pro is a next-generation, AI-powered Web Application Firewall built for modern international businesses. It provides real-time threat detection and prevention, protecting your applications from SQL injection, XSS, CSRF, zero-day exploits, and more — without adding latency to your response times.' },
  { q: 'Does MDefender Pro slow down my application?', a: 'No. MDefender Pro is designed for zero-latency protection. The AI inference engine processes requests in under 1ms on average. In production benchmarks, applications running behind MDefender showed less than 0.3% increase in average response time.' },
  { q: 'Which programming languages and frameworks are supported?', a: 'MDefender Pro provides official SDKs for Node.js, Python, PHP, Go, Ruby, and Rust. It also offers native middleware for Express, Flask, Django, Laravel, and generic HTTP servers. Nginx and Apache are supported via Lua and mod_lua modules respectively.' },
  { q: 'How does the AI detect zero-day vulnerabilities?', a: 'Our AI model is trained on millions of known attack patterns and anomalous traffic behaviors. It uses unsupervised learning to detect deviations from normal request patterns, allowing it to identify never-before-seen (zero-day) attacks based on structural similarity to known threat categories.' },
  { q: 'Is MDefender Pro compliant with GDPR and SOC 2?', a: 'Yes. MDefender Pro is fully GDPR compliant and holds SOC 2 Type II certification. All traffic data is processed in-memory and is never stored permanently. We also support regional data residency requirements for EU customers.' },
  { q: 'Can I run MDefender Pro in monitor mode before blocking?', a: 'Absolutely. You can set mode: "monitor" in your configuration to log all detected threats without blocking them. This allows you to tune your rules and understand your threat landscape before activating blocking mode.' },
  { q: 'What happens if MDefender Pro goes down?', a: 'MDefender Pro has a 99.99% uptime SLA. In the unlikely event of a service disruption, the SDK includes a built-in fail-open mechanism that allows traffic to pass through rather than blocking legitimate users. You can configure this behavior in your config file.' },
  { q: 'How do I get enterprise support?', a: 'Enterprise support is available 24/7 via phone at 01715044575, or through our dedicated enterprise portal. Enterprise customers receive priority response times, custom rule development, dedicated infrastructure, and a named account manager.' },
];

const sidebarSections = [
  { title: 'Overview', items: [{ id: 'what-is-mdefender', label: 'What is MDefender', icon: '◎' }, { id: 'security-features', label: 'Security Features', icon: '◈' }, { id: 'compliance', label: 'Compliance', icon: '◆' }] },
  { title: 'Quick Start', items: [{ id: 'getting-started', label: 'Getting Started', icon: '→' }, { id: 'installation', label: 'Installation', icon: '↓' }, { id: 'configuration', label: 'Configuration', icon: '≡' }] },
  { title: 'Platform Guides', items: [{ id: 'nodejs-express', label: 'Node.js / Express', icon: '⬡' }, { id: 'python-flask-django', label: 'Python / Flask / Django', icon: '◇' }, { id: 'php-laravel', label: 'PHP / Laravel', icon: '◇' }, { id: 'nginx-apache', label: 'Nginx / Apache', icon: '◇' }] },
  { title: 'API Reference', items: [{ id: 'api-auth', label: 'Authentication', icon: '⊞' }, { id: 'api-user', label: 'User Endpoints', icon: '⊟' }, { id: 'api-websites', label: 'Website Management', icon: '⊟' }] },
  { title: 'Resources', items: [{ id: 'sdks', label: 'SDKs', icon: '⊞' }, { id: 'faq', label: 'FAQ', icon: '？' }, { id: 'enterprise', label: 'Enterprise Support', icon: '★' }] },
];

export default function Docs() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [activeSection, setActiveSection] = useState('what-is-mdefender');
  const [openFaq, setOpenFaq] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = sidebarSections.flatMap((sec) => sec.items);
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 120) { setActiveSection(sections[i].id); break; }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setSidebarOpen(false); }
  };

  const headingStyle = { fontSize: 28, fontWeight: 700, color: s.text, marginBottom: 8 };
  const subheadingStyle = { fontSize: 20, fontWeight: 600, color: s.text, marginBottom: 12 };
  const bodyStyle = { fontSize: 15, lineHeight: 1.7, color: s.textSecondary };
  const cardStyle = { border: `1px solid ${s.border}`, borderRadius: 8, padding: 20, backgroundColor: s.bgCard, transition: 'border-color 0.2s' };
  const divider = <div style={{ height: 1, backgroundColor: s.borderLight, marginBottom: 40 }} />;
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: s.text, fontWeight: 600 };
  const tdStyle = { padding: '10px 12px', color: s.textSecondary };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: s.bg, fontFamily: "'Inter', sans-serif", transition: 'background 0.3s' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        a { text-decoration: none; color: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#334155' : '#cbd5e1'}; border-radius: 3px; }
        .docs-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .docs-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 1024px) {
          .docs-sidebar { display: none !important; }
          .docs-sidebar.open { display: block !important; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; width: 280px; background: ${s.bg}; box-shadow: 4px 0 24px ${s.overlay}; border-right: 1px solid ${s.border}; }
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
          .docs-nav-brand span { display: none !important; }
        }
      `}</style>

      {/* Top Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: s.bgNav, borderBottom: `1px solid ${s.border}`, boxShadow: s.shadowNav, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)', transition: 'background 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, backgroundColor: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
              <i className="fas fa-shield-halved"></i>
            </div>
            <span className="docs-nav-brand" style={{ fontSize: 18, fontWeight: 700, color: s.text }}>MDefender Pro</span>
          </Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }} className="nav-links">
            <Link to="/" style={{ fontSize: 14, color: s.textSecondary, fontWeight: 500 }}>Home</Link>
            <Link to="/pricing" style={{ fontSize: 14, color: s.textSecondary, fontWeight: 500 }}>Pricing</Link>
            <Link to="/docs" style={{ fontSize: 14, color: s.text, fontWeight: 600, borderBottom: '2px solid #6366f1', paddingBottom: 2 }}>Docs</Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/user/login" style={{ fontSize: 14, color: s.textSecondary, fontWeight: 500 }}>Login</Link>
          <Link to="/register" style={{ fontSize: 14, color: '#fff', backgroundColor: '#6366f1', padding: '8px 20px', borderRadius: 6, fontWeight: 600 }}>Sign Up</Link>
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, border: `1px solid ${s.border}`, borderRadius: 6, background: s.bgCard, cursor: 'pointer', fontSize: 18, color: s.text }}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`} style={{ width: 260, minWidth: 260, backgroundColor: s.bg, borderRight: `1px solid ${s.border}`, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '24px 0', transition: 'background 0.3s' }}>
          <div style={{ padding: '0 16px' }}>
            {sidebarSections.map((section) => (
              <div key={section.title} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.textMuted, padding: '0 12px', marginBottom: 8 }}>{section.title}</div>
                {section.items.map((item) => (
                  <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: activeSection === item.id ? 600 : 400, color: activeSection === item.id ? s.text : s.textSecondary, backgroundColor: activeSection === item.id ? s.primaryBg : 'transparent', textAlign: 'left', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>{item.icon}</span> {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ margin: '0 16px', padding: 16, borderRadius: 8, backgroundColor: s.primaryBg, border: `1px solid ${s.primaryBorder}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.text, marginBottom: 4 }}>24/7 Support</div>
            <div style={{ fontSize: 12, color: s.textSecondary, marginBottom: 8 }}>Round-the-clock assistance</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.primary }}><i className="fas fa-phone"></i> 01715044575</div>
          </div>
        </aside>

        {/* Main */}
        <main className="docs-main" style={{ flex: 1, marginLeft: 0, maxWidth: 900, padding: '40px 48px', backgroundColor: s.bg, transition: 'background 0.3s' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: s.primaryBg, borderRadius: 100, fontSize: 12, fontWeight: 600, color: s.primary, marginBottom: 16, border: `1px solid ${s.primaryBorder}` }}>Documentation</div>
            <h1 className="docs-page-title" style={{ fontSize: 36, fontWeight: 800, color: s.text, marginBottom: 12, lineHeight: 1.2 }}>MDefender Pro Documentation</h1>
            <p style={{ fontSize: 17, color: s.textSecondary, lineHeight: 1.6, maxWidth: 640 }}>
              Everything you need to integrate, configure, and optimize MDefender Pro — the AI-powered WAF protecting international businesses worldwide.
            </p>
          </div>
          {divider}

          {/* What is MDefender */}
          <section id="what-is-mdefender" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>What is MDefender Pro</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>
              MDefender Pro is a next-generation, AI-powered Web Application Firewall built for modern international businesses. It provides real-time threat detection and prevention, protecting your applications from SQL injection, XSS, CSRF, zero-day exploits, and more — without adding latency to your response times.
            </p>
            <div className="docs-grid-3" style={{ marginBottom: 40 }}>
              {[{ icon: 'fas fa-brain', title: 'AI Detection', desc: 'Machine learning models trained on millions of attack patterns detect threats in real-time.' }, { icon: 'fas fa-globe', title: 'Universal Compat', desc: 'Native SDKs for Node.js, Python, PHP, Go, Ruby, and Rust. Works with any HTTP server.' }, { icon: 'fas fa-bolt', title: 'Zero Latency', desc: 'Sub-millisecond inference engine adds less than 0.3% overhead to your average response time.' }].map((c) => (
                <div key={c.title} style={cardStyle}><div style={{ fontSize: 24, marginBottom: 12, color: s.primary }}><i className={c.icon}></i></div><div style={{ fontSize: 15, fontWeight: 600, color: s.text, marginBottom: 6 }}>{c.title}</div><div style={{ fontSize: 13, color: s.textSecondary, lineHeight: 1.6 }}>{c.desc}</div></div>
              ))}
            </div>
          </section>
          {divider}

          {/* Security Features */}
          <section id="security-features" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Security Features</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>MDefender Pro provides comprehensive protection against the OWASP Top 10 and beyond.</p>
            <div className="docs-grid-2" style={{ marginBottom: 40 }}>
              {[{ title: 'SQL Injection', desc: 'Detects and blocks SQLi payloads including blind, time-based, and union-based attacks.' }, { title: 'Cross-Site Scripting', desc: 'Stops stored, reflected, and DOM-based XSS with contextual output encoding.' }, { title: 'CSRF Protection', desc: 'Automatic token validation and same-origin policy enforcement.' }, { title: 'LFI / RFI', desc: 'Prevents local and remote file inclusion attacks.' }, { title: 'Command Injection', desc: 'Blocks OS command injection through shell metacharacter detection.' }, { title: 'Path Traversal', desc: 'Detects directory traversal attempts including encoded variants.' }, { title: 'Zero-Day Detection', desc: 'AI anomaly detection identifies never-before-seen attacks.' }, { title: 'Bot Blocking', desc: 'Identifies and rate-limits malicious bots and scrapers.' }].map((f) => (
                <div key={f.title} style={cardStyle}><div style={{ fontSize: 15, fontWeight: 600, color: s.text, marginBottom: 6 }}>{f.title}</div><div style={{ fontSize: 13, color: s.textSecondary, lineHeight: 1.6 }}>{f.desc}</div></div>
              ))}
            </div>
          </section>
          {divider}

          {/* Compliance */}
          <section id="compliance" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Compliance</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>MDefender Pro meets the highest industry standards for security and compliance.</p>
            <div className="docs-grid-2" style={{ marginBottom: 40 }}>
              {[{ title: 'SSL / TLS Encryption', desc: 'End-to-end TLS 1.3 encryption for all API communications.' }, { title: 'SOC 2 Type II', desc: 'Independently audited controls for security, availability, and confidentiality.' }, { title: '99.99% Uptime SLA', desc: 'Guaranteed availability with built-in failover.' }, { title: 'GDPR Compliant', desc: 'Full compliance with EU data protection regulations.' }].map((c) => (
                <div key={c.title} style={cardStyle}><div style={{ fontSize: 15, fontWeight: 600, color: s.text, marginBottom: 6 }}>{c.title}</div><div style={{ fontSize: 13, color: s.textSecondary, lineHeight: 1.6 }}>{c.desc}</div></div>
              ))}
            </div>
          </section>
          {divider}

          {/* Getting Started */}
          <section id="getting-started" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Getting Started</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>Get MDefender Pro running in your project in three simple steps.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              {[{ step: 1, title: 'Create an account', desc: 'Sign up at mdefender.io and obtain your API key from the dashboard.' }, { step: 2, title: 'Install the SDK', desc: 'Choose your language SDK and install it using your preferred package manager.' }, { step: 3, title: 'Configure and deploy', desc: 'Add your API key to your configuration, initialize MDefender, and deploy.' }].map((st) => (
                <div key={st.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{st.step}</div>
                  <div><div style={{ fontSize: 15, fontWeight: 600, color: s.text, marginBottom: 4 }}>{st.title}</div><div style={{ fontSize: 14, color: s.textSecondary, lineHeight: 1.6 }}>{st.desc}</div></div>
                </div>
              ))}
            </div>
          </section>
          {divider}

          {/* Installation */}
          <section id="installation" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Installation</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Install MDefender Pro using the package manager for your language.</p>
            <CodeBlock label="npm" dark={dark}>{'npm install mdefender'}</CodeBlock>
            <CodeBlock label="yarn" dark={dark}>{'yarn add mdefender'}</CodeBlock>
            <CodeBlock label="pnpm" dark={dark}>{'pnpm add mdefender'}</CodeBlock>
            <CodeBlock label="pip (Python)" dark={dark}>{'pip install mdefender'}</CodeBlock>
            <CodeBlock label="composer (PHP)" dark={dark}>{'composer require mdefender/mdefender'}</CodeBlock>
          </section>
          {divider}

          {/* Configuration */}
          <section id="configuration" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Configuration</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Create a configuration file in your project root to customize MDefender's behavior.</p>
            <CodeBlock label="mdefender.config.js" dark={dark}>{`module.exports = {
  apiKey: process.env.MDEFENDER_API_KEY,
  domain: "api.mywebsite.com",
  mode: "block",
  onError: "allow",
  logBlocked: true,
  skipPaths: ["/health", "/favicon.ico"],
  timeout: 5000
};`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: 24 }}>Configuration Options</div>
            <div style={{ overflowX: 'auto', marginBottom: 40 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}><th style={thStyle}>Option</th><th style={thStyle}>Type</th><th style={thStyle}>Default</th><th style={thStyle}>Description</th></tr></thead>
                <tbody>
                  {[['apiKey', 'string', 'required', 'Your MDefender Pro API key'], ['domain', 'string', '""', 'Domain of the tenant/website'], ['mode', 'string', '"block"', '"block", "monitor", or "off"'], ['onError', 'string', '"allow"', '"allow" or "block" - what to do if API is unreachable'], ['logBlocked', 'boolean', 'true', 'Log blocked requests to console'], ['timeout', 'number', '5000', 'API request timeout in ms'], ['skipPaths', 'array', '["/health", "/favicon.ico"]', 'URL paths to bypass WAF check']].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#60a5fa' }}>{row[0]}</td>
                      <td style={tdStyle}>{row[1]}</td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row[2]}</td>
                      <td style={tdStyle}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {divider}

          {/* Node.js */}
          <section id="nodejs-express" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Node.js / Express</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Integrate MDefender into your Express application in minutes.</p>
            <CodeBlock label="app.js" dark={dark}>{`const express = require("express");
const { MDefender } = require("mdefender");

const app = express();
const waf = new MDefender({ apiKey: process.env.MDEFENDER_API_KEY });

app.use(waf.middleware());

app.get("/", (req, res) => {
  res.json({ status: "ok", threats: req.mdefender.threats });
});

app.listen(3000);`}</CodeBlock>
            <CodeBlock label=".env" dark={dark}>{`MDEFENDER_API_KEY=md_live_your_api_key_here`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: 24 }}>Monitor Mode</div>
            <CodeBlock label="mdefender.config.js" dark={dark}>{`module.exports = {
  apiKey: process.env.MDEFENDER_API_KEY,
  mode: "monitor",
};`}</CodeBlock>
            <div style={{ ...subheadingStyle, marginTop: 24 }}>Accessing Threat Data</div>
            <p style={{ ...bodyStyle, marginBottom: 12 }}>Each request object includes a <code style={{ backgroundColor: s.primaryBg, padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#c084fc' }}>req.mdefender</code> property with threat detection results.</p>
            <CodeBlock dark={dark}>{`app.use((req, res, next) => {
  console.log("Threats:", req.mdefender.threats);
  console.log("Score:", req.mdefender.riskScore);
  console.log("Blocked:", req.mdefender.blocked);
  next();
});`}</CodeBlock>
          </section>
          {divider}

          {/* Python */}
          <section id="python-flask-django" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Python / Flask / Django</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Protect your Python applications with MDefender's Flask or Django integration.</p>
            <div style={subheadingStyle}>Flask</div>
            <CodeBlock label="app.py" dark={dark}>{`from flask import Flask, request, jsonify
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
            <div style={{ ...subheadingStyle, marginTop: 24 }}>Django</div>
            <CodeBlock label="middleware.py" dark={dark}>{`from mdefender import MDefender

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
          </section>
          {divider}

          {/* PHP */}
          <section id="php-laravel" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>PHP / Laravel</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Integrate MDefender into plain PHP or Laravel projects.</p>
            <div style={subheadingStyle}>Laravel Middleware</div>
            <CodeBlock label="app/Http/Middleware/MDefender.php" dark={dark}>{`<?php
namespace App\\Http\\Middleware;

use Closure;
use MDefender\\MDefender as WAF;

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
}`}</CodeBlock>
          </section>
          {divider}

          {/* Nginx */}
          <section id="nginx-apache" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Nginx / Apache</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Use MDefender at the web server level for language-agnostic protection.</p>
            <div style={subheadingStyle}>Nginx + Lua</div>
            <CodeBlock label="nginx.conf" dark={dark}>{`lua_shared_dict mdefender_cache 10m;

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
          </section>
          {divider}

          {/* API Auth */}
          <section id="api-auth" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>API Authentication</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>All API requests require authentication via Bearer token.</p>
            <div style={{ ...bodyStyle, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: s.text, backgroundColor: s.bgCard, padding: '12px 16px', borderRadius: 6, border: `1px solid ${s.border}` }}>Base URL: https://api.mdefender.io/v1</div>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}><th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th><th style={thStyle}>Auth</th></tr></thead>
                <tbody>
                  {[['POST', '/auth/register', 'Create a new account', 'No'], ['POST', '/auth/login', 'Login and get token', 'No'], ['GET', '/auth/profile', 'Get current user profile', 'Yes'], ['PUT', '/auth/update-profile', 'Update user profile', 'Yes'], ['PUT', '/auth/change-password', 'Change account password', 'Yes']].map((row) => (
                    <tr key={row[1]} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                      <td style={{ ...tdStyle, color: row[3] === 'Yes' ? '#4ade80' : s.textMuted }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {divider}

          {/* API User */}
          <section id="api-user" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>User Endpoints</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Manage your account, API keys, and view security dashboard data.</p>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}><th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th></tr></thead>
                <tbody>
                  {[['POST', '/user/regenerate-key', 'Generate a new API key'], ['GET', '/user/dashboard', 'Get security dashboard data'], ['PUT', '/user/profile', 'Update user profile'], ['PUT', '/user/change-password', 'Change account password']].map((row) => (
                    <tr key={row[1]} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {divider}

          {/* Websites */}
          <section id="api-websites" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Website Management</h2>
            <p style={{ ...bodyStyle, marginBottom: 16, maxWidth: 680 }}>Register and manage the websites protected by MDefender Pro.</p>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}><th style={thStyle}>Method</th><th style={thStyle}>Endpoint</th><th style={thStyle}>Description</th></tr></thead>
                <tbody>
                  {[['POST', '/websites', 'Add a new website'], ['GET', '/websites', 'List all websites'], ['GET', '/websites/:id', 'Get website details'], ['PUT', '/websites/:id', 'Update website settings'], ['DELETE', '/websites/:id', 'Remove a website']].map((row) => (
                    <tr key={row[1]} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                      <td style={{ padding: '10px 12px' }}><MethodBadge method={row[0]} /></td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#60a5fa' }}>{row[1]}</td>
                      <td style={tdStyle}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {divider}

          {/* SDKs */}
          <section id="sdks" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>SDKs</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>Official SDKs for all major programming languages.</p>
            <div className="docs-grid-3" style={{ marginBottom: 40 }}>
              {[{ name: 'Node.js', cmd: 'npm install mdefender', icon: '⬡' }, { name: 'Python', cmd: 'pip install mdefender', icon: '◇' }, { name: 'PHP', cmd: 'composer require mdefender/mdefender', icon: '◇' }, { name: 'Go', cmd: 'go get github.com/mdefender/mdefender-go', icon: '◇' }, { name: 'Ruby', cmd: 'gem install mdefender', icon: '◇' }, { name: 'Rust', cmd: 'cargo add mdefender', icon: '◇' }].map((sdk) => (
                <div key={sdk.name} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ fontSize: 16, opacity: 0.5 }}>{sdk.icon}</span><span style={{ fontSize: 15, fontWeight: 600, color: s.text }}>{sdk.name}</span></div>
                  <CodeBlock dark={dark}>{sdk.cmd}</CodeBlock>
                </div>
              ))}
            </div>
          </section>
          {divider}

          {/* FAQ */}
          <section id="faq" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Frequently Asked Questions</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>Common questions about MDefender Pro.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              {faqData.map((item, i) => (
                <div key={i} style={{ border: `1px solid ${s.border}`, borderRadius: 8, overflow: 'hidden', backgroundColor: s.bgCard }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Inter', sans-serif" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.text, paddingRight: 16 }}>{item.q}</span>
                    <span style={{ fontSize: 18, color: s.textMuted, transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
                  </button>
                  {openFaq === i && <div style={{ padding: '0 20px 16px 20px', fontSize: 14, color: s.textSecondary, lineHeight: 1.7 }}>{item.a}</div>}
                </div>
              ))}
            </div>
          </section>
          {divider}

          {/* Enterprise */}
          <section id="enterprise" style={{ scrollMarginTop: 100 }}>
            <h2 style={headingStyle}>Enterprise Support</h2>
            <p style={{ ...bodyStyle, marginBottom: 24, maxWidth: 680 }}>For large-scale deployments, custom integrations, and priority support.</p>
            <div style={{ ...cardStyle, padding: 32, textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 16, color: s.primary }}><i className="fas fa-building"></i></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.text, marginBottom: 8 }}>Enterprise Support</div>
              <div style={{ fontSize: 14, color: s.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>24/7 priority support, custom rule development, dedicated infrastructure, and a named account manager.</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.primary, marginBottom: 8 }}><i className="fas fa-phone"></i> 01715044575</div>
              <div style={{ fontSize: 13, color: s.textMuted }}>Available 24/7 for enterprise customers</div>
            </div>
          </section>
          <div style={{ height: 40 }} />
        </main>
      </div>
    </div>
  );
}
