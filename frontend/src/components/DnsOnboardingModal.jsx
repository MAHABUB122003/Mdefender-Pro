import { useState } from 'react'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    billing: 'Forever Free',
    badge: 'Community',
    color: '#64748b',
    features: [
      '1 Protected Domain',
      'Public DNS Auto-Discovery',
      'Manual DNS Management',
      'Basic WAF (2,000 Signatures)',
      '1-Day Threat Log Retention',
      'Community Support'
    ]
  },
  {
    id: 'go',
    name: 'Go',
    price: '$9',
    billing: 'per month',
    badge: 'Popular for Devs',
    color: '#0284c7',
    features: [
      'Up to 5 Protected Domains',
      'Deep Subdomain Discovery',
      'Root & Subdomain Zone Management',
      'Expanded WAF (100k+ Signatures)',
      '7-Day Threat Log Retention',
      'Standard Email Support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    billing: 'per month',
    badge: 'Production Ready',
    color: '#2563eb',
    popular: true,
    features: [
      'Up to 25 Protected Domains',
      'Deep Subdomain Discovery',
      'Full DNS Zone Delegations',
      'ML 5.48M Inference Core + Custom Rules',
      '30-Day Threat Log Retention',
      'Priority 24/7 Support'
    ]
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '$99',
    billing: 'per month',
    badge: 'Enterprise SLA',
    color: '#7c3aed',
    features: [
      'Unlimited Protected Domains',
      'Instant Subdomain Discovery',
      'Advanced Subdomain Delegations',
      'Real-Time Retraining + Zero-Day Shield',
      '365-Day Compliance Audit Retention',
      'Dedicated Enterprise VIP SLA'
    ]
  }
]

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV']

