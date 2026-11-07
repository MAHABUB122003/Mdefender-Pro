import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PaymentModal from '../components/PaymentModal';
import {
  Shield,
  Zap,
  Check,
  ChevronDown,
  ArrowRight,
  Lock,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Plus,
  Minus,
  Server,
  RefreshCw,
  Cpu,
  Database,
  Eye,
  FileText,
  CheckCircle2,
  Sliders,
  Layers,
  Activity,
  Terminal,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  LifeBuoy,
  Flame,
  Search,
  KeyRound,
  RotateCcw,
  Bug,
  BellRing,
  CreditCard,
} from 'lucide-react';

const FEATURE_CATEGORIES = [
  {
    id: 'waf',
    title: 'Next-Gen WAF & Layer-7 DDoS Shield',
    badge: 'Real-Time Edge Perimeter',
    badgeColor: '#059669',
    icon: Shield,
    desc: 'Autonomous sub-millisecond line-rate request inspection powered by hybrid deterministic DFA rules and SGD machine learning.',
    features: [
      'Sub-millisecond (<0.12ms) Line-Rate Request Inspection',
      'Dual-Tier AST Syntactic + SGD Machine Learning Classifier',
      'Full OWASP Top 10 Mitigation (SQLi, XSS, RCE, LFI, SSRF)',
      'Generative AI Prompt Injection & LLM Security Barrier',
      'Proof-of-Work (PoW) Anti-DDoS Challenge (Zero visual captchas)',
      'Token-Bucket Dynamic Rate Limiting & Scalper Scraper Ban',
      'Real-Time Zero-Day Virtual Patching Engine',
    ],
  },
  {
    id: 'ip-access',
    title: 'IP Access Control & Geo-Defense',
    badge: 'Granular Fencing',
    badgeColor: '#E8792F',
    icon: Globe,
    desc: 'Block malicious botnets, bad actors, and high-risk sovereign jurisdictions before packets ever touch origin PHP workers.',
    features: [
      'Unlimited IP Blacklist & Whitelist Management (CIDR subnets)',
      'Granular Country Blocking & Geographic Regional Fencing',
      'Autonomous ASN & Cloud Hosting Provider Network Fencing',
      'High-Speed In-Memory Radix Trie for Instant IP Lookups',
      'Customizable Brandable Edge 403 & 429 Block Barrier Pages',
      'Live Attack Telemetry & Visual Geographic Event Streaming',
      'Aggressive Crawler & Vulnerability Scanner Immediate Ban',
    ],
  },
  {
    id: 'malware',
    title: '5.24M+ Checksum Malware & Backdoor Hunter',
    badge: 'Deep File Integrity',
    badgeColor: '#2563EB',
    icon: Database,
    desc: 'Ultra-fast file integrity auditing against official WordPress repository hashes to neutralize web-shells and obfuscated backdoors.',
    features: [
      '5.24M+ Official WordPress Checksums Database (SQLite B-Tree)',
      '0.01ms File Integrity Verification with Instant Tamper Alerts',
      'In-Memory AST Heuristic Scanner for Obfuscated PHP Code',
      'Automated Isolation & 1-Click File Quarantine with Safe Restore',
      'Zero-Day Web-Shell, Backdoor, & Crypto-Miner Hunter',
      'Database Injection & Hidden Malicious Script Sanitizer',
      'Automated Scheduled Nightly or Hourly Background Scans',
    ],
  },
  {
    id: 'post-hack',
    title: 'Post-Hack Recovery & Rapid Clean',
    badge: 'Disaster Remediation',
    badgeColor: '#DC2626',
    icon: RotateCcw,
    desc: 'Complete automated incident response suite to disinfect compromised websites and restore clean operations without data loss.',
    features: [
      '1-Click Post-Hack Comprehensive Clean & Disinfection Engine',
      'Rogue Administrator Accounts Detection & Instant Purge',
      'WordPress Core, Theme & Plugin Re-installation from Clean Sources',
      'Cryptographic Secret Security Salts & Keys Instant Auto-Rotation',
      'Forced Global Administrator Password Reset & Session Termination',
      'Hidden Cron Jobs & Backdoor Scheduled Tasks Removal',
      'Clean State Snapshot & Post-Remediation Verification Score',
    ],
  },
  {
    id: 'monitoring',
    title: 'Live Logs & Forensic Event Stream',
    badge: 'Continuous Observability',
    badgeColor: '#0284C7',
    icon: Activity,
    desc: 'Real-time HTTP request inspector, deep attack forensics, and multi-channel instant security alerts.',
    features: [
      'Live Attack Telemetry Stream with Real-Time Intercept Viewer',
      'Deep Forensic Inspector: IP, Country, ASN, Payload & Risk Score',
      '1-Click Direct Blacklist / Ban from Live Request Inspector',
      'Continuous 60-Second Uptime & Synthetic SSL Expiry Probing',
      'Multi-Channel Incident Alerts via Email, Webhooks, Slack & Telegram',
      'Raw HTTP Request Packet Dump & AST Syntax Tree Analysis',
      'Automated Threshold Alerts for High-Traffic Spike & DDoS Detection',
    ],
  },
  {
    id: 'hardening',
    title: 'WordPress Hardening & Host Memory RASP',
    badge: 'Zero-Trust Host Defense',
    badgeColor: '#7C3AED',
    icon: Lock,
    desc: 'Deep runtime application self-protection (RASP) that locks down default WordPress attack vectors and closes hacker backdoors.',
    features: [
      'Stealth Admin Gateway (Cryptographically hide /wp-login.php)',
      'Native RFC-6238 2FA (TOTP for Google/Microsoft Authenticator)',
      'PHP Code Execution Lockdown in /wp-content/uploads/ directory',
      'Automated Enterprise Security Headers (HSTS, CSP, X-Frame-Options)',
      'XML-RPC Endpoint Barrier & Sensitive REST API Shield',
      'WP Core & Theme File Modification Disabler (DISALLOW_FILE_EDIT)',
      '16-Point Comprehensive Security Hardening Audit & Scorecard',
    ],
  },
  {
    id: 'fleet',
    title: 'Centralized Fleet & Safe Rollback Updates',
    badge: 'Scale & Automation',
    badgeColor: '#0F2C26',
    icon: Layers,
    desc: 'One unified cloud console to control, monitor, and update 1 to 100+ remote WordPress sites with zero performance penalty.',
    features: [
      'Centralized Multi-Site Command Console for All Connected Sites',
      '1-Click Bulk Safe Updates with Pre-Update Snapshot & Rollback',
      'Core Web Vitals Speed Observatory (Authentic Mobile 4G & Desktop)',
      'Centralized WordPress Theme, Plugin, & Core Health Registry',
      'Automated Maintenance Windows & Staggered Update Delivery',
      'Bulk Database Optimization & Transient Overhead Cleanup',
      'Instant Emergency 1-Click Lockdown for Compromised Fleets',
    ],
  },
  {
    id: 'agency',
    title: 'Dark Web Breach Intel, SEO & White-Label',
    badge: 'Agency & Enterprise Value',
    badgeColor: '#D97706',
    icon: Sparkles,
    desc: 'Detect compromised credentials before attackers strike, protect SEO rankings, and export branded client reports.',
    features: [
      'Dark Web Credential Breach Intelligence & Admin Email Monitor',
      'Fleet-Wide Broken Links & 404 Error Crawler for SEO Protection',
      'White-Label Automated PDF Client Security & Performance Reports',
      'Automated Multi-Currency Billing & Instant Tax Invoicing',
      'Centralized Audit Logging & SIEM Log Export Compatibility',
      'Public REST API & Webhooks for Seamless CI/CD Automation',
      '24/7 Priority Dedicated Rapid Incident Response SLA',
    ],
  },
];

