import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Ban,
  ShieldAlert,
  Clock,
  Trash2,
  Search,
  Plus,
  RefreshCw,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Filter,
  X,
  RotateCw
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

export default function UserBlacklist() {
  const [entries, setEntries] = useState(() => userStore.get('blacklist') || [])
  const [loading, setLoading] = useState(() => !userStore.get('blacklist'))
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', reason: '', duration: '1d' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterDuration, setFilterDuration] = useState('all') // 'all' | 'expired' | 'temporary' | 'permanent' | 'auto'

  // Multi-select bulk state
  const [selectedIps, setSelectedIps] = useState([])
  const [bulkUnblocking, setBulkUnblocking] = useState(false)
  const [flushingExpired, setFlushingExpired] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

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

  useEffect(() => {
    fetchBlacklist()
  }, [fetchBlacklist])

  // Count expired entries
  const expiredEntries = useMemo(() => {
    const now = new Date()
    return entries.filter(item => {
      if (item.is_expired) return true
      if (!item.expires_at) return false
      try {
        const exp = new Date(item.expires_at)
        return !isNaN(exp) && exp <= now
      } catch {
        return false
      }
    })
  }, [entries])

  // Count temporary vs permanent
  const tempCount = useMemo(() => {
    return entries.filter(e => e.expires_at && !e.is_expired).length
  }, [entries])

  const permCount = useMemo(() => {
    return entries.filter(e => !e.expires_at || String(e.type || e.duration || '').toLowerCase() === 'permanent').length
  }, [entries])

  const autoCount = useMemo(() => {
    return entries.filter(e => e.auto_blocked).length
  }, [entries])

  // Filter entries
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

  // Single IP unblock
  const handleUnblock = async (ip) => {
    if (!confirm(`Are you sure you want to unblock IP ${ip}?`)) return
    setEntries(prev => prev.filter(item => item.ip !== ip))
    setSelectedIps(prev => prev.filter(i => i !== ip))
    userStore.invalidate('blacklist')
    try {
      await api.removeUserBlacklist(ip)
      showToast(`IP ${ip} unblocked successfully.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock IP', 'error')
      fetchBlacklist(true)
    }
  }

  // 1-Click Flush All Expired Bans
  const handleFlushExpired = async () => {
    if (expiredEntries.length === 0) {
      showToast('No expired IP bans found to purge.', 'info')
      return
    }
    if (!confirm(`Confirm unblocking all ${expiredEntries.length} expired IP bans?`)) return

    setFlushingExpired(true)
    try {
      const res = await api.unblockExpiredBlacklist()
      const unblockedCount = res?.unblocked_count ?? expiredEntries.length
      showToast(`Successfully unblocked ${unblockedCount} expired IP(s)!`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to flush expired IPs', 'error')
    } finally {
      setFlushingExpired(false)
    }
  }

  // Bulk Unblock Selected IPs
  const handleBulkUnblock = async () => {
    if (selectedIps.length === 0) return
    if (!confirm(`Confirm unblocking all ${selectedIps.length} selected IP addresses?`)) return

    setBulkUnblocking(true)
    try {
      const res = await api.unblockBatchBlacklist(selectedIps)
      showToast(res?.message || `Successfully unblocked ${selectedIps.length} IP(s)!`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock selected IPs', 'error')
    } finally {
      setBulkUnblocking(false)
    }
  }

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedIps.length === filteredEntries.length) {
      setSelectedIps([])
    } else {
      setSelectedIps(filteredEntries.map(e => e.ip))
    }
  }

  const toggleSelectIp = (ip) => {
    if (selectedIps.includes(ip)) {
      setSelectedIps(prev => prev.filter(i => i !== ip))
    } else {
      setSelectedIps(prev => [...prev, ip])
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.ip.trim()) return
    setSubmitting(true)
    try {
      const res = await api.addUserBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', duration: '1d' })
      showToast(res?.message || `IP ${form.ip} has been blacklisted.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px', color: '#10201E' }}>
      
      {/* Toast Feedback Messages */}
      {feedbackMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          background: feedbackMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          border: `1px solid ${feedbackMsg.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
          borderRadius: '12px',
          marginBottom: '20px',
          color: feedbackMsg.type === 'error' ? '#991B1B' : '#065F46',
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {feedbackMsg.type === 'error' ? (
            <AlertTriangle size={18} color="#DC2626" />
          ) : (
            <CheckCircle2 size={18} color="#059669" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER & GLOBAL BLACKLIST ACTIONS                                      */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              padding: '4px 10px',
              background: '#FEF2F2',
              color: '#DC2626',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '800',
              border: '1px solid #FECACA',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Ban size={12} />
              <span>IP ACCESS CONTROL</span>
            </span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#10201E', margin: '0 0 6px' }}>
            IP Blacklist &amp; Threat Quarantine
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px', maxWidth: '780px', lineHeight: 1.5 }}>
            Block abusive IPs temporarily or permanently with sub-millisecond edge enforcement across all custom Anycast proxies and WordPress endpoints.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Flush Expired Bans Button */}
          {expiredEntries.length > 0 && (
            <button
              type="button"
              onClick={handleFlushExpired}
              disabled={flushingExpired}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                fontSize: '13px',
                fontWeight: '700',
                cursor: flushingExpired ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Unblock all expired temporary IP bans in 1-click"
            >
              <Trash2 size={14} />
              <span>{flushingExpired ? 'Flushing Expired...' : `Unblock ${expiredEntries.length} Expired Bans`}</span>
            </button>
          )}

          {/* Sync / Refresh */}
          <button
            type="button"
            onClick={() => fetchBlacklist(true)}
            disabled={refreshing}
            style={{
              padding: '9px 15px',
              borderRadius: '8px',
              background: '#FAFBF9',
              color: '#334155',
              border: '1px solid #D9E1DC',
              fontSize: '13px',
              fontWeight: '700',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Block IP Address */}
          <button
            type="button"
            onClick={() => {
              setForm({ ip: '', reason: '', duration: '1d' })
              setShowModal(true)
            }}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.2)'
            }}
          >
            <Plus size={15} />
            <span>Block IP Address</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER PILLS & SEARCH BAR                                              */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #D9E1DC',
        padding: '16px 20px',
        marginBottom: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search size={14} color="#87948D" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by IP address or reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: '8px',
              border: '1px solid #D9E1DC',
              background: '#FAFBF9',
              fontSize: '13px',
              color: '#10201E',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Duration Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${entries.length})` },
            { id: 'expired', label: `Expired (${expiredEntries.length})`, highlight: expiredEntries.length > 0 },
            { id: 'temporary', label: `Active Temp (${tempCount})` },
            { id: 'permanent', label: `Permanent (${permCount})` },
            { id: 'auto', label: `Auto-Shield (${autoCount})` },
          ].map(f => {
            const active = filterDuration === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterDuration(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: active ? '1px solid #10201E' : '1px solid #D9E1DC',
                  background: active ? '#10201E' : (f.highlight ? '#FEF2F2' : '#FAFBF9'),
                  color: active ? '#FFFFFF' : (f.highlight ? '#DC2626' : '#475569'),
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BATCH ACTIONS BAR (WHEN ITEMS ARE SELECTED)                             */}
      {/* ========================================================================= */}
      {selectedIps.length > 0 && (
        <div style={{
          background: '#FEF3EB',
          border: '1px solid #FCD8BF',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="#D97735" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#10201E' }}>
              {selectedIps.length} IP(s) selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleBulkUnblock}
              disabled={bulkUnblocking}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: bulkUnblocking ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Trash2 size={13} />
              <span>{bulkUnblocking ? 'Unblocking...' : `Unblock Selected (${selectedIps.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIps([])}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BLACKLIST DATA TABLE                                                    */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #D9E1DC',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{
                background: '#FAFBF9',
                borderBottom: '1px solid #D9E1DC',
                fontSize: '11px',
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                fontWeight: '700'
              }}>
                <th style={{ padding: '14px 16px', width: '36px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                    title={selectedIps.length === filteredEntries.length ? 'Deselect all' : 'Select all'}
                  >
                    {filteredEntries.length > 0 && selectedIps.length === filteredEntries.length ? (
                      <CheckSquare size={16} color="#0284C7" />
                    ) : (
                      <Square size={16} color="#94A3B8" />
                    )}
                  </button>
                </th>
                <th style={{ padding: '14px 16px' }}>IP ADDRESS</th>
                <th style={{ padding: '14px 16px' }}>REASON / TRIGGER</th>
                <th style={{ padding: '14px 16px' }}>DURATION</th>
                <th style={{ padding: '14px 16px' }}>EXPIRES AT</th>
                <th style={{ padding: '14px 16px' }}>SOURCE</th>
                <th style={{ padding: '14px 16px' }}>BLOCKED AT</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#64748B', padding: '60px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: '600' }}>
                      <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', color: '#DC2626' }} />
                      <span>Loading Active Blacklist Entries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px'
                    }}>
                      <ShieldCheck size={22} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                      No Blacklisted IPs Found
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#87948D', margin: '4px 0 0' }}>
                      {search || filterDuration !== 'all' ? 'Try adjusting your search query or duration filter.' : 'Your websites are secure. No IP addresses are currently blocked.'}
                    </p>
                  </td>
                </tr>
              ) : filteredEntries.map((entry, i) => {
                const now = new Date()
                const isSelected = selectedIps.includes(entry.ip)
                const isExpired = entry.is_expired || (entry.expires_at && new Date(entry.expires_at) <= now)
                const isPerm = !entry.expires_at || String(entry.type || entry.duration || '').toLowerCase() === 'permanent'

                return (
                  <tr
                    key={entry.id || entry.ip || i}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isSelected ? '#FEF3EB' : (isExpired ? '#FFFBFB' : '#FFFFFF'),
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleSelectIp(entry.ip)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                      >
                        {isSelected ? <CheckSquare size={16} color="#0284C7" /> : <Square size={16} color="#CBD5E1" />}
                      </button>
                    </td>

                    {/* IP */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{
                          fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
                          fontSize: '13px',
                          fontWeight: '800',
                          color: '#10201E',
                          background: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {entry.ip}
                        </code>
                        {isExpired && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FECACA'
                          }}>
                            EXPIRED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reason */}
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px', maxWidth: '280px' }}>
                      {entry.reason || 'Blocked by security policy'}
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        background: isPerm ? '#FEF2F2' : '#E0F2FE',
                        color: isPerm ? '#DC2626' : '#0369A1',
                        border: `1px solid ${isPerm ? '#FECACA' : '#BAE6FD'}`
                      }}>
                        <Clock size={11} />
                        <span>{entry.duration || entry.type || (isPerm ? 'Permanent' : 'Temporary')}</span>
                      </span>
                    </td>

                    {/* Expires At */}
                    <td style={{ padding: '14px 16px', fontSize: '12.5px' }}>
                      {isPerm ? (
                        <span style={{ color: '#87948D', fontWeight: '500' }}>Never (Permanent)</span>
                      ) : isExpired ? (
                        <span style={{ color: '#DC2626', fontWeight: '700' }}>Expired</span>
                      ) : (
                        <span style={{ color: '#059669', fontWeight: '600' }}>{entry.expires_at}</span>
                      )}
                    </td>

                    {/* Origin / Source */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: entry.auto_blocked ? '#FEF3C7' : '#ECFDF5',
                        color: entry.auto_blocked ? '#92400E' : '#065F46'
                      }}>
                        {entry.auto_blocked ? 'Auto Shield' : 'Manual'}
                      </span>
                    </td>

                    {/* Blocked At */}
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {entry.blocked_at || entry.added_at || 'Recently'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleUnblock(entry.ip)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#DC2626'
                          e.currentTarget.style.color = '#FFFFFF'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#FFFFFF'
                          e.currentTarget.style.color = '#DC2626'
                        }}
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

      {/* ========================================================================= */}
      {/* 5. ADD IP BLOCK MODAL                                                     */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 32, 30, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #D9E1DC',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ban size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                  Block IP Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  IP Address (IPv4 / IPv6)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100"
                  value={form.ip}
                  onChange={e => setForm({ ...form, ip: e.target.value.trim() })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ban Duration
                </label>
                <select
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="1d">1 Day (Auto-Expires in 24 Hours)</option>
                  <option value="2d">2 Days (Auto-Expires in 48 Hours)</option>
                  <option value="7d">7 Days (1 Week Quarantine)</option>
                  <option value="30d">30 Days (1 Month Quarantine)</option>
                  <option value="permanent">Permanent Block (Manual Lift Only)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Reason / Threat Annotation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Repeated SQL injection & probe attempts"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: '#FAFBF9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
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
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Applying Ban...' : 'Confirm Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