export default function DnsOnboardingModal({ isOpen, onClose, onWebsiteAdded }) {
  const [step, setStep] = useState(1) // 1: Input & Plan, 2: DNS Discovery Review, 3: Nameservers & SSL, 4: Active
  const [domain, setDomain] = useState('')
  const [scanDns, setScanDns] = useState(true)
  const [scanSubdomains, setScanSubdomains] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [sslMode, setSslMode] = useState('flexible') // flexible, full, strict

  // Step 2 DNS records state
  const [discovering, setDiscovering] = useState(false)
  const [records, setRecords] = useState([])
  const [currentNameservers, setCurrentNameservers] = useState([])
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [newRecord, setNewRecord] = useState({
    type: 'A',
    name: '@',
    content: '',
    ttl: 'Auto',
    proxied: true,
    priority: ''
  })

  // Final onboarding result
  const [createdWebsite, setCreatedWebsite] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  if (!isOpen) return null

  const handleCopy = async (text, field) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  // Step 1 -> Step 2: Trigger DNS Discovery
  const handleStartDiscovery = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/')[0].split(':')[0]
    if (!cleanDomain || !cleanDomain.includes('.')) {
      setErrorMsg('Please enter a valid root domain without http:// or path (e.g. example.com).')
      return
    }

    setDiscovering(true)
    setStep(2)

    try {
      if (scanDns) {
        const res = await api.discoverDns(cleanDomain, scanSubdomains)
        const discovered = res?.data?.records || res?.records || []
        const detectedNs = res?.data?.current_nameservers || res?.current_nameservers || []
        if (detectedNs && detectedNs.length > 0) {
          setCurrentNameservers(detectedNs)
        }
        if (discovered.length > 0) {
          setRecords(discovered)
        } else {
          // Provide default origin placeholder
          setRecords([
            { id: 'def-1', type: 'A', name: '@', content: '203.0.113.10', ttl: 'Auto', proxied: true, purpose: 'IPv4 origin server' },
            { id: 'def-2', type: 'CNAME', name: 'www', content: cleanDomain, ttl: 'Auto', proxied: true, purpose: 'Alias' }
          ])
        }
      } else {
        // Manual start
        setRecords([
          { id: 'def-1', type: 'A', name: '@', content: '', ttl: 'Auto', proxied: true, purpose: 'IPv4 origin server' }
        ])
      }
    } catch (err) {
      console.warn('DNS Discovery fallback:', err)
      setRecords([
        { id: 'def-1', type: 'A', name: '@', content: '203.0.113.10', ttl: 'Auto', proxied: true, purpose: 'IPv4 origin server' },
        { id: 'def-2', type: 'CNAME', name: 'www', content: cleanDomain, ttl: 'Auto', proxied: true, purpose: 'Alias' }
      ])
    } finally {
      setDiscovering(false)
    }
  }

  // Toggle Proxied (🟠 WAF Edge) vs DNS Only (⚪ Direct to Origin)
  const handleToggleProxy = (idx) => {
    const updated = [...records]
    const rec = updated[idx]
    if (['MX', 'TXT', 'SRV'].includes(rec.type)) {
      alert(`${rec.type} records cannot be proxied through HTTP/HTTPS WAF.`)
      return
    }
    rec.proxied = !rec.proxied
    setRecords(updated)
  }

  const handleDeleteRecord = (idx) => {
    setRecords(records.filter((_, i) => i !== idx))
  }

  const handleAddManualRecord = (e) => {
    e.preventDefault()
    if (!newRecord.content.trim()) return
    const isProxyable = !['MX', 'TXT', 'SRV'].includes(newRecord.type)
    setRecords([
      ...records,
      {
        id: `manual-${Date.now()}`,
        type: newRecord.type,
        name: newRecord.name.trim() || '@',
        content: newRecord.content.trim(),
        ttl: newRecord.ttl,
        proxied: isProxyable ? newRecord.proxied : false,
        priority: newRecord.priority ? parseInt(newRecord.priority, 10) : undefined,
        purpose: 'Manual entry'
      }
    ])
    setNewRecord({ type: 'A', name: '@', content: '', ttl: 'Auto', proxied: true, priority: '' })
    setShowAddRecord(false)
  }

  // Step 2 -> Step 3: Create Website & Move to Nameservers
  const handleCreateWebsite = async () => {
    setErrorMsg(null)
    setSaving(true)
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/')[0].split(':')[0]

    try {
      const payload = {
        domain: cleanDomain,
        name: cleanDomain,
        url: cleanDomain,
        platform: 'domain',
        plan: selectedPlan,
        ssl_mode: sslMode,
        dns_records: records,
        current_nameservers: currentNameservers
      }

      const res = await api.addUserWebsite(payload)
      if (res?.status === 'error') {
        throw new Error(res.message || 'Failed to connect domain')
      }

      const siteData = res?.website || res?.data?.website || { id: res?.website_id, domain: cleanDomain }
      setCreatedWebsite(siteData)
      setStep(3)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create website zone.')
    } finally {
      setSaving(false)
    }
  }

  // Step 3: Verify Nameservers
  const handleVerifyNameservers = async () => {
    if (!createdWebsite?.id && !createdWebsite?._id) return
    const siteId = createdWebsite.id || createdWebsite._id
    setVerifying(true)
    setVerifyResult(null)

    try {
      const res = await api.verifyWebsiteDns(siteId)
      const data = res?.data || res
      setVerifyResult(data)
      if (data.verified) {
        setStep(4)
        if (onWebsiteAdded) onWebsiteAdded(createdWebsite)
      }
    } catch (err) {
      setVerifyResult({
        verified: false,
        message: err.message || 'DNS verification request failed.'
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        padding: '20px 16px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          width: '100%', maxWidth: '840px', maxHeight: '92vh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          color: '#0f172a', position: 'relative'
        }}
      >
        {/* Wizard Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#ffffff', position: 'sticky', top: 0, zIndex: 10
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', fontSize: '16px'
              }}>
                <i className="fas fa-shield-halved"></i>
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                  Connect your website to MDefender Cloud WAF
                </h2>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                  Enterprise domain-based DDoS &amp; Layer 7 Web Application Firewall
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Multi-Step Progress Tracker */}
        <div style={{
          padding: '14px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
        }}>
          {[
            { num: 1, title: 'Add Website' },
            { num: 2, title: 'DNS Discovery & Review' },
            { num: 3, title: 'Nameservers & SSL' },
            { num: 4, title: 'Cloud WAF Active' }
          ].map((s) => {
            const isCurrent = step === s.num
            const isDone = step > s.num
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isDone ? '#10b981' : isCurrent ? '#f97316' : '#cbd5e1',
                  color: '#fff', fontSize: '11px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isDone ? <i className="fas fa-check"></i> : s.num}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: isCurrent ? '700' : '600',
                  color: isCurrent ? '#0f172a' : isDone ? '#10b981' : '#64748b'
                }}>
                  {s.title}
                </span>
                {s.num < 4 && <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: '#cbd5e1', marginLeft: '6px' }}></i>}
              </div>
            )
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px' }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '13px', fontWeight: '600', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <i className="fas fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: ADD WEBSITE & CHOOSE PLAN */}
          {/* ========================================================================= */}
          {step === 1 && (
            <form onSubmit={handleStartDiscovery}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  Domain name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    required
                    style={{
                      width: '100%', height: '46px', padding: '0 16px 0 42px', borderRadius: '10px',
                      border: '1.5px solid #cbd5e1', fontSize: '14.5px', fontWeight: '600',
                      background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box'
                    }}
                  />
                  <i className="fas fa-globe" style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }}></i>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Enter the root domain without <code>https://</code> or a URL path (e.g. <code>mycompany.com</code>).
                </div>
              </div>

              {/* DNS configuration options */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                padding: '18px 20px', marginBottom: '26px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-satellite-dish" style={{ color: '#0284c7' }}></i>
                  DNS discovery configuration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={scanDns}
                      onChange={e => setScanDns(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span>Scan existing public DNS records automatically</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155', marginLeft: '26px' }}>
                    <input
                      type="checkbox"
                      disabled={!scanDns}
                      checked={scanSubdomains}
                      onChange={e => setScanSubdomains(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span>Discover common subdomains where possible (www, api, mail, blog, admin, shop, etc.)</span>
                  </label>
                </div>
              </div>

              {/* Choose a Plan Matrix */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                    Choose a plan
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Switch or upgrade anytime from settings
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{
                          border: `2px solid ${isSelected ? plan.color : '#e2e8f0'}`,
                          borderRadius: '12px', padding: '16px', cursor: 'pointer',
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          boxShadow: isSelected ? `0 4px 16px ${plan.color}22` : 'none',
                          transition: 'all 0.15s ease', position: 'relative'
                        }}
                      >
                        {plan.popular && (
                          <div style={{
                            position: 'absolute', top: '-9px', right: '12px',
                            background: plan.color, color: '#fff', fontSize: '9.5px', fontWeight: '800',
                            padding: '1px 8px', borderRadius: '10px', textTransform: 'uppercase'
                          }}>
                            Recommended
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{plan.name}</span>
                          <span style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
                            background: `${plan.color}15`, color: plan.color
                          }}>
                            {plan.badge}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{plan.price}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>/{plan.billing}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {plan.features.slice(0, 3).map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-check" style={{ color: '#10b981', fontSize: '9px' }}></i>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13.5px', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 28px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <span>Continue setup</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DNS DISCOVERY & REVIEW */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div>
              {discovering ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#f97316', marginBottom: '14px' }}></i>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
                    Scanning DNS records for {domain}...
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Querying root A, AAAA, CNAME, MX, TXT and probing common subdomains.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Status & Limitation Notice */}
                  <div style={{
                    padding: '14px 18px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a',
                    marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px'
                  }}>
                    <i className="fas fa-triangle-exclamation" style={{ color: '#d97706', fontSize: '16px', marginTop: '2px' }}></i>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
                        DNS Discovery Completed ({records.length} records found)
                      </div>
                      <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px', lineHeight: '1.4' }}>
                        Standard DNS lookups cannot discover all private or unlisted subdomains. If any origin IP, mail server (MX), or subdomain is missing, please add it manually below before proceeding.
                      </div>
                    </div>
                  </div>

                  {/* DNS Records Table Header & Add Record Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                        Review DNS Records for {domain}
                      </h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Shield icons (🛡️ Proxied) route through MDefender Cloud WAF. Globe icons (🌐 DNS Only) resolve directly to origin.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddRecord(!showAddRecord)}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid #0284c7',
                        background: '#f0f9ff', color: '#0284c7', fontSize: '12px', fontWeight: '700',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <i className={`fas ${showAddRecord ? 'fa-times' : 'fa-plus'}`}></i>
                      <span>{showAddRecord ? 'Cancel' : 'Add Record'}</span>
                    </button>
                  </div>

                  {/* Manual Add Record Inline Form */}
                  {showAddRecord && (
                    <form onSubmit={handleAddManualRecord} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                      padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '100px 140px 1fr auto auto',
                      gap: '10px', alignItems: 'center'
                    }}>
                      <select
                        value={newRecord.type}
                        onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12.5px', fontWeight: '700' }}
                      >
                        {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Name (@, www, api)"
                        value={newRecord.name}
                        onChange={e => setNewRecord({ ...newRecord, name: e.target.value })}
                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', fontWeight: '600' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Target IP or Hostname"
                        value={newRecord.content}
                        onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', fontWeight: '600' }}
                        required
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={['MX', 'TXT', 'SRV', 'CAA'].includes(newRecord.type)}
                          checked={['MX', 'TXT', 'SRV', 'CAA'].includes(newRecord.type) ? false : newRecord.proxied}
                          onChange={e => setNewRecord({ ...newRecord, proxied: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                        />
                        <span>Proxied</span>
                      </label>
                      <button
                        type="submit"
                        style={{
                          height: '38px', padding: '0 16px', borderRadius: '8px', border: 'none',
                          background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </form>
                  )}

                  {/* Records Table */}
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
                    marginBottom: '24px', background: '#ffffff'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '10px 14px', width: '80px' }}>Type</th>
                          <th style={{ padding: '10px 14px', width: '140px' }}>Name</th>
                          <th style={{ padding: '10px 14px' }}>Content / Target</th>
                          <th style={{ padding: '10px 14px', width: '90px' }}>TTL</th>
                          <th style={{ padding: '10px 14px', width: '150px' }}>Proxy status</th>
                          <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((rec, idx) => {
                          const isProxyable = !['MX', 'TXT', 'SRV'].includes(rec.type)
                          return (
                            <tr key={rec.id || idx} style={{ borderBottom: idx < records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                                  background: rec.type === 'A' ? '#eff6ff' : rec.type === 'CNAME' ? '#f0fdf4' : '#f8fafc',
                                  color: rec.type === 'A' ? '#2563eb' : rec.type === 'CNAME' ? '#16a34a' : '#475569',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  {rec.type}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                                {rec.name}
                              </td>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155' }}>
                                {rec.content}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                {rec.ttl || 'Auto'}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {isProxyable ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProxy(idx)}
                                    style={{
                                      border: 'none', background: 'none', cursor: 'pointer',
                                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                                      padding: '4px 8px', borderRadius: '6px',
                                      backgroundColor: rec.proxied ? '#eff6ff' : '#f8fafc'
                                    }}
                                    title="Click to toggle Proxied (Edge WAF Armed) vs DNS Only (Direct Origin)"
                                  >
                                    <i className={`fas ${rec.proxied ? 'fa-shield-halved' : 'fa-globe'}`} style={{
                                      color: rec.proxied ? '#2563eb' : '#94a3b8', fontSize: '13px'
                                    }}></i>
                                    <span style={{
                                      fontSize: '11.5px', fontWeight: '700',
                                      color: rec.proxied ? '#1d4ed8' : '#64748b'
                                    }}>
                                      {rec.proxied ? 'Proxied (WAF)' : 'DNS Only'}
                                    </span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                    DNS Only (Not proxyable)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(idx)}
                                  style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                                  title="Remove record"
                                >
                                  <i className="fas fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13.5px', cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateWebsite}
                      disabled={saving}
                      style={{
                        padding: '10px 28px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                      <span>{saving ? 'Saving Zone...' : 'Continue to Nameservers'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: NAMESERVER & SSL CONFIGURATION */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div>
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
                padding: '22px', marginBottom: '24px'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-server" style={{ color: '#2563eb' }}></i>
                  Change your Nameservers at your Domain Registrar
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 18px', lineHeight: '1.5' }}>
                  Log into your domain registrar (GoDaddy, Namecheap, NameSilo, Bluehost, etc.) and complete the following two steps:
                </p>

                {/* Step 1: Remove Existing Nameservers */}
                <div style={{
                  background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px',
                  padding: '16px', marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-trash-can text-rose-600"></i>
                    <span>Step 1: Remove these existing nameservers:</span>
                  </div>
                  {currentNameservers && currentNameservers.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                      {currentNameservers.map((ns, idx) => (
                        <div key={idx} style={{
                          background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px',
                          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' }}>Current NS {idx + 1}:</span>
                          <code style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>{ns}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                      Delete the previous nameservers currently configured on your registrar dashboard.
                    </div>
                  )}
                </div>

                {/* Step 2: Add MDefender Nameservers */}
                <div style={{
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px',
                  padding: '16px', marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-plus-circle text-emerald-600"></i>
                    <span>Step 2: Add MDefender Pro Anycast nameservers:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {['ns1.mdefender.pro', 'ns2.mdefender.pro'].map((ns, i) => (
                      <div key={ns} style={{
                        background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '10px',
                        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
                            MDefender NS {i + 1}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                            {ns}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(ns, ns)}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0',
                            background: '#f0fdf4', color: copiedField === ns ? '#10b981' : '#15803d',
                            fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <i className={`fas ${copiedField === ns ? 'fa-check' : 'fa-copy'}`}></i>
                          <span>{copiedField === ns ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-circle-info" style={{ color: '#0284c7' }}></i>
                  <span>DNS updates usually propagate globally within 5 to 30 minutes. Once completed, your domain will route through MDefender edge security.</span>
                </div>
              </div>

              {/* SSL/TLS Encryption Mode Selector */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  Configure SSL/TLS Encryption Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { id: 'flexible', name: 'Flexible', desc: 'Encrypts browser to MDefender edge. Origin server uses plain HTTP.' },
                    { id: 'full', name: 'Full', desc: 'Encrypts end-to-end. Allows self-signed SSL on your origin server.' },
                    { id: 'strict', name: 'Full (Strict)', desc: 'Encrypts end-to-end with validated CA certificate on origin.' }
                  ].map(mode => (
                    <div
                      key={mode.id}
                      onClick={() => setSslMode(mode.id)}
                      style={{
                        border: `2px solid ${sslMode === mode.id ? '#10b981' : '#e2e8f0'}`,
                        borderRadius: '10px', padding: '14px', cursor: 'pointer',
                        background: sslMode === mode.id ? '#f0fdf4' : '#ffffff'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-lock" style={{ color: sslMode === mode.id ? '#10b981' : '#94a3b8', fontSize: '11px' }}></i>
                        <span>{mode.name}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.3' }}>
                        {mode.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Feedback Banner */}
              {verifyResult && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px',
                  background: verifyResult.verified ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${verifyResult.verified ? '#a7f3d0' : '#fde68a'}`,
                  color: verifyResult.verified ? '#065f46' : '#92400e',
                  fontSize: '12.5px', fontWeight: '600', marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`fas ${verifyResult.verified ? 'fa-check-circle' : 'fa-clock'}`}></i>
                    <span>{verifyResult.message || (verifyResult.verified ? 'Nameservers verified!' : 'DNS Propagation pending.')}</span>
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13.5px', cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i> Back
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(4); if (onWebsiteAdded) onWebsiteAdded(createdWebsite) }}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1',
                      background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    Check Later
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyNameservers}
                    disabled={verifying}
                    style={{
                      padding: '10px 26px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: verifying ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <i className={`fas ${verifying ? 'fa-spinner fa-spin' : 'fa-satellite-dish'}`}></i>
                    <span>{verifying ? 'Verifying Nameservers...' : 'Verify Nameservers & Activate'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CLOUD WAF ACTIVE */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '30px 10px 10px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: '#ecfdf5', color: '#10b981', fontSize: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', border: '2px solid #a7f3d0'
              }}>
                <i className="fas fa-shield-halved"></i>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
                Cloud WAF Protection Active!
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '520px', margin: '0 auto 24px', lineHeight: '1.5' }}>
                Website <strong>{domain}</strong> is now protected by MDefender Pro. All incoming traffic is inspected at the Anycast edge, malicious requests receive the 403 block page, and origin server IP is cloaked.
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', maxWidth: '640px', margin: '0 auto 30px', textAlign: 'left'
              }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Inspection Latency</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>0.35ms</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>WAF Rules</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                    {PLANS.find(p => p.id === selectedPlan)?.name} Tier
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>SSL Encryption</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px', textTransform: 'capitalize' }}>
                    {sslMode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 36px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                }}
              >
                Go to Websites Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
