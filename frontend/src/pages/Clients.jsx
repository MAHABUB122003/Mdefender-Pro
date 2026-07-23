import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Clients({ token }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ domain: '', origin_server: '', security_level: 'high' })

  const fetchClients = async () => {
    try {
      const data = await api.getClients()
      setClients(Array.isArray(data) ? data : (data.clients || []))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClients() }, [])

  const openAdd = () => { setEditingId(null); setForm({ domain: '', origin_server: '', security_level: 'high' }); setShowModal(true) }

  const openEdit = (c) => { setEditingId(c.id); setForm({ domain: c.domain, origin_server: c.origin_server, security_level: c.security_level }); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) { await api.updateClient(editingId, form) }
      else { await api.addClient(form) }
      setShowModal(false)
      fetchClients()
    } catch (err) {
      console.error(err)
      alert('Failed to save client: ' + (err.message || 'Unknown error'))
    }
  }

  const copyKey = (key) => { navigator.clipboard.writeText(key); alert('API key copied to clipboard') }

  return (
    <>
      <div className="action-bar">
        <button className="btn-primary" onClick={openAdd}>+ Add Website</button>
      </div>

      <div className="clients-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin"></i></div>
        ) : clients.length === 0 ? (
          <div className="empty-state">No clients registered yet. Click "Add Website" to connect a new website.</div>
        ) : clients.map(client => (
          <div className="client-card" key={client.id}>
            <div className="client-header">
              <h3>{client.domain}</h3>
              <span className={`badge ${client.status === 'active' ? 'success' : client.status === 'suspended' ? 'danger' : 'warning'}`}>{client.status}</span>
            </div>
            <div className="client-body">
              <p><strong>Origin:</strong> {client.origin_server}</p>
              <p><strong>Security Level:</strong> <span className={`badge severity-${client.security_level}`}>{client.security_level}</span></p>
              <p><strong>API Key:</strong> <code>{client.api_key?.slice(0, 20)}...</code></p>
              <p><strong>Created:</strong> {client.created_at}</p>
            </div>
            <div className="client-actions">
              <button className="btn-small btn-edit" onClick={() => openEdit(client)}>Edit</button>
              <button className="btn-small btn-delete" onClick={async () => { if (confirm('Delete this client?')) { try { await api.deleteClient(client.id); fetchClients() } catch(e) { console.error(e) } } }}>Delete</button>
              <button className="btn-small btn-key" onClick={() => copyKey(client.api_key)}>Copy Key</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Edit Website' : 'Add Website'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Domain</label>
                <input type="text" required placeholder="e.g., example.com" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Origin Server IP</label>
                <input type="text" required placeholder="e.g., http://192.168.1.100" value={form.origin_server} onChange={e => setForm({...form, origin_server: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Security Level</label>
                <select value={form.security_level} onChange={e => setForm({...form, security_level: e.target.value})}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Client</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
