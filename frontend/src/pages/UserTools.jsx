import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function UserTools() {
  const [ipInput, setIpInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [blacklisting, setBlacklisting] = useState(false)
  const [blacklistMsg, setBlacklistMsg] = useState('')

  const handleLookup = useCallback(async (targetIp) => {
    const queryIp = (targetIp || ipInput || '').trim()
    if (!queryIp) {
      setError('Please enter a valid IPv4 or IPv6 address.')
      return
    }

    setError('')
    setBlacklistMsg('')
    setLoading(true)
    setResult(null)

    try {
      const data = await api.whoisLookup(queryIp)
      if (data) {
        setResult(data)
        if (data.geo && data.geo.status === 'fail') {
          setError(data.geo.message || 'Unable to retrieve geolocation for this IP.')
        }
      } else {
        setError('No record returned for this IP.')
      }
    } catch (err) {
      setError(err.message || 'Whois registry query failed. Please check network connectivity.')
    } finally {
      setLoading(false)
    }
  }, [ipInput])

  // Run initial lookup on 8.8.8.8 on first load
  useEffect(() => {
    setIpInput('8.8.8.8')
    handleLookup('8.8.8.8')
  }, [])

  const handleCopyRaw = () => {
    if (!result?.raw) return
    navigator.clipboard.writeText(result.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQuickLookup = (ip) => {
    setIpInput(ip)
    handleLookup(ip)
  }

  const handleBlacklist = async () => {
    const ip = result?.geo?.query || ipInput.trim()
    if (!ip) return
    if (!confirm(`Are you sure you want to add ${ip} to your permanent blacklist?`)) return

    setBlacklisting(true)
    setBlacklistMsg('')
    try {
      const res = await api.addUserBlacklist({
        ip: ip,
        reason: `Blacklisted from Whois Lookup (ISP: ${result?.geo?.isp || 'Unknown'})`,
        type: 'permanent'
      })
      setBlacklistMsg(res?.message || `IP ${ip} successfully added to Blacklist!`)
    } catch (err) {
      alert(err.message || 'Failed to blacklist IP')
    } finally {
      setBlacklisting(false)
    }
  }

  const geo = result?.geo || {}

  return (
    <div className="user-tools-page" style={{ padding: '4px 0 30px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 6px', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-search-location"></i>
          </span>
          Whois Registry IP Lookup
        </h2>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted, #64748b)' }}>
          Direct live socket query to regional registries (ARIN, RIPE, APNIC, LACNIC, AFRINIC) with real-time Autonomous System (ASN), ISP, and Geo intelligence.
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <i className="fas fa-network-wired" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}></i>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="Enter IP Address (e.g., 104.21.52.12 or 2606:4700::6811:340c)"
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
            disabled={loading}
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
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
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

        {/* Quick Sample Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Quick Test:</span>
          {['8.8.8.8 (Google)', '1.1.1.1 (Cloudflare)', '9.9.9.9 (Quad9)', '208.67.222.222 (OpenDNS)'].map((chip) => {
            const ip = chip.split(' ')[0]
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickLookup(ip)}
                style={{
                  background: 'var(--chip-bg, #f1f5f9)',
                  border: '1px solid var(--chip-border, #e2e8f0)',
                  color: 'var(--text-main, #334155)',
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
              >
                {chip}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error / Alert Message */}
      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-circle-exclamation" style={{ fontSize: '16px' }}></i>
          <span>{error}</span>
        </div>
      )}

      {/* Blacklist Success Message */}
      {blacklistMsg && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-shield-check" style={{ fontSize: '16px' }}></i>
          <span>{blacklistMsg}</span>
        </div>
      )}

      {/* Loading Radar */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#0284c7', marginBottom: '14px' }}></i>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Querying WHOIS registries & Geo Intelligence sockets...</p>
        </div>
      )}

      {/* Results View */}
      {!loading && result && (
        <>
          {/* Intelligence Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* IP & Status */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>Target IP & Status</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <code style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{geo.query || ipInput}</code>
                <span className="badge success" style={{ fontSize: '11px', padding: '3px 8px' }}>Active</span>
              </div>
            </div>

            {/* Country & Location */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>Origin Country & Region</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-earth-americas" style={{ color: '#0284c7' }}></i>
                <span>{geo.country ? `${geo.country} (${geo.countryCode || ''})` : 'Unknown'}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {geo.city ? `${geo.city}, ${geo.regionName || ''}` : 'Region details unavailable'}
              </div>
            </div>

            {/* ISP & Organization */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>ISP / Organization</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {geo.isp || geo.org || 'Unknown Provider'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Org: {geo.org || 'N/A'}
              </div>
            </div>

            {/* ASN & Routing */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>Autonomous System (ASN)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {geo.as || 'Unknown ASN'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                TZ: {geo.timezone || 'UTC'} | Lat/Lon: {geo.lat ? `${geo.lat}, ${geo.lon}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-terminal" style={{ color: '#6366f1' }}></i>
              <span>Official Registry WHOIS Record</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCopyRaw}
                className="btn-small"
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  color: 'var(--text-main, #334155)',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fas ${copied ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                <span>{copied ? 'Copied!' : 'Copy Record'}</span>
              </button>
              <button
                type="button"
                onClick={handleBlacklist}
                disabled={blacklisting}
                className="btn-small"
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: blacklisting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-ban"></i>
                <span>{blacklisting ? 'Blacklisting...' : 'Blacklist IP'}</span>
              </button>
            </div>
          </div>

          {/* Raw WHOIS Terminal Console */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#0f172a', padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>whois-query: {geo.query || ipInput}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>RIPE / ARIN Socket Protocol</span>
            </div>
            <pre style={{
              margin: 0,
              background: '#090d16',
              color: '#38bdf8',
              padding: '20px 24px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '12.5px',
              lineHeight: '1.6',
              maxHeight: '480px',
              overflowX: 'auto',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {result.raw || 'No raw WHOIS text available for this IP range.'}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
