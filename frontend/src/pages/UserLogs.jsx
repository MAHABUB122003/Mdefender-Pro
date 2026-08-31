import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

export default function UserLogs() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [logs, setLogs] = useState({ logs: [], total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
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

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { page, limit: perPage }
      if (search) params.search = search
      if (ipFilter) params.ip = ipFilter
      if (typeFilter) params.attack_type = typeFilter
      if (statusFilter) params.status = statusFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await api.getUserLogs(params)
      setLogs(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isPremium) { setLoading(false); return }
    fetchLogs()
  }, [isPremium, page])

  useEffect(() => {
    if (!logs.logs) return
    const uniqueIps = [...new Set(logs.logs.map(l => l.ip))].filter(ip => ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'unknown' && !ipLocations[ip])
    uniqueIps.forEach(ip => {
      fetch(`https://ip-api.com/json/${ip}?fields=countryCode,country`)
        .then(r => r.json())
        .then(data => {
          if (data.countryCode) {
            setIpLocations(prev => ({
              ...prev,
              [ip]: { code: data.countryCode.toLowerCase(), name: data.country }
            }))
          }
        }).catch(() => {})
    })
  }, [logs.logs])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
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
          <input type="text" placeholder="Search IP or URL..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '200px' }} />
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
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Date From" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Date To" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          <button type="submit" className="btn-filter" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Filter</button>
        </form>
      </div>

      <div className="logs-table" style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Type</th>
              <th style={{ padding: '12px 16px', width: '180px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Location</th>
              <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Page Visited</th>
              <th style={{ padding: '12px 16px', width: '180px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Time</th>
              <th style={{ padding: '12px 16px', width: '150px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>IP Address</th>
              <th style={{ padding: '12px 16px', width: '150px', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Hostname</th>
              <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>Response</th>
              <th style={{ padding: '12px 16px', width: '75px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px' }}>View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '14px' }}><i className="fas fa-spinner fa-spin"></i> Loading...</td></tr>
            ) : logs.logs?.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: '0' }}>No attack logs found</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>All incoming requests are currently clean or matching filters.</p>
                </td>
              </tr>
            ) : logs.logs?.map((log, i) => {
              const isBlocked = log.status === 'blocked'
              const loc = ipLocations[log.ip] || (log.ip === '127.0.0.1' || log.ip === '::1' ? { code: 'bd', name: 'Bangladesh (Local)' } : null)
              const isExpanded = expandedRow === i

              return (
                <Fragment key={i}>
                  <tr 
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: isExpanded ? '#f1f5f9' : 'none' }}
                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                  >
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', background: isBlocked ? '#dc2626' : '#10b981', borderRadius: '50%' }} title={isBlocked ? 'Blocked Action' : 'Allowed Action'}></span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {loc ? (
                          <>
                            <img src={`https://flagcdn.com/16x12/${loc.code}.png`} alt={loc.code.toUpperCase()} style={{ borderRadius: '2px', width: '16px', height: '12px', display: 'inline-block' }} />
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
                        {log.url?.length > 50 ? log.url.slice(0, 50) + '...' : log.url}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569', padding: '12px 16px' }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{log.ip}</code>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                      <code>{log.ip}</code>
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
                              {loc && <img src={`https://flagcdn.com/16x12/${loc.code}.png`} style={{ borderRadius: '2px', width: '16px', height: '12px', marginRight: '6px', verticalAlign: '-1px', display: 'inline-block' }} alt="" />}
                              <strong>{loc?.name || 'Unknown Location'}</strong> ({log.ip}) was {isBlocked ? 'blocked by firewall for ' : 'allowed access to page ' }
                              <strong>{isBlocked ? log.attack_type : ''}</strong> {isBlocked ? 'in request: ' : ''}
                              <code style={{ fontSize: '12.5px', color: '#dc2626' }}>{isBlocked ? log.rule_matched || log.attack_type : ''}</code> at <a href={log.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{log.url}</a> at {formatDateTime(log.timestamp)}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 16px', marginBottom: '14px', fontSize: '12.5px' }}>
                              <div><strong style={{ color: '#64748b' }}>IP Address:</strong> <code style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>{log.ip}</code></div>
                              <div><strong style={{ color: '#64748b' }}>Hostname:</strong> <code style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>{log.ip}</code></div>
                              <div>
                                <strong style={{ color: '#64748b' }}>Visitor Type:</strong> 
                                <span style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>
                                  {/bot|crawl|spider|google|slurp|bing|yandex|duckduck/i.test(log.user_agent || '') ? 'Search Bot' : 'Human Client'}
                                </span>
                              </div>
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
                              <a href={`https://whois.domaintools.com/${log.ip}`} target="_blank" rel="noreferrer" className="btn-small" style={{ borderColor: '#cbd5e1', color: '#0284c7', fontWeight: '600', height: '32px', padding: '0 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: '11.5px' }}>RUN WHOIS</a>
                              <button onClick={() => handleWhitelistIp(log.ip)} className="btn-small" style={{ borderColor: '#cbd5e1', color: '#15803d', fontWeight: '600', height: '32px', padding: '0 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '11.5px' }}>WHITELIST IP</button>
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
    </>
  )
}
