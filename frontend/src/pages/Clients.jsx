import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function Clients() {
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.adminGetTenantWebsites()
      const list = res?.data?.websites || (Array.isArray(res) ? res : res.websites || res.clients || [])
      setWebsites(list)
    } catch (err) {
      console.error(err)
      showToast('Failed to load websites list', true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebsites()
  }, [fetchWebsites])

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    showToast('API Key copied to clipboard!')
  }

  const handleDelete = async (website) => {
    if (!confirm(`Delete protected website ${website.domain}?`)) return
    try {
      await api.adminDeleteTenantWebsite(website.id)
      showToast(`Website ${website.domain} removed.`)
      fetchWebsites()
    } catch (err) {
      showToast(err.message || 'Failed to delete website', true)
    }
  }

  const filtered = websites.filter(w => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (w.domain && w.domain.toLowerCase().includes(q)) ||
      (w.origin_server && w.origin_server.toLowerCase().includes(q)) ||
      (w.user_email && w.user_email.toLowerCase().includes(q))
    )
  })

  return (
    <div className="admin-websites-page" style={{ padding: '4px 0 40px' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-globe" style={{ color: '#3b82f6' }}></i>
            Multi-Tenant Protected Websites
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
            All web applications and WordPress sites connected across all tenant user accounts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }}></i>
            <input
              type="text"
              placeholder="Search domain or user email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={fetchWebsites}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className={`fas fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="clients-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '8px' }}></i>
            Loading tenant websites...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
            No connected websites found matching your search.
          </div>
        ) : (
          filtered.map(site => (
            <div className="client-card" key={site.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div className="client-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-shield-halved" style={{ color: '#3b82f6' }}></i>
                  {site.domain}
                </h3>
                <span className={`badge ${site.status === 'active' ? 'success' : 'danger'}`}>
                  {site.status}
                </span>
              </div>

              <div className="client-body" style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#94a3b8' }}>Owner Account:</strong>{' '}
                  <span style={{ color: '#60a5fa', fontWeight: '600' }}>{site.user_email || 'System'}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#94a3b8' }}>Origin Server:</strong>{' '}
                  <code>{site.origin_server || 'Cloud Edge Proxy'}</code>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#94a3b8' }}>Security Level:</strong>{' '}
                  <span className={`badge severity-${site.security_level || 'high'}`}>{site.security_level || 'high'}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#94a3b8' }}>Created:</strong>{' '}
                  <span>{site.created_at || '—'}</span>
                </p>
              </div>

              <div className="client-actions" style={{ marginTop: '18px', display: 'flex', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
                {site.api_key && (
                  <button
                    className="btn-small btn-key"
                    onClick={() => copyKey(site.api_key)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-key"></i> Copy API Key
                  </button>
                )}
                <button
                  className="btn-small btn-delete"
                  onClick={() => handleDelete(site)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <i className="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
