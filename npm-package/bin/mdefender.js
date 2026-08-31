#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const command = args[0] || 'init';

console.log(`\n\x1b[36m\x1b[1m========================================\x1b[0m`);
console.log(`\x1b[36m\x1b[1m   MDefender Pro - Quick Setup CLI      \x1b[0m`);
console.log(`\x1b[36m\x1b[1m========================================\x1b[0m\n`);

if (command === 'init' || command === 'setup') {
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
    rl.question('\x1b[32mEnter your Website Domain (e.g. myapp.com or default): \x1b[0m', (domain) => {
      const trimmedKey = (apiKey || 'YOUR_API_KEY_HERE').trim();
      const trimmedDomain = (domain || 'default').trim();

      const configTemplate = `/**
 * MDefender Pro Web Application Firewall Configuration
 * Generated automatically by @mdefender/pro CLI
 */
module.exports = {
  // Your Secret Website API Key from MDefender Dashboard
  apiKey: process.env.MDEFENDER_API_KEY || '${trimmedKey}',

  // Domain registered in MDefender Pro
  domain: '${trimmedDomain}',

  // Cloud / Self-hosted Inspection Endpoint
  apiEndpoint: process.env.MDEFENDER_API_ENDPOINT || 'https://mdefender-pro-6e3r.onrender.com',

  // Mode: 'block' (active defense), 'monitor' (log-only), or 'off'
  mode: 'block',

  // Request timeout for cloud inspection in milliseconds (fails open safely)
  timeout: 3000,

  // Paths to bypass from inspection (e.g. static assets)
  skipPaths: ['/favicon.ico', '/robots.txt', '/static', '/assets', '/health'],

  // HTTP methods to bypass
  skipMethods: ['OPTIONS'],

  // Log blocked attacks in console
  logBlocked: true
};
`;

      fs.writeFileSync(targetConfig, configTemplate, 'utf8');
      console.log(`\n\x1b[32m[+] Created mdefender.config.js successfully!\x1b[0m`);
      console.log(`\n\x1b[36mHow to use in your Express app:\x1b[0m`);
      console.log(`\x1b[90m---------------------------------------------------\x1b[0m`);
      console.log(`  const express = require('express');`);
      console.log(`  const mdefender = require('mdefender-pro');`);
      console.log(`  `);
      console.log(`  const app = express();`);
      console.log(`  app.use(express.json());`);
      console.log(`  app.use(mdefender()); // Connects WAF with bundled block page`);
      console.log(`\x1b[90m---------------------------------------------------\x1b[0m\n`);
      rl.close();
    });
  });
} else {
  console.log(`Usage: npx mdefender-pro init`);
  process.exit(0);
}
