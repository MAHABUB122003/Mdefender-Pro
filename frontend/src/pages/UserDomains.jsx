import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'
import DnsZoneDrawer from '../components/DnsZoneDrawer'
import DnsOnboardingModal from '../components/DnsOnboardingModal'

export default function UserDomains() {
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Drawer & Modal state
  const [selectedZoneDomain, setSelectedZoneDomain] = useState(null)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [verifyingId, setVerifyingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getUserWebsites()
      const list = res?.data?.websites || res?.websites || []
      // Display domains registered for Cloud WAF (or all domains)
      setWebsites(list)
    } catch (err) {
      console.error('Failed to load domains:', err)
      setFeedbackMsg({ type: 'error', text: 'Failed to load domains from server.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  // Filtered domains by search
  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return websites
    const q = searchQuery.toLowerCase().trim()
    return websites.filter(w => {
      const d = (w.domain || w.name || w.url || '').toLowerCase()
      return d.includes(q)
    })
  }, [websites, searchQuery])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = websites.length
    const active = websites.filter(w => w.verified || w.status === 'active').length
    const pending = total - active
    const strictSsl = websites.filter(w => (w.ssl_mode || '').includes('strict') || (w.ssl_mode || '') === 'full').length
    return { total, active, pending, strictSsl }
  }, [websites])

  // Live Nameserver Verification
  const handleVerifyNameservers = async (domainObj) => {
    const siteId = domainObj.id || domainObj._id || domainObj.domain
    const domainName = domainObj.domain || domainObj.name || domainObj.url
    if (!siteId) return

    setVerifyingId(siteId)
    setFeedbackMsg(null)

    try {
      const res = await api.verifyWebsiteDns(siteId)
      const isVerified = res?.data?.verified || res?.verified
      if (isVerified) {
        setFeedbackMsg({
          type: 'success',
          text: `🎉 Nameservers Verified! Domain "${domainName}" is now actively routed through MDefender Anycast Edge WAF.`
        })
      } else {
        setFeedbackMsg({
          type: 'info',
          text: res?.data?.message || res?.message || `Nameserver propagation is still in progress for ${domainName}. Please allow up to 30 minutes for global DNS cache refresh.`
        })
      }
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchDomains()
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Verification check failed for ${domainName}`
      })
    } finally {
      setVerifyingId(null)
    }
  }

  // Delete Domain
  const handleDeleteDomain = async (domainObj) => {
    const siteId = domainObj.id || domainObj._id
    const domainName = domainObj.domain || domainObj.name || domainObj.url
    if (!siteId) return

    if (!window.confirm(`Are you sure you want to remove "${domainName}" from MDefender Cloud WAF? This will immediately disable edge routing and active WAF protection.`)) {
      return
    }

    setDeletingId(siteId)
    setFeedbackMsg(null)
    try {
      await api.removeUserWebsite(siteId)
      setFeedbackMsg({ type: 'success', text: `Domain "${domainName}" removed successfully.` })
      userStore.invalidate('websites')
      userStore.invalidate('dashboard')
      await fetchDomains()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || `Failed to remove ${domainName}` })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ padding: '8px 0 40px' }}>
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          background: feedbackMsg.type === 'success' ? '#ecfdf5' : feedbackMsg.type === 'info' ? '#eff6ff' : '#fef2f2',
          border: `1.5px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : feedbackMsg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          color: feedbackMsg.type === 'success' ? '#065f46' : feedbackMsg.type === 'info' ? '#1e40af' : '#991b1b',
          fontSize: '13.5px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle text-emerald-600' : feedbackMsg.type === 'info' ? 'fa-circle-info text-blue-600' : 'fa-triangle-exclamation text-rose-600'}`} style={{ fontSize: '18px' }}></i>
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1528 0%, #172554 100%)',
        borderRadius: '16px', padding: '26px 30px', marginBottom: '24px',
        border: '1px solid #1e3a8a', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', flexShrink: 0
          }}>
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Cloud WAF Domains
              </h1>
              <span style={{
                background: 'rgba(37, 99, 235, 0.25)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px'
              }}>
                SMART ANYCAST EDGE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', maxWidth: '640px', lineHeight: '1.5' }}>
              Enterprise domain-based protection. Route any web application through MDefender Pro Anycast Nameservers for Layer 7 WAF inspection, DDoS mitigation, and SSL cloaking.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowOnboardingModal(true)}
            style={{
              padding: '12px 24px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)', transition: 'all 0.15s ease'
            }}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Connect Domain</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px', marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Domains</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{stats.total}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Configured in MDefender</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Edge WAF Armed</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{stats.active}</div>
          <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '4px' }}>Traffic proxied through edge</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Pending Delegation</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{stats.pending}</div>
          <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px' }}>Awaiting registrar update</div>
        </div>

        <div style={{
          background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>Anycast Latency</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', marginTop: '6px' }}>0.35ms</div>
          <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '4px' }}>Sub-millisecond Edge core</div>
        </div>
      </div>

      {/* Main Domains Section */}
      <div style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {/* Search & Actions Bar */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
          background: 'var(--input-bg, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
              <i className="fas fa-search" style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: '13px'
              }}></i>
              <input
                type="text"
                placeholder="Search domains by name or url..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '40px', padding: '0 14px 0 38px',
                  borderRadius: '9px', border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '13px', background: '#ffffff', color: 'var(--text-main, #0f172a)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchDomains}
              disabled={loading}
              style={{
                height: '40px', padding: '0 16px', borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)', background: '#ffffff',
                color: 'var(--text-main, #334155)', fontSize: '13px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredDomains.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '22px', background: '#f0f9ff',
              color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '34px', marginBottom: '18px', border: '1.5px solid #bae6fd'
            }}>
              <i className="fas fa-globe"></i>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
              {searchQuery ? 'No matching domains found' : 'No domains registered with Cloud WAF yet'}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
              {searchQuery
                ? `No domain matched your search query "${searchQuery}".`
                : 'Connect your domain to enable Edge DDoS mitigation, Anycast DNS zone management, and universal WAF inspection.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                style={{
                  padding: '11px 26px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                <i className="fas fa-plus"></i>
                <span>Connect Your First Domain</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading Cloud WAF domains...</div>
          </div>
        )}

        {/* Domains List */}
        {!loading && filteredDomains.length > 0 && (
          <div>
            {filteredDomains.map((w, i) => {
              const domainName = w.domain || w.name || w.url || 'Unnamed Domain'
              const siteId = w.id || w._id || ''
              const isVerifying = verifyingId === siteId
              const isDeleting = deletingId === siteId

              return (
                <div
                  key={siteId || i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: i < filteredDomains.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none',
                    transition: 'background 0.15s', flexWrap: 'wrap', gap: '16px'
                  }}
                >
                  {/* Domain Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', color: '#2563eb', border: '1px solid #bfdbfe', flexShrink: 0
                    }}>
                      <i className="fas fa-shield-halved"></i>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-main, #0f172a)' }}>
                          {domainName}
                        </span>

                        {/* Plan Badge */}
                        <span style={{
                          fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                          background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', letterSpacing: '0.4px'
                        }}>
                          {(w.plan || 'FREE').toUpperCase()} PLAN
                        </span>

                        {/* Status Badge */}
                        {w.verified ? (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <i className="fas fa-shield-halved" style={{ fontSize: '9px' }}></i> Active &amp; Protected
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <i className="fas fa-clock" style={{ fontSize: '9px' }}></i> Pending Nameservers
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>
                          <strong style={{ color: '#475569' }}>SSL:</strong> {w.ssl_mode === 'strict' ? 'Full (Strict)' : 'Flexible'}
                        </span>
                        <span>
                          <strong style={{ color: '#475569' }}>Routing:</strong> Anycast Edge
                        </span>
                        {w.added_at && (
                          <span>
                            <strong style={{ color: '#475569' }}>Added:</strong> {typeof w.added_at === 'string' ? w.added_at.split('T')[0] : 'Active'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* DNS Zone Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedZoneDomain(w)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #bfdbfe',
                        background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className="fas fa-shield-halved"></i>
                      <span>DNS &amp; WAF Zone</span>
                    </button>

                    {/* Verify Nameservers */}
                    <button
                      type="button"
                      onClick={() => handleVerifyNameservers(w)}
                      disabled={isVerifying}
                      style={{
                        padding: '8px 14px', borderRadius: '8px',
                        border: `1.5px solid ${w.verified ? '#bbf7d0' : '#fde68a'}`,
                        background: w.verified ? '#f0fdf4' : '#fffbeb',
                        color: w.verified ? '#15803d' : '#b45309',
                        fontSize: '12.5px', fontWeight: '700',
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                      title="Verify if domain nameservers are pointing to ns1.mdefender.pro and ns2.mdefender.pro"
                    >
                      <i className={`fas ${isVerifying ? 'fa-spinner fa-spin' : w.verified ? 'fa-check' : 'fa-arrows-rotate'}`}></i>
                      <span>{isVerifying ? 'Checking...' : w.verified ? 'Verified' : 'Check NS'}</span>
                    </button>

                    {/* Delete Domain */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDomain(w)}
                      disabled={isDeleting}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca',
                        background: '#fef2f2', color: '#b91c1c', fontSize: '12.5px', fontWeight: '700',
                        cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center'
                      }}
                      title="Remove domain from Cloud WAF"
                    >
                      <i className={`fas ${isDeleting ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DNS Zone Drawer Component */}
      {selectedZoneDomain && (
        <DnsZoneDrawer
          website={selectedZoneDomain}
          isOpen={Boolean(selectedZoneDomain)}
          onClose={() => setSelectedZoneDomain(null)}
          onZoneUpdated={fetchDomains}
        />
      )}

      {/* Cloud WAF Onboarding Wizard Modal */}
      {showOnboardingModal && (
        <DnsOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          onWebsiteAdded={(newSite) => {
            setShowOnboardingModal(false)
            fetchDomains()
            setFeedbackMsg({
              type: 'success',
              text: `Domain "${newSite.domain || newSite.name}" connected! Please point your registrar nameservers to ns1.mdefender.pro and ns2.mdefender.pro.`
            })
          }}
        />
      )}
    </div>
  )
}
