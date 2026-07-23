'use strict';

const path = require('path');
const fs = require('fs');

function findConfig(startDir) {
  const configs = [
    'mdefender.config.js',
    'mdefender.config.cjs',
    'mdefender.json',
  ];
  
  let dir = startDir || process.cwd();
  
  while (dir !== path.dirname(dir)) {
    for (const name of configs) {
      const fp = path.join(dir, name);
      if (fs.existsSync(fp)) return fp;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function load(startDir) {
  const configPath = findConfig(startDir);
  if (!configPath) return null;
  
  if (configPath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return require(configPath);
}

module.exports = { findConfig, load };
