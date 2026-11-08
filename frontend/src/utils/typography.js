/**
 * MDefender Pro — Enterprise SaaS Typography System
 * Modeled after Cloudflare, Stripe, Datadog & Linear design systems.
 * 
 * Strict 7-Tier Scale:
 * - pageTitle:     20px (Bold 700, -0.02em tracking)
 * - modalTitle:    16px (Bold 700, -0.01em tracking)
 * - sectionTitle:  14px (Semi-bold 600, -0.01em tracking)
 * - statHero:      24px (Bold 700, tabular-nums, -0.03em tracking)
 * - statLarge:     20px (Bold 700, tabular-nums)
 * - body:          13px (Regular 400 or Medium 500)
 * - subtext:       12px (Regular 400 or Medium 500, muted #60716B)
 * - badge:         11px (Bold 700, uppercase, 0.06em tracking)
 * - caption:       10px (Medium 500)
 * - code:          12px (JetBrains Mono / monospace)
 */

export const typography = {
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: '1.25',
    letterSpacing: '-0.02em',
    color: '#10201E'
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
    color: '#10201E'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.35',
    letterSpacing: '-0.01em',
    color: '#10201E'
  },
  statHero: {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1.15',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.03em'
  },
  statLarge: {
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: '1.2',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em'
  },
  statMedium: {
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.25',
    fontVariantNumeric: 'tabular-nums'
  },
  body: {
    fontSize: '13px',
    fontWeight: '400',
    lineHeight: '1.5',
    color: '#334155'
  },
  bodyMedium: {
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  bodyBold: {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.5'
  },
  subtext: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.45',
    color: '#60716B'
  },
  subtextMedium: {
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.45',
    color: '#60716B'
  },
  subtextBold: {
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.45'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  caption: {
    fontSize: '10px',
    fontWeight: '500',
    lineHeight: '1.35'
  },
  code: {
    fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums'
  }
};

export default typography;

