import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Globe,
  Filter
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'
import copyToClipboard from '../../utils/clipboard'

export default function BulkBrokenLinks() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite } = useBulkFleet()

  const [loadingScan, setLoadingScan] = useState(false)
  const [scanData, setScanData] = useState({})
  const [filterMode, setFilterMode] = useState('broken') // 'all' | 'broken' | 'redirects' | 'clean'
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Filter target sites
  const targetWebsites = useMemo(() => {
    if (selectedSiteId === 'all') return wpWebsites
    return wpWebsites.filter(w => (w.id || w._id) === selectedSiteId)
  }, [wpWebsites, selectedSiteId])

  const primarySite = useMemo(() => {
    if (activeWebsite) return activeWebsite
    if (targetWebsites.length > 0) return targetWebsites[0]
    return wpWebsites[0] || null
  }, [activeWebsite, targetWebsites, wpWebsites])

  const primarySiteId = primarySite ? (primarySite.id || primarySite._id) : null

  // Fetch broken links report
  const fetchReport = useCallback(async (siteId) => {
    if (!siteId) return
    try {
      const res = await api.getBrokenLinksScan(siteId)
      const data = res?.data || res
      if (data) {
        setScanData(prev => ({ ...prev, [siteId]: data }))
      }
    } catch (err) {
      console.warn('Could not fetch cached broken links:', err)
    }
  }, [])

  // Trigger real crawler scan
  const triggerScan = useCallback(async (siteId) => {
    if (!siteId) return
    setLoadingScan(true)
    try {
      const res = await api.runBrokenLinksScan(siteId, 100)
      const data = res?.data || res
      setScanData(prev => ({ ...prev, [siteId]: data }))
      showToast(`Link integrity crawl complete: ${data?.total_scanned || 0} links verified. ${data?.broken_count || 0} broken.`)
    } catch (err) {
      showToast(`Crawler error: ${err.message}`, true)
    } finally {
      setLoadingScan(false)
    }
  }, [])

  useEffect(() => {
    if (primarySiteId) {
      fetchReport(primarySiteId)
    }
  }, [primarySiteId, fetchReport])

  const currentReport = primarySiteId ? scanData[primarySiteId] : null

  // Metrics
  const totalScanned = currentReport?.total_scanned || 0
  const healthyCount = currentReport?.healthy_count || 0
  const redirectCount = currentReport?.redirect_count || 0
  const brokenCount = currentReport?.broken_count || 0
  const serverErrorCount = currentReport?.server_error_count || 0
  const allBroken = brokenCount + serverErrorCount

  const allLinksList = currentReport?.all_links || []

  // Filtered links
  const filteredLinks = useMemo(() => {
    let list = allLinksList
    if (filterMode === 'broken') {
      list = list.filter(l => l.status_code === 404 || l.status_code === 410 || l.status_code >= 500 || l.status_code === 0)
    } else if (filterMode === 'redirects') {
      list = list.filter(l => [301, 302, 307, 308].includes(l.status_code))
    } else if (filterMode === 'clean') {
      list = list.filter(l => [200, 201, 204].includes(l.status_code))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(l =>
        (l.target_url && l.target_url.toLowerCase().includes(q)) ||
        (l.anchor_text && l.anchor_text.toLowerCase().includes(q)) ||
        (l.source_url && l.source_url.toLowerCase().includes(q))
      )
    }
    return list
  }, [allLinksList, filterMode, searchQuery])

  const handleCopy = (url) => {
    copyToClipboard(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  if (!hasWebsites) {
    return (
      <div>
        <BulkHeader
          title="Broken Links &amp; Dead Reference Crawler"
          subtitle="Automated crawling to identify 404 dead links, broken anchors and redirection loops."
          icon={Link2}
        />
        <EmptyFleetState
          title="No Connected Websites Detected"
          description="Connect your WordPress website using the MDefender-Pro plugin to scan for broken internal links and dead external references."
          featureName="Broken Links Monitoring"
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <BulkHeader
        title="Broken Links &amp; Dead Reference Crawler"
        subtitle="Automated crawling to identify 404 dead links, broken anchors and redirection loops."
        icon={Link2}
        activeBadge="Link Integrity Watchdog"
      />

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          background: toastMsg.isError ? '#FEF2F2' : '#F0FDF4',
          color: toastMsg.isError ? '#991B1B' : '#166534',
          border: `1px solid ${toastMsg.isError ? '#FECACA' : '#BBF7D0'}`,
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* 4 SUMMARY METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {/* Metric 1 */}
        <div style={cardStyle}>
          <div style={labelStyle}>Total Hyperlinks Crawled</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span style={numberStyle}>{totalScanned}</span>
            <span style={badgeStyle('#EFF6FF', '#1D4ED8', '#DBEAFE')}>SCANNED</span>
          </div>
          <div style={subLabelStyle}>{primarySite ? (primarySite.domain || primarySite.url) : 'Active Target'}</div>
        </div>

        {/* Metric 2 */}
        <div style={cardStyle}>
          <div style={labelStyle}>Healthy Links (200 OK)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span style={numberStyle}>{healthyCount}</span>
            <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>HEALTHY</span>
          </div>
          <div style={subLabelStyle}>Fully reachable anchor destinations</div>
        </div>

        {/* Metric 3 */}
        <div style={cardStyle}>
          <div style={labelStyle}>Redirects (301 / 302)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span style={numberStyle}>{redirectCount}</span>
            <span style={badgeStyle('#FFFBEB', '#B45309', '#FEF3C7')}>REDIRECT</span>
          </div>
          <div style={subLabelStyle}>Pages forwarding to new locations</div>
        </div>

        {/* Metric 4 */}
        <div style={cardStyle}>
          <div style={labelStyle}>Broken Links (404 / 5xx)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span style={{ ...numberStyle, color: allBroken > 0 ? '#DC2626' : '#16A34A' }}>
              {allBroken}
            </span>
            <span style={badgeStyle(
              allBroken > 0 ? '#FEF2F2' : '#F0FDF4',
              allBroken > 0 ? '#B91C1C' : '#15803D',
              allBroken > 0 ? '#FECACA' : '#DCFCE7'
            )}>
              {allBroken > 0 ? 'ATTENTION' : 'CLEAN'}
            </span>
          </div>
          <div style={subLabelStyle}>Dead references causing user drop-off</div>
        </div>
      </div>

      {/* CRAWLER ACTION & CONTROL BAR */}
      <div style={{
        ...cardStyle,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
            Origin Crawler Engine
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
            {currentReport?.scanned_at
              ? `Last crawl completed on ${new Date(currentReport.scanned_at).toLocaleString()}`
              : 'No crawl performed yet for this website origin.'}
          </div>
        </div>

        <button
          onClick={() => triggerScan(primarySiteId)}
          disabled={loadingScan}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            cursor: loadingScan ? 'not-allowed' : 'pointer',
            opacity: loadingScan ? 0.7 : 1
          }}
        >
          <RefreshCw size={14} style={{ animation: loadingScan ? 'spin 1s linear infinite' : 'none' }} />
          <span>{loadingScan ? 'Crawling Hyperlinks...' : 'Scan Site for Broken Links'}</span>
        </button>
      </div>

      {/* DETAILED BROKEN LINKS TABLE & FILTERING */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: '16px',
          marginBottom: '16px'
        }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'broken', label: `Broken & Errors (${allBroken})` },
              { id: 'all', label: `All Links (${allLinksList.length})` },
              { id: 'redirects', label: `Redirects (${redirectCount})` },
              { id: 'clean', label: `Clean 200 OK (${healthyCount})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: filterMode === f.id ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  background: filterMode === f.id ? '#0F172A' : '#FFFFFF',
                  color: filterMode === f.id ? '#FFFFFF' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              placeholder="Search link URL or anchor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                outline: 'none'
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          </div>
        </div>

        {/* Table Content */}
        {filteredLinks.length === 0 ? (
          <div style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#F0FDF4',
              color: '#16A34A',
              marginBottom: '10px'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
              {filterMode === 'broken' && totalScanned > 0
                ? 'Zero Broken Links Detected'
                : totalScanned === 0
                ? 'Ready to Run Link Integrity Scan'
                : 'No links match this filter criteria'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
              {filterMode === 'broken' && totalScanned > 0
                ? 'All scanned internal links and external references are fully healthy with valid HTTP response status.'
                : totalScanned === 0
                ? 'Click "Scan Site for Broken Links" to start crawling and verify every URL on your website.'
                : 'Try switching filters to view all scanned links.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '600' }}>Target Link (Destination)</th>
                  <th style={{ padding: '10px 12px', fontWeight: '600' }}>Anchor Text</th>
                  <th style={{ padding: '10px 12px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', maxWidth: '380px' }}>
                      <div style={{ fontWeight: '600', color: '#0F172A', wordBreak: 'break-all' }}>
                        {link.target_url}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        Found on: {link.source_url}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#334155' }}>
                      <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                        {link.anchor_text || 'Link'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {link.status_code === 404 || link.status_code === 410 || link.status_code === 0 ? (
                        <span style={badgeStyle('#FEF2F2', '#B91C1C', '#FECACA')}>
                          HTTP {link.status_code || 0} ({link.status_text || 'Not Found'})
                        </span>
                      ) : [301, 302, 307, 308].includes(link.status_code) ? (
                        <span style={badgeStyle('#FFFBEB', '#B45309', '#FEF3C7')}>
                          HTTP {link.status_code} (Redirect)
                        </span>
                      ) : (
                        <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>
                          HTTP {link.status_code || 200} OK
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: link.link_type === 'internal' ? '#2563EB' : '#64748B'
                      }}>
                        {link.link_type === 'internal' ? 'Internal' : 'External'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleCopy(link.target_url)}
                          title="Copy Link"
                          style={{
                            background: 'none',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            color: '#475569'
                          }}
                        >
                          {copiedUrl === link.target_url ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                          <span>{copiedUrl === link.target_url ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={link.target_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Link"
                          style={{
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#475569',
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// STYLES (CLOUDFLARE ENTERPRISE STANDARD)
// ----------------------------------------------------------------------------
const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  padding: '18px 20px'
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748B'
}

const numberStyle = {
  fontSize: '23px',
  fontWeight: '700',
  color: '#0F172A',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.15
}

const subLabelStyle = {
  fontSize: '12px',
  color: '#64748B',
  marginTop: '8px'
}

const badgeStyle = (bg, text, border) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.03em',
  background: bg,
  color: text,
  border: `1px solid ${border}`
})
