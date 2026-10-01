import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'

export default function About() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [activeTab, setActiveTab] = useState('architecture')

  const stats = [
    { value: '5,489,242+', label: 'ML Neural Training Vectors', icon: 'fa-brain', color: '#6366f1' },
    { value: '2,000,000+', label: 'Hyper-Scale Attack Signatures', icon: 'fa-shield-halved', color: '#3b82f6' },
    { value: '<0.50ms', label: 'Single-Pass Latency', icon: 'fa-bolt', color: '#10b981' },
    { value: '99.99%', label: 'Zero-Day Detection Rate', icon: 'fa-bullseye', color: '#8b5cf6' },
  ]

  const comparisonData = [
    {
      feature: 'Core Threat Inspection Engine',
      mdefender: '2,000,000+ Hyper-Scale Signatures + 5.48M ML Neural Core',
      traditional: 'Static Regex Pattern Matchers Only',
      competitor: 'Basic Heuristic Scoring',
      highlight: true
    },

    {
      feature: 'Zero-Day & Polymorphic Attack Defense',
      mdefender: 'Real-time N-Gram Character Vectorization & Anomaly AI',
      traditional: 'Fails until CVE signature is manually written',
      competitor: 'Delayed Cloud Signature Updates',
      highlight: true
    },
    {
      feature: 'Inspection Latency Overhead',
      mdefender: '< 0.85ms (Ultra-Low Sub-Millisecond)',
      traditional: '15ms - 45ms (Noticeable slowdown)',
      competitor: '8ms - 20ms',
      highlight: false
    },
    {
      feature: 'Layer 7 DDoS & Token-Bucket Rate Limiter',
      mdefender: 'Dynamic volumetric flood shielding & burst containment',
      traditional: 'Fixed IP connection rate limiting',
      competitor: 'Paid add-on tier only',
      highlight: false
    },
    {
      feature: 'CMS & WordPress 1-Click Integration',
      mdefender: 'Native Plugin with Cloud Edge Sync & Bundled 403 Page',
      traditional: 'Complex server Nginx/Apache configuration',
      competitor: 'Heavy PHP plugin that slows database',
      highlight: true
    },
    {
      feature: 'Attack Learning & Adaptive Feedback Loop',
      mdefender: 'Continuous autonomous retraining on blocked attack telemetry',
      traditional: 'No self-learning capability',
      competitor: 'Manual analyst review queue',
      highlight: true
    },
  ]

  const corePillars = [
    {
      icon: 'fa-brain',
      title: 'Neural Threat Intelligence',
      desc: 'Our deep learning models analyze payload semantics, character entropy, and AST structures to stop polymorphic exploits that bypass standard regular expressions.',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.1)'
    },
    {
      icon: 'fa-shield-virus',
      title: 'Zero-Day Vulnerability Shielding',
      desc: 'Protect against unpatched vulnerabilities (such as Log4j, Spring4Shell, and WordPress 0-days) immediately upon disclosure without waiting for patch releases.',
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.1)'
    },
    {
      icon: 'fa-bolt-lightning',
      title: 'Edge-Speed Performance',
      desc: 'Engineered in high-performance C/Python pipelines to evaluate requests in under 0.85ms, ensuring your application remains blazing fast and responsive.',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)'
    },
    {
      icon: 'fa-network-wired',
      title: 'Autonomous DDoS Mitigation',
      desc: 'Detects volumetric traffic spikes, HTTP flood storms, and distributed botnets in real-time, rate-limiting malicious nodes without penalizing legitimate users.',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)'
    },
    {
      icon: 'fa-plug',
      title: 'Universal Multi-Stack Connectors',
      desc: 'Drop-in middleware support for Node.js (Express/Vite), Python (FastAPI/Django), PHP, WordPress, and reverse proxies with zero configuration friction.',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.1)'
    },
    {
      icon: 'fa-chart-line-up',
      title: 'Continuous Attack Learning',
      desc: 'The integrated Attack Learning Engine records novel payload mutations and continuously refines security heuristics to proactively block future campaigns.',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#070b14' : '#f8fafc',
      color: s.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden',
      transition: 'background 0.3s, color 0.3s'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.04); } }
        
        .about-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .about-card:hover {
          transform: translateY(-4px);
          box-shadow: ${dark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(0,0,0,0.08)'};
          border-color: rgba(99,102,241,0.4) !important;
        }

        .tab-btn {
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      <PublicNavbar />

      {/* Hero Section */}
      <section style={{
        padding: '140px 24px 70px',
        maxWidth: 1240,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 450,
          background: `radial-gradient(circle, ${dark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite'
        }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease-out forwards' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
            border: `1px solid ${dark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
            color: '#6366f1',
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 20
          }}>
            <i className="fas fa-shield-halved"></i> Why MDefender Pro
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            maxWidth: 960,
            margin: '0 auto 20px',
            color: s.text
          }}>
            The Next-Generation AI Web Application Firewall Built for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Zero-Trust Modern Cloud
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            lineHeight: 1.65,
            color: s.textSecondary,
            maxWidth: 780,
            margin: '0 auto 40px'
          }}>
            Traditional WAFs rely on brittle static regex rules that threat actors easily bypass with obfuscation. MDefender Pro combines <strong>2,000+ deterministic security rules</strong> with a <strong>5,489,242+ payload-trained Neural Network</strong> to stop zero-days and layer-7 floods in sub-millisecond real time.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 44 }}>
            <Link to="/register" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 32px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              transition: 'all 0.2s'
            }}>
              <i className="fas fa-shield-check"></i> Protect Your Website Now
            </Link>

            <Link to="/docs" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 10,
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
              color: s.text,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}>
              <i className="fas fa-book-open"></i> Technical Documentation
            </Link>
          </div>

          {/* Visual AI Shield Showcase Banner */}
          <div style={{
            maxWidth: 1080,
            margin: '0 auto',
            borderRadius: 20,
            overflow: 'hidden',
            border: `1px solid ${dark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
            boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.65)' : '0 15px 40px rgba(99,102,241,0.12)',
            position: 'relative',
            maxHeight: 460
          }}>
            <img
              src="/blog/ai_zeroday_defense.jpg"
              alt="MDefender Pro AI Neural Defense System"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '24px 30px',
              background: 'linear-gradient(to top, rgba(7,11,20,0.95) 0%, rgba(7,11,20,0.5) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                  <i className="fas fa-shield-halved" style={{ color: '#6366f1', marginRight: 8 }}></i>
                  Autonomous Neural WAF &amp; Zero-Day Payload Inspection
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                  Trained on 5,489,242+ hostile payloads &middot; Evaluated in &lt;0.85ms at global cloud edge
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10b981',
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  <i className="fas fa-circle" style={{ fontSize: 8, marginRight: 5 }}></i> 0.38ms Latency
                </span>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8',
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  5.48M+ Model Loaded
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section style={{
        maxWidth: 1240,
        margin: '0 auto 80px',
        padding: '0 24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          background: dark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          borderRadius: 18,
          padding: '36px 30px',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
          boxShadow: dark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          {stats.map((st, idx) => (
            <div key={idx} style={{ textAlign: 'center', padding: '10px 16px' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${st.color}15`,
                color: st.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: 18
              }}>
                <i className={`fas ${st.icon}`}></i>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.text, letterSpacing: '-0.8px' }}>
                {st.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: s.textSecondary, marginTop: 4 }}>
                {st.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Use MDefender Pro - 6 Core Pillars */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: s.text, letterSpacing: '-0.6px', marginBottom: 12 }}>
            Engineered to Solve Critical Security Deficiencies
          </h2>
          <p style={{ fontSize: 16, color: s.textSecondary, maxWidth: 680, margin: '0 auto', lineHeight: 1.6 }}>
            Everything you need to secure high-traffic web apps, SaaS platforms, e-commerce stores, and WordPress sites with zero complexity.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24
        }}>
          {corePillars.map((p, i) => (
            <div key={i} className="about-card" style={{
              background: dark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
              borderRadius: 16,
              padding: '32px 28px',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: p.bg,
                  color: p.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 20
                }}>
                  <i className={`fas ${p.icon}`}></i>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: s.text, marginBottom: 12 }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: s.textSecondary, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table: MDefender Pro vs Traditional WAFs */}
      <section style={{
        padding: '80px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 20,
            background: dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
            color: '#10b981',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 12
          }}>
            <i className="fas fa-scale-balanced"></i> Architectural Superiority
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: s.text, letterSpacing: '-0.6px', marginBottom: 12 }}>
            How MDefender Pro Compares
          </h2>
          <p style={{ fontSize: 16, color: s.textSecondary, maxWidth: 660, margin: '0 auto' }}>
            A side-by-side comparison of why engineering teams choose MDefender Pro over legacy rule-only firewalls.
          </p>
        </div>

        <div className="table-responsive" style={{
          background: dark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
          borderRadius: 20,
          border: `1px solid ${dark ? 'rgba(99,102,241,0.25)' : '#e2e8f0'}`,
          boxShadow: dark ? '0 15px 45px rgba(0,0,0,0.5), 0 0 30px rgba(99,102,241,0.1)' : '0 10px 30px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{
                background: dark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
                borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <th style={{ padding: '20px 24px', fontSize: 14, fontWeight: 700, color: s.text }}>Feature / Capability</th>
                <th style={{
                  padding: '20px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#6366f1',
                  background: dark ? 'rgba(99,102,241,0.14)' : '#eef2ff',
                  borderLeft: '1px solid rgba(99,102,241,0.3)',
                  borderRight: '1px solid rgba(99,102,241,0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span><i className="fas fa-shield-halved" style={{ marginRight: 6 }}></i> MDefender Pro</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: '#10b981', color: '#fff' }}>WINNER</span>
                  </div>
                </th>
                <th style={{ padding: '20px 24px', fontSize: 14, fontWeight: 600, color: s.textSecondary }}>Traditional WAFs</th>
                <th style={{ padding: '20px 24px', fontSize: 14, fontWeight: 600, color: s.textSecondary }}>Basic Plugins</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
                <tr key={idx} style={{
                  borderBottom: idx < comparisonData.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}` : 'none',
                  background: row.highlight ? (dark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.015)') : 'transparent'
                }}>
                  <td style={{ padding: '18px 24px', fontSize: 14, fontWeight: 700, color: s.text }}>
                    {row.feature}
                  </td>
                  <td style={{
                    padding: '18px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#10b981',
                    background: dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
                    borderLeft: '1px solid rgba(99,102,241,0.25)',
                    borderRight: '1px solid rgba(99,102,241,0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-circle-check" style={{ color: '#10b981', flexShrink: 0 }}></i>
                      <span style={{ fontWeight: 700 }}>{row.mdefender}</span>
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px', fontSize: 13, color: s.textSecondary }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-circle-xmark" style={{ color: '#ef4444', flexShrink: 0 }}></i>
                      <span>{row.traditional}</span>
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px', fontSize: 13, color: s.textSecondary }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-triangle-exclamation" style={{ color: '#f59e0b', flexShrink: 0 }}></i>
                      <span>{row.competitor}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Promotional Conversion Row under comparison */}
        <div style={{
          marginTop: 28,
          background: dark ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08))' : '#f8fafc',
          borderRadius: 14,
          padding: '20px 26px',
          border: `1px solid ${dark ? 'rgba(99,102,241,0.25)' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.text }}>
              Experience the Sub-Millisecond AI WAF Difference
            </div>
            <div style={{ fontSize: 13, color: s.textSecondary }}>
              Deploy 2,000 WAF rules + 5,489,242+ dataset neural protection in under 2 minutes.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/register" style={{
              padding: '10px 22px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(99,102,241,0.35)'
            }}>
              Start Free Trial
            </Link>
            <Link to="/pricing" style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
              color: s.text,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Tabs: How It Works & Architecture */}
      <section style={{
        padding: '80px 24px 100px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: s.text, letterSpacing: '-0.6px', marginBottom: 12 }}>
            Under the Hood Architecture
          </h2>
          <p style={{ fontSize: 16, color: s.textSecondary, maxWidth: 660, margin: '0 auto' }}>
            A streamlined 3-stage inspection lifecycle that protects every incoming HTTP request.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20
        }}>
          <div style={{
            background: dark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
            borderRadius: 16,
            padding: '28px 24px',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: 8 }}>
              Stage 1: Pre-Flight Edge Gate
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: s.text, marginBottom: 10 }}>
              Volumetric DDoS & Threat IP Intelligence
            </h3>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6 }}>
              Incoming requests are cross-referenced with active IP blacklists, geo-fencing policies, and token-bucket rate limiters. Bad bot scanners (sqlmap, Nikto, Gobuster) are blocked immediately.
            </p>
          </div>

          <div style={{
            background: dark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
            borderRadius: 16,
            padding: '28px 24px',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8 }}>
              Stage 2: Deterministic Rule Matrix
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: s.text, marginBottom: 10 }}>
              2,000+ High-Speed Pattern Filters
            </h3>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6 }}>
              Headers, cookies, URL queries, and multipart form payloads undergo multi-pass regex inspection for classic SQLi, XSS, RCE, SSRF, and CMS vulnerability vectors in 0.2ms.
            </p>
          </div>

          <div style={{
            background: dark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
            borderRadius: 16,
            padding: '28px 24px',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: 8 }}>
              Stage 3: 5.48M+ Neural Inference
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: s.text, marginBottom: 10 }}>
              Polymorphic AI Deep Vectorization
            </h3>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6 }}>
              Heuristic vectorization analyzes character entropy and AST anomalies. If an obfuscated zero-day payload is detected, it renders the bundled 403 Block Page and logs threat telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '80px 24px 100px',
        maxWidth: 1240,
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          background: dark
            ? 'linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(15,23,42,0.9) 100%)'
            : 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
          borderRadius: 24,
          padding: '60px 32px',
          border: `1px solid ${dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)'}`,
          boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 10px 40px rgba(99,102,241,0.1)'
        }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: s.text, letterSpacing: '-0.8px', marginBottom: 16 }}>
            Ready to Shield Your Infrastructure?
          </h2>
          <p style={{ fontSize: 16, color: s.textSecondary, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Join thousands of developers, sysadmins, and security teams who rely on MDefender Pro for autonomous edge protection.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '14px 34px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
            }}>
              Create Free Account
            </Link>
            <Link to="/pricing" style={{
              padding: '14px 28px',
              borderRadius: 10,
              background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
              color: s.text,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '36px 40px',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        color: s.textSecondary,
        fontSize: 13,
        maxWidth: 1240,
        margin: '0 auto'
      }}>
        <span>&copy; 2026 MDefender Pro. All rights reserved. Enterprise AI Web Defense.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/" style={{ color: s.textSecondary, textDecoration: 'none' }}>Home</Link>
          <Link to="/about" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>About</Link>
          <Link to="/blog" style={{ color: s.textSecondary, textDecoration: 'none' }}>Blog</Link>
          <Link to="/pricing" style={{ color: s.textSecondary, textDecoration: 'none' }}>Pricing</Link>
          <Link to="/docs" style={{ color: s.textSecondary, textDecoration: 'none' }}>Docs</Link>
          <Link to="/user/login" style={{ color: s.textSecondary, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </footer>
    </div>
  )
}
