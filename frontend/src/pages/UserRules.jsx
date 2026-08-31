import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'
import userStore from '../utils/userStore'

const CATEGORIES = [
  'All Categories',
  'SQL Injection',
  'XSS',
  'RCE & WebShells',
  'LFI / Path Traversal',
  'CMS Vulnerabilities',
  'Bots & Scanners',
  'SSRF & XXE',
  'Custom'
]

const ITEMS_PER_PAGE = 25

export default function UserRules() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [rules, setRules] = useState(() => userStore.get('rules') || [])
  const [loading, setLoading] = useState(() => !userStore.get('rules'))
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('global')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', pattern: '', action: 'block', severity: 'critical', enabled: true })

  const fetchRules = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const data = await api.getUserRules()
      const list = Array.isArray(data) ? data : (data.rules || [])
      setRules(list)
      userStore.set('rules', list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }

  useEffect(() => {
    if (!isPremium) {
      setLoading(false)
      return
    }
    fetchRules(false)
  }, [isPremium])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, activeTab])

  const openAddModal = () => {
    setEditingId(null)
    setForm({ name: '', pattern: '', action: 'block', severity: 'critical', enabled: true })
    setShowModal(true)
  }

  const openEditModal = (rule) => {
    setEditingId(rule.id)
    setForm({ name: rule.name, pattern: rule.pattern, action: rule.action, severity: rule.severity, enabled: rule.enabled })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateUserRule(editingId, form)
      } else {
        await api.createUserRule(form)
      }
      setShowModal(false)
      fetchRules()
    } catch (err) {
      alert(err.message || 'Failed to save rule')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this custom rule?')) return
    try {
      await api.deleteUserRule(id)
      fetchRules()
    } catch (err) {
      alert(err.message || 'Failed to delete rule')
    }
  }

  const handleToggle = async (rule) => {
    try {
      await api.updateUserRule(rule.id, { enabled: !rule.enabled })
      fetchRules()
    } catch (err) {
      alert(err.message || 'Failed to toggle rule')
    }
  }

  const customRules = useMemo(() => rules.filter(r => r.is_custom), [rules])
  const globalRules = useMemo(() => rules.filter(r => !r.is_custom), [rules])

  const currentTabRules = activeTab === 'custom' ? customRules : globalRules

  const filteredRules = useMemo(() => {
    return currentTabRules.filter(rule => {
      const matchesSearch = searchQuery === '' || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.pattern.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === 'All Categories' ||
        (rule.category && rule.category.toLowerCase() === categoryFilter.toLowerCase()) ||
        (rule.name && rule.name.toLowerCase().includes(categoryFilter.toLowerCase()))
      
      return matchesSearch && matchesCategory
    })
  }, [currentTabRules, searchQuery, categoryFilter])

  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE) || 1
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRules.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRules, currentPage])

  if (!isPremium) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px', background: '#fffbeb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          fontSize: '32px', color: '#d97706',
        }}>
          <i className="fas fa-lock"></i>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Premium Feature</h2>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto 24px' }}>
          2,000+ Enterprise WAF Rules and custom rule management are available for Premium subscribers.
        </p>
        <Link to="/user/settings" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
          textDecoration: 'none', fontFamily: 'inherit',
          boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
        }}>
          <i className="fas fa-crown"></i> Upgrade to Premium
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('global')}
          style={{
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            fontSize: '15px',
            fontWeight: '700',
            color: activeTab === 'global' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'global' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <i className="fas fa-shield-halved" style={{ marginRight: '6px' }}></i>
          Global Default Rules ({globalRules.length.toLocaleString()})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          style={{
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            fontSize: '15px',
            fontWeight: '700',
            color: activeTab === 'custom' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'custom' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <i className="fas fa-user-shield" style={{ marginRight: '6px' }}></i>
          My Custom Rules ({customRules.length})
        </button>
      </div>

      {/* Action and Filter Ribbon */}
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
              placeholder="Search 2,000 rules by name or regex pattern..."
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

        {activeTab === 'custom' && (
          <button 
            className="btn-primary" 
            onClick={openAddModal} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}
          >
            <i className="fas fa-plus"></i> Add Custom Rule
          </button>
        )}
      </div>

      {/* Rules Table */}
      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Signature / Rule Name</th>
              <th style={{ width: '42%' }}>Detection Pattern (Regex)</th>
              <th style={{ width: '10%' }}>Action</th>
              <th style={{ width: '10%' }}>Severity</th>
              <th style={{ width: '10%', textAlign: activeTab === 'custom' ? 'right' : 'center' }}>
                {activeTab === 'custom' ? 'Actions' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '50px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#2563eb' }}></i>
                  <div style={{ marginTop: '10px', fontSize: '13px' }}>Loading 2,000 enterprise security rules...</div>
                </td>
              </tr>
            ) : paginatedRules.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '60px 20px' }}>
                  <i className="fas fa-filter" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>No matching rules found</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    Try clearing your search query or selecting a different category filter.
                  </span>
                </td>
              </tr>
            ) : (
              paginatedRules.map(rule => (
                <tr key={rule.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{rule.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {rule.category || (rule.is_custom ? 'Custom User Rule' : 'Standard Vector')}
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
                  <td style={{ textAlign: activeTab === 'custom' ? 'right' : 'center' }}>
                    {activeTab === 'custom' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="btn-small btn-edit" onClick={() => openEditModal(rule)}>Edit</button>
                        <button className="btn-small btn-delete" onClick={() => handleDelete(rule.id)}>Delete</button>
                      </div>
                    ) : (
                      <label className="switch" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                        <input type="checkbox" checked={rule.enabled !== false} readOnly />
                        <span className="slider"></span>
                      </label>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
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
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length)}</strong> of <strong>{filteredRules.length.toLocaleString()}</strong> rules
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

      {/* Modal for adding/editing custom rules */}
      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '14px' }}>
            <span className="close" onClick={() => setShowModal(false)} style={{ fontSize: '24px' }}>&times;</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#0f172a' }}>
              <i className="fas fa-shield-halved" style={{ color: '#2563eb', marginRight: '8px' }}></i>
              {editingId ? 'Edit Custom WAF Rule' : 'Create Custom WAF Rule'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Rule Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., Custom Parameter Injection Defense" 
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
                  placeholder="e.g., (?i)(sensitive_keyword)" 
                  value={form.pattern} 
                  onChange={e => setForm({...form, pattern: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Use PCRE compatible regex. Example: <code>(?i)(select|union)</code> is case-insensitive.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>Action</label>
                  <select 
                    value={form.action} 
                    onChange={e => setForm({...form, action: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '13px', background: 'white' }}
                  >
                    <option value="block">Block request</option>
                    <option value="alert">Log & monitor</option>
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
    </div>
  )
}
