import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'

const threatVectors = [
  {
    icon: 'fa-database',
    title: 'SQL Injection Defense',
    desc: 'Deep syntactic inspection against union-based, boolean-blind, error-based, and stacked SQL queries across MySQL, PostgreSQL, MSSQL, Oracle, and SQLite.',
    rules: '350+ WAF Rules · ML Verified',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)'
  },
  {
    icon: 'fa-code',
    title: 'Cross-Site Scripting (XSS)',
    desc: 'Multi-pass sanitization and payload extraction for stored, reflected, and DOM-based XSS, blocking HTML5 handlers, SVG payloads, and JS pseudo-protocols.',
    rules: '350+ WAF Rules · ML Verified',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)'
  },
  {
    icon: 'fa-terminal',
    title: 'RCE & Web Shell Neutralization',
    desc: 'Instant blocking of command injection chains, bash environment subshells, Log4j, Shellshock, serialized PHP objects, and 20+ known web shell variants.',
    rules: '350+ WAF Rules · 5.2M Dataset Trained',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)'
  },
  {
    icon: 'fa-network-wired',
    title: 'DDoS & Rate Limiting Layer',
    desc: 'Adaptive token-bucket rate limiting and L7 volumetric flood mitigation designed to shield backend API origins from distributed denial-of-service spikes.',
    rules: 'Active Volumetric Shield',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)'
  },
  {
    icon: 'fa-shield-halved',
    title: 'Bot & Vulnerability Scanner Ban',
    desc: 'Automated fingerprinting and real-time banning of automated offensive security tools including sqlmap, Nikto, Acunetix, DirBuster, Gobuster, and scrapers.',
    rules: '200+ Scanner Signatures',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)'
  },
  {
    icon: 'fa-cloud',
    title: 'SSRF & Cloud Metadata Guard',
    desc: 'Blocks unauthorized requests attempting to probe internal RFC1918 subnets, AWS/GCP instance metadata endpoints, and XML External Entities (XXE).',
    rules: '200+ Rules · Cloud Hardened',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)'
  },
  {
    icon: 'fa-file-shield',
    title: 'CMS & Framework Hardening',
    desc: 'Targeted vulnerability filters for WordPress (wp-config, XML-RPC), Laravel/Symfony (.env leaks), Spring4Shell, and Node.js prototype pollution.',
    rules: '300+ Rules · Framework Specific',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.08)'
  },
  {
    icon: 'fa-sliders',
    title: 'Custom Regex Policy Builder',
    desc: 'Enterprise users can author, test, toggle, and deploy custom regular expressions with isolated per-tenant policy enforcement.',
    rules: 'Tenant Isolated Custom Rules',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)'
  }
]

const codeExamples = {
  nodejs: `// Step 1: Install official NPM package (includes bundled 403 Block Page)
// npm install mdefender-pro

const express = require('express');
const mdefender = require('mdefender-pro');

const app = express();
app.use(express.json());

// Step 2: Attach MDefender Pro WAF Middleware
app.use(mdefender({
  apiKey: process.env.MDEFENDER_API_KEY, // or configure in mdefender.config.js
  domain: 'yourdomain.com',
  mode: 'block' // Intercepts attacks & renders bundled Cyber 403 block page
}));

// Step 3: Your application routes
app.get('/api/data', (req, res) => {
  res.json({ message: 'Request safely passed WAF verification' });
});

app.listen(5000, () => console.log('Protected server running on port 5000'));`,

  python: `# Install: pip install mdefender-python
from fastapi import FastAPI
from mdefender import MDefenderMiddleware

app = FastAPI()

# Attach MDefender Hybrid WAF Layer
app.add_middleware(
    MDefenderMiddleware,
    api_key="mdef_live_sec_token_94812",
    mode="block",
    enable_ml=True, # Active ML Classifier v2.0
    rate_limit_rpm=120
)

@app.get("/api/v1/data")
def read_root():
    return {"status": "protected", "waf": "armed", "ml_core": "5.2M_dataset_active"}`,

  php: `<?php
// Require Composer Autoloader
require_once __DIR__ . '/vendor/autoload.php';

use MDefender\\WafShield;

// Enforce hybrid edge protection before routing
$waf = new WafShield([
    'api_key'    => getenv('MDEFENDER_API_KEY'),
    'mode'       => 'block',
    'enable_ml'  => true,
    'block_page' => true
]);

$waf->inspectRequest(); // Evaluates 2,000 rules + 5.2M ML model in 0.4ms`,

  curl: `# Test your protected endpoint with an obfuscated SQLi probe:
curl -i -X POST "https://api.yourdomain.com/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Mozilla/5.0 SecurityProbe" \\
  -d '{"user": "admin", "pass": "' OR 1=1 --"}'

# Response:
# HTTP/1.1 403 Forbidden
# X-WAF-Engine: MDefender-Hybrid-Core
# X-ML-Confidence: 0.9984 (SQL Injection Vector)
# X-Inspection-Time: 0.42ms`
}

