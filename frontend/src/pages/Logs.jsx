import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Logs({ token }) {
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
      const data = await api.getLogs(params)
      setLogs(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [page])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
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
          <button type="button" className="btn-export" onClick={() => window.open(`/api/admin/logs?export=csv&search=${search}&ip=${ipFilter}&attack_type=${typeFilter}`)}>Export CSV</button>
        </form>
        <div className="log-actions-bar">
          <button className="btn-clean-logs" onClick={async () => { if (confirm('Delete all logs older than 7 days?')) { await api.cleanLogs(7); fetchLogs() } }}><i className="fas fa-clock"></i> Clean 7+ Days</button>
          <button className="btn-clean-logs" onClick={async () => { if (confirm('Delete all logs older than 30 days?')) { await api.cleanLogs(30); fetchLogs() } }}><i className="fas fa-calendar"></i> Clean 30+ Days</button>
          <button className="btn-clean-logs danger" onClick={async () => { if (confirm('WARNING: Delete ALL logs?') && confirm('Are you absolutely sure?')) { await api.cleanAllLogs(); fetchLogs() } }}><i className="fas fa-trash"></i> Clean All Logs</button>
        </div>
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
              <>
                <tr key={i} style={{ cursor: 'pointer' }}>
                  <td>{(page - 1) * perPage + i + 1}</td>
                  <td><code>{log.ip}</code></td>
                  <td>{log.url?.slice(0, 50)}{log.url?.length > 50 ? '...' : ''}</td>
                  <td><span className="badge danger">{log.attack_type}</span></td>
                  <td><code>{log.confidence != null ? Number(log.confidence).toFixed(2) : '-'}</code></td>
                  <td><span className={`badge ${log.status === 'blocked' ? 'danger' : 'success'}`}>{log.status}</span></td>
                  <td>{log.timestamp}</td>
                  <td>
                    <button className="btn-small btn-edit" onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === i ? null : i) }}>
                      <i className="fas fa-eye"></i> Details
                    </button>
                  </td>
                </tr>
                {expandedRow === i && (
                  <tr key={`detail-${i}`} className="details-row">
                    <td colSpan="8">
                      <div className="log-details">
                        <p><strong>IP:</strong> {log.ip}</p>
                        <p><strong>URL:</strong> {log.url}</p>
                        <p><strong>Method:</strong> {log.method}</p>
                        <p><strong>Attack Type:</strong> {log.attack_type}</p>
                        <p><strong>Confidence:</strong> {log.confidence != null ? Number(log.confidence).toFixed(4) : 'N/A'}</p>
                        <p><strong>Status:</strong> {log.status}</p>
                        {log.user_agent && <p><strong>User-Agent:</strong> {log.user_agent}</p>}
                        {log.referer && <p><strong>Referer:</strong> {log.referer}</p>}
                        {log.rule_matched && <p><strong>Rule Matched:</strong> {log.rule_matched}</p>}
                        {log.request_body && <p><strong>Request Body:</strong> {log.request_body.slice(0, 200)}{log.request_body.length > 200 ? '...' : ''}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
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
