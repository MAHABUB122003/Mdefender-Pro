import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import {
  ShoppingCart,
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Activity,
  Bot,
  Sliders,
  Sparkles,
  Flame,
  CheckCircle2,
  Package,
  Layers,
  Server,
  Check
} from 'lucide-react';

export default function EcommerceSolution() {
  // Flash Sale Surge Simulator State
  const [trafficSurge, setTrafficSurge] = useState(45000); // Requests per sec

  // Calculated Metrics under surge
  const botRatio = 0.72;
  const blockedBots = Math.round(trafficSurge * botRatio);
  const cleanBuyers = trafficSurge - blockedBots;
  const edgeLatency = '< 0.08ms';
  const originCpuProtected = '4.2%';

  // Active Interactive Checkout Stage
  const [checkoutStage, setCheckoutStage] = useState('payment');

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== E-COMMERCE HERO: CHECKOUT VELOCITY ===================== */}
      <section style={{
        paddingTop: 'calc(76px + 54px)',
        paddingBottom: '72px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(232, 121, 47, 0.09), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A5D5A', marginBottom: '22px' }}>
            <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Solutions</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#E8792F', fontWeight: 600 }}>High-Velocity E-Commerce &amp; Retail Defense</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* Left: Headline & Pitch */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#FFF3EB',
                border: '1px solid #FDCFBA',
                fontSize: '11px',
                fontWeight: 700,
                color: '#E8792F',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}>
                <Flame size={13} style={{ color: '#E8792F' }} />
                <span>Zero-Latency Retail &amp; Checkout Protection</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.05em',
                color: '#10201E',
                marginBottom: '20px'
              }}>
                Stop scalper bots.{' '}
                <span style={{ color: '#E8792F' }}>Protect flash sales.</span>{' '}
                Zero cart abandonment.
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                marginBottom: '32px'
              }}>
                Traditional security plugins add 180ms–350ms of PHP overhead to WooCommerce and Magento checkouts, killing buyer conversion. MDefender Pro inspects traffic at the edge in <strong>&lt;0.08ms</strong>, neutralizing carding attacks, scalper hoarding, and Magecart skimmers before they touch your server.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
                <Link
                  to="/register?plan=enterprise_pro"
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
                    boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#153B34'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0B2522'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>Shield Online Store</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
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
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD8CF',
                    color: '#10201E',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E8EEE8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <span>View High-Volume Plans</span>
                </Link>
              </div>

              {/* Stat Quads */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '16px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Checkout Latency</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#E8792F' }}>&lt; 0.08ms DFA</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scalper Mitigation</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>99.8% Trap Rate</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DDoS Capacity</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>42.8 Tbps Anycast</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PCI Compliance</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#E8792F' }}>PCI-DSS 4.0 Sec 6.4.3</div>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Checkout Pipeline Visualizer */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #D9E1DC',
              boxShadow: '0 20px 50px rgba(11, 37, 34, 0.08)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                background: '#0B2522',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={15} style={{ color: '#E8792F' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    CHECKOUT FLOW PROTECTION PIPELINE
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ADE80' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                  <span>Turnstile Active · Zero CAPTCHA</span>
                </div>
              </div>

              {/* 3 Checkout Stages Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #ECEEEA' }}>
                {[
                  { id: 'cart', label: '1. Add to Cart', sub: 'Inventory Hoard' },
                  { id: 'checkout', label: '2. Shipping Info', sub: 'Credential Stuffing' },
                  { id: 'payment', label: '3. Payment Gateway', sub: 'Carding & Magecart' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setCheckoutStage(st.id)}
                    style={{
                      padding: '12px 10px',
                      background: checkoutStage === st.id ? '#FFF3EB' : 'transparent',
                      borderBottom: checkoutStage === st.id ? '2px solid #E8792F' : 'none',
                      borderRight: '1px solid #ECEEEA',
                      borderTop: 'none',
                      borderLeft: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: checkoutStage === st.id ? '#E8792F' : '#10201E' }}>{st.label}</div>
                    <div style={{ fontSize: '9.5px', color: checkoutStage === st.id ? '#E8792F' : '#7A8C89' }}>{st.sub}</div>
                  </button>
                ))}
              </div>

              {/* Stage Body */}
              <div style={{ padding: '20px' }}>
                {checkoutStage === 'cart' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10201E' }}>Scalper Bot Mitigation</span>
                      <span style={{ fontSize: '11px', color: '#28745D', fontWeight: 700 }}>Latency: 0.07ms</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#4A5D5A', lineHeight: 1.5, marginBottom: '14px' }}>
                      Scalper bots use automated headless browsers to add dozens of limited-edition items into carts, artificially holding inventory until drops expire.
                    </p>
                    <div style={{ background: '#FAF9F5', padding: '12px', borderRadius: '8px', border: '1px solid #E2DDD5', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      <div style={{ color: '#28745D', marginBottom: '4px', fontWeight: 700 }}>✓ MDefender Cryptographic Proof-of-Work: Verified human session</div>
                      <div style={{ color: '#4A5D5A' }}>→ Token-bucket reservation limit: 2 items/session enforced</div>
                      <div style={{ color: '#E8792F', marginTop: '4px', fontWeight: 700 }}>🛡 3,840 Scalper bot add_to_cart requests dropped at line-rate edge</div>
                    </div>
                  </div>
                )}

                {checkoutStage === 'checkout' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10201E' }}>Credential &amp; Account Takeover Barrier</span>
                      <span style={{ fontSize: '11px', color: '#28745D', fontWeight: 700 }}>Latency: 0.08ms</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#4A5D5A', lineHeight: 1.5, marginBottom: '14px' }}>
                      Attackers test stolen username/password lists on retail login pages to drain saved store credits and loyalty points.
                    </p>
                    <div style={{ background: '#FAF9F5', padding: '12px', borderRadius: '8px', border: '1px solid #E2DDD5', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      <div style={{ color: '#28745D', marginBottom: '4px', fontWeight: 700 }}>✓ Distributed IP clustering detected (520 IPs rotating across 2 ASNs)</div>
                      <div style={{ color: '#4A5D5A' }}>→ Autonomous mitigation: Instant silent challenge issued</div>
                      <div style={{ color: '#E8792F', marginTop: '4px', fontWeight: 700 }}>🛡 0 legitimate customer logins impacted; brute-force cycle halted</div>
                    </div>
                  </div>
                )}

                {checkoutStage === 'payment' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10201E' }}>Card Testing &amp; Form Jacking (Magecart)</span>
                      <span style={{ fontSize: '11px', color: '#28745D', fontWeight: 700 }}>Latency: 0.08ms</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#4A5D5A', lineHeight: 1.5, marginBottom: '14px' }}>
                      Fraud syndicates use payment gateways to test thousands of stolen card numbers, generating devastating $15 merchant chargeback fees per failed authorization.
                    </p>
                    <div style={{ background: '#FAF9F5', padding: '12px', borderRadius: '8px', border: '1px solid #E2DDD5', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      <div style={{ color: '#28745D', marginBottom: '4px', fontWeight: 700 }}>✓ Strict velocity enforcement: Max 3 checkout attempts / 5 mins / IP</div>
                      <div style={{ color: '#4A5D5A' }}>→ PCI-DSS 4.0 Sec 6.4.3: Inline script SHA-384 hash validated</div>
                      <div style={{ color: '#E8792F', marginTop: '4px', fontWeight: 700 }}>🛡 Carding flood intercepted at edge: $0 chargeback liability incurred</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Speed Comparison Footer */}
              <div style={{
                padding: '12px 18px',
                background: '#F7F6F1',
                borderTop: '1px solid #ECEEEA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px'
              }}>
                <span style={{ color: '#4A5D5A' }}>Traditional Security Plugins: <strong style={{ color: '#DC2626' }}>+260ms</strong></span>
                <span style={{ color: '#4A5D5A' }}>MDefender Pro Edge: <strong style={{ color: '#28745D' }}>0.08ms (3,250x faster)</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FLASH SALE STRESS SIMULATOR ===================== */}
      <section style={{ padding: '80px 0', background: '#FFFFFF', borderBottom: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              High-Velocity Peak Traffic
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Flash Sale &amp; Promotional Spike Simulator
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Simulate promotional surges up to 100,000+ requests per second and observe how MDefender Pro shields your WooCommerce or Magento database from origin collapse.
            </p>
          </div>

          <div style={{
            background: '#FAF9F5',
            borderRadius: '20px',
            border: '1.5px solid #E2DDD5',
            padding: 'clamp(24px, 3vw, 40px)',
            maxWidth: '980px',
            margin: '0 auto'
          }}>
            {/* Surge Slider */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '15px', fontWeight: 700, color: '#10201E' }}>Simulated Flash Sale Traffic Ingress</label>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#E8792F' }}>{trafficSurge.toLocaleString()} req / sec</span>
              </div>
              <input
                type="range"
                min="5000"
                max="120000"
                step="5000"
                value={trafficSurge}
                onChange={(e) => setTrafficSurge(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#E8792F', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A8C89', marginTop: '6px' }}>
                <span>5k req/s (Standard Sale)</span>
                <span>50k req/s (Major Product Drop)</span>
                <span>120k+ req/s (Black Friday Peak)</span>
              </div>
            </div>

            {/* Side-by-side: With MDefender vs Without MDefender */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Without MDefender */}
              <div style={{
                background: '#FFF5F5',
                borderRadius: '14px',
                border: '1px solid #FED7D7',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C53030', fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>
                  <ShieldAlert size={16} />
                  <span>Without MDefender Edge</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Origin Server CPU:</span>
                    <strong style={{ color: '#C53030' }}>100% (Crash / 504 Gateway)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Scalper Bots Entering DB:</span>
                    <strong style={{ color: '#C53030' }}>{blockedBots.toLocaleString()} req/s</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Checkout Abandonment:</span>
                    <strong style={{ color: '#C53030' }}>64% (High Latency)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Carding Merchant Fees:</span>
                    <strong style={{ color: '#C53030' }}>Severe Risk ($10k+)</strong>
                  </div>
                </div>
              </div>

              {/* With MDefender Pro */}
              <div style={{
                background: '#F0FFF4',
                borderRadius: '14px',
                border: '1px solid #C6F6D5',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#28745D', fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>
                  <ShieldCheck size={16} />
                  <span>With MDefender Pro Autonomous Edge</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Origin Server CPU:</span>
                    <strong style={{ color: '#28745D' }}>Flat {originCpuProtected} (Safe)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Scalpers Dropped at Edge:</span>
                    <strong style={{ color: '#28745D' }}>{blockedBots.toLocaleString()} (99.8%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Human Checkout Speed:</span>
                    <strong style={{ color: '#E8792F' }}>{edgeLatency} Overhead</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4A5D5A' }}>Store Revenue Protected:</span>
                    <strong style={{ color: '#28745D' }}>100% Uptime Guaranteed</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 6 DETAILED RETAIL FEATURES ===================== */}
      <section style={{ padding: '96px 0', background: '#F7F6F1' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Engineered for E-Commerce
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Comprehensive Retail Security Stack
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Every feature protects your revenue, preserves transaction speeds, and keeps your merchant account in good standing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {[
              {
                icon: Bot,
                badge: 'CONVERSION-FIRST',
                title: 'Zero-Friction Cryptographic Turnstile',
                desc: 'Replace frustrating "select all traffic lights" CAPTCHAs that cause shoppers to abandon carts. An invisible cryptographic challenge validates genuine browser sessions in under 0.05ms without user interaction.',
                specs: 'Proof-of-work cryptographic challenge · Zero cookie friction · Mobile Safari & Chrome optimized'
              },
              {
                icon: CreditCard,
                badge: 'FRAUD MITIGATION',
                title: 'Card Testing & Velocity Shield',
                desc: 'Prevent botnets from testing stolen credit cards on your payment forms. Enforces token-bucket rate limits per IP, card fingerprint, and session, halting automated BIN attacks before processor rejection fees hit.',
                specs: 'Token-bucket checkout throttling · Stolen BIN cluster detection · 0 processor penalty fees'
              },
              {
                icon: Lock,
                badge: 'PCI COMPLIANCE',
                title: 'PCI-DSS 4.0 Script Integrity & Anti-Magecart',
                desc: 'Malicious actors frequently compromise third-party marketing tags (chat widgets, analytics) to inject credit card skimmers. MDefender Pro enforces subresource integrity (SRI) and blocks unapproved form-jacking scripts.',
                specs: 'Automated script hash whitelisting · Section 6.4.3 compliant · Real-time tampering detection'
              },
              {
                icon: ShoppingCart,
                badge: 'PRODUCT DROPS',
                title: 'Scalper & Inventory Hoarding Barrier',
                desc: 'Protect limited releases, sneakers, tickets, and flash sale discounts from automated reselling bots. Rate-limits the "add-to-cart" pipeline and requires cryptographic validation for high-demand product drops.',
                specs: 'Per-user checkout concurrency locks · Cloudflare/Fastly compatible · WooCommerce native'
              },
              {
                icon: Zap,
                badge: 'PERFORMANCE',
                title: 'Sub-Millisecond Edge DFA Fast-Path',
                desc: 'Unlike traditional security plugins that load entire PHP frameworks and run heavy regex checks for every request, MDefender compiles rules into a linear-time DFA engine evaluated at the line-rate Anycast edge in 0.08ms.',
                specs: 'O(N) match complexity · Zero origin compute required · 100% cache-friendly bypass'
              },
              {
                icon: Server,
                badge: 'PLATFORM INTEGRATION',
                title: 'WooCommerce & Headless Storefront Hooks',
                desc: 'Seamlessly works with WooCommerce, Shopify Plus Headless, Magento 2, BigCommerce, and custom Next.js commerce architectures. Inbound requests are pre-screened before ever hitting your PHP-FPM or database workers.',
                specs: 'WooCommerce priority 1 RASP hook · GraphQL & REST API inspection · Multi-currency support'
              }
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #D9E1DC',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#FFF3EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E8792F'
                      }}>
                        <FeatIcon size={20} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#E8792F', letterSpacing: '0.12em' }}>
                        {feat.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', marginBottom: '10px' }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#4A5D5A', lineHeight: 1.6, marginBottom: '20px' }}>
                      {feat.desc}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '14px',
                    borderTop: '1px solid #ECEEEA',
                    fontSize: '11.5px',
                    color: '#28745D',
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}>
                    {feat.specs}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== FINAL RETAIL CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Ready for your biggest flash sale with zero downtime?
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Deploy MDefender Pro Anycast proxy in front of your online store in under 5 minutes. No code changes, no plugin conflicts, and zero checkout slowdown.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <Link
              to="/register?plan=enterprise_pro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 28px',
                height: '48px',
                borderRadius: '10px',
                background: '#E8792F',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(232, 121, 47, 0.35)'
              }}
            >
              <span>Protect Online Store</span>
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
              <span>Compare High-Volume Plans</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
