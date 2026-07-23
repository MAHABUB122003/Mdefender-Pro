'use strict';

function hashPayload(payload) {
  const crypto = require('crypto');
  const str = JSON.stringify(payload);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function redactSensitiveHeaders(headers) {
  const sensitive = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];
  const redacted = { ...headers };
  for (const key of Object.keys(redacted)) {
    if (sensitive.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

module.exports = { hashPayload, sleep, redactSensitiveHeaders };
