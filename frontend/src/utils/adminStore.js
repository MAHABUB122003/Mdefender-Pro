// MDefender Ultra-Fast Admin Cache Store (0ms Stale-While-Revalidate Navigation)
'use strict';

const memoryCache = new Map();
const DEFAULT_TTL = 30 * 1000; // 30 seconds freshness window

export const adminStore = {
  // Always return cached data instantly if available (even if stale) to eliminate loading flickers
  get(key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key).data;
    }
    try {
      const stored = sessionStorage.getItem(`mdf_admin_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data !== undefined) {
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
      sessionStorage.setItem(`mdf_admin_cache_${key}`, JSON.stringify(entry));
    } catch {}
  },

  getTimestamp(key) {
    const mem = memoryCache.get(key);
    return mem ? mem.timestamp : null;
  },

  invalidate(key) {
    if (key) {
      memoryCache.delete(key);
      try { sessionStorage.removeItem(`mdf_admin_cache_${key}`); } catch {}
    } else {
      memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('mdf_admin_cache_')) sessionStorage.removeItem(k);
        });
      } catch {}
    }
  },

  remove(key) {
    this.invalidate(key);
  },

  clear() {
    this.invalidate();
  },

  // Background prefetch for all admin tabs so navigation is 100% instant
  async prefetchAdminData(api) {
    if (!api) return;
    try {
      const [overview, health, users, pricing, learningStats, logs, websites] = await Promise.allSettled([
        api.adminGetOverview ? api.adminGetOverview() : null,
        api.adminGetSystemHealth ? api.adminGetSystemHealth() : null,
        api.adminGetAllUsers ? api.adminGetAllUsers({}) : null,
        api.adminGetPricing ? api.adminGetPricing() : null,
        api.adminGetLearningStats ? api.adminGetLearningStats() : null,
        api.getLogs ? api.getLogs({ page: 1, limit: 30 }) : null,
        api.adminGetTenantWebsites ? api.adminGetTenantWebsites() : null,
      ]);

      if (overview.status === 'fulfilled' && overview.value?.data) {
        this.set('overview', overview.value.data);
      }
      if (health.status === 'fulfilled' && health.value?.data) {
        this.set('system_health', health.value.data);
      }
      if (users.status === 'fulfilled' && users.value) {
        const uData = users.value.data || users.value;
        this.set('users_data', uData);
      }
      if (pricing.status === 'fulfilled' && pricing.value?.data?.plans) {
        this.set('pricing_plans', pricing.value.data.plans);
      }
      if (learningStats.status === 'fulfilled' && learningStats.value?.data) {
        this.set('learning_stats', learningStats.value.data);
      }
      if (logs.status === 'fulfilled' && logs.value) {
        this.set('global_logs', logs.value);
      }
      if (websites.status === 'fulfilled' && websites.value) {
        const list = websites.value?.data?.websites || (Array.isArray(websites.value) ? websites.value : websites.value.websites || []);
        this.set('tenant_websites', list);
      }
    } catch (e) {
      // Non-blocking prefetch failure
    }
  }
};

export default adminStore;
