// MDefender Global Real-Time Pricing Synchronization Store
// Eliminates stale price flashing across Public Landing, User Dashboard, Paywall & Checkout
'use strict';

export const DEFAULT_PRICING_CONFIG = {
  base_monthly_rate: 4.0,
  base_yearly_rate: 40.0,
  currency: 'USD',
  currency_symbol: '$',
  trial_days: 14,
  price_id_monthly: '',
  price_id_yearly: '',
  bulk_tiers: [
    { min_sites: 1, max_sites: 9, discount_percent: 0, label: 'Starter Fleet' },
    { min_sites: 10, max_sites: 24, discount_percent: 10, label: 'Growth Agency' },
    { min_sites: 25, max_sites: 49, discount_percent: 15, label: 'Scale Partner' },
    { min_sites: 50, max_sites: 500, discount_percent: 25, label: 'Enterprise MSP' }
  ],
  features_included: [
    'Sub-millisecond (<0.12ms) Edge WAF Inspection',
    'AST Heuristics + Machine Learning Threat Classifier',
    '5.32M+ Checksum Malware Scanner (SQLite B-Tree)',
    'Layer-7 DDoS Mitigation & Anti-Bot PoW Challenge',
    '1-Click Post-Hack Disinfection & Salts Rotation',
    'Zero-Day Real-Time Virtual Patching Engine',
    'WordPress RASP Lockdown & Stealth Gateway',
    'Centralized Multi-Site Fleet Safe Updates',
    'Automated White-Label PDF Audit Reports',
    '24/7 Priority Emergency Security Response SLA'
  ]
};

const STORAGE_KEY = 'mdf_dynamic_pricing_config';
const EVENT_NAME = 'mdf_pricing_updated';

let memoryCache = null;

/**
 * Returns the currently active pricing configuration synchronously.
 * Reads memory cache first, then localStorage, falling back to defaults.
 * This guarantees ZERO FLICKER on component mount.
 */
export function getStoredPricingConfig() {
  if (memoryCache) {
    return memoryCache;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.base_monthly_rate !== 'undefined') {
          memoryCache = {
            ...DEFAULT_PRICING_CONFIG,
            ...parsed,
            base_monthly_rate: Number(parsed.base_monthly_rate) || DEFAULT_PRICING_CONFIG.base_monthly_rate,
            base_yearly_rate: Number(parsed.base_yearly_rate) || DEFAULT_PRICING_CONFIG.base_yearly_rate,
            trial_days: Number(parsed.trial_days) || DEFAULT_PRICING_CONFIG.trial_days,
          };
          return memoryCache;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached pricing config:', e);
    }
  }
  memoryCache = { ...DEFAULT_PRICING_CONFIG };
  return memoryCache;
}

/**
 * Persists updated dynamic pricing to memory and localStorage,
 * and broadcasts an event to all open tabs and components for immediate synchronization.
 */
export function savePricingConfig(newConfig) {
  if (!newConfig || typeof newConfig !== 'object') return;
  const merged = {
    ...DEFAULT_PRICING_CONFIG,
    ...newConfig,
    base_monthly_rate: Number(newConfig.base_monthly_rate) || DEFAULT_PRICING_CONFIG.base_monthly_rate,
    base_yearly_rate: Number(newConfig.base_yearly_rate) || DEFAULT_PRICING_CONFIG.base_yearly_rate,
    trial_days: Number(newConfig.trial_days) || DEFAULT_PRICING_CONFIG.trial_days,
  };

  memoryCache = merged;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save pricing config to localStorage:', e);
    }

    try {
      // Broadcast to components within the current window/tab
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
    } catch (e) {}
  }

  return merged;
}

/**
 * Subscribes to live pricing updates across all tabs and components.
 * Returns an unsubscribe cleanup function.
 */
export function subscribePricing(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const handleCustomEvent = (e) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  const handleStorageEvent = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed) {
          memoryCache = {
            ...DEFAULT_PRICING_CONFIG,
            ...parsed,
            base_monthly_rate: Number(parsed.base_monthly_rate) || DEFAULT_PRICING_CONFIG.base_monthly_rate,
            base_yearly_rate: Number(parsed.base_yearly_rate) || DEFAULT_PRICING_CONFIG.base_yearly_rate,
            trial_days: Number(parsed.trial_days) || DEFAULT_PRICING_CONFIG.trial_days,
          };
          callback(memoryCache);
        }
      } catch (err) {}
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Fetches latest dynamic pricing from backend API in background.
 * Updates local cache and notifies subscribers if different.
 */
export async function syncPricingWithBackend(api) {
  if (!api || !api.getPublicPricingConfig) return getStoredPricingConfig();
  try {
    const res = await api.getPublicPricingConfig();
    const configData = res?.data || res;
    if (configData && (configData.base_monthly_rate !== undefined || configData.trial_days !== undefined)) {
      return savePricingConfig(configData);
    }
  } catch (err) {
    console.warn('Background pricing sync error:', err);
  }
  return getStoredPricingConfig();
}

export default {
  DEFAULT_PRICING_CONFIG,
  getStoredPricingConfig,
  savePricingConfig,
  subscribePricing,
  syncPricingWithBackend,
};
