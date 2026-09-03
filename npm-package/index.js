'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

const httpAgent = new http.Agent({ keepAlive: true, timeout: 5000 });
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 5000 });

// In-memory cache for bundled block page with mtime check
let cachedDefaultTemplate = null;
let cachedTemplateMtime = 0;

function getDefaultTemplate() {
  try {
    const templatePath = path.join(__dirname, 'block-page.html');
    if (fs.existsSync(templatePath)) {
      const stats = fs.statSync(templatePath);
      if (cachedDefaultTemplate === null || stats.mtimeMs > cachedTemplateMtime) {
        cachedDefaultTemplate = fs.readFileSync(templatePath, 'utf8');
        cachedTemplateMtime = stats.mtimeMs;
      }
    } else {
      cachedDefaultTemplate = '';
    }
  } catch (e) {
    if (!cachedDefaultTemplate) cachedDefaultTemplate = '';
  }
  return cachedDefaultTemplate;
}

const DEFAULT_CONFIG = {
  apiKey: '',
  domain: '',
  apiEndpoint: 'https://mdefenderapi.onrender.com',
  mode: 'block',         // 'block' | 'monitor' | 'off'
  blockStatusCode: 403,
  timeout: 10000,
  maxBodySize: 1024 * 1024, // 1MB
  logBlocked: true,
  customBlockPage: null,
  skipPaths: ['/health', '/favicon.ico'],
  skipUserAgents: [],
  skipMethods: [],
  headers: true,
  onError: 'allow',      // 'allow' | 'block'
};

function loadConfig(overrides = {}) {
  let fileConfig = {};
  
  // Try config-loader
  try {
    const configLoader = require('./config-loader');
    const loaded = configLoader.load();
    if (loaded) fileConfig = loaded;
  } catch (e) {}

  // Try mdefender.config.js
  if (!fileConfig.apiKey) {
    const jsPath = path.resolve(process.cwd(), 'mdefender.config.js');
    if (fs.existsSync(jsPath)) {
      try {
        fileConfig = require(jsPath);
      } catch (e) {
        console.warn('[MDefender] Failed reading mdefender.config.js:', e.message);
      }
    }
  }
  
  // Try mdefender.json
  if (!fileConfig.apiKey) {
    const jsonPath = path.resolve(process.cwd(), 'mdefender.json');
    if (fs.existsSync(jsonPath)) {
      try {
        fileConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      } catch (e) {}
    }
  }
  
  // Try package.json "mdefender" key
  if (!fileConfig.apiKey) {
    try {
      const pkg = require(path.resolve(process.cwd(), 'package.json'));
      if (pkg.mdefender) fileConfig = pkg.mdefender;
    } catch (e) {}
  }

  // Environment variables
  const envConfig = {};
  if (process.env.MDEFENDER_API_KEY) envConfig.apiKey = process.env.MDEFENDER_API_KEY;
  if (process.env.MDEFENDER_DOMAIN) envConfig.domain = process.env.MDEFENDER_DOMAIN;
  if (process.env.MDEFENDER_API_ENDPOINT || process.env.MDEFENDER_ENDPOINT) {
    envConfig.apiEndpoint = process.env.MDEFENDER_API_ENDPOINT || process.env.MDEFENDER_ENDPOINT;
  }
  if (process.env.MDEFENDER_MODE) envConfig.mode = process.env.MDEFENDER_MODE;

  return { ...DEFAULT_CONFIG, ...fileConfig, ...envConfig, ...overrides };
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || '127.0.0.1';
}

function extractBody(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return { raw: '', fields: {}, values: '' };
  }

  if (req.body) {
    if (typeof req.body === 'object') {
      try {
        const raw = JSON.stringify(req.body);
        const values = Object.values(req.body).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' ');
        return { raw, fields: req.body, values };
      } catch (e) {
        return { raw: '', fields: {}, values: '' };
      }
    }
    const str = String(req.body);
    return { raw: str, fields: {}, values: str };
  }

  return { raw: '', fields: {}, values: '' };
}

