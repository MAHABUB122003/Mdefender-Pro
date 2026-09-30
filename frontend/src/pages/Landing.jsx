import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'
import copyToClipboard from '../utils/clipboard'

const threatVectors = [
  {
    icon: 'fa-database',
    title: 'SQL Injection Defense',
    desc: 'Deep syntactic inspection against union-based, boolean-blind, error-based, and stacked SQL queries across MySQL, PostgreSQL, MSSQL, Oracle, and SQLite.',
    rules: '350+ WAF Rules · ML Verified',
    samplePayload: "admin' UNION SELECT null,password--",
    status: 'BLOCKED (0.18ms)',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)'
  },
  {
    icon: 'fa-code',
    title: 'Cross-Site Scripting (XSS)',
    desc: 'Multi-pass sanitization and payload extraction for stored, reflected, and DOM-based XSS, blocking HTML5 handlers, SVG payloads, and JS pseudo-protocols.',
    rules: '350+ WAF Rules · ML Verified',
    samplePayload: '<script>eval(atob(...))</script>',
    status: 'SANITIZED (0.22ms)',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)'
  },
  {
    icon: 'fa-terminal',
    title: 'RCE & Web Shell Neutralization',
    desc: 'Instant blocking of command injection chains, bash environment subshells, Log4j, Shellshock, serialized PHP objects, and 20+ known web shell variants.',
    rules: '350+ WAF Rules · 5,489,242+ Dataset Trained',
    samplePayload: '; cat /etc/passwd | curl...',
    status: 'QUARANTINED (0.15ms)',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)'
  },
  {
    icon: 'fa-network-wired',
    title: 'DDoS & Rate Limiting Layer',
    desc: 'Adaptive token-bucket rate limiting and L7 volumetric flood mitigation designed to shield backend API origins from distributed denial-of-service spikes.',
    rules: 'Active Volumetric Shield',
    samplePayload: '250,000 req/sec Volumetric Flood',
    status: 'THROTTLED (0.05ms)',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)'
  },
  {
    icon: 'fa-shield-halved',
    title: 'Bot & Vulnerability Scanner Ban',
    desc: 'Automated fingerprinting and real-time banning of automated offensive security tools including sqlmap, Nikto, Acunetix, DirBuster, Gobuster, and scrapers.',
    rules: '200+ Scanner Signatures',
    samplePayload: 'User-Agent: sqlmap/1.7.2#dev',
    status: 'IP BANNED (0.10ms)',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)'
  },
  {
    icon: 'fa-cloud',
    title: 'SSRF & Cloud Metadata Guard',
    desc: 'Blocks unauthorized requests attempting to probe internal RFC1918 subnets, AWS/GCP instance metadata endpoints, and XML External Entities (XXE).',
    rules: '200+ Rules · Cloud Hardened',
    samplePayload: 'http://169.254.169.254/latest/meta',
    status: 'INTERCEPTED (0.14ms)',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)'
  },
  {
    icon: 'fa-file-shield',
    title: 'CMS & Framework Hardening',
    desc: 'Targeted vulnerability filters for WordPress (wp-config, XML-RPC), Laravel/Symfony (.env leaks), Spring4Shell, and Node.js prototype pollution.',
    rules: '300+ Rules · Framework Specific',
    samplePayload: '/wp-content/plugins/.../eval-stdin.php',
    status: 'NEUTRALIZED (0.19ms)',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)'
  },
  {
    icon: 'fa-sliders',
    title: 'Custom Regex Policy Builder',
    desc: 'Enterprise users can author, test, toggle, and deploy custom regular expressions with isolated per-tenant policy enforcement.',
    rules: 'Tenant Isolated Custom Rules',
    samplePayload: 'User Custom Policy #8112 Matched',
    status: 'POLICY ENFORCED',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)'
  }
]

