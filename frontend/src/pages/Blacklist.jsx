import { useState, useEffect, useMemo, Fragment } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Clock,
  Sparkles,
  Radio,
  Lock,
  ArrowUpRight,
  Zap,
  User,
  X,
  Server,
  Ban,
  Eye
} from 'lucide-react'
import api from '../api/api'
import { getFlagUrl, getFlagEmoji } from '../utils/countries'

// ── Time Formatter (100% UserLogs Match) ──────────────────────────────────
function formatLogTime(dateStr) {
  if (!dateStr) return { main: 'Oct 16, 2026, 08:17:49', period: 'PM' }
  try {
    const s = String(dateStr)
    const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T'))
    if (isNaN(parsed.getTime())) return { main: s, period: '' }
    const month = parsed.toLocaleString('en-US', { month: 'short' })
    const day = String(parsed.getDate()).padStart(2, '0')
    const year = parsed.getFullYear()
    const hours = String(parsed.getHours() % 12 || 12).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')
    const seconds = String(parsed.getSeconds()).padStart(2, '0')
    const ampm = parsed.getHours() >= 12 ? 'PM' : 'AM'
    return {
      main: `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds}`,
      period: ampm
    }
  } catch {
    return { main: String(dateStr), period: '' }
  }
}

// ── Skeleton Shimmer Subcomponents (100% UserLogs Match) ──────────────────
const BlacklistSkeletonRows = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <tr key={i} style={{ borderBottom: '1px solid #ECEFEF' }}>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '100px', height: '22px', borderRadius: '9999px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '110px', height: '16px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="mdf-shimmer" style={{ width: '18px', height: '13px', borderRadius: '2px' }} />
            <div className="mdf-shimmer" style={{ width: '70px', height: '14px', borderRadius: '3px' }} />
          </div>
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '120px', height: '20px', borderRadius: '6px' }} />
        </td>
        <td style={{ padding: '14px 20px' }}>
          <div className="mdf-shimmer" style={{ width: '160px', height: '14px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div className="mdf-shimmer" style={{ width: '105px', height: '15px', borderRadius: '4px' }} />
        </td>
        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
          <div className="mdf-shimmer" style={{ width: '55px', height: '18px', borderRadius: '4px', margin: '0 auto' }} />
        </td>
        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
          <div className="mdf-shimmer" style={{ width: '90px', height: '26px', borderRadius: '6px', marginLeft: 'auto' }} />
        </td>
      </tr>
    ))}
  </>
)

