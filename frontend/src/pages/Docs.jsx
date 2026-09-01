import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'

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
      { id: 'sdk-nodejs', label: 'Node.js / Express', icon: 'fa-node-js' },
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
      { id: 'benchmarks', label: 'Latency & Benchmarks', icon: 'fa-stopwatch' },
      { id: 'compliance', label: 'SOC 2 & GDPR Privacy', icon: 'fa-certificate' },
      { id: 'faqs', label: 'Frequently Asked Questions', icon: 'fa-circle-question' }
    ]
  }
]

function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

          {/* Section: 5.2M ML Model */}
          {(activeSection === 'ml-overview' || activeSection === 'ml-vectorizer' || activeSection === 'ml-classification') && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>The 5.2M+ Dataset ML Classifier</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '20px' }}>
                MDefender's Machine Learning core is engineered to stop polymorphic payloads, zero-day CVE exploits, and obfuscations that evade traditional static signatures.
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

          {/* Section: 2,000 WAF Rules Catalog */}
          {(activeSection === 'rules-overview' || activeSection.startsWith('sqli') || activeSection.startsWith('xss') || activeSection.startsWith('rce') || activeSection.startsWith('lfi') || activeSection.startsWith('cms') || activeSection.startsWith('bots') || activeSection.startsWith('ssrf')) && (
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
  apiKey: process.env.MDEFENDER_API_KEY || 'Ix2TtXbbBHJolIam3MYLui0jphKy9oRvF_D3AJjY1tO8MGfWU-NCQzvDuwc_6Dri',

  // Registered domain
  domain: 'yourdomain.com',

  // Endpoint
  apiEndpoint: 'https://mdefender-pro-6e3r.onrender.com',

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

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-4" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Bundled 403 Block Page Feature
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                  No need to design or host your own block page. The <code>mdefender-pro</code> package comes bundled with a responsive, dark glassmorphic 403 page featuring:
                </p>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.8', marginTop: '10px' }}>
                  <li><strong>Instant Incident ID Generation</strong> (e.g. <code>MDF-8ABEF43C</code>) with 1-click clipboard copying.</li>
                  <li><strong>Detected Attack Categorization</strong> (SQLi, XSS, RCE, LFI, Bot probes).</li>
                  <li><strong>Client IP &amp; Incident Timestamp</strong> for security audits and reporting.</li>
                  <li><strong>Sub-Millisecond Rendering</strong> directly from in-memory cache without extra network hops.</li>
                </ul>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '16px' }}>
                  <i className="fa-solid fa-5" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
                  Test Your Protection
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Send a benign simulated injection attack in your browser or terminal to verify instant 403 blocking:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# 1. Test XSS Attack (Expect 403 Forbidden + Block Page)
curl -i "http://localhost:5000/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"

# 2. Test SQL Injection Attack (Expect 403 Forbidden + Block Page)
curl -i "http://localhost:5000/api/books?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"

# 3. Test Safe Request (Expect 200 OK)
curl -i "http://localhost:5000/api/books"`}
                />
              </div>
            </div>
          )}

          {/* Section: Python SDK */}
          {activeSection === 'sdk-python' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>Python / FastAPI / Django Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1' }}>
                Attach MDefender ASGI/WSGI middleware to FastAPI, Flask, or Django.
              </p>

              <CodeBlock
                language="python"
                code={`# FastAPI ASGI Integration Example
from fastapi import FastAPI
from mdefender import MDefenderMiddleware

app = FastAPI()

app.add_middleware(
    MDefenderMiddleware,
    api_key="your_api_key_here",
    mode="block",
    enable_ml=True,
    rate_limit_rpm=100
)`}
              />
            </div>
          )}

          {/* Section: PHP / Laravel SDK */}
          {activeSection === 'sdk-php' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>PHP &amp; Laravel Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Integrate MDefender Pro WAF into any PHP 7.4+ or 8.x web application, Symfony, or Laravel framework.
              </p>

              <CodeBlock
                language="php"
                code={`<?php
// Require Composer Autoloader
require_once __DIR__ . '/vendor/autoload.php';

use MDefender\\WafShield;