const codeExamples = {
  nodejs: `// 1. Install official NPM package
// npm install mdefender-pro

const express = require('express');
const cors = require('cors');
const mdefender = require('mdefender-pro');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Attach MDefender Pro WAF Middleware (Inspects all requests in real-time)
app.use(mdefender({
  apiKey: process.env.MDEFENDER_API_KEY, // from Dashboard -> Settings
  domain: 'localhost',                  // your domain
  apiEndpoint: 'http://217.15.170.82',  // Cloud WAF Engine
  mode: 'block'                         // Renders bundled 403 Block Page on attack
}));

// 3. Application Routes
app.use('/api/books', require('./routes/books'));
app.use('/api/orders', require('./routes/orders'));

app.listen(5000, () => console.log('Protected server running on port 5000!'));`,

  react_vite: `// 1. In src/main.jsx (Client SPA Protection Shield):
import { initWaf } from 'mdefender-pro/client';

initWaf({
  apiKey: 'YOUR_MDEFENDER_API_KEY', // from Dashboard -> Settings
  domain: 'localhost',
  apiEndpoint: 'http://217.15.170.82'
});

// 2. In vite.config.js (Vite 403 Server Middleware Plugin):
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mdefenderVite } from 'mdefender-pro/vite';

export default defineConfig({
  plugins: [
    mdefenderVite({
      apiKey: 'YOUR_MDEFENDER_API_KEY',
      domain: 'localhost',
      apiEndpoint: 'http://217.15.170.82'
    }),
    react()
  ]
});`,

  python: `# Install: pip install mdefender-python
from fastapi import FastAPI
from mdefender import MDefenderMiddleware

app = FastAPI()

# Attach MDefender Hybrid WAF Layer
app.add_middleware(
    MDefenderMiddleware,
    api_key="YOUR_MDEFENDER_API_KEY",
    api_endpoint="http://217.15.170.82",
    mode="block",
    enable_ml=True, # Active 5,489,242+ Payload ML Model
    rate_limit_rpm=120
)

@app.get("/api/v1/data")
def read_root():
    return {"status": "protected", "waf": "armed", "ml_core": "5.48M_dataset_active"}`,

  php: `<?php
// Require Composer Autoloader
require_once __DIR__ . '/vendor/autoload.php';

use MDefender\\WafShield;

// Enforce hybrid edge protection before routing
$waf = new WafShield([
    'api_key'      => getenv('MDEFENDER_API_KEY'),
    'api_endpoint' => 'http://217.15.170.82',
    'mode'         => 'block',
    'enable_ml'    => true,
    'block_page'   => true // Serves bundled Cyber 403 block page
]);

$waf->inspectRequest(); // Evaluates 2,000 rules + 5,489,242+ ML model in 0.4ms`,

  curl: `# 1. Test XSS Attack (Expect 403 Forbidden & Cyber Block Page):
curl -i "http://localhost:5000/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"

# 2. Test SQL Injection (Expect 403 Forbidden & Cyber Block Page):
curl -i "http://localhost:5000/api/books?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"

# 3. Test Safe Query (Expect 200 OK with data):
curl -i "http://localhost:5000/api/books"`
}

