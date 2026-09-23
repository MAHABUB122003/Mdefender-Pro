import { useState, useEffect, Fragment, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'

export default function UserLogs() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [logs, setLogs] = useState(() => userStore.get('logs_p1') || { logs: [], total: 0, total_pages: 0 })
  const [websites, setWebsites] = useState([])
  const [websiteFilter, setWebsiteFilter] = useState('')
  const [loading, setLoading] = useState(() => !userStore.get('logs_p1'))
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState(null)
  const [ipLocations, setIpLocations] = useState({})
  const perPage = 20

  useEffect(() => {
    api.getUserDashboard().then(data => {
      if (data?.websites && data.websites.length > 0) {
        setWebsites(data.websites)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (logs?.logs?.length && websites.length === 0) {
      const domains = [...new Set(logs.logs.map(l => l.domain).filter(Boolean))]
      if (domains.length) {
        setWebsites(domains.map(d => ({ id: d, domain: d, name: d })))
      }
    }
  }, [logs, websites.length])

  const fetchLogs = useCallback(async (manual = false) => {
    const cacheKey = `logs_p${page}_${search}_${ipFilter}_${typeFilter}_${statusFilter}_${websiteFilter}`;
    const cached = userStore.get(cacheKey);
    if (cached && !manual) {
      setLogs(cached);
      setLoading(false);
    } else if (!cached && !manual) {
      setLoading(true);
    }
    if (manual) setRefreshing(true);

    try {
      const params = { page, limit: perPage }
      if (search) params.search = search
      if (ipFilter) params.ip = ipFilter
      if (typeFilter) params.attack_type = typeFilter
      if (statusFilter) params.status = statusFilter
      if (websiteFilter) params.website_id = websiteFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await api.getUserLogs(params)
      setLogs(data)
      userStore.set(cacheKey, data)
      if (page === 1 && !search && !ipFilter && !typeFilter && !statusFilter && !websiteFilter) {
        userStore.set('logs_p1', data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [page, search, ipFilter, typeFilter, statusFilter, websiteFilter, dateFrom, dateTo, perPage])

  useEffect(() => {
    fetchLogs()

    // Real-time automatic background polling every 3 seconds on page 1
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && page === 1 && !search) {
        fetchLogs(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [fetchLogs, page, search])

  useEffect(() => {
    if (!logs.logs) return
    const uniqueIps = [...new Set(logs.logs.map(l => l.ip))].filter(ip => ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost' && ip !== 'unknown' && !ipLocations[ip])
    
    uniqueIps.forEach(ip => {
      // Handle local / private subnet IPs immediately
      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) {
        setIpLocations(prev => ({
          ...prev,
          [ip]: { code: 'bd', name: 'Local / Private Network', flagUrl: 'https://flagcdn.com/16x12/bd.png' }
        }))
        return
      }

      // 1. Primary GeoIP lookup via ipwho.is (free, HTTPS, CORS enabled)
      fetch(`https://ipwho.is/${ip}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.success && data.country_code) {
            const code = data.country_code.toLowerCase()
            const name = data.country || code.toUpperCase()
            const flagUrl = data.flag?.img || `https://flagcdn.com/16x12/${code}.png`
            setIpLocations(prev => ({
              ...prev,
              [ip]: { code, name, flagUrl }
            }))
          } else {
            // 2. Secondary fallback via freeipapi.com
            fetch(`https://freeipapi.com/api/json/${ip}`)
              .then(r => r.json())
              .then(data2 => {
                if (data2 && data2.countryCode) {
                  const code = data2.countryCode.toLowerCase()
                  const name = data2.countryName || code.toUpperCase()
                  setIpLocations(prev => ({
                    ...prev,
                    [ip]: { code, name, flagUrl: `https://flagcdn.com/16x12/${code}.png` }
                  }))
                }
              }).catch(() => {})
          }
        })
        .catch(() => {
          // 2. Secondary fallback via freeipapi.com
          fetch(`https://freeipapi.com/api/json/${ip}`)
            .then(r => r.json())
            .then(data2 => {
              if (data2 && data2.countryCode) {
                const code = data2.countryCode.toLowerCase()
                const name = data2.countryName || code.toUpperCase()
                setIpLocations(prev => ({
                  ...prev,
                  [ip]: { code, name, flagUrl: `https://flagcdn.com/16x12/${code}.png` }
                }))
              }
            }).catch(() => {})
        })
    })
  }, [logs.logs])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const [cleaningLogs, setCleaningLogs] = useState(false)
  const [showCleanModal, setShowCleanModal] = useState(false)
  const [selectedCleanRange, setSelectedCleanRange] = useState('7')

  const handleCleanLogs = async () => {
    const scope = websiteFilter 
      ? `for website: ${websites.find(w => String(w.id) === String(websiteFilter))?.domain || websiteFilter}` 
      : `for all your connected websites`
    
    const labels = {
      'today': "today's logs",
      '1': 'logs older than 1 day',
      '2': 'logs older than 2 days',
      '3': 'logs older than 3 days',
      '4': 'logs older than 4 days',
      '5': 'logs older than 5 days',
      '7': 'logs older than 7 days (1 week)',
      '30': 'logs older than 30 days (1 month)',
      '90': 'logs older than 90 days (3 months)',
      'all': 'ALL log records'
    }
    const label = labels[selectedCleanRange] || `${selectedCleanRange} days`

    if (!confirm(`Confirm deletion: Are you sure you want to permanently clear ${label} ${scope}?`)) {
      return
    }

    setCleaningLogs(true)
    try {
      const res = await api.userCleanLogs({ 
        website_id: websiteFilter, 
        days: selectedCleanRange 
      })
      userStore.clear()
      setPage(1)
      await fetchLogs(true)
      setShowCleanModal(false)
      alert(res.message || 'Logs cleaned successfully.')
    } catch (err) {
      alert(err.message || 'Failed to clear logs')
    } finally {
      setCleaningLogs(false)
    }
  }

  const handleBlockIp = async (ip) => {
    if (!confirm(`Block IP ${ip} permanently?`)) return
    try {
      const res = await api.addUserBlacklist({ ip, type: 'blacklist', reason: 'Blocked from attack log details' })
      if (res.status === 'success' || res.message) {
        alert(`IP ${ip} blocked successfully.`)
      } else {
        alert('Could not block IP.')
      }
    } catch (err) {
      alert('Error blocking IP: ' + err.message)
    }
  }

  const handleWhitelistIp = async (ip) => {
    if (!confirm(`Add IP ${ip} to Whitelist?`)) return
    try {
      const res = await api.addUserBlacklist({ ip, type: 'whitelist', reason: 'Whitelisted from attack log details' })
      if (res.status === 'success' || res.message) {
        alert(`IP ${ip} whitelisted successfully.`)
      } else {
        alert('Could not whitelist IP.')
      }
    } catch (err) {
      alert('Error whitelisting IP: ' + err.message)
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }
      return new Date(dateStr.replace(' ', 'T')).toLocaleString('en-US', options)
    } catch (e) {
      return dateStr
    }
  }

  if (!isPremium) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px', background: '#fffbeb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          fontSize: '32px', color: '#d97706',
        }}>
          <i className="fas fa-lock"></i>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Premium Feature</h2>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>
          Attack Logs are available for Premium plan subscribers. Upgrade to access detailed attack analytics and logs.
        </p>
        <Link to="/pricing" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          textDecoration: 'none', fontFamily: 'inherit',
        }}>
          <i className="fas fa-crown"></i> Upgrade to Premium
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="filters-bar" style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <form onSubmit={handleFilter} className="filter-form" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search IP or URL..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '180px' }} />
          
          <select value={websiteFilter} onChange={e => setWebsiteFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '500' }}>
            <option value="">All Websites ({websites.length})</option>
            {websites.map(w => (
              <option key={w.id} value={w.id}>{w.domain || w.name || w.id}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
            <option value="">All Traffic</option>
            <option value="blocked">Blocked Attacks Only</option>
            <option value="allowed">Allowed Traffic Only</option>
          </select>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
            <option value="">All Attack Types</option>
            <option value="SQL Injection">SQL Injection</option>
            <option value="XSS">XSS</option>
            <option value="LFI">LFI</option>
            <option value="Command Injection">Command Injection</option>
            <option value="Path Traversal">Path Traversal</option>
            <option value="Suspicious Request">Suspicious Request</option>
          </select>

          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Date From" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          <button type="submit" className="btn-filter" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Filter</button>
          <button 
            type="button" 
            onClick={() => fetchLogs(true)} 
            disabled={refreshing}
            style={{ 
              padding: '8px 14px', 
              background: refreshing ? '#eff6ff' : '#f8fafc', 
              color: '#2563eb', 
              border: '1px solid #bfdbfe', 
              borderRadius: '6px', 
              fontWeight: '600', 
              cursor: refreshing ? 'not-allowed' : 'pointer', 
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={`fas fa-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh Logs'}
          </button>

          <button 
            type="button" 
            onClick={() => setShowCleanModal(true)} 
            disabled={cleaningLogs}
            title="Open Clean Logs Manager"
            style={{ 
              padding: '8px 14px', 
              background: '#fff1f2', 
              color: '#e11d48', 
              border: '1px solid #fecaca', 
              borderRadius: '6px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto'
            }}
          >
            <i className="fas fa-trash-can"></i>
            Clear Logs
          </button>
        </form>
      </div>

      <div className="logs-table" style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Type</th>
              <th style={{ padding: '12px 16px', width: '150px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Website</th>
              <th style={{ padding: '12px 16px', width: '160px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Location</th>
              <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Page / Payload</th>
              <th style={{ padding: '12px 16px', width: '160px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Time</th>
              <th style={{ padding: '12px 16px', width: '130px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>IP Address</th>
              <th style={{ padding: '12px 16px', width: '80px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Response</th>
              <th style={{ padding: '12px 16px', width: '75px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '14px' }}><i className="fas fa-spinner fa-spin"></i> Loading...</td></tr>
            ) : logs.logs?.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', color: '#94a3b8' }}>
                    <i className="fas fa-shield-halved"></i>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: '0' }}>No attack logs found</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>All incoming requests are currently clean or matching filters.</p>
                </td>
              </tr>
            ) : logs.logs?.map((log, i) => {
              const isBlocked = log.status === 'blocked'
              const loc = ipLocations[log.ip] || 
                (log.country_code ? { code: log.country_code.toLowerCase(), name: log.country || log.country_code, flagUrl: `https://flagcdn.com/16x12/${log.country_code.toLowerCase()}.png` } : null) ||
                (log.ip === '127.0.0.1' || log.ip === '::1' || log.ip === 'localhost' ? { code: 'bd', name: 'Bangladesh (Local)', flagUrl: 'https://flagcdn.com/16x12/bd.png' } : null)
              const isExpanded = expandedRow === i

              return (
                <Fragment key={i}>
                  <tr 
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: isExpanded ? '#f1f5f9' : 'none' }}
                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span className={`badge ${isBlocked ? 'danger' : 'success'}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%' }}></span>
                        {log.attack_type || (isBlocked ? 'Blocked Attack' : 'Clean Request')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        {log.domain || 'Main Site'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {loc && loc.code ? (
                          <>
                            <img 
                              src={loc.flagUrl || `https://flagcdn.com/16x12/${loc.code}.png`} 
                              alt={loc.code.toUpperCase()} 
                              onError={(e) => { e.target.style.display = 'none' }}
                              style={{ borderRadius: '2px', width: '16px', height: '12px', display: 'inline-block', objectFit: 'cover' }} 
                            />
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>{loc.name}</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-globe" style={{ fontSize: '14px', color: '#94a3b8' }}></i>
                            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Unknown</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span title={log.url} style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1e293b', wordBreak: 'break-all' }}>
                        {log.url?.length > 45 ? log.url.slice(0, 45) + '...' : log.url}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569', padding: '12px 16px' }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{log.ip}</code>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <span style={{ fontWeight: '700', color: isBlocked ? '#b91c1c' : '#15803d' }}>
                        {isBlocked ? '403' : '200'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px' }}>
                        <i className={`fas fa-eye${isExpanded ? '-slash' : ''}`} style={{ fontSize: '15px' }}></i>
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="8" style={{ padding: '20px 24px', borderBottom: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
                          <div style={{ textAlign: 'center', flex: '0 0 100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: '56px', height: '56px', borderRadius: '50%',
                              background: isBlocked ? '#dc2626' : '#10b981',
                              display: 'flex', alignItems: 'center', justifycontent: 'center',
                              color: '#fff', boxShadow: isBlocked ? '0 3px 8px rgba(220,38,38,0.2)' : '0 3px 8px rgba(16,185,129,0.2)',
                              marginBottom: '8px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <i className={`fas ${isBlocked ? 'fa-times' : 'fa-check'}`}></i>
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: isBlocked ? '#dc2626' : '#10b981' }}>
                              Type: {isBlocked ? 'Blocked' : 'Allowed'}
                            </span>
                          </div>

                          <div style={{ flex: '1', fontSize: '13.5px', color: '#334155', lineHeight: '1.6', textAlign: 'left' }}>
                            <div style={{ marginBottom: '14px', background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#1e293b', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                              {loc && loc.code && (
                                <img 
                                  src={loc.flagUrl || `https://flagcdn.com/16x12/${loc.code}.png`} 
                                  style={{ borderRadius: '2px', width: '16px', height: '12px', marginRight: '6px', verticalAlign: '-1px', display: 'inline-block', objectFit: 'cover' }} 
                                  alt={loc.code.toUpperCase()} 
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              )}
                              <strong>{loc?.name || 'Unknown Location'}</strong> ({log.ip}) was {isBlocked ? 'blocked by firewall for ' : 'allowed access to page ' }
                              <strong>{isBlocked ? log.attack_type : ''}</strong> {isBlocked ? 'in request: ' : ''}
                              <code style={{ fontSize: '12.5px', color: '#dc2626' }}>{isBlocked ? log.rule_matched || log.attack_type : ''}</code> at <a href={log.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{log.url}</a> at {formatDateTime(log.timestamp)}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 16px', marginBottom: '14px', fontSize: '12.5px' }}>
                              <div><strong style={{ color: '#64748b' }}>Protected Site:</strong> <span style={{ fontWeight: '700', color: '#2563eb', marginLeft: '4px' }}>{log.domain || 'Main Site'}</span></div>
                              <div><strong style={{ color: '#64748b' }}>IP Address:</strong> <code style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>{log.ip}</code></div>
                              <div><strong style={{ color: '#64748b' }}>HTTP Method:</strong> <span style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>{log.method || 'GET'}</span></div>
                              <div><strong style={{ color: '#64748b' }}>WAF Confidence:</strong> <span style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>{log.confidence != null ? Number(log.confidence).toFixed(4) : 'N/A'}</span></div>
                            </div>

                            {log.user_agent && (
                              <div style={{ marginBottom: '16px' }}>
                                <strong style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User Agent:</strong>
                                <div style={{ background: '#fff', color: '#475569', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', wordBreak: 'break-all', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>{log.user_agent}</div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                              <button onClick={() => handleBlockIp(log.ip)} className="btn-small" style={{ borderColor: '#cbd5e1', color: '#b91c1c', fontWeight: '600', height: '32px', padding: '0 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '11.5px' }}>BLOCK IP</button>
                              <Link to={`/user/tools?ip=${encodeURIComponent(log.ip)}`} className="btn-small" style={{ borderColor: '#cbd5e1', color: '#0284c7', fontWeight: '600', height: '32px', padding: '0 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                                <i className="fas fa-search-location"></i>
                                <span>RUN WHOIS</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {logs.total_pages > 1 && (
        <div className="pagination">
          <div className="page-info">Page {page} of {logs.total_pages} ({logs.total} total records)</div>
          <div className="page-buttons">
            {page > 1 && <button className="btn-page" onClick={() => setPage(page - 1)}>Previous</button>}
            {Array.from({ length: logs.total_pages }, (_, i) => i + 1)
              .filter(p => p >= page - 2 && p <= page + 2)
              .map(p => (
                <button key={p} className={`btn-page ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
            {page < logs.total_pages && <button className="btn-page" onClick={() => setPage(page + 1)}>Next</button>}
          </div>
        </div>
      )}

      {/* Clear Logs Timeframe Selection Modal */}
      {showCleanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#ffe4e6',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  <i className="fas fa-trash-can"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Clear Traffic & Attack Logs</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Select the timeframe for logs you want to permanently delete</p>
                </div>
              </div>
              <button
                onClick={() => setShowCleanModal(false)}
                disabled={cleaningLogs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px'
                }}
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              {/* Target Scope Pill */}
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#166534'
              }}>
                <i className="fas fa-globe"></i>
                <span>
                  <strong>Target Website:</strong> {websiteFilter ? (websites.find(w => String(w.id) === String(websiteFilter))?.domain || websiteFilter) : 'All Connected Websites'}
                </span>
              </div>

              {/* Timeframe Options List */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Retention / Cleanup Timeframe:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {[
                  { value: 'today', label: "Today's logs only", icon: 'fa-calendar-day', desc: 'Clear only logs generated today' },
                  { value: '1', label: 'Older than 1 day', icon: 'fa-clock-rotate-left', desc: 'Keep only past 24 hours' },
                  { value: '2', label: 'Older than 2 days', icon: 'fa-clock-rotate-left', desc: 'Keep only past 48 hours' },
                  { value: '3', label: 'Older than 3 days', icon: 'fa-clock-rotate-left', desc: 'Keep only past 3 days' },
                  { value: '4', label: 'Older than 4 days', icon: 'fa-clock-rotate-left', desc: 'Keep only past 4 days' },
                  { value: '5', label: 'Older than 5 days', icon: 'fa-clock-rotate-left', desc: 'Keep only past 5 days' },
                  { value: '7', label: 'Older than 7 days (1 wk)', icon: 'fa-calendar-week', desc: 'Keep only past 1 week' },
                  { value: '30', label: 'Older than 30 days (1 mo)', icon: 'fa-calendar-alt', desc: 'Keep only past 30 days' },
                  { value: '90', label: 'Older than 90 days (3 mo)', icon: 'fa-calendar', desc: 'Keep only past quarter' },
                  { value: 'all', label: 'All logs (Lifetime)', icon: 'fa-fire-flame-curved', desc: 'Wipe all historical records' },
                ].map(opt => {
                  const isSelected = selectedCleanRange === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedCleanRange(opt.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                          <i className={`fas ${opt.icon}`} style={{ marginRight: '6px', color: isSelected ? '#2563eb' : '#64748b' }}></i>
                          {opt.label}
                        </span>
                        <input
                          type="radio"
                          name="clean_range"
                          checked={isSelected}
                          onChange={() => setSelectedCleanRange(opt.value)}
                          style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '20px' }}>{opt.desc}</span>
                    </div>
                  )
                })}
              </div>

              {/* Warning Alert */}
              <div style={{
                padding: '10px 14px',
                background: '#fff1f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#9f1239',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-triangle-exclamation" style={{ color: '#e11d48' }}></i>
                <span>This action is permanent and cannot be undone.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                disabled={cleaningLogs}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanLogs}
                disabled={cleaningLogs}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: cleaningLogs ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(225,29,72,0.25)'
                }}
              >
                <i className={`fas ${cleaningLogs ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                {cleaningLogs ? 'Clearing...' : 'Clear Selected Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

