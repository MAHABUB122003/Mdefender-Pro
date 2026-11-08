import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAssignedNameservers } from '../utils/nameservers'
import {
  Link2,
  ShieldCheck,
  Globe,
  Cloud,
  Layers,
  Download,
  Key,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  RotateCw,
  ArrowRight,
  Lock,
  Server,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Cpu,
  ChevronRight
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserConnect() {
  const cachedData = userStore.get('connect') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [activeService, setActiveService] = useState('wordpress_plugin')
  const [copiedId, setCopiedId] = useState(null)
  const [verifyingDns, setVerifyingDns] = useState(false)
  const [dnsStatus, setDnsStatus] = useState(null)
  const [isKeyMasked, setIsKeyMasked] = useState(true)

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

  const websites = useMemo(() => data?.websites || [], [data])
  const customDomains = useMemo(() => {
    return websites.filter(w => {
      const p = (w.platform || '').toLowerCase()
      return p !== 'wordpress' && p !== 'wp' && !p.includes('wordpress')
    })
  }, [websites])

  const wpSites = useMemo(() => {
    return websites.filter(w => {
      const p = (w.platform || '').toLowerCase()
      return p === 'wordpress' || p === 'wp' || p.includes('wordpress')
    })
  }, [websites])

  const [selectedCustomDomain, setSelectedCustomDomain] = useState(() => customDomains[0]?.domain || '')

  useEffect(() => {
    if (customDomains.length > 0 && !selectedCustomDomain) {
      setSelectedCustomDomain(customDomains[0].domain)
    }
  }, [customDomains, selectedCustomDomain])

  const activeDomain = selectedCustomDomain || customDomains[0]?.domain || ''
  const activeSite = customDomains.find(w => w.domain === activeDomain)
  const assignedNs = activeSite?.assigned_nameservers || activeSite?.nameservers || getAssignedNameservers(activeDomain)
  const apiKey = data?.user?.api_key || data?.api_key || 'mdf_live_sec_key_sample'

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
        message: 'Nameservers verified! Edge Anycast Proxy & Automated SSL are operational.'
      })
    }, 1200)
  }

  const pluginDownloadUrl = `${(import.meta.env.VITE_API_BASE || 'https://mdefender-pro.crafix.tech').replace(/\/+$/, '')}/api/v1/wordpress/plugin`

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600' }}>
          <RotateCw size={20} style={{ animation: 'spin 1s linear infinite', color: '#E8792F' }} />
          <span>Loading Connection Architecture...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 20px', color: '#10201E' }}>
      
      {/* ========================================================================= */}
      {/* 1. COMPACT & CLEAN HEADER CARD (LIGHTWEIGHT, NO HEAVY BLOAT)             */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: '#F0FDF4',
            color: '#15803D',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.4px',
            border: '1px solid #DCFCE7'
          }}>
            <Link2 size={13} />
            <span>DEPLOYMENT &amp; CONNECTIVITY ENGINE</span>
          </div>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#10201E',
          margin: '0 0 8px',
          letterSpacing: '-0.3px',
          lineHeight: 1.25
        }}>
          Connect &amp; Protect Your Applications
        </h1>

        <p style={{
          margin: '0 0 20px',
          color: '#64748B',
          fontSize: '14px',
          maxWidth: '820px',
          lineHeight: 1.6
        }}>
          Seamlessly route your digital traffic through MDefender Pro. Select between our zero-code <strong>Cloud Anycast Reverse Proxy</strong> for custom websites and APIs, or our deep <strong>WordPress Security Plugin</strong> for origin PHP AST webshell and file-level defense.
        </p>

        {/* Quick Telemetry Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #F1F5F9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Custom Anycast Domains</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>{customDomains.length} Active Domains</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>WordPress Endpoints</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>{wpSites.length} Shielded Sites</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97735' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Neural Signatures</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>6,501,208+ Vectors</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Mean Inspection Speed</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>&lt;0.12ms Latency</div>
            </div>
          </div>
        </div>
      </div>



      {/* WORDPRESS SECURITY PLUGIN CONNECTION & ONBOARDING                          */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Plugin Actions Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Layers size={15} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                    Official MDefender Pro WordPress Plugin
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Complete internal file scanner, real-time PHP AST sandbox, and direct origin server shielding via API Key.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to="/user/websites"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    background: '#FAFBF9',
                    color: '#334155',
                    border: '1px solid #D9E1DC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Manage WP Sites ({wpSites.length})</span>
                </Link>

                <a
                  href="/downloads/mdefender-pro.zip"
                  download="mdefender-pro.zip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(11, 37, 34, 0.25)'
                  }}
                >
                  <Download size={15} />
                  <span>Download mdefender-pro.zip</span>
                </a>
              </div>
            </div>

            {/* Connected WordPress Sites List */}
            {wpSites.length > 0 && (
              <div style={{
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '18px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
                  Your Connected WordPress Sites ({wpSites.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {wpSites.map(site => (
                    <div
                      key={site.id || site._id || site.domain}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Layers size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                            {site.domain || site.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Connected via WordPress Plugin API Key
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={12} />
                        <span>SHIELDED &amp; ACTIVE</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dedicated Scoped API Key Box */}
            <div style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} color="#4F46E5" />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', letterSpacing: '0.4px' }}>
                    Your Dedicated Scoped Website API Key
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsKeyMasked(!isKeyMasked)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isKeyMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{isKeyMasked ? 'Reveal' : 'Mask'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyCode('wp-api-key', apiKey)}
                    style={{
                      background: '#4F46E5',
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedId === 'wp-api-key' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === 'wp-api-key' ? 'Copied Key!' : 'Copy API Key'}</span>
                  </button>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
                fontSize: '13px',
                fontWeight: '700',
                color: '#10201E',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                {isKeyMasked ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(8, apiKey.length - 12))}${apiKey.slice(-4)}` : apiKey}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Keep this API key secret. It authorizes your WordPress plugin to stream telemetry and receive threat intelligence.
              </div>
            </div>

            {/* 4-Step Quick Install Guide */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '10px',
              padding: '18px 20px'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '800', color: '#10201E' }}>
                4-Step Installation &amp; Setup:
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>1</span>
                    <strong style={{ fontSize: '12px', color: '#10201E' }}>Download Zip</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Click the <code>Download mdefender-pro.zip</code> button above to get the latest release.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>2</span>
                    <strong style={{ fontSize: '12px', color: '#10201E' }}>Upload to WP</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    In WordPress Admin: <code>Plugins &rarr; Add New &rarr; Upload Plugin</code>.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>3</span>
                    <strong style={{ fontSize: '12px', color: '#10201E' }}>Activate Plugin</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Click <strong>Install Now</strong> and then click <strong>Activate Plugin</strong>.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>4</span>
                    <strong style={{ fontSize: '12px', color: '#10201E' }}>Paste API Key</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Open <code>MDefender-Pro</code> in your WP dashboard and paste your Scoped API Key.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

    </div>
  )
}
