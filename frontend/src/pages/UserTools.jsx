import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/api'

// Helper to get Flag Emoji from ISO-2 country code
export function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// Comprehensive standard country list with ISO-2 codes and Region metadata
const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', region: 'Asia' },
  { code: 'AL', name: 'Albania', region: 'Europe' },
  { code: 'DZ', name: 'Algeria', region: 'Africa' },
  { code: 'AR', name: 'Argentina', region: 'Americas' },
  { code: 'AM', name: 'Armenia', region: 'Asia' },
  { code: 'AU', name: 'Australia', region: 'Oceania' },
  { code: 'AT', name: 'Austria', region: 'Europe' },
  { code: 'AZ', name: 'Azerbaijan', region: 'Asia' },
  { code: 'BD', name: 'Bangladesh', region: 'Asia' },
  { code: 'BY', name: 'Belarus', region: 'Europe' },
  { code: 'BE', name: 'Belgium', region: 'Europe' },
  { code: 'BR', name: 'Brazil', region: 'Americas' },
  { code: 'BG', name: 'Bulgaria', region: 'Europe' },
  { code: 'CA', name: 'Canada', region: 'Americas' },
  { code: 'CL', name: 'Chile', region: 'Americas' },
  { code: 'CN', name: 'China', region: 'Asia' },
  { code: 'CO', name: 'Colombia', region: 'Americas' },
  { code: 'CU', name: 'Cuba', region: 'Americas' },
  { code: 'CY', name: 'Cyprus', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe' },
  { code: 'DK', name: 'Denmark', region: 'Europe' },
  { code: 'EG', name: 'Egypt', region: 'Africa' },
  { code: 'EE', name: 'Estonia', region: 'Europe' },
  { code: 'FI', name: 'Finland', region: 'Europe' },
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'GE', name: 'Georgia', region: 'Asia' },
  { code: 'DE', name: 'Germany', region: 'Europe' },
  { code: 'GR', name: 'Greece', region: 'Europe' },
  { code: 'HK', name: 'Hong Kong', region: 'Asia' },
  { code: 'HU', name: 'Hungary', region: 'Europe' },
  { code: 'IN', name: 'India', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', region: 'Asia' },
  { code: 'IR', name: 'Iran', region: 'Middle East' },
  { code: 'IQ', name: 'Iraq', region: 'Middle East' },
  { code: 'IE', name: 'Ireland', region: 'Europe' },
  { code: 'IL', name: 'Israel', region: 'Middle East' },
  { code: 'IT', name: 'Italy', region: 'Europe' },
  { code: 'JP', name: 'Japan', region: 'Asia' },
  { code: 'KZ', name: 'Kazakhstan', region: 'Asia' },
  { code: 'KE', name: 'Kenya', region: 'Africa' },
  { code: 'KP', name: 'North Korea', region: 'Asia' },
  { code: 'KR', name: 'South Korea', region: 'Asia' },
  { code: 'KW', name: 'Kuwait', region: 'Middle East' },
  { code: 'LV', name: 'Latvia', region: 'Europe' },
  { code: 'LB', name: 'Lebanon', region: 'Middle East' },
  { code: 'LT', name: 'Lithuania', region: 'Europe' },
  { code: 'MY', name: 'Malaysia', region: 'Asia' },
  { code: 'MX', name: 'Mexico', region: 'Americas' },
  { code: 'MD', name: 'Moldova', region: 'Europe' },
  { code: 'MA', name: 'Morocco', region: 'Africa' },
  { code: 'MM', name: 'Myanmar', region: 'Asia' },
  { code: 'NL', name: 'Netherlands', region: 'Europe' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
  { code: 'NG', name: 'Nigeria', region: 'Africa' },
  { code: 'NO', name: 'Norway', region: 'Europe' },
  { code: 'PK', name: 'Pakistan', region: 'Asia' },
  { code: 'PS', name: 'Palestine', region: 'Middle East' },
  { code: 'PH', name: 'Philippines', region: 'Asia' },
  { code: 'PL', name: 'Poland', region: 'Europe' },
  { code: 'PT', name: 'Portugal', region: 'Europe' },
  { code: 'QA', name: 'Qatar', region: 'Middle East' },
  { code: 'RO', name: 'Romania', region: 'Europe' },
  { code: 'RU', name: 'Russia', region: 'Europe' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  { code: 'RS', name: 'Serbia', region: 'Europe' },
  { code: 'SG', name: 'Singapore', region: 'Asia' },
  { code: 'ZA', name: 'South Africa', region: 'Africa' },
  { code: 'ES', name: 'Spain', region: 'Europe' },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia' },
  { code: 'SE', name: 'Sweden', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', region: 'Europe' },
  { code: 'SY', name: 'Syria', region: 'Middle East' },
  { code: 'TW', name: 'Taiwan', region: 'Asia' },
  { code: 'TH', name: 'Thailand', region: 'Asia' },
  { code: 'TR', name: 'Turkey', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', region: 'Europe' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'US', name: 'United States', region: 'Americas' },
  { code: 'VN', name: 'Vietnam', region: 'Asia' },
  { code: 'YE', name: 'Yemen', region: 'Middle East' },
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
  const [copiedAbuse, setCopiedAbuse] = useState(false)
  const [copiedDossier, setCopiedDossier] = useState(false)
  const [blacklisting, setBlacklisting] = useState(false)
  const [blacklistMsg, setBlacklistMsg] = useState('')

  // --- GEO BLOCK STATE ---
  const [countryBlocks, setCountryBlocks] = useState([])
  const [geoLoading, setGeoLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('CN')
  const [blockReason, setBlockReason] = useState('High Cyber Threat Activity')
  const [savingBlock, setSavingBlock] = useState(false)
  const [geoSuccessMsg, setGeoSuccessMsg] = useState('')
  const [geoErrorMsg, setGeoErrorMsg] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [geoViewMode, setGeoViewMode] = useState('cards') // 'cards' | 'table'
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('')

  // --- AUTO-BLOCK & RATE LIMIT STATE ---
  const [securityConfig, setSecurityConfig] = useState({
    auto_block_enabled: true,
    auto_block_threshold: 10,
    auto_block_window_hours: 24,
    auto_block_duration_hours: 24,
    rate_limit_per_minute: 120,
    ddos_mitigation_enabled: true,
    admin_bruteforce_protection: true,
    auto_block_permanent: false,
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSuccessMsg, setConfigSuccessMsg] = useState('')
  const [configErrorMsg, setConfigErrorMsg] = useState('')
  const [autoBlocksList, setAutoBlocksList] = useState([])
  const [autoBlocksLoading, setAutoBlocksLoading] = useState(false)
  const [autoBlockSearch, setAutoBlockSearch] = useState('')
  const [autoBlockActionMsg, setAutoBlockActionMsg] = useState('')

  // --- SECURITY AUDIT SCANNER STATE ---
  const [auditUrl, setAuditUrl] = useState('')
  const [connectedWebsites, setConnectedWebsites] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditProgressStep, setAuditProgressStep] = useState(0)
  const [auditResult, setAuditResult] = useState(null)
  const [auditError, setAuditError] = useState('')
  const [auditActiveSubTab, setAuditActiveSubTab] = useState('headers')
  const [auditCopied, setAuditCopied] = useState(false)

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

  // Fetch connected websites and initial counts on mount
  useEffect(() => {
    api.getUserWebsites().then(res => {
      const list = res?.websites || res?.data?.websites || []
      setConnectedWebsites(list)
      if (list.length > 0 && !auditUrl) {
        setAuditUrl(list[0].url || list[0].domain || '')
      }
    }).catch(() => {
      api.getUserDashboard().then(res => {
        const list = res?.websites || []
        setConnectedWebsites(list)
        if (list.length > 0 && !auditUrl) {
          setAuditUrl(list[0].url || list[0].domain || '')
        }
      }).catch(() => {})
    })

    fetchCountryBlocks()
    fetchAutoBlocks()
    fetchSecurityConfig()
  }, [])

  const handleCopyRaw = () => {
    if (!whoisResult?.raw) return
    navigator.clipboard.writeText(whoisResult.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyAbuse = (email) => {
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedAbuse(true)
    setTimeout(() => setCopiedAbuse(false), 2000)
  }

  const handleCopyDossier = () => {
    if (!whoisResult) return
    const dossierText = `=== MDEFENDER THREAT INTELLIGENCE REPORT ===
Target IP: ${whoisResult.ip}
Reverse DNS: ${whoisResult.hostname || whoisResult.geo?.reverse || 'None'}
Country: ${whoisResult.geo?.country} (${whoisResult.geo?.countryCode})
City / Region: ${whoisResult.geo?.city}, ${whoisResult.geo?.regionName}
ISP: ${whoisResult.geo?.isp}
Org / Network: ${whoisResult.parsed_whois?.organization || whoisResult.geo?.org}
ASN: ${whoisResult.geo?.as}
NetName: ${whoisResult.parsed_whois?.netname || 'N/A'}
Subnet (CIDR): ${whoisResult.parsed_whois?.inetnum || 'N/A'}
Abuse Contact: ${whoisResult.parsed_whois?.abuse_email || 'N/A'}
RIR Source: ${whoisResult.parsed_whois?.source || 'N/A'}
Threat Score: ${whoisResult.threat_assessment?.score}/100 (${whoisResult.threat_assessment?.level})
Proxy / VPN: ${whoisResult.threat_assessment?.is_proxy ? 'YES' : 'NO'}
Hosting / Datacenter: ${whoisResult.threat_assessment?.is_hosting ? 'YES' : 'NO'}
Total Attacks on Your Sites: ${whoisResult.user_attack_history?.total_attacks || 0}
Report Generated: ${new Date().toISOString()}`

    navigator.clipboard.writeText(dossierText)
    setCopiedDossier(true)
    setTimeout(() => setCopiedDossier(false), 2000)
  }

  const handleBlacklist = async () => {
    const ip = whoisResult?.ip || whoisResult?.geo?.query || ipInput.trim()
    if (!ip) return
    if (!confirm(`Are you sure you want to add ${ip} to your permanent blacklist?`)) return
    setBlacklisting(true)
    setBlacklistMsg('')
    try {
      const res = await api.addUserBlacklist({
        ip: ip,
        reason: `Blacklisted via Threat Intel Lookup (ISP: ${whoisResult?.geo?.isp || 'Unknown'})`,
        type: 'permanent'
      })
      setBlacklistMsg(res?.message || `IP ${ip} successfully added to Blacklist!`)
      // Refresh current lookup so threat score reflects blacklisted status
      handleWhoisLookup(ip)
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
        country_name: targetObj.name,
        reason: blockReason || 'Geo-restricted by admin'
      })
      if (res?.status === 'success') {
        setGeoSuccessMsg(`${targetObj.name} (${targetObj.code}) is now blocked. All visitors from this country will receive a 403 Forbidden page.`)
        setCountryBlocks(prev => {
          if (prev.some(b => b.country_code === targetObj.code)) return prev
          return [{
            country_code: targetObj.code,
            country_name: targetObj.name,
            reason: blockReason || 'Geo-restricted by admin',
            created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
          }, ...prev]
        })
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
      setCountryBlocks(prev => prev.filter(b => b.country_code !== code))
      await api.removeUserCountryBlock(code)
      setGeoSuccessMsg(`Traffic from ${name || code} is now unblocked.`)
      fetchCountryBlocks()
    } catch (err) {
      alert(err.message || 'Failed to unblock country.')
      fetchCountryBlocks()
    }
  }

  // --- AUTO-BLOCK & RATE LIMIT ACTIONS ---
  const fetchSecurityConfig = useCallback(async () => {
    try {
      setConfigLoading(true)
      const res = await api.getUserSecurityConfig()
      if (res?.config) {
        setSecurityConfig(res.config)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const fetchAutoBlocks = useCallback(async () => {
    try {
      setAutoBlocksLoading(true)
      const res = await api.getUserAutoBlocks()
      if (res?.auto_blocks) {
        setAutoBlocksList(res.auto_blocks)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAutoBlocksLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'autoblock') {
      fetchSecurityConfig()
      fetchAutoBlocks()
    }
  }, [activeTab, fetchSecurityConfig, fetchAutoBlocks])

  const handleSaveSecurityConfig = async (e) => {
    if (e) e.preventDefault()
    setSavingConfig(true)
    setConfigSuccessMsg('')
    setConfigErrorMsg('')
    try {
      const res = await api.updateUserSecurityConfig(securityConfig)
      if (res?.status === 'success') {
        setConfigSuccessMsg('Security policy saved! Real-time changes synchronized to all connected WordPress origins & API gateways.')
        if (res.config) setSecurityConfig(res.config)
        setTimeout(() => setConfigSuccessMsg(''), 4500)
      } else {
        setConfigErrorMsg(res?.message || 'Failed to save configuration.')
      }
    } catch (err) {
      setConfigErrorMsg(err.message || 'Error updating security policy.')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleUnblockAutoBlock = async (ip) => {
    if (!confirm(`Unblock attacker IP ${ip}?`)) return
    setAutoBlockActionMsg('')
    try {
      await api.deleteUserAutoBlock(ip)
      setAutoBlockActionMsg(`IP ${ip} unblocked and synced to edge firewall.`)
      fetchAutoBlocks()
    } catch (err) {
      alert(err.message || 'Failed to unblock IP')
    }
  }

  const handlePromoteAutoBlock = async (ip) => {
    if (!confirm(`Promote IP ${ip} to Permanent Blacklist?`)) return
    setAutoBlockActionMsg('')
    try {
      await api.promoteUserAutoBlock(ip)
      setAutoBlockActionMsg(`IP ${ip} promoted to permanent blacklist.`)
      fetchAutoBlocks()
    } catch (err) {
      alert(err.message || 'Failed to promote IP')
    }
  }

  // --- SECURITY AUDIT SCANNER ACTIONS ---
  const handleRunAudit = async (targetUrl) => {
    const queryUrl = (targetUrl || auditUrl || '').trim()
    if (!queryUrl) {
      setAuditError('Please enter a valid website URL.')
      return
    }
    setAuditError('')
    setAuditLoading(true)
    setAuditResult(null)
    setAuditProgressStep(1)

    const timer1 = setTimeout(() => setAuditProgressStep(2), 500)
    const timer2 = setTimeout(() => setAuditProgressStep(3), 1000)
    const timer3 = setTimeout(() => setAuditProgressStep(4), 1600)

    try {
      const res = await api.runSecurityAudit(queryUrl)
      if (res?.status === 'success' && res?.audit) {
        setAuditResult(res.audit)
      } else {
        setAuditError(res?.message || 'Security audit could not be completed.')
      }
    } catch (err) {
      setAuditError(err.message || 'Failed to scan target website.')
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      setAuditLoading(false)
      setAuditProgressStep(0)
    }
  }

  const handleCopyAuditSummary = () => {
    if (!auditResult) return
    const summary = `=== MDEFENDER PRO CYBER SECURITY AUDIT REPORT ===
Target: ${auditResult.target_url} (${auditResult.ip_address})
Overall Score: ${auditResult.score}/100 [Grade: ${auditResult.grade}]
Verdict: ${auditResult.verdict}
Scanned At: ${auditResult.scanned_at}
WAF / CDN Detected: ${auditResult.http?.waf_detected}
SSL Grade: ${auditResult.ssl?.grade} (Issuer: ${auditResult.ssl?.issuer}, ${auditResult.ssl?.days_remaining} days left)
Security Headers Score: ${auditResult.http?.header_score}%
Open Ports: ${auditResult.ports?.open_count}/${auditResult.ports?.total_scanned} (Critical Exposed: ${auditResult.ports?.critical_exposed})
Generated by MDefender Pro Cloud Security Matrix`

    navigator.clipboard.writeText(summary)
    setAuditCopied(true)
    setTimeout(() => setAuditCopied(false), 2000)
  }

  const blockedCodesSet = useMemo(() => {
    return new Set(countryBlocks.map(b => b.country_code))
  }, [countryBlocks])

  const geo = whoisResult?.geo || {}
  const parsed = whoisResult?.parsed_whois || {}
  const threat = whoisResult?.threat_assessment || {}
  const history = whoisResult?.user_attack_history || {}

  // Threat badge color determination
  const threatScore = threat.score || 0
  let threatScoreColor = '#10b981'
  let threatBgColor = '#ecfdf5'
  if (threatScore >= 80) {
    threatScoreColor = '#ef4444'
    threatBgColor = '#fef2f2'
  } else if (threatScore >= 50) {
    threatScoreColor = '#f97316'
    threatBgColor = '#fff7ed'
  } else if (threatScore >= 25) {
    threatScoreColor = '#eab308'
    threatBgColor = '#fefce8'
  }

  return (
    <div className="user-tools-page" style={{ padding: '4px 0 40px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 6px', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <i className="fas fa-satellite-dish"></i>
          </span>
          Forensic Threat Intelligence &amp; Security Tools
        </h2>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted, #64748b)' }}>
          Attacker threat intelligence, country firewall geo-blocking, automatic attack rate limiting, and cyber security port diagnostics.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-secondary, #f1f5f9)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', maxWidth: '920px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('whois')}
          style={{
            flex: '1 1 180px', height: '40px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'whois' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'whois' ? '#0284c7' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'whois' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-radar"></i>
          <span>Attacker Threat Intel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geo')}
          style={{
            flex: '1 1 180px', height: '40px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'geo' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'geo' ? '#dc2626' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'geo' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-globe-americas"></i>
          <span>Country Blocking ({countryBlocks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('autoblock')}
          style={{
            flex: '1 1 200px', height: '40px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'autoblock' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'autoblock' ? '#7c3aed' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'autoblock' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-shield-virus"></i>
          <span>Auto-Block &amp; Rate Limiting ({autoBlocksList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            flex: '1 1 200px', height: '40px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'audit' ? 'var(--card-bg, #ffffff)' : 'transparent',
            color: activeTab === 'audit' ? '#10b981' : 'var(--text-muted, #64748b)',
            boxShadow: activeTab === 'audit' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-microscope"></i>
          <span>Security &amp; Port Audit</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTACKER IP THREAT INTEL & WHOIS */}
      {/* ========================================================================= */}
      {activeTab === 'whois' && (
        <div>
          {/* Search Card */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleWhoisLookup(); }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', position: 'relative' }}>
                <i className="fas fa-crosshairs" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}></i>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="Enter Attacker IP (e.g. 103.151.30.111, 185.220.101.5, or 8.8.8.8)"
                  style={{
                    width: '100%', height: '46px', padding: '0 16px 0 44px', borderRadius: '10px',
                    border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main, #0f172a)', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={whoisLoading}
                className="btn-primary"
                style={{
                  height: '46px', padding: '0 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: whoisLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {whoisLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-magnifying-glass-location"></i>
                    <span>Analyze Threat</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Investigate Sample:</span>
              {[
                { ip: '103.151.30.111', label: '103.151.30.111 (Attacker IP)' },
                { ip: '185.220.101.5', label: '185.220.101.5 (Tor Exit Node)' },
                { ip: '8.8.8.8', label: '8.8.8.8 (Google DNS)' },
                { ip: '1.1.1.1', label: '1.1.1.1 (Cloudflare)' },
              ].map((chip) => (
                <button
                  key={chip.ip}
                  type="button"
                  onClick={() => { setIpInput(chip.ip); handleWhoisLookup(chip.ip); }}
                  style={{
                    background: 'var(--chip-bg, #f1f5f9)', border: '1px solid var(--chip-border, #e2e8f0)',
                    color: 'var(--text-main, #334155)', fontSize: '11.5px', padding: '4px 10px',
                    borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  {chip.label}
                </button>
              ))}
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
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Executing multi-RIR WHOIS sockets, PTR reverse lookup &amp; threat intelligence analysis...</p>
            </div>
          )}

          {!whoisLoading && whoisResult && (
            <>
              {/* Threat Overview Banner */}
              <div style={{
                background: threatBgColor, border: `1.5px solid ${threatScoreColor}`, borderRadius: '14px',
                padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <i className={`fas ${threatScore >= 50 ? 'fa-triangle-exclamation' : 'fa-shield-halved'}`} style={{ fontSize: '18px', color: threatScoreColor }}></i>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: threatScoreColor }}>
                      Threat Assessment: {threat.level || 'Normal'}
                    </h3>
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span>Target IP: <strong>{whoisResult.ip}</strong></span>
                    <span>•</span>
                    <span>Reverse Hostname: <strong>{whoisResult.hostname || geo.reverse || 'No PTR Record'}</strong></span>
                    <span>•</span>
                    <span>Subnet (CIDR): <strong>{parsed.inetnum || 'N/A'}</strong></span>
                  </div>
                  {threat.reasons && threat.reasons.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {threat.reasons.map((r, idx) => (
                        <span key={idx} style={{ background: 'rgba(0,0,0,0.06)', color: '#0f172a', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                          <i className="fas fa-triangle-exclamation" style={{ marginRight: '4px', color: threatScoreColor }}></i>{r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '10px 18px', background: '#fff', borderRadius: '10px', border: `1px solid ${threatScoreColor}`, minWidth: '100px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: threatScoreColor }}>
                      {threatScore}<span style={{ fontSize: '13px', color: '#94a3b8' }}>/100</span>
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Risk Score</div>
                  </div>
                </div>
              </div>

              {/* Forensic Intelligence Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Geolocation & Region */}
                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Geolocation Origin</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-earth-asia" style={{ color: '#0284c7' }}></i>
                    <span>{geo.country ? `${geo.country} (${geo.countryCode || ''})` : 'Unknown'}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                    {geo.city ? `${geo.city}, ${geo.regionName || ''}` : 'Region details unavailable'}
                  </div>
                  {geo.lat && geo.lon && (
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href={`https://www.google.com/maps?q=${geo.lat},${geo.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fas fa-map-pin"></i> View on Map ({geo.lat}, {geo.lon})
                      </a>
                    </div>
                  )}
                </div>

                {/* ISP & Autonomous System */}
                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Network &amp; ASN</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {geo.as || 'Unknown ASN'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ISP: {geo.isp || 'N/A'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                    Org: {parsed.organization || geo.org || 'N/A'}
                  </div>
                </div>

                {/* Registry & NetName */}
                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>RIR Registry &amp; Subnet</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    {parsed.source ? `${parsed.source} Registry` : 'RIR Socket'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                    NetName: <strong>{parsed.netname || 'N/A'}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                    Range: <code style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 700 }}>{parsed.inetnum || 'N/A'}</code>
                  </div>
                </div>

                {/* Abuse Contact & Proxy Status */}
                <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Abuse Contact &amp; Type</div>
                  {parsed.abuse_email ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <code style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 700, wordBreak: 'break-all' }}>{parsed.abuse_email}</code>
                      <button
                        type="button"
                        onClick={() => handleCopyAbuse(parsed.abuse_email)}
                        style={{ background: '#fee2e2', border: 'none', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedAbuse ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No direct abuse mailbox published</div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span className={`badge ${threat.is_proxy ? 'danger' : 'success'}`} style={{ fontSize: '10.5px' }}>
                      {threat.is_proxy ? 'Proxy/VPN' : 'Direct IP'}
                    </span>
                    <span className={`badge ${threat.is_hosting ? 'warning' : 'success'}`} style={{ fontSize: '10.5px' }}>
                      {threat.is_hosting ? 'Datacenter/Cloud' : 'Residential/ISP'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Local Incident History against User's Websites */}
              <div className="card" style={{ padding: '20px 24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: history.total_attacks > 0 ? '#fee2e2' : '#ecfdf5', color: history.total_attacks > 0 ? '#ef4444' : '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                      <i className={`fas ${history.total_attacks > 0 ? 'fa-skull-crossbones' : 'fa-shield-check'}`}></i>
                    </span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                        Attacker Activity on Your Connected Websites ({history.total_attacks || 0} Incident{history.total_attacks === 1 ? '' : 's'})
                      </h4>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Historical attack log correlation for IP {whoisResult.ip}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCopyDossier}
                      style={{
                        background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a',
                        fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '6px',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <i className={`fas ${copiedDossier ? 'fa-check text-green-600' : 'fa-file-lines'}`}></i>
                      <span>{copiedDossier ? 'Dossier Copied!' : 'Export Threat Dossier'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBlacklist}
                      disabled={blacklisting || threat.is_blacklisted}
                      style={{
                        background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700,
                        fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: (blacklisting || threat.is_blacklisted) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: threat.is_blacklisted ? 0.7 : 1
                      }}
                    >
                      <i className="fas fa-ban"></i>
                      <span>{threat.is_blacklisted ? 'Already Blacklisted' : 'Blacklist Attacker IP'}</span>
                    </button>
                  </div>
                </div>

                {history.recent_attacks && history.recent_attacks.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Timestamp</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Target Endpoint</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Attack Classification</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Firewall Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.recent_attacks.map((att, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{att.timestamp}</td>
                            <td style={{ padding: '10px' }}><code style={{ color: '#0f172a', fontWeight: 700 }}>{att.url}</code></td>
                            <td style={{ padding: '10px' }}><span style={{ color: '#dc2626', fontWeight: 700 }}>{att.attack_type}</span></td>
                            <td style={{ padding: '10px' }}>
                              <span className={`badge ${att.status === 'blocked' ? 'danger' : 'success'}`} style={{ fontSize: '11px' }}>
                                {att.status === 'blocked' ? 'BLOCKED (403)' : 'PASSED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                    <i className="fas fa-shield-halved" style={{ color: '#10b981', marginRight: '8px' }}></i>
                    Clean Record: This IP has not triggered any logged attack payloads against your connected websites.
                  </div>
                )}
              </div>

              {/* Action Bar & Raw WHOIS Terminal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-terminal" style={{ color: '#6366f1' }}></i>
                  <span>Official RIR Socket Transcript (APNIC / RIPE / ARIN)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="btn-small"
                  style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                >
                  <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>{copied ? 'Copied Transcript!' : 'Copy Full WHOIS'}
                </button>
              </div>

              {/* Raw WHOIS Terminal Console */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                <div style={{ background: '#0f172a', padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>whois -h whois.ripe.net {whoisResult.ip}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>Raw RIR Query Stream</span>
                </div>
                <pre style={{ margin: 0, background: '#090d16', color: '#38bdf8', padding: '20px 24px', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12.5px', lineHeight: '1.6', maxHeight: '440px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
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
        <div className="space-y-6">
          {/* Main Geo-Firewall Telemetry Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: '#fff',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.4)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
              <div style={{ maxWidth: '680px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.45)'
                  }}>
                    <i className="fas fa-earth-americas"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Geo-Firewall Edge Defense
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 700 }}>
                        <i className="fas fa-circle-check" style={{ marginRight: '4px' }}></i> Active &amp; Live Synced
                      </span>
                    </h3>
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                  Enforce strict sovereign perimeter boundaries at the cloud edge. All HTTP/HTTPS traffic originating from blocked ISO regions is dropped in <strong>&lt;0.10ms</strong> with an immediate <strong>HTTP 403 Cyber Block Page</strong> before PHP application execution.
                </p>
              </div>

              {/* Quick Telemetry Chips */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '110px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: countryBlocks.length > 0 ? '#f87171' : '#34d399' }}>
                    {countryBlocks.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>Blocked Countries</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '110px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#60a5fa' }}>
                    &lt;0.10ms
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>Trie Latency</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '110px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#f59e0b' }}>
                    250+
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>ISO Regions</div>
                </div>
              </div>
            </div>
          </div>

          {geoSuccessMsg && (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#15803d', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-circle-check" style={{ fontSize: '16px' }}></i>
              <span style={{ fontWeight: 600 }}>{geoSuccessMsg}</span>
            </div>
          )}

          {geoErrorMsg && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-circle-exclamation" style={{ fontSize: '16px' }}></i>
              <span style={{ fontWeight: 600 }}>{geoErrorMsg}</span>
            </div>
          )}

          {/* Add Country Block Configuration Card */}
          <div style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px 28px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-shield-halved" style={{ color: '#dc2626' }}></i>
                  Add Country-Level Geo Restriction Policy
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Select sovereign regions to drop immediately upon edge connection.
                </p>
              </div>

              {/* Region Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Asia', 'Europe', 'Americas', 'Middle East', 'Africa'].map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegion(reg)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: selectedRegion === reg ? '1px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)',
                      background: selectedRegion === reg ? '#eff6ff' : 'var(--input-bg, #f8fafc)',
                      color: selectedRegion === reg ? '#2563eb' : 'var(--text-main, #475569)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Threat Presets Ribbon */}
            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: '4px' }}></i>
                  Popular Threat Targets:
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { code: 'CN', name: 'China' },
                  { code: 'RU', name: 'Russia' },
                  { code: 'IR', name: 'Iran' },
                  { code: 'KP', name: 'North Korea' },
                  { code: 'SY', name: 'Syria' },
                  { code: 'VN', name: 'Vietnam' },
                ].map((preset) => {
                  const isBlocked = blockedCodesSet.has(preset.code)
                  return (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(preset.code)
                        if (!isBlocked) setBlockReason(`High Cyber Threat Policy (${preset.name})`)
                      }}
                      style={{
                        background: selectedCountry === preset.code ? '#fee2e2' : (isBlocked ? 'rgba(239, 68, 68, 0.08)' : 'white'),
                        border: selectedCountry === preset.code ? '1.5px solid #ef4444' : (isBlocked ? '1px dashed #f87171' : '1px solid var(--border-color, #cbd5e1)'),
                        color: isBlocked ? '#dc2626' : (selectedCountry === preset.code ? '#991b1b' : 'var(--text-main, #334155)'),
                        fontSize: '12px',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{getFlagEmoji(preset.code)}</span>
                      <span>{preset.name} ({preset.code})</span>
                      {isBlocked && (
                        <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                          BLOCKED
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Form Inputs Grid */}
            <form onSubmit={handleAddCountryBlock} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr)) 180px', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-main, #334155)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  <i className="fas fa-flag" style={{ color: '#3b82f6', marginRight: '6px' }}></i>
                  Target Country
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    style={{
                      width: '100%',
                      height: '46px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color, #cbd5e1)',
                      background: 'var(--input-bg, #f8fafc)',
                      color: 'var(--text-main, #0f172a)',
                      fontSize: '14px',
                      fontWeight: 700,
                      padding: '0 14px',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {ALL_COUNTRIES
                      .filter(c => selectedRegion === 'All' || c.region === selectedRegion)
                      .map((c) => {
                        const isBlocked = blockedCodesSet.has(c.code)
                        return (
                          <option key={c.code} value={c.code} disabled={isBlocked}>
                            {getFlagEmoji(c.code)} {c.name} ({c.code}) {isBlocked ? '— [ALREADY BLOCKED]' : ''}
                          </option>
                        )
                      })}
                  </select>
                  <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-main, #334155)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  <i className="fas fa-file-shield" style={{ color: '#8b5cf6', marginRight: '6px' }}></i>
                  Firewall Policy Reason
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g., High Cyber Threat Activity, OFAC Sanction"
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    padding: '0 14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={savingBlock || blockedCodesSet.has(selectedCountry)}
                style={{
                  height: '46px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: (savingBlock || blockedCodesSet.has(selectedCountry)) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  opacity: blockedCodesSet.has(selectedCountry) ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {savingBlock ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Enforcing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock"></i>
                    <span>Block Country</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Blocked Countries Console */}
          <div style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px 28px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-list-check" style={{ color: '#3b82f6' }}></i>
                  Active Geo-Firewall Block Policies ({countryBlocks.length})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  All traffic from these regions is immediately terminated with HTTP 403 Forbidden.
                </p>
              </div>

              {/* View Switcher & Search */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {countryBlocks.length > 0 && (
                  <div style={{ position: 'relative', width: '220px' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}></i>
                    <input
                      type="text"
                      placeholder="Filter blocked..."
                      value={blockedSearchQuery}
                      onChange={e => setBlockedSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', background: 'var(--bg-secondary, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <button
                    type="button"
                    onClick={() => setGeoViewMode('cards')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: geoViewMode === 'cards' ? 'white' : 'transparent',
                      color: geoViewMode === 'cards' ? '#2563eb' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: geoViewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <i className="fas fa-grip" style={{ marginRight: '4px' }}></i> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoViewMode('table')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: geoViewMode === 'table' ? 'white' : 'transparent',
                      color: geoViewMode === 'table' ? '#2563eb' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: geoViewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <i className="fas fa-table-list" style={{ marginRight: '4px' }}></i> Table
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchCountryBlocks}
                  style={{
                    background: 'var(--input-bg, #f8fafc)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: 'var(--text-main, #334155)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-rotate"></i> Refresh
                </button>
              </div>
            </div>

            {geoLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading active sovereign geo-blocks...</div>
              </div>
            ) : countryBlocks.length === 0 ? (
              /* High-Tech Empty State */
              <div style={{
                textAlign: 'center',
                padding: '60px 24px',
                background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(241,245,249,0.9) 100%)',
                borderRadius: '16px',
                border: '1.5px dashed var(--border-color, #cbd5e1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 15px rgba(37,99,235,0.15)'
                }}>
                  <i className="fas fa-earth-americas"></i>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Global Traffic Permitted
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#64748b', maxWidth: '480px', lineHeight: '1.5' }}>
                  Your website currently accepts traffic from all 250+ global regions. Use the form above or click a quick threat preset to block specific countries.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedCountry('CN'); setBlockReason('High Threat Defense (China)'); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🇨🇳 Block China
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedCountry('RU'); setBlockReason('High Threat Defense (Russia)'); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🇷🇺 Block Russia
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* View 1: Interactive Cards View */}
                {geoViewMode === 'cards' ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px'
                  }}>
                    {countryBlocks
                      .filter(b => {
                        if (!blockedSearchQuery) return true
                        const q = blockedSearchQuery.toLowerCase()
                        const code = (b.country_code || '').toLowerCase()
                        const name = (b.country_name || '').toLowerCase()
                        const reason = (b.reason || '').toLowerCase()
                        return code.includes(q) || name.includes(q) || reason.includes(q)
                      })
                      .map((block) => {
                        const code = (block.country_code || '').toUpperCase().trim()
                        const cObj = ALL_COUNTRIES.find(c => c.code === code)
                        const displayName = cObj ? cObj.name : (block.country_name || code)
                        const flag = getFlagEmoji(code)

                        return (
                          <div
                            key={block._id || code}
                            style={{
                              background: 'var(--card-bg, #ffffff)',
                              border: '1.5px solid #fee2e2',
                              borderRadius: '14px',
                              padding: '18px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '12px',
                              boxShadow: '0 4px 15px rgba(239,68,68,0.06)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '28px', lineHeight: 1 }}>{flag}</span>
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                                    {displayName}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                                      {code}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {cObj?.region || 'Global'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <span style={{
                                background: '#ef4444',
                                color: '#ffffff',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <i className="fas fa-shield-halved"></i> 403 BLOCKED
                              </span>
                            </div>

                            <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#475569', border: '1px solid var(--border-color, #e2e8f0)' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>Policy Reason:</span> {block.reason || 'Geo-restricted policy'}
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                Enforced: {block.created_at || 'Active Edge Policy'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  // Switch to Threat Intel tab with representative IP
                                  const sampleIp = {
                                    CN: '220.181.38.148',
                                    RU: '185.220.101.5',
                                    IR: '5.200.200.200',
                                    KP: '175.45.176.1',
                                    SY: '82.137.200.1',
                                    VN: '113.161.1.1',
                                  }[code] || '8.8.8.8'
                                  setIpInput(sampleIp)
                                  setActiveTab('whois')
                                  handleWhoisLookup(sampleIp)
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#2563eb',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <i className="fas fa-crosshairs"></i> Investigate WHOIS
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveCountryBlock(block.country_code, displayName)}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <i className="fas fa-unlock" style={{ color: '#10b981' }}></i> Unblock
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  /* View 2: Detailed SOC Table View */
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '12px 14px', fontWeight: 700 }}>Country &amp; Flag</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700 }}>ISO Code</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700 }}>Edge Action</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700 }}>Firewall Reason</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700 }}>Timestamp</th>
                          <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countryBlocks
                          .filter(b => {
                            if (!blockedSearchQuery) return true
                            const q = blockedSearchQuery.toLowerCase()
                            const code = (b.country_code || '').toLowerCase()
                            const name = (b.country_name || '').toLowerCase()
                            const reason = (b.reason || '').toLowerCase()
                            return code.includes(q) || name.includes(q) || reason.includes(q)
                          })
                          .map((block) => {
                            const code = (block.country_code || '').toUpperCase().trim()
                            const cObj = ALL_COUNTRIES.find(c => c.code === code)
                            const displayName = cObj ? cObj.name : (block.country_name || code)
                            const flag = getFlagEmoji(code)

                            return (
                              <tr key={block._id || code} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                                <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{flag}</span>
                                    <span style={{ fontSize: '14px' }}>{displayName}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <code style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '5px', fontWeight: 800, fontSize: '12px' }}>
                                    {code}
                                  </code>
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '5px', fontWeight: 800 }}>
                                    403 FORBIDDEN
                                  </span>
                                </td>
                                <td style={{ padding: '14px', color: '#64748b' }}>
                                  {block.reason || 'Geo-restricted policy'}
                                </td>
                                <td style={{ padding: '14px', color: '#64748b', fontSize: '12.5px' }}>
                                  {block.created_at || 'Active Edge Policy'}
                                </td>
                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCountryBlock(block.country_code, displayName)}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATED RATE LIMITING & ATTACK AUTO-BLOCK POLICIES */}
      {/* ========================================================================= */}
      {activeTab === 'autoblock' && (
        <div>
          {/* Status & Sync Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(99, 102, 241, 0.05))',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: securityConfig.auto_block_enabled ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#94a3b8',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                boxShadow: securityConfig.auto_block_enabled ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none'
              }}>
                <i className={securityConfig.auto_block_enabled ? "fas fa-shield-check" : "fas fa-shield-slash"}></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    Automated Offender Defense Engine
                  </h4>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                    background: securityConfig.auto_block_enabled ? '#dcfce7' : '#fee2e2',
                    color: securityConfig.auto_block_enabled ? '#15803d' : '#b91c1c'
                  }}>
                    {securityConfig.auto_block_enabled ? 'ACTIVE & PROTECTING' : 'PAUSED'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                  Automatically detects repeating attackers, brute-force bots, and aggressive crawlers, dropping them at the edge across all your sites.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-satellite-dish" style={{ color: '#10b981' }}></i>
                Real-Time Cloud &amp; Plugin Sync
              </span>
            </div>
          </div>

          {/* Config Alerts */}
          {configSuccessMsg && (
            <div style={{ padding: '12px 18px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
              <span>{configSuccessMsg}</span>
            </div>
          )}
          {configErrorMsg && (
            <div style={{ padding: '12px 18px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
              <span>{configErrorMsg}</span>
            </div>
          )}

          {/* Policy Configuration Form */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 18px', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-sliders-h" style={{ color: '#7c3aed' }}></i>
              Rate Limiting &amp; Threshold Automation Rules
            </h3>

            <form onSubmit={handleSaveSecurityConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                
                {/* 1. Attack Threshold */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
                    <i className="fas fa-skull-crossbones" style={{ color: '#dc2626', marginRight: '6px' }}></i>
                    Attack Attempt Threshold
                  </label>
                  <select
                    value={securityConfig.auto_block_threshold}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, auto_block_threshold: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                      border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-main, #0f172a)', fontSize: '13.5px', fontWeight: 600
                    }}
                  >
                    <option value={3}>3 attack attempts (Extreme Strict)</option>
                    <option value={5}>5 attack attempts (High Security)</option>
                    <option value={10}>10 attack attempts (Recommended Balanced)</option>
                    <option value={15}>15 attack attempts (Standard Protection)</option>
                    <option value={20}>20 attack attempts (Moderate)</option>
                    <option value={30}>30 attack attempts (Permissive)</option>
                  </select>
                  <small style={{ display: 'block', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '4px' }}>
                    Number of blocked attack payloads before the IP is banned.
                  </small>
                </div>

                {/* 2. Detection Time Window */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
                    <i className="fas fa-hourglass-half" style={{ color: '#d97706', marginRight: '6px' }}></i>
                    Evaluation Time Window
                  </label>
                  <select
                    value={securityConfig.auto_block_window_hours}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, auto_block_window_hours: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                      border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-main, #0f172a)', fontSize: '13.5px', fontWeight: 600
                    }}
                  >
                    <option value={1}>Within 1 Hour</option>
                    <option value={6}>Within 6 Hours</option>
                    <option value={12}>Within 12 Hours</option>
                    <option value={24}>Within 24 Hours (Recommended)</option>
                    <option value={168}>Within 7 Days</option>
                  </select>
                  <small style={{ display: 'block', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '4px' }}>
                    Time frame across which attack attempts are aggregated.
                  </small>
                </div>

                {/* 3. Auto-Block Ban Duration */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
                    <i className="fas fa-ban" style={{ color: '#ef4444', marginRight: '6px' }}></i>
                    Auto-Block Action &amp; Duration
                  </label>
                  <select
                    value={securityConfig.auto_block_permanent ? 0 : securityConfig.auto_block_duration_hours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (val === 0) {
                        setSecurityConfig({ ...securityConfig, auto_block_permanent: true, auto_block_duration_hours: 0 })
                      } else {
                        setSecurityConfig({ ...securityConfig, auto_block_permanent: false, auto_block_duration_hours: val })
                      }
                    }}
                    style={{
                      width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                      border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-main, #0f172a)', fontSize: '13.5px', fontWeight: 600
                    }}
                  >
                    <option value={1}>Temporary: 1 Hour Ban</option>
                    <option value={6}>Temporary: 6 Hours Ban</option>
                    <option value={24}>Temporary: 24 Hours Ban (Recommended)</option>
                    <option value={168}>Temporary: 7 Days Ban</option>
                    <option value={720}>Temporary: 30 Days Ban</option>
                    <option value={0}>Permanent Blacklist (Zero Tolerance)</option>
                  </select>
                  <small style={{ display: 'block', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '4px' }}>
                    How long the offending IP remains blocked from accessing all sites.
                  </small>
                </div>

                {/* 4. Per-IP Rate Limiting */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
                    <i className="fas fa-tachometer-alt" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                    Per-IP Rate Limit (Edge Throttling)
                  </label>
                  <select
                    value={securityConfig.rate_limit_per_minute}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, rate_limit_per_minute: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                      border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-main, #0f172a)', fontSize: '13.5px', fontWeight: 600
                    }}
                  >
                    <option value={30}>30 requests / minute (Strict Scraper Shield)</option>
                    <option value={60}>60 requests / minute (Conservative)</option>
                    <option value={120}>120 requests / minute (Normal Recommended)</option>
                    <option value={300}>300 requests / minute (High-Volume Traffic)</option>
                    <option value={600}>600 requests / minute (API Intensive)</option>
                  </select>
                  <small style={{ display: 'block', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '4px' }}>
                    Limits single-IP request velocity before automatic rate limiting triggers.
                  </small>
                </div>
              </div>

              {/* Toggles Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'var(--bg-secondary, #f8fafc)', cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={securityConfig.admin_bruteforce_protection}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, admin_bruteforce_protection: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      WordPress Admin &amp; API Brute-Force Shield
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                      Instantly tracks failed attempts on wp-login.php &amp; xmlrpc.php to auto-ban botnets.
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'var(--bg-secondary, #f8fafc)', cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={securityConfig.ddos_mitigation_enabled}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, ddos_mitigation_enabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      Layer 7 Volumetric DDoS Mitigation
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                      Dynamically drops flood bursts at the edge to protect origin server RAM &amp; CPU.
                    </div>
                  </div>
                </label>
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={savingConfig}
                  style={{
                    height: '44px', padding: '0 24px', borderRadius: '9px',
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)', opacity: savingConfig ? 0.7 : 1
                  }}
                >
                  <i className={savingConfig ? "fas fa-spinner fa-spin" : "fas fa-sync-alt"}></i>
                  <span>{savingConfig ? 'Synchronizing Policy...' : 'Save & Sync Policy Across All Sites'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Auto-Blocked Attackers Live Manager */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-list-alt" style={{ color: '#ef4444' }}></i>
                  Active Auto-Blocked Attacker IPs ({autoBlocksList.length})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                  Offenders automatically isolated by your threshold policy. You can unblock or promote them to permanent blacklist.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search blocked IP or reason..."
                  value={autoBlockSearch}
                  onChange={(e) => setAutoBlockSearch(e.target.value)}
                  style={{
                    height: '36px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                    color: 'var(--text-main, #0f172a)', fontSize: '12.5px', minWidth: '220px'
                  }}
                />
                <button
                  type="button"
                  onClick={fetchAutoBlocks}
                  style={{
                    height: '36px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-secondary, #f8fafc)',
                    color: 'var(--text-main, #0f172a)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-redo-alt" style={{ marginRight: '6px' }}></i>
                  Refresh
                </button>
              </div>
            </div>

            {autoBlockActionMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px', marginBottom: '14px' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '6px', color: '#10b981' }}></i>
                {autoBlockActionMsg}
              </div>
            )}

            {autoBlocksLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted, #64748b)' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                <div>Loading auto-blocked attackers...</div>
              </div>
            ) : autoBlocksList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-color, #cbd5e1)' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 12px' }}>
                  <i className="fas fa-shield-check"></i>
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  No Attacker Currently Auto-Blocked
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)', maxWidth: '420px', marginInline: 'auto' }}>
                  Your auto-block policy is active. When an attacker exceeds your attempt threshold ({securityConfig.auto_block_threshold} attacks in {securityConfig.auto_block_window_hours}h), they will appear here and be banned automatically.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Attacker IP</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Trigger Reason</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Block Type</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Blocked At</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Expires At</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoBlocksList
                      .filter(b => {
                        if (!autoBlockSearch) return true
                        const q = autoBlockSearch.toLowerCase()
                        return (b.ip || '').toLowerCase().includes(q) || (b.reason || '').toLowerCase().includes(q)
                      })
                      .map((item) => (
                        <tr key={item.id || item.ip} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                          <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <code style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '5px', fontWeight: 800 }}>
                                {item.ip}
                              </code>
                              <button
                                type="button"
                                title="Lookup Threat Intel"
                                onClick={() => { setIpInput(item.ip); setActiveTab('whois'); handleWhoisLookup(item.ip); }}
                                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '12px', padding: '2px 4px' }}
                              >
                                <i className="fas fa-radar"></i>
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '14px', color: '#475569' }}>
                            {item.reason}
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span style={{
                              fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '5px',
                              background: item.type === 'permanent' ? '#fef2f2' : '#fefce8',
                              color: item.type === 'permanent' ? '#b91c1c' : '#854d0e',
                              border: `1px solid ${item.type === 'permanent' ? '#fecaca' : '#fef08a'}`
                            }}>
                              {item.type === 'permanent' ? 'PERMANENT' : 'TEMPORARY BAN'}
                            </span>
                          </td>
                          <td style={{ padding: '14px', color: '#64748b', fontSize: '12.5px' }}>
                            {item.blocked_at}
                          </td>
                          <td style={{ padding: '14px', color: '#64748b', fontSize: '12.5px' }}>
                            {item.expires_at}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {item.type !== 'permanent' && (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteAutoBlock(item.ip)}
                                  title="Make this block permanent"
                                  style={{
                                    background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c',
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  <i className="fas fa-lock" style={{ marginRight: '4px' }}></i>
                                  Permanent
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUnblockAutoBlock(item.ip)}
                                style={{
                                  background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a',
                                  padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                <i className="fas fa-unlock" style={{ marginRight: '4px', color: '#10b981' }}></i>
                                Unblock
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CYBER SECURITY AUDIT & PORT DIAGNOSTICS SCANNER */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div>
          {/* URL Input & Scanner Launcher Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-microscope" style={{ color: '#10b981' }}></i>
              Comprehensive Website Security Health &amp; Port Auditor
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Non-intrusive cyber diagnostic: test your SSL/TLS encryption, open port exposure (FTP, SSH, MySQL, Redis, Mongo), security headers, and WordPress admin protection with human-friendly guidance.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleRunAudit(); }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                
                {/* Connected Websites Dropdown (if any) */}
                {connectedWebsites.length > 0 && (
                  <div style={{ minWidth: '200px' }}>
                    <select
                      onChange={(e) => setAuditUrl(e.target.value)}
                      value={auditUrl}
                      style={{
                        width: '100%', height: '46px', padding: '0 12px', borderRadius: '9px',
                        border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--bg-secondary, #f8fafc)',
                        color: 'var(--text-main, #0f172a)', fontSize: '13px', fontWeight: 600
                      }}
                    >
                      <option value="">-- Choose My Website --</option>
                      {connectedWebsites.map(w => (
                        <option key={w._id || w.id || w.domain} value={w.url || w.domain}>
                          {w.name || w.domain} ({w.domain})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* URL Input */}
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <i className="fas fa-globe" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}></i>
                  <input
                    type="text"
                    placeholder="e.g. https://yourwebsite.com or mydomain.com"
                    value={auditUrl}
                    onChange={(e) => setAuditUrl(e.target.value)}
                    style={{
                      width: '100%', height: '46px', padding: '0 16px 0 44px', borderRadius: '9px',
                      border: '1.5px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-main, #0f172a)', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Audit Button */}
                <button
                  type="submit"
                  disabled={auditLoading}
                  style={{
                    height: '46px', padding: '0 24px', borderRadius: '9px',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', opacity: auditLoading ? 0.7 : 1
                  }}
                >
                  <i className={auditLoading ? "fas fa-spinner fa-spin" : "fas fa-play"}></i>
                  <span>{auditLoading ? 'Auditing Security...' : 'Audit Website Security'}</span>
                </button>
              </div>

              {/* Suggestion Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Quick Test:</span>
                {['https://wordpress.org', 'http://localhost', 'https://cloudflare.com'].map(pill => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => { setAuditUrl(pill); handleRunAudit(pill); }}
                    style={{
                      background: 'var(--bg-secondary, #f1f5f9)', border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: 'var(--text-main, #0f172a)',
                      cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Error Alert */}
          {auditError && (
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13.5px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', fontSize: '16px' }}></i>
              <span>{auditError}</span>
            </div>
          )}

          {/* Loading Telemetry Scanner Animation */}
          {auditLoading && (
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                <i className="fas fa-satellite-dish fa-spin"></i>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Running Multi-Vector Security Inspection...
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                Target: <strong>{auditUrl}</strong>
              </p>

              <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: auditProgressStep >= 1 ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  <i className={auditProgressStep >= 1 ? "fas fa-check-circle" : "fas fa-circle"}></i>
                  <span>1. DNS Resolution &amp; Host Identity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: auditProgressStep >= 2 ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  <i className={auditProgressStep >= 2 ? "fas fa-check-circle" : "fas fa-circle"}></i>
                  <span>2. SSL/TLS Certificate Cipher &amp; Expiry</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: auditProgressStep >= 3 ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  <i className={auditProgressStep >= 3 ? "fas fa-check-circle" : "fas fa-circle"}></i>
                  <span>3. HTTP Security Headers (HSTS, CSP, X-Frame)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: auditProgressStep >= 4 ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  <i className={auditProgressStep >= 4 ? "fas fa-check-circle" : "fas fa-circle"}></i>
                  <span>4. Open Service Ports Scan (FTP, SSH, MySQL, Redis)</span>
                </div>
              </div>
            </div>
          )}

          {/* Audit Results Dashboard */}
          {auditResult && !auditLoading && (
            <div>
              {/* Score Header Card */}
              <div className="card" style={{
                padding: '28px', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)',
                background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  
                  {/* Left: Grade Gauge & Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                    <div style={{
                      width: '84px', height: '84px', borderRadius: '22px',
                      background: `linear-gradient(135deg, ${auditResult.grade_color}, #0f172a)`,
                      color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 8px 24px ${auditResult.grade_color}40`
                    }}>
                      <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>{auditResult.grade}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9 }}>GRADE</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                          {auditResult.score}
                        </span>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>/ 100 Score</span>
                        <span style={{
                          fontSize: '12px', fontWeight: 800, padding: '2px 10px', borderRadius: '6px',
                          background: `${auditResult.grade_color}18`, color: auditResult.grade_color
                        }}>
                          {auditResult.verdict}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted, #475569)', maxWidth: '520px' }}>
                        {auditResult.summary_message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Target Metadata & Export */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
                      Target: <strong>{auditResult.hostname}</strong> ({auditResult.ip_address})
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
                      Protection: <span style={{ color: '#10b981', fontWeight: 700 }}>{auditResult.http?.waf_detected}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={handleCopyAuditSummary}
                        style={{
                          height: '34px', padding: '0 14px', borderRadius: '7px',
                          border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-secondary, #f8fafc)',
                          color: 'var(--text-main, #0f172a)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <i className={auditCopied ? "fas fa-check" : "fas fa-copy"}></i>
                        <span>{auditCopied ? 'Copied!' : 'Copy Summary'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color, #f1f5f9)' }}>
                  
                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-lock" style={{ color: '#10b981', marginRight: '5px' }}></i>
                      SSL / TLS Health
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {auditResult.ssl?.supported ? `Grade ${auditResult.ssl?.grade} (${auditResult.ssl?.days_remaining}d left)` : 'No Valid SSL'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-shield-alt" style={{ color: '#3b82f6', marginRight: '5px' }}></i>
                      Security Headers
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {auditResult.http?.header_score}% Hardened
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-network-wired" style={{ color: '#8b5cf6', marginRight: '5px' }}></i>
                      Open Network Ports
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: auditResult.ports?.critical_exposed > 0 ? '#ef4444' : 'var(--text-main, #0f172a)' }}>
                      {auditResult.ports?.open_count} Open ({auditResult.ports?.critical_exposed} Critical)
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-eye" style={{ color: '#d97706', marginRight: '5px' }}></i>
                      Information Leakage
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {auditResult.http?.server_exposure?.length || 0} Headers Disclosed
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-secondary, #f1f5f9)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', maxWidth: '640px' }}>
                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('headers')}
                  style={{
                    flex: 1, height: '36px', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'headers' ? 'var(--card-bg, #ffffff)' : 'transparent',
                    color: auditActiveSubTab === 'headers' ? '#3b82f6' : '#64748b',
                    boxShadow: auditActiveSubTab === 'headers' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i>
                  Security Headers
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('ports')}
                  style={{
                    flex: 1, height: '36px', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'ports' ? 'var(--card-bg, #ffffff)' : 'transparent',
                    color: auditActiveSubTab === 'ports' ? '#8b5cf6' : '#64748b',
                    boxShadow: auditActiveSubTab === 'ports' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <i className="fas fa-network-wired" style={{ marginRight: '6px' }}></i>
                  Ports &amp; Services ({auditResult.ports?.open_count})
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('exposure')}
                  style={{
                    flex: 1, height: '36px', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'exposure' ? 'var(--card-bg, #ffffff)' : 'transparent',
                    color: auditActiveSubTab === 'exposure' ? '#d97706' : '#64748b',
                    boxShadow: auditActiveSubTab === 'exposure' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <i className="fas fa-door-open" style={{ marginRight: '6px' }}></i>
                  Sensitive Paths
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('ssl')}
                  style={{
                    flex: 1, height: '36px', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'ssl' ? 'var(--card-bg, #ffffff)' : 'transparent',
                    color: auditActiveSubTab === 'ssl' ? '#10b981' : '#64748b',
                    boxShadow: auditActiveSubTab === 'ssl' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <i className="fas fa-certificate" style={{ marginRight: '6px' }}></i>
                  SSL / TLS
                </button>
              </div>

              {/* Sub-Tab 1: Security Headers */}
              {auditActiveSubTab === 'headers' && (
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    HTTP Security Response Headers Diagnostic
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {auditResult.http?.headers_evaluation?.map(h => (
                      <div key={h.key} style={{
                        padding: '16px', borderRadius: '10px',
                        border: `1px solid ${h.present ? '#bbf7d0' : '#fed7aa'}`,
                        background: h.present ? '#f0fdf4' : '#fffbeb'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-main, #0f172a)' }}>
                            {h.name}
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px',
                            background: h.present ? '#dcfce7' : '#ffedd5',
                            color: h.present ? '#15803d' : '#c2410c'
                          }}>
                            {h.present ? 'ENFORCED' : 'MISSING'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569' }}>
                          {h.desc}
                        </p>
                        {h.present ? (
                          <div style={{ fontSize: '11.5px', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px', color: '#14532d', wordBreak: 'break-all' }}>
                            Value: <code>{h.value}</code>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11.5px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-magic" style={{ color: '#d97706' }}></i>
                            <span>Fix: {h.fix}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Open Ports & Services */}
              {auditActiveSubTab === 'ports' && (
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    Scanned Ports &amp; Direct Origin Exposure
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {auditResult.ports?.ports?.map(p => (
                      <div key={p.port} style={{
                        padding: '14px', borderRadius: '10px',
                        border: `1px solid ${p.status === 'open' && p.risk === 'critical' ? '#fca5a5' : p.status === 'open' ? '#fed7aa' : '#e2e8f0'}`,
                        background: p.status === 'open' && p.risk === 'critical' ? '#fef2f2' : p.status === 'open' ? '#fffbeb' : 'var(--bg-secondary, #f8fafc)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-main, #0f172a)' }}>
                            Port {p.port} ({p.service})
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px',
                            background: p.status === 'open' ? (p.risk === 'critical' ? '#fee2e2' : '#ffedd5') : '#f1f5f9',
                            color: p.status === 'open' ? (p.risk === 'critical' ? '#b91c1c' : '#c2410c') : '#64748b'
                          }}>
                            {p.status === 'open' ? (p.risk === 'critical' ? 'CRITICAL OPEN' : 'OPEN') : 'CLOSED / FILTERED'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                          {p.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Sensitive Paths */}
              {auditActiveSubTab === 'exposure' && (
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    Sensitive Paths &amp; Admin Endpoint Hardening
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {auditResult.sensitive_paths?.map(item => (
                      <div key={item.path} style={{
                        padding: '14px', borderRadius: '10px',
                        border: `1px solid ${item.exposed ? (item.risk === 'critical' ? '#fca5a5' : '#fed7aa') : '#e2e8f0'}`,
                        background: item.exposed ? (item.risk === 'critical' ? '#fef2f2' : '#fffbeb') : 'var(--bg-secondary, #f8fafc)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
                            {item.name}
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
                            background: item.exposed ? '#fee2e2' : '#dcfce7',
                            color: item.exposed ? '#b91c1c' : '#15803d'
                          }}>
                            {item.exposed ? `EXPOSED (${item.http_status})` : 'PROTECTED'}
                          </span>
                        </div>
                        <code style={{ fontSize: '11.5px', color: '#64748b' }}>{item.path}</code>
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: SSL / TLS */}
              {auditActiveSubTab === 'ssl' && (
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    SSL / TLS Certificate Encryption Diagnostics
                  </h4>
                  {auditResult.ssl?.supported ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      <div style={{ padding: '14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px' }}>
                        <small style={{ color: '#64748b', fontWeight: 700 }}>Certificate Authority (Issuer)</small>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                          {auditResult.ssl?.issuer}
                        </div>
                      </div>
                      <div style={{ padding: '14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px' }}>
                        <small style={{ color: '#64748b', fontWeight: 700 }}>TLS Protocol &amp; Cipher</small>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                          {auditResult.ssl?.tls_version} ({auditResult.ssl?.cipher})
                        </div>
                      </div>
                      <div style={{ padding: '14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px' }}>
                        <small style={{ color: '#64748b', fontWeight: 700 }}>Validity Status</small>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#10b981', marginTop: '2px' }}>
                          {auditResult.ssl?.days_remaining} Days Remaining
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#fef2f2', borderRadius: '10px', color: '#991b1b', fontSize: '13.5px' }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                      {auditResult.ssl?.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
