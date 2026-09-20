// vite.js - Official MDefender Pro Vite Plugin (CJS)
const mdefender = require('./index.js');
const fs = require('fs');
const path = require('path');

function mdefenderVite(options = {}) {
  const middleware = mdefender(options);
  
  return {
    name: 'mdefender-vite-plugin',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    transformIndexHtml(html) {
      const inlineGuard = `
<script>
(function(){
  try {
    var raw = (window.location.search || '') + ' ' + (window.location.hash || '');
    if (!raw.trim()) return;
    var norm = raw;
    try { norm = decodeURIComponent(norm); } catch(e){}
    try { norm = decodeURIComponent(norm); } catch(e){}
    var p = [
      /<\s*(?:script|iframe|object|embed|svg|img|math)\b/i,
      /\bon(?:error|load|click|mouseover|focus|submit)\s*=/i,
      /\b(?:javascript|data\s*:\s*text\/html)\s*:/i,
      /\b(?:alert|eval|confirm|prompt|document\.cookie)\s*\(/i,
      /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
      /(?:'|"|\b)\s*(?:OR|AND)\s+['"`]?([a-zA-Z0-9_-]+)['"`]?\s*=\s*['"`]?\1/i,
      /(?:--|#|\/\*).*?(?:DROP|ALTER|INSERT|DELETE|UPDATE|EXEC)/i,
      /(?:\.\.\/|\.\.\\|etc\/passwd|etc\/shadow|win\.ini|boot\.ini)/i,
      /(?:169\.254\.169\.254|metadata\.google\.internal|(?:gopher|dict|file):\/\/|=(?:https?:\/\/)?(?:127\.0\.0\.1|169\.254|localhost|0\.0\.0\.0))/i,
      /(?:;|\||\|\||&&|`|\$\()\s*(?:cat|ls|id|whoami|powershell|cmd|sh|bash|wget|curl)\b/i,
      /(?:ignore\s+all\s+(?:previous|prior)\s+instructions|system\s+override|DAN\s+mode)/i
    ];
    for(var i=0; i<p.length; i++){
      if(p[i].test(norm)){
        try { window.stop(); } catch(e){}
        break;
      }
    }
  } catch(e){}
})();
</script>`;
      return html.replace('<head>', '<head>' + inlineGuard);
    }
  };
}

module.exports = { mdefenderVite };
module.exports.default = mdefenderVite;
