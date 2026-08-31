# MDefender Pro &mdash; Node.js / Express WAF Middleware

[![npm version](https://img.shields.io/npm/v/mdefender-pro.svg)](https://www.npmjs.com/package/mdefender-pro)
[![license](https://img.shields.io/npm/l/mdefender-pro.svg)](https://github.com/mdefender/mdefender/blob/main/LICENSE)
[![Zero Config](https://img.shields.io/badge/Block%20Page-Bundled%20Auto-green.svg)](#bundled-403-block-page)

**MDefender Pro** is an enterprise-grade Web Application Firewall (WAF) middleware for Node.js and Express. It inspects incoming HTTP requests in real-time against **2,000 verified signatures** and a **5.2M+ attack vector Machine Learning engine**, automatically blocking SQL injection, Cross-Site Scripting (XSS), Remote Code Execution (RCE), Directory Traversal (LFI), bot scrapers, and zero-day vulnerabilities.

---

## Key Features

- 🛡️ **Zero Setup Cyber Block Page**: Bundled automatically with the package &mdash; no external HTML or static file hosting required.
- ⚡ **Sub-Millisecond In-Memory Caching**: Template and rules are cached in memory for instantaneous rendering (<5ms).
- 🔑 **Flexible API Key Authentication**: Configure via `mdefender.config.js`, interactive CLI (`npx mdefender-pro init`), environment variables, or inline parameters.
- 🚦 **Fail-Open Safety Mechanism**: If cloud telemetry times out, legitimate traffic passes smoothly without blocking customers.
- 📦 **Zero External Runtime Dependencies**: Pure Node.js standard libraries (`http`, `https`, `crypto`).

---

## 1. Installation

Install the official package in your Node.js / Express backend project:

```bash
npm install mdefender-pro
```

*(When you install `mdefender-pro`, the responsive Cyber 403 Block Page is bundled automatically).*

---

## 2. Quick Setup

### Option A: Interactive CLI (1-Click)

Run the interactive setup tool in your project directory:

```bash
npx mdefender-pro init
```

This prompts for your API key and creates a ready-to-use `mdefender.config.js`.

### Option B: Manual Config File (`mdefender.config.js`)

Create `mdefender.config.js` in your project root:

```js
// mdefender.config.js
module.exports = {
  // Your Website API Key from MDefender Dashboard -> Websites
  apiKey: process.env.MDEFENDER_API_KEY || 'your_64_char_api_key_here',

  // Domain registered in MDefender
  domain: 'yourdomain.com',

  // WAF Cloud / Self-hosted endpoint
  apiEndpoint: 'https://mdefender-pro-6e3r.onrender.com', // or 'http://127.0.0.1:8000' for local dev

  // Protection mode: 'block' (active) | 'monitor' (log-only) | 'off'
  mode: 'block',

  // Log blocked attacks in console
  logBlocked: true
};
```

---

## 3. Attach Middleware to Express

Add `app.use(mdefender())` after your standard body parsers (`express.json()`) and before your routes:

```js
const express = require('express');
const cors = require('cors');
const mdefender = require('mdefender-pro');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach MDefender Pro WAF
// Automatically loads mdefender.config.js and serves bundled 403 block page
app.use(mdefender());

// Your application routes
app.use('/api/books', require('./routes/books'));
app.use('/api/users', require('./routes/users'));

app.listen(5000, () => {
  console.log('Server running with MDefender Pro active protection!');
});
```

---

## 4. Inline Configuration (Alternative)

If you prefer not using a config file, pass options directly:

```js
app.use(mdefender({
  apiKey: 'your_64_char_api_key_here',
  domain: 'yourdomain.com',
  apiEndpoint: 'http://127.0.0.1:8000',
  mode: 'block'
}));
```

---

## 5. Bundled 403 Block Page

When a malicious request is detected (such as `?id=<script>alert(1)</script>` or SQL injection):
1. MDefender Pro immediately returns HTTP status **`403 Forbidden`**.
2. Renders the cyber-security dark glassmorphic Block Page displaying:
   - **Incident Reference ID** (e.g. `MDF-BB46BF9D`) with 1-click clipboard copy.
   - **Attack Type** (e.g. `XSS - Dangerous HTML Tag (<script>) #1`).
   - **Client IP & Timestamp** for security auditing.
   - **Return to Homepage** action button.

---

## 6. How to Test Your Protection

### Test 1: XSS Attack Payload (Expect 403 Blocked)
```bash
curl -i "http://localhost:5000/api/books?id=%3Cscript%3Ealert(1)%3C/script%3E"
```

### Test 2: SQL Injection Payload (Expect 403 Blocked)
```bash
curl -i "http://localhost:5000/api/books?search=%27%20UNION%20SELECT%20null,password%20FROM%20users--"
```

### Test 3: Safe Request (Expect 200 OK)
```bash
curl -i "http://localhost:5000/api/books"
```

---

## Configuration Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `''` | **Required.** Your website API key from dashboard. |
| `domain` | `string` | `''` | Registered domain name or hostname. |
| `apiEndpoint` | `string` | `'http://127.0.0.1:8000'` | WAF inspection endpoint URL. |
| `mode` | `'block' \| 'monitor' \| 'off'` | `'block'` | `block` = active defense, `monitor` = log only. |
| `blockStatusCode` | `number` | `403` | HTTP status code for blocked requests. |
| `timeout` | `number` | `5000` | Request timeout in ms (fails open safely). |
| `skipPaths` | `string[]` | `['/health', '/favicon.ico']` | URL paths to bypass WAF inspection. |
| `logBlocked` | `boolean` | `true` | Log blocked attacks in console. |
| `customBlockPage` | `string \| null` | `null` | Optional path to custom HTML file. |

---

## License

MIT &copy; MDefender Pro
