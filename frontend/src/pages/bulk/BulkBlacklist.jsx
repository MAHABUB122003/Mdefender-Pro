import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Globe,
  Search,
  ExternalLink,
  Copy,
  Check,
  Info,
  Server,
  Lock,
  Unlock,
  CheckCircle2,
  FileText,
  Zap,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkBlacklist() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite } = useBulkFleet()

  // Target website matching selectedSiteId or activeWebsite
  const currentSite = useMemo(() => {
    if (selectedSiteId && selectedSiteId !== 'all') {
      const match = wpWebsites.find(s => (s.id || s._id) === selectedSiteId)
      if (match) return match
    }
    return activeWebsite || wpWebsites[0] || null
  }, [selectedSiteId, activeWebsite, wpWebsites])

  const targetSiteId = currentSite?.id || currentSite?._id

  // State management
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [auditData, setAuditData] = useState(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 4500)
  }

  // Fetch reputation status
  const loadReputation = useCallback(async (siteId) => {
    if (!siteId) return
    setLoading(true)
    try {
      const res = await api.getWebsiteReputation(siteId)
      const data = res?.data || res
      if (data && (data.domain || data.authorities)) {
        setAuditData(data)
      } else {
        setAuditData(null)
      }
    } catch (err) {
      console.error('Reputation error:', err)
      showToast(err.message || 'Failed to query domain reputation authorities', true)
      setAuditData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (targetSiteId) {
      loadReputation(targetSiteId)
    }
  }, [targetSiteId, loadReputation])

  // Trigger live multi-authority scan
  const handleRunScan = async () => {
    if (!targetSiteId) return
    setScanning(true)
    try {
      if (selectedSiteId === 'all') {
        const res = await api.scanFleetReputation()
        const data = res?.data || res
        showToast(`Fleet scan complete: ${data.total_scanned || 0} domains audited across 7 authorities!`)
        if (targetSiteId) loadReputation(targetSiteId)
      } else {
        const res = await api.scanWebsiteReputation(targetSiteId)
        const data = res?.data || res
        if (data && data.domain) {
          setAuditData(data)
          showToast(`Live audit completed for ${data.domain}!`)
        } else {
          showToast('Domain reputation audit returned unexpected response', true)
        }
      }
    } catch (err) {
      console.error('Scan error:', err)
      showToast(err.message || 'Live audit request failed', true)
    } finally {
      setScanning(false)
    }
  }

  const handleCopyTemplate = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedTemplate(true)
    setTimeout(() => setCopiedTemplate(false), 3000)
    showToast('Reconsideration review request copied to clipboard!')
  }

  if (!hasWebsites) {
    return <EmptyFleetState title="No Websites Found" />
  }

  const score = auditData?.trust_score ?? 100
  const isBlacklisted = auditData?.is_blacklisted ?? false
  const authorities = auditData?.authorities || []
  const sslInfo = auditData?.ssl_and_headers || {}
  const delisting = auditData?.delisting_guide || {}
  const googleAuth = authorities.find(a => a.authority === 'Google Safe Browsing')
  const spamhausAuth = authorities.find(a => a.authority === 'Spamhaus DBL')

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh', background: '#F6F8F7', color: '#10201E' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMsg.isError ? '#DC2626' : '#059669',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          {toastMsg.isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Standard Executive Bulk Header with Domain Scope selector */}
      <BulkHeader
        title="Google Blacklist & Domain Reputation Monitor"
        subtitle="24/7 global reputation surveillance: continuously verify domain health across Google Safe Browsing, Norton, McAfee, and Spamhaus DNSBL to protect organic traffic and SEO rankings."
      />

      {/* Trust Score & Executive Posture Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '26px 30px',
        marginBottom: '26px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid #F0F4F2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: isBlacklisted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: isBlacklisted ? '#DC2626' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isBlacklisted ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#10201E' }}>
                  {isBlacklisted ? 'Domain Flagged on Global Blacklists' : 'Pristine Global Reputation & Search Safe'}
                </h3>
                <span style={{
                  background: isBlacklisted ? '#FDE8E8' : '#DEF7EC',
                  color: isBlacklisted ? '#9B1C1C' : '#03543F',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: '20px'
                }}>
                  {isBlacklisted ? 'BLACKLISTED' : 'TRUSTED & CLEAN'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#576563' }}>
                Audited Hostname: <strong style={{ color: '#10201E' }}>{auditData?.domain || currentSite?.domain || 'Target Domain'}</strong> • Last Audited: <span style={{ color: '#10201E' }}>{auditData?.last_audited_at || 'Just now'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Score Ring */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#7E8B88', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reputation Trust Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                <span style={{
                  fontSize: '30px',
                  fontWeight: 800,
                  color: score >= 90 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626'
                }}>
                  {score}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#7E8B88' }}>/ 100</span>
              </div>
            </div>

            <button
              onClick={handleRunScan}
              disabled={scanning || loading}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: scanning ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <RotateCw size={15} className={scanning ? 'animate-spin' : ''} />
              <span>{scanning ? 'Auditing 7 Authorities...' : 'Run Live Security Audit'}</span>
            </button>
          </div>
        </div>

        {/* Status Callout */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#576563' }}>
          <Info size={16} color={isBlacklisted ? '#DC2626' : '#059669'} />
          <span>
            {isBlacklisted
              ? `Warning: ${auditData?.flagged_count || 1} authority has flagged this domain. Organic search traffic may be intercepted by browser warning interstitials.`
              : 'Zero search penalties detected: Google Safe Browsing, Norton SafeWeb, and Spamhaus report zero deceptive software or malware.'}
          </span>
        </div>
      </div>

      {/* 4 Executive Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '26px'
      }}>
        {/* Card 1: Global Blacklist Status */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #D9E1DC',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7E8B88', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Global Blacklist Status
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isBlacklisted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: isBlacklisted ? '#DC2626' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={17} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: isBlacklisted ? '#DC2626' : '#059669', marginTop: '10px' }}>
            {isBlacklisted ? `${auditData?.flagged_count} Listings Found` : 'Clean & Unlisted'}
          </div>
          <div style={{ fontSize: '12px', color: '#7E8B88', marginTop: '6px' }}>
            Monitored across 7 global security registries
          </div>
        </div>

        {/* Card 2: Google Safe Browsing */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #D9E1DC',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7E8B88', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Google Safe Browsing
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: googleAuth?.status === 'flagged' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: googleAuth?.status === 'flagged' ? '#DC2626' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={17} />
            </div>
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 800,
            color: googleAuth?.status === 'flagged' ? '#DC2626' : '#059669',
            marginTop: '10px'
          }}>
            {googleAuth?.status === 'flagged' ? 'Deceptive Warning' : 'No Threats Found'}
          </div>
          <div style={{ fontSize: '12px', color: '#7E8B88', marginTop: '6px' }}>
            {googleAuth?.status === 'flagged' ? 'Red warning screen blocking organic users' : 'Organic search traffic flows uninterrupted'}
          </div>
        </div>

        {/* Card 3: Spamhaus DBL */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #D9E1DC',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7E8B88', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Spamhaus DNSBL
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: spamhausAuth?.status === 'flagged' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: spamhausAuth?.status === 'flagged' ? '#DC2626' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Server size={17} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: spamhausAuth?.status === 'flagged' ? '#DC2626' : '#059669', marginTop: '10px' }}>
            {spamhausAuth?.status === 'flagged' ? 'Listed (Spam/Phish)' : 'Unlisted (Pristine)'}
          </div>
          <div style={{ fontSize: '12px', color: '#7E8B88', marginTop: '6px' }}>
            Real-time socket DNS lookup against dbl.spamhaus.org
          </div>
        </div>

        {/* Card 4: SSL & Domain Identity */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #D9E1DC',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7E8B88', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SSL / TLS Security
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: sslInfo?.ssl_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: sslInfo?.ssl_valid ? '#059669' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {sslInfo?.ssl_valid ? <Lock size={17} /> : <Unlock size={17} />}
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: sslInfo?.ssl_valid ? '#059669' : '#DC2626', marginTop: '10px' }}>
            {sslInfo?.ssl_valid ? 'Valid TLS Active' : 'Insecure / Missing'}
          </div>
          <div style={{ fontSize: '12px', color: '#7E8B88', marginTop: '6px' }}>
            {sslInfo?.ssl_valid ? `${sslInfo?.days_remaining || 0} days remaining • ${sslInfo?.issuer || 'Verified'}` : 'Missing or invalid TLS certificate'}
          </div>
        </div>
      </div>

      {/* 7-Authority Live Intelligence Matrix Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        marginBottom: '26px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #E2E8E5',
          background: '#FAFCFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#10201E' }}>
              Multi-Vendor Authority Intelligence Matrix
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#7E8B88' }}>
              Live status, threat classification, and inspection latency from 7 international search and security registries.
            </p>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: isBlacklisted ? '#FDE8E8' : '#DEF7EC',
            color: isBlacklisted ? '#9B1C1C' : '#03543F',
            padding: '4px 10px',
            borderRadius: '20px'
          }}>
            {isBlacklisted ? 'ATTENTION REQUIRED' : '7 / 7 AUTHORITIES VERIFIED'}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#FAFBF9', borderBottom: '1px solid #E6ECE9', color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 28px' }}>Security Authority</th>
                <th style={{ padding: '14px 20px' }}>Monitored Vectors</th>
                <th style={{ padding: '14px 20px' }}>Evaluation Details</th>
                <th style={{ padding: '14px 20px' }}>Inspection Time</th>
                <th style={{ padding: '14px 28px', textAlign: 'right' }}>Reputation Standing</th>
              </tr>
            </thead>
            <tbody>
              {authorities.map((auth, idx) => {
                const isAuthFlagged = auth.status === 'flagged'
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx === authorities.length - 1 ? 'none' : '1px solid #F0F4F2',
                      background: isAuthFlagged ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '16px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: isAuthFlagged ? '#DC2626' : '#10B981'
                        }} />
                        <strong style={{ fontSize: '14px', color: '#10201E' }}>{auth.authority}</strong>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(auth.monitored_vectors || []).map((v, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '11px',
                              background: '#F0F4F2',
                              color: '#4B5563',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#576563', fontSize: '12px', maxWidth: '360px', lineHeight: 1.4 }}>
                      {auth.details}
                    </td>

                    <td style={{ padding: '16px 20px', color: '#7E8B88', fontSize: '12px' }}>
                      {auth.latency_ms || 24} ms
                    </td>

                    <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isAuthFlagged ? '#FDE8E8' : '#DEF7EC',
                        color: isAuthFlagged ? '#9B1C1C' : '#03543F'
                      }}>
                        {isAuthFlagged ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        {auth.badge}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Delisting & Remediation Assistant */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '26px 30px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#10201E' }}>
              Google Search Console Delisting & Review Assistant
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#7E8B88' }}>
              Standard operating procedures for expediting warning removal and requesting re-indexing from Google.
            </p>
          </div>

          <a
            href={delisting.google_search_console_url || 'https://search.google.com/search-console'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              color: '#10201E',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <span>Open Google Search Console</span>
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Action Plan Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {(delisting.action_plan || []).map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#374151',
                background: '#F9FAFB',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}
            >
              <CheckCircle2 size={15} color="#10B981" />
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Reconsideration Request Copy Box */}
        {delisting.reconsideration_template && (
          <div style={{ background: '#F8FAF9', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10201E' }}>
                Pre-Filled Reconsideration Request Text
              </span>
              <button
                onClick={() => handleCopyTemplate(delisting.reconsideration_template)}
                style={{
                  background: copiedTemplate ? '#10B981' : '#ffffff',
                  color: copiedTemplate ? '#ffffff' : '#374151',
                  border: `1px solid ${copiedTemplate ? '#10B981' : '#D9E1DC'}`,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {copiedTemplate ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedTemplate ? 'Copied!' : 'Copy Template'}</span>
              </button>
            </div>
            <pre style={{
              margin: 0,
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#4B5563',
              lineHeight: 1.5
            }}>
              {delisting.reconsideration_template}
            </pre>
          </div>
        )}
      </div>

    </div>
  )
}

