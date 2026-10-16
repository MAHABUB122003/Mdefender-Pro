import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'

const SECTORS = {
  government: {
    id: 'government',
    name: 'Government & Public Sector',
    badge: 'FEDRAMP & NIST READY',
    icon: 'fa-landmark',
    headline: 'Sovereign Cloud & Public Infrastructure Defense',
    subtitle: 'Zero-trust Anycast packet inspection designed for civic portals, public record databases, and state infrastructure under strict sovereign data boundaries.',
    compliance: [
      { name: 'FedRAMP High / Moderate', desc: 'FIPS 140-3 validated cryptographic modules with continuous security controls auditability.' },
      { name: 'NIST SP 800-53 Rev. 5', desc: 'SC-7 boundary protection, SI-4 information system monitoring, and CP-2 contingency planning.' },
      { name: 'Sovereign Data Residency', desc: 'Strict domestic-only Anycast routing with zero cross-border telemetry exfiltration.' },
      { name: 'Zero PII Log Storage', desc: 'Citizen identifiers, national IDs, and credentials automatically redacted in-memory.' }
    ],
    architecture: {
      inbound: 'Civic Ingress Traffic (Anycast IP)',
      inspection: 'Sovereign Edge Scrubber (0.12ms)',
      outcome: 'Clean Verified Requests to State Data Centers',
      blockRate: '100% Zero Cross-Border Leakage'
    },
    useCases: [
      {
        title: 'Election & Voter Portal Protection',
        desc: 'Absorb sudden nationwide volumetric traffic surges while actively terminating coordinated nation-state DDoS attacks and credential spraying.'
      },
      {
        title: 'Municipal & Tax Filing Systems',
        desc: 'Block SQL injections and automated scraping targeting confidential citizen tax filings and property records.'
      },
      {
        title: 'Defense Supplier Extranets',
        desc: 'Geo-fence access exclusively to authenticated domestic subnets while inspecting all multipart file uploads for embedded webshells.'
      }
    ],
    metrics: [
      { value: '100%', label: 'Domestic Data Retention' },
      { value: '<0.10ms', label: 'Edge Scrubbing Overhead' },
      { value: 'Zero', label: 'External Cloud Dependency' }
    ]
  },
  banking: {
    id: 'banking',
    name: 'Banking & Financial Services',
    badge: 'PCI-DSS LEVEL 1 COMPLIANT',
    icon: 'fa-building-columns',
    headline: 'High-Frequency Financial Transaction & API Shielding',
    subtitle: 'Microsecond defense against card testing attacks, credential stuffing, and unauthorized wire transfer tampering across mobile banking gateways.',
    compliance: [
      { name: 'PCI-DSS v4.0 Requirement 6.4.2', desc: 'Automated technical solution deployed in front of public-facing web applications to detect and prevent attacks.' },
      { name: 'FFIEC Architecture Guidelines', desc: 'Multi-layered perimeter defense with continuous behavioral anomaly and velocity checking.' },
      { name: 'PSD2 & Open Banking RTS', desc: 'Strong Customer Authentication (SCA) support and Mutual TLS (mTLS) certificate binding.' },
      { name: 'GLBA Safe Harbor', desc: 'Customer financial records isolated with continuous encryption in transit and at edge nodes.' }
    ],
    architecture: {
      inbound: 'High-Frequency FinTech Ingress',
      inspection: 'Carding & Velocity Scrubber (0.12ms)',
      outcome: 'Sub-Millisecond Clean Core Gateway',
      blockRate: '99.999% Carding Bot Interception'
    },
    useCases: [
      {
        title: 'Card Testing & BIN Attack Neutralization',
        desc: 'Intercept high-velocity automated micro-transactions across checkout APIs before processing fees and merchant fines hit your ledger.'
      },
      {
        title: 'Mobile Banking API Credential Stuffing',
        desc: 'Cryptographic Turnstile Proof-of-Work challenge halts millions of credential stuffing attempts without adding UX friction for legitimate mobile users.'
      },
      {
        title: 'High-Value Payment Wire Protection',
        desc: 'Deterministic parameter tamper detection enforces strict payload schema verification on Swift and ISO 20022 payment payloads.'
      }
    ],
    metrics: [
      { value: '99.999%', label: 'Payment Gateway Uptime' },
      { value: '<0.12ms', label: 'Transaction Latency' },
      { value: '$0', label: 'Chargeback & Carding Fines' }
    ]
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    badge: 'HIPAA & HITECH READY',
    icon: 'fa-hospital-user',
    headline: 'Zero-Trust Cyber Armor for Electronic Health Records (EHR)',
    subtitle: 'Protect patient telemetry, telemedicine consultations, and laboratory APIs from ransomware reconnaissance, data scrapers, and supply-chain exploits.',
    compliance: [
      { name: 'HIPAA Security Rule (45 CFR § 164)', desc: 'Technical safeguards verifying ePHI transmission security with zero plain-text disk writes.' },
      { name: 'HITECH Breach Notification Shield', desc: 'Proactive intrusion quarantine eliminating unauthorized access vectors before patient records are exposed.' },
      { name: 'HL7 & FHIR API Schema Guard', desc: 'Syntactic validation of interoperability endpoints preventing malicious JSON/XML payload injections.' },
      { name: 'ISO 27799 Health Informatics', desc: 'Specialized health sector guidelines for information security management in healthcare.' }
    ],
    architecture: {
      inbound: 'Patient Portals & Telehealth APIs',
      inspection: 'FHIR Schema & ePHI Quarantine (0.12ms)',
      outcome: 'Verified Hospital Clinical Network',
      blockRate: '100% ePHI Scrubbed in Memory'
    },
    useCases: [
      {
        title: 'Telehealth Video & Consultation Endpoints',
        desc: 'Shield WebRTC signaling gateways and appointment scheduling portals against extortion DDoS and brute-force takeover.'
      },
      {
        title: 'Laboratory Diagnostic Report Downloads',
        desc: 'Protect automated patient PDF report download endpoints against Path Traversal (LFI) and unauthenticated IDOR enumeration.'
      },
      {
        title: 'Medical IoT Device Telemetry Ingestion',
        desc: 'Enforce strict schema validation on telemetry streams from wearable monitors and hospital diagnostic arrays.'
      }
    ],
    metrics: [
      { value: '100%', label: 'ePHI Transmission Security' },
      { value: '0.12ms', label: 'Real-Time Edge Evaluation' },
      { value: '24/7', label: 'Emergency Threat Response' }
    ]
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'Enterprise E-Commerce & SaaS',
    badge: 'HIGH-CONCURRENCY RETAIL',
    icon: 'fa-cart-shopping',
    headline: 'Zero-Downtime Peak Event Scaling & Anti-Bot Defense',
    subtitle: 'Engineered for Black Friday, flash sales, and high-growth SaaS platforms where every millisecond of latency translates to thousands in lost revenue.',
    compliance: [
      { name: '99.999% Service Level Agreement (SLA)', desc: 'Globally distributed Anycast network spanning 240+ PoPs ensures zero single points of failure.' },
      { name: 'OWASP Automated Threats (OAT) Defense', desc: 'Native blocks against credential cracking (OAT-007), credential stuffing (OAT-008), and scalping (OAT-005).' },
      { name: 'Sub-Millisecond Edge Acceleration', desc: 'Zero latency penalty (<0.12ms) with in-memory neural evaluation and dynamic caching.' },
      { name: 'Multi-Tenant RBAC & SSO', desc: 'Enterprise team isolation with SAML 2.0 / Okta single sign-on and audit log exports.' }
    ],
    architecture: {
      inbound: 'Flash Sale Peak Ingress (250k req/s)',
      inspection: 'Adaptive Token-Bucket & Bot Challenge',
      outcome: 'Clean Shopper Traffic to Shopify/Woo/Store',
      blockRate: '0.00% False Positive Rate on Buyers'
    },
    useCases: [
      {
        title: 'Sneaker Bot & Cart Scalper Neutralization',
        desc: 'Invisible cryptographic Turnstile challenge blocks headless Puppeteer and Selenium bots from reserving flash-sale inventory before real buyers can check out.'
      },
      {
        title: 'Layer 7 Volumetric Flash-Sale Flood Scrubber',
        desc: 'Absorb multi-gigabit HTTP floods and Slowloris attacks without degrading checkout speed or overwhelming database connection pools.'
      },
      {
        title: '1-Click WordPress & WooCommerce Sync',
        desc: 'Official native plugin provides zero-config protection for WooCommerce stores, neutralizing malicious plugins and backdoors.'
      }
    ],
    metrics: [
      { value: '250k+', label: 'Max Peak Req/Sec Absorbed' },
      { value: '99.999%', label: 'Availability Guarantee' },
      { value: '<0.12ms', label: 'Edge Added Latency' }
    ]
  },
  aigateway: {
    id: 'aigateway',
    name: 'Generative AI & LLM Platforms',
    badge: '639K+ PROMPTS SHIELD',
    icon: 'fa-robot',
    headline: 'Enterprise AI Gateway & Prompt Injection Shield',
    subtitle: 'Safeguard your LLM agents, RAG databases, and OpenAI / Anthropic / Gemini integration pipelines against adversarial prompt injection and data exfiltration.',
    compliance: [
      { name: 'OWASP Top 10 for LLMs (LLM01-LLM10)', desc: 'Direct syntactic and semantic defense against prompt injection, insecure output handling, and training data poisoning.' },
      { name: 'Denial of Wallet (DoW) Mitigation', desc: 'Strict token velocity ceilings and recursive query dampening protect your LLM API billing from runaway spikes.' },
      { name: 'Sensitive Data Exfiltration Guard', desc: 'Inspect prompt and completion payloads for leaked API keys, database connection strings, and PII.' },
      { name: 'Adversarial Jailbreak Detection', desc: 'Trained on 639,536 confirmed jailbreak vectors (DAN, cipher encoding, persona switching, and multi-turn payloads).' }
    ],
    architecture: {
      inbound: 'User Prompts & Agent Webhooks',
      inspection: 'Deep AST & Jailbreak Vectorizer (0.11ms)',
      outcome: 'Sanitized Safe Prompt Forwarded to LLM',
      blockRate: '99.82% Adversarial Injection Drop'
    },
    useCases: [
      {
        title: 'Customer-Facing AI Chatbot Hardening',
        desc: 'Stop malicious prompt injections designed to force your customer support agent into making unauthorized refund promises or revealing proprietary prompts.'
      },
      {
        title: 'RAG Knowledge Base & SQL-Agent Shielding',
        desc: 'Prevent prompt injection payloads from hijacking internal database queries or exfiltrating confidential company documents.'
      },
      {
        title: 'Model DoS & Token Consumption Floods',
        desc: 'Filter repetitive high-entropy prompt floods before they burn through your expensive OpenAI and Anthropic inference quotas.'
      }
    ],
    metrics: [
      { value: '639,536', label: 'Trained Jailbreak Vectors' },
      { value: '0.11ms', label: 'Prompt Evaluation Time' },
      { value: '99.82%', label: 'Adversarial Catch Rate' }
    ]
  }
}

