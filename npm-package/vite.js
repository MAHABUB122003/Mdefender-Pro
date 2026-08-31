// vite.js - Official MDefender Pro Vite Plugin (CJS)
const mdefender = require('./index.js');

function mdefenderVite(options = {}) {
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

module.exports = { mdefenderVite };
module.exports.default = mdefenderVite;
