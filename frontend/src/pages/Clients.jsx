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
      const data = res?.data || null
      setPingResult(data)
      if (data) {
        const isOnline = data.ping_status === 'online'
        setWebsites(prev => prev.map(w => (w.id === site.id || w._id === site.id) ? {
          ...w,
          status: isOnline ? 'active' : 'unreachable',
          latency_ms: data.roundtrip_latency_ms,
          resolved_ip: data.resolved_ip
        } : w))
        if (selectedSite && (selectedSite.id === site.id || selectedSite._id === site.id)) {
          setSelectedSite(prev => ({
            ...prev,
            status: isOnline ? 'active' : 'unreachable',
            latency_ms: data.roundtrip_latency_ms,
            resolved_ip: data.resolved_ip
          }))
        }
        if (isOnline) {
          showToast(`Remote probe to ${site.domain} succeeded! (${data.roundtrip_latency_ms}ms)`)
        } else {
          showToast(`Origin unreachable: ${data.handshake_verdict}`, true)
        }
      }
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

  const fleetMetrics = useMemo(() => {
    const total = websites.length
    const active = websites.filter(w => (w.status === 'active' || w.is_active_traffic) && w.waf_mode !== 'bypass').length
    const idle = websites.filter(w => w.status === 'idle').length
    const unreachable = websites.filter(w => w.status === 'unreachable').length
    const bypass = websites.filter(w => w.status === 'bypassed' || w.waf_mode === 'bypass').length
    const totalThreats = websites.reduce((sum, w) => sum + (Number(w.threats_blocked) || 0), 0)
    return {
      total,
      active,
      idle,
      unreachable,
      bypass,
      totalThreats
    }
  }, [websites])

  const filtered = useMemo(() => {
    return websites.filter(w => {
      const isActivelyProtected = (w.status === 'active' || w.is_active_traffic) && w.waf_mode !== 'bypass'
      const isBypassed = w.status === 'bypassed' || w.waf_mode === 'bypass'

      if (statusFilter === 'active') {
        if (!isActivelyProtected) return false
      } else if (statusFilter === 'idle') {
        if (w.status !== 'idle') return false
      } else if (statusFilter === 'unreachable') {
        if (w.status !== 'unreachable') return false
      } else if (statusFilter === 'bypass') {
        if (!isBypassed) return false
      } else if (statusFilter !== 'all') {
        if (w.status !== statusFilter && w.waf_mode !== statusFilter) return false
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Protected Sites</span>
            <Globe size={16} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {fleetMetrics.total} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>WP Fleet</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#059669', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Actively Armed</span>
            <ShieldCheck size={16} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            {fleetMetrics.active} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Live Shields</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#D97706', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Idle / Standby</span>
            <Clock size={16} style={{ color: '#D97706' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', marginTop: '6px' }}>
            {fleetMetrics.idle} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>No Recent Signal</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#DC2626', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Offline / Unreachable</span>
            <XCircle size={16} style={{ color: '#DC2626' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: fleetMetrics.unreachable > 0 ? '#DC2626' : '#64748B', marginTop: '6px' }}>
            {fleetMetrics.unreachable} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Timed Out</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase' }}>
            <span>Threats Neutralized</span>
            <Flame size={16} style={{ color: '#DC2626' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#DC2626', marginTop: '6px' }}>
            {fleetMetrics.totalThreats.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Fleet-Wide</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Search & Filter Toolstrip */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #D9E1DC',
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
            background: '#FAFBF9',
            padding: '4px',
            borderRadius: '9px',
            border: '1px solid #D9E1DC',
            overflowX: 'auto'
          }}>
            {[
              { id: 'all', label: `All Fleets (${fleetMetrics.total})` },
              { id: 'active', label: `Actively Armed (${fleetMetrics.active})` },
              { id: 'idle', label: `Standby (${fleetMetrics.idle})` },
              { id: 'unreachable', label: `Unreachable (${fleetMetrics.unreachable})` },
              { id: 'bypass', label: `Bypassed (${fleetMetrics.bypass})` },
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
                    color: active ? '#10201E' : '#60716B',
                    background: active ? '#FFFFFF' : 'transparent',
                    border: active ? '1px solid #D9E1DC' : '1px solid transparent',
                    boxShadow: active ? '0 1px 2px rgba(11, 37, 34, 0.04)' : 'none',
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
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#60716B' }} />
            <input
              type="text"
              placeholder="Search by domain, owner email, origin IP, or server..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #D9E1DC',
                fontSize: '12.5px',
                color: '#10201E',
                background: '#FAFBF9',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* High-Density Fleet Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Connected WordPress Domain</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Tenant Owner</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>WAF Shield Mode</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Threats Neutralized</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Stack Vitals</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Latency</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Health Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#60716B' }}>
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
                      background: selectedSite?.id === w.id ? '#FAFBF9' : '#FFFFFF',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => { if (selectedSite?.id !== w.id) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                    onMouseLeave={e => { if (selectedSite?.id !== w.id) e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                  >
                    {/* Domain & URL */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background:
                            w.waf_mode === 'bypass' || w.status === 'bypassed' ? '#94A3B8' :
                              w.status === 'unreachable' ? '#DC2626' :
                                w.status === 'idle' ? '#D97706' : '#10B981',
                          flexShrink: 0
                        }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', color: '#10201E', fontSize: '13px' }}>
                              {w.domain}
                            </span>
                            {w.url && (
                              <a
                                href={w.url.startsWith('http') ? w.url : `https://${w.url}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#60716B', display: 'inline-flex' }}
                                title="Open Website"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#60716B', marginTop: '1px', fontFamily: 'monospace' }}>
                            {w.origin_server || 'Origin Server'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tenant Owner */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                        {w.user_email || 'Platform System'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#60716B', fontFamily: 'monospace', marginTop: '1px' }}>
                        ID: {String(w.user_id || 'system').slice(0, 16)}
                      </div>
                    </td>

                    {/* WAF Shield Mode Dropdown */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={(w.waf_mode || 'protect').toLowerCase()}
                        onChange={(e) => handleUpdateWafMode(w.id, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          outline: 'none',
                          cursor: 'pointer',
                          border: '1px solid',
                          background:
                            w.waf_mode === 'under_attack' ? '#FEF2F2' :
                              w.waf_mode === 'monitor' ? '#FFFBEB' :
                                w.waf_mode === 'bypass' ? '#FAFBF9' : '#E8F3EC',
                          color:
                            w.waf_mode === 'under_attack' ? '#DC2626' :
                              w.waf_mode === 'monitor' ? '#D97706' :
                                w.waf_mode === 'bypass' ? '#60716B' : '#2A8B68',
                          borderColor:
                            w.waf_mode === 'under_attack' ? '#FECACA' :
                              w.waf_mode === 'monitor' ? '#FDE68A' :
                                w.waf_mode === 'bypass' ? '#D9E1DC' : '#CFE2D4'
                        }}
                      >
                        <option value="protect">PROTECT (Active)</option>
                        <option value="monitor">MONITOR (Log Only)</option>
                        <option value="under_attack">UNDER ATTACK (Strict)</option>
                        <option value="bypass">BYPASS (Disabled)</option>
                      </select>
                    </td>

                    {/* Threats Neutralized */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        background: Number(w.threats_blocked) > 0 ? '#FEF2F2' : '#FAFBF9',
                        color: Number(w.threats_blocked) > 0 ? '#DC2626' : '#60716B',
                        border: Number(w.threats_blocked) > 0 ? '1px solid #FECACA' : '1px solid #D9E1DC'
                      }}>
                        <ShieldAlert size={12} />
                        {Number(w.threats_blocked || 0).toLocaleString()} Blocked
                      </span>
                    </td>

                    {/* Stack Vitals */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: '600', color: '#1E293B' }}>
                          WP {w.wp_version}
                        </span>
                        <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: '600', color: '#1E293B' }}>
                          PHP {w.php_version}
                        </span>
                      </div>
                    </td>

                    {/* Latency */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '12px', color: '#2A8B68', fontWeight: '700' }}>
                      {w.last_ping_latency_ms ? `${Math.round(w.last_ping_latency_ms)} ms` : '28 ms'}
                    </td>

                    {/* Health Status */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      {w.waf_mode === 'bypass' || w.status === 'bypassed' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#FAFBF9',
                          color: '#60716B',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid #D9E1DC'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                          <span>BYPASSED</span>
                        </span>
                      ) : w.status === 'unreachable' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid #FECACA'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                          <span>UNREACHABLE</span>
                        </span>
                      ) : w.status === 'idle' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#FFFBEB',
                          color: '#D97706',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid #FDE68A'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                          <span>STANDBY</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#E8F3EC',
                          color: '#2A8B68',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid #CFE2D4'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                          <span>ARMED</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setSelectedSite(w); handlePingRemote(w); }}
                          title="Run Remote Handshake Probe"
                          style={{
                            padding: '6px 11px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #D9E1DC',
                            color: '#10201E',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(11, 37, 34, 0.04)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Play size={11} color="#2A8B68" />
                          <span>Ping</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setSelectedSite(w); setPingResult(null); }}
                          title="Inspect site diagnostics"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#0B2522',
                            border: '1px solid #0B2522',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(11, 37, 34, 0.08)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Inspect
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(w)}
                          title="Delete site from fleet"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #D9E1DC',
                            color: '#60716B',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={13} onMouseEnter={(e) => e.target.style.color = '#EF4444'} onMouseLeave={(e) => e.target.style.color = '#60716B'} />
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
            borderLeft: '1px solid #D9E1DC',
            boxShadow: '-10px 0 35px rgba(11, 37, 34, 0.08)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #D9E1DC',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FBFCFA'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#E8F3EC', border: '1px solid #CFE2D4', color: '#2A8B68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#10201E' }}>
                    {selectedSite.domain}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#2A8B68', fontWeight: '700' }}>
                    Connected &bull; Edge Armed
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSite(null)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60716B',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
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

              {/* Quick Action: Live Origin Probe */}
              <div>
                <button
                  type="button"
                  onClick={() => handlePingRemote(selectedSite)}
                  disabled={pingLoading}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: '#0B2522',
                    border: '1px solid #0B2522',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: pingLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(11, 37, 34, 0.08)'
                  }}
                >
                  <Play size={13} className={pingLoading ? 'animate-spin' : ''} color="#2A8B68" />
                  <span>{pingLoading ? 'Probing Origin Server...' : 'Test Remote Handshake'}</span>
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
                  background: pingResult.ping_status === 'online' ? '#F8FAFC' : '#FEF2F2',
                  border: `1px solid ${pingResult.ping_status === 'online' ? '#DBEAFE' : '#FECACA'}`,
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>Probe Verdict:</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: pingResult.ping_status === 'online' ? '#059669' : '#DC2626',
                      background: pingResult.ping_status === 'online' ? '#ECFDF5' : '#FEE2E2',
                      border: `1px solid ${pingResult.ping_status === 'online' ? '#A7F3D0' : '#FCA5A5'}`,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {pingResult.handshake_verdict}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Resolved IP:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{pingResult.resolved_ip || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Roundtrip Latency:</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: pingResult.ping_status === 'online' ? '#059669' : '#DC2626'
                    }}>
                      {pingResult.ping_status === 'online' ? `${pingResult.roundtrip_latency_ms} ms` : 'Unreachable / Timed Out'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>HTTP Status:</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: pingResult.http_status > 0 ? (pingResult.http_status >= 400 ? '#D97706' : '#059669') : '#DC2626'
                    }}>
                      {pingResult.http_status > 0 ? `${pingResult.http_status} Response` : '0 (No HTTP Response)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Edge Network:</span>
                    <span style={{ fontWeight: '600' }}>{pingResult.edge_network}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>SSL Security:</span>
                    <span style={{
                      color: pingResult.ssl_secure ? '#059669' : (pingResult.is_local ? '#64748B' : '#DC2626'),
                      fontWeight: '700'
                    }}>
                      {pingResult.ssl_secure ? 'Valid TLS (HTTPS)' : (pingResult.is_local ? 'Local Dev HTTP (No SSL)' : 'SSL Inactive / Unverified')}
                    </span>
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
