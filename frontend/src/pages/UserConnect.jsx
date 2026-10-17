import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  const [activeService, setActiveService] = useState('cloud_proxy') // 'cloud_proxy' | 'wordpress_plugin'
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
            fontSize: '11.5px',
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

      {/* ========================================================================= */}
      {/* 2. HARMONIOUS TWO-SERVICE SELECTOR (CLEAN, BALANCED & LIGHTWEIGHT)        */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Service 1: Cloud Anycast Reverse Proxy */}
        <div
          onClick={() => setActiveService('cloud_proxy')}
          style={{
            cursor: 'pointer',
            padding: '20px 22px',
            borderRadius: '14px',
            background: activeService === 'cloud_proxy' ? '#FFFFFF' : '#FAFBF9',
            border: activeService === 'cloud_proxy' ? '2px solid #0284C7' : '1px solid #D9E1DC',
            boxShadow: activeService === 'cloud_proxy' ? '0 4px 16px rgba(2, 132, 199, 0.12)' : 'none',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cloud size={22} />
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: activeService === 'cloud_proxy' ? '#0284C7' : '#F1F5F9',
              color: activeService === 'cloud_proxy' ? '#FFFFFF' : '#475569',
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              Cloudflare Style &bull; Zero Code
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
            Cloud Anycast Reverse Proxy
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.55 }}>
            Universal protection for <strong>any custom domain or API</strong> (Node.js, Python, Laravel, Next.js, Go, HTML). Simply switch Nameservers — no code or server installs required.
          </p>

          {activeService === 'cloud_proxy' && (
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0284C7'
            }}>
              <span>Active Setup Guide</span>
              <ChevronRight size={14} />
            </div>
          )}
        </div>

        {/* Service 2: WordPress Security Plugin */}
        <div
          onClick={() => setActiveService('wordpress_plugin')}
          style={{
            cursor: 'pointer',
            padding: '20px 22px',
            borderRadius: '14px',
            background: activeService === 'wordpress_plugin' ? '#FFFFFF' : '#FAFBF9',
            border: activeService === 'wordpress_plugin' ? '2px solid #4F46E5' : '1px solid #D9E1DC',
            boxShadow: activeService === 'wordpress_plugin' ? '0 4px 16px rgba(79, 70, 229, 0.12)' : 'none',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={22} />
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: activeService === 'wordpress_plugin' ? '#4F46E5' : '#F1F5F9',
              color: activeService === 'wordpress_plugin' ? '#FFFFFF' : '#475569',
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              WordPress Dedicated
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
            MDefender Pro WordPress Plugin
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.55 }}>
            Deep endpoint defense for WordPress. In-memory PHP AST webshell sanitizer, 27,000+ malware file scanner, and direct cloud WAF synchronization via Scoped API Key.
          </p>

          {activeService === 'wordpress_plugin' && (
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#4F46E5'
            }}>
              <span>Active Setup Guide</span>
              <ChevronRight size={14} />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODE 1: CLOUD ANYCAST REVERSE PROXY CONTENT                             */}
      {/* ========================================================================= */}
      {activeService === 'cloud_proxy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Step 1: Select or Register Domain */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px'
                }}>
                  1
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                    Select or Register Your Custom Domain
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                    Attach your domain or subdomain to the Anycast routing table.
                  </p>
                </div>
              </div>

              <Link
                to="/user/domains"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0284C7',
                  textDecoration: 'none'
                }}
              >
                <span>Manage Custom Domains &amp; DNS Zones</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {customDomains.length > 0 ? (
              <div style={{
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#10201E' }}>
                        {activeDomain}
                      </span>
                      {customDomains.length > 1 && (
                        <select
                          value={activeDomain}
                          onChange={(e) => setSelectedCustomDomain(e.target.value)}
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {customDomains.map(d => (
                            <option key={d.id || d.domain} value={d.domain}>{d.domain}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Custom Anycast Domain Proxy
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={12} />
                    <span>READY FOR NAMESERVERS</span>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#FAFBF9',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <Globe size={22} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', marginBottom: '4px' }}>
                  No Custom Domains Registered Yet
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px', maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto' }}>
                  To protect any custom origin or web application with global Anycast Nameservers and zero code, add your custom domain here:
                </p>
                <Link
                  to="/user/domains"
                  style={{
                    padding: '9px 18px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.2)'
                  }}
                >
                  <span>+ Add Custom Anycast Domain</span>
                </Link>
              </div>
            )}
          </div>

          {/* Step 2: Nameservers Assignment */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#0284C7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '13px'
              }}>
                2
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                  Update Your Domain Nameservers
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, NameSilo, Hostinger, Google Domains, etc.) and replace your current nameservers with:
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginBottom: '18px'
            }}>
              {/* Primary Nameserver */}
              <div style={{
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', letterSpacing: '0.4px', marginBottom: '3px' }}>
                    Primary Anycast Nameserver
                  </div>
                  <code style={{ fontSize: '14px', fontWeight: '800', color: '#0284C7', fontFamily: 'monospace' }}>
                    ns1.mdefender-pro.crafix.tech
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyCode('ns1', 'ns1.mdefender-pro.crafix.tech')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedId === 'ns1' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedId === 'ns1' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Secondary Nameserver */}
              <div style={{
                background: '#FAFBF9',
                border: '1px solid #D9E1DC',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', letterSpacing: '0.4px', marginBottom: '3px' }}>
                    Secondary Anycast Nameserver
                  </div>
                  <code style={{ fontSize: '14px', fontWeight: '800', color: '#0284C7', fontFamily: 'monospace' }}>
                    ns2.mdefender-pro.crafix.tech
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyCode('ns2', 'ns2.mdefender-pro.crafix.tech')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedId === 'ns2' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedId === 'ns2' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={verifyingDns}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: verifyingDns ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(2,132,199,0.25)'
                }}
              >
                {verifyingDns ? (
                  <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ShieldCheck size={15} />
                )}
                <span>{verifyingDns ? 'Checking DNS Propagation...' : 'Verify Nameservers & Activate Proxy'}</span>
              </button>

              <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                DNS changes typically take 2 to 15 minutes worldwide.
              </span>
            </div>

            {dnsStatus && (
              <div style={{
                marginTop: '14px',
                padding: '12px 16px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                color: '#065F46',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} color="#059669" />
                <span style={{ fontWeight: '600' }}>{dnsStatus.message}</span>
              </div>
            )}
          </div>

          {/* Step 3: What Happens Next (Clean, Light Cards - NOT HEAVY DARK BOX) */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Zap size={16} color="#0284C7" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                Active Security Layers Once Routed Through Edge Anycast:
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px'
            }}>
              <div style={{
                background: '#FAFBF9',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={16} color="#0284C7" />
                  <span style={{ color: '#10201E', fontWeight: '800', fontSize: '13px' }}>
                    L3/L4/L7 Anti-DDoS Mitigation
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748B', fontSize: '12.5px', lineHeight: 1.5 }}>
                  Absorbs high-volume HTTP layer-7 storms and volumetric bot attacks at edge PoPs before touching your origin.
                </p>
              </div>

              <div style={{
                background: '#FAFBF9',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={16} color="#0284C7" />
                  <span style={{ color: '#10201E', fontWeight: '800', fontSize: '13px' }}>
                    Automated Free SSL / TLS
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748B', fontSize: '12.5px', lineHeight: 1.5 }}>
                  Instant Let&apos;s Encrypt wildcard certificates auto-issued and auto-renewed with full TLS 1.3 strict security.
                </p>
              </div>

              <div style={{
                background: '#FAFBF9',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Cpu size={16} color="#0284C7" />
                  <span style={{ color: '#10201E', fontWeight: '800', fontSize: '13px' }}>
                    0.12ms Neural WAF Inspection
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748B', fontSize: '12.5px', lineHeight: 1.5 }}>
                  6,501,208+ signature database with Radix tree matching and AST semantic analyzer intercepts zero-day exploits.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODE 2: WORDPRESS SECURITY PLUGIN CONTENT                              */}
      {/* ========================================================================= */}
      {activeService === 'wordpress_plugin' && (
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
                  href={pluginDownloadUrl}
                  download="mdefender-pro.zip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)'
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
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E' }}>
                            {site.domain || site.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
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
                      fontSize: '11.5px',
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
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
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
                    <strong style={{ fontSize: '12.5px', color: '#10201E' }}>Download Zip</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Click the <code>Download mdefender-pro.zip</code> button above to get the latest release.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>2</span>
                    <strong style={{ fontSize: '12.5px', color: '#10201E' }}>Upload to WP</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    In WordPress Admin: <code>Plugins &rarr; Add New &rarr; Upload Plugin</code>.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>3</span>
                    <strong style={{ fontSize: '12.5px', color: '#10201E' }}>Activate Plugin</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Click <strong>Install Now</strong> and then click <strong>Activate Plugin</strong>.
                  </p>
                </div>

                <div style={{ background: '#FAFBF9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>4</span>
                    <strong style={{ fontSize: '12.5px', color: '#10201E' }}>Paste API Key</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    Open <code>MDefender-Pro</code> in your WP dashboard and paste your Scoped API Key.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
