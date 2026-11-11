import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Link2,
  CornerDownRight,
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
  const [redirectModal, setRedirectModal] = useState({ open: false, link: null, targetUrl: '/', code: 301, loading: false })
  const [fixedRedirects, setFixedRedirects] = useState({}) // { [target_url]: target_destination }

  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Filter target sites
  const targetWebsites = useMemo(() => {
    if (selectedSiteId === 'all') return wpWebsites
    const list = Array.isArray(wpWebsites) ? wpWebsites : []
    return list.filter(w => w && (w.id === selectedSiteId || w._id === selectedSiteId))
  }, [wpWebsites, selectedSiteId])

  const primarySite = useMemo(() => {
    if (activeWebsite) return activeWebsite
    if (targetWebsites.length > 0) return targetWebsites[0]
    return (Array.isArray(wpWebsites) && wpWebsites[0]) || null
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

    // 1-Click Self-Healing 301 Redirect Dispatcher
  const handlePushRedirect = async () => {
    if (!redirectModal.link || !primarySiteId) return
    const srcUrl = redirectModal.link.target_url
    const destUrl = redirectModal.targetUrl.trim() || '/'
    setRedirectModal(prev => ({ ...prev, loading: true }))
    try {
      const res = await api.createWebsiteRedirect(primarySiteId, srcUrl, destUrl, redirectModal.code)
      const data = res?.data || res
      if (data?.success !== false) {
        setFixedRedirects(prev => ({ ...prev, [srcUrl]: destUrl }))
        showToast(`✓ Permanent 301 redirect created: ${srcUrl} -> ${destUrl}`)
        setRedirectModal({ open: false, link: null, targetUrl: '/', code: 301, loading: false })
      } else {
        showToast(data?.message || 'Failed to create redirect on origin.', true)
        setRedirectModal(prev => ({ ...prev, loading: false }))
      }
    } catch (err) {
      showToast(`Redirect failed: ${err.message}`, true)
      setRedirectModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCopy = (url) => {
    copyToClipboard(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  if (!hasWebsites) {
    return (
      <div>
        <BulkHeader
          title="Broken Links & Dead Reference Crawler"
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
    <div style={{ maxWidth: '1720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BulkHeader
        title="Broken Links & Dead Reference Crawler"
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
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
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
                fontSize: '12px',
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
              background: currentReport?.is_challenged ? '#FFFBEB' : '#F0FDF4',
              color: currentReport?.is_challenged ? '#B45309' : '#16A34A',
              marginBottom: '10px'
            }}>
              {currentReport?.is_challenged ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
              {currentReport?.is_challenged
                ? 'Origin Protected by MDefender Bot Shield (HTTP 403)'
                : filterMode === 'broken' && totalScanned > 0
                ? 'Zero Broken Links Detected'
                : totalScanned === 0
                ? 'Ready to Run Link Integrity Scan'
                : 'No links match this filter criteria'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '460px', margin: '4px auto 0' }}>
              {currentReport?.is_challenged
                ? 'Your website is actively serving a Turnstile challenge to automated requests. Network reachability and origin SSL are 100% verified; to deep crawl internal hyperlinks, temporarily pause Under Attack Mode or whitelist the crawler.'
                : filterMode === 'broken' && totalScanned > 0
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
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
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
                        fontSize: '11px',
                        fontWeight: '600',
                        color: link.link_type === 'internal' ? '#2563EB' : '#64748B'
                      }}>
                        {link.link_type === 'internal' ? 'Internal' : 'External'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {fixedRedirects[link.target_url] ? (
                          <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>
                            ✓ 301 Fixed ({fixedRedirects[link.target_url]})
                          </span>
                        ) : (link.status_code === 404 || link.status_code === 410 || link.status_code === 0 || link.status_code >= 500) ? (
                          <button
                            onClick={() => setRedirectModal({ open: true, link, targetUrl: '/', code: 301, loading: false })}
                            style={{
                              background: '#0B2522',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            <CornerDownRight size={12} />
                            <span>Fix with 301</span>
                          </button>
                        ) : null}

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
                            fontSize: '11px',
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

      {/* 1-CLICK SELF-HEALING 301 REDIRECT MODAL */}
      {redirectModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 37, 34, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0FDF4', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CornerDownRight size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    1-Click SEO Self-Healing Redirect
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Push permanent 301 redirect directly to connected WordPress origin
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRedirectModal({ open: false, link: null, targetUrl: '/', code: 301, loading: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', marginBottom: '4px' }}>
                Broken Source URL (HTTP {redirectModal.link?.status_code || 404})
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {redirectModal.link?.target_url}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Redirect Destination Path or URL:
              </label>
              <input
                type="text"
                value={redirectModal.targetUrl}
                onChange={(e) => setRedirectModal(prev => ({ ...prev, targetUrl: e.target.value }))}
                placeholder="/ or /shop or https://..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Visitors and search engine crawlers accessing this broken link will be forwarded with HTTP 301.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setRedirectModal({ open: false, link: null, targetUrl: '/', code: 301, loading: false })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#F1F5F9',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePushRedirect}
                disabled={redirectModal.loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: redirectModal.loading ? 'not-allowed' : 'pointer',
                  opacity: redirectModal.loading ? 0.7 : 1
                }}
              >
                {redirectModal.loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CornerDownRight size={14} />}
                <span>{redirectModal.loading ? 'Pushing to WordPress...' : 'Enforce 301 Redirect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
  padding: '12px 16px'
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748B'
}

const numberStyle = {
  fontSize: '19px', letterSpacing: '-0.04em',
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