export default function Industries() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [searchParams, setSearchParams] = useSearchParams()

  const currentSectorKey = searchParams.get('sector') || 'government'
  const activeSector = SECTORS[currentSectorKey] || SECTORS.government

  const handleSelectSector = (key) => {
    setSearchParams({ sector: key })
    window.scrollTo({ top: 380, behavior: 'smooth' })
  }

  const c = {
    bg: dark ? '#070b14' : '#f8fafc',
    cardBg: dark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
    border: dark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    highlightBorder: dark ? 'rgba(59, 130, 246, 0.4)' : '#93c5fd',
    accentText: '#3b82f6',
    pillActiveBg: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    pillActiveText: '#ffffff',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: c.bg,
      color: s.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden',
      transition: 'background 0.3s, color 0.3s'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ind-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 22px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid transparent;
          text-decoration: none;
        }
        .ind-pill:hover {
          transform: translateY(-2px);
        }
        .ind-card {
          transition: all 0.3s ease;
        }
        .ind-card:hover {
          transform: translateY(-4px);
          box-shadow: ${dark ? '0 16px 40px rgba(0,0,0,0.6)' : '0 12px 30px rgba(0,0,0,0.08)'};
        }
      `}</style>

      <PublicNavbar />

      {/* Hero Section */}
      <section style={{
        padding: '140px 24px 60px',
        textAlign: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 380,
          background: `radial-gradient(circle, ${dark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: dark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
            border: `1px solid ${dark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
            color: '#3b82f6',
            fontSize: 12.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 20
          }}>
            <i className="fas fa-shield-halved"></i> Sovereign Cloud, Defense &amp; Regulated Sectors
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 4.5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            maxWidth: 960,
            margin: '0 auto 20px',
            color: s.text
          }}>
            Zero-Trust Autonomous Edge Security for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Mission-Critical Global Industries
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            lineHeight: 1.65,
            color: s.textSecondary,
            maxWidth: 780,
            margin: '0 auto 40px'
          }}>
            Tailored Cloud WAF, Layer 7 volumetric flood mitigation, and AI threat isolation architectures engineered to surpass FedRAMP, PCI-DSS Level 1, HIPAA, and ISO 27001 regulatory mandates with 0.12ms edge latency.
          </p>

          {/* Sector Selector Pills */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20
          }}>
            {Object.values(SECTORS).map(sec => {
              const isActive = sec.id === activeSector.id
              return (
                <button
                  key={sec.id}
                  onClick={() => handleSelectSector(sec.id)}
                  className="ind-pill"
                  style={{
                    background: isActive ? c.pillActiveBg : (dark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'),
                    color: isActive ? c.pillActiveText : s.text,
                    border: isActive ? 'none' : `1px solid ${c.border}`,
                    boxShadow: isActive ? '0 4px 18px rgba(37, 99, 235, 0.45)' : 'none'
                  }}
                >
                  <i className={`fas ${sec.icon}`} style={{ color: isActive ? '#ffffff' : '#3b82f6' }}></i>
                  <span>{sec.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main Sector Showcase Banner */}
      <section style={{ maxWidth: 1240, margin: '0 auto 60px', padding: '0 24px' }}>
        <div style={{
          background: c.cardBg,
          borderRadius: 24,
          border: `1px solid ${c.highlightBorder}`,
          padding: '48px 40px',
          boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 10px 40px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 30 }}>
            <div>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                color: '#3b82f6',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.6px',
                marginBottom: 10
              }}>
                {activeSector.badge}
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 900, color: s.text, margin: 0, letterSpacing: '-0.5px' }}>
                {activeSector.headline}
              </h2>
              <p style={{ fontSize: 16, color: s.textSecondary, maxWidth: 820, margin: '12px 0 0', lineHeight: 1.6 }}>
                {activeSector.subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Link
                to="/register"
                style={{
                  padding: '13px 26px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#ffffff',
                  fontSize: 14.5,
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 18px rgba(37, 99, 235, 0.45)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <span>Deploy Free Origin Shield</span>
                <i className="fas fa-arrow-right" style={{ fontSize: 12 }}></i>
              </Link>
            </div>
          </div>

          {/* Metric Highlights Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            background: dark ? 'rgba(7, 11, 20, 0.65)' : '#f8fafc',
            border: `1px solid ${c.border}`,
            borderRadius: 16,
            padding: '24px',
            marginBottom: 36
          }}>
            {activeSector.metrics.map((m, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: '#3b82f6',
                  letterSpacing: '-1px',
                  lineHeight: 1.1
                }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Pipeline Visualizer */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: s.textSecondary, letterSpacing: '0.8px', marginBottom: 14 }}>
              Zero-Trust Packet Filtering Topology:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              alignItems: 'center'
            }}>
              <div style={{
                background: dark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Step 1: Ingress</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: s.text }}>{activeSector.architecture.inbound}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(6,182,212,0.12))',
                border: '1.5px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 14,
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                  <i className="fas fa-microchip" style={{ marginRight: 6 }}></i> Step 2: MDefender Edge Core
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: s.text }}>{activeSector.architecture.inspection}</div>
              </div>

              <div style={{
                background: dark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#10b981', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Step 3: Safe Egress</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#10b981' }}>{activeSector.architecture.outcome}</div>
              </div>
            </div>
          </div>

          {/* Compliance & Standards Cards */}
          <div style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: s.text, marginBottom: 16 }}>
              Regulatory Mandates &amp; Security Controls Fulfilled
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16
            }}>
              {activeSector.compliance.map((item, idx) => (
                <div
                  key={idx}
                  className="ind-card"
                  style={{
                    background: dark ? 'rgba(7, 11, 20, 0.6)' : '#f8fafc',
                    borderRadius: 14,
                    border: `1px solid ${c.border}`,
                    padding: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <i className="fas fa-certificate" style={{ color: '#10b981', fontSize: 16 }}></i>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: s.text }}>{item.name}</div>
                  </div>
                  <p style={{ fontSize: 13, color: s.textSecondary, margin: 0, lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Use Cases */}
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: s.text, marginBottom: 16 }}>
              Enterprise Production Deployments
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16
            }}>
              {activeSector.useCases.map((uc, idx) => (
                <div
                  key={idx}
                  className="ind-card"
                  style={{
                    background: dark ? 'rgba(7, 11, 20, 0.6)' : '#f8fafc',
                    borderRadius: 14,
                    border: `1px solid ${c.border}`,
                    padding: '22px'
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.text, marginBottom: 6 }}>
                    <i className="fas fa-check-circle" style={{ color: '#3b82f6', marginRight: 8 }}></i>
                    {uc.title}
                  </div>
                  <p style={{ fontSize: 13.5, color: s.textSecondary, margin: 0, lineHeight: 1.6 }}>
                    {uc.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Global Certifications Trust Strip */}
      <section style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          background: dark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          borderRadius: 20,
          border: `1px solid ${c.border}`,
          padding: '36px 30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: s.textSecondary, letterSpacing: '0.8px', marginBottom: 20 }}>
            Unified Global Compliance Framework
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24
          }}>
            {[
              { label: 'FedRAMP Ready', icon: 'fa-shield-halved' },
              { label: 'PCI-DSS Level 1 v4.0', icon: 'fa-credit-card' },
              { label: 'HIPAA & HITECH', icon: 'fa-user-nurse' },
              { label: 'SOC 2 Type II', icon: 'fa-file-shield' },
              { label: 'ISO/IEC 27001', icon: 'fa-globe' },
              { label: 'GDPR Article 32', icon: 'fa-fingerprint' }
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  borderRadius: 30,
                  background: dark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                  border: `1px solid ${c.border}`,
                  fontSize: 13,
                  fontWeight: 700,
                  color: s.text
                }}
              >
                <i className={`fas ${b.icon}`} style={{ color: '#3b82f6' }}></i>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Architecture Consultation CTA */}
      <section style={{ maxWidth: 1240, margin: '0 auto 100px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{
          background: dark
            ? 'radial-gradient(ellipse at 50% 50%, rgba(37, 99, 235, 0.25) 0%, rgba(10, 15, 29, 0.95) 75%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(37, 99, 235, 0.12) 0%, #ffffff 75%)',
          border: `1px solid ${c.highlightBorder}`,
          borderRadius: 24,
          padding: '60px 30px',
          boxShadow: dark ? '0 25px 70px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, color: s.text, marginBottom: 16 }}>
            Ready for a Tailored Enterprise Architecture Review?
          </h2>
          <p style={{ fontSize: 16.5, color: s.textSecondary, maxWidth: 660, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Our enterprise cybersecurity architects work directly with your compliance officers and DevOps teams to deliver customized regex rules, sovereign Anycast nodes, and sub-millisecond edge integration.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                padding: '16px 36px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 15.5,
                textDecoration: 'none',
                boxShadow: '0 4px 25px rgba(37, 99, 235, 0.5)'
              }}
            >
              Start Free 14-Day Enterprise Trial
            </Link>
            <Link
              to="/pricing"
              style={{
                padding: '16px 28px',
                borderRadius: 12,
                background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                border: `1px solid ${c.border}`,
                color: s.text,
                fontWeight: 600,
                fontSize: 15.5,
                textDecoration: 'none'
              }}
            >
              View Transparent Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        padding: '50px 24px 30px',
        background: dark ? '#03050a' : '#ffffff',
        fontSize: '13px',
        color: '#64748b'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: s.text }}>
            <i className="fas fa-shield-halved" style={{ color: '#2563eb' }}></i> MDefender Pro Industries
          </div>
          <div>
            &copy; {new Date().getFullYear()} MDefender Pro Security Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
