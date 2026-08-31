'use strict';

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const DEFAULT_CONFIG = {
  apiKey: '',
  domain: '',
  apiEndpoint: 'https://mdefender-pro.onrender.com',
  mode: 'block',         // 'block' | 'monitor' | 'off'
  blockStatusCode: 403,
  timeout: 5000,
  maxBodySize: 1024 * 1024, // 1MB
  logBlocked: true,
  customBlockPage: null,     // path to custom HTML file
  skipPaths: ['/health', '/favicon.ico'],
  skipUserAgents: [],
  skipMethods: [],
  headers: true,             // forward original headers
  onError: 'allow',          // 'allow' | 'block' - what to do if API is unreachable
};

function loadConfig(overrides = {}) {
  let fileConfig = {};
  
  // Try mdefender.config.js
  const jsPath = path.resolve(process.cwd(), 'mdefender.config.js');
  if (fs.existsSync(jsPath)) {
    fileConfig = require(jsPath);
  }
  
  // Try mdefender.json
  const jsonPath = path.resolve(process.cwd(), 'mdefender.json');
  if (!fileConfig.apiKey && fs.existsSync(jsonPath)) {
    fileConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
  
  // Try package.json "mdefender" key
  if (!fileConfig.apiKey) {
    try {
      const pkg = require(path.resolve(process.cwd(), 'package.json'));
      if (pkg.mdefender) fileConfig = pkg.mdefender;
    } catch (e) {}
  }

  return { ...DEFAULT_CONFIG, ...fileConfig, ...overrides };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || 'unknown';
}

function buildPayload(req, config) {
  const ip = getClientIP(req);
  const originalUrl = req.originalUrl || req.url;
  const parsedUrl = new URL(originalUrl, `http://${req.headers.host || 'localhost'}`);
  
  const payload = {
    domain: config.domain,
    method: req.method,
    url: parsedUrl.pathname,
    query_string: parsedUrl.search || '',
    query_params: Object.fromEntries(parsedUrl.searchParams),
    ip: ip,
    headers: config.headers ? req.headers : {},
    user_agent: req.headers['user-agent'] || '',
    referer: req.headers['referer'] || req.headers['referrer'] || '',
    content_type: req.headers['content-type'] || '',
    body: '',
    body_fields: {},
    body_field_values: '',
    timestamp: new Date().toISOString(),
  };

  return payload;
}

function readBody(req) {
  return new Promise((resolve) => {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return resolve('');
    }

    if (req.body) {
      if (typeof req.body === 'string') return resolve(req.body);
      if (typeof req.body === 'object') return resolve(JSON.stringify(req.body));
      return resolve(String(req.body));
    }

    let body = '';
    const maxBytes = 1024 * 1024;
    let bytesRead = 0;

    const onData = (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        resolve(body);
        return;
      }
      body += chunk.toString();
    };

    const onEnd = () => {
      req.removeListener('data', onData);
      resolve(body);
    };

    req.on('data', onData);
    req.on('end', onEnd);

    // If stream already ended
    if (req.readableEnded || req.complete) {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      resolve(body);
    }
  });
}

function parseBody(body, contentType) {
  if (!body) return { fields: {}, values: '' };
  
  try {
    if (contentType && contentType.includes('application/json')) {
      const parsed = JSON.parse(body);
      return { fields: parsed, values: Object.values(parsed).join(' ') };
    }
    if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      const fields = Object.fromEntries(params);
      return { fields, values: Object.values(fields).join(' ') };
    }
  } catch (e) {}
  
  return { fields: {}, values: body };
}

