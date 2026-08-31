import { useState, useEffect, useMemo } from 'react'
import api from '../api/api'

const CATEGORIES = [
  'All Categories',
  'SQL Injection',
  'XSS',
  'RCE & WebShells',
  'LFI / Path Traversal',
  'CMS Vulnerabilities',
  'Bots & Scanners',
  'SSRF & XXE'
]

const ITEMS_PER_PAGE = 25

export default function Rules({ token }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', pattern: '', action: 'block', severity: 'critical', enabled: true })

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchRules = async () => {
    try {
      const data = await api.getRules()
      setRules(Array.isArray(data) ? data : (data.rules || []))
    } catch (err) { 
      console.error(err) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    fetchRules() 
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter])

  const openAddModal = () => {
    setEditingId(null)
    setForm({ name: '', pattern: '', action: 'block', severity: 'critical', enabled: true })
    setShowModal(true)
  }

  const openEditModal = (rule) => {
    setEditingId(rule.id)
    setForm({ name: rule.name, pattern: rule.pattern, action: rule.action, severity: rule.severity, enabled: rule.enabled !== false })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateRule(editingId, form)
      } else {
        await api.createRule(form)
      }
      setShowModal(false)
      fetchRules()
    } catch (err) {
      console.error(err)
      alert('Failed to save rule: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      await api.deleteRule(id)
      fetchRules()
    } catch (err) {
      alert(err.message || 'Failed to delete rule')
    }
  }

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = searchQuery === '' || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.pattern.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === 'All Categories' ||
        (rule.category && rule.category.toLowerCase() === categoryFilter.toLowerCase()) ||
        (rule.name && rule.name.toLowerCase().includes(categoryFilter.toLowerCase()))
      
      return matchesSearch && matchesCategory
    })
  }, [rules, searchQuery, categoryFilter])

  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE) || 1
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRules.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRules, currentPage])

  return (
    <>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
            <input
              type="text"
              placeholder="Search 2,000 global rules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button 
          className="btn-primary" 
          onClick={openAddModal}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}
        >
          <i className="fas fa-plus"></i> Add Global Rule
        </button>
      </div>

      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Signature / Rule Name</th>
              <th style={{ width: '42%' }}>Pattern</th>
              <th style={{ width: '10%' }}>Action</th>
              <th style={{ width: '10%' }}>Severity</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '50px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#2563eb' }}></i>
                  <div style={{ marginTop: '10px', fontSize: '13px' }}>Loading 2,000 global rules...</div>
                </td>
              </tr>
            ) : paginatedRules.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '50px' }}>
                  No matching rules found
                </td>
              </tr>
            ) : (
              paginatedRules.map(rule => (
                <tr key={rule.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{rule.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {rule.category || 'Global Signature'}
                    </div>
                  </td>
                  <td>
                    <code style={{ 
                      background: '#f8fafc', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '11px', 
                      border: '1px solid #e2e8f0', 
                      display: 'inline-block',
                      maxWidth: '460px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {rule.pattern}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${rule.action === 'block' ? 'danger' : 'warning'}`}>
                      {rule.action ? rule.action.toUpperCase() : 'BLOCK'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge severity-${rule.severity || 'high'}`}>
                      {(rule.severity || 'high').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button className="btn-small btn-edit" onClick={() => openEditModal(rule)}>Edit</button>
                      <button className="btn-small btn-delete" onClick={() => handleDelete(rule.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredRules.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginTop: '16px'
        }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length)}</strong> of <strong>{filteredRules.length.toLocaleString()}</strong> global rules
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f1f5f9' : 'white',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
                fontSize: '12px',
                fontWeight: '600',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i> Previous
            </button>

            <span style={{ fontSize: '12px', fontWeight: '700', padding: '0 8px', color: '#0f172a' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f1f5f9' : 'white',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
                fontSize: '12px',
                fontWeight: '600',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '14px' }}>
            <span className="close" onClick={() => setShowModal(false)} style={{ fontSize: '24px' }}>&times;</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#0f172a' }}>
              <i className="fas fa-shield" style={{ color: '#2563eb', marginRight: '8px' }}></i>
              {editingId ? 'Edit Global Rule' : 'Create Global Rule'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Rule Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., Advanced Injection Signature" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Pattern (Regular Expression)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., (?i)(regex_pattern)" 
                  value={form.pattern} 
                  onChange={e => setForm({...form, pattern: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Action</label>
                  <select 
                    value={form.action} 
                    onChange={e => setForm({...form, action: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px', background: 'white' }}
                  >
                    <option value="block">Block</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Severity</label>
                  <select 
                    value={form.severity} 
                    onChange={e => setForm({...form, severity: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px', background: 'white' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <i className="fas fa-save"></i> Save Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