function sendAnalyzeRequest(endpointUrl, apiKey, data, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    try {
      let analyzePath = '/api/v1/waf/analyze';
      if (endpointUrl.endsWith('/waf/analyze') || endpointUrl.endsWith('/analyze')) {
        analyzePath = '';
      }
      const parsed = new URL(analyzePath, endpointUrl.replace(/\/+$/, '') + '/');
      const postData = JSON.stringify(data);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;
      const agent = isHttps ? httpsAgent : httpAgent;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        agent: agent,
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${apiKey}`,
          'X-MDefender-Version': '1.2.4'
        }
      };

      const req = transport.request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const decisionData = json && json.data ? json.data : json;
            resolve({ statusCode: res.statusCode, data: decisionData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: { status: res.statusCode === 200 ? 'allowed' : 'error', raw: body } });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy(new Error(`WAF request timed out after ${timeoutMs}ms`));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBlockPage(config, result, req) {
  let template = '';
  if (config.customBlockPage) {
    try {
      if (fs.existsSync(config.customBlockPage)) {
        template = fs.readFileSync(config.customBlockPage, 'utf-8');
      }
    } catch (e) {}
  }
  
  if (!template) {
    template = getDefaultTemplate();
  }

  const attackType = result.attack_type || 'Malicious Payload Detected';
  const clientIp = getClientIP(req);
  const reason = result.reason || result.message || 'Request blocked by MDefender Pro WAF security policies.';
  const referenceId = result.reference_id || ('MDF-' + crypto.randomBytes(4).toString('hex').toUpperCase());
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const siteName = config.domain || req.headers.host || 'Protected Website';

  if (!template) {
    return `<!DOCTYPE html><html><head><title>403 Access Denied</title></head><body style="background:#060913;color:#fff;font-family:sans-serif;padding:40px;text-align:center"><h1>403 Forbidden</h1><p>${escapeHtml(reason)}</p><p>Incident ID: ${escapeHtml(referenceId)}</p></body></html>`;
  }

  return template
    .replace(/\{\{(REFERENCE_ID|reference_id)\}\}/g, escapeHtml(referenceId))
    .replace(/\{\{(ATTACK_TYPE|attack_type)\}\}/g, escapeHtml(attackType))
    .replace(/\{\{(CLIENT_IP|client_ip)\}\}/g, escapeHtml(clientIp))
    .replace(/\{\{(SITE_NAME|site_name|website_name)\}\}/g, escapeHtml(siteName))
    .replace(/\{\{(TIMESTAMP|timestamp)\}\}/g, escapeHtml(timestamp))
    .replace(/\{\{(REASON|reason)\}\}/g, escapeHtml(reason));
}

function mdefender(overrides = {}) {
  const config = loadConfig(overrides);

  if (!config.apiKey) {
    console.error('[MDefender] WARNING: No API key provided. Running in bypass mode.');
    return (req, res, next) => next();
  }

  if (config.mode === 'off') {
    return (req, res, next) => next();
  }

  console.log(`[MDefender] WAF active & protecting domain: "${config.domain || 'default'}" via ${config.apiEndpoint}`);

  // Warm-up in-memory block page template cache on initialization
  getDefaultTemplate();

  return async function mdefenderMiddleware(req, res, next) {
    // 1. Skip paths
    const urlPath = (req.originalUrl || req.url || '').split('?')[0];
    if (config.skipPaths.some(p => urlPath.startsWith(p))) return next();
    
    // 2. Skip methods
    if (config.skipMethods.includes(req.method)) return next();
    
    // 3. Skip user agents
    const ua = req.headers['user-agent'] || '';
    if (config.skipUserAgents.some(s => ua.toLowerCase().includes(s.toLowerCase()))) return next();

    try {
      const clientIp = getClientIP(req);
      const host = req.headers.host || 'localhost';
      const parsedUrl = new URL(req.originalUrl || req.url, `http://${host}`);
      const bodyInfo = extractBody(req);

      const payload = {
        domain: config.domain || host.split(':')[0],
        request: {
          method: req.method,
          url: req.originalUrl || req.url || parsedUrl.pathname,
          query_string: parsedUrl.search || '',
          query_params: Object.fromEntries(parsedUrl.searchParams),
          ip: clientIp,
          headers: req.headers || {},
          user_agent: ua,
          referer: req.headers['referer'] || req.headers['referrer'] || '',
          content_type: req.headers['content-type'] || '',
          body: bodyInfo.raw,
          body_fields: bodyInfo.fields,
          body_field_values: bodyInfo.values,
          timestamp: new Date().toISOString(),
        }
      };

      const resp = await sendAnalyzeRequest(config.apiEndpoint, config.apiKey, payload, config.timeout);
      const isBlocked = Boolean(
        result && (
          result.decision === 'BLOCK' ||
          result.action === 'block' ||
          result.status === 'blocked' ||
          result.blocked === true
        )
      );

      if (isBlocked) {
        if (config.logBlocked) {
          console.warn(`[MDefender] BLOCKED ${req.method} ${parsedUrl.pathname} - ${result.attack_type || result.reason || 'Malicious Payload'} (${((result.confidence || 0.95) * 100).toFixed(0)}%) [IP: ${clientIp}]`);
        }
        
        const blockPage = result.block_page || renderBlockPage(config, result, req);
        const headers = {
          'Content-Type': 'text/html; charset=utf-8',
          'X-MDefender-Status': 'blocked',
          'X-MDefender-Attack-Type': result.attack_type || 'unknown',
          'X-MDefender-Ref': result.reference_id || 'MDF-BLOCKED',
        };
        if (req.headers.origin) {
          headers['Access-Control-Allow-Origin'] = req.headers.origin;
          headers['Access-Control-Allow-Credentials'] = 'true';
        }
        res.writeHead(config.blockStatusCode || 403, headers);
        return res.end(blockPage);
      }

      // Safe request
      req.mdefender = {
        status: 'allowed',
        threat_score: result.threat_score || 0,
        reference_id: result.reference_id || null,
      };

      return next();

    } catch (error) {
      console.error(`[MDefender] WAF Warning: ${error.message}`);
      
      if (config.onError === 'block') {
        res.writeHead(503, { 'Content-Type': 'text/html' });
        return res.end('<h1>503 Service Unavailable</h1><p>WAF security service unreachable.</p>');
      }
      
      // Default: Fail-safe allow legitimate traffic to continue
      return next();
    }
  };
}

mdefender.loadConfig = loadConfig;
mdefender.DEFAULT_CONFIG = DEFAULT_CONFIG;
mdefender.sendAnalyzeRequest = sendAnalyzeRequest;

module.exports = mdefender;

