import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/api'

// Comprehensive standard country list with flags & ISO-2 codes
const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
]

export default function UserTools() {
  const [searchParams] = useSearchParams()
  const queryParamIp = searchParams.get('ip')
  const [activeTab, setActiveTab] = useState('whois') // 'whois' | 'geo'

  // --- WHOIS STATE ---
  const [ipInput, setIpInput] = useState(queryParamIp || '8.8.8.8')
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [whoisResult, setWhoisResult] = useState(null)
  const [whoisError, setWhoisError] = useState('')
  const [copied, setCopied] = useState(false)
  const [blacklisting, setBlacklisting] = useState(false)
  const [blacklistMsg, setBlacklistMsg] = useState('')

  // --- GEO BLOCK STATE ---
  const [countryBlocks, setCountryBlocks] = useState([])
  const [geoLoading, setGeoLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('CN')
  const [blockReason, setBlockReason] = useState('Geo-restricted traffic policy')
  const [savingBlock, setSavingBlock] = useState(false)
  const [geoSuccessMsg, setGeoSuccessMsg] = useState('')
  const [geoErrorMsg, setGeoErrorMsg] = useState('')
  const [countrySearch, setCountrySearch] = useState('')

  // --- WHOIS ACTIONS ---
  const handleWhoisLookup = useCallback(async (targetIp) => {
    const queryIp = (targetIp || ipInput || '').trim()
    if (!queryIp) {
      setWhoisError('Please enter a valid IPv4 or IPv6 address.')
      return
    }
    setWhoisError('')
    setBlacklistMsg('')
    setWhoisLoading(true)
    setWhoisResult(null)

    try {
      const data = await api.whoisLookup(queryIp)
      if (data) {
        setWhoisResult(data)
        if (data.geo && data.geo.status === 'fail') {
          setWhoisError(data.geo.message || 'Unable to retrieve geolocation for this IP.')
        }
      } else {
        setWhoisError('No record returned for this IP.')
      }
    } catch (err) {
      setWhoisError(err.message || 'Whois registry query failed.')
    } finally {
      setWhoisLoading(false)
    }
  }, [ipInput])

  useEffect(() => {
    const target = queryParamIp || '8.8.8.8'
    setIpInput(target)
    setActiveTab('whois')
    handleWhoisLookup(target)
  }, [queryParamIp])

  const handleCopyRaw = () => {
    if (!whoisResult?.raw) return
    navigator.clipboard.writeText(whoisResult.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBlacklist = async () => {
    const ip = whoisResult?.geo?.query || ipInput.trim()
    if (!ip) return
    if (!confirm(`Are you sure you want to add ${ip} to your blacklist?`)) return
    setBlacklisting(true)
    setBlacklistMsg('')
    try {
      const res = await api.addUserBlacklist({
        ip: ip,
        reason: `Blacklisted from Whois Lookup (ISP: ${whoisResult?.geo?.isp || 'Unknown'})`,
        type: 'permanent'
      })
      setBlacklistMsg(res?.message || `IP ${ip} successfully added to Blacklist!`)
    } catch (err) {
      alert(err.message || 'Failed to blacklist IP')
    } finally {
      setBlacklisting(false)
    }
  }

  // --- GEO BLOCK ACTIONS ---
  const fetchCountryBlocks = useCallback(async () => {
    try {
      setGeoLoading(true)
      const res = await api.getUserCountryBlocks()
      if (res?.country_blocks) {
        setCountryBlocks(res.country_blocks)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGeoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'geo') {
      fetchCountryBlocks()
    }
  }, [activeTab, fetchCountryBlocks])

  const handleAddCountryBlock = async (e) => {
    if (e) e.preventDefault()
    const targetObj = ALL_COUNTRIES.find(c => c.code === selectedCountry)
    if (!targetObj) return

    setSavingBlock(true)
    setGeoSuccessMsg('')
    setGeoErrorMsg('')

    try {
      const res = await api.addUserCountryBlock({
        country_code: targetObj.code,
        country_name: `${targetObj.flag} ${targetObj.name}`,
        reason: blockReason || 'Geo-restricted by admin'
      })
      if (res?.status === 'success') {
        setGeoSuccessMsg(`✅ ${targetObj.flag} ${targetObj.name} (${targetObj.code}) is now BLOCKED. All visitors from this country will see a 403 Block Page.`)
        fetchCountryBlocks()
      } else {
        setGeoErrorMsg(res?.message || 'Failed to block country.')
      }
    } catch (err) {
      setGeoErrorMsg(err.message || 'Error saving country block.')
    } finally {
      setSavingBlock(false)
    }
  }

  const handleRemoveCountryBlock = async (code, name) => {
    if (!confirm(`Unblock all traffic from ${name || code}?`)) return
    try {
      await api.removeUserCountryBlock(code)
      setGeoSuccessMsg(`Traffic from ${name || code} is now unblocked.`)
      fetchCountryBlocks()
    } catch (err) {
      alert(err.message || 'Failed to unblock country.')
    }
  }

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim()
    if (!q) return ALL_COUNTRIES
    return ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [countrySearch])

  const blockedCodesSet = useMemo(() => {
    return new Set(countryBlocks.map(b => b.country_code))
  }, [countryBlocks])

  const geo = whoisResult?.geo || {}

  return (
    <div className="user-tools-page" style={{ padding: '4px 0 30px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Security Tools & Utilities
        </h2>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted, #64748b)' }}>
          Enterprise IP socket intelligence and Geolocation restriction tools to safeguard your web applications.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-secondary, #f1f5f9)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', maxWidth: '520px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('whois')}
          style={{
            flex: 1,
            height: '40px',
            border: 'none',
            borderRadius: '9px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: activeTab === 'whois' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'whois' ? '#0284c7' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'whois' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-search-location"></i>
          <span>Whois IP Lookup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geo')}
          style={{
            flex: 1,
            height: '40px',
            border: 'none',
            borderRadius: '9px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: activeTab === 'geo' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'geo' ? '#dc2626' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'geo' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-globe-americas"></i>
          <span>Country Blocking ({countryBlocks.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WHOIS REGISTRY IP LOOKUP */}
      {/* ========================================================================= */}
      {activeTab === 'whois' && (
        <div>
          {/* Search Card */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleWhoisLookup(); }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', position: 'relative' }}>
                <i className="fas fa-network-wired" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}></i>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="Enter IP Address (e.g. 104.21.52.12 or 8.8.8.8)"
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 16px 0 44px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={whoisLoading}
                className="btn-primary"
                style={{
                  height: '46px',
                  padding: '0 28px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: whoisLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {whoisLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Querying...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-radar"></i>
                    <span>Lookup IP</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Quick Test:</span>
              {['8.8.8.8 (Google)', '1.1.1.1 (Cloudflare)', '9.9.9.9 (Quad9)', '208.67.222.222 (OpenDNS)'].map((chip) => {
                const ip = chip.split(' ')[0]
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => { setIpInput(ip); handleWhoisLookup(ip); }}
                    style={{
                      background: 'var(--chip-bg, #f1f5f9)',
                      border: '1px solid var(--chip-border, #e2e8f0)',
                      color: 'var(--text-main, #334155)',
                      fontSize: '11.5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
          </div>

          {whoisError && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px' }}>
              <i className="fas fa-circle-exclamation" style={{ marginRight: '8px' }}></i>{whoisError}
            </div>
          )}

          {blacklistMsg && (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontSize: '13px', marginBottom: '20px' }}>
              <i className="fas fa-shield-check" style={{ marginRight: '8px' }}></i>{blacklistMsg}
            </div>
          )}

          {whoisLoading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#0284c7', marginBottom: '14px' }}></i>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Querying WHOIS registries & Geo Intelligence sockets...</p>
            </div>
          )}

          {!whoisLoading && whoisResult && (
            <>
              {/* Intelligence Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Target IP & Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{geo.query || ipInput}</code>
                    <span className="badge success" style={{ fontSize: '11px', padding: '3px 8px' }}>Active</span>
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Origin Country</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                    {geo.country ? `${geo.country} (${geo.countryCode || ''})` : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {geo.city ? `${geo.city}, ${geo.regionName || ''}` : 'Region details unavailable'}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>ISP / Organization</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {geo.isp || geo.org || 'Unknown Provider'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Org: {geo.org || 'N/A'}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Autonomous System (ASN)</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                    {geo.as || 'Unknown ASN'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    TZ: {geo.timezone || 'UTC'} | Lat/Lon: {geo.lat ? `${geo.lat}, ${geo.lon}` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  <i className="fas fa-terminal" style={{ color: '#6366f1', marginRight: '8px' }}></i>
                  Official Registry WHOIS Record
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleCopyRaw} className="btn-small" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>{copied ? 'Copied!' : 'Copy Record'}
                  </button>
                  <button type="button" onClick={handleBlacklist} disabled={blacklisting} className="btn-small" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                    <i className="fas fa-ban" style={{ marginRight: '6px' }}></i>{blacklisting ? 'Blacklisting...' : 'Blacklist IP'}
                  </button>
                </div>
              </div>

              {/* Raw WHOIS Terminal */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                <div style={{ background: '#0f172a', padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>whois-query: {geo.query || ipInput}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>RIPE / ARIN Socket Protocol</span>
                </div>
                <pre style={{ margin: 0, background: '#090d16', color: '#38bdf8', padding: '20px 24px', fontFamily: 'monospace', fontSize: '12.5px', lineHeight: '1.6', maxHeight: '480px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {whoisResult.raw || 'No raw WHOIS text available for this IP range.'}
                </pre>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COUNTRY / GEO-BLOCKING */}
      {/* ========================================================================= */}
      {activeTab === 'geo' && (
        <div>
          {/* Info Banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '14px', padding: '22px 26px', color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>Geo-Firewall Country Blocking Active</h3>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                When you block a country, MDefender intercepts all incoming HTTP requests originating from that country's IP addresses and serves them an immediate <strong>403 Cyber Block Page</strong>. Nobody from that country can view your website.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f87171' }}>{countryBlocks.length}</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700 }}>Blocked Countries</div>
            </div>
          </div>

          {geoSuccessMsg && (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontSize: '13px', marginBottom: '20px' }}>
              {geoSuccessMsg}
            </div>
          )}

          {geoErrorMsg && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px' }}>
              <i className="fas fa-circle-exclamation" style={{ marginRight: '8px' }}></i>{geoErrorMsg}
            </div>
          )}

          {/* Add Country Block Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-ban" style={{ color: '#ef4444' }}></i>
              Block a Country from Visiting Your Website
            </h3>

            <form onSubmit={handleAddCountryBlock} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) 160px', gap: '14px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '0 12px'
                  }}
                >
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} disabled={blockedCodesSet.has(c.code)}>
                      {c.flag} {c.name} ({c.code}) {blockedCodesSet.has(c.code) ? '— [ALREADY BLOCKED]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Block Reason / Note</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Restricted geographical region"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '0 14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={savingBlock || blockedCodesSet.has(selectedCountry)}
                style={{
                  height: '44px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: (savingBlock || blockedCodesSet.has(selectedCountry)) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: blockedCodesSet.has(selectedCountry) ? 0.6 : 1
                }}
              >
                {savingBlock ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Blocking...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock"></i>
                    <span>Block Country</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Popular Presets */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Quick Select:</span>
              {[
                { code: 'CN', name: 'China', flag: '🇨🇳' },
                { code: 'RU', name: 'Russia', flag: '🇷🇺' },
                { code: 'IR', name: 'Iran', flag: '🇮🇷' },
                { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
                { code: 'SY', name: 'Syria', flag: '🇸🇾' },
                { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
              ].map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => setSelectedCountry(preset.code)}
                  style={{
                    background: selectedCountry === preset.code ? '#fee2e2' : 'var(--chip-bg, #f1f5f9)',
                    border: selectedCountry === preset.code ? '1px solid #f87171' : '1px solid var(--chip-border, #e2e8f0)',
                    color: selectedCountry === preset.code ? '#b91c1c' : 'var(--text-main, #334155)',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {preset.flag} {preset.name} ({preset.code})
                </button>
              ))}
            </div>
          </div>

          {/* Active Blocked Countries Table */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Currently Blocked Countries ({countryBlocks.length})
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  Traffic from these countries will be automatically dropped with HTTP 403 Forbidden.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchCountryBlocks}
                className="btn-small"
                style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                <i className="fas fa-rotate" style={{ marginRight: '6px' }}></i>Refresh List
              </button>
            </div>

            {geoLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                <div>Loading blocked countries...</div>
              </div>
            ) : countryBlocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1.5px dashed var(--border-color, #cbd5e1)' }}>
                <i className="fas fa-globe" style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '12px' }}></i>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>No Countries Blocked</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Your website currently accepts traffic from all global regions. Use the form above to restrict specific countries.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Country</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>ISO Code</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Firewall Action</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Reason</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Date Blocked</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countryBlocks.map((block) => {
                      const cObj = ALL_COUNTRIES.find(c => c.code === block.country_code)
                      const flag = cObj ? cObj.flag : '🌐'
                      const name = block.country_name || (cObj ? cObj.name : block.country_code)

                      return (
                        <tr key={block._id || block.country_code} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                          <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                            <span style={{ fontSize: '18px', marginRight: '8px' }}>{flag}</span>
                            <span>{name}</span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <code style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                              {block.country_code}
                            </code>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span className="badge danger" style={{ fontSize: '11px', padding: '3px 8px' }}>
                              ⛔ 403 FORBIDDEN
                            </span>
                          </td>
                          <td style={{ padding: '14px', color: '#64748b' }}>
                            {block.reason || 'Geo-restricted policy'}
                          </td>
                          <td style={{ padding: '14px', color: '#64748b', fontSize: '12.5px' }}>
                            {block.created_at || 'Active'}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveCountryBlock(block.country_code, name)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <i className="fas fa-unlock" style={{ marginRight: '6px', color: '#10b981' }}></i>
                              Unblock
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
