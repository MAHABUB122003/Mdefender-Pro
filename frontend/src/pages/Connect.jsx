import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Connect({ token }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('nodejs')
  const [activeSubTab, setActiveSubTab] = useState('flask')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    api.getClients().then(d => setClients(d.clients || [])).finally(() => setLoading(false))
  }, [])

  const copyCode = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const text = el.innerText || el.textContent
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="connect-wrapper">
      <div className="connect-hero">
        <div className="hero-icon"><i className="fas fa-shield-halved"></i></div>
        <h2>Connect Your Website to MDefender Pro</h2>
        <p>Protect your website from SQL injection, XSS, and other attacks in minutes. Choose the integration method that fits your stack.</p>
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

      <div className="methods-grid">
        <div className="method-card">
          <div className="method-header">
            <div className="method-icon"><i className="fas fa-code"></i></div>
            <div><h3>Client Library</h3><p>Lightweight middleware for your app</p></div>
            <span className="method-badge recommended">Recommended</span>
          </div>
          <div className="method-body">
            <div className="method-steps">
              <div className="method-step"><span className="ms-num">1</span><div><strong>Register your website</strong><p>Go to Clients and add your domain with origin server IP.</p></div></div>
              <div className="method-step"><span className="ms-num">2</span><div><strong>Copy your API key</strong><p>Each site gets a unique key. Copy it from the clients list.</p></div></div>
              <div className="method-step"><span className="ms-num">3</span><div><strong>Add the middleware</strong><p>Install the client library and add one line to your app.</p></div></div>
              <div className="method-step"><span className="ms-num">4</span><div><strong>You're protected</strong><p>All requests are analyzed in real-time.</p></div></div>
            </div>
            <div className="code-tabs">
              <div className="tab-buttons">
                <button className={`tab-btn ${activeTab === 'nodejs' ? 'active' : ''}`} onClick={() => setActiveTab('nodejs')}><i className="fab fa-node-js"></i> Node.js</button>
                <button className={`tab-btn ${activeTab === 'python' ? 'active' : ''}`} onClick={() => setActiveTab('python')}><i className="fab fa-python"></i> Python</button>
                <button className={`tab-btn ${activeTab === 'php' ? 'active' : ''}`} onClick={() => setActiveTab('php')}><i className="fab fa-php"></i> PHP</button>
              </div>
              <div className={`tab-content ${activeTab === 'nodejs' ? 'active' : ''}`}>
                <div className="code-block">
                  <div className="code-header"><span className="code-lang">JavaScript (Express)</span><button className={`copy-btn ${copiedId === 'nodejs-code' ? 'copied' : ''}`} onClick={() => copyCode('nodejs-code')}><i className="fas fa-copy"></i> {copiedId === 'nodejs-code' ? 'Copied!' : 'Copy'}</button></div>
                  <pre><code id="nodejs-code"><span className="cmt">// 1. Install official package (includes bundled Cyber 403 Block Page)</span>{'\n'}<span className="cmt">// npm install mdefender-pro</span>{'\n\n'}<span className="kw">const</span> express = <span className="fn">require</span>(<span className="str">'express'</span>);{'\n'}<span className="kw">const</span> mdefender = <span className="fn">require</span>(<span className="str">'mdefender-pro'</span>);{'\n\n'}<span className="kw">const</span> app = <span className="fn">express</span>();{'\n'}app.<span className="fn">use</span>(express.<span className="fn">json</span>());{'\n\n'}<span className="cmt">// 2. Attach WAF middleware before your routes</span>{'\n'}<span className="cmt">// Automatically loads mdefender.config.js or configure inline:</span>{'\n'}app.<span className="fn">use</span>(<span className="fn">mdefender</span>({'\n'}  <span className="key">apiKey</span>: <span className="str">'{clients[0]?.api_key || 'YOUR_API_KEY'}'</span>,{'\n'}  <span className="key">domain</span>: <span className="str">'{clients[0]?.domain || 'yourdomain.com'}'</span>,{'\n'}  <span className="key">apiEndpoint</span>: <span className="str">'http://localhost:8000'</span>{'\n'}));</code></pre>
                </div>
              </div>
              <div className={`tab-content ${activeTab === 'python' ? 'active' : ''}`}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: 0 }}>
                  <button className={`sub-tab ${activeSubTab === 'flask' ? 'active' : ''}`} onClick={() => setActiveSubTab('flask')}>Flask</button>
                  <button className={`sub-tab ${activeSubTab === 'django' ? 'active' : ''}`} onClick={() => setActiveSubTab('django')}>Django</button>
                </div>
                {activeSubTab === 'flask' ? (
                  <div className="code-block">
                    <div className="code-header"><span className="code-lang">Python / Flask</span><button className={`copy-btn ${copiedId === 'flask-code' ? 'copied' : ''}`} onClick={() => copyCode('flask-code')}><i className="fas fa-copy"></i> {copiedId === 'flask-code' ? 'Copied!' : 'Copy'}</button></div>
                    <pre><code id="flask-code"><span className="kw">from</span> client.python.waf <span className="kw">import</span> waf_middleware{'\n\n'}<span className="cmt"># Wrap your Flask app</span>{'\n'}app.wsgi_app = <span className="fn">waf_middleware</span>({'\n'}  app.wsgi_app,{'\n'}  <span className="key">api_key</span>=<span className="str">'YOUR_API_KEY'</span>,{'\n'}  <span className="key">server</span>=<span className="str">'http://localhost:8000'</span>{'\n'})</code></pre>
                  </div>
                ) : (
                  <div className="code-block">
                    <div className="code-header"><span className="code-lang">Python / Django</span><button className={`copy-btn ${copiedId === 'django-code' ? 'copied' : ''}`} onClick={() => copyCode('django-code')}><i className="fas fa-copy"></i> {copiedId === 'django-code' ? 'Copied!' : 'Copy'}</button></div>
                    <pre><code id="django-code"><span className="cmt"># settings.py</span>{'\n'}WAF_API_KEY = <span className="str">'YOUR_API_KEY'</span>{'\n'}WAF_SERVER = <span className="str">'http://localhost:8000'</span>{'\n\n'}MIDDLEWARE = [{'\n'}  <span className="str">'client.python.waf.DjangoWAFMiddleware'</span>,  <span className="cmt"># Add at top</span>{'\n'}  <span className="cmt"># ... your other middleware</span>{'\n'}]</code></pre>
                  </div>
                )}
              </div>
              <div className={`tab-content ${activeTab === 'php' ? 'active' : ''}`}>
                <div className="code-block">
                  <div className="code-header"><span className="code-lang">PHP</span><button className={`copy-btn ${copiedId === 'php-code' ? 'copied' : ''}`} onClick={() => copyCode('php-code')}><i className="fas fa-copy"></i> {copiedId === 'php-code' ? 'Copied!' : 'Copy'}</button></div>
                  <pre><code id="php-code"><span className="kw">&lt;?php</span>{'\n'}<span className="fn">require_once</span> <span className="str">'client/php/waf.php'</span>;{'\n\n'}$waf = <span className="kw">new</span> <span className="fn">SecureWAF</span>(<span className="str">'YOUR_API_KEY'</span>);{'\n'}$waf-&gt;<span className="fn">protect</span>();  <span className="cmt">// Add at top of your PHP file</span></code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="method-card">
          <div className="method-header">
            <div className="method-icon proxy"><i className="fas fa-network-wired"></i></div>
            <div><h3>Reverse Proxy</h3><p>Zero-code: WAF sits in front of your app</p></div>
            <span className="method-badge proxy-badge">Zero Config</span>
          </div>
          <div className="method-body">
            <div className="method-steps">
              <div className="method-step"><span className="ms-num proxy-num">1</span><div><strong>Edit config.json</strong><p>Set your backend URL and website name in the config file.</p></div></div>
              <div className="method-step"><span className="ms-num proxy-num">2</span><div><strong>Start the proxy</strong><p>Run <code>waf_proxy.py</code> — it sits between visitors and your app.</p></div></div>
              <div className="method-step"><span className="ms-num proxy-num">3</span><div><strong>Point your domain</strong><p>Update DNS or nginx to route traffic through the WAF proxy port.</p></div></div>
            </div>
            <div className="code-block">
              <div className="code-header"><span className="code-lang">config.json</span><button className={`copy-btn ${copiedId === 'proxy-code' ? 'copied' : ''}`} onClick={() => copyCode('proxy-code')}><i className="fas fa-copy"></i> {copiedId === 'proxy-code' ? 'Copied!' : 'Copy'}</button></div>
              <pre><code id="proxy-code">{'{\n'}  <span className="key">"website_name"</span>: <span className="str">"mywebsite.com"</span>,{'\n'}  <span className="key">"backend_url"</span>: <span className="str">"http://localhost:8000"</span>,{'\n'}  <span className="key">"proxy_port"</span>: <span className="num">3000</span>,{'\n'}  <span className="key">"backend_timeout"</span>: <span className="num">30</span>,{'\n'}  <span className="key">"whitelist_localhost"</span>: <span className="bool">false</span>,{'\n'}  <span className="key">"frontend"</span>: {'{\n'}    <span className="key">"mode"</span>: <span className="str">"static"</span>,{'\n'}    <span className="key">"static_dir"</span>: <span className="str">"../frontend/dist"</span>,{'\n'}    <span className="key">"spa"</span>: <span className="bool">true</span>{'\n'}  {'}'},{'\n'}  <span className="key">"backend_api"</span>: {'{\n'}    <span className="key">"prefix"</span>: <span className="str">"api"</span>,{'\n'}    <span className="key">"forward"</span>: <span className="bool">true</span>{'\n'}  {'}\n'}{'}'}</code></pre>
            </div>
            <div className="proxy-note" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ede9fe', marginTop: '12px', fontSize: '12px', color: '#6d28d9', lineHeight: 1.5 }}>
              <i className="fas fa-info-circle" style={{ marginTop: '2px', flexShrink: 0 }}></i>
              <span>Static files (JS, CSS, images) bypass WAF checks for zero latency. Only dynamic requests are analyzed.</span>
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
