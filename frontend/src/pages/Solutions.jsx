import { useState } from 'react';
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
  Play,
  Download,
  ExternalLink,
  ShoppingCart,
  Cloud,
  FileCode,
  Bot,
  Scale,
  Code2,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export default function Solutions() {
  // Selected Solution Workload
  const [activeSolution, setActiveSolution] = useState('ecommerce');

  // Selected Deployment Pattern
  const [activeDeployment, setActiveDeployment] = useState('anycast_dns');

  // Interactive Solutions Data by Industry / Use-Case
  const solutionsData = {
    ecommerce: {
      id: 'ecommerce',
      badge: 'E-COMMERCE & WOOCOMMERCE',
      title: 'High-Velocity Retail & Checkout Protection',
      subtitle: 'Eliminate cart abandonment from slow security tools. Shield flash sales from scalper bots, inventory hoarders, and fraudulent carding attacks in under 0.12ms.',
      icon: ShoppingCart,
      stats: [
        { label: 'Flash Sale Capacity', value: '42.8 Tbps' },
        { label: 'Checkout Latency', value: '< 0.08ms' },
        { label: 'Bot Mitigation Rate', value: '99.8%' },
      ],
      challenges: [
        'Automated credential stuffing and carding attacks flood payment gateways, triggering costly merchant chargebacks.',
        'Heavy traditional security plugins add 150ms–300ms delays to checkout pages, killing conversion rates.',
        'Scalper bots deplete high-demand promotional inventory before legitimate customers can complete checkout.',
      ],
      solutionFeatures: [
        {
          title: 'Zero-Friction Cryptographic Turnstile',
          desc: 'Replaces frustrating image CAPTCHAs on login and payment forms with an invisible proof-of-work challenge.',
        },
        {
          title: 'Token-Bucket Rate Limiter',
          desc: 'Prevents card testing and inventory scraping by enforcing granular per-IP and per-session transaction limits.',
        },
        {
          title: 'Sub-Millisecond Edge Fast Path',
          desc: 'Evaluates requests in 0.08ms, ensuring lightning-fast product catalog browsing and instant checkout responses.',
        },
      ],
      testimonial: {
        quote: 'During our Black Friday campaign, MDefender Pro absorbed 3.4M hostile bot requests with zero checkout slowdown and 100% merchant uptime.',
        author: 'Head of Infrastructure, Global Retail Group',
      },
      recommendedPlan: 'Enterprise Pro',
      planLink: '/pricing',
    },
    saas_apis: {
      id: 'saas_apis',
      badge: 'SAAS PLATFORMS & CLOUD APIS',
      title: 'Zero-Latency API Shielding & DDoS Immunity',
      subtitle: 'Protect REST, GraphQL, and microservice APIs against volumetric floods, SQL injection evasion, and broken object level authorization (BOLA) attempts.',
      icon: Cloud,
      stats: [
        { label: 'ML Vector Model', value: '6.5M+ vectors' },
        { label: 'Inspection Speed', value: '0.12ms' },
        { label: 'SLA Availability', value: '99.999%' },
      ],
      challenges: [
        'API scrapers and automated credential fuzzers drain backend database connections and compute capacity.',
        'Legacy WAF regex engines struggle with nested JSON payloads, leading to false positives or SQL injection evasion.',
        'High packet inspection overhead degrades real-time SaaS customer experience and increases API latency.',
      ],
      solutionFeatures: [
        {
          title: 'AST Syntactic Normalization',
          desc: 'Parses SQL and JSON syntax trees natively, preventing bypass attempts via comment splitting and hex encoding.',
        },
        {
          title: 'Multi-Tenant Token Isolation',
          desc: 'Isolates API tenant quotas and prevents "noisy neighbor" volumetric attacks from impacting critical customers.',
        },
        {
          title: 'Low-Latency Anycast Routing',
          desc: 'Routes international developer traffic to the nearest of 180+ global PoPs for TLS 1.3 handshake optimization.',
        },
      ],
      testimonial: {
        quote: 'Integrating MDefender Pro directly into our FastAPI backend eliminated database spikes caused by automated exploit scanners with zero code refactoring.',
        author: 'VP of Engineering, Cloud Analytics SaaS',
      },
      recommendedPlan: 'Developer Go & Enterprise',
      planLink: '/pricing',
    },
    wordpress: {
      id: 'wordpress',
      badge: 'WORDPRESS & CMS FLEETS',
      title: 'Deep In-Memory RASP & Malware Quarantine',
      subtitle: 'The only security architecture unifying cloud edge Anycast proxying with native PHP runtime defense. Neutralize zero-days and webshells before database or file writes.',
      icon: FileCode,
      stats: [
        { label: 'PHP Hook Priority', value: 'Priority 1' },
        { label: 'AST Malware Engine', value: 'Real-time' },
        { label: 'Virtual 0-Day Patch', value: '< 2 mins' },
      ],
      challenges: [
        'Outdated plugins and theme vulnerabilities account for over 90% of all WordPress compromises and web shells.',
        'Traditional PHP security plugins load after the database initializes, consuming server CPU and crashing MySQL under attack.',
        'Manual patching of multi-site WordPress installations leaves critical zero-day exposure windows.',
      ],
      solutionFeatures: [
        {
          title: 'Priority 1 In-Memory Pre-Write Barrier',
          desc: 'Hooks at `plugins_loaded` Priority 1, intercepting malicious payloads before MySQL execution or disk I/O.',
        },
        {
          title: 'AST Webshell & eval() Detection',
          desc: 'Identifies base64-encoded, gzinflated, and polymorphic PHP backdoors that bypass traditional file scanners.',
        },
        {
          title: '1-Click Virtual Zero-Day Patching',
          desc: 'Deploys cloud-level mitigation rules fleetwide within minutes of a newly disclosed CVE without touching code.',
        },
      ],
      testimonial: {
        quote: 'The dual-layer approach saved our 40+ client sites from a critical theme zero-day vulnerability hours before the official patch was released.',
        author: 'Digital Agency Technical Director',
      },
      recommendedPlan: 'Developer Go & Pro',
      planLink: '/pricing',
    },
    ai_llm: {
      id: 'ai_llm',
      badge: 'GENERATIVE AI & LLM WORKLOADS',
      title: 'Prompt Injection Shield & Model Jailbreak Defense',
      subtitle: 'Safeguard LLM wrappers, AI agents, and RAG architectures from adversarial prompt injection, credential exfiltration, and toxic prompt hijacking.',
      icon: Bot,
      stats: [
        { label: 'Jailbreak Vectors', value: '639K+ Corpus' },
        { label: 'In-Flight Filtering', value: '< 0.15ms' },
        { label: 'Token Waste Saved', value: '100% on drops' },
      ],
      challenges: [
        'Adversaries use roleplay prompts and system instruction overrides to exfiltrate private credentials and backend API keys.',
        'High-volume prompt flooding consumes expensive LLM API tokens and causes upstream rate limits.',
        'Unfiltered inputs allow malicious actors to manipulate autonomous AI agents into executing unauthorized actions.',
      ],
      solutionFeatures: [
        {
          title: '639K+ Vector LLM Guard',
          desc: 'Pre-screen incoming prompts using our character n-gram model trained on known jailbreaks, Dan vectors, and system leak attempts.',
        },
        {
          title: 'In-Flight Prompt Sanitization',
          desc: 'Blocks adversarial instructions before they reach upstream LLM providers, avoiding expensive token consumption.',
        },
        {
          title: 'PII Redaction & Output Guard',
          desc: 'Inspects model responses in real-time to prevent inadvertent leaks of server environment variables or database schema.',
        },
      ],
      testimonial: {
        quote: 'MDefender Pro gives our enterprise enterprise customers peace of mind that our conversational AI agents cannot be jailbroken or prompt-manipulated.',
        author: 'Founder & CTO, Enterprise AI Studio',
      },
      recommendedPlan: 'Enterprise Pro',
      planLink: '/pricing',
    },
    compliance: {
      id: 'compliance',
      badge: 'FINTECH, HEALTHCARE & REGULATED ENTITIES',
      title: 'SOC2 Type II, ISO 27001 & HIPAA Compliance',
      subtitle: 'Turnkey edge security and immutable audit telemetry designed to meet stringent banking, healthcare, and enterprise data governance frameworks.',
      icon: Scale,
      stats: [
        { label: 'Audit Log Retention', value: '365 Days' },
        { label: 'Compliance Standards', value: 'SOC2 / HIPAA' },
        { label: 'Data Sovereignty', value: 'Edge Geofenced' },
      ],
      challenges: [
        'Regulatory auditors require rigorous proof of edge traffic encryption, web vulnerability mitigation, and access control.',
        'Fragmented security tools result in compliance gaps, disparate log storage, and failed SOC2 or HIPAA audits.',
        'Strict data residency mandates require packet inspection within specific geographical jurisdictions.',
      ],
      solutionFeatures: [
        {
          title: 'Immutable Audit Telemetry',
          desc: 'Tamper-evident, timestamped event logging with real-time export to Splunk, Datadog, or external SIEM systems.',
        },
        {
          title: 'Geographic Traffic Fencing',
          desc: 'Enforce country-level routing policies and ensure packet inspection occurs strictly within compliant jurisdictions.',
        },
        {
          title: 'End-to-End TLS 1.3 Cryptography',
          desc: 'Guaranteed modern cipher suites, automated Let\'s Encrypt renewal, and strict HSTS policy enforcement.',
        },
      ],
      testimonial: {
        quote: 'Passing our SOC2 Type II audit was seamless thanks to MDefender Pro\'s automated reporting, WAF policies, and structured audit logs.',
        author: 'Chief Information Security Officer, FinTech Corp',
      },
      recommendedPlan: 'Dedicated Enterprise',
      planLink: '/pricing',
    },
  };

  // Deployment Patterns Data
  const deploymentPatterns = {
    anycast_dns: {
      title: 'Smart Anycast DNS Delegation',
      badge: 'ZERO CODE CHANGES · 5 MIN SETUP',
      desc: 'Point your domain DNS records to MDefender Pro Anycast nameservers. Inbound traffic is instantly routed through our 180+ global scrubbing centers.',
      latency: '< 0.12ms',
      setupTime: '3 Minutes',
      compatibleWith: 'Any website, static host, AWS, GCP, Cloudflare, DigitalOcean',
      code: `; Step 1: Update your domain registrar NS records
; Change authoritative nameservers to MDefender Pro:
ns1.mdefender.net
ns2.mdefender.net

; Step 2: Automatic DoH Discovery identifies existing records:
@     IN  A     217.15.170.82   ; Proxied via MDefender Edge
www   IN  CNAME mdefender-edge   ; Proxied via MDefender Edge
mail  IN  MX    10 mail.host.com ; Direct DNS routing`,
    },
    wordpress_plugin: {
      title: 'Native WordPress RASP Agent',
      badge: 'IN-MEMORY DEFENSE · 1-CLICK SYNC',
      desc: 'Install the official MDefender Pro WordPress plugin. Intercepts malicious queries and file uploads at Priority 1 before reaching MySQL or disk storage.',
      latency: '< 0.05ms PHP overhead',
      setupTime: '1 Minute',
      compatibleWith: 'WordPress 6.0+, WooCommerce, multisite, Apache, NGINX, LiteSpeed',
      code: `// MDefender Pro RASP Hook Interception (Priority 1)
add_action('plugins_loaded', function() {
    $waf = MDefender_WAF::get_instance();
    $result = $waf->inspect_request($_SERVER, $_GET, $_POST, $_COOKIE);
    
    if ($result->is_malicious()) {
        // Drop payload in memory, render branded 403, and auto-blacklist IP
        $waf->terminate_with_block_page($result);
        exit;
    }
}, 1);`,
    },
    reverse_proxy: {
      title: 'NGINX & Cloud Gateway Ingress',
      badge: 'HIGH-THROUGHPUT REVERSE PROXY',
      desc: 'Drop our lightweight NGINX or Envoy configuration block into your reverse proxy or Kubernetes ingress controller.',
      latency: '< 0.10ms',
      setupTime: '5 Minutes',
      compatibleWith: 'NGINX, Traefik, HAProxy, Envoy, Kubernetes Ingress',
      code: `# /etc/nginx/conf.d/mdefender_edge.conf
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # Trust MDefender Pro Anycast Scrubbing IPs
    set_real_ip_from 103.21.244.0/22;
    real_ip_header X-Forwarded-For;

    location / {
        proxy_pass http://internal_upstream;
        proxy_set_header X-MDefender-Verified "true";
        proxy_set_header Host $host;
    }
}`,
    },
    sdk_middleware: {
      title: 'Programmatic SDK Middleware',
      badge: 'DIRECT APPLICATION EMBEDDING',
      desc: 'Integrate MDefender Pro directly into modern microservices using our asynchronous ASGI/WSGI and Express middleware.',
      latency: '< 0.08ms in-process',
      setupTime: '10 Minutes',
      compatibleWith: 'FastAPI, Django, Express.js, Laravel, Go Gin',
      code: `# FastAPI ASGI Middleware Integration
from fastapi import FastAPI, Request
from mdefender.middleware import MDefenderShield

app = FastAPI()

app.add_middleware(
    MDefenderShield,
    api_key="sk_live_enterprise_...",
    block_threshold=80,
    enable_ml_neural=True,
    enable_turnstile=True
)`,
    },
  };

  const selectedSolutionData = solutionsData[activeSolution];
  const selectedDeploymentData = deploymentPatterns[activeDeployment];
  const IconComponent = selectedSolutionData.icon;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F6F1',
        color: '#10201E',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Subtle Ambient Background Gradients */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '720px',
          height: '640px',
          background: 'radial-gradient(circle at 80% 15%, rgba(232, 238, 232, 0.6) 0%, rgba(247, 246, 241, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '140px',
          left: 0,
          width: '560px',
          height: '560px',
          background: 'radial-gradient(circle at 15% 30%, rgba(234, 244, 255, 0.45) 0%, rgba(247, 246, 241, 0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Global Clean Public Navbar */}
      <PublicNavbar />

      <main id="main-content">
        {/* ===================== HERO SECTION ===================== */}
        <section
          style={{
            paddingTop: 'calc(76px + 64px)',
            paddingBottom: '72px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 36px)',
              textAlign: 'center',
            }}
          >
            {/* Eyebrow Badge */}
            <div
              style={{
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
                marginBottom: '20px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
              <span>Enterprise Solutions &amp; Threat Mitigation</span>
            </div>

            {/* Main Heading */}
            <h1
              style={{
                fontSize: 'clamp(40px, 4.8vw, 68px)',
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.06em',
                color: '#10201E',
                marginBottom: '20px',
                maxWidth: '920px',
                margin: '0 auto 20px auto',
              }}
            >
              Engineered for modern workloads.{' '}
              <span style={{ color: '#E8792F' }}>Tailored to your architecture.</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(16px, 1.8vw, 18px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                maxWidth: '760px',
                margin: '0 auto 36px auto',
              }}
            >
              Whether you are protecting high-volume WooCommerce checkouts, distributed SaaS APIs, multi-tenant media fleets, or Generative AI prompts, MDefender Pro delivers sub-millisecond defense without operational complexity.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '48px',
              }}
            >
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
                  fontSize: '13.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#153B34';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0B2522';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Deploy autonomous solution</span>
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
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E8EEE8';
                  e.currentTarget.style.borderColor = '#10201E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#CBD8CF';
                }}
              >
                <span>Compare enterprise tiers</span>
              </Link>
            </div>

            {/* 4 Trust Highlights Strip */}
            <div
              style={{
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
                margin: '0 auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} style={{ color: '#E8792F' }} />
                <span>&lt;0.12ms Edge Latency</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} style={{ color: '#28745D' }} />
                <span>6,501,208+ ML Neural Dataset</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} style={{ color: '#28745D' }} />
                <span>180+ Anycast PoPs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: '#E8792F' }} />
                <span>Zero Origin Overhead</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== INTERACTIVE INDUSTRY & WORKLOAD MATRIX ===================== */}
        <section
          id="industry-solutions"
          style={{
            padding: '80px 0 96px 0',
            background: '#ffffff',
            borderTop: '1px solid #D9E1DC',
            borderBottom: '1px solid #D9E1DC',
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 36px)',
            }}
          >
            {/* Section Header */}
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px auto' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '10px',
                }}
              >
                Targeted Architecture Solutions
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 44px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.1,
                  marginBottom: '14px',
                }}
              >
                Choose Your Application Profile
              </h2>
              <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
                Select an industry or technical workload below to explore tailored defenses, performance benchmarks, and deployment patterns.
              </p>
            </div>

            {/* Workload Selector Tabs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '36px',
              }}
            >
              {Object.keys(solutionsData).map((key) => {
                const item = solutionsData[key];
                const isSelected = activeSolution === key;
                const TabIcon = item.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSolution(key)}
                    style={{
                      background: isSelected ? '#0B2522' : '#F7F6F1',
                      color: isSelected ? '#ffffff' : '#10201E',
                      border: isSelected ? '1.5px solid #0B2522' : '1px solid #D9E1DC',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isSelected ? '0 4px 14px rgba(11, 37, 34, 0.14)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <TabIcon size={15} style={{ color: isSelected ? '#E8792F' : '#4A5D5A' }} />
                    <span>{item.badge.split('&')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Solution Canvas Card */}
            <div
              style={{
                background: '#F7F6F1',
                borderRadius: '20px',
                border: '1.5px solid #CBD8CF',
                boxShadow: '0 20px 50px rgba(11, 37, 34, 0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Header Bar of the Solution Card */}
              <div
                style={{
                  background: '#0B2522',
                  padding: '24px 32px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#E8792F',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      marginBottom: '4px',
                    }}
                  >
                    {selectedSolutionData.badge}
                  </div>
                  <h3
                    style={{
                      fontSize: 'clamp(22px, 2.6vw, 28px)',
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '-0.04em',
                      margin: 0,
                    }}
                  >
                    {selectedSolutionData.title}
                  </h3>
                </div>

                <Link
                  to={selectedSolutionData.planLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#E8792F',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#BD642B')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#E8792F')}
                >
                  <span>Recommended: {selectedSolutionData.recommendedPlan}</span>
                  <ArrowRight size={13} strokeWidth={2.4} />
                </Link>
              </div>

              {/* Solution Card Body */}
              <div style={{ padding: '36px clamp(20px, 4vw, 42px)' }}>
                {/* Subtitle Description */}
                <p
                  style={{
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#344844',
                    marginBottom: '32px',
                    maxWidth: '880px',
                  }}
                >
                  {selectedSolutionData.subtitle}
                </p>

                {/* 3 Metrics Badges */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '36px',
                  }}
                >
                  {selectedSolutionData.stats.map((st, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid #D9E1DC',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#6A7E7A', fontWeight: 600, marginBottom: '4px' }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#10201E' }}>
                        {st.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Two Column Grid: Vulnerability Challenges vs MDefender Defenses */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '28px',
                    marginBottom: '36px',
                  }}
                >
                  {/* Left: The Challenge */}
                  <div
                    style={{
                      background: '#FFF4ED',
                      borderRadius: '14px',
                      padding: '24px',
                      border: '1px solid #F5C6A5',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#A34F22',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>The Architecture Vulnerabilities</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {selectedSolutionData.challenges.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13.5px', color: '#4A3528', lineHeight: 1.5 }}>
                          <span style={{ color: '#A34F22', fontWeight: 700 }}>&bull;</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: The MDefender Defense */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      padding: '24px',
                      border: '1px solid #CBD8CF',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#28745D',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>The MDefender Pro Countermeasures</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {selectedSolutionData.solutionFeatures.map((f, i) => (
                        <div key={i}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10201E', marginBottom: '2px' }}>
                            {f.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#4A5D5A', lineHeight: 1.5 }}>
                            {f.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Customer Quote Box */}
                <div
                  style={{
                    background: '#E8EEE8',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#0B2522',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontStyle: 'italic', color: '#10201E', marginBottom: '4px' }}>
                      "{selectedSolutionData.testimonial.quote}"
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#4A5D5A' }}>
                      &mdash; {selectedSolutionData.testimonial.author}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== INTERACTIVE DEPLOYMENT ARCHITECTURE EXPLORER ===================== */}
        <section
          style={{
            padding: '96px 0',
            background: '#F7F6F1',
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 36px)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px auto' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '10px',
                }}
              >
                Frictionless Integration
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 44px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.1,
                  marginBottom: '14px',
                }}
              >
                Choose Your Deployment Pattern
              </h2>
              <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
                Deploy at the cloud edge via DNS proxy, install deep in-memory WordPress RASP, or embed directly into your microservices via our SDK.
              </p>
            </div>

            {/* Pattern Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                marginBottom: '28px',
              }}
            >
              {Object.keys(deploymentPatterns).map((patternKey) => {
                const pat = deploymentPatterns[patternKey];
                const isSelected = activeDeployment === patternKey;
                return (
                  <button
                    key={patternKey}
                    onClick={() => setActiveDeployment(patternKey)}
                    style={{
                      background: isSelected ? '#0B2522' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#10201E',
                      border: isSelected ? '1.5px solid #0B2522' : '1px solid #D9E1DC',
                      padding: '16px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 6px 20px rgba(11, 37, 34, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#E8792F' : '#6A7E7A', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {pat.badge.split('·')[0]}
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 700 }}>
                      {pat.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Deployment Detail Canvas */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #CBD8CF',
                boxShadow: '0 16px 40px rgba(11, 37, 34, 0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 0.9fr',
                  gap: '0',
                }}
                className="deployment-grid"
              >
                {/* Left Description */}
                <div style={{ padding: '32px' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#E8EEE8',
                      color: '#0B2522',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {selectedDeploymentData.badge}
                  </div>

                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#10201E', marginBottom: '12px' }}>
                    {selectedDeploymentData.title}
                  </h3>

                  <p style={{ fontSize: '14.5px', color: '#4A5D5A', lineHeight: 1.6, marginBottom: '24px' }}>
                    {selectedDeploymentData.desc}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: '#F7F6F1', padding: '12px', borderRadius: '8px', border: '1px solid #D9E1DC' }}>
                      <div style={{ fontSize: '10.5px', color: '#6A7E7A', fontWeight: 600 }}>Inspection Overhead</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#28745D' }}>
                        {selectedDeploymentData.latency}
                      </div>
                    </div>
                    <div style={{ background: '#F7F6F1', padding: '12px', borderRadius: '8px', border: '1px solid #D9E1DC' }}>
                      <div style={{ fontSize: '10.5px', color: '#6A7E7A', fontWeight: 600 }}>Estimated Setup</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10201E' }}>
                        {selectedDeploymentData.setupTime}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12.5px', color: '#4A5D5A', marginBottom: '24px' }}>
                    <strong>Compatible Environments:</strong> {selectedDeploymentData.compatibleWith}
                  </div>

                  <Link
                    to="/docs"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#E8792F',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View integration guide</span>
                    <ArrowRight size={13} strokeWidth={2.4} />
                  </Link>
                </div>

                {/* Right Code Block */}
                <div
                  style={{
                    background: '#10201E',
                    padding: '24px',
                    borderLeft: '1px solid #D9E1DC',
                    overflowX: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#8EA29C', fontFamily: 'monospace' }}>
                      configuration-sample
                    </span>
                    <span style={{ fontSize: '10px', background: '#0B2522', color: '#28745D', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      VERIFIED DEPLOYMENT
                    </span>
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      color: '#E8EEE8',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: '12px',
                      lineHeight: 1.55,
                      whiteSpace: 'pre',
                    }}
                  >
                    {selectedDeploymentData.code}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== COMPARATIVE ARCHITECTURE MATRIX ===================== */}
        <section
          style={{
            padding: '96px 0',
            background: '#ffffff',
            borderTop: '1px solid #D9E1DC',
            borderBottom: '1px solid #D9E1DC',
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 36px)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 46px auto' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '10px',
                }}
              >
                Architectural Breakdown
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 44px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.1,
                  marginBottom: '14px',
                }}
              >
                Why Legacy Defenses Fail Modern Workloads
              </h2>
              <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
                Examine the engineering differences between MDefender Pro's dual-engine neural stack and legacy security solutions.
              </p>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #CBD8CF',
                boxShadow: '0 18px 45px rgba(11, 37, 34, 0.06)',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#0B2522', color: '#ffffff' }}>
                    <th style={{ padding: '16px 22px', fontSize: '13px', fontWeight: 700 }}>Security Layer</th>
                    <th style={{ padding: '16px 22px', fontSize: '13px', fontWeight: 700, color: '#E8792F' }}>
                      MDefender Pro
                    </th>
                    <th style={{ padding: '16px 22px', fontSize: '13px', fontWeight: 600, color: '#8EA29C' }}>
                      Traditional Cloud WAFs
                    </th>
                    <th style={{ padding: '16px 22px', fontSize: '13px', fontWeight: 600, color: '#8EA29C' }}>
                      Host-Level Security Plugins
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #D9E1DC' }}>
                    <td style={{ padding: '16px 22px', fontWeight: 700, fontSize: '13.5px', color: '#10201E' }}>
                      Inspection Latency
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 800, color: '#28745D', fontSize: '14px' }}>
                      &lt; 0.12ms (Single-Pass)
                    </td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>15ms &ndash; 35ms</td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>80ms &ndash; 250ms (Origin Lag)</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #D9E1DC', background: '#FBFCFA' }}>
                    <td style={{ padding: '16px 22px', fontWeight: 700, fontSize: '13.5px', color: '#10201E' }}>
                      Threat Intelligence Engine
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 800, color: '#28745D', fontSize: '14px' }}>
                      2M+ Signatures + 6.5M+ ML Neural Model
                    </td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>Static Regex Pattern Matchers</td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>Local File Hashes &amp; Basic IP Blocks</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #D9E1DC' }}>
                    <td style={{ padding: '16px 22px', fontWeight: 700, fontSize: '13.5px', color: '#10201E' }}>
                      LLM Prompt Injection Shield
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 800, color: '#28745D', fontSize: '14px' }}>
                      Built-In (639K+ Corpus Vectors)
                    </td>
                    <td style={{ padding: '16px 22px', color: '#A34F22', fontSize: '13px' }}>Requires Expensive Add-on</td>
                    <td style={{ padding: '16px 22px', color: '#A34F22', fontSize: '13px' }}>Not Supported</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #D9E1DC', background: '#FBFCFA' }}>
                    <td style={{ padding: '16px 22px', fontWeight: 700, fontSize: '13.5px', color: '#10201E' }}>
                      Origin CPU Waste
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 800, color: '#28745D', fontSize: '14px' }}>
                      0.0% (Terminated at Edge)
                    </td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>5% &ndash; 15%</td>
                    <td style={{ padding: '16px 22px', color: '#A34F22', fontSize: '13px' }}>40% &ndash; 70% (Server crash risk)</td>
                  </tr>

                  <tr>
                    <td style={{ padding: '16px 22px', fontWeight: 700, fontSize: '13.5px', color: '#10201E' }}>
                      WordPress Pre-Write Defense
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 800, color: '#28745D', fontSize: '14px' }}>
                      Priority 1 In-Memory RASP Hook
                    </td>
                    <td style={{ padding: '16px 22px', color: '#A34F22', fontSize: '13px' }}>Blind to PHP internal hooks</td>
                    <td style={{ padding: '16px 22px', color: '#4A5D5A', fontSize: '13px' }}>Post-execution check only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===================== FINAL CALL TO ACTION ===================== */}
        <section
          style={{
            padding: '80px 0 96px 0',
            background: '#F7F6F1',
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 36px)',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #CBD8CF',
                boxShadow: '0 18px 45px rgba(11, 37, 34, 0.06)',
                padding: '36px 42px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#E8792F',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: '6px',
                  }}
                >
                  Get Protected Today
                </div>
                <h3
                  style={{
                    fontSize: 'clamp(26px, 3.2vw, 36px)',
                    fontWeight: 800,
                    letterSpacing: '-0.06em',
                    color: '#10201E',
                    marginBottom: '6px',
                    lineHeight: 1.15,
                  }}
                >
                  Ready to deploy autonomous security across your stack?
                </h3>
                <p style={{ fontSize: '15px', color: '#4A5D5A', margin: 0 }}>
                  Start with a 5-minute DNS delegation or connect your WordPress sites with one click.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 24px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#153B34';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B2522';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Get started free</span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </Link>

                <Link
                  to="/docs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 20px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#E8EEE8',
                    color: '#0B2522',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span>Read documentation</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== STRUCTURED FOOTER ===================== */}
      <footer
        style={{
          background: '#FBFCFA',
          borderTop: '1px solid #D9E1DC',
          padding: '58px 0 26px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1220px',
            margin: '0 auto',
            padding: '0 clamp(20px, 3.2vw, 36px)',
          }}
        >
          <div
            className="footer-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              gap: 'clamp(24px, 4vw, 40px)',
              marginBottom: '42px',
            }}
          >
            {/* Col 1 */}
            <div style={{ maxWidth: '320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(11, 37, 34, 0.08)',
                    flexShrink: 0,
                  }}
                >
                  <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10201E', letterSpacing: '-0.02em' }}>
                  MDefender <span style={{ color: '#E8792F' }}>Pro</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#4A5D5A', marginBottom: '18px' }}>
                Autonomous Cloud WAF &amp; Global Anycast Edge Defense. Tailored enterprise solutions for e-commerce, cloud APIs, WordPress, and generative AI workloads.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#28745D', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
                <span>Global Edge: 180+ PoPs Online</span>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
                Solutions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>E-Commerce Protection</Link>
                <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Cloud &amp; SaaS APIs</Link>
                <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>WordPress Security</Link>
                <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Generative AI Prompt Shield</Link>
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
                Developer Docs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>5-Minute Quickstart</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>REST API Reference</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>WordPress SDK Guide</Link>
                <Link to="/pricing" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Plans &amp; Pricing</Link>
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
                Compliance &amp; Trust
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>SOC2 &amp; Compliance Center</Link>
                <Link to="/blog" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Threat Intelligence Lab</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Privacy Policy</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5D5A')}>Terms of Service</Link>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid #D9E1DC',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '11.5px',
              color: '#6A7E7A',
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} MDefender Pro. All rights reserved. Built for mission-critical enterprise resilience.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D', fontWeight: 600 }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#28745D',
                  boxShadow: '0 0 6px #28745D',
                }}
              />
              <span>All 180+ Anycast PoPs operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .deployment-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 700px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
