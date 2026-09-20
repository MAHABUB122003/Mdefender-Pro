#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const command = args[0] || 'help';

console.log(`\n\x1b[36m\x1b[1m====================================================\x1b[0m`);
console.log(`\x1b[36m\x1b[1m       🛡️  MDefender Pro — Zero-Code WAF CLI       \x1b[0m`);
console.log(`\x1b[36m\x1b[1m====================================================\x1b[0m\n`);

if (command === 'run' || command === 'start') {
  const targetScript = args[1] || 'index.js';
  const scriptPath = path.resolve(process.cwd(), targetScript);

  if (!fs.existsSync(scriptPath)) {
    console.error(`\x1b[31m[!] Target file not found: ${targetScript}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[32m[+] Launching "${targetScript}" with zero-code MDefender WAF protection...\x1b[0m\n`);

  const preloadModule = path.resolve(__dirname, '..', 'auto.js');
  const child = spawn(process.execPath, ['-r', preloadModule, scriptPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

} else if (command === 'init' || command === 'setup') {
  const targetConfig = path.join(process.cwd(), 'mdefender.config.js');

  if (fs.existsSync(targetConfig)) {
    console.log(`\x1b[33m[!] mdefender.config.js already exists in current directory.\x1b[0m`);
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\x1b[32mEnter your MDefender Pro API Key (from Dashboard): \x1b[0m', (apiKey) => {
    rl.question('\x1b[32mEnter your Website Domain (e.g. localhost or mysite.com): \x1b[0m', (domain) => {
      rl.question('\x1b[32mEnter MDefender API Endpoint (default http://localhost:8000): \x1b[0m', (endpoint) => {
        const trimmedKey = (apiKey || 'YOUR_API_KEY_HERE').trim();
        const trimmedDomain = (domain || 'localhost').trim();
        const trimmedEndpoint = (endpoint || 'http://localhost:8000').trim();

        const configTemplate = `/**
 * MDefender Pro Web Application Firewall Configuration
 */
module.exports = {
  // Your Secret Website API Key from MDefender Dashboard
  apiKey: process.env.MDEFENDER_API_KEY || '${trimmedKey}',

  // Domain registered in MDefender Pro
  domain: process.env.MDEFENDER_DOMAIN || '${trimmedDomain}',

  // Inspection Backend Endpoint
  apiEndpoint: process.env.MDEFENDER_API_ENDPOINT || '${trimmedEndpoint}',

  // Defense Mode: 'block' (active protection), 'monitor' (log-only), or 'off'
  mode: 'block',

  // Request timeout in ms (fails open safely if cloud unreachable)
  timeout: 5000,

  // Paths to bypass from inspection
  skipPaths: ['/favicon.ico', '/robots.txt', '/static', '/assets', '/health'],

  // Log blocked attacks in console
  logBlocked: true
};
`;

        fs.writeFileSync(targetConfig, configTemplate, 'utf8');
        console.log(`\n\x1b[32m[+] Created mdefender.config.js successfully!\x1b[0m`);
        console.log(`\n\x1b[36mZero-Code Run Command:\x1b[0m`);
        console.log(`\x1b[90m---------------------------------------------------\x1b[0m`);
        console.log(`  npx mdefender-pro run index.js`);
        console.log(`  OR`);
        console.log(`  node -r mdefender-pro index.js`);
        console.log(`\x1b[90m---------------------------------------------------\x1b[0m\n`);
        rl.close();
      });
    });
  });

} else if (command === 'test') {
  const mdefender = require('../index');
  const config = mdefender.loadConfig();

  console.log(`\x1b[33mTesting WAF connection to ${config.apiEndpoint}...\x1b[0m`);
  
  const testPayload = {
    domain: config.domain || 'localhost',
    request: {
      method: 'GET',
      url: '/test-probe?id=1%20UNION/**/SELECT%20password%20FROM%20users',
      ip: '127.0.0.1',
      headers: { 'User-Agent': 'MDefender-Test-Probe' },
      body: ''
    }
  };

  mdefender.sendAnalyzeRequest(config.apiEndpoint, config.apiKey, testPayload, 5000)
    .then((res) => {
      console.log(`\x1b[32m[+] WAF Connection Successful!\x1b[0m`);
      console.log(`    Status Code : ${res.statusCode}`);
      console.log(`    Decision    : \x1b[31m${res.data?.decision || res.data?.status}\x1b[0m`);
      console.log(`    Attack Type : ${res.data?.attack_type || res.data?.reason}`);
      console.log(`    Reference ID: ${res.data?.reference_id}\n`);
    })
    .catch((err) => {
      console.error(`\x1b[31m[-] WAF Connection Failed: ${err.message}\x1b[0m\n`);
    });

} else {
  console.log(`Commands:`);
  console.log(`  \x1b[32mnpx mdefender-pro run <file>\x1b[0m   Run any Node.js server with ZERO code changes`);
  console.log(`  \x1b[32mnpx mdefender-pro init\x1b[0m         Generate mdefender.config.js interactively`);
  console.log(`  \x1b[32mnpx mdefender-pro test\x1b[0m         Test connection to MDefender inspection engine\n`);
}
