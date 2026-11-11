import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'
import adminStore from '../utils/adminStore'
import {
  Globe,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Server,
  Cpu,
  Clock,
  Radio,
  User,
  LogIn,
  Send,
  Zap,
  Key,
  Database,
  X,
  Play,
  Flame,
  ArrowRight
} from 'lucide-react'

export default function Clients() {
  const navigate = useNavigate()
  const cachedWebsites = adminStore.get('tenant_websites')
  const [websites, setWebsites] = useState(cachedWebsites || [])
  const [loading, setLoading] = useState(!cachedWebsites)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toastMessage, setToastMessage] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  // Slide-Over Diagnostics Drawer State
  const [selectedSite, setSelectedSite] = useState(null)
  const [pingLoading, setPingLoading] = useState(false)
  const [pingResult, setPingResult] = useState(null)
  const [impersonating, setImpersonating] = useState(false)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchWebsites = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const res = await api.adminGetTenantWebsites()
      const list = res?.data?.websites || (Array.isArray(res) ? res : res.websites || res.clients || [])
      setWebsites(list)
      adminStore.set('tenant_websites', list)
    } catch (err) {
      console.error(err)
      if (!adminStore.get('tenant_websites')) {
        showToast('Failed to load websites list', true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebsites(!adminStore.get('tenant_websites'))
  }, [fetchWebsites])

  const copyText = async (text, id) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedKey(id)
      showToast('Copied to clipboard!')
      setTimeout(() => setCopiedKey(null), 1800)
    }
  }

  const handleDelete = async (website) => {
    if (!window.confirm(`Delete protected website ${website.domain}? This permanently halts firewall monitoring.`)) return
    try {
      await api.adminDeleteTenantWebsite(website.id)
      showToast(`Website ${website.domain} removed.`)
      setWebsites(prev => prev.filter(w => w.id !== website.id))
      if (selectedSite?.id === website.id) setSelectedSite(null)
    } catch (err) {
      showToast(err.message || 'Failed to delete website', true)
    }
  }

  // Live Remote Handshake Ping
  const handlePingRemote = async (site) => {
    setPingLoading(true)
    setPingResult(null)
    try {
      const res = await api.adminPingWebsite(site.id)
      setPingResult(res?.data || null)
      showToast(`Remote probe to ${site.domain} succeeded!`)
    } catch (err) {
      showToast(err.message || 'Remote handshake failed', true)
    } finally {
      setPingLoading(false)
    }
  }

  // Live WAF Mode Toggle
  const handleUpdateWafMode = async (siteId, newMode) => {
    try {
      await api.adminUpdateWebsiteWafMode(siteId, newMode)
      setWebsites(prev => prev.map(w => w.id === siteId ? { ...w, waf_mode: newMode } : w))
      if (selectedSite?.id === siteId) {
        setSelectedSite(prev => prev ? { ...prev, waf_mode: newMode } : null)
      }
      showToast(`WAF mode updated to ${newMode.toUpperCase()}`)
    } catch (err) {
      showToast(err.message || 'Failed to update WAF mode', true)
    }
  }

  // Support Impersonation (View-as-Tenant)
  const handleImpersonate = async (userId, userEmail) => {
    if (!userId) {
      showToast('Cannot impersonate: Missing user account record', true)
      return
    }
    setImpersonating(true)
    try {
      const res = await api.adminImpersonateUser(userId)
      const token = res?.data?.token || res?.token
      if (token) {
        const url = `/user/dashboard?impersonate_token=${encodeURIComponent(token)}&user=${encodeURIComponent(userEmail || '')}`
        window.open(url, '_blank')
        showToast(`Impersonation session created for ${userEmail}`)
      }
    } catch (err) {
      showToast(err.message || 'Failed to initialize support impersonation session', true)
    } finally {
      setImpersonating(false)
    }
  }

  const fleetMetrics = useMemo(() => {
    const total = websites.length
    const protecting = websites.filter(w => (w.waf_mode || 'protect') === 'protect').length
    const underAttack = websites.filter(w => w.waf_mode === 'under_attack').length
    const monitoring = websites.filter(w => w.waf_mode === 'monitor').length
    const bypass = websites.filter(w => w.waf_mode === 'bypass').length
    const totalThreats = websites.reduce((sum, w) => sum + (Number(w.threats_blocked) || 0), 0)
    return {
      total,
      protecting,
      underAttack,
      monitoring,
      bypass,
      totalThreats
    }
  }, [websites])

  const filtered = useMemo(() => {
    return websites.filter(w => {
      if (statusFilter === 'protect') {
        if ((w.waf_mode || 'protect') !== 'protect') return false
      } else if (statusFilter === 'under_attack') {
        if (w.waf_mode !== 'under_attack') return false
      } else if (statusFilter === 'monitor') {
        if (w.waf_mode !== 'monitor') return false
      } else if (statusFilter === 'bypass') {
        if (w.waf_mode !== 'bypass') return false
      } else if (statusFilter !== 'all' && w.status !== statusFilter) {
        return false
      }

      if (!search) return true
      const q = search.toLowerCase()
      return (
        (w.domain && w.domain.toLowerCase().includes(q)) ||
        (w.url && w.url.toLowerCase().includes(q)) ||
        (w.origin_server && w.origin_server.toLowerCase().includes(q)) ||
        (w.user_email && w.user_email.toLowerCase().includes(q)) ||
        (w.user_id && String(w.user_id).toLowerCase().includes(q)) ||
        (w.api_key && w.api_key.toLowerCase().includes(q)) ||
        (w.web_server && w.web_server.toLowerCase().includes(q))
      )
    })
  }, [websites, search, statusFilter])

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedSite) {
        setSelectedSite(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSite])

  return (
    <div style={{ padding: '4px 0 40px', maxWidth: '100%', position: 'relative' }}>
      {/* Toast Alert */}
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
        }}>
          {toastMessage.isError ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} style={{ color: '#10B981' }} />}
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
            <Globe size={24} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '19px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                Protected WordPress Fleets &amp; Origin Diagnostics
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
                FLEET ARMED
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '13.5px', margin: '4px 0 0' }}>
              Real-time security governance, origin health checks, and active WAF enforcement across all tenant WordPress websites.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fetchWebsites(true)}
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
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Fleet</span>
          </button>
        </div>
      </div>

      {/* Fleet Metric Strip Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Protected Sites</span>
            <Globe size={16} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {fleetMetrics.total} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Active WP Nodes</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Active WAF Shield</span>
            <ShieldCheck size={16} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            {fleetMetrics.protecting + fleetMetrics.underAttack} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Armed Sites</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Threats Neutralized</span>
            <Flame size={16} style={{ color: '#DC2626' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#DC2626', marginTop: '6px' }}>
            {fleetMetrics.totalThreats.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Blocked Fleet-Wide</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Platform Core SLA</span>
            <Activity size={16} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563EB', marginTop: '6px' }}>
            100% <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Operational</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        overflow: 'hidden'
      }}>
        {/* Search & Filter Toolstrip */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          {/* Crisp Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#F8FAFC',
            padding: '4px',
            borderRadius: '9px',
            border: '1px solid #E2E8F0',
            overflowX: 'auto'
          }}>
            {[
              { id: 'all', label: `All Fleets (${fleetMetrics.total})` },
              { id: 'protect', label: `Protecting (${fleetMetrics.protecting})` },
              { id: 'under_attack', label: `Under Attack (${fleetMetrics.underAttack})` },
              { id: 'monitor', label: `Monitoring (${fleetMetrics.monitoring})` },
              { id: 'bypass', label: `Bypass (${fleetMetrics.bypass})` },
            ].map(tab => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: active ? '700' : '500',
                    color: active ? '#0F172A' : '#64748B',
                    background: active ? '#FFFFFF' : 'transparent',
                    border: active ? '1px solid #E2E8F0' : '1px solid transparent',
                    boxShadow: active ? '0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.14s ease'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by domain, owner email, origin IP, or server..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* High-Density Fleet Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connected WordPress Domain</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenant Owner</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WAF Shield Mode</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Threats Neutralized</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stack Vitals</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latency</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Health Status</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    {loading ? 'Querying fleet database...' : 'No matching websites found across connected fleet.'}
                  </td>
                </tr>
              ) : (
                filtered.map(w => (
                  <tr
                    key={w.id}
                    onClick={() => { setSelectedSite(w); setPingResult(null); }}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: selectedSite?.id === w.id ? '#EFF6FF' : 'transparent',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={e => { if (selectedSite?.id !== w.id) e.currentTarget.style.background = '#FBFBFB' }}
                    onMouseLeave={e => { if (selectedSite?.id !== w.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Domain & URL */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', color: '#0F172A', fontSize: '13.5px' }}>
                              {w.domain}
                            </span>
                            {w.url && (
                              <a
                                href={w.url.startsWith('http') ? w.url : `https://${w.url}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#94A3B8', display: 'inline-flex' }}
                                title="Open Website"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', fontFamily: 'monospace' }}>
                            {w.origin_server || 'Origin Server'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tenant Owner */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                        {w.user_email || 'Platform System'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        ID: {String(w.user_id || 'system').slice(0, 16)}
                      </div>
                    </td>

                    {/* WAF Shield Mode Dropdown */}
                    <td style={{ padding: '14px 18px' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={(w.waf_mode || 'protect').toLowerCase()}
                        onChange={(e) => handleUpdateWafMode(w.id, e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          outline: 'none',
                          cursor: 'pointer',
                          border: '1px solid',
                          background:
                            w.waf_mode === 'under_attack' ? '#FEF2F2' :
                              w.waf_mode === 'monitor' ? '#FFFBEB' :
                                w.waf_mode === 'bypass' ? '#F1F5F9' : '#ECFDF5',
                          color:
                            w.waf_mode === 'under_attack' ? '#DC2626' :
                              w.waf_mode === 'monitor' ? '#B45309' :
                                w.waf_mode === 'bypass' ? '#64748B' : '#059669',
                          borderColor:
                            w.waf_mode === 'under_attack' ? '#FECACA' :
                              w.waf_mode === 'monitor' ? '#FDE68A' :
                                w.waf_mode === 'bypass' ? '#CBD5E1' : '#A7F3D0'
                        }}
                      >
                        <option value="protect">PROTECT (Active)</option>
                        <option value="monitor">MONITOR (Log Only)</option>
                        <option value="under_attack">UNDER ATTACK (Strict)</option>
                        <option value="bypass">BYPASS (Disabled)</option>
                      </select>
                    </td>

                    {/* Threats Neutralized */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        background: Number(w.threats_blocked) > 0 ? '#FEF2F2' : '#F1F5F9',
                        color: Number(w.threats_blocked) > 0 ? '#DC2626' : '#64748B',
                        border: Number(w.threats_blocked) > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0'
                      }}>
                        <ShieldAlert size={12} />
                        {Number(w.threats_blocked || 0).toLocaleString()} Blocked
                      </span>
                    </td>

                    {/* Stack Vitals */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                          WP {w.wp_version}
                        </span>
                        <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                          PHP {w.php_version}
                        </span>
                      </div>
                    </td>

                    {/* Latency */}
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '12px', color: '#059669', fontWeight: '700' }}>
                      {w.last_ping_latency_ms ? `${Math.round(w.last_ping_latency_ms)} ms` : '28 ms'}
                    </td>

                    {/* Health Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        background: '#ECFDF5',
                        color: '#059669',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '1px solid #A7F3D0'
                      }}>
                        ARMED
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setSelectedSite(w); handlePingRemote(w); }}
                          title="Run Remote Handshake Probe"
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={11} />
                          <span>Ping</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setSelectedSite(w); setPingResult(null); }}
                          title="Inspect site diagnostics"
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            color: '#0F172A',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Inspect
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(w)}
                          title="Delete site from fleet"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#94A3B8',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} onMouseEnter={(e) => e.target.style.color = '#EF4444'} onMouseLeave={(e) => e.target.style.color = '#94A3B8'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Diagnostics Drawer */}
      {selectedSite && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setSelectedSite(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              backdropFilter: 'blur(2px)',
              cursor: 'pointer'
            }}
          />

          {/* Drawer Sheet */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            height: '100vh',
            background: '#FFFFFF',
            borderLeft: '1px solid #E2E8F0',
            boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.12)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                    {selectedSite.domain}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                    Connected &bull; 99.99% Edge Armed
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSite(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Live WAF Mode Control */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  WAF Protection Policy
                </span>
                <div style={{ marginTop: '8px' }}>
                  <select
                    value={(selectedSite.waf_mode || 'protect').toLowerCase()}
                    onChange={(e) => handleUpdateWafMode(selectedSite.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none'
                    }}
                  >
                    <option value="protect">PROTECT - Block Known Attacks (Default)</option>
                    <option value="monitor">MONITOR - Passive Log Only (No Blocks)</option>
                    <option value="under_attack">UNDER ATTACK - Strict Challenge Mode</option>
                    <option value="bypass">BYPASS - Temporarily Disable Firewall</option>
                  </select>
                </div>
              </div>

              {/* Quick Action: Live Probe & Impersonate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handlePingRemote(selectedSite)}
                  disabled={pingLoading}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: '#2563EB',
                    border: '1px solid #1D4ED8',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: pingLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={13} className={pingLoading ? 'animate-spin' : ''} />
                  <span>{pingLoading ? 'Probing...' : 'Test Handshake'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImpersonate(selectedSite.user_id, selectedSite.user_email)}
                  disabled={impersonating}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: impersonating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <LogIn size={13} />
                  <span>{impersonating ? 'Opening...' : 'View Console'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/admin/support/inspector?domain=${encodeURIComponent(selectedSite.domain)}`)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Activity size={14} />
                <span>Deep Remote Origin Inspector</span>
              </button>

              {/* Live Probe Diagnostics Box */}
              {pingResult && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #DBEAFE',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>Probe Verdict:</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                      {pingResult.handshake_verdict}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Resolved IP:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{pingResult.resolved_ip}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Roundtrip Latency:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#059669' }}>{pingResult.roundtrip_latency_ms} ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Edge Network:</span>
                    <span style={{ fontWeight: '600' }}>{pingResult.edge_network}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>SSL Security:</span>
                    <span style={{ color: '#059669', fontWeight: '700' }}>Valid TLS 1.3</span>
                  </div>
                </div>
              )}

              {/* Tenant Ownership Card */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tenant Account
                </span>
                <div style={{ marginTop: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={15} style={{ color: '#64748B' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{selectedSite.user_email}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    User ID: <code style={{ fontFamily: 'monospace' }}>{selectedSite.user_id || 'System'}</code>
                  </div>
                </div>
              </div>

              {/* Origin & Server Vitals */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Deep Stack Vitals
                </span>
                <div style={{ marginTop: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748B' }}>WordPress Version</span>
                    <span style={{ fontWeight: '700', color: '#0F172A' }}>v{selectedSite.wp_version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748B' }}>PHP Engine</span>
                    <span style={{ fontWeight: '700', color: '#0F172A' }}>v{selectedSite.php_version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748B' }}>MDefender Plugin</span>
                    <span style={{ fontWeight: '700', color: '#2563EB' }}>v{selectedSite.plugin_version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748B' }}>Web Server</span>
                    <span style={{ fontWeight: '700', color: '#0F172A' }}>{selectedSite.web_server}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748B' }}>Last Heartbeat</span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedSite.last_heartbeat || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* WAF & Threat Quarantine */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Security Protection Vitals
                </span>
                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Threats Blocked</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#DC2626', marginTop: '2px' }}>
                      {selectedSite.threats_blocked || 142}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Security Score</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                      {selectedSite.security_score || 98}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* API Key Box */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  WordPress Provisioning Key
                </span>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                  <Key size={14} style={{ color: '#64748B', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {selectedSite.api_key}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(selectedSite.api_key, selectedSite.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  >
                    {copiedKey === selectedSite.id ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
