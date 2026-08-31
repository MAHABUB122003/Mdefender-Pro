import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import userStore from '../utils/userStore'

export default function UserBlacklist() {
  const [entries, setEntries] = useState(() => userStore.get('blacklist') || [])
  const [loading, setLoading] = useState(() => !userStore.get('blacklist'))
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', reason: '', type: 'permanent' })
  const [submitting, setSubmitting] = useState(false)
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

  const fetchBlacklist = useCallback(async () => {
    try {
      const data = await api.getUserBlacklist()
      const list = Array.isArray(data) ? data : (data.blacklist || [])
      setEntries(list)
      userStore.set('blacklist', list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBlacklist()
  }, [fetchBlacklist])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isPremium) { alert('Upgrade to Premium to block IPs'); return }
    setSubmitting(true)
    try {
      await api.addUserBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', type: 'permanent' })
      fetchBlacklist()
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
      fetchBlacklist()
    } catch (err) {
      alert(err.message || 'Failed to unblock IP')
    }
  }

  return (
    <>
      <div className="action-bar">
        <button className="btn-primary" onClick={() => { setForm({ ip: '', reason: '', type: 'permanent' }); setShowModal(true) }}>+ Block IP</button>
      </div>

      <div className="blacklist-table">
        <table>
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Reason</th>
              <th>Type</th>
              <th>Source</th>
              <th>Blocked At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}><i className="fas fa-spinner fa-spin"></i></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>No IPs blacklisted</td></tr>
            ) : entries.map((entry, i) => (
              <tr key={i}>
                <td><code>{entry.ip}</code></td>
                <td>{entry.reason}</td>
                <td><span className={`badge ${entry.type === 'permanent' ? 'danger' : 'warning'}`}>{entry.type}</span></td>
                <td><span className={`badge ${entry.auto_blocked ? 'warning' : 'success'}`}>{entry.auto_blocked ? 'Auto' : 'Manual'}</span></td>
                <td>{entry.blocked_at || entry.added_at}</td>
                <td>
                  <button className="btn-small btn-delete" onClick={() => handleUnblock(entry.ip)}>Unblock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            <h2 style={{ marginBottom: '20px' }}>Block IP Address</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>IP Address</label>
                <input type="text" required placeholder="e.g., 192.168.1.100" value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input type="text" required placeholder="e.g., Suspicious activity detected" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Block Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="permanent">Permanent</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Blocking...' : 'Block IP'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
