import { useState, useEffect } from 'react'
import api from '../api/api'

const DEFAULT_PLANS = {
  free: {
    name: 'Starter Free',
    display_name: 'Starter',
    badge: 'Free Forever',
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
    monthly_price: 29,
    yearly_price: 290,
    website_limit: 25,
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
    name: 'Dedicated Enterprise',
    display_name: 'Enterprise Ultimate',
    badge: 'Maximum Scale',
    monthly_price: 99,
    yearly_price: 990,
    website_limit: 500,
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
  const [plans, setPlans] = useState(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchPricing = async () => {
    try {
      setLoading(true)
      const res = await api.adminGetPricing()
      if (res?.data?.plans) {
        const map = {}
        res.data.plans.forEach(p => {
          map[p.id] = p
        })
        setPlans({ ...DEFAULT_PLANS, ...map })
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load plan pricing', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPricing()
  }, [])

  const handleChange = (planId, field, value) => {
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
    try {
      setSaving(true)
      await api.adminUpdatePricing(plans)
      showToast('Pricing and plan tiers updated successfully! Changes are live across checkout and website quotas.')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to save pricing configuration', true)
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Reset all plan prices and quotas to system defaults?')) {
      setPlans(DEFAULT_PLANS)
      showToast('Reset to defaults in editor. Click "Save All Changes" to persist.')
    }
  }

  const tierColors = {
    free: { border: '#334155', tagBg: 'rgba(100,116,139,0.2)', tagColor: '#cbd5e1', icon: 'fa-shield' },
    go: { border: '#2563eb', tagBg: 'rgba(37,99,235,0.2)', tagColor: '#60a5fa', icon: 'fa-bolt' },
    pro: { border: '#f59e0b', tagBg: 'rgba(245,158,11,0.2)', tagColor: '#fbbf24', icon: 'fa-crown' },
    enterprise: { border: '#8b5cf6', tagBg: 'rgba(139,92,246,0.2)', tagColor: '#c084fc', icon: 'fa-building-shield' },
  }

  return (
    <div className="admin-pricing-page" style={{ padding: '4px 0 50px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-tags" style={{ color: '#f59e0b' }}></i>
            Subscription Pricing & Plan Tiers
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
            Configure live monthly/annual pricing, website limits, malware scan sizes, and ML WAF features for all user tiers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-rotate-left"></i> Reset Defaults
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
            {saving ? 'Saving Live Prices...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '10px' }}></i>
          Loading pricing configuration...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px'
          }}>
            {['free', 'go', 'pro', 'enterprise'].map(pid => {
              const p = plans[pid] || DEFAULT_PLANS[pid]
              const styleMeta = tierColors[pid] || tierColors.free
              return (
                <div
                  key={pid}
                  style={{
                    background: '#0f172a',
                    borderRadius: '14px',
                    border: `1.5px solid ${styleMeta.border}`,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    position: 'relative'
                  }}
                >
                  {/* Top Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className={`fas ${styleMeta.icon}`} style={{ color: styleMeta.tagColor, fontSize: '16px' }}></i>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                        {p.name || pid.toUpperCase()}
                      </span>
                    </div>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      background: styleMeta.tagBg,
                      color: styleMeta.tagColor
                    }}>
                      {p.badge || pid}
                    </span>
                  </div>

                  {/* Pricing Inputs */}
                  <div style={{
                    background: '#070b14',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid #1e293b',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                          Monthly ($ USD)
                        </label>
                        <div style={{ position: 'relative', marginTop: '4px' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#64748b', fontWeight: '700' }}>$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={p.monthly_price ?? 0}
                            onChange={(e) => handleChange(pid, 'monthly_price', Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '8px 8px 8px 24px',
                              borderRadius: '6px',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                          Yearly ($ USD)
                        </label>
                        <div style={{ position: 'relative', marginTop: '4px' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#64748b', fontWeight: '700' }}>$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={p.yearly_price ?? 0}
                            onChange={(e) => handleChange(pid, 'yearly_price', Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '8px 8px 8px 24px',
                              borderRadius: '6px',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotas & Limits */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Protected Websites Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={p.website_limit ?? 1}
                        onChange={(e) => handleChange(pid, 'website_limit', Number(e.target.value))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#070b14', border: '1px solid #1e293b', color: '#f8fafc', marginTop: '3px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Daily Request Limit</label>
                        <input
                          type="number"
                          min="100"
                          value={p.requests_per_day ?? 10000}
                          onChange={(e) => handleChange(pid, 'requests_per_day', Number(e.target.value))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#070b14', border: '1px solid #1e293b', color: '#f8fafc', marginTop: '3px', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Daily Scans Limit</label>
                        <input
                          type="number"
                          min="1"
                          value={p.scans_per_day ?? 10}
                          onChange={(e) => handleChange(pid, 'scans_per_day', Number(e.target.value))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#070b14', border: '1px solid #1e293b', color: '#f8fafc', marginTop: '3px', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Max Scan File Size (MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={p.max_scan_size_mb ?? 10}
                        onChange={(e) => handleChange(pid, 'max_scan_size_mb', Number(e.target.value))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#070b14', border: '1px solid #1e293b', color: '#f8fafc', marginTop: '3px', outline: 'none' }}
                      />
                    </div>

                    {/* Features Toggle Checklist */}
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid #1e293b',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={p.ml_waf ?? false}
                          onChange={(e) => handleChange(pid, 'ml_waf', e.target.checked)}
                        />
                        <span><strong>5.2M Dataset ML WAF Classifier</strong></span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={p.malware_scanner ?? true}
                          onChange={(e) => handleChange(pid, 'malware_scanner', e.target.checked)}
                        />
                        <span>Cloud Malware Scanner Engine</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={p.analytics ?? false}
                          onChange={(e) => handleChange(pid, 'analytics', e.target.checked)}
                        />
                        <span>Telemetry Analytics & Alerts</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={p.priority_support ?? false}
                          onChange={(e) => handleChange(pid, 'priority_support', e.target.checked)}
                        />
                        <span>24/7 Priority SLA Support</span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '28px', textAlign: 'right' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
              {saving ? 'Saving...' : 'Save All Pricing Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