export default function Landing() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [selectedLang, setSelectedLang] = useState('nodejs')
  const [billingCycle, setBillingCycle] = useState('monthly')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b14',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden'
    }}>
      <PublicNavbar />

      {/* Full-Cover Cinematic Cyber World Hero Section */}
      <section style={{
        position: 'relative',
        minHeight: '94vh',
        padding: '135px 24px 90px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(7, 11, 20, 0.72) 0%, rgba(7, 11, 20, 0.88) 60%, #070b14 100%), url('/assets/hero_cyber_matrix_defense.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Floating Ambient Glow Orbs */}
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '8%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0
        }}></div>

        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
          {/* Central High-Contrast Text & CTA Focus Box */}
          <div style={{
            maxWidth: '1080px',
            margin: '0 auto',
            padding: '24px 20px 20px',
            borderRadius: '24px',
            background: 'radial-gradient(circle at 50% 50%, rgba(7, 11, 20, 0.88) 0%, rgba(7, 11, 20, 0.55) 75%, transparent 100%)',
            backdropFilter: 'blur(3px)'
          }}>
            {/* Hybrid Engine Status Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 22px',
              borderRadius: '30px',
              background: 'rgba(10, 15, 29, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              backdropFilter: 'blur(12px)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.4px',
              marginBottom: '26px',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }}></span>
              <span>GLOBAL EDGE DEFENSE &middot; 2,000 WAF RULES + 5,489,242+ NEURAL CORE</span>
            </div>

            {/* Main Title */}
            <h1 style={{
              fontSize: 'clamp(38px, 5.8vw, 68px)',
              fontWeight: '900',
              lineHeight: '1.12',
              letterSpacing: '-0.04em',
              maxWidth: '1060px',
              margin: '0 auto 22px',
              color: '#ffffff',
              textShadow: '0 4px 25px rgba(0, 0, 0, 0.95), 0 0 40px rgba(7, 11, 20, 0.9)'
            }}>
              Autonomous Web Application Firewall Powered by{' '}
              <span style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(56, 189, 248, 0.45))'
              }}>
                5,489,242+ Attack Signatures
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: 'clamp(16.5px, 2vw, 20px)',
              lineHeight: '1.7',
              color: '#f1f5f9',
              maxWidth: '840px',
              margin: '0 auto 38px',
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.95)',
              fontWeight: 500
            }}>
              MDefender Pro combines a deterministic <strong style={{ color: '#ffffff', textDecoration: 'underline', textDecorationColor: '#38bdf8' }}>2,000-rule regex engine</strong> with a state-of-the-art <strong style={{ color: '#38bdf8' }}>Machine Learning model trained on 5,489,242+ real-world attack vectors</strong> to neutralize zero-days, automated bots, and volumetric DDoS in sub-millisecond real time.
            </p>

            {/* Action CTAs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '36px' }}>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 36px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 4px 25px rgba(37, 99, 235, 0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  transition: 'all 0.25s'
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
                  padding: '16px 28px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.25s'
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
                  padding: '16px 28px',
                  borderRadius: '12px',
                  background: 'rgba(7, 11, 20, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  backdropFilter: 'blur(10px)',
                  color: '#94a3b8',
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                <i className="fas fa-download"></i> WordPress Plugin
              </a>
            </div>

            {/* Planetary Edge Telemetry Floating Badges */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '10px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(7, 11, 20, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                backdropFilter: 'blur(10px)',
                fontSize: '12px',
                color: '#10b981',
                fontFamily: 'monospace',
                fontWeight: '700'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                LONDON NODE #419: MITIGATION ACTIVE
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(7, 11, 20, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                backdropFilter: 'blur(10px)',
                fontSize: '12px',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontWeight: '700'
              }}>
                <i className="fas fa-bolt" style={{ fontSize: '11px' }}></i> 0.12ms EDGE TELEMETRY
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(7, 11, 20, 0.85)',
                border: '1px solid rgba(192, 132, 252, 0.4)',
                backdropFilter: 'blur(10px)',
                fontSize: '12px',
                color: '#c084fc',
                fontFamily: 'monospace',
                fontWeight: '700'
              }}>
                <i className="fas fa-brain" style={{ fontSize: '11px' }}></i> 5,489,242+ NEURAL SIGNATURES
              </div>
            </div>
          </div>

          {/* Dual-Engine Live Architecture Simulator */}
          <div style={{
            maxWidth: '1020px',
            margin: '28px auto 0',
            background: 'rgba(10, 15, 29, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '18px',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(37, 99, 235, 0.25)',
            textAlign: 'left',
            overflow: 'hidden'
          }}>
            {/* Window Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              background: 'rgba(4, 7, 14, 0.98)',
              borderBottom: '1px solid rgba(59, 130, 246, 0.25)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>mdefender-core-engine &middot; live telemetry stream</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontFamily: 'monospace', fontWeight: '700' }}>
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
              <div style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '6px', margin: '10px 0', border: '1px solid rgba(255,255,255,0.08)' }}>
                Extracted Body: <span style={{ color: '#fbbf24' }}>{"{"}"username": "admin' OR 1=1 --", "auth_token": "eyJhbGciOiJub25lIn0..."{"}"}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', margin: '12px 0' }}>
                <div style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.35)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700' }}>[STAGE 1: 2,000 WAF RULES]</div>
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px' }}>Matched: SQLi - Boolean Blind Tautology #2</div>
                </div>
                <div style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: '700' }}>[STAGE 2: 5.48M+ DATASET ML]</div>
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
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#38bdf8', letterSpacing: '-0.02em' }}>5,489,242+</div>
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

      {/* 5,489,242+ Dataset Machine Learning Architecture Section */}
      <section style={{ padding: '90px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.35)',
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
            Trained on Over 5.48 Million Real-World Attack Payloads
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '720px', margin: '0 auto', lineHeight: '1.6' }}>
            Static regex rules alone cannot stop polymorphic evasion. Our ML model decomposes AST syntax trees and calculates character n-gram entropy in real time.
          </p>
        </div>

        {/* Interactive Neural Vectorizer Architecture Inspector (No Clunky Banners) */}
        <div style={{
          maxWidth: '1060px',
          margin: '0 auto 40px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.95) 100%)',
          borderRadius: '18px',
          border: '1px solid rgba(139,92,246,0.25)',
          padding: '24px 28px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 10px #c084fc' }}></div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.4px', fontFamily: 'monospace' }}>
                NEURAL VECTORIZATION INFERENCE PIPELINE
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
                Inference: 0.34ms
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#c084fc', fontSize: 11, fontWeight: 700 }}>
                Dataset: 5,489,242+ Weights
              </span>
            </div>
          </div>

          {/* 3-Step Live Token Pipeline Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, fontFamily: 'monospace' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>[1] RAW INCOMING PAYLOAD</div>
              <div style={{ fontSize: 12, color: '#fbbf24', wordBreak: 'break-all' }}>admin'/*%!50000UnIoN*//*!50000SeLeCt*/...</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>[2] CHARACTER N-GRAM EMBEDDING</div>
              <div style={{ fontSize: 12, color: '#38bdf8' }}>[0.941, 0.887, 0.998, 0.124, 0.992]</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>[3] AUTONOMOUS EDGE VERDICT</div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 800 }}>QUARANTINED &middot; RISK CONFIDENCE 99.8%</div>
            </div>
          </div>
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
            padding: '30px 26px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>
              <i className="fas fa-layer-group"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px', color: '#ffffff' }}>
              5,489,242+ Real-World Dataset Corpus
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.65', color: '#94a3b8' }}>
              Trained on labeled datasets spanning CSIC HTTP, CICIDS, OWASP ModSecurity Core Rule vectors, and live honeypot captures, providing deep exposure to malicious structures.
            </p>
          </div>

          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '30px 26px',
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
            padding: '30px 26px',
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

      {/* Global Cloud Edge Mesh & Autonomous DDoS Shield */}
      <section style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto', borderTop: '1px solid #1e293b' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '16px'
          }}>
            <i className="fas fa-globe"></i> Global Distributed PoP Architecture
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '14px', color: '#ffffff' }}>
            Autonomous Global Edge Defense Mesh
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '720px', margin: '0 auto' }}>
            Hostile traffic and multi-gigabit Layer 7 HTTP floods are intercepted and neutralized at 240+ global cloud edge locations before ever touching your origin server.
          </p>
        </div>

        {/* Global Edge PoP Status Console (Clean & Non-cluttered) */}
        <div style={{
          maxWidth: '1080px',
          margin: '0 auto 20px',
          background: '#0a0f1d',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          padding: '24px 28px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-satellite-dish" style={{ color: '#38bdf8' }}></i>
                Real-Time Anycast Edge Node Scrubbing
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                Active mitigation across international high-capacity fiber transit links
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                <i className="fas fa-circle" style={{ fontSize: 8, marginRight: 5 }}></i> 100% Up-time
              </span>
              <span style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>
                240+ Edge PoPs
              </span>
            </div>
          </div>

          {/* 4 Key Edge PoP Regions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { region: 'North America (US-East / West)', ip: '108.162.192.0/18', latency: '0.12ms', status: 'Armed & Scrubbing' },
              { region: 'Europe (London / Frankfurt)', ip: '141.101.64.0/18', latency: '0.15ms', status: 'Armed & Scrubbing' },
              { region: 'Asia-Pacific (Singapore / Tokyo)', ip: '172.64.0.0/13', latency: '0.18ms', status: 'Armed & Scrubbing' },
              { region: 'Australia (Sydney / Melbourne)', ip: '198.41.128.0/17', latency: '0.22ms', status: 'Armed & Scrubbing' }
            ].map((node, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{node.region}</span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>Anycast: {node.ip}</div>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginTop: 4 }}>
                  <i className="fas fa-bolt" style={{ marginRight: 4 }}></i> {node.latency} edge response
                </div>
              </div>
            ))}
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
                border: `1px solid ${v.bg ? v.color + '40' : '#1e293b'}`,
                borderRadius: '16px',
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: v.bg,
                    color: v.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    <i className={`fas ${v.icon}`}></i>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#10b981',
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace'
                  }}>
                    {v.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '8px', color: '#f1f5f9' }}>
                  {v.title}
                </h3>

                <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8', marginBottom: '14px' }}>
                  {v.desc}
                </p>

                {/* Attack Sample Payload Tag */}
                <div style={{
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: '#64748b' }}>Test: </span>{v.samplePayload}
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
              { id: 'nodejs', label: 'Node.js / Express (Backend)', icon: 'fa-node-js' },
              { id: 'react_vite', label: 'React / Vite (Frontend)', icon: 'fa-react' },
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
                onClick={async () => {
                  const ok = await copyToClipboard(codeExamples[selectedLang])
                  if (ok) {
                    alert('Code copied to clipboard!')
                  }
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

      {/* Promotional Pricing Overview Section */}
      <section style={{ padding: '95px 24px', maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '20px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa',
          fontSize: '12px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '16px'
        }}>
          <i className="fas fa-tags"></i> Transparent Enterprise Subscriptions
        </div>
        <h2 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '14px', color: '#ffffff' }}>
          Predictable Cloud Defense Pricing
        </h2>
        <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '640px', margin: '0 auto 34px' }}>
          Deploy full-scale WAF defenses with no bandwidth penalties or hidden overage fees.
        </p>

        {/* Monthly / Annual Billing Switch */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '5px 8px',
          borderRadius: 30,
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid #1e293b',
          marginBottom: 50
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 20px',
              borderRadius: 24,
              border: 'none',
              background: billingCycle === 'monthly' ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : 'transparent',
              color: billingCycle === 'monthly' ? '#ffffff' : '#94a3b8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: billingCycle === 'monthly' ? '0 2px 10px rgba(37,99,235,0.4)' : 'none'
            }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 20px',
              borderRadius: 24,
              border: 'none',
              background: billingCycle === 'yearly' ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : 'transparent',
              color: billingCycle === 'yearly' ? '#ffffff' : '#94a3b8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: billingCycle === 'yearly' ? '0 2px 10px rgba(37,99,235,0.4)' : 'none'
            }}
          >
            <span>Annual Billing</span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 12,
              background: '#10b981',
              color: '#ffffff'
            }}>SAVE 18%</span>
          </button>
        </div>

        {/* 3 Promotional Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '24px',
          textAlign: 'left'
        }}>
          {/* Community Free */}
          <div style={{
            background: '#0c1222',
            border: '1px solid #1e293b',
            borderRadius: '18px',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>Community Edition</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Essential defense for staging and personal APIs.</p>
              <div style={{ fontSize: '38px', fontWeight: '900', color: '#ffffff', marginBottom: '24px' }}>
                $0 <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>/ forever</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> 1 Protected Origin Website</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> 50,000 requests / month</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> Core Deterministic WAF Engine</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> Bundled Cyber 403 Block Page</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> Community Support Forum</li>
              </ul>
            </div>
            <Link
              to="/register"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #334155',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '13.5px',
                transition: 'all 0.2s'
              }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Developer Go */}
          <div style={{
            background: '#0c1222',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '18px',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8', marginBottom: '6px' }}>Developer Go</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>For growing SaaS and multi-app architectures.</p>
              <div style={{ fontSize: '38px', fontWeight: '900', color: '#38bdf8', marginBottom: '24px' }}>
                ${billingCycle === 'yearly' ? '90' : '9'} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>/{billingCycle === 'yearly' ? 'year' : 'mo'}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>5 Protected Websites</strong></li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> 1,000,000 requests / month</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>5,489,242+ Dataset ML Core</strong></li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> Real-Time Attack Logs &amp; IP Blacklist</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> 24h Email Support Response</li>
              </ul>
            </div>
            <Link
              to={`/register?plan=go&cycle=${billingCycle}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(56,189,248,0.12)',
                border: '1px solid rgba(56,189,248,0.3)',
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '13.5px',
                transition: 'all 0.2s'
              }}
            >
              Start Developer Go
            </Link>
          </div>

          {/* Enterprise Pro (Featured Spotlight) */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 26, 1) 100%)',
            border: '2px solid #6366f1',
            borderRadius: '18px',
            padding: '36px 30px',
            position: 'relative',
            boxShadow: '0 15px 45px rgba(99,102,241,0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{
              position: 'absolute',
              top: '-13px',
              right: '24px',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: 'white',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 12px',
              borderRadius: '20px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 10px rgba(99,102,241,0.4)'
            }}>
              Most Popular
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>Enterprise Pro</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Full security suite for production enterprise clusters.</p>
              <div style={{ fontSize: '38px', fontWeight: '900', color: '#60a5fa', marginBottom: '24px' }}>
                ${billingCycle === 'yearly' ? '290' : '29'} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>/{billingCycle === 'yearly' ? 'year' : 'mo'}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>Unlimited</strong> Protected Websites</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>2,000 Global WAF Rules</strong></li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>5,489,242+ Dataset Machine Learning Core</strong></li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> <strong>Custom Regex Rule Authoring</strong></li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> Live Attack Learning Retraining Loop</li>
                <li><i className="fas fa-check" style={{ color: '#10b981', marginRight: '10px' }}></i> 24/7 Priority SLA Response</li>
              </ul>
            </div>
            <Link
              to={`/register?plan=pro&cycle=${billingCycle}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '13px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                transition: 'all 0.2s'
              }}
            >
              Upgrade to Enterprise Pro
            </Link>
          </div>
        </div>

        {/* Deep Comparison Link & Trust Badges */}
        <div style={{ marginTop: '45px', textAlign: 'center' }}>
          <Link
            to="/pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#38bdf8',
              fontSize: '14.5px',
              fontWeight: '700',
              textDecoration: 'none'
            }}
          >
            <span>Compare all 30+ enterprise security features &amp; SLA tiers</span>
            <i className="fas fa-arrow-right" style={{ fontSize: '12px' }}></i>
          </Link>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '28px',
            flexWrap: 'wrap',
            marginTop: '24px',
            color: '#64748b',
            fontSize: '13px'
          }}>
            <span><i className="fas fa-shield-check" style={{ color: '#10b981', marginRight: '6px' }}></i> 30-Day Money-Back Guarantee</span>
            <span><i className="fas fa-lock" style={{ color: '#60a5fa', marginRight: '6px' }}></i> 256-Bit SSL Encrypted Checkout</span>
            <span><i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Instant Cloud Provisioning</span>
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
            <div style={{ marginTop: '4px' }}>Autonomous Web Application Firewall &middot; 5,489,242+ Dataset ML Security</div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Link to="/about" style={{ color: '#94a3b8', textDecoration: 'none' }}>About</Link>
            <Link to="/blog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Threat Blog</Link>
            <Link to="/pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pricing</Link>
            <Link to="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>Documentation</Link>
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
