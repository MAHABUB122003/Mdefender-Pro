const http = require('http');

function testUrl(path, label) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5173,
      path: path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${label}] Status Code: ${res.statusCode}`);
        console.log(`[${label}] Headers: X-MDefender-Status=${res.headers['x-mdefender-status']} | X-MDefender-Attack=${res.headers['x-mdefender-attack-type']}`);
        console.log(`[${label}] Renders 403 Block Page: ${data.includes('403') || data.includes('MDefender-Pro')}\n`);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(`[${label}] Error:`, e.message);
      resolve();
    });
    req.end();
  });
}

async function run() {
  console.log('--- Testing Vite Server on Port 5173 ---\n');
  await testUrl('/books?id=../../etc/passwd', '1. LFI Attack');
  await testUrl('/books?search=%3Cscript%3Ealert(1)%3C/script%3E', '2. XSS Attack');
  await testUrl('/books?id=1%20UNION%20SELECT%201,2,3', '3. SQLi Attack');
  await testUrl('/books?rce=%3Bcat%20%2Fetc%2Fpasswd', '4. RCE Attack');
  await testUrl('/', '5. Clean Homepage Request');
}

run();
