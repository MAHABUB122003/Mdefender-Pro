// MDefender Ultra-Fast Instant Cache (0ms Stale-While-Revalidate Navigation)
'use strict';

const memoryCache = new Map();
const DEFAULT_TTL = 30 * 1000; // 30 seconds freshness window

export const userStore = {
  // Always return cached data instantly if available (even if stale) to eliminate loading flickers
  get(key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key).data;
    }
    try {
      const stored = sessionStorage.getItem(`mdf_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
    return null;
  },

  isFresh(key, ttl = DEFAULT_TTL) {
    const mem = memoryCache.get(key);
    if (!mem) return false;
    return (Date.now() - mem.timestamp) < ttl;
  },

  set(key, data) {
    if (data === undefined || data === null) return;
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
  },

  remove(key) {
    this.invalidate(key);
  },

  clear(key) {
    this.invalidate(key);
  },

  // Background prefetch for all user tabs so clicks are 100% instant
  async prefetchUserData(api) {
    if (!api) return;
    try {
      const [dash, rules, blacklist] = await Promise.allSettled([
        api.getUserDashboard(),
        api.getUserRules(),
        api.getUserBlacklist(),
      ]);

      if (dash.status === 'fulfilled' && dash.value) {
        this.set('dashboard', dash.value);
        this.set('websites', dash.value);
        this.set('connect', dash.value);
        if (dash.value.user?.plan) {
          localStorage.setItem('mdefender_user_plan', dash.value.user.plan);
        }
        if (dash.value.user?.name) {
          localStorage.setItem('mdefender_user_name', dash.value.user.name);
        }
      }
      if (rules.status === 'fulfilled' && rules.value) {
        const list = Array.isArray(rules.value) ? rules.value : (rules.value.rules || []);
        this.set('rules', list);
      }
      if (blacklist.status === 'fulfilled' && blacklist.value) {
        const list = Array.isArray(blacklist.value) ? blacklist.value : (blacklist.value.blacklist || []);
        this.set('blacklist', list);
      }
    } catch (e) {
      // Background prefetch error non-blocking
    }
  }
};

export default userStore;
