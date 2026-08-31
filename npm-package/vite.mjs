// vite.mjs - Official MDefender Pro Vite Plugin for React/Vue/Svelte SPAs
import mdefender from './index.js';

export function mdefenderVite(options = {}) {
  const middleware = mdefender(options);
  return {
    name: 'mdefender-vite-plugin',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default mdefenderVite;
