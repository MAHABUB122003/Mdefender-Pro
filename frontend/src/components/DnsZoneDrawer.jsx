import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV']

export default function DnsZoneDrawer({ isOpen, onClose, website, onRecordUpdated }) {
  const [zone, setZone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dns') // 'dns', 'ssl', 'nameservers', 'subdomains'
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Add Record Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRecord, setNewRecord] = useState({
    type: 'A',
    name: '@',
    content: '',
    ttl: 'Auto',
    proxied: true,
    priority: ''
  })
  const [addingRecord, setAddingRecord] = useState(false)

  // Verify state
  const [verifying, setVerifying] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState(null)

  // SSL mode state
  const [currentSslMode, setCurrentSslMode] = useState('flexible')
  const [updatingSsl, setUpdatingSsl] = useState(false)

  const [feedback, setFeedback] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  const websiteId = website?.id || website?._id

  const loadZoneData = useCallback(async () => {
    if (!websiteId) return
    setLoading(true)
    try {
      const res = await api.getWebsiteZone(websiteId)
      const data = res?.data || res
      setZone(data)
      if (data.ssl_mode) setCurrentSslMode(data.ssl_mode)
    } catch (err) {
      console.error('Failed to load DNS zone:', err)
      setFeedback({ type: 'error', text: err.message || 'Failed to load DNS records' })
    } finally {
      setLoading(false)
    }
  }, [websiteId])

  useEffect(() => {
    if (isOpen && websiteId) {
      loadZoneData()
    }
  }, [isOpen, websiteId, loadZoneData])

  if (!isOpen || !website) return null

  const domain = website.domain || website.name || website.url || 'yourdomain.com'

  const handleCopy = async (text, field) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  // Toggle Proxy Status
  const handleToggleProxy = async (rec) => {
    if (['MX', 'TXT', 'SRV'].includes(rec.type)) {
      alert(`${rec.type} records cannot be proxied through HTTP/HTTPS WAF.`)
      return
    }
    try {
      await api.toggleDnsProxy(websiteId, rec.id)
      setFeedback({
        type: 'success',
        text: `Proxy status for "${rec.name}" updated.`
      })
      await loadZoneData()
      if (onRecordUpdated) onRecordUpdated()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to toggle proxy status' })
    }
  }

  // Delete Record
  const handleDeleteRecord = async (rec) => {
    if (!confirm(`Delete ${rec.type} record "${rec.name}"?`)) return
    try {
      await api.deleteDnsRecord(websiteId, rec.id)
      setFeedback({ type: 'success', text: `Record ${rec.type} "${rec.name}" deleted.` })
      await loadZoneData()
      if (onRecordUpdated) onRecordUpdated()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete record' })
    }
  }

  // Add Record
  const handleAddRecord = async (e) => {
    e.preventDefault()
    if (!newRecord.content.trim()) return
    setAddingRecord(true)
    try {
      await api.addDnsRecord(websiteId, {
        type: newRecord.type,
        name: newRecord.name.trim() || '@',
        content: newRecord.content.trim(),
        ttl: newRecord.ttl,
        proxied: ['MX', 'TXT', 'SRV'].includes(newRecord.type) ? false : newRecord.proxied,
        priority: newRecord.priority ? parseInt(newRecord.priority, 10) : undefined
      })
      setFeedback({ type: 'success', text: `Added ${newRecord.type} record for ${newRecord.name}.` })
      setShowAddModal(false)
      setNewRecord({ type: 'A', name: '@', content: '', ttl: 'Auto', proxied: true, priority: '' })
      await loadZoneData()
      if (onRecordUpdated) onRecordUpdated()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add record' })
    } finally {
      setAddingRecord(false)
    }
  }

  // Update SSL Mode
  const handleUpdateSsl = async (mode) => {
    setCurrentSslMode(mode)
    setUpdatingSsl(true)
    try {
      await api.updateSslMode(websiteId, mode)
      setFeedback({ type: 'success', text: `SSL/TLS encryption mode updated to ${mode.toUpperCase()}.` })
      await loadZoneData()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update SSL mode' })
    } finally {
      setUpdatingSsl(false)
    }
  }

  // Verify Nameservers
  const handleVerifyDns = async () => {
    setVerifying(true)
    setVerifyMessage(null)
    try {
      const res = await api.verifyWebsiteDns(websiteId)
      const data = res?.data || res
      setVerifyMessage({
        verified: data.verified,
        text: data.message || (data.verified ? 'Nameservers verified!' : 'DNS propagation pending.')
      })
      await loadZoneData()
      if (onRecordUpdated) onRecordUpdated()
    } catch (err) {
      setVerifyMessage({ verified: false, text: err.message || 'Verification failed.' })
    } finally {
      setVerifying(false)
    }
  }

  // Filter records
  const records = zone?.records || []
  const filteredRecords = records.filter(r => {
    const matchesSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter
    return matchesSearch && matchesType
  })

  const planMeta = zone?.plan || {}

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        padding: '20px 16px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          width: '100%', maxWidth: '960px', maxHeight: '92vh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          color: '#0f172a', position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#ffffff', position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
            }}>
              <i className="fas fa-network-wired"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                  {domain}
                </h2>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                  background: zone?.verified ? '#ecfdf5' : '#fffbeb',
                  color: zone?.verified ? '#059669' : '#d97706',
                  border: `1px solid ${zone?.verified ? '#a7f3d0' : '#fde68a'}`
                }}>
                  <i className={`fas ${zone?.verified ? 'fa-circle-check' : 'fa-clock'}`} style={{ marginRight: '4px' }}></i>
                  {zone?.verified ? 'Edge Active' : 'Pending Nameservers'}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', textTransform: 'uppercase'
                }}>
                  {planMeta?.name || 'Free'} Plan
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Cloudflare-style DNS Zone Editor &amp; Cloud WAF Routing Configuration
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          padding: '0 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', gap: '4px'
        }}>
          {[
            { id: 'dns', label: 'DNS Records', icon: 'fa-table-list' },
            { id: 'ssl', label: 'SSL / TLS Mode', icon: 'fa-lock' },
            { id: 'nameservers', label: 'Nameservers & Verification', icon: 'fa-server' },
            { id: 'subdomains', label: 'Subdomains Guide', icon: 'fa-sitemap' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: activeTab === tab.id ? '700' : '600',
                color: activeTab === tab.id ? '#f97316' : '#64748b',
                borderBottom: activeTab === tab.id ? '2px solid #f97316' : '2px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px' }}>
          {feedback && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
              background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: feedback.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '13px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
                <span>{feedback.text}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#f97316', marginBottom: '12px' }}></i>
              <div>Loading DNS zone records...</div>
            </div>
          ) : (
            <>
              {/* ================================================================= */}
              {/* TAB 1: DNS RECORDS */}
              {/* ================================================================= */}
              {activeTab === 'dns' && (
                <div>
                  {/* Summary Metric Strip */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px', marginBottom: '20px'
                  }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Total Records</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{records.length}</div>
                    </div>
                    <div style={{ background: '#fff7ed', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                      <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: '700' }}>Proxied (Edge WAF)</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#ea580c', marginTop: '2px' }}>
                        {records.filter(r => r.proxied).length}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>DNS Only (Direct Origin)</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#475569', marginTop: '2px' }}>
                        {records.filter(r => !r.proxied).length}
                      </div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700' }}>Origin Cloaking</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>Active</div>
                    </div>
                  </div>

                  {/* Filter Toolbar & Add Record Trigger */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
                      <div style={{ position: 'relative', flex: '1' }}>
                        <input
                          type="text"
                          placeholder="Search records by name or target..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          style={{
                            width: '100%', height: '38px', padding: '0 12px 0 34px',
                            borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px',
                            background: '#f8fafc', boxSizing: 'border-box'
                          }}
                        />
                        <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8', fontSize: '12px' }}></i>
                      </div>
                      <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', fontWeight: '600' }}
                      >
                        <option value="ALL">All Types</option>
                        {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <button
                      onClick={() => setShowAddModal(true)}
                      style={{
                        padding: '9px 18px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
                      }}
                    >
                      <i className="fas fa-plus"></i>
                      <span>Add Record</span>
                    </button>
                  </div>

                  {/* Add Record Modal / Form */}
                  {showAddModal && (
                    <form onSubmit={handleAddRecord} style={{
                      background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                      padding: '18px', marginBottom: '20px', display: 'grid',
                      gridTemplateColumns: '100px 150px 1fr 110px auto auto', gap: '10px', alignItems: 'center'
                    }}>
                      <select
                        value={newRecord.type}
                        onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '13px', fontWeight: '700' }}
                      >
                        {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Name (@, www, api)"
                        value={newRecord.name}
                        onChange={e => setNewRecord({ ...newRecord, name: e.target.value })}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px', fontWeight: '600' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="IP Address or Hostname"
                        value={newRecord.content}
                        onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px', fontWeight: '600' }}
                        required
                      />
                      <select
                        value={newRecord.ttl}
                        onChange={e => setNewRecord({ ...newRecord, ttl: e.target.value })}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px' }}
                      >
                        <option value="Auto">Auto</option>
                        <option value="1 min">1 min</option>
                        <option value="5 mins">5 mins</option>
                        <option value="1 hour">1 hour</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={['MX', 'TXT', 'SRV'].includes(newRecord.type)}
                          checked={['MX', 'TXT', 'SRV'].includes(newRecord.type) ? false : newRecord.proxied}
                          onChange={e => setNewRecord({ ...newRecord, proxied: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                        />
                        <span>Proxied</span>
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          style={{
                            height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                            background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingRecord}
                          style={{
                            height: '40px', padding: '0 16px', borderRadius: '8px', border: 'none',
                            background: '#10b981', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          {addingRecord ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* DNS Records Table */}
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '12px 16px', width: '80px' }}>Type</th>
                          <th style={{ padding: '12px 16px', width: '150px' }}>Name</th>
                          <th style={{ padding: '12px 16px' }}>Content</th>
                          <th style={{ padding: '12px 16px', width: '90px' }}>TTL</th>
                          <th style={{ padding: '12px 16px', width: '170px' }}>Proxy status</th>
                          <th style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length > 0 ? filteredRecords.map((rec, idx) => {
                          const isProxyable = !['MX', 'TXT', 'SRV'].includes(rec.type)
                          return (
                            <tr key={rec.id || idx} style={{ borderBottom: idx < filteredRecords.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                                  background: rec.type === 'A' ? '#eff6ff' : rec.type === 'CNAME' ? '#f0fdf4' : '#f8fafc',
                                  color: rec.type === 'A' ? '#2563eb' : rec.type === 'CNAME' ? '#16a34a' : '#475569',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  {rec.type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                                {rec.name}
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#334155' }}>
                                {rec.content}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                {rec.ttl || 'Auto'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {isProxyable ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProxy(rec)}
                                    style={{
                                      border: 'none', background: 'none', cursor: 'pointer',
                                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                                      padding: '4px 10px', borderRadius: '6px',
                                      backgroundColor: rec.proxied ? '#fff7ed' : '#f1f5f9'
                                    }}
                                    title="Click to toggle Proxied vs DNS Only"
                                  >
                                    <i className={`fas fa-cloud ${rec.proxied ? 'fa-beat' : ''}`} style={{
                                      color: rec.proxied ? '#f97316' : '#94a3b8', fontSize: '15px'
                                    }}></i>
                                    <span style={{
                                      fontSize: '12px', fontWeight: '700',
                                      color: rec.proxied ? '#c2410c' : '#64748b'
                                    }}>
                                      {rec.proxied ? 'Proxied' : 'DNS Only'}
                                    </span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                                    DNS Only (Not proxyable)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(rec)}
                                  style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                                  title="Delete record"
                                >
                                  <i className="fas fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          )
                        }) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              No DNS records found matching your filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 2: SSL / TLS MODE */}
              {/* ================================================================= */}
              {activeTab === 'ssl' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
                      Edge SSL / TLS Encryption
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Choose how MDefender Pro encrypts traffic between visitor browsers, MDefender Edge, and your origin server.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                      {
                        id: 'flexible',
                        name: 'Flexible',
                        desc: 'Encrypts traffic between visitor browser and MDefender Edge. Edge connects to origin via HTTP port 80.',
                        recommended: 'Good for origins without SSL'
                      },
                      {
                        id: 'full',
                        name: 'Full',
                        desc: 'Encrypts end-to-end. MDefender Edge connects to origin via HTTPS port 443. Self-signed origin cert allowed.',
                        recommended: 'Recommended for standard servers'
                      },
                      {
                        id: 'strict',
                        name: 'Full (Strict)',
                        desc: 'Encrypts end-to-end with strict CA certificate validation on your origin server.',
                        recommended: 'Maximum enterprise security'
                      }
                    ].map(mode => {
                      const isSelected = currentSslMode === mode.id
                      return (
                        <div
                          key={mode.id}
                          onClick={() => handleUpdateSsl(mode.id)}
                          style={{
                            border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                            borderRadius: '12px', padding: '20px', cursor: 'pointer',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            boxShadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fas fa-lock" style={{ color: isSelected ? '#10b981' : '#94a3b8' }}></i>
                              <span>{mode.name}</span>
                            </div>
                            {isSelected && (
                              <span style={{ fontSize: '11px', fontWeight: '800', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', margin: '0 0 12px' }}>
                            {mode.desc}
                          </p>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>
                            <i className="fas fa-shield-halved" style={{ marginRight: '4px' }}></i>
                            {mode.recommended}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Architecture Diagram Info */}
                  <div style={{ background: '#f8fafc', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      <i className="fas fa-route" style={{ color: '#2563eb', marginRight: '6px' }}></i>
                      How Traffic Flows Through MDefender Cloud WAF:
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.6' }}>
                      <code>Visitor Browser</code> &rarr; [HTTPS Anycast Edge (0.35ms ML Core Inspection)] &rarr; [Origin Shield Cloaked Headers] &rarr; <code>Your Origin Server</code>. Malicious requests receive the Cyber 403 block page immediately at the edge.
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 3: NAMESERVERS & VERIFICATION */}
              {/* ================================================================= */}
              {activeTab === 'nameservers' && (
                <div>
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
                    padding: '22px', marginBottom: '24px'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                      Assigned Anycast Nameservers
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
                      Update the nameserver records at your domain registrar to point to MDefender:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      {['ns1.mdefender.pro', 'ns2.mdefender.pro'].map((ns, i) => (
                        <div key={ns} style={{
                          background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px',
                          padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                              Nameserver {i + 1}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                              {ns}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(ns, ns)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
                              background: '#f8fafc', color: copiedField === ns ? '#10b981' : '#2563eb',
                              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <i className={`fas ${copiedField === ns ? 'fa-check' : 'fa-copy'}`}></i>
                            <span>{copiedField === ns ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        CNAME Setup alternative: point <code>proxy.mdefender.pro</code> for supported subdomains.
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyDns}
                        disabled={verifying}
                        style={{
                          padding: '10px 22px', borderRadius: '10px', border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: verifying ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <i className={`fas ${verifying ? 'fa-spinner fa-spin' : 'fa-satellite-dish'}`}></i>
                        <span>{verifying ? 'Checking Nameservers...' : 'Check Nameservers Now'}</span>
                      </button>
                    </div>
                  </div>

                  {verifyMessage && (
                    <div style={{
                      padding: '14px 18px', borderRadius: '10px',
                      background: verifyMessage.verified ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${verifyMessage.verified ? '#a7f3d0' : '#fde68a'}`,
                      color: verifyMessage.verified ? '#065f46' : '#92400e',
                      fontSize: '13px', fontWeight: '600'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={`fas ${verifyMessage.verified ? 'fa-circle-check' : 'fa-clock'}`}></i>
                        <span>{verifyMessage.text}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 4: SUBDOMAINS ARCHITECTURE GUIDE */}
              {/* ================================================================= */}
              {activeTab === 'subdomains' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
                      Subdomain Management Strategies
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Cloudflare and MDefender Pro support two core approaches for routing and managing subdomains:
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Option A: Root Domain Zone */}
                    <div style={{
                      background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
                          Standard (Recommended)
                        </span>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                          A. Subdomains under Root Domain
                        </h4>
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 14px' }}>
                        <code>example.com</code>, <code>www.example.com</code>, <code>api.example.com</code>, and <code>blog.example.com</code> live in the same DNS zone.
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li>Single dashboard to manage all records</li>
                        <li>Unified SSL certificate issuance</li>
                        <li>Individual Proxied 🟠 toggle for each subdomain</li>
                      </ul>
                    </div>

                    {/* Option B: Delegated Subdomain Zone */}
                    <div style={{
                      background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
                          Advanced Tier
                        </span>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                          B. Delegated Subdomain Zone
                        </h4>
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 14px' }}>
                        <code>shop.example.com</code> has its own isolated DNS delegation, dedicated access controls, and independent WAF policies.
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li>Separate team permissions &amp; audit trails</li>
                        <li>Independent WAF rate-limiting limits</li>
                        <li>Requires Go, Pro, or Ultra subscription</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{
                    padding: '14px 18px', borderRadius: '10px', background: '#eff6ff',
                    border: '1px solid #bfdbfe', fontSize: '12.5px', color: '#1e40af', lineHeight: '1.5'
                  }}>
                    <strong>Important origin note:</strong> Adding <code>api.example.com</code> in DNS merely tells browsers and MDefender where to route requests. Your origin server must also be configured (e.g. VirtualHost or Server block) to serve that hostname.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
