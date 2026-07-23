# MDefender Pro

[![npm version](https://img.shields.io/npm/v/mdefender.svg)](https://www.npmjs.com/package/mdefender)
[![license](https://img.shields.io/npm/l/mdefender.svg)](https://github.com/mdefender/mdefender/blob/main/LICENSE)

**MDefender Pro** is a Web Application Firewall (WAF) middleware for Node.js/Express. It intercepts incoming HTTP requests and sends them to the MDefender Pro API for real-time threat analysis, blocking malicious traffic such as XSS, SQLi, CSRF, and other OWASP Top 10 attacks.

## Installation

```bash
npm install mdefender
```

## Quick Start

```js
const express = require('express');
const mdefender = require('mdefender');

const app = express();

// Protect all routes
app.use(mdefender({
  apiKey: 'your-api-key-here',
  domain: 'example.com',
}));

app.get('/', (req, res) => {
  res.send('Hello, protected world!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Configuration

You can configure MDefender in three ways:

1. **Inline** - Pass options directly to the middleware
2. **Config file** - Use `mdefender.config.js` or `mdefender.json`
3. **package.json** - Add a `"mdefender"` key to your `package.json`

Priority order: **Inline options > Config file > package.json**

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `''` | **Required.** Your MDefender Pro API key |
| `domain` | `string` | `''` | **Required.** The domain to protect |
| `apiEndpoint` | `string` | `'https://api.mdefender.com'` | MDefender API base URL |
| `mode` | `'block' \| 'monitor' \| 'off'` | `'block'` | `block` = block threats, `monitor` = log only, `off` = disabled |
| `blockStatusCode` | `number` | `403` | HTTP status code for blocked requests |
| `timeout` | `number` | `5000` | API request timeout in milliseconds |
| `maxBodySize` | `number` | `1048576` | Max request body size in bytes (1MB) |
| `logBlocked` | `boolean` | `true` | Log blocked requests to console |
| `customBlockPage` | `string \| null` | `null` | Path to a custom HTML file for block page |
| `skipPaths` | `string[]` | `['/health', '/favicon.ico']` | Paths to skip WAF checking |
| `skipUserAgents` | `string[]` | `[]` | User agents to skip (substring match) |
| `skipMethods` | `string[]` | `[]` | HTTP methods to skip entirely |
| `headers` | `boolean` | `true` | Forward original request headers to API |
| `onError` | `'allow' \| 'block'` | `'allow'` | Behavior when API is unreachable |

### Config File: `mdefender.config.js`

```js
module.exports = {
  apiKey: process.env.MDEFENDER_API_KEY,
  domain: 'example.com',
  mode: 'block',
  skipPaths: ['/health', '/ping', '/favicon.ico'],
  logBlocked: true,
};
```

### Config File: `mdefender.json`

```json
{
  "apiKey": "your-api-key-here",
  "domain": "example.com",
  "mode": "block",
  "skipPaths": ["/health", "/ping"],
  "onError": "allow"
}
```

### `package.json`

```json
{
  "name": "my-app",
  "mdefender": {
    "apiKey": "your-api-key-here",
    "domain": "example.com"
  }
}
```

## Advanced Usage

### Custom Block Page

Provide a path to your own HTML file:

```js
app.use(mdefender({
  apiKey: 'your-key',
  domain: 'example.com',
  customBlockPage: path.join(__dirname, 'views', 'block.html'),
}));
```

### Monitor Mode (Log Only)

Run in monitoring mode to analyze requests without blocking:

```js
app.use(mdefender({
  apiKey: 'your-key',
  domain: 'example.com',
  mode: 'monitor',
}));
```

### Skip Specific Paths

```js
app.use(mdefender({
  apiKey: 'your-key',
  domain: 'example.com',
  skipPaths: ['/health', '/api/webhook', '/static/'],
}));
```

### Block on API Error

By default, requests are allowed if the WAF API is unreachable. To block instead:

```js
app.use(mdefender({
  apiKey: 'your-key',
  domain: 'example.com',
  onError: 'block',
}));
```

### Accessing Analysis Results

After the middleware processes a request, analysis data is attached to `req.mdefender`:

```js
app.get('/dashboard', (req, res) => {
  if (req.mdefender) {
    console.log('Threat score:', req.mdefender.threat_score);
    console.log('Request ID:', req.mdefender.request_id);
  }
  res.send('Dashboard');
});
```

## API Reference

### `mdefender(config?)`

Returns an Express middleware function.

**Parameters:**
- `config` *(optional)* - `MDefenderConfig` object. Options merge with file-based config and defaults.

**Returns:** `Express middleware function`

### `mdefender.loadConfig(overrides?)`

Utility to load configuration from file sources with optional overrides.

### `mdefender.DEFAULT_CONFIG`

The default configuration object.

## How It Works

1. A request hits your Express app
2. MDefender intercepts it and builds a payload (method, URL, headers, body, IP, etc.)
3. The payload is sent to the MDefender Pro API for analysis
4. If the API detects a threat, it returns a `blocked` status with attack details
5. MDefender renders a block page and responds with the configured status code
6. If safe, the request continues to your route handler

## License

MIT
