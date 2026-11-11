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
      url: 'https://api.yourdomain.com/v1/reports/export?format=csv',
      body: JSON.stringify({
        tenant_id: "org_free_tier_9102",
        burst_rate: "480 req/sec"
      }, null, 2),
      attackName: 'Noisy Neighbor Database Exhaustion',
      verdict: 'RATE LIMITED (429 Too Many Requests)',
      rule: '#RL-TOKEN-BUCKET Quota Exceeded',
      latency: '0.03ms',
      astMatch: "Burst allowance exceeded (120/min). Sliding window throttled without touching origin DB."
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
        paddingTop: 'calc(76px + 48px)',
        paddingBottom: '64px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(232, 121, 47, 0.07), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A5D5A', marginBottom: '20px' }}>
            <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Solutions</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#E8792F', fontWeight: 600 }}>SaaS Platforms &amp; Cloud APIs</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
            
            {/* Left Column: SaaS Value Prop */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: '#FFF4ED',
                border: '1px solid #FCD3B6',
                fontSize: '11px',
                fontWeight: 700,
                color: '#D97735',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '18px'
              }}>
                <Zap size={13} style={{ color: '#D97735' }} />
                <span>Zero-Latency API Edge Shield</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(28px, 3.8vw, 44px)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.04em',
                color: '#10201E',
                marginBottom: '18px'
              }}>
                Defend REST, GraphQL &amp; microservices in{' '}
                <span style={{ color: '#E8792F' }}>&lt; 0.12ms.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(14px, 1.5vw, 16px)',
                lineHeight: 1.65,
                color: '#4A5D5A',
                marginBottom: '28px'
              }}>
                Legacy WAFs choke on nested JSON payloads and break real-time API latency SLAs. MDefender Pro combines <strong>AST syntactic normalization</strong> with linear-time DFA inspection, blocking injection evasion and noisy-neighbor volumetric abuse without touching backend compute.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                <Link
                  to="/register?plan=enterprise_pro"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 24px',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#153B34'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0B2522'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>Integrate API Shield</span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </Link>

                <Link
                  to="/docs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 20px',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD8CF',
                    color: '#10201E',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E8EEE8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <Terminal size={14} />
                  <span>Documentation</span>
                </Link>
              </div>

              {/* Fast Specs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '14px 16px',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inspection Overhead</div>
                  <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#E8792F' }}>0.08ms – 0.12ms</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>JSON Tree Depth</div>
                  <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#28745D' }}>Infinite Recursion</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tenant Isolation</div>
                  <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#10201E' }}>Token Bucket Quota</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network Routing</div>
                  <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#10201E' }}>240+ Anycast PoPs</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive API Security Playground */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #D9E1DC',
              boxShadow: '0 16px 40px rgba(11, 37, 34, 0.06)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                background: '#0B2522',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={14} style={{ color: '#E8792F' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
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
                ].map((sc) => {
                  const isSelected = selectedEndpoint === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => { setSelectedEndpoint(sc.id); setWafResult(null); }}
                      style={{
                        padding: '10px 8px',
                        background: isSelected ? '#FFF4ED' : 'transparent',
                        borderBottom: isSelected ? '2px solid #E8792F' : 'none',
                        borderRight: '1px solid #ECEEEA',
                        borderTop: 'none',
                        borderLeft: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#D97735' : '#10201E' }}>{sc.label}</div>
                      <div style={{ fontSize: '9.5px', color: isSelected ? '#D97735' : '#7A8C89' }}>{sc.sub}</div>
                    </button>
                  );
                })}
              </div>

              {/* Sandbox Code Box */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10201E', fontWeight: 700 }}>
                    {testPayloads[selectedEndpoint].method} {testPayloads[selectedEndpoint].url}
                  </span>
                  <button
                    onClick={handleRunRequest}
                    disabled={requestRunning}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '5px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={11} />
                    <span>{requestRunning ? 'Inspecting...' : 'Send Request'}</span>
                  </button>
                </div>

                <div style={{
                  background: '#10201E',
                  padding: '11px',
                  borderRadius: '7px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#E4EAE6',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '12px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {testPayloads[selectedEndpoint].body}
                </div>

                {/* Verdict Stream */}
                {wafResult ? (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '7px',
                    background: '#FFF5F5',
                    border: '1px solid #FED7D7',
                    fontSize: '11.5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 800, color: '#DC2626' }}>{wafResult.verdict}</span>
                      <span style={{ color: '#28745D', fontWeight: 700, fontFamily: 'monospace' }}>Edge DFA: {wafResult.latency}</span>
                    </div>
                    <div style={{ color: '#10201E', fontWeight: 700, marginBottom: '2px' }}>{wafResult.attackName}</div>
                    <div style={{ color: '#4A5D5A', fontSize: '11px' }}>{wafResult.astMatch}</div>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '7px',
                    background: '#FAF9F5',
                    border: '1px dashed #D9E1DC',
                    fontSize: '11px',
                    color: '#7A8C89',
                    textAlign: 'center'
                  }}>
                    Click <strong>"Send Request"</strong> to evaluate payload across MDefender Pro's line-rate AST engine.
                  </div>
                )}
              </div>

              {/* Bottom Telemetry Footer */}
              <div style={{
                padding: '9px 16px',
                background: '#F7F6F1',
                borderTop: '1px solid #ECEEEA',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                color: '#4A5D5A'
              }}>
                <span>AST Tree Recursion: <strong style={{ color: '#E8792F' }}>0.04ms</strong></span>
                <span>Origin CPU Consumed: <strong style={{ color: '#28745D' }}>0.00% (Dropped at Edge)</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 6 DEEP SAAS & API FEATURES ===================== */}
      <section style={{ padding: '80px 0', background: '#FFFFFF', borderBottom: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              High-Throughput Engineering
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '12px' }}>
              Purpose-Built for Cloud APIs &amp; Microservices
            </h2>
            <p style={{ fontSize: '14.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              From GraphQL query depth guards to per-tenant token buckets, MDefender Pro provides microsecond edge security for mission-critical SaaS backends.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
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
                desc: 'Absorb L7 HTTP floods, Slowloris, and SYN floods at the edge with 42.8 Tbps of global scrubbing capacity. Legitimate webhook deliveries and third-party integrations pass unhindered.',
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
                  borderRadius: '12px',
                  border: '1px solid #E2DDD5',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#FFF4ED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D97735'
                      }}>
                        <FeatIcon size={18} />
                      </div>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#E8792F', letterSpacing: '0.1em' }}>
                        {feat.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#10201E', marginBottom: '8px' }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#4A5D5A', lineHeight: 1.6, marginBottom: '18px' }}>
                      {feat.desc}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid #ECEEEA',
                    fontSize: '11px',
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
      <section style={{ padding: '72px 0', background: '#F7F6F1' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Zero-Friction Ingress
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#10201E' }}>Deploy via Ingress Proxy or Native ASGI Middleware</h3>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ padding: '10px 16px', background: '#0B2522', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#E8792F' }}>FastAPI / Python Asynchronous Middleware</span>
              <button
                onClick={() => copyCode(`from fastapi import FastAPI\nfrom mdefender.middleware import MDefenderShield\n\napp = FastAPI()\n\n# Sub-millisecond line-rate inspection\napp.add_middleware(\n    MDefenderShield,\n    api_key="sk_live_enterprise_...",\n    enable_ast_normalization=True,\n    rate_limit_per_tenant="60/minute"\n)`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '11px' }}
              >
                {copiedSnippet ? <Check size={11} color="#4ADE80" /> : <Copy size={11} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{ padding: '16px', margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#10201E', background: '#FAF9F5', overflowX: 'auto', lineHeight: 1.6 }}>
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
        padding: '80px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '14px' }}>
            Elevate your API reliability with zero latency trade-off.
          </h2>
          <p style={{ fontSize: '15px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '32px' }}>
            Start routing developer traffic through MDefender Pro Anycast proxy or install our lightweight middleware in minutes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <Link
              to="/register?plan=enterprise_pro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 26px',
                height: '46px',
                borderRadius: '8px',
                background: '#E8792F',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(232, 121, 47, 0.35)'
              }}
            >
              <span>Get API Shield Access</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 20px',
                height: '46px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Read Documentation</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
