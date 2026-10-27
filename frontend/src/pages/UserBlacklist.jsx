import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Ban,
  Globe,
  Trash2,
  Search,
  Plus,
  RotateCw,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  X,
  Shield,
  Clock,
  Flame
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import { ALL_COUNTRIES, POPULAR_THREAT_COUNTRIES, getFlagEmoji, getFlagUrl } from '../utils/countries'

export default function UserBlacklist() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'country' ? 'country' : 'ip'
  const setActiveTab = (tab) => setSearchParams({ tab })

  // ── IP Blacklist State ──────────────────────────────────────────────────────
  const [entries, setEntries] = useState(() => userStore.get('blacklist') || [])
  const [loading, setLoading] = useState(() => !userStore.get('blacklist'))
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', reason: '', duration: '1d' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterDuration, setFilterDuration] = useState('all')
  const [selectedIps, setSelectedIps] = useState([])
  const [bulkUnblocking, setBulkUnblocking] = useState(false)
  const [flushingExpired, setFlushingExpired] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // ── Country Blacklist State ─────────────────────────────────────────────────
  const [countryBlocks, setCountryBlocks] = useState([])
  const [countryLoading, setCountryLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('CN')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [blockReason, setBlockReason] = useState('')
  const [savingCountry, setSavingCountry] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (text, type = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  const fetchBlacklist = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const data = await api.getUserBlacklist()
      const list = Array.isArray(data) ? data : (data?.blacklist || [])
      setEntries(list)
      userStore.set('blacklist', list)
    } catch (err) {
      console.error('Failed to load blacklist:', err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  const fetchCountryBlocks = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    setCountryLoading(true)
    try {
      const res = await api.getUserCountryBlocks()
      if (res?.country_blocks) setCountryBlocks(res.country_blocks)
    } catch (err) {
      console.error('Failed to load country blocks:', err)
    } finally {
      setCountryLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  useEffect(() => {
    fetchBlacklist()
    fetchCountryBlocks()
  }, [fetchBlacklist, fetchCountryBlocks])

  const blockedCodesSet = useMemo(() =>
    new Set(countryBlocks.map(b => (b.country_code || '').toUpperCase().trim()))
  , [countryBlocks])

  useEffect(() => {
    if (blockedCodesSet.has(selectedCountry)) {
      const firstAvailable = ALL_COUNTRIES.find(c => !blockedCodesSet.has(c.code))
      if (firstAvailable) setSelectedCountry(firstAvailable.code)
    }
  }, [blockedCodesSet, selectedCountry])

  // ── IP computations ─────────────────────────────────────────────────────────
  const expiredEntries = useMemo(() => {
    const now = new Date()
    return entries.filter(item => {
      if (item.is_expired) return true
      if (!item.expires_at) return false
      try { const exp = new Date(item.expires_at); return !isNaN(exp) && exp <= now } catch { return false }
    })
  }, [entries])

  const tempCount = useMemo(() => entries.filter(e => e.expires_at && !e.is_expired).length, [entries])
  const permCount = useMemo(() => entries.filter(e => !e.expires_at || String(e.type || e.duration || '').toLowerCase() === 'permanent').length, [entries])
  const autoCount = useMemo(() => entries.filter(e => e.auto_blocked).length, [entries])

  const filteredEntries = useMemo(() => {
    const now = new Date()
    return entries.filter(item => {
      const ipMatch = !search ||
        item.ip?.toLowerCase().includes(search.toLowerCase()) ||
        item.reason?.toLowerCase().includes(search.toLowerCase())
      if (!ipMatch) return false
      const isPerm = !item.expires_at || String(item.type || item.duration || '').toLowerCase() === 'permanent'
      const isExpired = item.is_expired || (item.expires_at && new Date(item.expires_at) <= now)
      if (filterDuration === 'expired') return isExpired
      if (filterDuration === 'permanent') return isPerm
      if (filterDuration === 'temporary') return !isPerm && !isExpired
      if (filterDuration === 'auto') return !!item.auto_blocked
      return true
    })
  }, [entries, search, filterDuration])

  const filteredCountryBlocks = useMemo(() => {
    if (!countrySearch) return countryBlocks
    const q = countrySearch.toLowerCase().trim()
    return countryBlocks.filter(b =>
      (b.country_code || '').toLowerCase().includes(q) ||
      (b.country_name || '').toLowerCase().includes(q) ||
      (b.reason || '').toLowerCase().includes(q)
    )
  }, [countryBlocks, countrySearch])

  // ── IP Handlers ─────────────────────────────────────────────────────────────
  const handleUnblock = async (ip) => {
    if (!confirm(`Unblock IP ${ip}?`)) return
    setEntries(prev => prev.filter(item => item.ip !== ip))
    setSelectedIps(prev => prev.filter(i => i !== ip))
    userStore.invalidate('blacklist')
    try {
      await api.removeUserBlacklist(ip)
      showToast(`IP ${ip} unblocked.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock IP', 'error')
      fetchBlacklist(true)
    }
  }

  const handleFlushExpired = async () => {
    if (expiredEntries.length === 0) { showToast('No expired entries to purge.', 'info'); return }
    if (!confirm(`Purge all ${expiredEntries.length} expired IP bans?`)) return
    setFlushingExpired(true)
    try {
      const res = await api.unblockExpiredBlacklist()
      showToast(`Unblocked ${res?.unblocked_count ?? expiredEntries.length} expired IPs.`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to flush expired IPs', 'error')
    } finally { setFlushingExpired(false) }
  }

  const handleBulkUnblock = async () => {
    if (!selectedIps.length) return
    if (!confirm(`Unblock ${selectedIps.length} selected IPs?`)) return
    setBulkUnblocking(true)
    try {
      const res = await api.unblockBatchBlacklist(selectedIps)
      showToast(res?.message || `Unblocked ${selectedIps.length} IP(s).`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock IPs', 'error')
    } finally { setBulkUnblocking(false) }
  }

  const toggleSelectAll = () =>
    setSelectedIps(selectedIps.length === filteredEntries.length ? [] : filteredEntries.map(e => e.ip))

  const toggleSelectIp = (ip) =>
    setSelectedIps(prev => prev.includes(ip) ? prev.filter(i => i !== ip) : [...prev, ip])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.ip.trim()) return
    setSubmitting(true)
    try {
      const res = await api.addUserBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', duration: '1d' })
      showToast(res?.message || `IP ${form.ip} blocked.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', 'error')
    } finally { setSubmitting(false) }
  }

  // ── Country Handlers ────────────────────────────────────────────────────────
  const handleAddCountryBlock = async (e) => {
    if (e) e.preventDefault()
    const targetObj = ALL_COUNTRIES.find(c => c.code === selectedCountry)
    if (!targetObj) return
    setSavingCountry(true)
    try {
      const payload = {
        country_code: targetObj.code,
        country_name: targetObj.name,
        reason: blockReason.trim() || `Geo-Restriction Policy (${targetObj.name})`
      }
      const res = await api.addUserCountryBlock(payload)
      if (res?.status === 'success' || (res?.message && !res?.message.toLowerCase().includes('already') && res?.status !== 'error')) {
        showToast(`${targetObj.name} blocked.`)
        setBlockReason('')
        setCountryBlocks(prev => {
          if (prev.some(b => b.country_code === targetObj.code)) return prev
          return [{ country_code: targetObj.code, country_name: targetObj.name, reason: payload.reason, created_at: 'Just now' }, ...prev]
        })
        fetchCountryBlocks(true)
      } else {
        showToast(res?.message || 'Failed to block country.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Error saving country block.', 'error')
    } finally { setSavingCountry(false) }
  }

  const handleQuickPresetToggle = async (preset) => {
    if (blockedCodesSet.has(preset.code)) {
      handleRemoveCountryBlock(preset.code, preset.name)
    } else {
      setSelectedCountry(preset.code)
      const reason = `Threat Policy (${preset.name})`
      setSavingCountry(true)
      try {
        const res = await api.addUserCountryBlock({ country_code: preset.code, country_name: preset.name, reason })
        if (res?.status === 'success' || (res?.message && !res?.message.toLowerCase().includes('already') && res?.status !== 'error')) {
          showToast(`${preset.name} blocked.`)
          setCountryBlocks(prev => {
            if (prev.some(b => b.country_code === preset.code)) return prev
            return [{ country_code: preset.code, country_name: preset.name, reason, created_at: 'Just now' }, ...prev]
          })
          fetchCountryBlocks(true)
        } else {
          showToast(res?.message || 'Failed.', 'error')
        }
      } catch (err) {
        showToast(err.message || 'Failed.', 'error')
      } finally { setSavingCountry(false) }
    }
  }

  const handleRemoveCountryBlock = async (code, name) => {
    if (!confirm(`Unblock traffic from ${name || code}?`)) return
    setCountryBlocks(prev => prev.filter(b => b.country_code !== code))
    try {
      await api.removeUserCountryBlock(code)
      showToast(`${name || code} unblocked.`)
      fetchCountryBlocks(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock country.', 'error')
      fetchCountryBlocks(true)
    }
  }

  const getIpOriginInfo = (entry) => {
    const code = (entry.country_code || entry.country || '').toLowerCase()
    if (code && code.length === 2) {
      return { flagUrl: `https://flagcdn.com/20x15/${code}.png`, name: entry.country_name || code.toUpperCase() }
    }
    return { flagUrl: null, name: 'Unknown' }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    page: { maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 60px', color: '#10201E' },
    card: { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    cardPad: { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    th: { padding: '11px 16px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
    td: { padding: '13px 16px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    badge: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: bg, color, border: `1px solid ${border}` }),
    btn: (bg, color, border = 'transparent') => ({
      padding: '8px 16px', borderRadius: '8px', border: `1px solid ${border}`, background: bg, color,
      fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.15s'
    }),
    btnSm: (bg, color, border = 'transparent') => ({
      padding: '5px 12px', borderRadius: '7px', border: `1px solid ${border}`, background: bg, color,
      fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
    }),
    input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#10201E', boxSizing: 'border-box', outline: 'none' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Toast ── */}
      {feedbackMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 16px',
          background: feedbackMsg.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${feedbackMsg.type === 'error' ? '#FECACA' : '#DCFCE7'}`,
          borderRadius: '10px', marginBottom: '16px',
          color: feedbackMsg.type === 'error' ? '#991B1B' : '#15803D',
          fontSize: '13px', fontWeight: '600'
        }}>
          {feedbackMsg.type === 'error'
            ? <AlertTriangle size={15} color="#DC2626" />
            : <CheckCircle2 size={15} color="#15803D" />
          }
          {feedbackMsg.text}
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>Access Control</h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B' }}>Block IPs and countries across all your connected websites.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              style={S.btn('#F8FAFC', '#475569', '#E2E8F0')}
              onClick={() => activeTab === 'country' ? fetchCountryBlocks(true) : fetchBlacklist(true)}
              disabled={refreshing}
            >
              <RotateCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
            {activeTab === 'ip' && (
              <button
                style={S.btn('#DC2626', '#FFFFFF')}
                onClick={() => { setForm({ ip: '', reason: '', duration: '1d' }); setShowModal(true) }}
              >
                <Plus size={14} /> Block IP
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '10px', width: 'fit-content' }}>
          {[
            { id: 'ip', icon: <Ban size={14} />, label: 'IP Blacklist', count: entries.length },
            { id: 'country', icon: <Globe size={14} />, label: 'Country Block', count: countryBlocks.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#0F172A' : '#64748B',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{
                fontSize: '11px', padding: '1px 7px', borderRadius: '999px', fontWeight: '800',
                background: activeTab === tab.id ? '#FEF2F2' : '#E2E8F0',
                color: activeTab === tab.id ? '#DC2626' : '#64748B'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ════ SECTION A: IP BLACKLIST ════ */}
      {activeTab === 'ip' && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Blocked', value: entries.length, color: '#0F172A' },
              { label: 'Permanent', value: permCount, color: '#DC2626' },
              { label: 'Temporary', value: tempCount, color: '#F59E0B' },
              { label: 'Auto-Blocked', value: autoCount, color: '#6366F1' },
              { label: 'Expired', value: expiredEntries.length, color: '#94A3B8' }
            ].map(s => (
              <div key={s.label} style={{ ...S.cardPad, padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, marginTop: '2px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ ...S.cardPad, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
                <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search IP or reason..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...S.input, paddingLeft: '33px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '3px', background: '#F1F5F9', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'permanent', label: 'Permanent' },
                  { id: 'temporary', label: 'Temporary' },
                  { id: 'auto', label: 'Auto' },
                  { id: 'expired', label: 'Expired' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterDuration(f.id)}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', border: 'none',
                      background: filterDuration === f.id ? '#FFFFFF' : 'transparent',
                      color: filterDuration === f.id ? '#0F172A' : '#64748B',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      boxShadow: filterDuration === f.id ? '0 1px 3px rgba(0,0,0,0.07)' : 'none'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedIps.length > 0 && (
                <button style={S.btn('#FEF2F2', '#DC2626', '#FECACA')} onClick={handleBulkUnblock} disabled={bulkUnblocking}>
                  <Trash2 size={13} />
                  {bulkUnblocking ? 'Unblocking...' : `Unblock ${selectedIps.length}`}
                </button>
              )}
              {expiredEntries.length > 0 && selectedIps.length === 0 && (
                <button style={S.btn('#F8FAFC', '#64748B', '#E2E8F0')} onClick={handleFlushExpired} disabled={flushingExpired}>
                  <Trash2 size={13} />
                  {flushingExpired ? 'Purging...' : `Purge ${expiredEntries.length} Expired`}
                </button>
              )}
            </div>
          </div>

          {/* IP Table */}
          <div style={S.card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: '36px', textAlign: 'center' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {filteredEntries.length > 0 && selectedIps.length === filteredEntries.length
                          ? <CheckSquare size={15} color="#DC2626" />
                          : <Square size={15} color="#CBD5E1" />}
                      </button>
                    </th>
                    <th style={S.th}>IP Address</th>
                    <th style={S.th}>Reason</th>
                    <th style={S.th}>Duration</th>
                    <th style={S.th}>Expires</th>
                    <th style={S.th}>Source</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <RotateCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
                        Loading...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <ShieldCheck size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#86EFAC' }} />
                        <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px' }}>No blocked IPs</div>
                        <div style={{ fontSize: '12.5px' }}>{search || filterDuration !== 'all' ? 'Try adjusting filters.' : 'All websites are clean.'}</div>
                      </td>
                    </tr>
                  ) : filteredEntries.map((entry, i) => {
                    const now = new Date()
                    const isSelected = selectedIps.includes(entry.ip)
                    const isExpired = entry.is_expired || (entry.expires_at && new Date(entry.expires_at) <= now)
                    const isPerm = !entry.expires_at || String(entry.type || entry.duration || '').toLowerCase() === 'permanent'
                    const origin = getIpOriginInfo(entry)

                    return (
                      <tr key={entry.id || entry.ip || i} style={{ background: isSelected ? '#FFF7F7' : '#FFFFFF', transition: 'background 0.1s' }}>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <button onClick={() => toggleSelectIp(entry.ip)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {isSelected ? <CheckSquare size={15} color="#DC2626" /> : <Square size={15} color="#CBD5E1" />}
                          </button>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {origin.flagUrl && (
                              <img src={origin.flagUrl} alt="" onError={e => { e.target.style.display = 'none' }}
                                style={{ width: '18px', height: '13px', borderRadius: '2px', objectFit: 'cover' }} />
                            )}
                            <code style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#0F172A', background: '#F1F5F9', padding: '2px 8px', borderRadius: '5px' }}>
                              {entry.ip}
                            </code>
                            {isExpired && <span style={S.badge('#FEE2E2', '#DC2626', '#FECACA')}>Expired</span>}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px', marginLeft: '26px' }}>{origin.name}</div>
                        </td>
                        <td style={{ ...S.td, color: '#475569', maxWidth: '250px', fontSize: '12.5px' }}>
                          {entry.reason || '—'}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(isPerm ? '#FEF2F2' : '#F0F9FF', isPerm ? '#DC2626' : '#0284C7', isPerm ? '#FECACA' : '#BAE6FD')}>
                            <Clock size={10} />
                            {entry.duration || entry.type || (isPerm ? 'Permanent' : 'Temp')}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontSize: '12.5px' }}>
                          {isPerm
                            ? <span style={{ color: '#94A3B8' }}>Never</span>
                            : isExpired
                              ? <span style={{ color: '#DC2626', fontWeight: '700' }}>Expired</span>
                              : <span style={{ color: '#15803D' }}>{entry.expires_at}</span>}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(entry.auto_blocked ? '#FFF7ED' : '#F0FDF4', entry.auto_blocked ? '#C2410C' : '#15803D', entry.auto_blocked ? '#FED7AA' : '#DCFCE7')}>
                            {entry.auto_blocked ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button
                            onClick={() => handleUnblock(entry.ip)}
                            style={S.btnSm('#FFFFFF', '#DC2626', '#FECACA')}
                            onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#FFFFFF' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#DC2626' }}
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════ SECTION B: COUNTRY BLACKLIST ════ */}
      {activeTab === 'country' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Blocked Countries', value: countryBlocks.length, color: countryBlocks.length > 0 ? '#DC2626' : '#15803D' },
              { label: 'Available Regions', value: '250+', color: '#6366F1' },
              { label: 'Block Response', value: 'HTTP 444', color: '#F59E0B' }
            ].map(s => (
              <div key={s.label} style={{ ...S.cardPad, padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, marginTop: '2px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Quick Threat Presets */}
          <div style={S.cardPad}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
              <Flame size={14} color="#DC2626" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Quick Block Presets</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {POPULAR_THREAT_COUNTRIES.map(preset => {
                const isBlocked = blockedCodesSet.has(preset.code)
                return (
                  <button
                    key={preset.code}
                    onClick={() => handleQuickPresetToggle(preset)}
                    style={{
                      background: isBlocked ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${isBlocked ? '#FECACA' : '#E2E8F0'}`,
                      color: isBlocked ? '#DC2626' : '#334155',
                      fontSize: '12.5px', padding: '5px 12px', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '600',
                      display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                    }}
                  >
                    <img src={getFlagUrl(preset.code, '20x15')} alt={preset.code}
                      onError={e => { e.target.style.display = 'none' }}
                      style={{ width: '16px', height: '11px', borderRadius: '2px', objectFit: 'cover' }} />
                    {preset.name}
                    {isBlocked && <span style={{ fontSize: '10px', background: '#DC2626', color: '#FFF', padding: '1px 5px', borderRadius: '4px' }}>Blocked</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add Country Form */}
          <div id="country-block-form" style={S.cardPad}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Shield size={15} color="#DC2626" />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>Block a Country</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', background: '#F1F5F9', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
                {['All', 'Asia', 'Europe', 'Americas', 'Middle East', 'Africa'].map(reg => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegion(reg)}
                    style={{
                      padding: '4px 9px', borderRadius: '6px', border: 'none',
                      background: selectedRegion === reg ? '#FFFFFF' : 'transparent',
                      color: selectedRegion === reg ? '#0F172A' : '#64748B',
                      fontSize: '11.5px', fontWeight: '600', cursor: 'pointer',
                      boxShadow: selectedRegion === reg ? '0 1px 3px rgba(0,0,0,0.07)' : 'none'
                    }}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddCountryBlock} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={S.label}>Country</label>
                <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{ ...S.input, cursor: 'pointer' }}>
                  {ALL_COUNTRIES
                    .filter(c => selectedRegion === 'All' || c.region === selectedRegion)
                    .map(c => {
                      const isBlocked = blockedCodesSet.has(c.code)
                      return (
                        <option key={c.code} value={c.code} disabled={isBlocked}>
                          {getFlagEmoji(c.code)} {c.name} ({c.code}){isBlocked ? ' [Blocked]' : ''}
                        </option>
                      )
                    })}
                </select>
              </div>
              <div>
                <label style={S.label}>Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g. Bot traffic, malicious scans"
                  style={S.input}
                />
              </div>
              <button
                type="submit"
                disabled={savingCountry || blockedCodesSet.has(selectedCountry)}
                style={{ ...S.btn('#DC2626', '#FFFFFF'), height: '39px', opacity: blockedCodesSet.has(selectedCountry) ? 0.5 : 1 }}
              >
                {savingCountry
                  ? <><RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} />Blocking...</>
                  : <><Ban size={13} />Block Country</>}
              </button>
            </form>
          </div>

          {/* Country Blocks Table */}
          <div style={S.cardPad}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Globe size={15} color="#0F172A" />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                  Blocked Countries <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>({countryBlocks.length})</span>
                </span>
              </div>
              {countryBlocks.length > 0 && (
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    style={{ ...S.input, paddingLeft: '30px' }}
                  />
                </div>
              )}
            </div>

            {countryLoading ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>
                <RotateCw size={22} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
                Loading...
              </div>
            ) : countryBlocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <Globe size={30} style={{ display: 'block', margin: '0 auto 10px', color: '#CBD5E1' }} />
                <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px' }}>No countries blocked</div>
                <div style={{ fontSize: '12.5px' }}>Use the form above or click a preset to block a country.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Country</th>
                      <th style={S.th}>Code</th>
                      <th style={S.th}>Reason</th>
                      <th style={S.th}>Status</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountryBlocks.map(block => {
                      const code = (block.country_code || '').toUpperCase().trim()
                      const cObj = ALL_COUNTRIES.find(c => c.code === code)
                      const displayName = cObj ? cObj.name : (block.country_name || code)
                      const flagUrl = getFlagUrl(code, '20x15')

                      return (
                        <tr key={block._id || code} style={{ background: '#FFFFFF' }}>
                          <td style={S.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={flagUrl} alt={code}
                                onError={e => { e.target.style.display = 'none' }}
                                style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                              <span style={{ fontWeight: '700', color: '#0F172A' }}>{displayName}</span>
                            </div>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge('#F1F5F9', '#475569', '#E2E8F0')}>{code}</span>
                          </td>
                          <td style={{ ...S.td, color: '#64748B', fontSize: '12.5px', maxWidth: '280px' }}>
                            {block.reason || '—'}
                          </td>
                          <td style={S.td}>
                            <span style={S.badge('#FEF2F2', '#DC2626', '#FECACA')}>Blocked</span>
                          </td>
                          <td style={{ ...S.td, textAlign: 'right' }}>
                            <button
                              onClick={() => handleRemoveCountryBlock(code, displayName)}
                              style={S.btnSm('#FFFFFF', '#DC2626', '#FECACA')}
                              onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#FFFFFF' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#DC2626' }}
                            >
                              Unblock
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add IP Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ban size={16} />
                </div>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Block IP Address</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>IP Address</label>
                <input type="text" required placeholder="e.g. 192.168.1.100"
                  value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value.trim() })}
                  style={S.input} />
              </div>
              <div>
                <label style={S.label}>Duration</label>
                <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ ...S.input, cursor: 'pointer' }}>
                  <option value="1d">1 Day</option>
                  <option value="2d">2 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Reason (optional)</label>
                <input type="text" placeholder="e.g. SQL injection attempts"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={S.input} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={S.btn('#F8FAFC', '#64748B', '#E2E8F0')}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={S.btn('#DC2626', '#FFFFFF')}>
                  {submitting ? 'Blocking...' : 'Confirm Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
