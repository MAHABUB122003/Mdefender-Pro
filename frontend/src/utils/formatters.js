/**
 * Centralized Enterprise Metric Formatter (Cloudflare / Datadog / GitHub SaaS Standard)
 *
 * Rules:
 * - Below 1,000: Exact integer with commas (0 to 999)
 * - 1,000 to 999,999: Compact 'k' (e.g. 1k, 1.5k, 1.6k, 2k, 2.2k, 10k, 100k)
 * - 1,000,000 to 999,999,999: Compact 'M' (e.g. 1M, 1.2M, 10.5M, 100M)
 * - 1,000,000,000+: Compact 'B' (e.g. 1B, 1.5B)
 */

export function formatMetricNumber(val) {
  if (val === null || val === undefined || val === '') return '0';
  
  // Pass-through percentage strings, ratios, or non-numeric tokens
  if (typeof val === 'string') {
    if (val.includes('%') || val.includes('/') || isNaN(Number(val.replace(/,/g, '')))) {
      return val;
    }
  }

  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  if (isNaN(num)) return '0';

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // 1. Below 1,000: Sequential integer count (1, 2, ..., 999)
  if (abs < 1000) {
    return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
  }

  // 2. Billions (1B+)
  if (abs >= 1000000000) {
    const b = abs / 1000000000;
    const formatted = b >= 100 ? b.toFixed(0) : b.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}B`;
  }

  // 3. Millions (1M+)
  if (abs >= 1000000) {
    const m = abs / 1000000;
    const formatted = m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }

  // 4. Thousands (1k to 999k)
  const k = abs / 1000;
  let formatted;
  if (k >= 100) {
    formatted = k.toFixed(0);
  } else {
    // 1 decimal place with trailing zero removal: 1039 -> 1k, 1574 -> 1.6k, 2200 -> 2.2k
    formatted = k.toFixed(1).replace(/\.0$/, '');
  }
  return `${sign}${formatted}k`;
}

/**
 * Returns exact comma-delimited number for tooltips and hover inspects (e.g. 1574 -> "1,574")
 */
export function formatExactNumber(val) {
  if (val === null || val === undefined || val === '') return '0';
  if (typeof val === 'string' && (val.includes('%') || val.includes('/'))) return val;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  if (isNaN(num)) return String(val);
  return Math.round(num).toLocaleString('en-US');
}

export default {
  formatMetricNumber,
  formatExactNumber
};

