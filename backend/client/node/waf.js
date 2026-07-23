/**
 * SecureWAF - Node.js Client
 *
 * Usage:
 *   const waf = require('./client/node/waf');
 *   app.use(waf({ apiKey: 'YOUR_API_KEY' }));
 *
 * That's it. Your website is protected.
 */

const http = require('http');
const https = require('https');

const DEFAULTS = {
  server: 'http://localhost:5000',
  timeout: 3000,
  blockPage: true,
  logBlocked: true,
};

function wafMiddleware(options) {
  if (!options || !options.apiKey) {
    throw new Error('[SecureWAF] apiKey is required. Get one from your WAF dashboard.');
  }

  const config = { ...DEFAULTS, ...options };
  const baseUrl = config.server.replace(/\/+$/, '');

  function analyze(req) {
    return new Promise((resolve) => {
      const body = JSON.stringify({
        request: {
          url: req.originalUrl || req.url,
          method: req.method,
          headers: req.headers,
          body: req.body ? JSON.stringify(req.body) : '',
          ip: req.ip || req.connection?.remoteAddress || 'unknown',
          query_params: req.query || {},
        },
      });

      const url = new URL(`${baseUrl}/api/analyze`);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const postReq = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          timeout: config.timeout,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            Authorization: `Bearer ${options.apiKey}`,
            'X-WAF-Domain': options.domain || '',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: 'allowed' });
            }
          });
        }
      );

      postReq.on('error', () => resolve({ status: 'allowed' }));
      postReq.on('timeout', () => {
        postReq.destroy();
        resolve({ status: 'allowed' });
      });

      postReq.write(body);
      postReq.end();
    });
  }

  return async function waf(req, res, next) {
    const result = await analyze(req);

    if (result.status === 'blocked') {
      if (config.logBlocked) {
        console.log(`[SecureWAF] BLOCKED ${req.method} ${req.originalUrl} - ${result.attack_type}`);
      }
      if (config.blockPage && result.block_page) {
        res.status(403).send(result.block_page);
      } else {
        res.status(403).json({
          status: 'blocked',
          message: 'Blocked by Web Application Firewall',
          attack_type: result.attack_type,
          reference_id: result.reference_id,
        });
      }
      return;
    }

    next();
  };
}

module.exports = wafMiddleware;