export default function Landing() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [selectedLang, setSelectedLang] = useState('nodejs')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b14',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden'
    }}>
      <PublicNavbar />

      {/* Hero Section */}
      <section style={{
        padding: '130px 24px 80px',
        maxWidth: '1280px',
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Background Radial Glow */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(99,102,241,0.04) 70%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Hybrid Engine Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 20px',
            borderRadius: '30px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '28px',
            boxShadow: '0 0 20px rgba(37,99,235,0.2)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
            <span>HYBRID THREAT DEFENSE ENGINE &middot; 2,000 WAF RULES + 5.2M+ DATASET ML CORE</span>
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(34px, 5.8vw, 62px)',
            fontWeight: '900',
            lineHeight: '1.12',
            letterSpacing: '-0.035em',
            maxWidth: '1020px',
            margin: '0 auto 22px',
            color: '#ffffff'
          }}>
            Autonomous Web Application Firewall Powered by{' '}
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              5.2 Million Attack Signatures
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(16px, 2.1vw, 20px)',
            lineHeight: '1.6',
            color: '#94a3b8',
            maxWidth: '780px',
            margin: '0 auto 38px'
          }}>
            MDefender Pro unites a deterministic <strong>2,000-rule regex engine</strong> with an advanced <strong>Machine Learning model trained on 5.2M+ real-world attack payloads</strong> to stop zero-day exploits, volumetric DDoS, and automated bots in sub-millisecond time.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '60px' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '15px 34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                fontSize: '15px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-shield-halved"></i> Start Free Protection
            </Link>

            <Link
              to="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '15px 28px',
                borderRadius: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-book"></i> Read Documentation
            </Link>

            <a
              href={`${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '15px 28px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid #1e293b',
                color: '#94a3b8',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              <i className="fas fa-download"></i> WordPress Plugin
            </a>
          </div>

          {/* Dual-Engine Live Architecture Simulator */}
          <div style={{
            maxWidth: '920px',
            margin: '0 auto',
            background: '#0a0f1d',
            borderRadius: '14px',
            border: '1px solid #1e293b',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            textAlign: 'left',
            overflow: 'hidden'
          }}>
            {/* Window Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              background: '#04070e',
              borderBottom: '1px solid #1e293b'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>mdefender-core-engine &middot; live telemetry stream</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontFamily: 'monospace' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> DUAL-PIPELINE: ACTIVE
              </div>
            </div>

            {/* Terminal Body */}
            <div style={{ padding: '22px 26px', fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace", fontSize: '13px', lineHeight: '1.7', color: '#cbd5e1' }}>
              <div style={{ color: '#64748b' }}>// INCOMING EDGE REQUEST INTERCEPTION &amp; ANALYSIS</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ color: '#38bdf8' }}>POST</span> <span style={{ color: '#f1f5f9' }}>/api/v1/auth/login HTTP/1.1</span>
              </div>
              <div style={{ color: '#94a3b8' }}>
                Host: <span style={{ color: '#e2e8f0' }}>api.production-cluster.net</span> | Source: <span style={{ color: '#f43f5e' }}>185.220.101.44 (High Risk Origin)</span>
              </div>
              <div style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', margin: '10px 0', border: '1px solid rgba(255,255,255,0.06)' }}>
                Extracted Body: <span style={{ color: '#fbbf24' }}>{"{"}"username": "admin' OR 1=1 --", "auth_token": "eyJhbGciOiJub25lIn0..."{"}"}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' }}>
                <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700' }}>[STAGE 1: 2,000 WAF RULES]</div>
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px' }}>Matched: SQLi - Boolean Blind Tautology #2</div>
                </div>
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: '700' }}>[STAGE 2: 5.2M DATASET ML]</div>
                  <div style={{ color: '#a78bfa', fontSize: '12px', marginTop: '2px' }}>Vector Risk: 99.8% (SQL Injection Vector)</div>
                </div>
              </div>
              <div style={{ color: '#10b981', fontWeight: '700', marginTop: '6px' }}>
                [+] MITIGATION: HTTP 403 Forbidden &middot; Payload Terminated in 0.38ms &middot; Threat IP Banned
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section style={{
        borderTop: '1px solid #1e293b',
        borderBottom: '1px solid #1e293b',
        background: '#0a0e1a',
        padding: '38px 24px'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#38bdf8', letterSpacing: '-0.02em' }}>5,200,000+</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Attack Payloads in ML Dataset</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#60a5fa', letterSpacing: '-0.02em' }}>2,000</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Active WAF Defense Rules</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#10b981', letterSpacing: '-0.02em' }}>&lt; 0.85ms</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Hybrid Inspection Latency</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#a78bfa', letterSpacing: '-0.02em' }}>99.98%</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Zero-Day Detection Accuracy</div>
          </div>
        </div>
      </section>

      {/* 5.2M Dataset Machine Learning Architecture Section */}
      <section style={{ padding: '100px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#c084fc',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '16px'
          }}>
            <i className="fas fa-microchip"></i> Deep Learning &amp; Heuristic Vectorization
          </div>
          <h2 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '16px', color: '#ffffff' }}>
            Trained on Over 5.2 Million Real-World Attack Payloads
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '720px', margin: '0 auto', lineHeight: '1.6' }}>
            Static regex rules alone cannot stop polymorphic evasion. Our ML model is trained on massive threat corpora across international honeypots and CVE disclosures.
          </p>
        </div>

        {/* 3 Pillars of ML Defense */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '32px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>
              <i className="fas fa-layer-group"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px', color: '#ffffff' }}>
              5.2M+ Real-World Dataset Corpus
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.65', color: '#94a3b8' }}>
              Trained on labeled datasets spanning CSIC HTTP, CICIDS, OWASP ModSecurity Core Rule vectors, and live honeypot captures, providing deep exposure to malicious structures.
            </p>
          </div>

          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '32px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>
              <i className="fas fa-cubes-stacked"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px', color: '#ffffff' }}>
              Character N-Gram Vectorizer
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.65', color: '#94a3b8' }}>
              Decomposes payloads into 3-gram and 5-gram token distributions, identifying obfuscated attack syntax, nested base64 escapes, and entropy anomalies in real-time.
            </p>
          </div>

          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '32px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>
              <i className="fas fa-gauge-high"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px', color: '#ffffff' }}>
              Zero False Positive Precision
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.65', color: '#94a3b8' }}>
              Rigorous cross-validation against millions of legitimate JSON, XML, and GraphQL payloads guarantees developer APIs remain uninterrupted while blocking hostile requests.
            </p>
          </div>
        </div>
      </section>

      {/* 8 Threat Vector Defense Pillars */}
      <section style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto', borderTop: '1px solid #1e293b' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '14px', color: '#ffffff' }}>
            Comprehensive Threat Vector Protection
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '640px', margin: '0 auto' }}>
            MDefender Pro analyzes every component of the HTTP lifecycle &mdash; URLs, parameters, cookies, JSON bodies, and headers.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {threatVectors.map((v, i) => (
            <div
              key={i}
              style={{
                background: '#0c1222',
                border: '1px solid #1e293b',
                borderRadius: '14px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: v.bg,
                  color: v.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '18px'
                }}>
                  <i className={`fas ${v.icon}`}></i>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', color: '#f1f5f9' }}>
                  {v.title}
                </h3>

                <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8' }}>
                  {v.desc}
                </p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #1e293b' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: v.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {v.rules}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to Connect Your Website in 3 Easy Steps */}
      <section style={{
        padding: '90px 24px',
        maxWidth: '1240px',
        margin: '0 auto',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '16px'
          }}>
            <i className="fa-solid fa-plug-circle-bolt"></i> Effortless Integration
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '14px', color: '#ffffff' }}>
            Connect Any Website in 3 Minutes
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '680px', margin: '0 auto' }}>
            Zero complex configuration. When you install our package, the enterprise <strong>403 Cyber Block Page</strong> is bundled inside &mdash; just add your API key and your site is protected.
          </p>
        </div>

        {/* 3 Step Visual Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '36px'
        }}>
          {/* Step 1 */}
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '32px 26px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '16px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>1</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>Bundled Block Page</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '10px' }}>
              Install NPM Package
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
              Install the official package into your backend application. The 403 block page is automatically bundled inside:
            </p>
            <div style={{
              background: '#04070e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: "'SF Mono', Monaco, monospace",
              fontSize: '12.5px',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>npm install mdefender-pro</span>
              <i className="fa-solid fa-box" style={{ color: '#64748b' }}></i>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '32px 26px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#c084fc',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '16px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>2</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#c084fc',
                background: 'rgba(139, 92, 246, 0.12)',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(139, 92, 246, 0.25)'
              }}>API Key Auth</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '10px' }}>
              Get Your API Key
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
              Copy your unique tenant API Key from the MDefender dashboard under <Link to="/user/settings" style={{ color: '#38bdf8', textDecoration: 'none' }}>Settings</Link> or <Link to="/user/websites" style={{ color: '#38bdf8', textDecoration: 'none' }}>Websites</Link>:
            </p>
            <div style={{
              background: '#04070e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: "'SF Mono', Monaco, monospace",
              fontSize: '12px',
              color: '#fbbf24',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              apiKey: "Ix2TtXbbBHJolIam3MY..."
            </div>
          </div>

          {/* Step 3 */}
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '32px 26px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '16px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>3</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.12)',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(59, 130, 246, 0.25)'
              }}>Instant Active WAF</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '10px' }}>
              Attach Middleware
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
              Add <code>app.use(mdefender())</code> to your Express app. Every request is inspected in &lt;1ms and threats are blocked with the 403 page!
            </p>
            <div style={{
              background: '#04070e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: "'SF Mono', Monaco, monospace",
              fontSize: '12px',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>app.use(mdefender())</span>
              <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }}></i>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            to="/docs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}
          >
            <i className="fa-solid fa-book-open"></i> View Full Connection Guide &amp; Docs
          </Link>
        </div>
      </section>

      {/* Developer Integration Code Tabs */}
      <section style={{
        background: '#050811',
        borderTop: '1px solid #1e293b',
        borderBottom: '1px solid #1e293b',
        padding: '90px 24px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '34px', fontWeight: '800', marginBottom: '12px', color: '#ffffff' }}>
              Integrate in Minutes With Any Tech Stack
            </h2>
            <p style={{ fontSize: '15px', color: '#94a3b8' }}>
              Drop in our lightweight SDK middleware without changing your core application architecture.
            </p>
          </div>

          {/* Code Tab Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {[
              { id: 'nodejs', label: 'Node.js / Express', icon: 'fa-node-js' },
              { id: 'python', label: 'Python / FastAPI', icon: 'fa-python' },
              { id: 'php', label: 'PHP / Laravel', icon: 'fa-php' },
              { id: 'curl', label: 'cURL Verification', icon: 'fa-terminal' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedLang(tab.id)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: selectedLang === tab.id ? '1px solid #2563eb' : '1px solid #1e293b',
                  background: selectedLang === tab.id ? '#2563eb' : '#0c1222',
                  color: selectedLang === tab.id ? '#ffffff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s'
                }}
              >
                <i className={`fab ${tab.icon} ${tab.id === 'curl' ? 'fas' : ''}`}></i> {tab.label}
              </button>
            ))}
          </div>

          {/* Code Container */}
          <div style={{
            background: '#070b14',
            borderRadius: '12px',
            border: '1px solid #1e293b',
            overflow: 'hidden',
            boxShadow: '0 15px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 18px',
              background: '#04070e',
              borderBottom: '1px solid #1e293b',
              fontSize: '12px',
              color: '#64748b'
            }}>
              <span>Snippet Configuration</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeExamples[selectedLang])
                  alert('Code copied to clipboard!')
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-copy"></i> Copy Code
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '20px 24px',
              color: '#e2e8f0',
              fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
              fontSize: '13px',
              lineHeight: '1.7',
              overflowX: 'auto'
            }}>
              <code>{codeExamples[selectedLang]}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing Overview Section */}
      <section style={{ padding: '90px 24px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '14px', color: '#ffffff' }}>
          Transparent, Predictable Security Pricing
        </h2>
        <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '50px' }}>
          Deploy full-scale WAF defenses with no hidden throughput overage fees.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          textAlign: 'left'
        }}>
          {/* Free Tier */}
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '32px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>Starter</h3>
            <div style={{ fontSize: '32px', fontWeight: '800', margin: '14px 0 6px', color: '#ffffff' }}>$0 <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>/ month</span></div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Essential protection for personal sites &amp; testing.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> 1 Protected Website</li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> 10,000 requests / month</li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> Core WAF Signatures</li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> Community Support</li>
            </ul>
            <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid #334155', color: '#ffffff', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier (Featured) */}
          <div style={{
            background: '#0c1222',
            border: '2px solid #2563eb',
            borderRadius: '14px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 35px rgba(37,99,235,0.2)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '24px',
              background: '#2563eb',
              color: 'white',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase'
            }}>
              Most Popular
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>Enterprise Pro</h3>
            <div style={{ fontSize: '32px', fontWeight: '800', margin: '14px 0 6px', color: '#38bdf8' }}>$29 <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>/ month</span></div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Full security suite for production web apps.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> <strong>Unlimited</strong> Protected Websites</li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> <strong>2,000 Global WAF Rules</strong></li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> <strong>5.2M+ Dataset Machine Learning Core</strong></li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> <strong>Custom Regex Rule Builder</strong></li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> Real-Time Attack Logs &amp; IP Ban</li>
              <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '8px' }}></i> 24/7 Priority SLA Response</li>
            </ul>
            <Link to="/register?plan=pro" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '8px', background: '#2563eb', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
              Upgrade to Enterprise Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer style={{
        borderTop: '1px solid #1e293b',
        padding: '50px 24px 30px',
        background: '#04070e',
        fontSize: '13px',
        color: '#64748b'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-halved" style={{ color: '#2563eb' }}></i> MDefender Pro
            </div>
            <div style={{ marginTop: '4px' }}>Autonomous Web Application Firewall &middot; 5.2M Dataset ML Security</div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Link to="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>Documentation</Link>
            <Link to="/pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pricing</Link>
            <Link to="/user/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>User Portal</Link>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin Console</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} MDefender Pro Security Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
