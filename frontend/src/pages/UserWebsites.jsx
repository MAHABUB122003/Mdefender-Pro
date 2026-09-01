import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function UserWebsites() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [modalKey, setModalKey] = useState('')
  const [modalDomain, setModalDomain] = useState('')

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
      const res = await api.addUserWebsite({ domain: newWebsite.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setModalDomain(newWebsite.trim())
        setShowKeyModal(true)
      }
      setNewWebsite('')
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to add website')
    } finally {
      setAdding(false)
    }
  }

  const handleRegenerateKey = async (websiteId, domain) => {
    if (!confirm(`Are you sure you want to regenerate the API key for ${domain}? Any sites currently using the old key will disconnect.`)) return
    try {
      const res = await api.regenerateApiKey({ website_id: websiteId })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setModalDomain(domain)
        setShowKeyModal(true)
      } else {
        alert('Failed to regenerate key')
      }
    } catch (err) {
      alert(err.message || 'Error regenerating key')
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  return (
    <>
      {/* Download Plugin Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '14px', border: 'none',
        boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.15)', padding: '24px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#ffffff',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}>
            <i className="fab fa-wordpress"></i>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>MDefender Pro WordPress Plugin</div>
            <div style={{ fontSize: '13px', color: '#e0e7ff' }}>Download and install the official security plugin on your WordPress site.</div>
          </div>
        </div>
        <a 
          href={`${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
          download
          style={{
            padding: '12px 24px', background: '#ffffff', color: '#4f46e5', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
        >
          <i className="fas fa-download"></i> Download Plugin
        </a>
      </div>

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
                <button 
                  onClick={() => handleRegenerateKey(w.id, w.domain || w.url || w)}
                  style={{
                    padding: '6px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <i className="fas fa-key"></i> Key
                </button>
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

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '90%', maxWidth: '500px', padding: '28px', position: 'relative',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-halved" style={{ color: '#10b981' }}></i>
              Your Website API Key
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
              Here is your API key for <strong>{modalDomain}</strong>. Please copy it now. 
              <span style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '4px' }}>
                ⚠️ For security, this key is shown only once and cannot be retrieved later!
              </span>
            </p>

            <div style={{
              display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center'
            }}>
              <div style={{
                flex: 1, padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #cbd5e1',
                borderRadius: '10px', fontSize: '13px', fontFamily: "'Fira Code', Consolas, monospace",
                color: '#0f172a', wordBreak: 'break-all', userSelect: 'all', fontWeight: '500'
              }}>
                {modalKey}
              </div>
              <button 
                onClick={async () => {
                  await navigator.clipboard.writeText(modalKey);
                  alert('API Key copied to clipboard!');
                }}
                style={{
                  padding: '14px 18px', background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '10px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = '#1d4ed8'}
                onMouseLeave={e => e.target.style.background = '#2563eb'}
              >
                <i className="fas fa-copy"></i> Copy
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowKeyModal(false);
                  setModalKey('');
                  setModalDomain('');
                }}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                }}
              >
                I have saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
