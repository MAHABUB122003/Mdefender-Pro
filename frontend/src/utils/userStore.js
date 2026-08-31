// MDefender Fast User Data Cache (In-Memory + Session Storage for 0ms navigation)

const memoryCache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds TTL for background freshness

export const userStore = {
  get(key) {
    const mem = memoryCache.get(key);
    if (mem && (Date.now() - mem.timestamp < TTL_MS)) {
      return mem.data;
    }
    try {
      const stored = sessionStorage.getItem(`mdf_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (Date.now() - parsed.timestamp < TTL_MS)) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
    return mem ? mem.data : null; // Return stale data if available for instant display
  },

  set(key, data) {
    const entry = { data, timestamp: Date.now() };
    memoryCache.set(key, entry);
    try {
      sessionStorage.setItem(`mdf_cache_${key}`, JSON.stringify(entry));
    } catch {}
  },

  getTimestamp(key) {
    const mem = memoryCache.get(key);
    return mem ? mem.timestamp : null;
  },

  invalidate(key) {
    if (key) {
      memoryCache.delete(key);
      try { sessionStorage.removeItem(`mdf_cache_${key}`); } catch {}
    } else {
      memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('mdf_cache_')) sessionStorage.removeItem(k);
        });
      } catch {}
    }
  }
};

export default userStore;
