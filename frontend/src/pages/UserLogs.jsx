import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

export default function UserLogs() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [logs, setLogs] = useState({ logs: [], total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState(null)
  const perPage = 20

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { page, limit: perPage }
      if (search) params.search = search
      if (ipFilter) params.ip = ipFilter
      if (typeFilter) params.attack_type = typeFilter
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

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
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
      <div className="filters-bar">
        <form onSubmit={handleFilter} className="filter-form">
          <input type="text" placeholder="Search IP, URL, Attack..." value={search} onChange={e => setSearch(e.target.value)} />
          <input type="text" placeholder="Filter by IP" value={ipFilter} onChange={e => setIpFilter(e.target.value)} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Attack Types</option>
            <option value="SQL Injection">SQL Injection</option>
            <option value="XSS">XSS</option>
            <option value="LFI">LFI</option>
            <option value="Command Injection">Command Injection</option>
            <option value="CSRF">CSRF</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Date From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Date To" />
          <button type="submit" className="btn-filter">Filter</button>
        </form>
      </div>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>IP</th>
              <th>URL</th>
              <th>Attack Type</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Loading...</td></tr>
            ) : logs.logs?.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>No logs found</td></tr>
            ) : logs.logs?.map((log, i) => (
              <tr key={i}>
                <td>{(page - 1) * perPage + i + 1}</td>
                <td><code>{log.ip}</code></td>
                <td>{log.url?.slice(0, 50)}{log.url?.length > 50 ? '...' : ''}</td>
                <td><span className="badge danger">{log.attack_type}</span></td>
                <td><code>{log.confidence != null ? Number(log.confidence).toFixed(2) : '-'}</code></td>
                <td><span className={`badge ${log.status === 'blocked' ? 'danger' : 'success'}`}>{log.status}</span></td>
                <td>{log.timestamp}</td>
                <td>
                  <button className="btn-small btn-edit" onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                    <i className={`fas fa-eye${expandedRow === i ? '-slash' : ''}`}></i> {expandedRow === i ? 'Hide' : 'Details'}
                  </button>
                </td>
              </tr>
            ))}
            {expandedRow != null && logs.logs?.[expandedRow] && (
              <tr>
                <td colSpan="8" style={{ background: '#f8fafc', padding: '16px 20px', fontSize: '13px', lineHeight: '1.8' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                    <div><strong>IP:</strong> <code>{logs.logs[expandedRow].ip}</code></div>
                    <div><strong>Method:</strong> {logs.logs[expandedRow].method || 'N/A'}</div>
                    <div><strong>URL:</strong> {logs.logs[expandedRow].url}</div>
                    <div><strong>Attack Type:</strong> {logs.logs[expandedRow].attack_type}</div>
                    <div><strong>Confidence:</strong> {logs.logs[expandedRow].confidence != null ? Number(logs.logs[expandedRow].confidence).toFixed(4) : 'N/A'}</div>
                    <div><strong>Rule Matched:</strong> {logs.logs[expandedRow].rule_matched || 'N/A'}</div>
                    <div><strong>Status:</strong> {logs.logs[expandedRow].status}</div>
                    <div><strong>Timestamp:</strong> {logs.logs[expandedRow].timestamp}</div>
                  </div>
                  {logs.logs[expandedRow].user_agent && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>User Agent:</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>{logs.logs[expandedRow].user_agent}</div>
                    </div>
                  )}
                </td>
              </tr>
            )}
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
