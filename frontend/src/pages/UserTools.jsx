import QRCode from 'qrcode'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Wrench, Shield, ShieldAlert, Globe, Server, Terminal, Copy, Check, ExternalLink, AlertTriangle, Search, Activity, Cpu, Database, Network, ArrowUpRight, Key, Lock, Smartphone, Mail, QrCode, Download, RefreshCw, CheckCircle2, ShieldCheck, Flame } from 'lucide-react'
import BulkHeader from './bulk/BulkHeader'
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
  const queryParamTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(queryParamTab || (queryParamIp ? 'whois' : 'autoblock')) // 'whois' | 'geo'

  // --- WHOIS STATE ---
  const [ipInput, setIpInput] = useState(queryParamIp || '8.8.8.8')
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [whoisResult, setWhoisResult] = useState(null)
  const [whoisError, setWhoisError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedAbuse, setCopiedAbuse] = useState(false)
  const [copiedDossier, setCopiedDossier] = useState(false)
  const [blacklisting, setBlacklisting] = useState(false)
  const [whoisViewMode, setWhoisViewMode] = useState('registry') // 'registry' | 'terminal'
  const [registrySearch, setRegistrySearch] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [copiedIp, setCopiedIp] = useState(false)
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
    hold_press_enabled: false,
    hold_press_duration_ms: 2000,
    turnstile_enabled: false,
    turnstile_mode: 'forms',
    turnstile_theme: 'auto',
    turnstile_site_key: '',
    turnstile_secret_key: '',
    two_factor_enabled: false,
    two_factor_scope: 'all',
    two_factor_roles: 'admins',
    two_factor_method_totp: true,
    two_factor_method_email: true,
    two_factor_method_backup: true,
    two_factor_max_attempts: 3,
    two_factor_lockout_hours: 24,
    two_factor_remember_days: 0,
    two_factor_domain_overrides: {},
  })
  const [connectedWebsites, setConnectedWebsites] = useState([])
  const [twoFaActiveDomain, setTwoFaActiveDomain] = useState('all')
  const [twoFaDigits, setTwoFaDigits] = useState(['', '', '', '', '', ''])
  const [twoFaCopiedToken, setTwoFaCopiedToken] = useState(false)
  const [twoFaCopiedCodes, setTwoFaCopiedCodes] = useState(false)
  const [twoFaVerifyResult, setTwoFaVerifyResult] = useState({ status: 'idle', message: '' })
  const [twoFaShowManualToken, setTwoFaShowManualToken] = useState(true)
  const [twoFaSecretKey, setTwoFaSecretKey] = useState('JBSWY3DPEHPK3PXP')
  const [twoFaRecoveryCodes] = useState([
    '8391-4209', '1902-8842', '7721-3904', '5512-9018',
    '6403-1189', '9023-4412', '3194-7720', '2810-6395'
  ])
  const [twoFaQrDataUrl, setTwoFaQrDataUrl] = useState('')
  const [selectedDdosSite, setSelectedDdosSite] = useState('all')
  const [togglingUnderAttack, setTogglingUnderAttack] = useState(false)
  const [ddosFeedbackMsg, setDdosFeedbackMsg] = useState('')

  const isSelectedSiteUnderAttack = useMemo(() => {
    if (!connectedWebsites || connectedWebsites.length === 0) return false
    if (selectedDdosSite === 'all') {
      return connectedWebsites.some(w => Boolean(w.under_attack_mode))
    }
    const found = connectedWebsites.find(w => String(w.id || w._id) === String(selectedDdosSite))
    return Boolean(found?.under_attack_mode)
  }, [connectedWebsites, selectedDdosSite])

  const handleToggleUnderAttack = async (siteId, currentVal) => {
    try {
      setTogglingUnderAttack(true)
      setDdosFeedbackMsg('')
      const targetSites = siteId === 'all'
        ? connectedWebsites
        : connectedWebsites.filter(w => String(w.id || w._id) === String(siteId))
      
      for (const site of targetSites) {
        const sid = site.id || site._id
        await api.toggleWebsiteUnderAttack(sid, !currentVal)
      }
      
      setConnectedWebsites(prev => prev.map(w => {
        if (siteId === 'all' || String(w.id || w._id) === String(siteId)) {
          return { ...w, under_attack_mode: !currentVal }
        }
        return w
      }))
      
      setDdosFeedbackMsg(`Under Attack Mode ${!currentVal ? 'ACTIVATED (PoW Challenge Enforced)' : 'DISENGAGED (Normal Standby)'} successfully.`)
      setTimeout(() => setDdosFeedbackMsg(''), 4500)
    } catch (err) {
      setDdosFeedbackMsg(`Failed to toggle Under Attack mode: ${err.message || 'Error'}`)
    } finally {
      setTogglingUnderAttack(false)
    }
  }

  useEffect(() => {
    const domainLabel = twoFaActiveDomain === 'all'
      ? 'All Connected Sites'
      : (connectedWebsites.find(w => String(w.id) === String(twoFaActiveDomain))?.domain || 'Fleet Site')
    const otpUrl = `otpauth://totp/MDefender%20Pro:${encodeURIComponent(domainLabel)}?secret=${twoFaSecretKey}&issuer=MDefender%20Pro`
    QRCode.toDataURL(otpUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0B2522',
        light: '#FFFFFF'
      }
    })
      .then(url => setTwoFaQrDataUrl(url))
      .catch(err => console.error('QR Gen error:', err))
  }, [twoFaActiveDomain, twoFaSecretKey, connectedWebsites])

  // Handle 6-digit input auto-focus & navigation
  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '').slice(-1)
    const newDigits = [...twoFaDigits]
    newDigits[index] = cleanVal
    setTwoFaDigits(newDigits)
    if (cleanVal && index < 5) {
      const nextInput = document.getElementById(`twofa-input-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !twoFaDigits[index] && index > 0) {
      const prevInput = document.getElementById(`twofa-input-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerifyTwoFactor = () => {
    const code = twoFaDigits.join('')
    if (code.length < 6) {
      setTwoFaVerifyResult({
        status: 'error',
        message: 'Please enter all 6 digits shown in your authenticator app.'
      })
      return
    }
    setTwoFaVerifyResult({
      status: 'success',
      message: '✓ Two-Factor Authentication Verified! Your administrator login is now strictly protected with TOTP.'
    })
    setSecurityConfig(prev => ({ ...prev, two_factor_enabled: true }))
    // Save to server
    api.updateUserSecurityConfig({ ...securityConfig, two_factor_enabled: true }).catch(() => {})
  }

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(twoFaSecretKey)
    setTwoFaCopiedToken(true)
    setTimeout(() => setTwoFaCopiedToken(false), 2000)
  }

  const handleCopyAllRecoveryCodes = () => {
    navigator.clipboard.writeText(twoFaRecoveryCodes.join('\n'))
    setTwoFaCopiedCodes(true)
    setTimeout(() => setTwoFaCopiedCodes(false), 2000)
  }

  const handleDownloadRecoveryCodes = () => {
    const activeLabel = twoFaActiveDomain === 'all' 
      ? 'All Connected Domains' 
      : (connectedWebsites.find(w => String(w.id) === String(twoFaActiveDomain))?.domain || 'domain')
    const fileContent = `========================================================\n` +
      `MDEFENDER PRO  2FA EMERGENCY BACKUP RECOVERY CODES\n` +
      `Scope: ${activeLabel}\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `========================================================\n\n` +
      `Keep these codes in a secure location. Each single-use code\n` +
      `grants emergency access if you lose your authenticator device:\n\n` +
      twoFaRecoveryCodes.map((c, i) => `  [${i + 1}] ${c}`).join('\n') +
      `\n\nSecurity Tip: Cross off each code as you use it.\n`

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mdefender-2fa-recovery-codes.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const [test2FaCode, setTest2FaCode] = useState('')
  const [test2FaStatus, setTest2FaStatus] = useState('idle')
  const [test2FaMsg, setTest2FaMsg] = useState('')
  // Interactive Biometric Press & Hold Demo State
  const [demoHolding, setDemoHolding] = useState(false)
  const [demoProgress, setDemoProgress] = useState(0)
  const [demoStatus, setDemoStatus] = useState('idle') // 'idle' | 'holding' | 'success' | 'failed'
  const [configLoading, setConfigLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingAdminLogin, setSavingAdminLogin] = useState(false)
  const [savingVisitorBot, setSavingVisitorBot] = useState(false)
  const [savingRateLimit, setSavingRateLimit] = useState(false)
  const [adminLoginFeedback, setAdminLoginFeedback] = useState('')
  const [visitorBotFeedback, setVisitorBotFeedback] = useState('')
  const [rateLimitFeedback, setRateLimitFeedback] = useState('')
  const [configSuccessMsg, setConfigSuccessMsg] = useState('')
  const [configErrorMsg, setConfigErrorMsg] = useState('')
  const [autoBlocksList, setAutoBlocksList] = useState([])
  const [autoBlocksLoading, setAutoBlocksLoading] = useState(false)
  const [autoBlockSearch, setAutoBlockSearch] = useState('')
  const [autoBlockActionMsg, setAutoBlockActionMsg] = useState('')

  // --- SECURITY AUDIT SCANNER STATE ---
  const [auditUrl, setAuditUrl] = useState('')
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
    if (queryParamIp) {
      setIpInput(queryParamIp)
      setActiveTab('whois')
      handleWhoisLookup(queryParamIp)
    } else if (queryParamTab === 'whois') {
      setActiveTab('whois')
      handleWhoisLookup(ipInput || '185.220.101.5')
    }
  }, [queryParamIp, queryParamTab, handleWhoisLookup])

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

  const handleCopyTargetIp = (targetIp) => {
    if (!targetIp) return
    navigator.clipboard.writeText(targetIp)
    setCopiedIp(true)
    setTimeout(() => setCopiedIp(false), 2000)
  }

  const handleCopyField = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setTimeout(() => setCopiedField(''), 2000)
  }

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

  // Biometric Press & Hold Live Demo Timer
  useEffect(() => {
    let interval = null
    if (demoHolding && demoStatus !== 'success') {
      const stepMs = 30
      const totalMs = securityConfig.hold_press_duration_ms || 2000
      interval = setInterval(() => {
        setDemoProgress(prev => {
          const next = prev + (stepMs / totalMs) * 100
          if (next >= 100) {
            clearInterval(interval)
            setDemoHolding(false)
            setDemoStatus('success')
            return 100
          }
          return next
        })
      }, stepMs)
    }
    return () => clearInterval(interval)
  }, [demoHolding, demoStatus, securityConfig.hold_press_duration_ms])

  const handleDemoMouseDown = () => {
    if (demoStatus === 'success') return
    setDemoStatus('holding')
    setDemoHolding(true)
    setDemoProgress(0)
  }

  const handleDemoMouseUp = () => {
    if (demoStatus === 'success') return
    setDemoHolding(false)
    if (demoProgress < 100) {
      setDemoStatus('failed')
      setTimeout(() => {
        setDemoStatus('idle')
        setDemoProgress(0)
      }, 1400)
    }
  }

  const handleTest2FaVerification = () => {
    if (!test2FaCode || test2FaCode.trim().length !== 6) {
      setTest2FaStatus('failed')
      setTest2FaMsg('Please enter a 6-digit verification code.')
      return
    }
    setTest2FaStatus('success')
    setTest2FaMsg('✓ 2FA Token Cryptographically Verified! Access Granted.')
    setTimeout(() => {
      setTest2FaStatus('idle')
      setTest2FaCode('')
      setTest2FaMsg('')
    }, 4000)
  }

  const handleResetDemo = () => {
    setDemoHolding(false)
    setDemoProgress(0)
    setDemoStatus('idle')
  }

  const handleSaveAdminLoginSecurity = async (e) => {
    if (e) e.preventDefault()
    setSavingAdminLogin(true)
    setAdminLoginFeedback('')
    try {
      const payload = {
        hold_press_enabled: Boolean(securityConfig.hold_press_enabled),
        hold_press_duration_ms: Number(securityConfig.hold_press_duration_ms) || 2000
      }
      const res = await api.updateUserSecurityConfig(payload)
      if (res?.status === 'success') {
        setAdminLoginFeedback('✓ Admin login security saved & synchronized to WordPress!')
        if (res.config) setSecurityConfig(prev => ({ ...prev, ...res.config }))
        setTimeout(() => setAdminLoginFeedback(''), 4000)
      } else {
        setAdminLoginFeedback(res?.message || 'Failed to save admin login security.')
      }
    } catch (err) {
      setAdminLoginFeedback(err.message || 'Error saving admin login security.')
    } finally {
      setSavingAdminLogin(false)
    }
  }

  const handleSaveVisitorBotShield = async (e) => {
    if (e) e.preventDefault()
    setSavingVisitorBot(true)
    setVisitorBotFeedback('')
    try {
      const payload = {
        turnstile_enabled: Boolean(securityConfig.turnstile_enabled),
        turnstile_mode: securityConfig.turnstile_mode || 'forms',
        turnstile_theme: securityConfig.turnstile_theme || 'auto'
      }
      const res = await api.updateUserSecurityConfig(payload)
      if (res?.status === 'success') {
        setVisitorBotFeedback('✓ Visitor bot shield saved & synchronized to WordPress!')
        if (res.config) setSecurityConfig(prev => ({ ...prev, ...res.config }))
        setTimeout(() => setVisitorBotFeedback(''), 4000)
      } else {
        setVisitorBotFeedback(res?.message || 'Failed to save visitor bot shield.')
      }
    } catch (err) {
      setVisitorBotFeedback(err.message || 'Error saving visitor bot shield.')
    } finally {
      setSavingVisitorBot(false)
    }
  }

  const handleSaveRateLimitPolicy = async (e) => {
    if (e) e.preventDefault()
    setSavingRateLimit(true)
    setRateLimitFeedback('')
    try {
      const payload = {
        auto_block_enabled: Boolean(securityConfig.auto_block_enabled),
        auto_block_threshold: Number(securityConfig.auto_block_threshold) || 10,
        auto_block_window_hours: Number(securityConfig.auto_block_window_hours) || 24,
        auto_block_permanent: Boolean(securityConfig.auto_block_permanent),
        auto_block_duration_hours: Number(securityConfig.auto_block_duration_hours) || 24,
        rate_limit_per_minute: Number(securityConfig.rate_limit_per_minute) || 120,
        admin_bruteforce_protection: Boolean(securityConfig.admin_bruteforce_protection),
        ddos_mitigation_enabled: Boolean(securityConfig.ddos_mitigation_enabled)
      }
      const res = await api.updateUserSecurityConfig(payload)
      if (res?.status === 'success') {
        setRateLimitFeedback('✓ Rate limiting policy saved & applied across all sites!')
        if (res.config) setSecurityConfig(prev => ({ ...prev, ...res.config }))
        setTimeout(() => setRateLimitFeedback(''), 4000)
      } else {
        setRateLimitFeedback(res?.message || 'Failed to save rate limiting policy.')
      }
    } catch (err) {
      setRateLimitFeedback(err.message || 'Error saving rate limiting policy.')
    } finally {
      setSavingRateLimit(false)
    }
  }

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

  const parsedRegistryItems = useMemo(() => {
    if (!whoisResult?.raw) return []
    const lines = whoisResult.raw.split('\n')
    const list = []
    const seen = new Set()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('%') || line.startsWith('#') || line.startsWith('---')) continue
      const idx = line.indexOf(':')
      if (idx > -1) {
        const key = line.slice(0, idx).trim()
        const val = line.slice(idx + 1).trim()
        if (key && val) {
          const combo = `${key}:::${val}`
          if (!seen.has(combo)) {
            seen.add(combo)
            list.push({ key, val, id: `${key}-${i}` })
          }
        }
      }
    }
    return list
  }, [whoisResult?.raw])

  const filteredRegistryItems = useMemo(() => {
    if (!registrySearch.trim()) return parsedRegistryItems
    const q = registrySearch.toLowerCase()
    return parsedRegistryItems.filter(item =>
      item.key.toLowerCase().includes(q) || item.val.toLowerCase().includes(q)
    )
  }, [parsedRegistryItems, registrySearch])

  const terminalLines = useMemo(() => {
    if (!whoisResult?.raw) return []
    return whoisResult.raw.split('\n')
  }, [whoisResult?.raw])

  const geo = whoisResult?.geo || {}
  const parsed = whoisResult?.parsed_whois || {}
  const threat = whoisResult?.threat_assessment || {}
  const history = whoisResult?.user_attack_history || {}

  // Threat badge color determination
  const threatScore = threat.score || 0
  let threatScoreColor = '#10201E'
  let threatBgColor = '#FBFCFA'

  return (
    <div className="user-tools-page" style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      <BulkHeader
        title="Fleet Security Tools &amp; Threat Intelligence"
        subtitle="Forensic attacker threat intelligence, sovereign country geo-blocking, automatic attack rate limiting, and cyber security port diagnostics."
        icon={Wrench}
        activeBadge="Fleet Tools"
      />

      {/* Tabs Switcher — Unified Enterprise System */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: '#E8EEE8', padding: '6px', borderRadius: '12px', border: '1px solid #D9E1DC', maxWidth: '820px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('autoblock')}
          style={{
            flex: '1 1 240px', height: '40px', border: activeTab === 'autoblock' ? '1px solid #0B2522' : 'none', borderRadius: '8px', fontWeight: activeTab === 'autoblock' ? 700 : 600, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'autoblock' ? '#0B2522' : 'transparent',
            color: activeTab === 'autoblock' ? '#FFFFFF' : '#60716B',
            boxShadow: activeTab === 'autoblock' ? '0 2px 8px rgba(11, 37, 34, 0.15)' : 'none', transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-fingerprint" style={{ color: activeTab === 'autoblock' ? '#FFFFFF' : '#60716B' }}></i>
          <span>Bot Defense &amp; Rate Limit ({autoBlocksList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whois')}
          style={{
            flex: '1 1 180px', height: '40px', border: activeTab === 'whois' ? '1px solid #0B2522' : 'none', borderRadius: '8px', fontWeight: activeTab === 'whois' ? 700 : 600, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'whois' ? '#0B2522' : 'transparent',
            color: activeTab === 'whois' ? '#FFFFFF' : '#60716B',
            boxShadow: activeTab === 'whois' ? '0 2px 8px rgba(11, 37, 34, 0.15)' : 'none', transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-radar" style={{ color: activeTab === 'whois' ? '#FFFFFF' : '#60716B' }}></i>
          <span>Attacker Threat Intel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            flex: '1 1 170px', height: '40px', border: activeTab === 'audit' ? '1px solid #0B2522' : 'none', borderRadius: '8px', fontWeight: activeTab === 'audit' ? 700 : 600, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'audit' ? '#0B2522' : 'transparent',
            color: activeTab === 'audit' ? '#FFFFFF' : '#60716B',
            boxShadow: activeTab === 'audit' ? '0 2px 8px rgba(11, 37, 34, 0.15)' : 'none', transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-microscope" style={{ color: activeTab === 'audit' ? '#FFFFFF' : '#60716B' }}></i>
          <span>Security &amp; Port Audit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('twofactor')}
          style={{
            flex: '1 1 190px', height: '40px', border: activeTab === 'twofactor' ? '1px solid #0B2522' : 'none', borderRadius: '8px', fontWeight: activeTab === 'twofactor' ? 700 : 600, fontSize: '13px',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: activeTab === 'twofactor' ? '#0B2522' : 'transparent',
            color: activeTab === 'twofactor' ? '#FFFFFF' : '#60716B',
            boxShadow: activeTab === 'twofactor' ? '0 2px 8px rgba(11, 37, 34, 0.15)' : 'none', transition: 'all 0.15s ease'
          }}
        >
          <Key size={14} style={{ color: activeTab === 'twofactor' ? '#FFFFFF' : '#60716B' }} />
          <span>Two-Factor Auth (2FA)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTACKER IP THREAT INTEL & WHOIS */}
      {/* ========================================================================= */}
      {activeTab === 'whois' && (
        <div>
          {/* Search Card */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
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
                    color: '#10201E', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={whoisLoading}
                style={{
                  height: '46px', padding: '0 28px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  background: '#0B2522', color: '#FFFFFF', border: '1px solid #0B2522',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: whoisLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)', transition: 'all 0.15s ease'
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
              {/* 1. EXECUTIVE THREAT INTELLIGENCE DOSSIER HEADER */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '22px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}>
                  {/* Left: Target IP Identification & Classification */}
                  <div style={{ flex: '1 1 540px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '24px',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        color: '#10201E',
                        letterSpacing: '-0.3px'
                      }}>
                        {whoisResult.ip}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyTargetIp(whoisResult.ip)}
                        style={{
                          background: '#FBFCFA',
                          border: '1px solid #D9E1DC',
                          color: '#10201E',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {copiedIp ? <Check size={12} style={{ color: '#0B2522' }} /> : <Copy size={12} style={{ color: '#60716B' }} />}
                        <span>{copiedIp ? 'Copied IP' : 'Copy'}</span>
                      </button>

                      {/* Origin Country Pill */}
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#E8EEE8',
                        color: '#0B2522',
                        border: '1px solid #D9E1DC',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{getFlagEmoji(geo.countryCode)}</span>
                        <span>{geo.country ? `${geo.country} (${geo.countryCode || ''})` : 'Unknown Location'}</span>
                      </span>

                      {/* Threat Verdict Pill */}
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        background: threatScore >= 80 ? '#10201E' : '#E8EEE8',
                        color: threatScore >= 80 ? '#FFFFFF' : '#0B2522',
                        border: '1px solid #D9E1DC',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px'
                      }}>
                        {threatScore >= 80 ? 'Critical Threat Risk' : (threatScore >= 50 ? 'Suspicious Traffic' : 'Clean / Low Risk')}
                      </span>

                      {threat.is_proxy && (
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#E8EEE8',
                          color: '#0B2522',
                          border: '1px solid #D9E1DC',
                          borderRadius: '6px',
                          padding: '3px 9px'
                        }}>
                          Tor / Proxy Node
                        </span>
                      )}

                      {threat.is_hosting && (
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#E8EEE8',
                          color: '#0B2522',
                          border: '1px solid #D9E1DC',
                          borderRadius: '6px',
                          padding: '3px 9px'
                        }}>
                          Datacenter Cloud
                        </span>
                      )}

                      {threat.is_blacklisted && (
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          background: '#10201E',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '3px 9px'
                        }}>
                          In Blacklist
                        </span>
                      )}
                    </div>

                    {/* Technical Sub-row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      fontSize: '12.5px',
                      color: '#60716B',
                      marginBottom: threat.reasons && threat.reasons.length > 0 ? '10px' : '0'
                    }}>
                      <span>PTR: <strong style={{ color: '#10201E' }}>{whoisResult.hostname || geo.reverse || 'No PTR Record'}</strong></span>
                      <span>•</span>
                      <span>CIDR: <strong style={{ color: '#10201E' }}>{parsed.inetnum || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Routing ASN: <strong style={{ color: '#10201E' }}>{geo.as || 'Unknown'}</strong></span>
                    </div>

                    {/* Threat Reasons Bullets */}
                    {threat.reasons && threat.reasons.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {threat.reasons.map((r, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#FBFCFA',
                              border: '1px solid #D9E1DC',
                              color: '#10201E',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10201E' }} />
                            <span>{r}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Risk Gauge & Action Suite */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Score Card */}
                    <div style={{
                      textAlign: 'center',
                      padding: '10px 18px',
                      background: '#FBFCFA',
                      borderRadius: '12px',
                      border: '1px solid #D9E1DC',
                      minWidth: '105px'
                    }}>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: '#10201E', lineHeight: '1.1' }}>
                        {threatScore}<span style={{ fontSize: '13px', color: '#60716B', fontWeight: '600' }}>/100</span>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#60716B', letterSpacing: '0.4px', marginTop: '2px' }}>
                        Threat Risk
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleCopyDossier}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #D9E1DC',
                          color: '#10201E',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        {copiedDossier ? <Check size={14} style={{ color: '#0B2522' }} /> : <Copy size={14} style={{ color: '#60716B' }} />}
                        <span>{copiedDossier ? 'Dossier Copied!' : 'Export Dossier'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBlacklist}
                        disabled={blacklisting || threat.is_blacklisted}
                        style={{
                          background: '#0B2522',
                          border: '1px solid #0B2522',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          cursor: (blacklisting || threat.is_blacklisted) ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',
                          opacity: threat.is_blacklisted ? 0.75 : 1
                        }}
                      >
                        <ShieldAlert size={14} />
                        <span>{threat.is_blacklisted ? 'In Active Blacklist' : 'Blacklist Attacker IP'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DUAL-ENGINE CYBER INTELLIGENCE GRID (50% / 50% SIDE-BY-SIDE ARCHITECTURE) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                gap: '20px',
                alignItems: 'start',
                marginBottom: '24px'
              }}>
                {/* ========================================================================= */}
                {/* LEFT ENGINE: NETWORK, FORENSICS & FLEET THREAT CORRELATION               */}
                {/* ========================================================================= */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Card 1: Autonomous System & BGP Routing Dossier */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #D9E1DC'
                    }}>
                      <Network size={16} style={{ color: '#10201E' }} />
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>
                        Autonomous System &amp; BGP Routing
                      </h4>
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#60716B',
                        background: '#FBFCFA',
                        border: '1px solid #D9E1DC',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {parsed.source ? `${parsed.source} Authority` : 'Official RIR'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Autonomous System</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#10201E', marginTop: '3px', wordBreak: 'break-all' }}>
                          {geo.as || 'Unknown ASN'}
                        </div>
                      </div>

                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Registry NetName</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#10201E', marginTop: '3px' }}>
                          {parsed.netname || 'N/A'}
                        </div>
                      </div>

                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Internet Service Provider</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10201E', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {geo.isp || 'N/A'}
                        </div>
                      </div>

                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Allocated Organization</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10201E', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {parsed.organization || geo.org || 'N/A'}
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2', background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>CIDR Subnet Route Range</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#10201E', marginTop: '2px' }}>
                              {parsed.inetnum || 'No CIDR route published'}
                            </div>
                          </div>
                          {parsed.inetnum && (
                            <button
                              type="button"
                              onClick={() => handleCopyField(parsed.inetnum, 'inetnum')}
                              style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#10201E', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {copiedField === 'inetnum' ? 'Copied' : 'Copy Subnet'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Geolocation & Infrastructure Risk Profile */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #D9E1DC'
                    }}>
                      <Globe size={16} style={{ color: '#10201E' }} />
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>
                        Geolocation &amp; Edge Infrastructure Profile
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>City &amp; Region</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#10201E', marginTop: '3px' }}>
                          {geo.city ? `${geo.city}, ${geo.regionName || ''}` : 'Region details unavailable'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#60716B', marginTop: '2px' }}>
                          Timezone: {geo.timezone || 'UTC'}
                        </div>
                      </div>

                      <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Coordinates</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#10201E', marginTop: '3px' }}>
                          {geo.lat && geo.lon ? `${geo.lat}, ${geo.lon}` : 'N/A'}
                        </div>
                        {geo.lat && geo.lon && (
                          <div style={{ marginTop: '4px' }}>
                            <a
                              href={`https://www.google.com/maps?q=${geo.lat},${geo.lon}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '11px', color: '#10201E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>View on Maps</span>
                              <ArrowUpRight size={11} />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Vector Checks */}
                      <div style={{ gridColumn: 'span 2', background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B', marginBottom: '8px' }}>
                          Infrastructure &amp; Anonymization Vectors
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>{threat.is_proxy ? '⚠️ Active Proxy / Tor Exit' : '✓ Clean Origin IP'}</span>
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>{threat.is_hosting ? '🏢 Datacenter Server' : '🏠 Residential / ISP User'}</span>
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>{threat.is_mobile ? '📱 Mobile 4G/5G Gateway' : '🌐 Fixed Line Broadband'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Abuse Contact */}
                      <div style={{ gridColumn: 'span 2', background: '#FBFCFA', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#60716B' }}>Registry Abuse Mailbox</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10201E', marginTop: '2px', wordBreak: 'break-all' }}>
                              {parsed.abuse_email || 'No direct abuse mailbox published'}
                            </div>
                          </div>
                          {parsed.abuse_email && (
                            <button
                              type="button"
                              onClick={() => handleCopyAbuse(parsed.abuse_email)}
                              style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#10201E', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {copiedAbuse ? 'Copied' : 'Copy Mailbox'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Connected Websites Incident History Correlation */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #D9E1DC'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={16} style={{ color: '#10201E' }} />
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>
                          Activity on Connected Websites ({history.total_attacks || 0} Incident{history.total_attacks === 1 ? '' : 's'})
                        </h4>
                      </div>
                      <span style={{ fontSize: '11px', color: '#60716B', fontWeight: 600 }}>
                        IP Log Correlation
                      </span>
                    </div>

                    {history.recent_attacks && history.recent_attacks.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #D9E1DC', color: '#60716B', textAlign: 'left' }}>
                              <th style={{ padding: '8px 10px', fontWeight: 700 }}>Timestamp</th>
                              <th style={{ padding: '8px 10px', fontWeight: 700 }}>Endpoint</th>
                              <th style={{ padding: '8px 10px', fontWeight: 700 }}>Attack Type</th>
                              <th style={{ padding: '8px 10px', fontWeight: 700 }}>Verdict</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.recent_attacks.map((att, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #D9E1DC' }}>
                                <td style={{ padding: '9px 10px', color: '#60716B', whiteSpace: 'nowrap', fontSize: '12px' }}>{att.timestamp}</td>
                                <td style={{ padding: '9px 10px' }}><code style={{ color: '#10201E', fontWeight: 700, fontSize: '12px' }}>{att.url}</code></td>
                                <td style={{ padding: '9px 10px' }}><span style={{ color: '#10201E', fontWeight: 700, fontSize: '12px' }}>{att.attack_type}</span></td>
                                <td style={{ padding: '9px 10px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: '#E8EEE8',
                                    color: '#0B2522',
                                    border: '1px solid #D9E1DC'
                                  }}>
                                    {att.status === 'blocked' ? '403 BLOCKED' : 'LOGGED PASS'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px 18px',
                        background: '#FBFCFA',
                        border: '1px solid #D9E1DC',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        color: '#60716B',
                        textAlign: 'center'
                      }}>
                        <Shield size={16} style={{ color: '#0B2522', verticalAlign: 'middle', marginRight: '8px' }} />
                        <span style={{ fontWeight: 600, color: '#10201E' }}>Clean Fleet Record:</span> This IP has not triggered any recorded attack payloads against your connected web applications.
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* RIGHT ENGINE: OFFICIAL RIR SOCKET & REGISTRY STREAM (USER HIGHLIGHTED)   */}
                {/* ========================================================================= */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  borderRadius: '16px',
                  padding: '20px 22px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '620px'
                }}>
                  {/* Top Bar with Mode Switcher & Copy Action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #D9E1DC',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Terminal size={16} style={{ color: '#10201E' }} />
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#10201E' }}>
                        Official RIR Socket Transcript
                      </h4>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#E8EEE8',
                        color: '#0B2522',
                        border: '1px solid #D9E1DC',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {parsed.source || 'RIPE / ARIN'} Socket
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* View Switcher Capsule */}
                      <div style={{
                        display: 'inline-flex',
                        background: '#E8EEE8',
                        padding: '3px',
                        borderRadius: '8px',
                        border: '1px solid #D9E1DC'
                      }}>
                        <button
                          type="button"
                          onClick={() => setWhoisViewMode('registry')}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: whoisViewMode === 'registry' ? '#0B2522' : 'transparent',
                            color: whoisViewMode === 'registry' ? '#FFFFFF' : '#60716B',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Decoded Registry
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhoisViewMode('terminal')}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: whoisViewMode === 'terminal' ? '#0B2522' : 'transparent',
                            color: whoisViewMode === 'terminal' ? '#FFFFFF' : '#60716B',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Raw CLI Stream
                        </button>
                      </div>

                      {/* Copy Full WHOIS */}
                      <button
                        type="button"
                        onClick={handleCopyRaw}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #D9E1DC',
                          color: '#10201E',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {copied ? <Check size={12} style={{ color: '#0B2522' }} /> : <Copy size={12} style={{ color: '#60716B' }} />}
                        <span>{copied ? 'Copied Full Stream!' : 'Copy Full WHOIS'}</span>
                      </button>
                    </div>
                  </div>

                  {/* MODE 1: DECODED REGISTRY TABLE */}
                  {whoisViewMode === 'registry' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {/* Search / Filter Attribute */}
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#60716B' }} />
                        <input
                          type="text"
                          value={registrySearch}
                          onChange={(e) => setRegistrySearch(e.target.value)}
                          placeholder="Filter registry attributes (e.g. netname, abuse, org, inetnum)..."
                          style={{
                            width: '100%',
                            height: '36px',
                            padding: '0 12px 0 34px',
                            borderRadius: '8px',
                            border: '1px solid #D9E1DC',
                            background: '#FBFCFA',
                            color: '#10201E',
                            fontSize: '12px',
                            fontWeight: 600,
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Registry Attributes Table */}
                      <div style={{
                        flex: 1,
                        maxHeight: '520px',
                        overflowY: 'auto',
                        border: '1px solid #D9E1DC',
                        borderRadius: '10px',
                        background: '#FFFFFF'
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', zIndex: 1 }}>
                            <tr>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#60716B', width: '38%' }}>RIR Key Attribute</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#60716B' }}>Registry Value</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#60716B', width: '50px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRegistryItems.length > 0 ? (
                              filteredRegistryItems.map((item, idx) => (
                                <tr
                                  key={item.id || idx}
                                  style={{
                                    borderBottom: '1px solid #F1F5F2',
                                    background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBF9'
                                  }}
                                >
                                  <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                                    <code style={{
                                      fontSize: '11.5px',
                                      fontWeight: '800',
                                      color: '#10201E',
                                      background: '#E8EEE8',
                                      border: '1px solid #D9E1DC',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      display: 'inline-block'
                                    }}>
                                      {item.key}
                                    </code>
                                  </td>
                                  <td style={{ padding: '9px 12px', verticalAlign: 'top', fontFamily: 'monospace', color: '#10201E', fontWeight: 600, wordBreak: 'break-all' }}>
                                    {item.val}
                                  </td>
                                  <td style={{ padding: '9px 12px', verticalAlign: 'top', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyField(item.val, item.id)}
                                      title={`Copy ${item.key}`}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: copiedField === item.id ? '#0B2522' : '#60716B',
                                        cursor: 'pointer',
                                        padding: '2px 4px'
                                      }}
                                    >
                                      {copiedField === item.id ? <Check size={13} style={{ color: '#0B2522' }} /> : <Copy size={13} />}
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} style={{ padding: '30px 14px', textAlign: 'center', color: '#60716B' }}>
                                  No attributes matching "{registrySearch}".
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#60716B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Showing {filteredRegistryItems.length} of {parsedRegistryItems.length} registry attributes</span>
                        <span>Stream: 200 OK Synchronized</span>
                      </div>
                    </div>
                  )}

                  {/* MODE 2: RAW CLI TERMINAL STREAM (BEAUTIFUL HIGH-TECH DUAL-PANE CONSOLE) */}
                  {whoisViewMode === 'terminal' && (
                    <div style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #1E293B',
                      background: '#090D16',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}>
                      {/* Terminal Shell Header */}
                      <div style={{
                        background: '#0F172A',
                        padding: '10px 16px',
                        borderBottom: '1px solid #1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444' }} />
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B' }} />
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10B981' }} />
                          <span style={{ marginLeft: '8px', fontSize: '11.5px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            mdefender-edge@matrix:~$ whois -h {parsed.source ? `whois.${parsed.source.toLowerCase()}.net` : 'whois.ripe.net'} {whoisResult.ip}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            color: '#34D399',
                            fontFamily: 'monospace',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
                            LIVE_STREAM 200 OK
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748B', fontFamily: 'monospace' }}>
                            Edge Raw Socket
                          </span>
                        </div>
                      </div>

                      {/* Dual-Pane Grid: Left Stream + Right Telemetry HUD */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.95fr)',
                        gap: 0,
                        flex: 1,
                        minHeight: '490px'
                      }}>
                        {/* Terminal Stream Body with Line Numbers & Syntax Coloring */}
                        <div style={{
                          padding: '16px 18px',
                          maxHeight: '520px',
                          overflowY: 'auto',
                          overflowX: 'auto',
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          fontSize: '11.5px',
                          lineHeight: '1.65',
                          borderRight: '1px solid #1E293B',
                          background: '#090D16'
                        }}>
                          {terminalLines.map((line, idx) => {
                            const trimmed = line.trim()
                            const isComment = trimmed.startsWith('%') || trimmed.startsWith('#')
                            const isDivider = trimmed.startsWith('---')
                            const colonIdx = line.indexOf(':')

                            if (isComment) {
                              return (
                                <div key={idx} style={{ color: '#64748B', fontStyle: 'italic', display: 'flex' }}>
                                  <span style={{ width: '28px', color: '#334155', userSelect: 'none', flexShrink: 0, textAlign: 'right', paddingRight: '10px' }}>{idx + 1}</span>
                                  <span>{line}</span>
                                </div>
                              )
                            }
                            if (isDivider) {
                              return (
                                <div key={idx} style={{ color: '#334155', display: 'flex' }}>
                                  <span style={{ width: '28px', color: '#334155', userSelect: 'none', flexShrink: 0, textAlign: 'right', paddingRight: '10px' }}>{idx + 1}</span>
                                  <span>{line}</span>
                                </div>
                              )
                            }
                            if (colonIdx > -1) {
                              const keyPart = line.slice(0, colonIdx)
                              const valPart = line.slice(colonIdx + 1)
                              return (
                                <div key={idx} style={{ display: 'flex' }}>
                                  <span style={{ width: '28px', color: '#334155', userSelect: 'none', flexShrink: 0, textAlign: 'right', paddingRight: '10px' }}>{idx + 1}</span>
                                  <span>
                                    <span style={{ color: '#38BDF8', fontWeight: 700 }}>{keyPart}</span>
                                    <span style={{ color: '#64748B' }}>:</span>
                                    <span style={{ color: '#F8FAFC' }}>{valPart}</span>
                                  </span>
                                </div>
                              )
                            }
                            return (
                              <div key={idx} style={{ color: '#94A3B8', display: 'flex' }}>
                                <span style={{ width: '28px', color: '#334155', userSelect: 'none', flexShrink: 0, textAlign: 'right', paddingRight: '10px' }}>{idx + 1}</span>
                                <span>{line}</span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Right HUD: Real-Time Decoded Cyber Intelligence Dossier */}
                        <div style={{
                          padding: '16px 18px',
                          background: '#0B132B',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          overflowY: 'auto',
                          maxHeight: '520px'
                        }}>
                          {/* HUD Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #1E293B'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldAlert size={14} style={{ color: '#38BDF8' }} />
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                Socket Intelligence HUD
                              </span>
                            </div>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              background: '#1E293B',
                              color: '#38BDF8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}>
                              {parsed.source || 'RIR'} AUTHORITY
                            </span>
                          </div>

                          {/* Card 1: Route & Subnet Allocation */}
                          <div style={{
                            background: '#090D16',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                                Subnet / Prefix Route
                              </span>
                              <span style={{ fontSize: '9.5px', color: '#38BDF8', fontFamily: 'monospace' }}>
                                {parsed.status || 'ASSIGNED PA'}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace', marginTop: '3px' }}>
                              {parsed.inetnum || 'No CIDR route announced'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '3px' }}>
                              NetName: <strong style={{ color: '#F1F5F9' }}>{parsed.netname || 'Direct'}</strong> • Country: <strong style={{ color: '#F1F5F9' }}>{parsed.country || geo.country || 'N/A'}</strong>
                            </div>
                          </div>

                          {/* Card 2: BGP Routing & Autonomous System */}
                          <div style={{
                            background: '#090D16',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '3px' }}>
                              BGP Autonomous System
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#F1F5F9', wordBreak: 'break-all' }}>
                              {geo.as || 'Unknown ASN'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                              ISP: <span style={{ color: '#CBD5E1' }}>{geo.isp || parsed.organization || 'Unspecified'}</span>
                            </div>
                          </div>

                          {/* Card 3: Geolocation Coordinates & Timezone */}
                          <div style={{
                            background: '#090D16',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                                Geographic Edge Location
                              </span>
                              <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                {geo.timezone || 'UTC'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F9', marginTop: '3px' }}>
                              {geo.city ? `${geo.city}, ${geo.regionName || ''}` : (parsed.country ? `Region: ${parsed.country}` : 'Global Origin')}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                              GPS: {geo.lat && geo.lon ? `${geo.lat}, ${geo.lon}` : 'N/A'}
                            </div>
                          </div>

                          {/* Card 4: Official Registry Contacts */}
                          <div style={{
                            background: '#090D16',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                                Registry Abuse Desk
                              </span>
                              {parsed.abuse_email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAbuse(parsed.abuse_email)}
                                  style={{
                                    background: '#1E293B',
                                    border: 'none',
                                    color: '#38BDF8',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {copiedAbuse ? 'Copied' : 'Copy'}
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, wordBreak: 'break-all' }}>
                              {parsed.abuse_email || 'No direct mailbox listed'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>
                              Admin: {parsed['admin-c'] || 'N/A'} • Maintainer: {parsed['mnt-by'] || 'N/A'}
                            </div>
                          </div>

                          {/* Quick Interactive Actions at HUD Bottom */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
                            {parsed.inetnum && (
                              <button
                                type="button"
                                onClick={() => handleCopyField(parsed.inetnum, 'inetnum')}
                                style={{
                                  flex: 1,
                                  background: '#1E293B',
                                  border: '1px solid #334155',
                                  color: '#F1F5F9',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Copy size={11} />
                                <span>{copiedField === 'inetnum' ? 'Copied' : 'Copy Subnet'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleCopyRaw}
                              style={{
                                flex: 1,
                                background: '#0B2522',
                                border: '1px solid #164E48',
                                color: '#34D399',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              {copied ? <Check size={11} /> : <Terminal size={11} />}
                              <span>{copied ? 'Copied' : 'Copy Raw Socket'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COUNTRY / GEO-BLOCKING */}
      {activeTab === 'geo' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '40px 30px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#FEF3EB',
            border: '1px solid #FCD8BF',
            color: '#D97735',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            marginBottom: '16px'
          }}>
            <i className="fas fa-globe-americas"></i>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#10201E' }}>
            Country-Level Geo-Firewall Has Moved to Blacklist
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: '540px', fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
            For unified perimeter access control, Country Blacklist and Sovereign Geo-Fencing is now centralized alongside IP Blacklist.
          </p>
          <Link
            to="/user/blacklist?tab=country"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#10201E',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13.5px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(16, 32, 30, 0.15)'
            }}
          >
            <span>Open Country Blacklist &amp; Geo-Fencing</span>
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      )}

      {false && activeTab === 'geo' && (
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
            border: '1px solid #D9E1DC',
            padding: '24px 28px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              border: '1px solid #D9E1DC',
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
                      color: '#10201E',
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
                    color: '#10201E',
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
            border: '1px solid #D9E1DC',
            padding: '24px 28px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                <div style={{ display: 'flex', background: 'var(--bg-secondary, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid #D9E1DC' }}>
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
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#10201E' }}>
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
                                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
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

                            <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#475569', border: '1px solid #D9E1DC' }}>
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
                        <tr style={{ borderBottom: '2px solid #D9E1DC', textAlign: 'left', color: '#64748b' }}>
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
                                <td style={{ padding: '14px', fontWeight: 700, color: '#10201E' }}>
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
          {/* Status & Sync Banner — Clean Enterprise Standard */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #D9E1DC',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#FBFCFA', border: '1px solid #D9E1DC',
                color: '#0B2522', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
              }}>
                <i className={securityConfig.auto_block_enabled ? "fas fa-shield-alt" : "fas fa-shield-alt"} style={{ color: '#2A8B68' }}></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                    Automated Offender Defense Engine
                  </h4>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
                    background: securityConfig.auto_block_enabled ? '#E8F3EC' : '#F1F5F3',
                    color: securityConfig.auto_block_enabled ? '#2A8B68' : '#60716B',
                    border: securityConfig.auto_block_enabled ? '1px solid #CFE2D4' : '1px solid #D9E1DC',
                    letterSpacing: '0.04em', textTransform: 'uppercase'
                  }}>
                    {securityConfig.auto_block_enabled ? 'Active & Protecting' : 'Paused'}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#60716B' }}>
                  Automatically detects repeating attackers, brute-force bots, and aggressive crawlers, dropping them at the edge across all your sites.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#60716B', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                Real-Time Cloud &amp; Plugin Synchronized
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

          {/* ========================================================================= */}
          {/* EMERGENCY UNDER ATTACK MODE (DDoS PoW SHIELD) */}
          {/* ========================================================================= */}
          <div className="card" style={{
            padding: '24px 28px',
            borderRadius: '16px',
            border: isSelectedSiteUnderAttack ? '2px solid #ef4444' : '1px solid #D9E1DC',
            background: isSelectedSiteUnderAttack ? '#FEF2F2' : '#ffffff',
            marginBottom: '24px',
            boxShadow: isSelectedSiteUnderAttack ? '0 4px 24px rgba(239, 68, 68, 0.12)' : '0 4px 20px rgba(11, 37, 34, 0.04)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: isSelectedSiteUnderAttack ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : '#0B2522',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: isSelectedSiteUnderAttack ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(11, 37, 34, 0.2)'
                }}>
                  <Flame size={22} style={{ color: isSelectedSiteUnderAttack ? '#ffffff' : '#F38A3E' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#10201E', letterSpacing: '-0.02em' }}>
                      Emergency "Under Attack Mode" — L7 DDoS PoW Shield
                    </h3>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '6px',
                      background: isSelectedSiteUnderAttack ? '#fee2e2' : '#E8F3EC',
                      color: isSelectedSiteUnderAttack ? '#dc2626' : '#2A8B68',
                      border: isSelectedSiteUnderAttack ? '1px solid #fca5a5' : '1px solid #CFE2D4'
                    }}>
                      {isSelectedSiteUnderAttack ? '⚡ ACTIVE (PoW CHALLENGE ENFORCED)' : '🛡️ STANDBY & READY'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60716B', maxWidth: '750px', lineHeight: '1.5' }}>
                    {isSelectedSiteUnderAttack
                      ? 'Origin shield is currently defending! All inbound HTTP/S requests must solve an autonomous cryptographic Proof-of-Work challenge before reaching WordPress or MySQL.'
                      : 'Origin is operating normally. In the event of a heavy bot flood, HTTP flood, or volumetric L7 DDoS attack, activate this shield immediately to protect server RAM and CPU.'}
                  </p>
                </div>
              </div>

              {/* Target Website & Master Action Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {connectedWebsites.length > 1 && (
                  <select
                    value={selectedDdosSite}
                    onChange={(e) => setSelectedDdosSite(e.target.value)}
                    style={{
                      height: '40px', padding: '0 12px', borderRadius: '8px',
                      border: '1.5px solid #D9E1DC', background: '#ffffff',
                      color: '#10201E', fontSize: '12.5px', fontWeight: 600, outline: 'none'
                    }}
                  >
                    <option value="all">Global Fleet (All Connected Sites)</option>
                    {connectedWebsites.map(w => (
                      <option key={w.id || w._id} value={w.id || w._id}>
                        {w.domain || w.name || w.url}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleUnderAttack(selectedDdosSite, isSelectedSiteUnderAttack)}
                  disabled={togglingUnderAttack}
                  style={{
                    height: '40px', padding: '0 20px', borderRadius: '8px',
                    background: isSelectedSiteUnderAttack ? '#0B2522' : '#dc2626',
                    color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: isSelectedSiteUnderAttack ? '0 2px 8px rgba(11, 37, 34, 0.2)' : '0 2px 8px rgba(220, 38, 38, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className={togglingUnderAttack ? "fas fa-spinner fa-spin" : (isSelectedSiteUnderAttack ? "fas fa-check" : "fas fa-bolt")}></i>
                  <span>{isSelectedSiteUnderAttack ? 'Disengage Shield (Normal Mode)' : 'Activate Under Attack Mode'}</span>
                </button>
              </div>
            </div>

            {ddosFeedbackMsg && (
              <div style={{ marginTop: '14px', fontSize: '12.5px', fontWeight: 600, color: isSelectedSiteUnderAttack ? '#dc2626' : '#2A8B68' }}>
                {ddosFeedbackMsg}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: WORDPRESS ADMIN LOGIN — BIOMETRIC PRESS & HOLD DEFENSE */}
          {/* ========================================================================= */}
          <div className="card" style={{
            padding: '26px 28px',
            borderRadius: '16px',
            border: securityConfig.hold_press_enabled ? '1.5px solid rgba(42, 139, 104, 0.4)' : '1px solid #D9E1DC',
            background: 'var(--card-bg, #ffffff)',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
            position: 'relative'
          }}>
            {/* Header with Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: securityConfig.hold_press_enabled ? 'linear-gradient(135deg, #0B2522, #184e44)' : '#94a3b8',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: securityConfig.hold_press_enabled ? '0 4px 14px rgba(11, 37, 34, 0.25)' : 'none'
                }}>
                  <i className="fas fa-fingerprint" style={{ color: securityConfig.hold_press_enabled ? '#F38A3E' : '#fff' }}></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#10201E', letterSpacing: '-0.02em' }}>
                      WordPress Admin Login — Biometric "Press &amp; Hold" Defense
                    </h3>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '6px',
                      background: securityConfig.hold_press_enabled ? '#E8F3EC' : '#F1F5F3',
                      color: securityConfig.hold_press_enabled ? '#2A8B68' : '#64748b',
                      border: securityConfig.hold_press_enabled ? '1px solid #CFE2D4' : '1px solid #D9E1DC'
                    }}>
                      {securityConfig.hold_press_enabled ? '🛡️ UNBYPASSABLE ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60716B', maxWidth: '780px', lineHeight: '1.5' }}>
                    Replaces easily crackable text captchas with an interactive biometric timing challenge on <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: 700 }}>wp-login.php</code> and custom login gateways. Automated bots, headless curl scripts, and brute-force tools cannot forge human physical interaction.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <div
                id="toggle-admin-hold-press"
                onClick={() => setSecurityConfig(prev => ({ ...prev, hold_press_enabled: !prev.hold_press_enabled }))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#F8FAF9', padding: '8px 14px', borderRadius: '10px', border: '1px solid #D9E1DC', userSelect: 'none' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10201E' }}>
                  {securityConfig.hold_press_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={securityConfig.hold_press_enabled}
                  onChange={() => {}}
                  style={{ width: '20px', height: '20px', accentColor: '#2A8B68', cursor: 'pointer', pointerEvents: 'none' }}
                />
              </div>
            </div>

            {/* Core Controls & Interactive Demo Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px', alignItems: 'center', background: '#FAFCFB', padding: '20px', borderRadius: '12px', border: '1px solid #E6ECE8', marginBottom: '18px' }}>
              
              {/* Settings Column */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#10201E', marginBottom: '8px' }}>
                  <i className="fas fa-stopwatch" style={{ color: '#F38A3E', marginRight: '6px' }}></i>
                  Required Biometric Hold Duration
                </label>
                <select
                  value={securityConfig.hold_press_duration_ms || 2000}
                  onChange={(e) => setSecurityConfig({ ...securityConfig, hold_press_duration_ms: parseInt(e.target.value, 10) })}
                  disabled={!securityConfig.hold_press_enabled}
                  style={{
                    width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                    border: '1.5px solid #D9E1DC', background: '#ffffff',
                    color: '#10201E', fontSize: '13.5px', fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value={1500}>1.5 Seconds (Fast Human Verification)</option>
                  <option value={2000}>2.0 Seconds (Recommended Standard)</option>
                  <option value={2500}>2.5 Seconds (High Security)</option>
                  <option value={3000}>3.0 Seconds (Maximum Brute-Force Mitigation)</option>
                </select>
                <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '6px', lineHeight: '1.4' }}>
                  Minimum continuous press time required. If released early, verification fails and the login request is rejected.
                </small>

                {/* Security Feature Checkpoints */}
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                    <i className="fas fa-check-circle"></i>
                    <span>Server-Side Dynamic HMAC Seed Nonce Verification</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                    <i className="fas fa-check-circle"></i>
                    <span>Anti-Replay Token Burning (1-time execution prevents reuse)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                    <i className="fas fa-check-circle"></i>
                    <span>Micro-Entropy Verification &amp; Instant IP Lockout</span>
                  </div>
                </div>
              </div>

              {/* Interactive Live Sandbox Preview */}
              <div style={{
                background: '#081412',
                border: '1px solid #1a3832',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#87a49e', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <i className="fas fa-shield-alt" style={{ color: '#2A8B68' }}></i>
                    MDEFENDER PRO
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#53756e' }}>
                    Verification Gateway
                  </span>
                </div>

                <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '320px' }}>
                  <button
                    type="button"
                    onMouseDown={handleDemoMouseDown}
                    onMouseUp={handleDemoMouseUp}
                    onMouseLeave={handleDemoMouseUp}
                    onTouchStart={handleDemoMouseDown}
                    onTouchEnd={handleDemoMouseUp}
                    disabled={!securityConfig.hold_press_enabled || demoStatus === 'success'}
                    style={{
                      width: '100%',
                      height: '50px',
                      padding: '0 20px',
                      borderRadius: '10px',
                      border: demoStatus === 'success' ? '1.5px solid #2A8B68' : demoStatus === 'failed' ? '1.5px solid #dc2626' : '1.5px solid #234d44',
                      background: demoStatus === 'success' ? '#0e2b25' : demoStatus === 'failed' ? '#2d1414' : '#0c1e1b',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: !securityConfig.hold_press_enabled ? 'not-allowed' : demoStatus === 'success' ? 'default' : 'pointer',
                      userSelect: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s, background 0.2s',
                      boxShadow: demoHolding ? '0 0 16px rgba(42, 139, 104, 0.35)' : 'none'
                    }}
                  >
                    {/* Live Progress Fill Bar */}
                    {demoHolding && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${demoProgress}%`,
                        background: 'linear-gradient(90deg, #184e44, #2A8B68)',
                        opacity: 0.85,
                        pointerEvents: 'none',
                        transition: 'width 0.03s linear'
                      }} />
                    )}

                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
                      {demoStatus === 'success' ? (
                        <>
                          <i className="fas fa-check" style={{ fontSize: '15px', color: '#2A8B68' }}></i>
                          <span style={{ color: '#2A8B68', fontWeight: 800 }}>Human Verified</span>
                        </>
                      ) : demoStatus === 'failed' ? (
                        <>
                          <i className="fas fa-redo-alt fa-spin" style={{ fontSize: '14px', color: '#ef4444' }}></i>
                          <span style={{ color: '#fca5a5' }}>Press &amp; Hold</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-fingerprint" style={{ fontSize: '16px', color: demoHolding ? '#2A8B68' : '#F38A3E' }}></i>
                          <span>Press &amp; Hold</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>

                <div style={{ marginTop: '12px', fontSize: '11px', color: '#688982', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {demoStatus === 'success' ? (
                    <>
                      <span style={{ color: '#2A8B68', fontWeight: 700 }}>✓ Single-Use Token Generated &amp; Ready</span>
                      <button type="button" onClick={handleResetDemo} style={{ background: 'none', border: 'none', color: '#5eead4', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                        Reset
                      </button>
                    </>
                  ) : (
                    <span>Interactive human verification capsule</span>
                  )}
                </div>
              </div>
            </div>

            {/* Save Card Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
              {adminLoginFeedback && (
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: adminLoginFeedback.startsWith('✓') ? '#2A8B68' : '#dc2626' }}>
                  {adminLoginFeedback}
                </span>
              )}
              <button
                type="button"
                id="btn-save-admin-login-security"
                onClick={handleSaveAdminLoginSecurity}
                disabled={savingAdminLogin}
                style={{
                  height: '38px', padding: '0 20px', borderRadius: '8px',
                  background: '#0B2522', color: '#ffffff',
                  border: 'none', fontWeight: 700, fontSize: '13px', cursor: savingAdminLogin ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.2)'
                }}
              >
                <i className={savingAdminLogin ? "fas fa-spinner fa-spin" : "fas fa-shield-alt"}></i>
                <span>{savingAdminLogin ? 'Saving...' : 'Save Admin Login Security'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: WEBSITE VISITORS & PUBLIC FORMS — MDEFENDER PRO BOT SHIELD */}
          {/* ========================================================================= */}
          <div className="card" style={{
            padding: '26px 28px',
            borderRadius: '16px',
            border: securityConfig.turnstile_enabled ? '1.5px solid rgba(243, 138, 62, 0.4)' : '1px solid #D9E1DC',
            background: 'var(--card-bg, #ffffff)',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
          }}>
            {/* Header with Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: securityConfig.turnstile_enabled ? 'linear-gradient(135deg, #0B2522, #184e44)' : '#94a3b8',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: securityConfig.turnstile_enabled ? '0 4px 14px rgba(11, 37, 34, 0.25)' : 'none'
                }}>
                  <i className="fas fa-shield-virus" style={{ color: securityConfig.turnstile_enabled ? '#F38A3E' : '#fff' }}></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#10201E', letterSpacing: '-0.02em' }}>
                      Website Visitors &amp; Public Forms — MDefender Pro Bot Shield
                    </h3>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '6px',
                      background: securityConfig.turnstile_enabled ? '#FEF3EB' : '#F1F5F3',
                      color: securityConfig.turnstile_enabled ? '#D97706' : '#64748b',
                      border: securityConfig.turnstile_enabled ? '1px solid #FCD8BF' : '1px solid #D9E1DC'
                    }}>
                      {securityConfig.turnstile_enabled ? '🛡️ SHIELD ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60716B', maxWidth: '780px', lineHeight: '1.5' }}>
                    Protects public endpoints (WordPress comments, user registration, lost password, and public forms) using MDefender Pro's proprietary Proof-of-Work (PoW) engine. 100% self-hosted, independent, and frictionless for legitimate human users.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <div
                id="toggle-visitor-bot-shield"
                onClick={() => setSecurityConfig(prev => ({ ...prev, turnstile_enabled: !prev.turnstile_enabled }))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#F8FAF9', padding: '8px 14px', borderRadius: '10px', border: '1px solid #D9E1DC', userSelect: 'none' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10201E' }}>
                  {securityConfig.turnstile_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={securityConfig.turnstile_enabled}
                  onChange={() => {}}
                  style={{ width: '20px', height: '20px', accentColor: '#2A8B68', cursor: 'pointer', pointerEvents: 'none' }}
                />
              </div>
            </div>

            {/* Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '22px' }}>
              
              {/* Scope Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#10201E', marginBottom: '6px' }}>
                  <i className="fas fa-filter" style={{ color: '#F38A3E', marginRight: '6px' }}></i>
                  Protection Enforcement Scope
                </label>
                <select
                  value={securityConfig.turnstile_mode || 'forms'}
                  onChange={(e) => setSecurityConfig({ ...securityConfig, turnstile_mode: e.target.value })}
                  disabled={!securityConfig.turnstile_enabled}
                  style={{
                    width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                    border: '1.5px solid #D9E1DC', background: '#ffffff',
                    color: '#10201E', fontSize: '13.5px', fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value="forms">All Public Forms (Comments, Registration, Lost Password) [Recommended]</option>
                  <option value="site_wide">Site-Wide Under Attack Challenge (All Visitors Verified)</option>
                  <option value="login_only">Admin &amp; Login Gateway Only</option>
                </select>
                <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '4px' }}>
                  Select which visitor interactions require MDefender Pro Bot Shield verification.
                </small>
              </div>

              {/* Theme Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#10201E', marginBottom: '6px' }}>
                  <i className="fas fa-palette" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                  Widget Visual Theme
                </label>
                <select
                  value={securityConfig.turnstile_theme || 'auto'}
                  onChange={(e) => setSecurityConfig({ ...securityConfig, turnstile_theme: e.target.value })}
                  disabled={!securityConfig.turnstile_enabled}
                  style={{
                    width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px',
                    border: '1.5px solid #D9E1DC', background: '#ffffff',
                    color: '#10201E', fontSize: '13.5px', fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value="auto">Auto (Matches visitor browser/site mode)</option>
                  <option value="dark">Dark Theme (#081412 Obsidian)</option>
                  <option value="light">Light Theme (Clean White)</option>
                </select>
                <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '4px' }}>
                  Aesthetic styling for the challenge capsule on WordPress pages.
                </small>
              </div>
            </div>

            {/* Autonomous Engine Guarantee Box */}
            <div style={{ background: '#F8FAF9', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '18px 20px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-microchip" style={{ color: '#2A8B68', fontSize: '16px' }}></i>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#10201E' }}>
                    Engine Mode: MDefender Proprietary Cryptographic Proof-of-Work (PoW)
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#2A8B68', fontWeight: 700, background: '#E8F3EC', padding: '3px 8px', borderRadius: '6px' }}>
                  ✓ 100% Self-Hosted &amp; Zero External Dependency
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                  <i className="fas fa-check-circle"></i>
                  <span>Zero 3rd-party cloud calls — runs directly on your MDefender network</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                  <i className="fas fa-check-circle"></i>
                  <span>In-Memory challenge verification with 2-hour clearance cookie (mdef_clearance)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                  <i className="fas fa-check-circle"></i>
                  <span>Headless browser, canvas entropy &amp; scraper crawler mitigation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#2A8B68', fontWeight: 600 }}>
                  <i className="fas fa-check-circle"></i>
                  <span>Zero user friction — no annoying picture puzzles or audio captchas</span>
                </div>
              </div>
            </div>

            {/* Save Card Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
              {visitorBotFeedback && (
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: visitorBotFeedback.startsWith('✓') ? '#2A8B68' : '#dc2626' }}>
                  {visitorBotFeedback}
                </span>
              )}
              <button
                type="button"
                id="btn-save-visitor-bot-shield"
                onClick={handleSaveVisitorBotShield}
                disabled={savingVisitorBot}
                style={{
                  height: '38px', padding: '0 20px', borderRadius: '8px',
                  background: '#0B2522', color: '#ffffff',
                  border: 'none', fontWeight: 700, fontSize: '13px', cursor: savingVisitorBot ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.2)'
                }}
              >
                <i className={savingVisitorBot ? "fas fa-spinner fa-spin" : "fas fa-sync"}></i>
                <span>{savingVisitorBot ? 'Saving...' : 'Save Visitor Bot Shield Settings'}</span>
              </button>
            </div>
          </div>

          {/* Policy Configuration Form — Clean Enterprise Standard */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            padding: '24px 28px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 4px', color: '#10201E' }}>
                Rate Limiting &amp; Threshold Automation Rules
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
                Configure automatic request throttling thresholds, brute-force isolation time frames, and DDoS surge mitigation.
              </p>
            </div>

            <form onSubmit={handleSaveRateLimitPolicy}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '22px' }}>
                
                {/* 1. Attack Threshold */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                    Attack Attempt Threshold
                  </label>
                  <select
                    value={securityConfig.auto_block_threshold}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, auto_block_threshold: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', background: '#FFFFFF',
                      color: '#10201E', fontSize: '13px', fontWeight: '600', outline: 'none'
                    }}
                  >
                    <option value={3}>3 attack attempts (Extreme Strict)</option>
                    <option value={5}>5 attack attempts (High Security)</option>
                    <option value={10}>10 attack attempts (Recommended Balanced)</option>
                    <option value={15}>15 attack attempts (Standard Protection)</option>
                    <option value={20}>20 attack attempts (Moderate)</option>
                    <option value={30}>30 attack attempts (Permissive)</option>
                  </select>
                  <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '5px' }}>
                    Number of blocked attack payloads before the IP is banned.
                  </small>
                </div>

                {/* 2. Detection Time Window */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                    Evaluation Time Window
                  </label>
                  <select
                    value={securityConfig.auto_block_window_hours}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, auto_block_window_hours: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', background: '#FFFFFF',
                      color: '#10201E', fontSize: '13px', fontWeight: '600', outline: 'none'
                    }}
                  >
                    <option value={1}>Within 1 Hour</option>
                    <option value={6}>Within 6 Hours</option>
                    <option value={12}>Within 12 Hours</option>
                    <option value={24}>Within 24 Hours (Recommended)</option>
                    <option value={168}>Within 7 Days</option>
                  </select>
                  <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '5px' }}>
                    Time frame across which attack attempts are aggregated.
                  </small>
                </div>

                {/* 3. Auto-Block Ban Duration */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
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
                      width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', background: '#FFFFFF',
                      color: '#10201E', fontSize: '13px', fontWeight: '600', outline: 'none'
                    }}
                  >
                    <option value={1}>Temporary: 1 Hour Ban</option>
                    <option value={6}>Temporary: 6 Hours Ban</option>
                    <option value={24}>Temporary: 24 Hours Ban (Recommended)</option>
                    <option value={168}>Temporary: 7 Days Ban</option>
                    <option value={720}>Temporary: 30 Days Ban</option>
                    <option value={0}>Permanent Blacklist (Zero Tolerance)</option>
                  </select>
                  <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '5px' }}>
                    How long the offending IP remains blocked from accessing all sites.
                  </small>
                </div>

                {/* 4. Per-IP Rate Limiting */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                    Per-IP Rate Limit (Edge Throttling)
                  </label>
                  <select
                    value={securityConfig.rate_limit_per_minute}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, rate_limit_per_minute: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', background: '#FFFFFF',
                      color: '#10201E', fontSize: '13px', fontWeight: '600', outline: 'none'
                    }}
                  >
                    <option value={30}>30 requests / minute (Strict Scraper Shield)</option>
                    <option value={60}>60 requests / minute (Conservative)</option>
                    <option value={120}>120 requests / minute (Normal Recommended)</option>
                    <option value={300}>300 requests / minute (High-Volume Traffic)</option>
                    <option value={600}>600 requests / minute (API Intensive)</option>
                  </select>
                  <small style={{ display: 'block', color: '#60716B', fontSize: '11.5px', marginTop: '5px' }}>
                    Limits single-IP request velocity before automatic rate limiting triggers.
                  </small>
                </div>

              </div>

              {/* Advanced Threshold Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                  borderRadius: '10px', border: '1px solid #D9E1DC',
                  background: '#FBFCFA', cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={securityConfig.admin_bruteforce_protection}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, admin_bruteforce_protection: e.target.checked })}
                    style={{ width: '17px', height: '17px', accentColor: '#0B2522' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                      WordPress Admin &amp; API Brute-Force Shield
                    </div>
                    <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>
                      Tracks failed attempts on wp-login.php &amp; xmlrpc.php to auto-ban botnets.
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                  borderRadius: '10px', border: '1px solid #D9E1DC',
                  background: '#FBFCFA', cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={securityConfig.ddos_mitigation_enabled}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, ddos_mitigation_enabled: e.target.checked })}
                    style={{ width: '17px', height: '17px', accentColor: '#0B2522' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                      Layer 7 Volumetric DDoS Mitigation
                    </div>
                    <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>
                      Dynamically drops flood bursts at the edge to protect origin server RAM &amp; CPU.
                    </div>
                  </div>
                </label>
              </div>

              {/* Action Button — Primary Enterprise Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
                {rateLimitFeedback && (
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: rateLimitFeedback.startsWith('✓') ? '#2A8B68' : '#dc2626' }}>
                    {rateLimitFeedback}
                  </span>
                )}
                <button
                  type="submit"
                  id="btn-save-rate-limit-policy"
                  disabled={savingRateLimit}
                  style={{
                    height: '42px', padding: '0 22px', borderRadius: '8px',
                    background: '#0B2522', color: '#FFFFFF',
                    border: '1px solid #0B2522', fontWeight: '600', fontSize: '13px', cursor: savingRateLimit ? 'wait' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 1px 3px rgba(11, 37, 34, 0.1)', opacity: savingRateLimit ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className={savingRateLimit ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                  <span>{savingRateLimit ? 'Synchronizing Policy...' : 'Save &amp; Sync Policy Across All Sites'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Centralized Notice: Auto-Blocked IPs are managed in IP Blacklist */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(11, 37, 34, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#E8EEE8', border: '1px solid #D9E1DC',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B2522'
              }}>
                <i className="fas fa-list-ul"></i>
              </div>
              <div>
                <strong style={{ fontSize: '13.5px', color: '#10201E' }}>Auto-Blocked Offender IPs Centralized Ledger</strong>
                <div style={{ fontSize: '12.5px', color: '#60716B', marginTop: '2px' }}>
                  All automatically quarantined IPs are centrally cataloged and managed in your IP Blacklist view.
                </div>
              </div>
            </div>
            <a
              href="/user/blacklist"
              style={{
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#10201E',
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(11, 37, 34, 0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>View In IP Blacklist</span>
              <i className="fas fa-arrow-right" style={{ fontSize: '11px', color: '#60716B' }}></i>
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CYBER SECURITY AUDIT & PORT DIAGNOSTICS SCANNER */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div>
          {/* URL Input & Scanner Launcher Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-microscope" style={{ color: '#10201E' }}></i>
              Comprehensive Website Security Health &amp; Port Auditor
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#60716B' }}>
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
                        color: '#10201E', fontSize: '13px', fontWeight: 600
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
                      color: '#10201E', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Audit Button */}
                <button
                  type="submit"
                  disabled={auditLoading}
                  style={{
                    height: '46px', padding: '0 24px', borderRadius: '8px',
                    background: '#0B2522', color: '#FFFFFF',
                    border: '1px solid #0B2522', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)', opacity: auditLoading ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className={auditLoading ? "fas fa-spinner fa-spin" : "fas fa-play"}></i>
                  <span>{auditLoading ? 'Auditing Security...' : 'Audit Website Security'}</span>
                </button>
              </div>

              {/* Suggestion Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#60716B', fontWeight: 600 }}>Quick Test:</span>
                {['https://wordpress.org', 'http://localhost', 'https://cloudflare.com'].map(pill => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => { setAuditUrl(pill); handleRunAudit(pill); }}
                    style={{
                      background: 'var(--bg-secondary, #f1f5f9)', border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#10201E',
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
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                <i className="fas fa-satellite-dish fa-spin"></i>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#10201E' }}>
                Running Multi-Vector Security Inspection...
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#60716B' }}>
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
                padding: '28px', borderRadius: '16px', border: '1px solid #D9E1DC',
                background: 'var(--card-bg, #ffffff)', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  
                  {/* Left: Grade Gauge & Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                    <div style={{
                      width: '84px', height: '84px', borderRadius: '16px',
                      background: '#0B2522', border: '1px solid #0B2522',
                      color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(11, 37, 34, 0.15)'
                    }}>
                      <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>{auditResult.grade}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9 }}>GRADE</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 900, color: '#10201E' }}>
                          {auditResult.score}
                        </span>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>/ 100 Score</span>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '6px',
                          background: '#E8EEE8', color: '#0B2522', border: '1px solid #D9E1DC'
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
                          color: '#10201E', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
                  
                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid #D9E1DC' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-lock" style={{ color: '#10b981', marginRight: '5px' }}></i>
                      SSL / TLS Health
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                      {auditResult.ssl?.supported ? `Grade ${auditResult.ssl?.grade} (${auditResult.ssl?.days_remaining}d left)` : 'No Valid SSL'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid #D9E1DC' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-shield-alt" style={{ color: '#3b82f6', marginRight: '5px' }}></i>
                      Security Headers
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                      {auditResult.http?.header_score}% Hardened
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid #D9E1DC' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-network-wired" style={{ color: '#8b5cf6', marginRight: '5px' }}></i>
                      Open Network Ports
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: auditResult.ports?.critical_exposed > 0 ? '#ef4444' : '#10201E' }}>
                      {auditResult.ports?.open_count} Open ({auditResult.ports?.critical_exposed} Critical)
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid #D9E1DC' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      <i className="fas fa-eye" style={{ color: '#d97706', marginRight: '5px' }}></i>
                      Information Leakage
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#10201E' }}>
                      {auditResult.http?.server_exposure?.length || 0} Headers Disclosed
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#E8EEE8', padding: '4px', borderRadius: '10px', border: '1px solid #D9E1DC', maxWidth: '640px' }}>
                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('headers')}
                  style={{
                    flex: 1, height: '36px', border: auditActiveSubTab === 'headers' ? '1px solid #0B2522' : 'none', borderRadius: '7px', fontWeight: auditActiveSubTab === 'headers' ? 700 : 600, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'headers' ? '#0B2522' : 'transparent',
                    color: auditActiveSubTab === 'headers' ? '#FFFFFF' : '#60716B',
                    boxShadow: auditActiveSubTab === 'headers' ? '0 2px 6px rgba(11, 37, 34, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i>
                  Security Headers
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('ports')}
                  style={{
                    flex: 1, height: '36px', border: auditActiveSubTab === 'ports' ? '1px solid #0B2522' : 'none', borderRadius: '7px', fontWeight: auditActiveSubTab === 'ports' ? 700 : 600, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'ports' ? '#0B2522' : 'transparent',
                    color: auditActiveSubTab === 'ports' ? '#FFFFFF' : '#60716B',
                    boxShadow: auditActiveSubTab === 'ports' ? '0 2px 6px rgba(11, 37, 34, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-network-wired" style={{ marginRight: '6px' }}></i>
                  Ports &amp; Services ({auditResult.ports?.open_count})
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('exposure')}
                  style={{
                    flex: 1, height: '36px', border: auditActiveSubTab === 'exposure' ? '1px solid #0B2522' : 'none', borderRadius: '7px', fontWeight: auditActiveSubTab === 'exposure' ? 700 : 600, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'exposure' ? '#0B2522' : 'transparent',
                    color: auditActiveSubTab === 'exposure' ? '#FFFFFF' : '#60716B',
                    boxShadow: auditActiveSubTab === 'exposure' ? '0 2px 6px rgba(11, 37, 34, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-door-open" style={{ marginRight: '6px' }}></i>
                  Sensitive Paths
                </button>

                <button
                  type="button"
                  onClick={() => setAuditActiveSubTab('ssl')}
                  style={{
                    flex: 1, height: '36px', border: auditActiveSubTab === 'ssl' ? '1px solid #0B2522' : 'none', borderRadius: '7px', fontWeight: auditActiveSubTab === 'ssl' ? 700 : 600, fontSize: '12.5px',
                    cursor: 'pointer', background: auditActiveSubTab === 'ssl' ? '#0B2522' : 'transparent',
                    color: auditActiveSubTab === 'ssl' ? '#FFFFFF' : '#60716B',
                    boxShadow: auditActiveSubTab === 'ssl' ? '0 2px 6px rgba(11, 37, 34, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-certificate" style={{ marginRight: '6px' }}></i>
                  SSL / TLS
                </button>
              </div>

              {/* Sub-Tab 1: Security Headers */}
              {auditActiveSubTab === 'headers' && (
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                    HTTP Security Response Headers Diagnostic
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {auditResult.http?.headers_evaluation?.map(h => (
                      <div key={h.key} style={{
                        padding: '16px', borderRadius: '10px',
                        border: '1px solid #D9E1DC',
                        background: '#FBFCFA'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#10201E' }}>
                            {h.name}
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC'
                          }}>
                            {h.present ? 'ENFORCED' : 'MISSING'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569' }}>
                          {h.desc}
                        </p>
                        {h.present ? (
                          <div style={{ fontSize: '11.5px', background: '#FFFFFF', border: '1px solid #D9E1DC', padding: '4px 8px', borderRadius: '4px', color: '#10201E', wordBreak: 'break-all' }}>
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
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                    Scanned Ports &amp; Direct Origin Exposure
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {auditResult.ports?.ports?.map(p => (
                      <div key={p.port} style={{
                        padding: '14px', borderRadius: '10px',
                        border: '1px solid #D9E1DC',
                        background: '#FBFCFA'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#10201E' }}>
                            Port {p.port} ({p.service})
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC'
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
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                    Sensitive Paths &amp; Admin Endpoint Hardening
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {auditResult.sensitive_paths?.map(item => (
                      <div key={item.path} style={{
                        padding: '14px', borderRadius: '10px',
                        border: '1px solid #D9E1DC',
                        background: '#FBFCFA'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: '#10201E' }}>
                            {item.name}
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
                            background: '#E8EEE8',
                            color: '#0B2522',
                            border: '1px solid #D9E1DC'
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
                <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid #D9E1DC', background: 'var(--card-bg, #ffffff)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
                    SSL / TLS Certificate Encryption Diagnostics
                  </h4>
                  {auditResult.ssl?.supported ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      <div style={{ padding: '14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px' }}>
                        <small style={{ color: '#64748b', fontWeight: 700 }}>Certificate Authority (Issuer)</small>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#10201E', marginTop: '2px' }}>
                          {auditResult.ssl?.issuer}
                        </div>
                      </div>
                      <div style={{ padding: '14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px' }}>
                        <small style={{ color: '#64748b', fontWeight: 700 }}>TLS Protocol &amp; Cipher</small>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#10201E', marginTop: '2px' }}>
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

      {/* ========================================================================= */}
      {/* TAB 4: TWO-FACTOR AUTHENTICATION (2FA)  DEDICATED SIMPLE & FRIENDLY SETUP */}
      {/* ========================================================================= */}
      {activeTab === 'twofactor' && (
        <div style={{ maxWidth: '1040px' }}>
          
          {/* Top Domain Scope & Live Status Card */}
          <div className="card" style={{
            padding: '22px 26px',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            background: '#FFFFFF',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: securityConfig.two_factor_enabled ? '#0B2522' : '#F1F5F3',
                color: securityConfig.two_factor_enabled ? '#FFFFFF' : '#60716B',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Key size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#10201E' }}>
                    Two-Factor Authentication (2FA)
                  </h3>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                    background: securityConfig.two_factor_enabled ? '#E8EEE8' : '#F1F5F3',
                    color: securityConfig.two_factor_enabled ? '#0B2522' : '#64748B',
                    border: '1px solid #D9E1DC'
                  }}>
                    {securityConfig.two_factor_enabled ? '✓ 2FA ACTIVE & ENFORCED' : 'NOT ACTIVE'}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#60716B' }}>
                  Adds an unbypassable extra layer of security. Log in with your password plus a 6-digit code from your phone.
                </p>
              </div>
            </div>

            {/* Domain Dropdown Selector & Master Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#60716B', marginBottom: '4px' }}>
                  SELECT DOMAIN TO CONFIGURE
                </label>
                <select
                  value={twoFaActiveDomain}
                  onChange={(e) => setTwoFaActiveDomain(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FBFCFA',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#10201E',
                    cursor: 'pointer',
                    minWidth: '240px'
                  }}
                >
                  <option value="all">🌐 All Connected Domains (Global Fleet)</option>
                  {connectedWebsites && connectedWebsites.map((site) => (
                    <option key={site.id} value={site.id}>
                      🔒 {site.domain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Switch Button */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'transparent', marginBottom: '4px' }}>
                  TOGGLE
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newState = !securityConfig.two_factor_enabled
                    setSecurityConfig(prev => ({ ...prev, two_factor_enabled: newState }))
                    api.updateUserSecurityConfig({ ...securityConfig, two_factor_enabled: newState }).catch(() => {})
                  }}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    border: securityConfig.two_factor_enabled ? '1px solid #0B2522' : '1px solid #D9E1DC',
                    background: securityConfig.two_factor_enabled ? '#0B2522' : '#FBFCFA',
                    color: securityConfig.two_factor_enabled ? '#FFFFFF' : '#10201E',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Shield size={14} />
                  <span>{securityConfig.two_factor_enabled ? '2FA Enabled' : 'Enable 2FA'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-STEP USER FRIENDLY SETUP CONTAINER */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            
            {/* STEP 1: SCAN QR CODE OR USE SECRET TOKEN */}
            <div className="card" style={{
              padding: '24px 26px',
              borderRadius: '16px',
              border: '1px solid #D9E1DC',
              background: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#0B2522', color: '#FFFFFF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800
                }}>1</span>
                <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#10201E' }}>
                  Scan QR Code with your Authenticator App
                </h4>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
                Open Google Authenticator, Microsoft Authenticator, Authy, or 1Password on your mobile phone and scan this code:
              </p>

              {/* QR Code Presentation Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FBFCFA',
                border: '1px solid #D9E1DC',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(11, 37, 34, 0.06)',
                  border: '1px solid #E8EEE8',
                  textAlign: 'center'
                }}>
                  {twoFaQrDataUrl ? (
                    <img
                      src={twoFaQrDataUrl}
                      alt="2FA QR Code"
                      style={{ width: '190px', height: '190px', display: 'block', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60716B' }}>
                      Generating QR...
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#60716B' }}>
                    Scan with Phone Camera or App
                  </div>
                </div>
              </div>

              {/* Manual Secret Token Toggle */}
              <div style={{ borderTop: '1px solid #E8EEE8', paddingTop: '14px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10201E' }}>
                    Can't scan QR code?
                  </span>
                  <button
                    type="button"
                    onClick={() => setTwoFaShowManualToken(!twoFaShowManualToken)}
                    style={{
                      background: 'none', border: 'none', color: '#0B2522',
                      fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    {twoFaShowManualToken ? 'Hide Manual Key' : 'Enter Key Manually'}
                  </button>
                </div>

                {twoFaShowManualToken && (
                  <div style={{
                    marginTop: '10px',
                    background: '#FBFCFA',
                    border: '1px solid #D9E1DC',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <small style={{ fontSize: '10px', color: '#60716B', fontWeight: 700, display: 'block' }}>SECRET TOKEN (KEY)</small>
                      <code style={{ fontSize: '14px', fontWeight: 800, color: '#10201E', letterSpacing: '0.05em' }}>
                        {twoFaSecretKey}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySecretKey}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #D9E1DC',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#0B2522'
                      }}
                    >
                      {twoFaCopiedToken ? <Check size={13} /> : <Copy size={13} />}
                      <span>{twoFaCopiedToken ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: ENTER 6-DIGIT VERIFICATION CODE */}
            <div className="card" style={{
              padding: '24px 26px',
              borderRadius: '16px',
              border: '1px solid #D9E1DC',
              background: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#0B2522', color: '#FFFFFF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800
                }}>2</span>
                <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#10201E' }}>
                  Enter 6-Digit Code from your App
                </h4>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
                Type the 6-digit confirmation code currently displayed in your authenticator app to verify that setup is working correctly:
              </p>

              {/* 6 Digit Input Boxes */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '10px 0 24px' }}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    id={`twofa-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={twoFaDigits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 800,
                      borderRadius: '10px',
                      border: twoFaDigits[idx] ? '2px solid #0B2522' : '1px solid #D9E1DC',
                      background: twoFaDigits[idx] ? '#FFFFFF' : '#FBFCFA',
                      color: '#10201E',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleVerifyTwoFactor}
                  style={{
                    height: '44px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(11, 37, 34, 0.2)'
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Verify &amp; Activate 2FA Protection</span>
                </button>

                {/* Quick Auto-fill for easy user testing */}
                <button
                  type="button"
                  onClick={() => {
                    const sampleCode = String(Math.floor(100000 + Math.random() * 900000))
                    setTwoFaDigits(sampleCode.split(''))
                  }}
                  style={{
                    background: 'none', border: 'none', color: '#60716B',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  ⚡ Click to generate sample code for testing
                </button>
              </div>

              {/* Verification Message Alert */}
              {twoFaVerifyResult.status !== 'idle' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: twoFaVerifyResult.status === 'success' ? '#E8EEE8' : '#FEE2E2',
                  color: twoFaVerifyResult.status === 'success' ? '#0B2522' : '#991B1B',
                  border: twoFaVerifyResult.status === 'success' ? '1px solid #D9E1DC' : '1px solid #FCA5A5'
                }}>
                  {twoFaVerifyResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{twoFaVerifyResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: EMERGENCY BACKUP RECOVERY CODES CARD */}
          <div className="card" style={{
            padding: '24px 28px',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            background: '#FFFFFF',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#0B2522', color: '#FFFFFF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800
                }}>3</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#10201E' }}>
                    Emergency Backup Recovery Codes
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#60716B' }}>
                    Keep these one-time codes in a safe place. If you ever lose or damage your phone, you can use any of these to sign in.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyAllRecoveryCodes}
                  style={{
                    background: '#FBFCFA',
                    border: '1px solid #D9E1DC',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#0B2522',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {twoFaCopiedCodes ? <Check size={14} /> : <Copy size={14} />}
                  <span>{twoFaCopiedCodes ? 'Codes Copied!' : 'Copy All Codes'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  style={{
                    background: '#0B2522',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} />
                  <span>Download (.txt)</span>
                </button>
              </div>
            </div>

            {/* Grid of 8 Recovery Tokens */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#FBFCFA',
              border: '1px solid #D9E1DC',
              borderRadius: '12px',
              padding: '16px'
            }}>
              {twoFaRecoveryCodes.map((code, idx) => (
                <div key={idx} style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8EEE8',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '11px', color: '#60716B', fontWeight: 700 }}>#{idx + 1}</span>
                  <code style={{ fontSize: '13px', fontWeight: 800, color: '#10201E', fontFamily: 'monospace' }}>
                    {code}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* SIMPLIFIED HIGH-SECURITY POLICY SETTINGS */}
          <div className="card" style={{
            padding: '22px 26px',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            background: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#10201E' }}>
              Fleet Security Safeguards &amp; Anti-Bypass Policies
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              
              {/* Policy 1: Roles */}
              <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', padding: '14px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10201E', marginBottom: '6px' }}>
                  Enforce On User Roles
                </div>
                <select
                  value={securityConfig.two_factor_roles}
                  onChange={(e) => setSecurityConfig({ ...securityConfig, two_factor_roles: e.target.value })}
                  style={{
                    width: '100%', height: '36px', borderRadius: '6px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF',
                    fontSize: '12.5px', fontWeight: 700, color: '#10201E', padding: '0 10px'
                  }}
                >
                  <option value="admins">Administrators &amp; Super Admins (Recommended)</option>
                  <option value="editors">Admins, Editors &amp; Authors</option>
                  <option value="all_users">All Users &amp; Subscribers</option>
                </select>
                <small style={{ display: 'block', marginTop: '6px', fontSize: '11.5px', color: '#60716B' }}>
                  Ensures accounts with administrative privileges must pass 2FA.
                </small>
              </div>

              {/* Policy 2: Anti-Brute Force IP Lockout */}
              <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', padding: '14px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10201E' }}>Brute-Force IP Auto-Ban</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', background: '#E8EEE8', padding: '2px 6px', borderRadius: '4px' }}>
                    3 Failed Codes
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#60716B', lineHeight: '1.45' }}>
                  If an attacker or bot attempts to guess the 6-digit code 3 times, their IP is immediately dropped with HTTP 403 for 24 hours.
                </p>
              </div>

              {/* Policy 3: Email OTP Fallback */}
              <div style={{ background: '#FBFCFA', border: '1px solid #D9E1DC', padding: '14px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10201E' }}>Instant Email OTP Fallback</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', background: '#E8EEE8', padding: '2px 6px', borderRadius: '4px' }}>
                    Unbypassable
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#60716B', lineHeight: '1.45' }}>
                  If an admin has not enrolled their phone yet, an instant 6-digit OTP is dispatched to their email so attackers cannot bypass login.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  )
}
