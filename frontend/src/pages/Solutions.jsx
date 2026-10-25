import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import {
  Shield,
  ArrowRight,
  Check,
  Activity,
  Layers,
  Lock,
  Globe,
  Radio,
  Zap,
  Cpu,
  Server,
  Database,
  Terminal,
  Award,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  Cloud,
  FileCode,
  Bot,
  Scale,
  Code2,
  ChevronRight,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function Solutions() {
  const solutionsDirectory = [
    {
      slug: 'agencies',
      badge: 'DIGITAL AGENCIES & MULTI-SITE FLEETS',
      title: 'Centralized Multi-Site WordPress Fleet SaaS',
      subtitle: 'Eliminate tedious manual logins across dozens of client wp-admin dashboards. Govern your entire WordPress fleet from one sovereign cloud console with automated snapshots, zero-downtime rollbacks, and concurrent remote malware scanning.',
      icon: Layers,
      accentColor: '#4ADE80',
      tagline: '1-Click Updates · <800ms Rollback · 5.2M+ Integrity DB',
      stats: [
        { label: 'Bulk Dispatch', value: '1-Click Entire Fleet' },
        { label: 'Auto-Rollback', value: '< 800ms In-Memory' },
        { label: 'Integrity DB', value: '5.2M+ Checksums' }
      ],
      highlights: [
        'Centralized sovereign command console for 10 to 100+ client sites',
        'Autonomous safe updates with synthetic HTTP health validation',
        'Zero-server CPU malware scanning against official WordPress.org hashes',
        'White-label monthly client security PDF report generation'
      ],
      link: '/solutions/agencies'
    },
    {
      slug: 'ecommerce',
      badge: 'HIGH-VELOCITY RETAIL & E-COMMERCE',
      title: 'High-Velocity Retail & Checkout Protection',
      subtitle: 'Stop scalper bots, protect high-traffic flash sales, and eliminate cart abandonment. Intercept malicious queries and card testing attacks at line-rate edge in under 0.08ms without slowing checkout conversions.',
      icon: ShoppingCart,
      accentColor: '#FB923C',
      tagline: '0.08ms Checkout · Scalper Bot Shield · PCI-DSS 4.0 Sec 6.4.3',
      stats: [
        { label: 'Checkout Latency', value: '< 0.08ms DFA' },
        { label: 'Scalper Trap Rate', value: '99.8%' },
        { label: 'DDoS Capacity', value: '42.8 Tbps' }
      ],
      highlights: [
        'Zero-friction cryptographic turnstile replacing intrusive CAPTCHAs',
        'Token-bucket rate limiter halting scalpers and inventory hoarders',
        'PCI-DSS 4.0 inline script integrity preventing Magecart card theft',
        'Sub-millisecond fast-path lifting checkout conversion rates'
      ],
      link: '/solutions/ecommerce'
    },
    {
      slug: 'saas',
      badge: 'CLOUD SAAS & DEVELOPER APIS',
      title: 'Zero-Latency API Shielding & Microservices Ingress',
      subtitle: 'Defend REST, GraphQL, and microservice backends against SQLi evasion, JSON injection, and noisy-neighbor volumetric abuse with abstract syntax tree (AST) normalization.',
      icon: Cloud,
      accentColor: '#38BDF8',
      tagline: 'AST Grammar Normalization · Per-Tenant Token Bucket · Anycast PoPs',
      stats: [
        { label: 'Edge Inspection', value: '0.08ms – 0.12ms' },
        { label: 'JSON Tree Recursion', value: 'Zero False Positives' },
        { label: 'PoP Network', value: '240+ Anycast PoPs' }
      ],
      highlights: [
        'AST syntactic normalizer defeating comment-splitting and hex bypasses',
        'Multi-tenant token-bucket rate limiting isolating API tenant quotas',
        'Low-latency BGP Anycast terminating TLS 1.3 at nearest global edge',
        'Automated OpenAPI / Swagger schema parameter type validation'
      ],
      link: '/solutions/saas'
    },
    {
      slug: 'wordpress',
      badge: 'WORDPRESS SOVEREIGN DEFENSE',
      title: 'In-Memory WordPress RASP & Host Hardening',
      subtitle: 'Shield WordPress sites at Priority 1 in memory before MySQL queries or heavy theme templates load. Stop XML-RPC floods, virtual patch unpatched plugin CVEs, and enforce sovereign host hardening.',
      icon: FileCode,
      accentColor: '#4ADE80',
      tagline: 'Priority 1 RASP Hook · Zero Origin CPU · Virtual Patching',
      stats: [
        { label: 'Hook Priority', value: 'Priority 1 (mu-plugin)' },
        { label: 'PHP Overhead', value: '< 0.05ms Memory' },
        { label: 'Integrity Check', value: '5,214,098 Hashes' }
      ],
      highlights: [
        'Runtime Application Self-Protection (RASP) dropping attacks in memory',
        '5.2M+ official WordPress.org core & plugin cryptographic checksum scan',
        'Zero-origin XML-RPC and wp-login.php brute force absorber',
        'Autonomous safe updates with instant atomic rollback guarantee'
      ],
      link: '/solutions/wordpress'
    },
    {
      slug: 'ai',
      badge: 'GENERATIVE AI & LLM SYSTEMS',
      title: 'AI Gateway & Prompt Injection Shield',
      subtitle: 'Protect LLM applications, RAG pipelines, and conversational agents from adversarial prompt injections, system prompt theft, PII exfiltration, and automated model denial-of-wallet.',
      icon: Bot,
      accentColor: '#C084FC',
      tagline: 'Semantic AST Prompt Classifier · Token Budget Firewall · PII Masking',
      stats: [
        { label: 'Classifier Latency', value: '< 0.8ms Line-Rate' },
        { label: 'Detection Precision', value: '99.85%' },
        { label: 'Wire Compatibility', value: 'OpenAI / Anthropic' }
      ],
      highlights: [
        'Semantic AST prompt classifier intercepting direct and roleplay jailbreaks',
        'Token budget firewall preventing runaway Denial-of-Wallet billing spikes',
        'Real-time PII auto-masking before sensitive data enters LLM context',
        'Drop-in universal reverse proxy for OpenAI, Claude, and private vLLM'
      ],
      link: '/solutions/ai'
    },
    {
      slug: 'fintech',
      badge: 'FINTECH, BANKING & HEALTHCARE',
      title: 'Institutional Compliance & Sovereign Data Residency',
      subtitle: 'Satisfy rigorous PCI-DSS 4.0 Section 6.4, SOC2 Type II, HIPAA, and GDPR mandates with immutable cryptographic audit logging, geographic geo-fencing, and five-nines enterprise SLAs.',
      icon: Scale,
      accentColor: '#FACC15',
      tagline: 'SHA-256 Audit Stream · Geo-Fenced Scrubbing · 99.999% SLA',
      stats: [
        { label: 'Contract SLA', value: '99.999% Uptime' },
        { label: 'Audit Trail', value: 'SHA-256 Ledger' },
        { label: 'Incident Response', value: '15-Minute Dedicated' }
      ],
      highlights: [
        'Immutable cryptographic audit logging with SHA-256 block hash chaining',
        'Sovereign geographic traffic fencing keeping packet inspection in-region',
        'Automated PCI-DSS 4.0 Section 6.4.3 script integrity attestation',
        'Dedicated HSM key management and 15-minute emergency SLA'
      ],
      link: '/solutions/fintech'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== HERO SECTION ===================== */}
      <section style={{
        paddingTop: 'calc(76px + 64px)',
        paddingBottom: '72px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(40, 116, 93, 0.08), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)', textAlign: 'center' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: '#E8EEE8',
            border: '1px solid #D9E1DC',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0B2522',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '20px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
            <span>Enterprise Targeted Architectures</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 4.6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: '-0.05em',
            color: '#10201E',
            maxWidth: '920px',
            margin: '0 auto 20px auto'
          }}>
            Tailored Security Solutions.{' '}
            <span style={{ color: '#E8792F' }}>Built for Your Exact Workload.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 1.8vw, 18px)',
            lineHeight: 1.6,
            color: '#4A5D5A',
            maxWidth: '760px',
            margin: '0 auto 36px auto'
          }}>
            Every workload demands distinct defensive engineering. Explore our dedicated, comprehensive solution suites for Digital Agencies, High-Velocity E-Commerce, Cloud APIs, WordPress Sovereign Defense, Generative AI, and Regulated FinTech.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '40px' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 26px',
                height: '46px',
                borderRadius: '10px',
                background: '#0B2522',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)'
              }}
            >
              <span>Deploy Autonomous Shield</span>
              <ArrowRight size={14} strokeWidth={2.4} />
            </Link>

            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 22px',
                height: '46px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1.5px solid #CBD8CF',
                color: '#10201E',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Compare Enterprise Tiers</span>
            </Link>
          </div>

          {/* Trust Matrix Strip */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'clamp(16px, 3vw, 32px)',
            fontSize: '13px',
            color: '#4A5D5A',
            fontWeight: 600,
            padding: '16px 24px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #D9E1DC',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
            maxWidth: '960px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} style={{ color: '#E8792F' }} />
              <span>&lt;0.12ms Edge Latency</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} style={{ color: '#28745D' }} />
              <span>Autonomous AST &amp; Machine Learning Core</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} style={{ color: '#28745D' }} />
              <span>240+ Anycast PoPs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} style={{ color: '#E8792F' }} />
              <span>Zero Origin Compute Waste</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== EXPANSIVE 6-SOLUTION DIRECTORY (NO SHORTCUTS) ===================== */}
      <section style={{ padding: '80px 0 100px 0', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 60px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Dedicated Architectural Portals
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.05em', marginBottom: '14px' }}>
              Select a Dedicated Solution Page
            </h2>
            <p style={{ fontSize: '16px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Each solution features a unique, dedicated architecture page with interactive testbenches, live telemetry simulators, and full engineering specifications.
            </p>
          </div>

          {/* 6 Comprehensive Solution Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
            {solutionsDirectory.map((sol) => {
              const IconComp = sol.icon;
              return (
                <div
                  key={sol.slug}
                  style={{
                    background: '#FAF9F5',
                    borderRadius: '20px',
                    border: '1.5px solid #E2DDD5',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.22s ease',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10201E';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2DDD5';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: '#10201E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}>
                        <IconComp size={22} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#E8792F', letterSpacing: '0.1em' }}>
                        {sol.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#10201E', marginBottom: '10px', lineHeight: 1.2 }}>
                      {sol.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#4A5D5A', lineHeight: 1.6, marginBottom: '22px' }}>
                      {sol.subtitle}
                    </p>

                    {/* Stats Pill Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      padding: '12px',
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2DDD5',
                      marginBottom: '22px',
                      textAlign: 'center'
                    }}>
                      {sol.stats.map((st, i) => (
                        <div key={i}>
                          <div style={{ fontSize: '10px', color: '#7A8C89', textTransform: 'uppercase' }}>{st.label}</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#10201E' }}>{st.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Key Technical Highlights */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        Core Architectural Capabilities:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sol.highlights.map((hl, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#4A5D5A', lineHeight: 1.4 }}>
                            <CheckCircle2 size={14} style={{ color: '#28745D', flexShrink: 0, marginTop: '2px' }} />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Page Button */}
                  <Link
                    to={sol.link}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: '#10201E',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#28745D'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#10201E'; }}
                  >
                    <span>Explore Full Dedicated Architecture</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== DEPLOYMENT OPTIONS SECTION ===================== */}
      <section style={{ padding: '80px 0', background: '#F7F6F1', borderTop: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#28745D', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Ingress Compatibility
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Zero-Friction Ingress Architecture Patterns
            </h2>
            <p style={{ fontSize: '15px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Deploy MDefender Pro without refactoring your codebase. Select from smart Anycast DNS delegation, native WordPress RASP, NGINX reverse proxy, or programmatic SDK middleware.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              {
                title: 'Smart Anycast DNS',
                badge: 'ZERO CODE · 3 MIN',
                desc: 'Point authoritative nameservers to MDefender Pro Anycast mesh. Inbound requests are instantly pre-screened before hitting origin.',
                spec: '< 0.12ms Edge Latency · Automatic DoH'
              },
              {
                title: 'WordPress RASP Agent',
                badge: 'IN-MEMORY · 1-CLICK',
                desc: 'Install the official MDefender Pro WordPress plugin. Intercepts queries at Priority 1 in memory before MySQL execution.',
                spec: '< 0.05ms PHP overhead · 5.2M+ Hashes'
              },
              {
                title: 'NGINX & Envoy Ingress',
                badge: 'HIGH-THROUGHPUT PROXY',
                desc: 'Drop our lightweight reverse proxy configuration into Kubernetes ingress controllers, Traefik, or HAProxy.',
                spec: 'Line-rate throughput · Header validation'
              },
              {
                title: 'Asynchronous SDK Middleware',
                badge: 'DEVELOPER EMBEDDED',
                desc: 'Embed directly into ASGI / WSGI applications (FastAPI, Express.js, Go Gin) for in-process sub-millisecond inspection.',
                spec: 'Zero-copy buffers · Non-blocking event loop'
              }
            ].map((dep, idx) => (
              <div key={idx} style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #D9E1DC',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#E8792F', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    {dep.badge}
                  </div>
                  <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#10201E', marginBottom: '8px' }}>
                    {dep.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#4A5D5A', lineHeight: 1.5, marginBottom: '16px' }}>
                    {dep.desc}
                  </p>
                </div>
                <div style={{ paddingTop: '12px', borderTop: '1px solid #ECEEEA', fontSize: '11px', color: '#28745D', fontWeight: 600, fontFamily: 'monospace' }}>
                  {dep.spec}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL ENTERPRISE CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Elevate your application security today.
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Deploy in minutes with our free trial or speak directly with an enterprise solutions architect.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 28px',
                height: '48px',
                borderRadius: '10px',
                background: '#4ADE80',
                color: '#0B2522',
                fontSize: '14px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)'
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 22px',
                height: '48px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Compare Pricing &amp; SLAs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
