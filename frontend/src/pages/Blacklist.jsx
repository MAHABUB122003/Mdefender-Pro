import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Blacklist({ token }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', reason: '', type: 'permanent' })

  const fetchBlacklist = async () => {
    try {
      const data = await api.getBlacklist()
      setEntries(Array.isArray(data) ? data : (data.blacklist || []))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchBlacklist() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.addBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', type: 'permanent' })
      fetchBlacklist()
    } catch (err) {
      console.error(err)
      alert('Failed to block IP: ' + (err.message || 'Unknown error'))
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
                  <button className="btn-small btn-delete" onClick={async () => { if (confirm(`Unblock IP ${entry.ip}?`)) { try { await api.removeBlacklist(entry.ip); fetchBlacklist() } catch(e) { console.error(e) } } }}>Unblock</button>
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
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Block IP</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