// Initialize MDefender Hybrid WAF before routing
$waf = new WafShield([
    'api_key'    => getenv('MDEFENDER_API_KEY'),
    'domain'     => 'yourdomain.com',
    'mode'       => 'block', // 'block' | 'monitor'
    'enable_ml'  => true,
    'block_page' => true     // Serves bundled Cyber 403 block page
]);

// Inspect current incoming request
$waf->inspectRequest();`}
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
                  href={`${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
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

              {/* ML Services provided */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  <i className="fa-solid fa-microchip" style={{ color: '#a78bfa', marginRight: '8px' }}></i>
                  AI/ML Services Provided to WordPress
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#090d18', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13.5px', marginBottom: '6px' }}>
                      <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i>
                      Real-Time ML WAF
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      Inspects all requests hitting <code>wp-login.php</code>, <code>xmlrpc.php</code>, contact forms, and the REST API. Blocks SQLi, XSS, and exploit probes with the bundled 403 block page.
                    </p>
                  </div>
                  <div style={{ background: '#090d18', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#34d399', fontWeight: '700', fontSize: '13.5px', marginBottom: '6px' }}>
                      <i className="fa-solid fa-bug-slash" style={{ marginRight: '6px' }}></i>
                      Deep Malware Scanner
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      Streams suspicious files in <code>wp-content/plugins</code> and <code>wp-content/themes</code> to our 5.2M dataset ML classifier to detect hidden web shells, backdoors, and obfuscated code.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: REST API Reference */}
          {(activeSection === 'api-auth' || activeSection === 'api-rules' || activeSection === 'api-telemetry') && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>REST API Endpoints</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                Manage custom security policies and telemetry programmatically:
              </p>

              <div style={{
                background: '#0c1222',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>/api/user/rules</code>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px' }}>
                  Retrieves global default rules and user-specific custom rules.
                </p>
                <CodeBlock
                  language="json"
                  code={`{
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
}`}
                />
              </div>

              <div style={{
                background: '#0c1222',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="POST" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>/api/user/rules</code>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px' }}>
                  Creates a new custom WAF rule scoped to the authenticated tenant.
                </p>
                <CodeBlock
                  language="json"
                  code={`// Request Body:
{
  "name": "Block Malicious User-Agent Substring",
  "pattern": "(?i)(scanner_bot_probe)",
  "action": "block",
  "severity": "high"
}`}
                />
              </div>
            </div>
          )}

          {/* Section: Quickstart */}
          {activeSection === 'quickstart' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>5-Minute Quickstart</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1' }}>
                Follow these simple steps to protect your application in minutes:
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '8px' }}>Step 1: Obtain Your API Key</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                Sign up at <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none' }}>MDefender Registration</Link> and copy your website API key from <Link to="/user/settings" style={{ color: '#38bdf8', textDecoration: 'none' }}>Settings</Link> or <Link to="/user/websites" style={{ color: '#38bdf8', textDecoration: 'none' }}>Websites</Link>.
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '8px' }}>Step 2: Install the Official NPM Package</h3>
              <CodeBlock language="bash" code={`npm install mdefender-pro`} />

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '8px' }}>Step 3: Add Middleware to Express</h3>
              <CodeBlock
                language="javascript"
                code={`const express = require('express');
const mdefender = require('mdefender-pro');

const app = express();
app.use(express.json());

// Attach MDefender Pro WAF (Zero-Config: automatically serves bundled 403 block page)
app.use(mdefender({
  apiKey: 'YOUR_API_KEY_HERE',
  domain: 'yourdomain.com',
  mode: 'block'
}));

app.get('/api/books', (req, res) => {
  res.json({ message: 'Request safely passed WAF verification' });
});

app.listen(5000, () => console.log('Protected server running on port 5000'));`}
              />

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '8px' }}>Step 4: Test Verification Probe</h3>
              <CodeBlock
                language="bash"
                code={`# Test safe request (Expect 200 OK)
curl -i http://localhost:5000/api/books

# Test hostile XSS / SQLi injection payload (Expect 403 Forbidden + Cyber Block Page)
curl -i "http://localhost:5000/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"`}
              />
            </div>
          )}

          {/* Section: Complete Website Connection Guide */}
          {activeSection === 'website-connect' && (
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
                }}>Step-by-Step Guide</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Bundled 403 Block Page</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: '#ffffff' }}>How to Connect Your Website with MDefender</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '28px' }}>
                Learn how to integrate MDefender Pro into any web application or backend. When you install our package, everything &mdash; including the high-speed <strong>403 Cyber Block Page</strong> &mdash; is bundled and ready to go immediately upon adding your API key.
              </p>

              {/* Step 1 Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</span>
                  Install the NPM Package
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
                  Run the following command in your backend project directory:
                </p>
                <CodeBlock language="bash" code={`npm install mdefender-pro`} />
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#34d399' }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                  <strong>Bundled Block Page:</strong> The MDefender-Pro AI Corporate 403 Block Page is automatically installed inside <code>mdefender-pro</code> with real-time GeoIP, country flags, and incident tracking. You do NOT need to create or host an external HTML file!
                </div>
              </div>

              {/* Step 2 Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</span>
                  Get Your Website API Key
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
                  Go to <Link to="/user/settings" style={{ color: '#38bdf8', textDecoration: 'none' }}>Settings</Link> or <Link to="/user/websites" style={{ color: '#38bdf8', textDecoration: 'none' }}>Websites</Link> in your MDefender dashboard to copy your active API Key (e.g. <code>Ix2TtXbbBHJol...</code>).
                </p>
              </div>

              {/* Step 3 Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>3</span>
                  Configure Your Application
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
                  You can configure MDefender in either of two easy ways:
                </p>

                <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginTop: '14px' }}>Option A: Config File (<code>mdefender.config.js</code>)</div>
                <CodeBlock
                  language="javascript"
                  code={`// mdefender.config.js (in your project root)
module.exports = {
  apiKey: "Ix2TtXbbBHJolIam3MYLui0jphKy9oRvF_D3AJjY1tO8MGfWU-NCQzvDuwc_6Dri",
  domain: "yourdomain.com",
  apiEndpoint: "https://mdefender-pro-6e3r.onrender.com", // or http://127.0.0.1:8000 for local dev
  mode: "block",
  logBlocked: true
};`}
                />

                <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginTop: '14px' }}>Option B: Pass Directly in Code</div>
                <CodeBlock
                  language="javascript"
                  code={`// Attach in your Express server index.js
const mdefender = require('mdefender-pro');

app.use(mdefender({
  apiKey: 'YOUR_API_KEY_HERE',
  domain: 'yourdomain.com'
}));`}
                />
              </div>

              {/* Step 4 Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>4</span>
                  Attach Middleware in Express
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
                  Make sure <code>app.use(mdefender())</code> is placed after body parsers and before route endpoints:
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

app.listen(5005, () => console.log('Bookstore Server running with MDefender Pro!'));`}
                />
              </div>

              {/* Network Architecture Explanation */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  <i className="fa-solid fa-network-wired" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                  Understanding Frontend vs Backend in Network Tab
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '16px' }}>
                  When building a modern full-stack web app (e.g. React/Vite on port 5174 and Express on port 5005):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#090d18', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                      <i className="fa-solid fa-server" style={{ marginRight: '6px' }}></i>
                      Backend API Requests (Port 5005)
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      When a malicious request is sent to your API (e.g. <code>http://localhost:5005/api/books?id=&lt;script&gt;alert(1)&lt;/script&gt;</code>), the WAF intercepts it, stops execution, returns <strong>403 Forbidden</strong>, and renders the 403 Cyber Block Page.
                    </p>
                  </div>
                  <div style={{ background: '#090d18', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#a78bfa', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                      <i className="fa-solid fa-desktop" style={{ marginRight: '6px' }}></i>
                      Frontend Dev Server (Port 5174)
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                      Visiting the static URL (e.g. <code>http://localhost:5174/</code>) loads the client Single-Page Application bundle from Vite. As soon as the frontend calls the backend API, the WAF protects the data layer from any hostile exploit attempt.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Verification */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: '#10b981', marginRight: '8px' }}></i>
                  Test and Verify Active Protection
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  Execute these test requests in your terminal:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# 1. Test XSS Attack (Expect 403 Forbidden & Cyber Block Page)
curl -i "http://localhost:5005/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"

# 2. Test SQL Injection (Expect 403 Forbidden & Cyber Block Page)
curl -i "http://localhost:5005/api/books?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"

# 3. Test Safe Query (Expect 200 OK with data)
curl -i "http://localhost:5005/api/books"`}
                />
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
