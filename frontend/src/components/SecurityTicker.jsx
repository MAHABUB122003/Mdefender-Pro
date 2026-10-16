import { useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'

// Track 1: Core Enterprise Edge WAF, AI Engine & Global Defense Network
const TRACK_ONE_ITEMS = [
  {
    icon: 'fa-shield-halved',
    color: '#38bdf8',
    title: 'Cloud WAF Protection',
    badge: 'L7 ENGINE',
    subtext: 'Deterministic & ML Edge Filter'
  },
  {
    icon: 'fa-brain',
    color: '#818cf8',
    title: '6,501,208+ Threat Neural ML Core',
    badge: '99.23% PRECISION',
    subtext: '0.75% False Positive Rate'
  },
  {
    icon: 'fa-bolt',
    color: '#f59e0b',
    title: 'Layer 7 Volumetric DDoS Mitigation',
    badge: 'SCRUBBER MESH',
    subtext: 'Token-Bucket Flood Dropper'
  },
  {
    icon: 'fa-network-wired',
    color: '#60a5fa',
    title: 'Reverse Proxy & Origin IP Cloaking',
    badge: 'ZERO EXPOSURE',
    subtext: 'Origin Architecture Shield'
  },
  {
    icon: 'fa-lock',
    color: '#10b981',
    title: 'Universal Auto-Provisioned SSL/TLS',
    badge: '256-BIT SSL',
    subtext: 'Automated HTTPS Enforcement'
  },
  {
    icon: 'fa-globe',
    color: '#06b6d4',
    title: 'Anycast Cloud DNS Management',
    badge: 'MULTI-DOH',
    subtext: 'ns1/ns2.mdefender.pro'
  },
  {
    icon: 'fa-robot',
    color: '#c084fc',
    title: '639,000+ AI Prompt Injection Shield',
    badge: 'LLM GUARD',
    subtext: 'Adversarial Jailbreak Filter'
  },
  {
    icon: 'fa-chart-line',
    color: '#38bdf8',
    title: 'Real-Time SOC Attack Telemetry',
    badge: 'LIVE FEED',
    subtext: 'Sub-Millisecond Threat Logs'
  },
  {
    icon: 'fa-database',
    color: '#ef4444',
    title: 'SQL Injection (SQLi) Defense',
    badge: 'AST ENGINE',
    subtext: 'Syntax Tree Decomposition'
  },
  {
    icon: 'fa-code',
    color: '#f97316',
    title: 'Cross-Site Scripting (XSS) Shield',
    badge: 'WAF RULESET',
    subtext: 'DOM & Script Sanitizer'
  },
  {
    icon: 'fa-gauge-high',
    color: '#10b981',
    title: 'Single-Pass Edge Speed (0.12ms)',
    badge: 'ULTRA-LOW LATENCY',
    subtext: 'Zero Latency Proxy Penalty'
  },
  {
    icon: 'fa-arrows-rotate',
    color: '#818cf8',
    title: 'Continuous ML Retraining Loop',
    badge: 'ACTIVE LEARNING',
    subtext: 'Zero-Day Pattern Synthesis'
  }
]

// Track 2: Advanced Application Defense, WordPress Security & Access Controls
const TRACK_TWO_ITEMS = [
  {
    icon: 'fa-user-shield',
    color: '#38bdf8',
    title: 'MDefender Turnstile Bot Defense',
    badge: 'POW CHALLENGE',
    subtext: 'Zero-Captcha Human Verification'
  },
  {
    icon: 'fa-brands fa-wordpress',
    color: '#2563eb',
    title: 'WordPress Native Security Plugin',
    badge: 'DUAL-ENGINE RASP',
    subtext: 'On-Premise + Edge Proxy'
  },
  {
    icon: 'fa-fingerprint',
    color: '#a855f7',
    title: 'JA4+ TLS Client Fingerprinting',
    badge: 'BEHAVIORAL AI',
    subtext: 'Automated Bot & Scanner Ban'
  },
  {
    icon: 'fa-virus-slash',
    color: '#ef4444',
    title: 'Deep Malware & Web Shell Scanner',
    badge: 'HEURISTIC AST',
    subtext: 'PHP Backdoor Quarantine'
  },
  {
    icon: 'fa-layer-group',
    color: '#06b6d4',
    title: 'AST Semantic De-obfuscator',
    badge: 'DE-OBFUSCATION',
    subtext: 'Base64 & Hex Unpacker'
  },
  {
    icon: 'fa-stopwatch',
    color: '#f59e0b',
    title: 'Adaptive Token-Bucket Rate Limiter',
    badge: 'API THROTTLE',
    subtext: 'Burst Flood Protection'
  },
  {
    icon: 'fa-sliders',
    color: '#6366f1',
    title: 'Custom Regex Rule Authoring',
    badge: 'CUSTOM POLICIES',
    subtext: 'Zero-Day Emergency Rules'
  },
  {
    icon: 'fa-earth-americas',
    color: '#10b981',
    title: 'Geo-IP & Country-Based Filtering',
    badge: 'GEO-FENCING',
    subtext: 'Edge BGP Route-Level Ban'
  },
  {
    icon: 'fa-file-shield',
    color: '#38bdf8',
    title: 'Core & Plugin File Integrity (FIM)',
    badge: 'FIM RECOVERY',
    subtext: 'Tamper & Hash Diff Detection'
  },
  {
    icon: 'fa-terminal',
    color: '#ec4899',
    title: 'Command Injection & RCE Neutralizer',
    badge: 'CHAIN BLOCK',
    subtext: 'Subshell Execution Guard'
  },
  {
    icon: 'fa-folder-tree',
    color: '#eab308',
    title: 'Path Traversal & LFI/RFI Filter',
    badge: 'FILE INTEGRITY',
    subtext: 'Directory Access Boundary'
  },
  {
    icon: 'fa-desktop',
    color: '#818cf8',
    title: 'Multi-Domain Centralized SOC Console',
    badge: 'MULTI-TENANT',
    subtext: 'Real-Time Edge Telemetry'
  }
]

export default function SecurityTicker() {
  const { dark } = useTheme()

  // Duplicate arrays once to ensure seamless infinite looping without gaps
  const rowOneItems = useMemo(() => [...TRACK_ONE_ITEMS, ...TRACK_ONE_ITEMS], [])
  const rowTwoItems = useMemo(() => [...TRACK_TWO_ITEMS, ...TRACK_TWO_ITEMS], [])

  return (
    <section
      aria-label="MDefender Pro Security Services and Technologies Ticker"
      className="security-ticker-container"
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        background: dark
          ? 'linear-gradient(180deg, rgba(5, 8, 17, 0.98) 0%, rgba(10, 15, 29, 0.92) 50%, rgba(5, 8, 17, 0.98) 100%)'
          : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
        borderTop: dark ? '1px solid rgba(59, 130, 246, 0.14)' : '1px solid #e2e8f0',
        borderBottom: dark ? '1px solid rgba(59, 130, 246, 0.14)' : '1px solid #e2e8f0',
        padding: '24px 0 28px',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Top Telemetry Header Bar */}
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto 16px',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11.5px',
          color: dark ? '#94a3b8' : '#64748b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
              animation: 'pulse 2s infinite'
            }}
          />
          <span style={{ fontWeight: '800', letterSpacing: '0.06em', color: dark ? '#cbd5e1' : '#334155' }}>
            AUTONOMOUS DEFENSE FABRIC
          </span>
          <span style={{ color: dark ? '#475569' : '#cbd5e1' }}>&bull;</span>
          <span style={{ color: dark ? '#60a5fa' : '#2563eb', fontWeight: '700' }}>
            24 Connected Security Engines
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-microchip" style={{ color: '#818cf8', fontSize: '11px' }}></i>
            <span>6.5M+ Payload Neural Core</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-gauge-high" style={{ color: '#10b981', fontSize: '11px' }}></i>
            <span>0.12ms Edge Inspection</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-shield-check" style={{ color: '#38bdf8', fontSize: '11px' }}></i>
            <span>Zero-Day Retraining Loop Active</span>
          </span>
        </div>
      </div>

      {/* Track 1: Leftward Infinite Scroll */}
      <div
        className="ticker-fade-mask"
        style={{
          width: '100%',
          overflow: 'hidden',
          marginBottom: '10px',
          position: 'relative'
        }}
      >
        <div className="security-ticker-track-left">
          {rowOneItems.map((item, index) => (
            <div
              key={`r1-${index}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 16px',
                marginRight: '12px',
                borderRadius: '12px',
                background: dark ? 'rgba(15, 23, 42, 0.72)' : '#ffffff',
                border: dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = dark ? `${item.color}66` : item.color
                e.currentTarget.style.background = dark ? 'rgba(15, 23, 42, 0.95)' : '#f8fafc'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = dark
                  ? `0 6px 18px -4px ${item.color}33`
                  : '0 6px 16px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = dark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'
                e.currentTarget.style.background = dark ? 'rgba(15, 23, 42, 0.72)' : '#ffffff'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = dark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}35`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12.5px',
                  flexShrink: 0
                }}
              >
                <i className={`fas ${item.icon}`}></i>
              </div>

              {/* Title & Subtext */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: dark ? '#f1f5f9' : '#0f172a',
                    lineHeight: 1.3
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: dark ? '#94a3b8' : '#64748b',
                    lineHeight: 1.2
                  }}
                >
                  {item.subtext}
                </span>
              </div>

              {/* Badge */}
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: `${item.color}18`,
                  color: item.color,
                  border: `1px solid ${item.color}35`,
                  letterSpacing: '0.4px',
                  flexShrink: 0
                }}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Track 2: Rightward Infinite Scroll */}
      <div
        className="ticker-fade-mask"
        style={{
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div className="security-ticker-track-right">
          {rowTwoItems.map((item, index) => (
            <div
              key={`r2-${index}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 16px',
                marginRight: '12px',
                borderRadius: '12px',
                background: dark ? 'rgba(15, 23, 42, 0.72)' : '#ffffff',
                border: dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = dark ? `${item.color}66` : item.color
                e.currentTarget.style.background = dark ? 'rgba(15, 23, 42, 0.95)' : '#f8fafc'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = dark
                  ? `0 6px 18px -4px ${item.color}33`
                  : '0 6px 16px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = dark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'
                e.currentTarget.style.background = dark ? 'rgba(15, 23, 42, 0.72)' : '#ffffff'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = dark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}35`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12.5px',
                  flexShrink: 0
                }}
              >
                <i className={`fas ${item.icon}`}></i>
              </div>

              {/* Title & Subtext */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: dark ? '#f1f5f9' : '#0f172a',
                    lineHeight: 1.3
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: dark ? '#94a3b8' : '#64748b',
                    lineHeight: 1.2
                  }}
                >
                  {item.subtext}
                </span>
              </div>

              {/* Badge */}
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: `${item.color}18`,
                  color: item.color,
                  border: `1px solid ${item.color}35`,
                  letterSpacing: '0.4px',
                  flexShrink: 0
                }}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
