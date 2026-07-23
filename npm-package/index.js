'use strict';

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_CONFIG = {
  apiKey: '',
  domain: '',
  apiEndpoint: 'https://api.mdefender.com',
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

function renderBlockPage(config, result) {
  if (config.customBlockPage && fs.existsSync(config.customBlockPage)) {
    return fs.readFileSync(config.customBlockPage, 'utf-8');
  }
  
  const attackType = result.attack_type || 'Unknown';
  const confidence = result.confidence || 0;
  const referenceId = result.reference_id || crypto.randomUUID();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Blocked - MDefender Pro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff; }
    .container { text-align: center; padding: 40px; max-width: 600px; }
    .icon { font-size: 80px; margin-bottom: 20px; opacity: 0.9; }
    h1 { font-size: 28px; margin-bottom: 12px; font-weight: 700; }
    .subtitle { font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 30px; }
    .details { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;
      text-align: left; margin-bottom: 30px; backdrop-filter: blur(10px); }
    .details p { font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0; }
    .details strong { color: #e74c3c; }
    .footer { font-size: 12px; color: rgba(255,255,255,0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x1F6AB;</div>
    <h1>Access Blocked</h1>
    <p class="subtitle">This request has been blocked by MDefender Pro WAF</p>
    <div class="details">
      <p><strong>Attack Type:</strong> ${attackType}</p>
      <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%</p>
      <p><strong>Reference ID:</strong> ${referenceId}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    </div>
    <p class="footer">MDefender Pro - Web Application Firewall</p>
  </div>
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
        
        const blockPage = result.block_page || renderBlockPage(config, result);
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
