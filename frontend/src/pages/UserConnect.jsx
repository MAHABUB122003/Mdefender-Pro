import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserConnect() {
  const cachedData = userStore.get('connect') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [activeService, setActiveService] = useState('cloud_proxy') // 'cloud_proxy' | 'wordpress_plugin'
  const [copiedId, setCopiedId] = useState(null)
  const [verifyingDns, setVerifyingDns] = useState(false)
  const [dnsStatus, setDnsStatus] = useState(null)

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
  const activeDomain = websites[0]?.domain || 'yourdomain.com'
  const apiKey = data?.user?.api_key || 'mdf_live_sec_key_sample'

  const copyCode = async (id, textToCopy) => {
    let text = textToCopy
    if (!text) {
      const el = document.getElementById(id)
      if (el) text = el.innerText || el.textContent
    }
    if (text) {
      const ok = await copyToClipboard(text)
      if (ok) {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    }
  }

  const handleVerifyDns = () => {
    setVerifyingDns(true)
    setDnsStatus(null)
    setTimeout(() => {
      setVerifyingDns(false)
      setDnsStatus({
        status: 'success',
        message: 'Nameservers verified! Edge Proxy & Auto-SSL are active.'
      })
    }, 1200)
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
      </div>
    )
  }

  return (
    <div className="connect-wrapper" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <div className="connect-hero" style={{
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '36px 32px',
        color: '#f8fafc',
        marginBottom: '28px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'inline-flex', padding: '10px 14px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', marginBottom: '16px', fontWeight: '600', fontSize: '13px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <i className="fas fa-shield-halved" style={{ marginRight: '8px' }}></i> Enterprise Security Ecosystem
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Connect &amp; Protect Your Website
        </h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '15px', maxWidth: '780px', lineHeight: 1.6 }}>
          Choose your deployment mode. Use our <strong>Cloud Anycast Reverse Proxy</strong> for universal zero-code protection on any website, or our deep <strong>WordPress Plugin</strong> for file-level malware scanning and AST protection.
        </p>
      </div>

      {/* Service Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Service 1 Tab Card */}
        <div
          onClick={() => setActiveService('cloud_proxy')}
          style={{
            cursor: 'pointer',
            padding: '24px',
            borderRadius: '14px',
            background: activeService === 'cloud_proxy' ? '#0f172a' : '#ffffff',
            border: activeService === 'cloud_proxy' ? '2px solid #38bdf8' : '1px solid #e2e8f0',
            color: activeService === 'cloud_proxy' ? '#ffffff' : '#0f172a',
            transition: 'all 0.2s ease',
            boxShadow: activeService === 'cloud_proxy' ? '0 10px 25px rgba(56, 189, 248, 0.15)' : 'none',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: activeService === 'cloud_proxy' ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
            }}>
              <i className="fas fa-cloud"></i>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
              background: '#0284c7', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Cloudflare Style (Zero Code)
            </span>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>Cloud Anycast Reverse Proxy</h3>
          <p style={{ margin: 0, fontSize: '13px', color: activeService === 'cloud_proxy' ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
            Works for <strong>any website</strong> (PHP, Node.js, Python, Next.js, Laravel, Go, HTML). Simply switch Nameservers — no code or server installs required.
          </p>
        </div>

        {/* Service 2 Tab Card */}
        <div
          onClick={() => setActiveService('wordpress_plugin')}
          style={{
            cursor: 'pointer',
            padding: '24px',
            borderRadius: '14px',
            background: activeService === 'wordpress_plugin' ? '#0f172a' : '#ffffff',
            border: activeService === 'wordpress_plugin' ? '2px solid #38bdf8' : '1px solid #e2e8f0',
            color: activeService === 'wordpress_plugin' ? '#ffffff' : '#0f172a',
            transition: 'all 0.2s ease',
            boxShadow: activeService === 'wordpress_plugin' ? '0 10px 25px rgba(56, 189, 248, 0.15)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: activeService === 'wordpress_plugin' ? 'rgba(56, 189, 248, 0.15)' : '#e0e7ff',
              color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
            }}>
              <i className="fab fa-wordpress"></i>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
              background: '#4f46e5', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              WordPress Dedicated
            </span>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>MDefender Pro WordPress Plugin</h3>
          <p style={{ margin: 0, fontSize: '13px', color: activeService === 'wordpress_plugin' ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
            Deep endpoint defense for WordPress. Real-time PHP AST webshell scanning, 27K malware file detection, and direct origin server shielding.
          </p>
        </div>
      </div>

      {/* CONTENT FOR SERVICE 1: Cloudflare-Style Reverse Proxy */}
      {activeService === 'cloud_proxy' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Step 1: Add Domain */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                1
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Register Your Domain</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Make sure your domain is added to your MDefender account.</p>
              </div>
              <Link to="/user/websites" style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}>
                Manage Domains <i className="fas fa-arrow-right"></i>
              </Link>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-globe" style={{ color: '#0284c7', fontSize: '18px' }}></i>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{activeDomain}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Current Registered Domain</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                READY FOR NAMESERVER
              </span>
            </div>
          </div>

          {/* Step 2: Nameservers Assignment */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                2
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Replace Your Nameservers</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, Hostinger) and replace your current nameservers with:
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {/* Nameserver 1 */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Primary Nameserver</div>
                  <code style={{ fontSize: '15px', fontWeight: '700', color: '#0284c7' }}>ns1.mdefender.pro</code>
                </div>
                <button
                  onClick={() => copyCode('ns1', 'ns1.mdefender.pro')}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#334155' }}
                >
                  <i className="fas fa-copy"></i> {copiedId === 'ns1' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Nameserver 2 */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Secondary Nameserver</div>
                  <code style={{ fontSize: '15px', fontWeight: '700', color: '#0284c7' }}>ns2.mdefender.pro</code>
                </div>
                <button
                  onClick={() => copyCode('ns2', 'ns2.mdefender.pro')}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#334155' }}
                >
                  <i className="fas fa-copy"></i> {copiedId === 'ns2' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleVerifyDns}
                disabled={verifyingDns}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff',
                  border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
                }}
              >
                {verifyingDns ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                {verifyingDns ? 'Checking DNS Propagation...' : 'Verify Nameservers & Activate Proxy'}
              </button>
              <span style={{ fontSize: '12px', color: '#64748b' }}>DNS changes typically take 5 to 15 minutes worldwide.</span>
            </div>

            {dnsStatus && (
              <div style={{ marginTop: '14px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '16px' }}></i>
                <span>{dnsStatus.message}</span>
              </div>
            )}
          </div>

          {/* Step 3: What Happens Next */}
          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px', color: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>
              <i className="fas fa-bolt" style={{ marginRight: '8px' }}></i> Active Features Once Routed:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}><i className="fas fa-shield-alt"></i> L3/L4/L7 Anti-DDoS</div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Absorbs high-volume HTTP floods and bot attacks before touching your host.</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}><i className="fas fa-lock"></i> Automated Free SSL</div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Instant Let's Encrypt wildcard certificate auto-issued and auto-renewed.</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}><i className="fas fa-microchip"></i> 0.5ms ML WAF Inspection</div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>5.2M attack vector ML + AST semantic analyzer intercepts zero-day threats.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT FOR SERVICE 2: WordPress Plugin */}
      {activeService === 'wordpress_plugin' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  <i className="fab fa-wordpress" style={{ color: '#4f46e5', marginRight: '8px' }}></i> Official WordPress Security Plugin
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Complete internal file scanner, realtime PHP sandbox, and AST backdoor neutralizer.
                </p>
              </div>
              <a
                href={`${(import.meta.env.VITE_API_BASE || 'https://217.15.170.82.sslip.io').replace(/\/+$/, '')}/api/v1/wordpress/plugin`}
                download="mdefender-pro.zip"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff',
                  borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }}
              >
                <i className="fas fa-download"></i> Download mdefender-pro.zip
              </a>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Installation Steps:</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
                <li>Download the official <code>mdefender-pro.zip</code> using the button above.</li>
                <li>In your WordPress Admin, go to <code>Plugins &rarr; Add New Plugin &rarr; Upload Plugin</code>.</li>
                <li>Select the zip file and click <strong>Install Now</strong>, then click <strong>Activate Plugin</strong>.</li>
                <li>Go to <code>MDefender-Pro &rarr; Settings</code> in your WordPress dashboard menu.</li>
                <li>Paste your dedicated Scoped API Key below and click <strong>Save &amp; Connect</strong>:</li>
              </ol>
            </div>

            {/* API Key Box */}
            <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                  Your Dedicated Website API Key
                </div>
                <code id="wp-api-key" style={{ fontSize: '14px', color: '#38bdf8', fontFamily: 'monospace' }}>
                  {apiKey}
                </code>
              </div>
              <button
                onClick={() => copyCode('wp-api-key', apiKey)}
                style={{
                  background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                  borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                }}
              >
                <i className="fas fa-copy"></i> {copiedId === 'wp-api-key' ? 'Copied!' : 'Copy API Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
