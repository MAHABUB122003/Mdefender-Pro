import { useState, useEffect } from 'react'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'

export default function Connect({ token }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    api.getClients().then(d => setClients(d.clients || [])).finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="connect-wrapper">
      <div className="connect-hero">
        <div className="hero-icon"><i className="fab fa-wordpress"></i></div>
        <h2>Connect Your WordPress Website</h2>
        <p>Protect your WordPress website with MDefender Pro Hybrid Cloud WAF, AI threat detection, login defense, and malware scanning.</p>
      </div>

      <div className="flow-diagram">
        <div className="flow-step"><div className="flow-node visitor"><i className="fas fa-user"></i><span>Visitor</span></div></div>
        <div className="flow-arrow"><i className="fas fa-arrow-right"></i></div>
        <div className="flow-step"><div className="flow-node server"><i className="fab fa-wordpress"></i><span>WordPress</span></div></div>
        <div className="flow-arrow"><i className="fas fa-arrow-right"></i></div>
        <div className="flow-step"><div className="flow-node waf"><i className="fas fa-shield-halved"></i><span>MDefender ML Cloud</span></div></div>
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

      <div className="methods-grid">
        <div className="method-card" style={{ gridColumn: '1 / -1' }}>
          <div className="method-header">
            <div className="method-icon"><i className="fab fa-wordpress" style={{ color: '#2563eb' }}></i></div>
            <div><h3>Official WordPress Plugin</h3><p>Fast and seamless native integration</p></div>
            <span className="method-badge recommended">WordPress Native</span>
          </div>
          <div className="method-body">
            <div className="method-steps">
              <div className="method-step"><span className="ms-num">1</span><div><strong>Download Plugin</strong><p>Get the official <code>mdefender-pro.zip</code> package.</p></div></div>
              <div className="method-step"><span className="ms-num">2</span><div><strong>Upload &amp; Activate</strong><p>Upload to WordPress Admin &rarr; Plugins &rarr; Add New.</p></div></div>
              <div className="method-step"><span className="ms-num">3</span><div><strong>Connect API Key</strong><p>Paste your API key into MDefender Settings inside WordPress.</p></div></div>
              <div className="method-step"><span className="ms-num">4</span><div><strong>Active Protection</strong><p>Local rules + Cloud ML live blocking is active.</p></div></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                    <i className="fab fa-wordpress" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                    MDefender Pro for WordPress (v4.1.0)
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hybrid WAF, 2FA brute force defense, and deep filesystem malware scanner for WordPress.
                  </p>
                </div>
                <a
                  href={`${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
                  className="download-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                  }}
                  download="mdefender-pro.zip"
                >
                  <i className="fas fa-download"></i> Download Plugin (.zip)
                </a>
              </div>

              <div className="code-block" style={{ marginTop: '14px' }}>
                <div className="code-header">
                  <span className="code-lang">First Client API Key</span>
                  <button className={`copy-btn ${copiedId === 'client-key' ? 'copied' : ''}`} onClick={() => copyCode('client-key')}>
                    <i className="fas fa-copy"></i> {copiedId === 'client-key' ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
                <pre><code id="client-key">{clients[0]?.api_key || 'YOUR_API_KEY'}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="api-section">
        <div className="section-header-bar">
          <h3><i className="fas fa-plug"></i> API Reference</h3>
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
              <div className="api-code">Authorization: Bearer YOUR_API_KEY{'\n'}Content-Type: application/json</div>
            </div>
            <div>
              <div className="api-label">Request Body</div>
              <div className="api-code">{'{'}{'\n'}  <span className="key">"domain"</span>: <span className="str">"yourdomain.com"</span>,{'\n'}  <span className="key">"request"</span>: {'{'}{'\n'}    <span className="key">"url"</span>: <span className="str">"/page"</span>,{'\n'}    <span className="key">"method"</span>: <span className="str">"GET"</span>,{'\n'}    <span className="key">"headers"</span>: {'{}'},{'\n'}    <span className="key">"body"</span>: <span className="str">""</span>,{'\n'}    <span className="key">"query_params"</span>: {'{}'},{'\n'}    <span className="key">"ip"</span>: <span className="str">"visitor_ip"</span>{'\n'}  {'}'}{'\n'}{'}'}</div>
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
