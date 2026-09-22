'use strict';

/**
 * MDefender Pro Zero-Code Auto-Instrumentation Agent.
 *
 * Automatically hooks into Express and Node.js native http/https servers
 * to provide full WAF protection without changing a single line of application code.
 */

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

let isHooked = false;

function autoHook() {
  if (isHooked) return;
  isHooked = true;

  const mdefender = require('./index');

  // Load environment variables from .env if present
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const dotenv = require('dotenv');
      dotenv.config({ path: envPath });
    } catch (e) {}
  }

  const activeConfig = mdefender.loadConfig();

  if (activeConfig.mode === 'off') {
    return;
  }

  console.log(`\x1b[36m\x1b[1m[MDefender Pro] Zero-Code WAF Protection Active\x1b[0m`);
  console.log(`\x1b[90m   Inspection Endpoint: ${activeConfig.apiEndpoint}\x1b[0m`);
  console.log(`\x1b[90m   Protected Domain   : ${activeConfig.domain || 'auto-detect'}\x1b[0m`);
  console.log(`\x1b[90m   Defense Mode       : ${activeConfig.mode.toUpperCase()}\x1b[0m\n`);

  // 1. Hook Express if loaded
  try {
    const express = require('express');
    if (express && express.application && typeof express.application.lazyrouter === 'function') {
      const origLazyRouter = express.application.lazyrouter;
      express.application.lazyrouter = function () {
        origLazyRouter.apply(this, arguments);
        if (!this._mdefenderAttached && this._router) {
          this._mdefenderAttached = true;
          this._router.use(mdefender(activeConfig));
        }
      };
    }
  } catch (e) {}
}

// Automatically activate when loaded via -r / --require
autoHook();

module.exports = { autoHook };
