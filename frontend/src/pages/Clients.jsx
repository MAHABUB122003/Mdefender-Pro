import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'

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

  const copyKey = async (key) => {
    const ok = await copyToClipboard(key)
    if (ok) {
      showToast('API Key copied to clipboard!')
    }
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
    <>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-globe"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Multi-Tenant Protected Websites
            </h1>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '3px 0 0' }}>
              All web applications and WordPress sites connected across all tenant accounts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}></i>
            <input
              type="text"
              placeholder="Search domain or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={fetchWebsites}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              padding: '7px 14px'
            }}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="clients-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '8px', color: '#2563eb' }}></i>
            Loading tenant websites...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            No connected websites found matching your search.
          </div>
        ) : (
          filtered.map(site => (
            <div className="client-card" key={site.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="client-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-shield-halved" style={{ color: '#2563eb' }}></i>
                  {site.domain}
                </h3>
                <span className={`badge ${site.status === 'active' ? 'success' : 'danger'}`}>
                  {site.status}
                </span>
              </div>

              <div className="client-body" style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#64748b' }}>Owner Account:</strong>{' '}
                  <span style={{ color: '#2563eb', fontWeight: '600' }}>{site.user_email || 'System'}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#64748b' }}>Origin Target:</strong>{' '}
                  <code>{site.origin_server || 'Cloud Edge Proxy'}</code>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#64748b' }}>Security Level:</strong>{' '}
                  <span className={`badge severity-${site.security_level || 'high'}`}>{site.security_level || 'high'}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#64748b' }}>Created:</strong>{' '}
                  <span style={{ color: '#64748b' }}>{site.created_at ? site.created_at.slice(0, 10) : '—'}</span>
                </p>
              </div>

              <div className="client-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                {site.api_key && (
                  <button
                    className="btn-small btn-key"
                    onClick={() => copyKey(site.api_key)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-key"></i> Copy Key
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
    </>
  )
}