const FAQS = [
  {
    q: 'How does the $4 per website pricing model work?',
    a: 'It is simple, transparent, and fair: you pay exactly $4 per month for each website you protect (or $40/year with 2 months free). There are no forced bundles or tier limits. If you have 1 website, you pay $4/mo. If you have 3 websites, you pay $12/mo. If you later add 2 more websites, you simply pay for 2 more. You never pay for unused slots.',
  },
  {
    q: 'What is included in the 14-Day Free Trial?',
    a: 'The 14-Day Free Trial gives you 100% full access to every enterprise feature on your first website. You get real-time AI WAF protection, 5.24M+ checksum malware scans, WordPress hardening, post-hack recovery tools, and live attack telemetry. No credit card is required to get started.',
  },
  {
    q: 'Do I get all enterprise features if I only have 1 website?',
    a: 'Yes, absolutely! We do not lock critical security features behind expensive enterprise tiers. Every single website protected by MDefender Pro gets full access to our sub-millisecond WAF, AI threat classification, Layer 7 DDoS mitigation, malware scanner, post-hack cleanup, and speed observatory.',
  },
  {
    q: 'Can existing users upgrade or add more websites from their dashboard?',
    a: 'Yes! From your MDefender Pro user dashboard, you can add extra website slots at any time for $4/month with 1-click. You can pay securely with your card or digital bank transfer, and your new site slots activate instantly.',
  },
  {
    q: 'How does the annual billing discount work?',
    a: 'Annual billing costs $40 per website per year (which equals just $3.33 per month). You save 17% — effectively getting 2 full months free every year. You can toggle between monthly and annual billing whenever you wish.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'We accept all major Credit and Debit Cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and localized bank transfers with automated tax-compliant PDF invoicing and instant activation.',
  },
  {
    q: 'Is there any contract, setup fee, or cancellation penalty?',
    a: 'None whatsoever. There are zero contracts, zero setup fees, and zero hidden costs. You can cancel your subscription anytime with a single click from your billing settings.',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [sitesCount, setSitesCount] = useState(3);
  const [openFaq, setOpenFaq] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // Pricing formula: $4/mo or $40/yr per site
  const monthlyRate = 4;
  const yearlyRate = 40; // $3.33/mo equivalent (2 months free)

  const totalPrice = isYearly ? sitesCount * yearlyRate : sitesCount * monthlyRate;
  const effectiveMonthly = isYearly ? (totalPrice / 12).toFixed(2) : totalPrice.toFixed(2);
  const savingsAmount = isYearly ? sitesCount * (monthlyRate * 12 - yearlyRate) : 0;

  const handleSitesChange = (val) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 500) {
      setSitesCount(num);
    }
  };

  const handleStartTrial = () => {
    const token = localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');
    if (token) {
      navigate('/user/dashboard');
    } else {
      navigate('/user/login?plan=free&trial=14');
    }
  };

  const handleDeployPro = () => {
    const token = localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');
    const cycle = isYearly ? 'yearly' : 'monthly';
    if (token) {
      navigate(`/user/pricing?sites=${sitesCount}&cycle=${cycle}`);
    } else {
      navigate(`/user/login?plan=pro&sites=${sitesCount}&cycle=${cycle}`);
    }
  };

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
          width: '750px',
          height: '650px',
          background: 'radial-gradient(circle at 80% 15%, rgba(232, 238, 232, 0.65) 0%, rgba(247, 246, 241, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '220px',
          left: 0,
          width: '580px',
          height: '580px',
          background: 'radial-gradient(circle at 15% 30%, rgba(234, 244, 255, 0.5) 0%, rgba(247, 246, 241, 0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Global Clean Public Navbar */}
      <PublicNavbar />

      <main id="main-content">
        {/* ===================== HERO / HEADER SECTION ===================== */}
        <section
          style={{
            paddingTop: 'calc(76px + 52px)',
            paddingBottom: '44px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            {/* Eyebrow Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                background: '#E8EEE8',
                border: '1px solid #D9E1DC',
                fontSize: '11px',
                fontWeight: 700,
                color: '#E8792F',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={14} style={{ color: '#059669' }} />
              <span>Predictable &amp; Honest WordPress Security</span>
            </div>

            {/* Editorial Heading */}
            <h1
              style={{
                fontSize: 'clamp(34px, 4.8vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.06em',
                color: '#10201E',
                maxWidth: '860px',
                margin: '0 auto 18px',
              }}
            >
              One simple price per website.{' '}
              <span style={{ color: '#E8792F' }}>Add or remove sites anytime.</span>
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                maxWidth: '680px',
                margin: '0 auto 32px',
              }}
            >
              No expensive tier traps. No paying for unused slots. Start with a <strong>14-day free trial</strong>,
              then protect any number of WordPress sites for just <strong>$4 / site / month</strong> with full enterprise
              AI WAF, malware hunting, post-hack clean, and fleet management included.
            </p>

            {/* Billing Cycle Toggle */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#E8EEE8',
                padding: '5px',
                borderRadius: '999px',
                border: '1px solid #D9E1DC',
                boxShadow: 'inset 0 1px 3px rgba(11, 37, 34, 0.05)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className="billing-toggle-btn"
                style={{
                  padding: '9px 24px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isYearly ? '#0B2522' : 'transparent',
                  color: !isYearly ? '#FFFFFF' : '#4A5D5A',
                  boxShadow: !isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                Monthly ($4 / site)
              </button>

              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className="billing-toggle-btn"
                style={{
                  padding: '9px 24px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: isYearly ? '#0B2522' : 'transparent',
                  color: isYearly ? '#FFFFFF' : '#4A5D5A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isYearly ? '0 2px 8px rgba(11, 37, 34, 0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span>Annual ($40 / site)</span>
                <span
                  style={{
                    background: '#E8792F',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    boxShadow: '0 1px 4px rgba(232, 121, 47, 0.3)',
                  }}
                >
                  Save 17% (2 Mo Free)
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ===================== INTERACTIVE PRICING CALCULATOR HERO ===================== */}
        <section
          style={{
            maxWidth: '1100px',
            margin: '0 auto 72px',
            padding: '0 clamp(20px, 3.2vw, 32px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            className="pricing-calculator-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '2px solid #E6ECE8',
              boxShadow: '0 24px 60px rgba(11, 37, 34, 0.08), 0 4px 16px rgba(11, 37, 34, 0.04)',
              padding: 'clamp(28px, 4vw, 44px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Banner Accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(90deg, #059669 0%, #E8792F 50%, #2563EB 100%)',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: 'clamp(32px, 4vw, 56px)',
                alignItems: 'center',
              }}
              className="calculator-grid"
            >
              {/* Left Column: Interactive Site Selection Controls */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: '#E8792F',
                    marginBottom: '8px',
                  }}
                >
                  Interactive License Calculator
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(24px, 3vw, 34px)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: '#10201E',
                    lineHeight: 1.2,
                    margin: '0 0 12px 0',
                  }}
                >
                  How many websites do you manage?
                </h2>
                <p
                  style={{
                    fontSize: '14.5px',
                    color: '#5B756E',
                    lineHeight: 1.55,
                    margin: '0 0 24px 0',
                  }}
                >
                  Adjust the count to match your active sites. Each website receives dedicated line-rate WAF inspection,
                  automatic malware scanning, post-hack recovery, and fleet command.
                </p>

                {/* Counter Control Widget */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSitesCount((prev) => Math.max(1, prev - 1))}
                    disabled={sitesCount <= 1}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD8CF',
                      background: sitesCount <= 1 ? '#F7F6F1' : '#FFFFFF',
                      color: sitesCount <= 1 ? '#CBD8CF' : '#0B2522',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: sitesCount <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    aria-label="Decrease websites"
                  >
                    <Minus size={18} strokeWidth={2.6} />
                  </button>

                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={sitesCount}
                      onChange={(e) => handleSitesChange(e.target.value)}
                      style={{
                        width: '110px',
                        height: '46px',
                        borderRadius: '12px',
                        border: '2px solid #0B2522',
                        background: '#FBFCFA',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#0B2522',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxShadow: '0 2px 8px rgba(11, 37, 34, 0.08)',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setSitesCount((prev) => Math.min(500, prev + 1))}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      border: '1.5px solid #0B2522',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 4px 12px rgba(11, 37, 34, 0.15)',
                    }}
                    aria-label="Increase websites"
                  >
                    <Plus size={18} strokeWidth={2.6} />
                  </button>

                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#10201E',
                      marginLeft: '6px',
                    }}
                  >
                    {sitesCount === 1 ? 'Protected Website' : 'Protected Websites'}
                  </span>
                </div>

                {/* Quick Presets Pills */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#7A928B' }}>Quick Pick:</span>
                  {[1, 3, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSitesCount(num)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: sitesCount === num ? '1.5px solid #059669' : '1px solid #D9E1DC',
                        background: sitesCount === num ? '#E8EEE8' : '#FFFFFF',
                        color: sitesCount === num ? '#059669' : '#4A5D5A',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num} {num === 1 ? 'Site' : 'Sites'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Dynamic Price Summary Box */}
              <div
                style={{
                  background: '#F7F6F1',
                  borderRadius: '20px',
                  border: '1px solid #D9E1DC',
                  padding: '30px 28px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 3px rgba(11, 37, 34, 0.03)',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '0 auto 14px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD8CF',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#059669',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                  <span>All Features Unlocked</span>
                </div>

                {/* Big Live Price */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(44px, 5.5vw, 64px)',
                      fontWeight: 900,
                      color: '#10201E',
                      letterSpacing: '-0.06em',
                      lineHeight: 1,
                    }}
                  >
                    ${totalPrice}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#5B756E' }}>
                    {isYearly ? '/ year total' : '/ month total'}
                  </span>
                </div>

                {/* Subtext breakdown */}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#5B756E',
                    marginBottom: '18px',
                  }}
                >
                  {isYearly ? (
                    <span>
                      Effective <strong>${effectiveMonthly}/mo</strong> (${(yearlyRate / 12).toFixed(2)}/site/mo) ·{' '}
                      <strong style={{ color: '#E8792F' }}>Save ${savingsAmount}/yr</strong>
                    </span>
                  ) : (
                    <span>
                      Billed monthly at <strong>${monthlyRate}.00 per website</strong> · Cancel anytime
                    </span>
                  )}
                </div>

                {/* Action CTA Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      fontSize: '14.5px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 6px 20px rgba(11, 37, 34, 0.22)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#153B34';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0B2522';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeployPro}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#0B2522',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: '1.5px solid #CBD8CF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0B2522';
                      e.currentTarget.style.background = '#E8EEE8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#CBD8CF';
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    <span>Instant Pro Activation ({sitesCount} Sites)</span>
                  </button>
                </div>

                {/* Trust bullets below button */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#5B756E',
                    marginTop: '16px',
                  }}
                >
                  <span>✓ 14 Days Full Access</span>
                  <span>✓ No Credit Card Required</span>
                  <span>✓ Scale Up/Down Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== TRUST STRIP (#0B2522) ===================== */}
        <section
          style={{
            background: '#0B2522',
            color: '#ffffff',
            minHeight: '68px',
            padding: '18px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '76px',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              width: '100%',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div
              className="trust-strip-grid"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#E8EEE8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} strokeWidth={2.4} style={{ color: '#059669' }} />
                <span>99.99% Guaranteed Cloud Edge Availability SLA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} strokeWidth={2.4} style={{ color: '#E8792F' }} />
                <span>&lt;0.12ms Line-Rate Inspection Overhead</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} strokeWidth={2.4} style={{ color: '#2563EB' }} />
                <span>13.91M+ Real-Time Threat Intelligence &amp; Checksums</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} strokeWidth={2.4} style={{ color: '#059669' }} />
                <span>256-Bit Bank-Grade Encrypted Global Checkout</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== ALL-INCLUSIVE FEATURES 8-CARD GRID ===================== */}
        <section
          style={{
            maxWidth: '1180px',
            margin: '0 auto 96px',
            padding: '0 clamp(20px, 3.2vw, 32px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
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
              Comprehensive Protection Architecture
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.8vw, 44px)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                color: '#10201E',
                lineHeight: 1.15,
                marginBottom: '14px',
              }}
            >
              Everything included in every single website.
            </h2>
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#4A5D5A',
                maxWidth: '680px',
                margin: '0 auto',
              }}
            >
              Whether you are protecting 1 personal website for $4/month or a fleet of 50 client sites,
              every website receives 100% of our enterprise cybersecurity, post-hack recovery, and speed optimization tools.
            </p>
          </div>

          {/* 8 Modular Feature Cut-Cards Grid */}
          <div
            className="feature-modules-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {FEATURE_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="feature-module-card"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    border: '1px solid #D9E1DC',
                    padding: '30px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 18px rgba(11, 37, 34, 0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  <div>
                    {/* Header Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#F7F6F1',
                          border: '1px solid #E6ECE8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0B2522',
                        }}
                      >
                        <IconComp size={22} strokeWidth={2.2} />
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: '#E8EEE8',
                          color: cat.badgeColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {cat.badge}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '18.5px',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        color: '#10201E',
                        margin: '0 0 8px 0',
                        lineHeight: 1.3,
                      }}
                    >
                      {cat.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '13px',
                        color: '#5B756E',
                        lineHeight: 1.55,
                        margin: '0 0 20px 0',
                      }}
                    >
                      {cat.desc}
                    </p>

                    <div
                      style={{
                        height: '1px',
                        background: '#E6ECE8',
                        marginBottom: '18px',
                      }}
                    />

                    {/* Feature Checklist */}
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {cat.features.map((feat, fIdx) => (
                        <li
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '9px',
                            fontSize: '13px',
                            color: '#10201E',
                            lineHeight: 1.45,
                          }}
                        >
                          <Check
                            size={15}
                            strokeWidth={2.6}
                            style={{
                              color: '#059669',
                              marginTop: '2px',
                              flexShrink: 0,
                            }}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Included Pill at Bottom */}
                  <div
                    style={{
                      marginTop: '24px',
                      paddingTop: '14px',
                      borderTop: '1px dashed #E6ECE8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#059669',
                    }}
                  >
                    <CheckCircle2 size={14} strokeWidth={2.4} />
                    <span>Included in every $4/site license</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================== FAQS SECTION ===================== */}
        <section
          style={{
            padding: '96px 0',
            background: '#E8EEE8',
            borderTop: '1px solid #D9E1DC',
            borderBottom: '1px solid #D9E1DC',
          }}
        >
          <div
            style={{
              maxWidth: '840px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#E8792F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '8px',
                }}
              >
                Zero Confusion
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 38px)',
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  color: '#10201E',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                Frequently asked questions.
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #D9E1DC',
                      padding: '18px 22px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(11, 37, 34, 0.02)',
                      transition: 'border-color 0.15s ease',
                    }}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14.5px',
                        fontWeight: 700,
                        color: '#10201E',
                      }}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2.4}
                        style={{
                          color: isOpen ? '#E8792F' : '#60716B',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease, color 0.15s ease',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    {isOpen && (
                      <p
                        style={{
                          margin: '12px 0 0',
                          fontSize: '13.5px',
                          lineHeight: 1.6,
                          color: '#4A5D5A',
                        }}
                      >
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CALL TO ACTION ===================== */}
        <section
          style={{
            padding: '96px 0',
            background: '#F7F6F1',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(20px, 3.2vw, 32px)',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 20px 50px rgba(11, 37, 34, 0.06)',
                padding: 'clamp(32px, 4vw, 48px)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '28px',
              }}
            >
              <div style={{ maxWidth: '640px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#059669',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: '8px',
                  }}
                >
                  14-Day Free Trial • Instant Deployment
                </div>
                <h3
                  style={{
                    fontSize: 'clamp(26px, 3.2vw, 36px)',
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    color: '#10201E',
                    marginBottom: '8px',
                    lineHeight: 1.15,
                  }}
                >
                  Ready to protect your WordPress websites?
                </h3>
                <p style={{ fontSize: '15px', color: '#4A5D5A', margin: 0, lineHeight: 1.55 }}>
                  Deploy sub-millisecond edge firewalling, 5.24M+ checksum malware scans, post-hack recovery,
                  and safe rollback updates with zero server downtime. No credit card required.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 28px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(11, 37, 34, 0.18)',
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
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>

                <Link
                  to="/about"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 22px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1.5px solid #CBD8CF',
                    color: '#10201E',
                    fontSize: '13.5px',
                    fontWeight: 700,
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
                  <span>About Security Suite</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== GLOBAL FOOTER (#FBFCFA) ===================== */}
      <footer
        style={{
          background: '#FBFCFA',
          borderTop: '1px solid #D9E1DC',
          padding: '58px 0 26px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '0 clamp(20px, 3.2vw, 32px)',
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
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  marginBottom: '14px',
                }}
              >
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
                  <img
                    src="/assets/mdefender_logo.png"
                    alt="MDefender Pro"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#10201E', letterSpacing: '-0.02em' }}>
                  MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
                </span>
              </Link>
              <p style={{ fontSize: '12px', color: '#4A5D5A', lineHeight: 1.6, margin: 0 }}>
                Next-generation Web Application Firewall, Layer-7 DDoS Shield, Post-Hack Recovery, and WordPress
                Security Hardening ecosystem powered by Machine Learning and Threat Intelligence.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/products/waf" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Cloud WAF</Link>
                <Link to="/products/wordpress" style={{ color: '#4A5D5A', textDecoration: 'none' }}>WordPress Security</Link>
                <Link to="/threat-intelligence" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Threat Intelligence</Link>
                <Link to="/pricing" style={{ color: '#E8792F', textDecoration: 'none', fontWeight: 600 }}>Pricing</Link>
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Resources
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Documentation</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>System Status</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>API Reference</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Security Advisory</Link>
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10201E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '14px',
                }}
              >
                Company &amp; Legal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }}>About Us</Link>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Trust Center</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Terms of Service</Link>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
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
              &copy; {new Date().getFullYear()} MDefender Pro. All rights reserved. Built for mission-critical web infrastructure.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 600 }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#059669',
                  boxShadow: '0 0 6px #059669',
                }}
              />
              <span>Systems operational · 256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Payment Checkout Modal for Direct Triggers */}
      <PaymentModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        plan="pro"
        billingCycle={isYearly ? 'yearly' : 'monthly'}
        onSuccess={() => {
          setCheckoutModalOpen(false);
          navigate('/user/dashboard');
        }}
      />

      {/* Micro-Interactions & Responsive CSS */}
      <style>{`
        .feature-module-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(11, 37, 34, 0.08) !important;
          border-color: #059669 !important;
        }

        .billing-toggle-btn:hover {
          color: #10201E !important;
        }

        @media (max-width: 900px) {
          .calculator-grid {
            grid-template-columns: 1fr !important;
          }
          .feature-modules-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .trust-strip-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
