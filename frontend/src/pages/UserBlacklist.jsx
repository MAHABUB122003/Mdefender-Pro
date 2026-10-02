import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [filterDuration, setFilterDuration] = useState('all')

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.addUserBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', duration: '1d' })
      fetchBlacklist(true)
      if (res?.message) {
        alert(res.message)
      }
    } catch (err) {
      alert(err.message || 'Failed to block IP')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnblock = async (ip) => {
    if (!confirm(`Unblock IP ${ip}?`)) return
    try {
      await api.removeUserBlacklist(ip)
      fetchBlacklist(true)
    } catch (err) {
      alert(err.message || 'Failed to unblock IP')
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const ipMatch = !search || item.ip?.toLowerCase().includes(search.toLowerCase()) || item.reason?.toLowerCase().includes(search.toLowerCase())
      if (!ipMatch) return false
      if (filterDuration === 'all') return true
      if (filterDuration === 'permanent') return item.type?.toLowerCase() === 'permanent' || !item.expires_at
      if (filterDuration === 'temporary') return item.type?.toLowerCase() !== 'permanent' && !!item.expires_at
      if (filterDuration === '1d') return item.type?.includes('1')
      if (filterDuration === '2d') return item.type?.includes('2')
      if (filterDuration === '7d') return item.type?.includes('7')
      if (filterDuration === '30d') return item.type?.includes('30')
      return true
    })
  }, [entries, search, filterDuration])

  const formatExpires = (entry) => {
    if (!entry.expires_at) return <span style={{ color: '#64748b', fontSize: '12px' }}>Never (Permanent)</span>
    if (entry.is_expired) return <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px' }}>Expired</span>
    return <span style={{ color: '#059669', fontSize: '12px', fontWeight: '500' }}>{entry.expires_at}</span>
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '6px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '16px' }}>
              <i className="fas fa-ban"></i>
            </span>
            IP Blacklist & Access Control
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Ban abusive IPs temporarily or permanently with sub-millisecond pre-flight enforcement across all connected WordPress sites.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => fetchBlacklist(true)}
            disabled={refreshing}
            style={{
              padding: '9px 15px',
              background: refreshing ? '#eff6ff' : '#f8fafc',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={`fas fa-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>

          <button
            className="btn-primary"
            style={{
              padding: '9px 18px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
            }}
            onClick={() => {
              setForm({ ip: '', reason: '', duration: '1d' })
              setShowModal(true)
            }}
          >
            <i className="fas fa-plus"></i>
            Block IP Address
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
          <input
            type="text"
            placeholder="Search by IP or reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Duration:</span>
          <select
            value={filterDuration}
            onChange={e => setFilterDuration(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '500', background: '#fff' }}
          >
            <option value="all">All Durations ({entries.length})</option>
            <option value="permanent">Permanent Only</option>
            <option value="temporary">Temporary Bans</option>
            <option value="1d">1 Day Bans</option>
            <option value="2d">2 Days Bans</option>
            <option value="7d">7 Days Bans</option>
            <option value="30d">30 Days Bans</option>
          </select>
        </div>
      </div>

      {/* Blacklist Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>IP Address</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Reason</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Duration</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Expires At</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Origin</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Blocked At</th>
              <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '50px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                  <div>Loading blacklist entries...</div>
                </td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '50px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '12px', fontSize: '20px' }}>
                    <i className="fas fa-shield-check"></i>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155' }}>No Blacklisted IPs Found</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    {search || filterDuration !== 'all' ? 'Try adjusting your search filters' : 'Your websites are protected. Add IPs to instantly ban malicious actors.'}
                  </div>
                </td>
              </tr>
            ) : filteredEntries.map((entry, i) => (
              <tr key={entry.id || entry.ip || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                      {entry.ip}
                    </code>
                    {entry.is_expired && (
                      <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>EXPIRED</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 20px', color: '#475569', fontSize: '13px', maxWidth: '280px' }}>
                  {entry.reason || 'Blocked by administrator'}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: entry.type === 'Permanent' || entry.type === 'permanent' ? '#fee2e2' : '#e0f2fe',
                    color: entry.type === 'Permanent' || entry.type === 'permanent' ? '#b91c1c' : '#0369a1'
                  }}>
                    <i className={`fas ${entry.type === 'Permanent' || entry.type === 'permanent' ? 'fa-lock' : 'fa-clock'}`} style={{ fontSize: '10px' }}></i>
                    {entry.type || entry.duration || 'Permanent'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {formatExpires(entry)}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: entry.auto_blocked ? '#fef3c7' : '#ecfdf5',
                    color: entry.auto_blocked ? '#92400e' : '#047857'
                  }}>
                    {entry.auto_blocked ? 'Auto Shield' : 'Manual'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '12px' }}>
                  {entry.blocked_at || entry.added_at || 'Recently'}
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleUnblock(entry.ip)}
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#dc2626' }}
                  >
                    Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add IP Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Blacklist IP Address</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Instantly block visitor requests across all your sites</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  IP Address or Range *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 198.51.100.45 or 203.0.113.0/24"
                  value={form.ip}
                  onChange={e => setForm({ ...form, ip: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Ban Duration *
                </label>
                <select
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '500', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="1d">1 Day (24 Hours) — Recommended for suspicious probing</option>
                  <option value="2d">2 Days (48 Hours) — Standard temporary ban</option>
                  <option value="7d">7 Days (1 Week) — Aggressive automated scanners</option>
                  <option value="30d">30 Days (1 Month) — High risk botnets</option>
                  <option value="permanent">Permanent (Until manual removal)</option>
                </select>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., Vulnerability exploit attempt or brute-force"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting && <i className="fas fa-spinner fa-spin"></i>}
                  {submitting ? 'Applying Block...' : 'Confirm Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
