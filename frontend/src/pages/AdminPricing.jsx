import { useState, useEffect } from 'react'
import api from '../api/api'
import adminStore from '../utils/adminStore'
import {
  CreditCard,
  DollarSign,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  RotateCcw,
  Sliders,
  TrendingUp,
  Percent,
  Calendar,
  Building,
  Key,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info
} from 'lucide-react'

const DEFAULT_DYNAMIC_CONFIG = {
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
}

const DEFAULT_PLANS = {
  free: {
    name: 'Starter Free',
    display_name: 'Starter',
    badge: '14-Day Free Trial',
    monthly_price: 0,
    yearly_price: 0,
    website_limit: 1,
    requests_per_day: 10000,
    scans_per_day: 5,
    max_scan_size_mb: 2,
    waf_mode: 'basic',
    ml_waf: false,
    malware_scanner: true,
    analytics: false,
    notifications: false,
    priority_support: false,
    team_seats: 1,
  },
  go: {
    name: 'Developer Go',
    display_name: 'Developer Go',
    badge: 'Growing Apps',
    monthly_price: 9,
    yearly_price: 90,
    website_limit: 5,
    requests_per_day: 100000,
    scans_per_day: 50,
    max_scan_size_mb: 10,
    waf_mode: 'advanced',
    ml_waf: true,
    malware_scanner: true,
    analytics: true,
    notifications: true,
    priority_support: false,
    team_seats: 3,
  },
  pro: {
    name: 'Enterprise Pro',
    display_name: 'Enterprise Pro',
    badge: 'Most Popular',
    monthly_price: 20,
    yearly_price: 190,
    website_limit: 10,
    requests_per_day: 1000000,
    scans_per_day: 200,
    max_scan_size_mb: 25,
    waf_mode: 'advanced',
    ml_waf: true,
    malware_scanner: true,
    analytics: true,
    notifications: true,
    priority_support: true,
    team_seats: 10,
  },
  enterprise: {
    name: 'Business & Agency',
    display_name: 'Business & Agency',
    badge: 'Agency & Scale',
    monthly_price: 49,
    yearly_price: 470,
    website_limit: 20,
    requests_per_day: 10000000,
    scans_per_day: 10000,
    max_scan_size_mb: 100,
    waf_mode: 'advanced',
    ml_waf: true,
    malware_scanner: true,
    analytics: true,
    notifications: true,
    priority_support: true,
    team_seats: 100,
  },
}