export default function Blacklist() {
  const [blacklist, setBlacklist] = useState([])
  const [metrics, setMetrics] = useState({
    total_blocked: 0,
    active_count: 0,
    auto_blocked_count: 0,
    tenant_blocked_count: 0,
    permanent_blocked_count: 0,
    expired_count: 0,
    blocked_24h_count: 0
  })
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, active, auto_block, tenant, permanent, expired

  // Modals & Actions
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    ip: '',
    reason: '',
    type: 'permanent',
    duration_hours: 24,
    scope: 'all'
  })
  const [copiedIp, setCopiedIp] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3500)
  }

  const copyIpToClipboard = (ip) => {
    navigator.clipboard.writeText(ip)
    setCopiedIp(ip)
    setTimeout(() => setCopiedIp(null), 1800)
  }

  const fetchBlacklist = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const params = {
        page,
        limit: perPage,
        type: activeTab
      }
      if (search.trim()) params.search = search.trim()

      const res = await api.getBlacklist(params)
      if (res && res.status === 'success') {
        setBlacklist(res.blacklist || [])
        setTotalCount(res.total || 0)
        setTotalPages(res.total_pages || 1)
        if (res.metrics) setMetrics(res.metrics)
      } else if (Array.isArray(res)) {
        setBlacklist(res)
        setTotalCount(res.length)
        setTotalPages(1)
      } else if (res && res.blacklist) {
        setBlacklist(res.blacklist)
        setTotalCount(res.blacklist.length)
      }
    } catch (err) {
      console.error('Failed to fetch blacklist:', err)
      showToast(err.message || 'Failed to load IP blacklist', true)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBlacklist()
  }, [page, perPage, activeTab])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchBlacklist()
  }

  const handleResetSearch = () => {
    setSearch('')
    setPage(1)
    setTimeout(() => fetchBlacklist(), 50)
  }

  const handleBlockSubmit = async (e) => {
    e.preventDefault()
    if (!form.ip.trim()) {
      showToast('Please enter a valid IP address or CIDR range', true)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ip: form.ip.trim(),
        reason: form.reason.trim() || 'Blocked by Super Admin',
        type: form.type,
        duration_hours: form.type === 'temporary' ? Number(form.duration_hours) : null
      }
      const res = await api.addBlacklist(payload)
      if (res.status === 'error') {
        showToast(res.message || 'Failed to blacklist IP', true)
      } else {
        showToast(`IP ${form.ip} blacklisted and pushed to all WordPress fleet nodes!`)
        setShowModal(false)
        setForm({ ip: '', reason: '', type: 'permanent', duration_hours: 24, scope: 'all' })
        fetchBlacklist(true)
      }
    } catch (err) {
      showToast(err.message || 'Failed to block IP', true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnblock = async (ip) => {
    if (!confirm(`Are you sure you want to unblock IP ${ip} across the entire platform?`)) return
    try {
      await api.removeBlacklist(ip)
      showToast(`IP ${ip} successfully unblocked and removed from fleet blacklist`)
      fetchBlacklist()
    } catch (err) {
      showToast(err.message || 'Failed to unblock IP', true)
    }
  }

  const handlePromote = async (ip) => {
    if (!confirm(`Promote IP ${ip} to permanent platform-wide Global Fleet Ban?`)) return
    try {
      await api.promoteBlacklist(ip)
      showToast(`IP ${ip} promoted to permanent global ban!`)
      fetchBlacklist()
    } catch (err) {
      showToast(err.message || 'Failed to promote IP ban', true)
    }
  }

  const handlePurgeExpired = async () => {
    if (!confirm('Purge all expired temporary IP blocks from the database?')) return
    try {
      const res = await api.cleanExpiredBlacklist()
      showToast(res.message || 'Expired temporary blocks purged')
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to purge expired blocks', true)
    }
  }

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '12.5px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} color="#34D399" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER STRIP — Compact & Clean (100% UserLogs Match) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #D9E1DC',
        padding: '10px 16px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#DC2626',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
            <span>Fleet Threat Network</span>
          </span>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E' }}>
            Global IP Blacklist &amp; Reputation
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handlePurgeExpired}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 11px',
              borderRadius: '6px',
              border: '1px solid #D9E1DC',
              background: '#FFFFFF',
              color: '#60716B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Clean expired temporary blocks"
          >
            <Clock size={12} color="#60716B" />
            <span>Purge Expired</span>
          </button>

          <button
            type="button"
            onClick={() => fetchBlacklist(true)}
            disabled={refreshing}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 11px',
              borderRadius: '6px',
              border: '1px solid #D9E1DC',
              background: '#FFFFFF',
              color: '#10201E',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RotateCw size={12} color="#60716B" className={refreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setForm({ ip: '', reason: '', type: 'permanent', duration_hours: 24, scope: 'all' })
              setShowModal(true)
            }}
            style={{
              fontSize: '12px',
              fontWeight: '700',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: '#DC2626',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.2)'
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Block IP</span>
          </button>
        </div>
      </div>

      {/* 4 DYNAMIC KPI CARDS — High-Density Slim Row (100% UserLogs Match) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '8px',
        marginBottom: '10px'
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#FBFCFA',
            border: '1px solid #D9E1DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Server size={13} color="#0B2522" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Banned IPs
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#10201E', lineHeight: '1.1', marginTop: '1px' }}>
              {metrics.total_blocked.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#E8F3EC',
            border: '1px solid #CFE2D4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={13} color="#2A8B68" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Enforcements
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#2A8B68', lineHeight: '1.1', marginTop: '1px' }}>
              {metrics.active_count} Active
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#FEF3EB',
            border: '1px solid #FCD8BF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={13} color="#D97735" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Auto-Defense Blocks
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#D97735', lineHeight: '1.1', marginTop: '1px' }}>
              {metrics.auto_blocked_count} Auto
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={13} color="#DC2626" />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permanent Bans
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#DC2626', lineHeight: '1.1', marginTop: '1px' }}>
              {metrics.permanent_blocked_count} Fleet
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT TOOLBAR STRIP (Search & Filters) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #D9E1DC',
        padding: '8px 12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px', minWidth: '150px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Filter IP, reason, domain, tenant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(e) }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #D9E1DC',
                fontSize: '12px',
                color: '#10201E',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Segmented Filter Pills */}
          <div style={{ display: 'flex', gap: '3px', background: '#E8EEE8', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All IPs', count: metrics.total_blocked },
              { id: 'active', label: 'Active', count: metrics.active_count },
              { id: 'auto_block', label: 'Auto Defense', count: metrics.auto_blocked_count },
              { id: 'tenant', label: 'Tenant Rules', count: metrics.tenant_blocked_count },
              { id: 'permanent', label: 'Permanent', count: metrics.permanent_blocked_count },
              { id: 'expired', label: 'Expired', count: metrics.expired_count }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1) }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                  color: activeTab === tab.id ? '#0F172A' : '#60716B',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.07)' : 'none'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  background: activeTab === tab.id ? '#F1F5F9' : '#E2E8F0',
                  color: activeTab === tab.id ? '#0F172A' : '#64748B'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EXACT DESKTOP TABLE VIEW (100% UserLogs Match from Screenshot) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #D9E1DC',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{
                background: '#FBFCFA',
                borderBottom: '1px solid #D9E1DC',
                color: '#60716B',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: '700'
              }}>
                <th style={{ padding: '16px 20px', textAlign: 'left' }}>TYPE</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>WEBSITE</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>LOCATION</th>
                <th style={{ padding: '16px 20px', textAlign: 'left' }}>THREAT REASON / SCOPE</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>TIME</th>
                <th style={{ padding: '16px 16px', textAlign: 'left' }}>IP ADDRESS</th>
                <th style={{ padding: '16px 14px', textAlign: 'center' }}>RESPONSE</th>
                <th style={{ padding: '16px 20px', textAlign: 'center' }}>VIEW</th>
              </tr>
            </thead>
            <tbody>
              {loading && blacklist.length === 0 ? (
                <BlacklistSkeletonRows count={6} />
              ) : blacklist.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3EB', border: '1px solid #FCD8BF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#D97735' }}>
                      <ShieldCheck size={26} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#10201E' }}>No matching blacklisted IP addresses</div>
                    <p style={{ fontSize: '12px', color: '#87948D', margin: '4px 0 0' }}>All inbound traffic across the fleet is clean or filters returned zero matches.</p>
                  </td>
                </tr>
              ) : (
                blacklist.map((entry, i) => {
                  const flagUrl = getFlagUrl(entry.country_code, '20x15') || 'https://flagcdn.com/20x15/bd.png'
                  const countryName = entry.country_name || (entry.country_code === 'BD' ? 'Bangladesh' : 'United States')
                  const timeInfo = formatLogTime(entry.blocked_at)
                  const isExpanded = expandedId === entry.id || expandedId === entry.ip
                  const isPerm = entry.type === 'permanent'
                  const isAuto = entry.auto_blocked
                  const isExpired = entry.is_expired

                  return (
                    <Fragment key={entry.id || entry.ip || i}>
                      <tr
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          background: isExpanded ? '#FAFBF9' : '#FFFFFF',
                          transition: 'background-color 0.15s ease'
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : (entry.id || entry.ip))}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = '#F8FAFC'
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = '#FFFFFF'
                        }}
                      >
                        {/* TYPE PILL */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {isExpired ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                              <span>Expired Ban</span>
                            </span>
                          ) : isPerm ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                              <span>Permanent Ban</span>
                            </span>
                          ) : isAuto ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: '#E8EEE8',
                              color: '#0B2522',
                              border: '1px solid #D9E1DC',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0B2522', flexShrink: 0 }} />
                              <span>Auto Defense</span>
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: '#FAFBF9',
                              color: '#10201E',
                              border: '1px solid #D9E1DC',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                              <span>Tenant Rule</span>
                            </span>
                          )}
                        </td>

                        {/* WEBSITE */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <span style={{
                            background: '#F1F5F9',
                            color: '#1E293B',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}>
                            {entry.website_domain || 'Global Fleet'}
                          </span>
                        </td>

                        {/* LOCATION */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                            <img
                              src={flagUrl}
                              alt=""
                              onError={(e) => { e.target.style.display = 'none' }}
                              style={{
                                width: '18px',
                                height: '13px',
                                borderRadius: '2px',
                                objectFit: 'cover',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                              {countryName}
                            </span>
                          </div>
                        </td>

                        {/* THREAT REASON */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                          <span
                            title={entry.reason}
                            style={{
                              fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                              fontSize: '12px',
                              color: '#334155',
                              fontWeight: '500',
                              maxWidth: '280px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}
                          >
                            {entry.reason || 'Manual block enforced by administrator'}
                          </span>
                        </td>

                        {/* TIME */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                            <div>{timeInfo.main}</div>
                            {timeInfo.period && (
                              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>
                                {timeInfo.period}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* IP ADDRESS */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                              fontSize: '12px',
                              fontWeight: '800',
                              color: '#0F172A',
                              letterSpacing: '0.2px'
                            }}>
                              {entry.ip}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyIpToClipboard(entry.ip)
                              }}
                              title="Copy IP"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedIp === entry.ip ? '#D97735' : '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              {copiedIp === entry.ip ? <Check size={11} color="#D97735" /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>

                        {/* RESPONSE / STATUS CODE (403 for blocked) */}
                        <td style={{ padding: '16px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '800',
                            color: isExpired ? '#64748B' : '#10201E',
                            letterSpacing: '0.4px',
                            display: 'inline-block'
                          }}>
                            {isExpired ? '200' : '403'}
                          </span>
                        </td>

                        {/* VIEW CIRCULAR EYE BUTTON */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(isExpanded ? null : (entry.id || entry.ip))
                            }}
                            title={isExpanded ? "Collapse Forensics" : "View IP Details"}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              border: isExpanded ? '1px solid #0F172A' : '1px solid #CBD5E1',
                              background: isExpanded ? '#0F172A' : '#FFFFFF',
                              color: isExpanded ? '#FFFFFF' : '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.borderColor = '#94A3B8'
                                e.currentTarget.style.background = '#F8FAFC'
                                e.currentTarget.style.color = '#0F172A'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.borderColor = '#CBD5E1'
                                e.currentTarget.style.background = '#FFFFFF'
                                e.currentTarget.style.color = '#475569'
                              }
                            }}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED DOSSIER DRAWER */}
                      {isExpanded && (
                        <tr style={{ background: '#F8FAFC' }}>
                          <td colSpan="8" style={{ padding: '8px 16px', borderBottom: '1px solid #E2E8F0' }}>
                            <div style={{
                              background: '#FFFFFF',
                              borderRadius: '10px',
                              border: '1px solid #E2E8F0',
                              padding: '12px 16px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              {/* Row 1: Status & Remediation Actions */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid #F1F5F9'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: isExpired ? '#F1F5F9' : '#FEF2F2',
                                    color: isExpired ? '#64748B' : '#DC2626',
                                    border: isExpired ? '1px solid #CBD5E1' : '1px solid #FECACA'
                                  }}>
                                    {isExpired ? 'BAN EXPIRED' : '403 QUARANTINED'}
                                  </span>

                                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                                    Target: {entry.website_domain}
                                  </span>

                                  <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                                    Added by: <strong style={{ color: '#0F172A' }}>{entry.added_by}</strong>
                                  </span>

                                  <span style={{ fontSize: '11px', color: '#CBD5E1' }}>&bull;</span>

                                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                                    Expiry: <strong style={{ color: '#0F172A' }}>{entry.expires_at}</strong>
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {(entry.auto_blocked || entry.type === 'temporary') && (
                                    <button
                                      type="button"
                                      onClick={() => handlePromote(entry.ip)}
                                      style={{
                                        fontSize: '11.5px',
                                        fontWeight: '600',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#1E293B',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <ArrowUpRight size={12} color="#DC2626" />
                                      <span>Promote to Global Ban</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleUnblock(entry.ip)}
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: '600',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid #FECACA',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Unblock IP
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Details */}
                              <div style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                fontSize: '11.5px',
                                color: '#334155'
                              }}>
                                <strong>Reason / Incident Forensic Note:</strong> {entry.reason}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #D9E1DC',
          background: '#FBFCFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#60716B'
        }}>
          <div>
            Showing <strong style={{ color: '#0F172A' }}>{blacklist.length}</strong> of <strong style={{ color: '#0F172A' }}>{totalCount}</strong> blacklisted IPs
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px' }}>Per page:</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
              style={{
                padding: '3px 6px',
                borderRadius: '5px',
                border: '1px solid #D9E1DC',
                fontSize: '11.5px',
                background: '#FFFFFF',
                color: '#0F172A'
              }}
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>

            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                color: '#334155',
                fontSize: '12px',
                fontWeight: '600',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1
              }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                color: '#334155',
                fontSize: '12px',
                fontWeight: '600',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add IP Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#DC2626" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  Enforce Fleet IP Block
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  IP Address or CIDR Range <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198.51.100.4 or 192.168.1.0/24"
                  value={form.ip}
                  onChange={e => setForm({ ...form, ip: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D9E1DC',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Threat Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SQL Injection attempts"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D9E1DC',
                    fontSize: '12.5px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {['Brute Force Attack', 'SQL Injection Attacker', 'Malicious Scanners', 'Zero-Day Exploit', 'Abusive Scraping'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, reason: r })}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        fontSize: '10.5px',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Persistence
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D9E1DC',
                      fontSize: '12.5px',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="permanent">Permanent Fleet Ban</option>
                    <option value="temporary">Temporary Mitigation</option>
                  </select>
                </div>

                {form.type === 'temporary' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Duration
                    </label>
                    <select
                      value={form.duration_hours}
                      onChange={e => setForm({ ...form, duration_hours: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D9E1DC',
                        fontSize: '12.5px',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="1">1 Hour</option>
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="168">7 Days (1 Week)</option>
                      <option value="720">30 Days (1 Month)</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    background: '#DC2626',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Enforcing...' : 'Enforce Fleet Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
