import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'

import copyToClipboard from '../utils/clipboard'

export default function UserConnect() {
  const cachedData = userStore.get('connect') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [copiedId, setCopiedId] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
      userStore.set('connect', result)
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

  const websites = data?.websites || []

  const copyCode = async (id) => {
    const el = document.getElementById(id)
    if (el) {
      const text = el.innerText || el.textContent
      const ok = await copyToClipboard(text)
      if (ok) {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    }
  }

  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  return (
    <div className="connect-wrapper">
      <div className="connect-hero">
        <div className="hero-icon"><i className="fas fa-link"></i></div>
        <h2>Connect Your Website to MDefender</h2>
        <p>Protect your website from SQL injection, XSS, and other attacks in minutes. Follow the steps below to integrate MDefender with your application.</p>
      </div>

      <div className="flow-diagram">
        <div className="flow-step"><div className="flow-node visitor"><i className="fas fa-user"></i><span>Visitor</span></div></div>
        <div className="flow-arrow"><i className="fas fa-arrow-right"></i></div>
        <div className="flow-step"><div className="flow-node server"><i className="fas fa-server"></i><span>Your Server</span></div></div>
        <div className="flow-arrow"><i className="fas fa-arrow-right"></i></div>
        <div className="flow-step"><div className="flow-node waf"><i className="fas fa-shield-halved"></i><span>WAF Engine</span></div></div>
        <div className="flow-arrow"><i className="fas fa-arrow-right"></i></div>
        <div className="flow-step">
          <div className="flow-node decision">
            <div className="decision-branch">
              <div className="branch-allow"><i className="fas fa-check"></i> Allow</div>
              <div className="branch-block"><i className="fas fa-ban"></i> Block</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Get Your API Key */}
      <div className="quick-actions-card" style={{ marginBottom: '18px', animationDelay: '0.1s' }}>
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <h3><i className="fas fa-key" style={{ color: '#a78bfa', marginRight: '6px' }}></i> Step 1: Get Your API Key</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6 }}>
          Your API key is managed in Settings. Copy it from there and use it in the code examples below.
        </p>
        <Link to="/user/settings" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          textDecoration: 'none', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}>
          <i className="fas fa-cog"></i> Go to Settings &amp; Copy API Key
        </Link>
      </div>

      {/* Step 2: Your Websites */}
      <div className="quick-actions-card" style={{ marginBottom: '18px', animationDelay: '0.15s' }}>
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <h3><i className="fas fa-globe" style={{ color: '#10b981', marginRight: '6px' }}></i> Step 2: Registered Websites</h3>
          <Link to="/user/websites" className="view-all">Manage <i className="fas fa-arrow-right"></i></Link>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6 }}>
          Make sure your website domain is registered. The WAF uses this to identify your traffic.
        </p>
        {websites.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {websites.map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              }}>
                <i className="fas fa-globe" style={{ color: '#10b981', fontSize: '13px' }}></i>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{w.domain || w.url || w}</span>
                <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: '#ecfdf5', color: '#10b981' }}>
                  {w.status || 'active'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px', fontSize: '13px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
            <i className="fas fa-globe" style={{ fontSize: '20px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
            No websites added yet
            <Link to="/user/websites" style={{ display: 'block', marginTop: '8px', color: '#2563eb', fontWeight: '500', fontSize: '12px' }}>Add your first website</Link>
          </div>
        )}
      </div>

      {/* Step 3: Connect Your WordPress Website */}
      <div className="methods-grid" style={{ marginBottom: '18px' }}>
        <div className="method-card" style={{ gridColumn: '1 / -1' }}>
          <div className="method-header">
            <div className="method-icon"><i className="fab fa-wordpress" style={{ color: '#2563eb' }}></i></div>
            <div><h3>Official WordPress Plugin</h3><p>Complete Hybrid WAF & Malware Scanner for WordPress</p></div>
            <span className="method-badge recommended">WordPress Native</span>
          </div>
          <div className="method-body">
            <div className="method-steps">
              <div className="method-step"><span className="ms-num">1</span><div><strong>Download Plugin</strong><p>Download the official <code>mdefender-pro.zip</code> package.</p></div></div>
              <div className="method-step"><span className="ms-num">2</span><div><strong>Upload &amp; Activate</strong><p>Go to WordPress Admin &rarr; Plugins &rarr; Add New &rarr; Upload.</p></div></div>
              <div className="method-step"><span className="ms-num">3</span><div><strong>Connect API Key</strong><p>Paste your API key into MDefender settings in WP Admin.</p></div></div>
              <div className="method-step"><span className="ms-num">4</span><div><strong>Instant Protection</strong><p>Live ML attack blocking, login defense & scans are active.</p></div></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                    <i className="fab fa-wordpress" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                    MDefender Pro for WordPress (v4.1.0)
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Real-time ML WAF protection, brute-force & 2FA defense, and core malware scanning inside your WordPress admin.
                  </p>
                </div>
                <a
                  href={`${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
                  className="download-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)', transition: 'all 0.2s ease'
                  }}
                  download="mdefender-pro.zip"
                >
                  <i className="fas fa-download"></i> Download Plugin (.zip)
                </a>
              </div>

              <div className="code-block" style={{ marginTop: '14px' }}>
                <div className="code-header">
                  <span className="code-lang">Your WordPress API Key</span>
                  <button className={`copy-btn ${copiedId === 'wp-key' ? 'copied' : ''}`} onClick={() => copyCode('wp-key')}>
                    <i className="fas fa-copy"></i> {copiedId === 'wp-key' ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
                <pre><code id="wp-key">{data?.user?.api_key || 'YOUR_API_KEY'}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: API Reference */}
      <div className="api-section">
        <div className="section-header-bar">
          <h3><i className="fas fa-plug"></i> Step 3: API Reference</h3>
          <span className="api-base">Base: <code>http://localhost:8000</code></span>
        </div>
        <div className="api-card">
          <div className="api-top">
            <span className="api-method post">POST</span>
            <code className="api-endpoint">/api/analyze</code>
            <span className="api-desc">Analyze an incoming request for threats</span>
          </div>
          <div className="api-details">
            <div>
              <div className="api-label">Request Headers</div>
              <div className="api-code">Authorization: Bearer your_64_char_api_key_here{'\n'}Content-Type: application/json</div>
            </div>
            <div>
              <div className="api-label">Request Body</div>
              <div className="api-code">{'{'}{'\n'}  <span className="key">"domain"</span>: <span className="str">"{websites[0]?.domain || 'yourdomain.com'}"</span>,{'\n'}  <span className="key">"request"</span>: {'{'}{'\n'}    <span className="key">"url"</span>: <span className="str">"/page"</span>,{'\n'}    <span className="key">"method"</span>: <span className="str">"GET"</span>,{'\n'}    <span className="key">"headers"</span>: {'{}'},{'\n'}    <span className="key">"body"</span>: <span className="str">""</span>,{'\n'}    <span className="key">"query_params"</span>: {'{}'},{'\n'}    <span className="key">"ip"</span>: <span className="str">"visitor_ip"</span>{'\n'}  {'}'}{'\n'}{'}'}</div>
            </div>
            <div>
              <div className="api-label">Response (Allowed)</div>
              <div className="api-code">{'{ "status": "allowed" }'}</div>
            </div>
            <div>
              <div className="api-label">Response (Blocked)</div>
              <div className="api-code">{'{ "status": "blocked", "attack_type": "SQL Injection", "block_page": "<html>..." }'}</div>
            </div>
          </div>
        </div>
        <div className="api-grid">
          <div className="api-mini"><span className="api-method get">GET</span><code>/api/stats</code><p>Get real-time WAF statistics</p></div>
          <div className="api-mini"><span className="api-method post">POST</span><code>/api/block</code><p>Manually block an IP address</p></div>
          <div className="api-mini"><span className="api-method get">GET</span><code>/api/logs</code><p>Retrieve attack logs with timestamps</p></div>
        </div>
      </div>
    </div>
  )
}
