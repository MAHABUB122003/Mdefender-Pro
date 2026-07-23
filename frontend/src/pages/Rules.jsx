import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Rules({ token }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', pattern: '', action: 'block', severity: 'critical' })

  const fetchRules = async () => {
    try {
      const data = await api.getRules()
      setRules(Array.isArray(data) ? data : (data.rules || []))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRules() }, [])

  const openAddModal = () => {
    setEditingId(null)
    setForm({ name: '', pattern: '', action: 'block', severity: 'critical' })
    setShowModal(true)
  }

  const openEditModal = (rule) => {
    setEditingId(rule.id)
    setForm({ name: rule.name, pattern: rule.pattern, action: rule.action, severity: rule.severity })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateRule(editingId, form)
      } else {
        await api.createRule(form)
      }
      setShowModal(false)
      fetchRules()
    } catch (err) {
      console.error(err)
      alert('Failed to save rule: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <>
      <div className="action-bar">
        <button className="btn-primary" onClick={openAddModal}>+ Add New Rule</button>
      </div>

      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pattern</th>
              <th>Action</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}><i className="fas fa-spinner fa-spin"></i></td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>No rules defined</td></tr>
            ) : rules.map(rule => (
              <tr key={rule.id}>
                <td><strong>{rule.name}</strong></td>
                <td><code>{rule.pattern?.slice(0, 60)}{rule.pattern?.length > 60 ? '...' : ''}</code></td>
                <td><span className={`badge ${rule.action === 'block' ? 'danger' : 'warning'}`}>{rule.action}</span></td>
                <td><span className={`badge severity-${rule.severity}`}>{rule.severity}</span></td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={rule.enabled} onChange={async () => { try { await api.updateRule(rule.id, { enabled: !rule.enabled }); fetchRules() } catch(e) { console.error(e) } }} />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  <button className="btn-small btn-edit" onClick={() => openEditModal(rule)}>Edit</button>
                  <button className="btn-small btn-delete" onClick={async () => { if (confirm('Delete this rule?')) { try { await api.deleteRule(rule.id); fetchRules() } catch(e) { console.error(e) } } }}>Delete</button>
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
            <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Edit Rule' : 'Add New Rule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rule Name</label>
                <input type="text" required placeholder="e.g., SQL Injection - Custom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Pattern (Regex)</label>
                <input type="text" required placeholder="e.g., (?i)(pattern)" value={form.pattern} onChange={e => setForm({...form, pattern: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Action</label>
                <select value={form.action} onChange={e => setForm({...form, action: e.target.value})}>
                  <option value="block">Block</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Rule</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
