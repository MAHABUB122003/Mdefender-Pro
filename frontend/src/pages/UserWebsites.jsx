import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserWebsites() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const cachedData = userStore.get('websites') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)

  // API Key & Integration Modal State
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [modalKey, setModalKey] = useState('')
  const [modalDomain, setModalDomain] = useState('')
  const [modalWebsiteId, setModalWebsiteId] = useState('')
  const [modalTab, setModalTab] = useState('express') // 'express' | 'wordpress' | 'env'
  const [isMasked, setIsMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const apiEndpoint = window.location.origin

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
      userStore.set('websites', result)
      userStore.set('dashboard', result)
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
      const cleanDomain = newWebsite.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      const res = await api.addUserWebsite({ domain: cleanDomain })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setModalDomain(cleanDomain)
        setModalWebsiteId(res.website?._id || '')
        setIsMasked(false)
        setShowKeyModal(true)
      }
      setNewWebsite('')
      userStore.remove('websites')
      userStore.remove('dashboard')
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to add website')
    } finally {
      setAdding(false)
    }
  }

  const handleOpenKeyModal = (w) => {
    const domain = w.domain || w.name || w.url || 'My Website'
    const id = w.id || w._id || ''
    setModalDomain(domain)
    setModalWebsiteId(id)
    // If a site-specific key is not cached, fallback to user account API key
    const key = w.api_key || data?.api_key || ''
    setModalKey(key)
    setIsMasked(true)
    setModalTab('express')
    setShowKeyModal(true)
  }

  const handleRegenerateKey = async () => {
    if (!confirm(`Are you sure you want to regenerate the API key for ${modalDomain}? Any active connections using the old key will be disconnected.`)) return
    setRegenerating(true)
    try {
      const res = await api.regenerateApiKey({ website_id: modalWebsiteId })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setIsMasked(false)
        userStore.remove('websites')
        userStore.remove('dashboard')
        fetchData()
      } else {
        alert('Failed to regenerate key')
      }
    } catch (err) {
      alert(err.message || 'Error regenerating key')
    } finally {
      setRegenerating(false)
    }
  }

  const handleRemoveWebsite = async (w) => {
    const targetId = (typeof w === 'object') ? (w.id || w._id || w.domain || w.name) : w
    const domainName = (typeof w === 'object') ? (w.domain || w.name || w.url || 'this website') : w
    if (!confirm(`Are you sure you want to remove ${domainName}?`)) return
    try {
      await api.removeUserWebsite(targetId)
      userStore.remove('websites')
      userStore.remove('dashboard')
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to remove website')
    }
  }

  const handleCopyKey = async () => {
    if (!modalKey) return
    const ok = await copyToClipboard(modalKey)
    if (ok) {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleCopySnippet = async (code) => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2000)
    }
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
        <div>Loading your protected websites...</div>
      </div>
    )
  }

  // Code integration snippets
  const expressSnippet = `// 1. Install official NPM package
// npm install mdefender-pro express

const express = require('express');
const { mdefender } = require('mdefender-pro');

const app = express();

// 2. Attach MDefender Pro WAF Middleware
app.use(mdefender({
  apiKey: '${modalKey || 'YOUR_API_KEY_HERE'}',
  domain: '${modalDomain || 'yourdomain.com'}',
  apiEndpoint: '${apiEndpoint}',
  mode: 'block' // 'block' | 'monitor' | 'off'
}));

app.get('/', (req, res) => {
  res.send('Protected by MDefender Pro!');
});

app.listen(3000, () => console.log('Server running on port 3000'));`

  const envSnippet = `# .env file
MDEFENDER_API_KEY=${modalKey || 'YOUR_API_KEY_HERE'}
MDEFENDER_DOMAIN=${modalDomain || 'yourdomain.com'}
MDEFENDER_API_ENDPOINT=${apiEndpoint}
MDEFENDER_MODE=block`

  return (
    <div style={{ padding: '4px 0 40px' }}>
      {/* Premium Banner */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '12px', border: '1px solid #fde68a',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>⭐</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#92400e' }}>Free Plan: 1 Website Limit</div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>Upgrade to Premium for unlimited protected domains, real-time ML rules & priority support.</div>
            </div>
          </div>
          <a href="/user/settings" style={{
            padding: '8px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}>
            <i className="fas fa-arrow-up"></i> Upgrade to Premium
          </a>
        </div>
      )}

      {/* Add New Website Card */}
      <div className="card" style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '24px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            <i className="fas fa-plus"></i>
          </span>
          Connect New Website
          {!isPremium && data?.websites?.length >= 1 && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px' }}>LIMIT REACHED</span>
          )}
        </h3>

        <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={(!isPremium && data?.websites?.length >= 1) ? "Upgrade to Premium to add more domains" : "e.g. mycompany.com or store.example.org"}
            value={newWebsite}
            onChange={e => setNewWebsite(e.target.value)}
            disabled={!isPremium && data?.websites?.length >= 1}
            style={{
              flex: '1 1 280px', height: '46px', padding: '0 16px', border: '1.5px solid var(--border-color, #cbd5e1)', borderRadius: '10px',
              fontSize: '14px', fontFamily: 'inherit', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-main, #0f172a)', fontWeight: '600'
            }}
            required
          />
          <button
            type="submit"
            disabled={adding || (!isPremium && data?.websites?.length >= 1)}
            className="btn-primary"
            style={{
              height: '46px', padding: '0 26px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
              display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: (adding || (!isPremium && data?.websites?.length >= 1)) ? 'not-allowed' : 'pointer',
              opacity: (!isPremium && data?.websites?.length >= 1) ? 0.6 : 1
            }}
          >
            <i className={`fas ${adding ? 'fa-spinner fa-spin' : 'fa-shield'}`}></i>
            <span>{adding ? 'Connecting...' : 'Add & Protect'}</span>
          </button>
        </form>
      </div>

      {/* Protected Websites List */}
      <div className="card" style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: '0 0 2px' }}>
              My Protected Websites ({data?.websites?.length || 0})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Manage website API keys, protection status, and integration settings.
            </p>
          </div>
          <button onClick={fetchData} className="btn-small" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-rotate" style={{ marginRight: '6px' }}></i>Refresh
          </button>
        </div>

        <div>
          {data?.websites?.length ? data.websites.map((w, i) => (
            <div key={w.id || w._id || i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: i < data.websites.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none',
              transition: 'background 0.15s', flexWrap: 'wrap', gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#10b981',
                  border: '1px solid #bbf7d0'
                }}>
                  <i className="fas fa-globe"></i>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{w.domain || w.url || w.name || w}</span>
                    <span className="badge success" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                      <i className="fas fa-circle" style={{ fontSize: '6px', marginRight: '4px' }}></i>
                      {w.status || 'Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                    {w.platform ? `Platform: ${w.platform} • ` : ''}Added: {w.added_at || 'Protected'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* View Key & Setup Button */}
                <button
                  onClick={() => handleOpenKeyModal(w)}
                  style={{
                    padding: '8px 16px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s'
                  }}
                >
                  <i className="fas fa-key"></i>
                  <span>API Key &amp; Setup</span>
                </button>

                {/* Remove Website Button */}
                <button
                  onClick={() => handleRemoveWebsite(w)}
                  style={{
                    padding: '8px 14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                  }}
                >
                  <i className="fas fa-trash-can"></i>
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: '#94a3b8' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', color: '#cbd5e1' }}></i>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>No Websites Connected Yet</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>Add your first website above to generate your API key and activate real-time WAF protection.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIGH-END API KEY & INTEGRATION DRAWER/MODAL */}
      {/* ========================================================================= */}
      {showKeyModal && (
        <div
          onClick={() => setShowKeyModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)', width: '100%', maxWidth: '640px',
              maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '22px 28px', color: '#ffffff', borderTopLeftRadius: '17px', borderTopRightRadius: '17px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>
                  <i className="fas fa-key"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: '800', color: '#fff' }}>
                    API Key &amp; Integration Guide
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Domain: <strong style={{ color: '#38bdf8' }}>{modalDomain}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              {/* API Key Box */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Website Secret API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className={`fas ${isMasked ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    <span>{isMasked ? 'Reveal Key' : 'Hide Key'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <div style={{
                    flex: 1, padding: '12px 16px', background: '#0f172a', border: '1.5px solid #334155',
                    borderRadius: '10px', fontSize: '13.5px', fontFamily: 'Consolas, Monaco, monospace',
                    color: '#38bdf8', wordBreak: 'break-all', userSelect: 'all', fontWeight: '700',
                    display: 'flex', alignItems: 'center'
                  }}>
                    {isMasked ? (modalKey ? '•'.repeat(Math.min(modalKey.length, 36)) : '••••••••••••••••••••••••••••••••••••') : (modalKey || 'No key generated')}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      padding: '0 20px', background: '#0284c7', color: '#ffffff', border: 'none',
                      borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                      display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className={`fas ${copiedKey ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    <i className="fas fa-lock" style={{ marginRight: '4px', color: '#10b981' }}></i>
                    Keep this key private in your backend environment.
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                    <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
                  </button>
                </div>
              </div>

              {/* Integration Snippet Tabs */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                  ⚡ Quick Integration (1-Minute Setup)
                </div>

                {/* Tabs switcher */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                  {[
                    { id: 'express', label: 'Node.js / Express', icon: 'fa-node-js' },
                    { id: 'wordpress', label: 'WordPress Plugin', icon: 'fa-wordpress' },
                    { id: 'env', label: '.env / Config', icon: 'fa-file-code' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalTab(tab.id)}
                      style={{
                        flex: 1, padding: '8px 12px', border: 'none', borderRadius: '7px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        background: modalTab === tab.id ? '#ffffff' : 'transparent',
                        color: modalTab === tab.id ? '#0f172a' : '#64748b',
                        boxShadow: modalTab === tab.id ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <i className={`fab ${tab.icon} ${modalTab === tab.id ? 'text-blue-500' : ''}`}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab 1: Express / Node */}
                {modalTab === 'express' && (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <pre style={{
                        margin: 0, background: '#090d16', color: '#cbd5e1', padding: '16px 18px',
                        borderRadius: '10px', fontSize: '12px', fontFamily: 'Consolas, Monaco, monospace',
                        lineHeight: '1.5', overflowX: 'auto', maxHeight: '240px'
                      }}>
                        {expressSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(expressSnippet)}
                        style={{
                          position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.15)',
                          border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                          fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        <i className={`fas ${copiedSnippet ? 'fa-check text-green-400' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                        {copiedSnippet ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: WordPress */}
                {modalTab === 'wordpress' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: '1.8' }}>
                      <li>Download the official <strong>MDefender Pro WordPress Plugin</strong> (.zip).</li>
                      <li>In your WP Dashboard, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>.</li>
                      <li>Activate the plugin and paste your <strong>Site Token / API Key</strong>:
                        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', margin: '6px 0', wordBreak: 'break-all' }}>
                          {modalKey || 'API_KEY_HERE'}
                        </div>
                      </li>
                      <li>Set API Endpoint to: <code style={{ fontWeight: '700' }}>{apiEndpoint}</code></li>
                    </ol>
                    <div style={{ marginTop: '14px' }}>
                      <a
                        href="/api/v1/wordpress/download"
                        download="mdefender-pro.zip"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                          background: '#10b981', color: '#ffffff', borderRadius: '8px', fontSize: '12.5px',
                          fontWeight: '700', textDecoration: 'none'
                        }}
                      >
                        <i className="fas fa-download"></i> Download mdefender-pro.zip
                      </a>
                    </div>
                  </div>
                )}

                {/* Tab 3: .env */}
                {modalTab === 'env' && (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <pre style={{
                        margin: 0, background: '#090d16', color: '#38bdf8', padding: '16px 18px',
                        borderRadius: '10px', fontSize: '12.5px', fontFamily: 'Consolas, Monaco, monospace',
                        lineHeight: '1.6', overflowX: 'auto'
                      }}>
                        {envSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(envSnippet)}
                        style={{
                          position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.15)',
                          border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                          fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        <i className={`fas ${copiedSnippet ? 'fa-check text-green-400' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                        {copiedSnippet ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ background: '#f8fafc', padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '17px', borderBottomRightRadius: '17px' }}>
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn-primary"
                style={{ height: '38px', padding: '0 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
