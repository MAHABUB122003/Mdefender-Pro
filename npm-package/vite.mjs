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
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];
        if (STATIC_EXT_REGEX.test(pathname) && !rawUrl.includes('?') && req.method === 'GET') {
          return next();
        }
        return middleware(req, res, next);
      });
    }
  };
}

export default mdefenderVite;

