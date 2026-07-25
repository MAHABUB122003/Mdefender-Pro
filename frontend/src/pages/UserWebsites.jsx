import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function UserWebsites() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddWebsite = async (e) => {
    e.preventDefault()
    if (!newWebsite.trim()) return
    if (!isPremium && data?.websites?.length >= 1) {
      alert('Free plan is limited to 1 website. Upgrade to Premium for unlimited websites.')
      return
    }
    setAdding(true)
    try {
      await api.addUserWebsite({ domain: newWebsite.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') })
      setNewWebsite('')
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to add website')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveWebsite = async (id) => {
    if (!confirm('Remove this website?')) return
    try {
      await api.removeUserWebsite(id)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to remove website')
    }
  }

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerate API key? Your old key will stop working immediately.')) return
    try {
      await api.regenerateApiKey()
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to regenerate key')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  return (
    <>
      {/* Add Website Form */}
      {!isPremium && data?.websites?.length >= 1 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b',
          borderRadius: '14px', padding: '16px 24px', marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-crown" style={{ color: '#d97706', fontSize: '18px' }}></i>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>Free Plan: 1 website limit reached</div>
              <div style={{ fontSize: '12px', color: '#a16207' }}>Upgrade to Premium for unlimited websites</div>
            </div>
          </div>
          <a href="/user/settings" style={{
            padding: '8px 16px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none',
          }}>
            <i className="fas fa-arrow-up" style={{ marginRight: '4px' }}></i> Upgrade
          </a>
        </div>
      )}

      <div style={{
        background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '24px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
          <i className="fas fa-plus-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
          Add New Website
          {!isPremium && data?.websites?.length >= 1 && (
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#d97706', marginLeft: '8px' }}>(Premium only)</span>
          )}
        </h3>
        <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder={(!isPremium && data?.websites?.length >= 1) ? "Upgrade to Premium to add more" : "example.com"}
            value={newWebsite}
            onChange={e => setNewWebsite(e.target.value)}
            disabled={!isPremium && data?.websites?.length >= 1}
            style={{
              flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px',
              fontSize: '14px', fontFamily: 'inherit', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            required
          />
          <button type="submit" disabled={adding || (!isPremium && data?.websites?.length >= 1)} style={{
            padding: '12px 24px', background: adding ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            cursor: adding ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <i className={`fas ${adding ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i> Add Website
          </button>
        </form>
      </div>

      {/* Websites List */}
      <div style={{
        background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
            <i className="fas fa-globe" style={{ color: '#2563eb', marginRight: '8px' }}></i>
            My Websites ({data?.websites?.length || 0})
          </h3>
        </div>
        <div>
          {data?.websites?.length ? data.websites.map((w, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: i < data.websites.length - 1 ? '1px solid #f1f5f9' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#10b981',
                }}>
                  <i className="fas fa-globe"></i>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{w.domain || w.url || w}</div>
                  {w.added_at && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Added {w.added_at}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                  background: '#ecfdf5', color: '#10b981',
                }}>
                  <i className="fas fa-circle" style={{ fontSize: '6px', marginRight: '4px' }}></i>
                  {w.status || 'active'}
                </span>
                <button onClick={() => handleRemoveWebsite(w.id)} style={{
                  padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                  borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <i className="fas fa-trash-can"></i> Remove
                </button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              <i className="fas fa-globe" style={{ fontSize: '32px', display: 'block', marginBottom: '12px', color: '#cbd5e1' }}></i>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>No websites added yet</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Add your first website above to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* API Key Section */}
      <div style={{
        background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '24px', marginTop: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
          <i className="fas fa-key" style={{ color: '#a78bfa', marginRight: '8px' }}></i>
          API Key
        </h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
          Use this key to integrate MDefender WAF protection into your application. Include it in your API requests for authentication.
        </p>
        <div style={{
          padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '10px', fontSize: '13px', fontFamily: "'Fira Code', Consolas, monospace",
          color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '16px',
        }}>
          {data?.api_key || 'No key generated'}
        </div>
        <button onClick={handleRegenerateKey} style={{
          padding: '10px 20px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
          borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <i className="fas fa-arrow-rotate-right"></i> Regenerate Key
        </button>
      </div>
    </>
  )
}