function renderBlockPage(config, result, req) {
  if (config.customBlockPage && fs.existsSync(config.customBlockPage)) {
    return fs.readFileSync(config.customBlockPage, 'utf-8');
  }
  
  const attackType = result.attack_type || 'Security Threat';
  const clientIp = getClientIP(req);
  const reason = result.message || 'This request has been blocked by Web Application Firewall';
  const referenceId = result.reference_id || ('MDF-' + crypto.randomBytes(4).toString('hex').toUpperCase());
  const timestamp = new Date().toISOString();
  const siteName = config.domain || req.headers.host || 'Website Security';
  const color1 = '#6366f1';
  const color2 = '#8b5cf6';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Access Denied &mdash; ${siteName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-1: ${color1};
            --brand-2: ${color2};
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b0f19;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            position: relative;
            overflow-x: hidden;
        }
        .bg-glow {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 0;
        }
        .block-wrapper {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 600px;
            animation: fadeIn .4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .block-card {
            background: rgba(17, 24, 39, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 36px 36px 28px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
            position: relative;
            overflow: hidden;
        }
        .block-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--brand-1), var(--brand-2), #ef4444);
        }
        .block-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            margin-bottom: 24px;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--brand-1), var(--brand-2));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .brand-icon svg {
            width: 20px;
            height: 20px;
            fill: #ffffff;
        }
        .brand-title h2 {
            font-size: 16px;
            font-weight: 700;
            color: #f8fafc;
            line-height: 1.2;
        }
        .brand-title span {
            font-size: 11px;
            font-weight: 600;
            color: #94a3b8;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .ref-pill {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 600;
            color: #94a3b8;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 4px 12px;
            border-radius: 999px;
            letter-spacing: 0.5px;
        }
        .block-hero {
            text-align: center;
            margin-bottom: 24px;
        }
        .shield-badge {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.25);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            color: #ef4444;
            animation: pulseGlow 2s infinite ease-in-out;
        }
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
            50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
        }
        .shield-badge svg {
            width: 32px;
            height: 32px;
        }
        .block-hero h1 {
            font-size: 24px;
            font-weight: 800;
            color: #f8fafc;
            margin-bottom: 6px;
            letter-spacing: -0.5px;
        }
        .block-hero p {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.5;
            max-width: 480px;
            margin: 0 auto;
        }
        .details-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 4px 16px;
            margin-bottom: 22px;
        }
        .detail-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 11px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            font-size: 13px;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        .detail-label {
            color: #64748b;
            font-weight: 500;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        .detail-val {
            font-weight: 600;
            color: #f1f5f9;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }
        .detail-val.threat {
            color: #f87171;
            background: rgba(239, 68, 68, 0.1);
            padding: 2px 8px;
            border-radius: 6px;
            border: 1px solid rgba(239, 68, 68, 0.2);
            font-size: 12px;
        }
        .detail-val.mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #a5b4fc;
        }
        .info-card {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 22px;
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.5;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .info-card svg {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
            fill: #38bdf8;
            margin-top: 1px;
        }
        .actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 22px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            border: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--brand-1), var(--brand-2));
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
            color: #ffffff;
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #cbd5e1;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #f8fafc;
        }
        .block-footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 12px;
            color: #64748b;
        }
        .block-footer strong {
            color: #94a3b8;
        }
        @media (max-width: 600px) {
            .block-card { padding: 24px 20px 20px; border-radius: 16px; }
            .block-hero h1 { font-size: 20px; }
            .detail-item { flex-direction: column; align-items: flex-start; gap: 4px; }
            .detail-val { text-align: left; max-width: 100%; }
            .actions { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="bg-glow"></div>
    <div class="block-wrapper">
        <div class="block-card">
            <div class="block-header">
                <div class="brand">
                    <div class="brand-icon">
                        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>
                    </div>
                    <div class="brand-title">
                        <h2>MDefender-Pro</h2>
                        <span>Web Application Firewall</span>
                    </div>
                </div>
                <div class="ref-pill" id="refId">ID: ${referenceId}</div>
            </div>

            <div class="block-hero">
                <div class="shield-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <h1>403 &mdash; Access Denied</h1>
                <p>${reason}</p>
            </div>

            <div class="details-box">
                <div class="detail-item">
                    <span class="detail-label">Attack Type</span>
                    <span class="detail-val threat">${attackType}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Client IP</span>
                    <span class="detail-val mono">${clientIp}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Reason</span>
                    <span class="detail-val">Request blocked by MDefender Pro WAF security policies.</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Reference ID</span>
                    <span class="detail-val mono">${referenceId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Timestamp</span>
                    <span class="detail-val">${timestamp}</span>
                </div>
            </div>

            <div class="info-card">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <div>
                    If you believe this is a false alarm or legitimate traffic was mistakenly blocked, please reach out to the website administrator with the <strong>Reference ID</strong> above.
                </div>
            </div>

            <div class="actions">
                <a href="/" class="btn btn-primary">Return to Homepage</a>
                <button type="button" class="btn btn-secondary" onclick="copyRef()">Copy Reference ID</button>
            </div>

            <div class="block-footer">
                Secured by <strong>MDefender-Pro AI Firewall</strong> &bull; All unauthorized access attempts are logged.
            </div>
        </div>
    </div>

    <script>
    function copyRef() {
        var ref = "${referenceId}";
        if (navigator.clipboard) {
            navigator.clipboard.writeText(ref).then(function() {
                var el = document.getElementById('refId');
                el.innerText = 'Copied!';
                setTimeout(function() { el.innerText = 'ID: ' + ref; }, 2000);
            });
        }
    }
    </script>
</body>
</html>`;
}

function mdefender(overrides = {}) {
  const config = loadConfig(overrides);

  if (!config.apiKey) {
    console.error('[MDefender] ERROR: No API key provided. Set it in mdefender.config.js or pass it as an option.');
    return (req, res, next) => next();
  }

  if (config.mode === 'off') {
    return (req, res, next) => next();
  }

  const client = axios.create({
    baseURL: config.apiEndpoint,
    timeout: config.timeout,
    httpAgent,
    httpsAgent,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'X-MDefender-Version': '1.0.0',
    },
  });

  return async function mdefenderMiddleware(req, res, next) {
    // Skip certain paths
    if (config.skipPaths.some(p => req.url.startsWith(p))) return next();
    
    // Skip certain methods
    if (config.skipMethods.includes(req.method)) return next();
    
    // Skip certain user agents
    const ua = req.headers['user-agent'] || '';
    if (config.skipUserAgents.some(s => ua.toLowerCase().includes(s.toLowerCase()))) return next();

    try {
      // Read and parse request body
      const rawBody = await readBody(req);
      const contentType = req.headers['content-type'] || '';
      const { fields, values } = parseBody(rawBody, contentType);
      
      // Build payload
      const payload = buildPayload(req, config);
      payload.body = rawBody;
      payload.body_fields = fields;
      payload.body_field_values = values;

      // Send to MDefender API
      const response = await client.post('/api/analyze', {
        request: payload,
        domain: config.domain,
      });

      const result = response.data;

      if (result.status === 'blocked') {
        if (config.logBlocked) {
          console.log(`[MDefender] BLOCKED ${req.method} ${req.url} - ${result.attack_type} (${(result.confidence * 100).toFixed(1)}%)`);
        }
        
        const blockPage = result.block_page || renderBlockPage(config, result, req);
        res.writeHead(config.blockStatusCode, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-MDefender-Status': 'blocked',
          'X-MDefender-Attack-Type': result.attack_type || 'unknown',
        });
        return res.end(blockPage);
      }

      // Request is safe - attach result to request for downstream use
      req.mdefender = {
        status: 'allowed',
        threat_score: result.threat_score || 0,
        request_id: result.request_id || null,
      };

      return next();

    } catch (error) {
      console.error(`[MDefender] API Error: ${error.message}`);
      
      if (config.onError === 'block') {
        res.writeHead(503, { 'Content-Type': 'text/html' });
        return res.end('<html><body><h1>Service Temporarily Unavailable</h1><p>WAF service is currently unreachable. Please try again later.</p></body></html>');
      }
      
      // Default: allow request on error
      return next();
    }
  };
}

mdefender.loadConfig = loadConfig;
mdefender.DEFAULT_CONFIG = DEFAULT_CONFIG;

module.exports = mdefender;
