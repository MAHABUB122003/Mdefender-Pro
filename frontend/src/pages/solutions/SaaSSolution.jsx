import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import {
  Cloud,
  Terminal,
  Zap,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  Cpu,
  Layers,
  Code2,
  Copy,
  Check,
  Lock,
  Globe,
  Activity,
  Server,
  Play,
  Sparkles,
  Sliders
} from 'lucide-react';

export default function SaaSSolution() {
  // Interactive API Security Sandbox State
  const [selectedEndpoint, setSelectedEndpoint] = useState('sqli');
  const [requestRunning, setRequestRunning] = useState(false);
  const [wafResult, setWafResult] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const testPayloads = {
    sqli: {
      method: 'POST',
      url: 'https://api.yourdomain.com/v1/auth/session',
      body: JSON.stringify({
        username: "admin' UNION/**/SELECT 1,password_hash,email/**/FROM/**/users--",
        device: "curl/8.1.2"
      }, null, 2),
      attackName: 'SQLi AST Keyword Splitting (OWASP A03)',
      verdict: 'BLOCKED (403 Forbidden)',
      rule: '#SQL-AST-1049 Grammar Violation',
      latency: '0.08ms',
      astMatch: "Token: [UNION] -> [SELECT] detected after unquoted literal; syntax tree collapsed."
    },
    json_nest: {
      method: 'POST',
      url: 'https://api.yourdomain.com/v1/tenants/query',
      body: JSON.stringify({
        filter: { "$where": "this.secret.indexOf('sk_') != -1" },
        limit: 1000
      }, null, 2),
      attackName: 'NoSQL / JSON AST Injection (OWASP A03)',
      verdict: 'BLOCKED (403 Forbidden)',
      rule: '#NOSQL-JSON-829 Expression Injection',
      latency: '0.09ms',
      astMatch: "Key: ['$where'] forbidden evaluator detected in nested JSON schema."
    },
    rate_limit: {
      method: 'GET',
      url: 'https://api.yourdomain.com/v1/usage/export?tenant=demo',
      body: '// 250 requests fired in 400ms from single API key',
      attackName: 'Noisy Neighbor Volumetric API Flood (OWASP API04)',
      verdict: 'THROTTLED (429 Too Many Requests)',
      rule: '#RATE-BURST-TENANT Exceeded 60 req/min',
      latency: '0.04ms',
      astMatch: "Token-Bucket Capacity: 0 remaining. Enterprise tenants unaffected (isolated bucket)."
    }
  };

  const handleRunRequest = () => {
    setRequestRunning(true);
    setWafResult(null);
    setTimeout(() => {
      setRequestRunning(false);
      setWafResult(testPayloads[selectedEndpoint]);
    }, 450);
  };

  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== SAAS HERO: DEVELOPER-FIRST API SHIELD ===================== */}
      <section style={{
        paddingTop: 'calc(76px + 54px)',
        paddingBottom: '72px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(14, 165, 233, 0.08), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A5D5A', marginBottom: '22px' }}>
            <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Solutions</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0284C7', fontWeight: 600 }}>SaaS Platforms &amp; Cloud APIs</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* Left Column: SaaS Value Prop */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#E0F2FE',
                border: '1px solid #BAE6FD',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0284C7',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}>
                <Zap size={13} style={{ color: '#0284C7' }} />
                <span>Zero-Latency API Edge Shield</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.05em',
                color: '#10201E',
                marginBottom: '20px'
              }}>
                Defend REST, GraphQL &amp; microservices in{' '}
                <span style={{ color: '#0284C7' }}>&lt; 0.12ms.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                marginBottom: '32px'
              }}>
                Legacy WAFs choke on nested JSON payloads and break real-time API latency SLAs. MDefender Pro combines <strong>AST syntactic normalization</strong> with linear-time DFA inspection, blocking injection evasion and noisy-neighbor volumetric abuse without touching backend compute.
              </p>

              {/* Action Buttons */}
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
                  <span>Integrate API Shield</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
                </Link>

                <Link
                  to="/docs"
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
                  <Terminal size={14} />
                  <span>Developer API Docs</span>
                </Link>
              </div>

              {/* Fast Specs */}
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
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inspection Overhead</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7' }}>0.08ms – 0.12ms</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>JSON Tree Depth</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>Infinite Recursion</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tenant Isolation</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>Per-API-Key Token Bucket</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network Routing</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7' }}>240+ Anycast PoPs</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive API Security Playground */}
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
                  <Terminal size={14} style={{ color: '#38BDF8' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    INTERACTIVE API THREAT SANDBOX
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ADE80' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                  <span>AST Engine Active</span>
                </div>
              </div>

              {/* Endpoint Scenario Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #ECEEEA' }}>
                {[
                  { id: 'sqli', label: 'SQLi Evasion', sub: 'Comment Splitting' },
                  { id: 'json_nest', label: 'Nested JSON', sub: 'NoSQL Operator' },
                  { id: 'rate_limit', label: 'Noisy Neighbor', sub: 'Burst Throttling' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => { setSelectedEndpoint(sc.id); setWafResult(null); }}
                    style={{
                      padding: '12px 10px',
                      background: selectedEndpoint === sc.id ? '#E0F2FE' : 'transparent',
                      borderBottom: selectedEndpoint === sc.id ? '2px solid #0284C7' : 'none',
                      borderRight: '1px solid #ECEEEA',
                      borderTop: 'none',
                      borderLeft: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: selectedEndpoint === sc.id ? '#0284C7' : '#10201E' }}>{sc.label}</div>
                    <div style={{ fontSize: '9.5px', color: selectedEndpoint === sc.id ? '#0284C7' : '#7A8C89' }}>{sc.sub}</div>
                  </button>
                ))}
              </div>

              {/* Sandbox Code Box */}
              <div style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>
                    {testPayloads[selectedEndpoint].method} {testPayloads[selectedEndpoint].url}
                  </span>
                  <button
                    onClick={handleRunRequest}
                    disabled={requestRunning}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={12} />
                    <span>{requestRunning ? 'Inspecting...' : 'Send Request'}</span>
                  </button>
                </div>

                <div style={{
                  background: '#10201E',
                  padding: '12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#E4EAE6',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '14px',
                  maxHeight: '130px',
                  overflowY: 'auto'
                }}>
                  {testPayloads[selectedEndpoint].body}
                </div>

                {/* Verdict Stream */}
                {wafResult ? (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#FFF5F5',
                    border: '1px solid #FED7D7',
                    fontSize: '11.5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#DC2626' }}>{wafResult.verdict}</span>
                      <span style={{ color: '#28745D', fontWeight: 700, fontFamily: 'monospace' }}>Edge DFA: {wafResult.latency}</span>
                    </div>
                    <div style={{ color: '#10201E', fontWeight: 700, marginBottom: '2px' }}>{wafResult.attackName}</div>
                    <div style={{ color: '#4A5D5A', fontSize: '11px' }}>{wafResult.astMatch}</div>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#FAF9F5',
                    border: '1px dashed #D9E1DC',
                    fontSize: '11.5px',
                    color: '#7A8C89',
                    textAlign: 'center'
                  }}>
                    Click <strong>"Send Request"</strong> to evaluate payload across MDefender Pro's line-rate AST engine.
                  </div>
                )}
              </div>

              {/* Bottom Telemetry Footer */}
              <div style={{
                padding: '10px 18px',
                background: '#F7F6F1',
                borderTop: '1px solid #ECEEEA',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#4A5D5A'
              }}>
                <span>AST Tree Recursion: <strong style={{ color: '#0284C7' }}>0.04ms</strong></span>
                <span>Origin CPU Consumed: <strong style={{ color: '#28745D' }}>0.00% (Dropped at Edge)</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 6 DEEP SAAS & API FEATURES ===================== */}
      <section style={{ padding: '96px 0', background: '#FFFFFF', borderBottom: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              High-Throughput Engineering
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Purpose-Built for Cloud APIs &amp; Microservices
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              From GraphQL query depth guards to per-tenant token buckets, MDefender Pro provides microsecond edge security for mission-critical SaaS backends.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {[
              {
                icon: Cpu,
                badge: 'SYNTAX NORMALIZATION',
                title: 'AST Syntactic Parser vs Regex Bypass',
                desc: 'Attackers evade legacy WAF regular expressions using hex encoding, Unicode homoglyphs, and comment injection (UN/**/ION SEL/**/ECT). MDefender parses tokens into an Abstract Syntax Tree, neutralizing obfuscation in 0.04ms.',
                specs: 'AST token normalization · 0% false positives on valid JSON · Handles nested GraphQL depth'
              },
              {
                icon: Sliders,
                badge: 'TENANT ISOLATION',
                title: 'Multi-Tenant Token-Bucket Rate Limiter',
                desc: 'Prevent a single rogue free-tier API consumer or buggy scraper from exhausting your database connection pool. Define isolated quotas per API key, organization ID, or JWT claim without writing custom Redis logic.',
                specs: 'Distributed atomic token bucket · Per-tenant quota isolation · Sliding window concurrency'
              },
              {
                icon: Globe,
                badge: 'GLOBAL BACKHAUL',
                title: 'BGP Anycast Routing across 240+ PoPs',
                desc: 'Terminate TLS 1.3 connections at the edge server closest to your international API developers. Verified requests are forwarded over MDefender’s optimized private backhaul to AWS, GCP, or your bare-metal Kubernetes cluster.',
                specs: 'TLS 1.3 0-RTT resumption · HTTP/2 & HTTP/3 multiplexing · Origin IP cloaking'
              },
              {
                icon: Code2,
                badge: 'SCHEMA ENFORCEMENT',
                title: 'Automated OpenAPI & JSON Schema Validation',
                desc: 'Import your OpenAPI / Swagger spec. MDefender automatically drops requests containing unexpected query parameters, invalid types, or payloads exceeding max payload size before your backend framework executes.',
                specs: 'OpenAPI 3.1 schema ingestion · Strict parameter type checking · BOLA/IDOR structure guard'
              },
              {
                icon: Activity,
                badge: 'DDoS IMMUNITY',
                title: 'Volumetric API DDoS & Flood Scrubbing',
                desc: 'Absorb L7 HTTP floods, Slowloris, and SYN floods at the edge with 42.8 Tbps of global scrubbing capacity. Legitimate webhook deliveries and third-party integrations (Stripe, Twilio) pass unhindered.',
                specs: 'Automated SYN/ACK cookie proxy · 42.8 Tbps scrubbing capacity · Webhook HMAC bypass'
              },
              {
                icon: Terminal,
                badge: 'MODERN MIDDLEWARE',
                title: 'Asynchronous ASGI / WSGI & Envoy Gateway',
                desc: 'Integrate via BGP Anycast DNS or embed directly into modern asynchronous frameworks (FastAPI, Express.js, Go Gin, Spring Boot) or your Kubernetes Ingress controller (Envoy, Traefik, NGINX).',
                specs: 'Zero-copy memory buffers · Non-blocking async event loop · < 0.05ms in-process overhead'
              }
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} style={{
                  background: '#FAF9F5',
                  borderRadius: '16px',
                  border: '1px solid #E2DDD5',
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
                        background: '#E0F2FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284C7'
                      }}>
                        <FeatIcon size={20} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.12em' }}>
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

      {/* ===================== DEVELOPER INTEGRATION SNIPPET ===================== */}
      <section style={{ padding: '80px 0', background: '#F7F6F1' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Zero-Friction Ingress
            </div>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#10201E' }}>Deploy via Ingress Proxy or Native ASGI Middleware</h3>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #D9E1DC', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ padding: '12px 18px', background: '#0B2522', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38BDF8' }}>FastAPI / Python Asynchronous Middleware</span>
              <button
                onClick={() => copyCode(`from fastapi import FastAPI\nfrom mdefender.middleware import MDefenderShield\n\napp = FastAPI()\n\n# Sub-millisecond line-rate inspection\napp.add_middleware(\n    MDefenderShield,\n    api_key="sk_live_enterprise_...",\n    enable_ast_normalization=True,\n    rate_limit_per_tenant="60/minute"\n)`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '11px' }}
              >
                {copiedSnippet ? <Check size={12} color="#4ADE80" /> : <Copy size={12} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{ padding: '18px', margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#10201E', background: '#FAF9F5', overflowX: 'auto', lineHeight: 1.6 }}>
{`from fastapi import FastAPI
from mdefender.middleware import MDefenderShield

app = FastAPI()

# Sub-millisecond line-rate inspection
app.add_middleware(
    MDefenderShield,
    api_key="sk_live_enterprise_...",
    enable_ast_normalization=True,
    rate_limit_per_tenant="60/minute"
)`}
            </pre>
          </div>
        </div>
      </section>

      {/* ===================== FINAL SAAS CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Elevate your API reliability with zero latency trade-off.
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Start routing developer traffic through MDefender Pro Anycast proxy or install our lightweight middleware in minutes.
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
                background: '#0284C7',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(2, 132, 199, 0.35)'
              }}
            >
              <span>Get API Shield Access</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/docs"
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
              <span>Explore Swagger &amp; SDKs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