export default function AdminPricing() {
  const [dynamicConfig, setDynamicConfig] = useState(() => {
    return adminStore.get('dynamic_pricing_config') || DEFAULT_DYNAMIC_CONFIG
  })
  const [plans, setPlans] = useState(() => {
    return adminStore.get('pricing_plans') || DEFAULT_PLANS
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [showLegacy, setShowLegacy] = useState(false)

  // Interactive Simulator State
  const [simSites, setSimSites] = useState(5)
  const [simYearly, setSimYearly] = useState(false)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchPricing = async () => {
    setLoading(true)
    try {
      const [dynRes, plansRes] = await Promise.allSettled([
        api.adminGetDynamicPricingConfig(),
        api.adminGetPricing()
      ])

      if (dynRes.status === 'fulfilled' && dynRes.value?.data) {
        const merged = { ...DEFAULT_DYNAMIC_CONFIG, ...dynRes.value.data }
        setDynamicConfig(merged)
        adminStore.set('dynamic_pricing_config', merged)
      }

      if (plansRes.status === 'fulfilled' && plansRes.value?.data?.plans) {
        const raw = plansRes.value.data.plans
        const map = {}
        if (Array.isArray(raw)) {
          raw.forEach(p => { if (p?.id) map[p.id] = p })
        } else if (typeof raw === 'object') {
          Object.assign(map, raw)
        }
        const updated = { ...DEFAULT_PLANS, ...map }
        setPlans(updated)
        adminStore.set('pricing_plans', updated)
      }
    } catch (err) {
      console.error(err)
      showToast('Loaded local fallback pricing configuration', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPricing()
  }, [])

  const handleConfigChange = (field, value) => {
    setDynamicConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBulkTierChange = (index, field, value) => {
    setDynamicConfig(prev => {
      const updated = [...(prev.bulk_tiers || DEFAULT_DYNAMIC_CONFIG.bulk_tiers)]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, bulk_tiers: updated }
    })
  }

  const handlePlanChange = (planId, field, value) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }))
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      await Promise.all([
        api.adminUpdateDynamicPricingConfig(dynamicConfig),
        api.adminUpdatePricing(plans)
      ])
      adminStore.set('dynamic_pricing_config', dynamicConfig)
      adminStore.set('pricing_plans', plans)
      showToast('Pricing engine updated! Changes are live across landing page, user dashboard, and checkout gateways.')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to save pricing configuration', true)
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset dynamic pricing and volume tiers to default $4.00/site/mo model?')) {
      setDynamicConfig(DEFAULT_DYNAMIC_CONFIG)
      setPlans(DEFAULT_PLANS)
      showToast('Reset to defaults in editor. Click "Save All Pricing Changes" to persist.')
    }
  }

  // Calculate simulated billing for preview
  const getApplicableDiscount = (count) => {
    const tiers = dynamicConfig.bulk_tiers || DEFAULT_DYNAMIC_CONFIG.bulk_tiers
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (count >= tiers[i].min_sites) {
        return tiers[i]
      }
    }
    return { discount_percent: 0, label: 'Standard' }
  }

  const currentTier = getApplicableDiscount(simSites)
  const baseRate = simYearly ? Number(dynamicConfig.base_yearly_rate) : Number(dynamicConfig.base_monthly_rate)
  const rawSubtotal = simSites * baseRate
  const discountAmount = (rawSubtotal * currentTier.discount_percent) / 100
  const simTotal = Math.max(0, rawSubtotal - discountAmount)
  const simEffectiveMonthly = simYearly ? (simTotal / 12).toFixed(2) : simTotal.toFixed(2)
  const simAnnualSavings = simYearly
    ? (simSites * Number(dynamicConfig.base_monthly_rate) * 12 - simTotal).toFixed(2)
    : '0.00'

  return (
    <div style={{ padding: '4px 0 40px', maxWidth: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: toastMessage.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '13px 22px',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toastMessage.isError ? <AlertCircle size={17} /> : <CheckCircle2 size={17} style={{ color: '#10B981' }} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Control Header */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '22px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CreditCard size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '19px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                Dynamic SaaS Revenue & Pricing Studio
              </h1>
              <span style={{
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.4px'
              }}>
                LIVE SYNC
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '13.5px', margin: '4px 0 0' }}>
              Real-time per-website billing engine. Configured rates propagate globally to public landing page, user dashboard, and checkout gateways.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchPricing}
            disabled={loading}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
            title="Reload from server"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset ($4.00)</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              background: '#2563EB',
              border: '1px solid #1D4ED8',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Publishing Changes...' : 'Save All Pricing Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Per-Website Engine & Live Simulator */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Left Column: Core Pricing Parameters */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <DollarSign size={18} style={{ color: '#2563EB' }} />
              <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Base Per-Website Rates
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>Universal Model</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Monthly Rate ($ USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8', fontWeight: '600' }}>$</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  value={dynamicConfig.base_monthly_rate}
                  onChange={(e) => handleConfigChange('base_monthly_rate', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 28px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Billed monthly per protected site
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Yearly Rate ($ USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8', fontWeight: '600' }}>$</span>
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="1000"
                  value={dynamicConfig.base_yearly_rate}
                  onChange={(e) => handleConfigChange('base_yearly_rate', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 28px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                $3.33/mo eqv. (17% savings / 2 mo free)
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Trial Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={dynamicConfig.trial_days}
                onChange={(e) => handleConfigChange('trial_days', parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0F172A',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Free enterprise trial on 1st website
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Display Currency
              </label>
              <select
                value={dynamicConfig.currency}
                onChange={(e) => {
                  const curr = e.target.value
                  const sym = curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '$'
                  setDynamicConfig(prev => ({ ...prev, currency: curr, currency_symbol: sym }))
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              >
                <option value="USD">USD ($) — United States Dollar</option>
                <option value="EUR">EUR (€) — Eurozone</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Multi-currency international billing
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Key size={15} style={{ color: '#64748B' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                Paddle Billing Gateway Price IDs
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748B', marginBottom: '4px', fontFamily: 'monospace' }}>
                  Paddle Monthly Price ID
                </label>
                <input
                  type="text"
                  placeholder="pri_01h5..."
                  value={dynamicConfig.price_id_monthly || ''}
                  onChange={(e) => handleConfigChange('price_id_monthly', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748B', marginBottom: '4px', fontFamily: 'monospace' }}>
                  Paddle Yearly Price ID
                </label>
                <input
                  type="text"
                  placeholder="pri_01h5..."
                  value={dynamicConfig.price_id_yearly || ''}
                  onChange={(e) => handleConfigChange('price_id_yearly', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Customer Simulator */}
        <div style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: '12px',
          border: '1px solid #DBEAFE',
          padding: '24px',
          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <TrendingUp size={18} style={{ color: '#059669' }} />
                <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Live Visitor & Checkout Simulator
                </h2>
              </div>
              <span style={{
                background: '#EFF6FF',
                color: '#2563EB',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #DBEAFE'
              }}>
                PREVIEW
              </span>
            </div>

            {/* Slider & Toggle Controls */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                  Simulated Websites: <strong style={{ color: '#2563EB', fontSize: '16px' }}>{simSites}</strong>
                </span>
                <div style={{
                  display: 'inline-flex',
                  background: '#F1F5F9',
                  borderRadius: '8px',
                  padding: '2px',
                  border: '1px solid #E2E8F0'
                }}>
                  <button
                    type="button"
                    onClick={() => setSimYearly(false)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      border: 'none',
                      background: !simYearly ? '#FFFFFF' : 'transparent',
                      color: !simYearly ? '#0F172A' : '#64748B',
                      boxShadow: !simYearly ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimYearly(true)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      border: 'none',
                      background: simYearly ? '#FFFFFF' : 'transparent',
                      color: simYearly ? '#0F172A' : '#64748B',
                      boxShadow: simYearly ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Annual (Save 17%)
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                value={simSites}
                onChange={(e) => setSimSites(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                <span>1 site</span>
                <span>25 sites</span>
                <span>50 sites</span>
                <span>100+ sites</span>
              </div>
            </div>

            {/* Simulated Live Customer Quote Box */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Customer Tier:</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                  {currentTier.label} ({currentTier.discount_percent}% Volume Discount)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Effective Monthly:</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>
                  ${simEffectiveMonthly} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>/ month</span>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed #E2E8F0', paddingTop: '10px' }}>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>
                  {simYearly ? 'Total Annual Checkout:' : 'Total Monthly Checkout:'}
                </span>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB' }}>
                  ${simTotal.toFixed(2)} USD
                </span>
              </div>

              {simYearly && Number(simAnnualSavings) > 0 && (
                <div style={{
                  background: '#ECFDF5',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: '#059669',
                  textAlign: 'center'
                }}>
                  🎉 Customer saves ${simAnnualSavings} USD per year compared to monthly billing!
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} />
            <span>This real-time calculation is automatically used by both Landing Page & User Dashboard.</span>
          </div>
        </div>
      </div>

      {/* Agency Volume Discount Tiers Configuration */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Percent size={18} style={{ color: '#2563EB' }} />
            <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Agency & Fleet Volume Discount Tiers
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Automatic discount applied when customer adds more websites
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tier Label</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Min Websites</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Max Websites</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Discount %</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Effective Rate/Site</th>
              </tr>
            </thead>
            <tbody>
              {(dynamicConfig.bulk_tiers || DEFAULT_DYNAMIC_CONFIG.bulk_tiers).map((tier, idx) => {
                const discountedRate = (Number(dynamicConfig.base_monthly_rate) * (1 - tier.discount_percent / 100)).toFixed(2)
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => handleBulkTierChange(idx, 'label', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0F172A',
                          width: '160px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <input
                        type="number"
                        min="1"
                        value={tier.min_sites}
                        onChange={(e) => handleBulkTierChange(idx, 'min_sites', parseInt(e.target.value, 10) || 1)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          width: '70px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <input
                        type="number"
                        min="1"
                        value={tier.max_sites}
                        onChange={(e) => handleBulkTierChange(idx, 'max_sites', parseInt(e.target.value, 10) || 500)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          width: '70px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={tier.discount_percent}
                          onChange={(e) => handleBulkTierChange(idx, 'discount_percent', parseInt(e.target.value, 10) || 0)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#2563EB',
                            width: '65px'
                          }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13.5px', fontWeight: '700', color: '#059669' }}>
                      ${discountedRate} / site / mo
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Enterprise Inclusions */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
          <Shield size={18} style={{ color: '#059669' }} />
          <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
            Universal Security & Performance Capabilities Included with Every Site
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
          All sites protected under the $4.00/site SaaS plan receive 100% unrestricted enterprise grade protections without feature gating:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {(dynamicConfig.features_included || DEFAULT_DYNAMIC_CONFIG.features_included).map((feat, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '10px 14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '12.5px',
              fontWeight: '600',
              color: '#1E293B'
            }}>
              <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Legacy Plan Accordion */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
      }}>
        <button
          type="button"
          onClick={() => setShowLegacy(prev => !prev)}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: '#F8FAFC',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={17} style={{ color: '#64748B' }} />
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                Legacy Plan Tiers Compatibility (Free, Go, Pro, Enterprise)
              </span>
              <span style={{ display: 'block', fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                Maintained for backwards compatibility with legacy user subscriptions and API tokens.
              </span>
            </div>
          </div>
          {showLegacy ? <ChevronUp size={18} style={{ color: '#64748B' }} /> : <ChevronDown size={18} style={{ color: '#64748B' }} />}
        </button>

        {showLegacy && (
          <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(plans).map(([pid, p]) => (
                <div key={pid} style={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{p.name}</span>
                    <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', color: '#64748B', fontWeight: '600' }}>{p.badge}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Monthly ($)</label>
                      <input
                        type="number"
                        value={p.monthly_price}
                        onChange={(e) => handlePlanChange(pid, 'monthly_price', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Yearly ($)</label>
                      <input
                        type="number"
                        value={p.yearly_price}
                        onChange={(e) => handlePlanChange(pid, 'yearly_price', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Sites Limit</label>
                    <input
                      type="number"
                      value={p.website_limit}
                      onChange={(e) => handlePlanChange(pid, 'website_limit', parseInt(e.target.value, 10) || 1)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Save Footer */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
      }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '11px 26px',
            borderRadius: '9px',
            background: '#2563EB',
            border: '1px solid #1D4ED8',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={16} />
          <span>{saving ? 'Publishing Changes...' : 'Save All Pricing Changes'}</span>
        </button>
      </div>
    </div>
  )
}
