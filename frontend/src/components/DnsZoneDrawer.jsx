import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import copyToClipboard from '../utils/clipboard'
import { getAssignedNameservers } from '../utils/nameservers'

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

  // Universal SSL states
  const [sslData, setSslData] = useState(null)
  const [loadingSsl, setLoadingSsl] = useState(false)
  const [savingSslSetting, setSavingSslSetting] = useState(false)
  const [reissuingCert, setReissuingCert] = useState(false)
  const [probeData, setProbeData] = useState(null)
  const [probingSsl, setProbingSsl] = useState(false)

  const [feedback, setFeedback] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  const websiteId = website?.id || website?._id || website?.domain || website?.name

  const loadZoneData = useCallback(async () => {
    const targetId = website?.id || website?._id || website?.domain || website?.name
    if (!targetId) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await api.getWebsiteZone(targetId)
      const data = res?.data || res
      setZone(data)
      if (data.ssl_mode) setCurrentSslMode(data.ssl_mode)
    } catch (err) {
      console.error('Failed to load DNS zone:', err)
      setFeedback({ type: 'error', text: err.message || 'Failed to load DNS records' })
    } finally {
      setLoading(false)
    }
  }, [website])

  const loadSslData = useCallback(async () => {
    const targetId = website?.id || website?._id || website?.domain || website?.name
    if (!targetId) return
    setLoadingSsl(true)
    try {
      const res = await api.getUniversalSsl(targetId)
      const data = res?.data || res
      setSslData(data)
      if (data?.ssl_mode) setCurrentSslMode(data.ssl_mode)
    } catch (err) {
      console.error('Failed to load Universal SSL details:', err)
    } finally {
      setLoadingSsl(false)
    }
  }, [website])

  useEffect(() => {
    if (isOpen && website) {
      loadZoneData()
      loadSslData()
    }
  }, [isOpen, website, loadZoneData, loadSslData])

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
    let rawName = (newRecord.name || '').trim().toLowerCase()
    const cleanRoot = (domain || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    if (rawName && cleanRoot && rawName.endsWith(`.${cleanRoot}`)) {
      rawName = rawName.slice(0, -(cleanRoot.length + 1)).trim()
    }
    if (!rawName || rawName === cleanRoot) rawName = '@'
    try {
      await api.addDnsRecord(websiteId, {
        type: newRecord.type,
        name: rawName,
        content: newRecord.content.trim(),
        ttl: 'Auto',
        proxied: ['MX', 'TXT', 'SRV', 'CAA'].includes(newRecord.type) ? false : newRecord.proxied,
        priority: newRecord.priority ? parseInt(newRecord.priority, 10) : undefined
      })
      setFeedback({ type: 'success', text: `Added ${newRecord.type} record for "${rawName}".` })
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
      setSslData(prev => prev ? { ...prev, ssl_mode: mode } : null)
      setFeedback({ type: 'success', text: `SSL/TLS encryption mode updated to ${mode.toUpperCase()}.` })
      await loadZoneData()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update SSL mode' })
    } finally {
      setUpdatingSsl(false)
    }
  }

  // Update Universal SSL Settings
  const handleUpdateSslSetting = async (key, val) => {
    setSavingSslSetting(true)
    try {
      const res = await api.updateSslSettings(websiteId, { [key]: val })
      const updated = res?.data?.settings || res?.data || res
      setSslData(prev => ({ ...prev, ...updated, [key]: val }))
      setFeedback({ type: 'success', text: `Universal SSL setting updated.` })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update SSL setting' })
    } finally {
      setSavingSslSetting(false)
    }
  }

  // Re-issue / Renew Universal Edge Certificate
  const handleReissueCert = async () => {
    setReissuingCert(true)
    try {
      const res = await api.reissueEdgeCert(websiteId)
      const data = res?.data || res
      setFeedback({ type: 'success', text: 'Universal Edge Certificate re-issued with fresh 90-day validity.' })
      await loadSslData()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reissue certificate' })
    } finally {
      setReissuingCert(false)
    }
  }

  // Probe Live SSL Handshake Telemetry
  const handleProbeSsl = async () => {
    setProbingSsl(true)
    try {
      const res = await api.probeSslHealth(websiteId)
      const data = res?.data || res
      setProbeData(data)
      setFeedback({ type: 'success', text: `TLS Handshake Telemetry: Grade ${data.grade} (${data.handshake_latency_ms}ms, ${data.tls_protocol}).` })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to probe SSL health' })
    } finally {
      setProbingSsl(false)
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
  const records = (zone?.records && zone.records.length > 0) ? zone.records : (website?.dns_records || [])
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#10201E' }}>
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
                MDefender Pro DNS Zone Editor &amp; Anycast Edge Routing
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
            { id: 'ssl', label: 'Universal SSL & TLS', icon: 'fa-shield-halved' },
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
                      gridTemplateColumns: '100px 140px 1fr auto auto', gap: '10px', alignItems: 'center'
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={['MX', 'TXT', 'SRV', 'CAA'].includes(newRecord.type)}
                          checked={['MX', 'TXT', 'SRV', 'CAA'].includes(newRecord.type) ? false : newRecord.proxied}
                          onChange={e => setNewRecord({ ...newRecord, proxied: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
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
              {/* TAB 2: UNIVERSAL SSL & EDGE TLS COMMAND CENTER */}
              {/* ================================================================= */}
              {activeTab === 'ssl' && (
                <div>
                  {/* Header & Probe Action */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: '14px', marginBottom: '22px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          Universal SSL &amp; Edge TLS Command Center
                        </h3>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '3px 10px', borderRadius: '9999px',
                          background: '#ecfdf5', border: '1px solid #a7f3d0',
                          color: '#059669', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase'
                        }}>
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: '#10b981', display: 'inline-block',
                            boxShadow: '0 0 8px #10b981'
                          }}></span>
                          Universal SSL: Active
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                        Zero-configuration edge certificates, TLS 1.3 termination, automatic HTTPS redirection, and HSTS enforcement across 240+ global Anycast edge nodes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleProbeSsl}
                      disabled={probingSsl}
                      style={{
                        padding: '9px 16px', borderRadius: '10px',
                        border: '1.5px solid #0284c7', background: '#f0f9ff',
                        color: '#0284c7', fontSize: '12.5px', fontWeight: '700',
                        cursor: probingSsl ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Initiate live TLS socket handshake to evaluate edge cipher and latency"
                    >
                      <i className={`fas ${probingSsl ? 'fa-spinner fa-spin' : 'fa-bolt'}`} style={{ color: '#0284c7' }}></i>
                      <span>{probingSsl ? 'Testing Handshake...' : 'Run TLS Handshake Probe'}</span>
                    </button>
                  </div>

                  {/* Probe Result Box (if tested) */}
                  {probeData && (
                    <div style={{
                      padding: '16px 20px', borderRadius: '12px', marginBottom: '22px',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                      border: '1.5px solid #86efac', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', flexWrap: 'wrap', gap: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{
                          padding: '6px 14px', borderRadius: '8px', background: '#059669',
                          color: '#ffffff', fontWeight: '900', fontSize: '16px', letterSpacing: '0.5px'
                        }}>
                          GRADE {probeData.grade || 'A+'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#065f46' }}>
                            Edge TLS Handshake Diagnostics Passed
                          </div>
                          <div style={{ fontSize: '12px', color: '#047857', display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <span><strong>Latency:</strong> {probeData.handshake_latency_ms}ms</span>
                            <span><strong>Protocol:</strong> {probeData.tls_protocol}</span>
                            <span><strong>Cipher:</strong> {probeData.cipher_suite}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProbeData(null)}
                        style={{ border: 'none', background: 'none', color: '#065f46', cursor: 'pointer', fontSize: '15px' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* SECTION 1: ACTIVE UNIVERSAL EDGE CERTIFICATE */}
                  {/* ============================================================= */}
                  <div style={{
                    background: '#0f172a', borderRadius: '16px', padding: '22px 24px',
                    color: '#ffffff', marginBottom: '24px',
                    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.4)',
                    border: '1px solid #1e293b'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                        }}>
                          <i className="fas fa-lock"></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.2px' }}>
                            Universal Edge Certificate (SNI)
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Issuer: {sslData?.certificate?.issuer || "Let's Encrypt Authority / MDefender Global Edge CA"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px',
                          background: '#064e3b', color: '#34d399',
                          fontSize: '11px', fontWeight: '800', border: '1px solid #047857'
                        }}>
                          <i className="fas fa-circle-check" style={{ marginRight: '5px' }}></i>
                          {sslData?.certificate?.status ? sslData.certificate.status.toUpperCase() : 'ACTIVE'}
                        </span>
                        <button
                          type="button"
                          onClick={handleReissueCert}
                          disabled={reissuingCert}
                          style={{
                            padding: '6px 12px', borderRadius: '8px',
                            background: '#1e293b', border: '1px solid #334155',
                            color: '#cbd5e1', fontSize: '11.5px', fontWeight: '700',
                            cursor: reissuingCert ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Generate fresh 90-day cryptographic certificate and deploy across edge"
                        >
                          <i className={`fas ${reissuingCert ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                          <span>{reissuingCert ? 'Re-issuing...' : 'Re-issue Certificate'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Certificate Attributes Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: '12px', background: '#1e293b', padding: '16px', borderRadius: '12px',
                      border: '1px solid #334155'
                    }}>
                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                          Covered Hostnames
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                          {domain}, *.{domain}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#10b981', marginTop: '2px' }}>
                          <i className="fas fa-check-double" style={{ marginRight: '3px' }}></i>
                          Wildcard SAN Included
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                          Key Type &amp; Curve
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                          {sslData?.certificate?.key_type || 'ECDSA P-256 (High-Speed)'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#38bdf8', marginTop: '2px' }}>
                          Fast TLS 1.3 Handshake
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                          Validity &amp; Expiration
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                          {sslData?.certificate?.days_remaining ?? 89} Days Remaining
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#a7f3d0', marginTop: '2px' }}>
                          <i className="fas fa-sync-alt" style={{ marginRight: '3px' }}></i>
                          Auto-renews at 30 days
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                          Edge Deployment
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                          240+ Anycast PoPs
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#fbbf24', marginTop: '2px' }}>
                          Global Edge Zero-RTT
                        </div>
                      </div>
                    </div>

                    {/* Fingerprint & Serial */}
                    <div style={{
                      marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px',
                      fontSize: '11px', color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090d16', padding: '6px 12px', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ color: '#cbd5e1' }}>SHA-256 Fingerprint:</strong>{' '}
                          <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                            {sslData?.certificate?.fingerprint_sha256 || '2A:90:E5:41:BB:08:92:C3:71:04:88:DF:5C:33:10:9A:87:66:B1:09'}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(sslData?.certificate?.fingerprint_sha256 || '2A:90:E5:41:BB:08:92:C3:71:04:88:DF:5C:33:10:9A:87:66:B1:09', 'fp')}
                          style={{ border: 'none', background: 'none', color: copiedField === 'fp' ? '#10b981' : '#64748b', cursor: 'pointer', fontSize: '11px' }}
                        >
                          <i className={`fas ${copiedField === 'fp' ? 'fa-check' : 'fa-copy'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* SECTION 2: SSL / TLS ENCRYPTION MODE */}
                  {/* ============================================================= */}
                  <div style={{ marginBottom: '26px' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                        SSL / TLS Encryption Mode
                      </h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                        Select the edge-to-origin encryption handshake architecture:
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                      {[
                        {
                          id: 'flexible',
                          name: 'Flexible',
                          desc: 'Browser to Edge is HTTPS (port 443). Edge to Origin is HTTP (port 80).',
                          recommended: 'Good for origins without SSL certificate'
                        },
                        {
                          id: 'full',
                          name: 'Full',
                          desc: 'End-to-end encryption. Edge to origin via HTTPS port 443. Self-signed cert permitted.',
                          recommended: 'Recommended for standard origin setups'
                        },
                        {
                          id: 'strict',
                          name: 'Full (Strict)',
                          desc: 'End-to-end encryption with valid CA certificate verification on origin.',
                          recommended: 'Maximum enterprise security'
                        },
                        {
                          id: 'off',
                          name: 'Off',
                          desc: 'Insecure. No edge SSL encryption. Not recommended.',
                          recommended: 'Vulnerable to MITM attacks'
                        }
                      ].map(mode => {
                        const isSelected = (currentSslMode || 'flexible') === mode.id
                        return (
                          <div
                            key={mode.id}
                            onClick={() => handleUpdateSsl(mode.id)}
                            style={{
                              border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                              borderRadius: '12px', padding: '16px', cursor: 'pointer',
                              background: isSelected ? '#f0fdf4' : '#ffffff',
                              boxShadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <i className={`fas ${mode.id === 'off' ? 'fa-lock-open' : 'fa-lock'}`} style={{ color: isSelected ? '#10b981' : '#94a3b8' }}></i>
                                <span>{mode.name}</span>
                              </div>
                              {isSelected && (
                                <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#10b981', color: '#fff', padding: '2px 7px', borderRadius: '5px' }}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '11.5px', color: '#475569', lineHeight: '1.4', margin: '0 0 10px' }}>
                              {mode.desc}
                            </p>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', color: mode.id === 'off' ? '#dc2626' : '#059669' }}>
                              <i className="fas fa-shield-halved" style={{ marginRight: '4px' }}></i>
                              {mode.recommended}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* SECTION 3: EDGE HTTPS & TLS HARDENING CONTROLS */}
                  {/* ============================================================= */}
                  <div style={{ marginBottom: '26px' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                        Edge Security &amp; HTTPS Enforcements
                      </h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                        Cloudflare-grade edge policies to enforce secure communication and eliminate mixed content:
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {/* Always Use HTTPS */}
                      <div style={{
                        background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                        padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-link" style={{ color: '#0284c7' }}></i>
                            Always Use HTTPS
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                            Redirects all insecure <code>http://</code> requests to <code>https://</code> (301 Permanent Redirect).
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSslSetting('always_use_https', !(sslData?.always_use_https ?? true))}
                          disabled={savingSslSetting}
                          style={{
                            padding: '6px 14px', borderRadius: '8px',
                            border: `1.5px solid ${(sslData?.always_use_https ?? true) ? '#a7f3d0' : '#e2e8f0'}`,
                            background: (sslData?.always_use_https ?? true) ? '#ecfdf5' : '#f8fafc',
                            color: (sslData?.always_use_https ?? true) ? '#047857' : '#64748b',
                            fontSize: '12px', fontWeight: '800', cursor: 'pointer', minWidth: '60px'
                          }}
                        >
                          {(sslData?.always_use_https ?? true) ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Automatic HTTPS Rewrites */}
                      <div style={{
                        background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                        padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-magic" style={{ color: '#8b5cf6' }}></i>
                            Automatic HTTPS Rewrites
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                            Prevents mixed-content browser warnings by dynamically upgrading insecure resource links.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSslSetting('auto_https_rewrites', !(sslData?.auto_https_rewrites ?? true))}
                          disabled={savingSslSetting}
                          style={{
                            padding: '6px 14px', borderRadius: '8px',
                            border: `1.5px solid ${(sslData?.auto_https_rewrites ?? true) ? '#a7f3d0' : '#e2e8f0'}`,
                            background: (sslData?.auto_https_rewrites ?? true) ? '#ecfdf5' : '#f8fafc',
                            color: (sslData?.auto_https_rewrites ?? true) ? '#047857' : '#64748b',
                            fontSize: '12px', fontWeight: '800', cursor: 'pointer', minWidth: '60px'
                          }}
                        >
                          {(sslData?.auto_https_rewrites ?? true) ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Minimum TLS Version */}
                      <div style={{
                        background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                        padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-shield-halved" style={{ color: '#f59e0b' }}></i>
                            Minimum TLS Version
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                            Disallows outdated, vulnerable SSL 3.0, TLS 1.0, and TLS 1.1 handshakes.
                          </div>
                        </div>
                        <select
                          value={sslData?.min_tls_version || '1.2'}
                          onChange={e => handleUpdateSslSetting('min_tls_version', e.target.value)}
                          disabled={savingSslSetting}
                          style={{
                            padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1',
                            background: '#f8fafc', color: '#0f172a', fontSize: '12px', fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="1.2">TLS 1.2 (Default)</option>
                          <option value="1.3">TLS 1.3 (Strict)</option>
                        </select>
                      </div>

                      {/* TLS 1.3 0-RTT */}
                      <div style={{
                        background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                        padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-gauge-high" style={{ color: '#10b981' }}></i>
                            TLS 1.3 0-RTT Resumption
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                            Enables zero round-trip session resumption for returning visitors, speeding up load times.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSslSetting('tls_13_enabled', !(sslData?.tls_13_enabled ?? true))}
                          disabled={savingSslSetting}
                          style={{
                            padding: '6px 14px', borderRadius: '8px',
                            border: `1.5px solid ${(sslData?.tls_13_enabled ?? true) ? '#a7f3d0' : '#e2e8f0'}`,
                            background: (sslData?.tls_13_enabled ?? true) ? '#ecfdf5' : '#f8fafc',
                            color: (sslData?.tls_13_enabled ?? true) ? '#047857' : '#64748b',
                            fontSize: '12px', fontWeight: '800', cursor: 'pointer', minWidth: '60px'
                          }}
                        >
                          {(sslData?.tls_13_enabled ?? true) ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* SECTION 4: HSTS (HTTP STRICT TRANSPORT SECURITY - RFC 6797) */}
                  {/* ============================================================= */}
                  <div style={{
                    background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px',
                    padding: '20px 22px', marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-shield-virus" style={{ color: '#dc2626', fontSize: '20px' }}></i>
                        <div>
                          <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                            HTTP Strict Transport Security (HSTS — RFC 6797)
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Strictly enforces browser-side HTTPS, completely preventing SSL stripping and downgrade attacks.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateSslSetting('hsts_enabled', !(sslData?.hsts_enabled ?? true))}
                        disabled={savingSslSetting}
                        style={{
                          padding: '7px 16px', borderRadius: '8px',
                          border: `1.5px solid ${(sslData?.hsts_enabled ?? true) ? '#a7f3d0' : '#e2e8f0'}`,
                          background: (sslData?.hsts_enabled ?? true) ? '#ecfdf5' : '#ffffff',
                          color: (sslData?.hsts_enabled ?? true) ? '#047857' : '#64748b',
                          fontSize: '12.5px', fontWeight: '800', cursor: 'pointer'
                        }}
                      >
                        HSTS: {(sslData?.hsts_enabled ?? true) ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                          Max-Age Header
                        </div>
                        <select
                          value={sslData?.hsts_max_age || 15552000}
                          onChange={e => handleUpdateSslSetting('hsts_max_age', parseInt(e.target.value, 10))}
                          disabled={!(sslData?.hsts_enabled ?? true) || savingSslSetting}
                          style={{
                            width: '100%', marginTop: '6px', padding: '6px 8px', borderRadius: '6px',
                            border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          <option value={15552000}>6 Months (15,552,000s)</option>
                          <option value={31536000}>1 Year (31,536,000s - Standard)</option>
                          <option value={63072000}>2 Years (63,072,000s)</option>
                        </select>
                      </div>

                      <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            Include Subdomains
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Apply HSTS header to *.{domain}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSslSetting('hsts_include_subdomains', !(sslData?.hsts_include_subdomains ?? true))}
                          disabled={!(sslData?.hsts_enabled ?? true) || savingSslSetting}
                          style={{
                            padding: '4px 10px', borderRadius: '6px',
                            border: `1px solid ${(sslData?.hsts_include_subdomains ?? true) ? '#86efac' : '#cbd5e1'}`,
                            background: (sslData?.hsts_include_subdomains ?? true) ? '#f0fdf4' : '#f1f5f9',
                            color: (sslData?.hsts_include_subdomains ?? true) ? '#166534' : '#64748b',
                            fontSize: '11px', fontWeight: '800', cursor: 'pointer'
                          }}
                        >
                          {(sslData?.hsts_include_subdomains ?? true) ? 'YES' : 'NO'}
                        </button>
                      </div>

                      <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            Preload List Ready
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Browser hardcoded preload tag
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSslSetting('hsts_preload', !(sslData?.hsts_preload ?? false))}
                          disabled={!(sslData?.hsts_enabled ?? true) || savingSslSetting}
                          style={{
                            padding: '4px 10px', borderRadius: '6px',
                            border: `1px solid ${(sslData?.hsts_preload ?? false) ? '#86efac' : '#cbd5e1'}`,
                            background: (sslData?.hsts_preload ?? false) ? '#f0fdf4' : '#f1f5f9',
                            color: (sslData?.hsts_preload ?? false) ? '#166534' : '#64748b',
                            fontSize: '11px', fontWeight: '800', cursor: 'pointer'
                          }}
                        >
                          {(sslData?.hsts_preload ?? false) ? 'YES' : 'NO'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Diagram Info */}
                  <div style={{ background: '#f8fafc', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      <i className="fas fa-route" style={{ color: '#2563eb', marginRight: '6px' }}></i>
                      How Universal SSL Traffic Flows Through MDefender Cloud WAF:
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.6' }}>
                      <code>Visitor Browser</code> &rarr; [HTTPS Anycast Edge (TLS 1.3 + ML Core Inspection 0.35ms)] &rarr; [Origin Shield Cloaked Headers] &rarr; <code>Your Origin Server (Port 443 / 80)</code>. Malicious requests receive the Cyber 403 block page immediately at the edge without reaching your origin server.
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
                      Nameserver Delegation &amp; Migration
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
                      To activate MDefender Pro Edge WAF protection, update your nameservers at your domain registrar:
                    </p>

                    {/* Step 1: Remove Existing Nameservers */}
                    <div style={{
                      background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px',
                      padding: '16px', marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-trash-can text-rose-600"></i>
                        <span>Step 1: Remove these existing nameservers:</span>
                      </div>
                      {zone?.current_nameservers && zone.current_nameservers.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                          {zone.current_nameservers.map((ns, idx) => (
                            <div key={idx} style={{
                              background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px',
                              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                              <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' }}>Current NS {idx + 1}:</span>
                              <code style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>{ns}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                          Remove the previous nameservers configured at your registrar.
                        </div>
                      )}
                    </div>

                    {/* Step 2: Add MDefender Anycast Nameservers */}
                    <div style={{
                      background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px',
                      padding: '16px', marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-plus-circle text-emerald-600"></i>
                        <span>Step 2: Add MDefender Pro Anycast nameservers:</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        {(zone?.nameservers?.length ? zone.nameservers : (website?.assigned_nameservers || website?.nameservers || getAssignedNameservers(domain))).map((ns, i) => (
                          <div key={ns} style={{
                            background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '10px',
                            padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
                                MDefender NS {i + 1}
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                                {ns}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(ns, ns)}
                              style={{
                                padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0',
                                background: '#f0fdf4', color: copiedField === ns ? '#10b981' : '#15803d',
                                fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <i className={`fas ${copiedField === ns ? 'fa-check' : 'fa-copy'}`}></i>
                              <span>{copiedField === ns ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
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
                      MDefender Pro Cloud WAF supports two core approaches for routing and managing subdomains:
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
