// vite.mjs - Official MDefender Pro Vite Plugin for React/Vue/Svelte SPAs
import mdefender from './index.js';

const VITE_IGNORE_PREFIXES = [
  '/@vite',
  '/@react-refresh',
  '/@fs',
  '/@id',
  '/__vite',
  '/node_modules',
  '/src/',
  '/public/'
];

const STATIC_EXT_REGEX = /\.(js|jsx|ts|tsx|mjs|cjs|css|scss|sass|less|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|otf|map|wasm)(\?.*)?$/i;

export function mdefenderVite(options = {}) {
  const middleware = mdefender({
    timeout: 3000,
    skipPaths: ['/health', '/favicon.ico', ...VITE_IGNORE_PREFIXES, ...(options.skipPaths || [])],
    ...options
  });

  return {
    name: 'mdefender-vite-plugin',
    configureServer(server) {
      if (server && server.middlewares) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const pathname = rawUrl.split('?')[0];

          // Skip internal Vite dev files unless there's an attack query param
          if (VITE_IGNORE_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
            return next();
          }
          if (STATIC_EXT_REGEX.test(pathname) && !rawUrl.includes('?') && req.method === 'GET') {
            return next();
          }

          return middleware(req, res, next);
        });
      }
    },
    configurePreviewServer(server) {
      if (server && server.middlewares) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const pathname = rawUrl.split('?')[0];
          if (STATIC_EXT_REGEX.test(pathname) && !rawUrl.includes('?') && req.method === 'GET') {
            return next();
          }
          return middleware(req, res, next);
        });
      }
    },
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `(function(){
  try {
    var raw = (window.location.search || '') + ' ' + (window.location.hash || '');
    if (!raw.trim()) return;
    var norm = raw;
    try { norm = decodeURIComponent(norm); } catch(e){}
    try { norm = decodeURIComponent(norm); } catch(e){}
    var p = [
      /<\\s*(?:script|iframe|object|embed|svg|img|math)\\b/i,
      /\\bon(?:error|load|click|mouseover|focus|submit)\\s*=/i,
      /\\b(?:javascript|data\\s*:\\s*text\\/html)\\s*:/i,
      /\\b(?:alert|eval|confirm|prompt|document\\.cookie)\\s*\\(/i,
      /\\bUNION\\s+(?:ALL\\s+)?SELECT\\b/i,
      /(?:'|"|\\b)\\s*(?:OR|AND)\\s+['"]?([a-zA-Z0-9_\\-]+)['"]?\\s*=\\s*['"]?\\1/i,
      /(?:--|#|\\/\\*).*?(?:DROP|ALTER|INSERT|DELETE|UPDATE|EXEC)/i,
      /(?:\\.\\.\\/|\\.\\.\\\\|etc\\/passwd|etc\\/shadow|win\\.ini|boot\\.ini)/i,
      /(?:169\\.254\\.169\\.254|metadata\\.google\\.internal|=(?:https?:\\/\\/)?(?:127\\.0\\.0\\.1|169\\.254|localhost|0\\.0\\.0\\.0))/i,
      /(?:;|\\||\\|\\||&&|\`|\\$\\()\\s*(?:cat|ls|id|whoami|powershell|cmd|sh|bash|wget|curl)\\b/i,
      /(?:ignore\\s+all\\s+(?:previous|prior)\\s+instructions|system\\s+override|DAN\\s+mode)/i
    ];
    for (var i = 0; i < p.length; i++) {
      if (p[i].test(norm)) {
        try { window.stop(); } catch(e){}
        break;
      }
    }
  } catch(e){}
})();`,
            injectTo: 'head-prepend'
          }
        ]
      };
    }
  };
}

export default mdefenderVite;
