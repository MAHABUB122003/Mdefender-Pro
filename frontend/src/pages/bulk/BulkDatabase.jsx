import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Database,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  HardDrive,
  Layers,
  Zap,
  ShieldCheck,
  Check,
  Clock,
  ArrowRight,
  Info,
  Server,
  Activity,
  Globe
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkDatabase() {
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
  const [optimizing, setOptimizing] = useState(false)
  const [dbStatus, setDbStatus] = useState(null)
  const [optResult, setOptResult] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [selectedTargets, setSelectedTargets] = useState({
    revisions: true,
    auto_drafts: true,
    trash_posts: true,
    spam_comments: true,
    trash_comments: true,
    expired_transients: true,
    orphaned_metadata: true,
    optimize_tables: true
  })

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 4500)
  }

  // Fetch status
  const loadStatus = useCallback(async (siteId) => {
    if (!siteId) return
    setLoading(true)
    setOptResult(null)
    try {
      const res = await api.getWebsiteDbStatus(siteId)
      const data = res?.data || res
      if (data && data.success) {
        setDbStatus(data)
      } else {
        setDbStatus(null)
        showToast(data?.message || 'Failed to inspect database health', true)
      }
    } catch (err) {
      console.error('DB Status Error:', err)
      showToast(err.message || 'Cannot connect to site database engine', true)
      setDbStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (targetSiteId) {
      loadStatus(targetSiteId)
    }
  }, [targetSiteId, loadStatus])

  const handleToggleTarget = (key) => {
    setSelectedTargets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSelectAll = (select) => {
    setSelectedTargets({
      revisions: select,
      auto_drafts: select,
      trash_posts: select,
      spam_comments: select,
      trash_comments: select,
      expired_transients: select,
      orphaned_metadata: select,
      optimize_tables: select
    })
  }

  // Trigger optimization
  const handleRunOptimization = async () => {
    const activeKeys = Object.keys(selectedTargets).filter(k => selectedTargets[k])
    if (activeKeys.length === 0) {
      showToast('Please select at least one cleanup target', true)
      return
    }

    setOptimizing(true)
    try {
      if (selectedSiteId === 'all') {
        // Bulk optimize across all sites
        const res = await api.bulkOptimizeDb(activeKeys)
        const data = res?.data || res
        if (data && data.successful !== undefined) {
          showToast(`Bulk optimization completed: ${data.successful} of ${data.total_sites} site(s) cleaned successfully!`)
          if (targetSiteId) loadStatus(targetSiteId)
        } else {
          showToast('Bulk optimization dispatched across fleet')
        }
      } else {
        // Single site optimization
        const res = await api.optimizeWebsiteDb(targetSiteId, activeKeys)
        const data = res?.data || res
        if (data && data.success) {
          setOptResult(data)
          showToast(data.message || 'Database optimized successfully!')
          loadStatus(targetSiteId)
        } else {
          showToast(data?.message || 'Database optimization returned warning', true)
        }
      }
    } catch (err) {
      console.error('Optimization error:', err)
      showToast(err.message || 'Optimization request failed', true)
    } finally {
      setOptimizing(false)
    }
  }

  if (!hasWebsites) {
    return <EmptyFleetState title="No WordPress Websites Found" />
  }

  const breakdown = dbStatus?.junk_breakdown || {}

  const targetItems = [
    {
      key: 'revisions',
      title: 'Post Revisions',
      count: breakdown.revisions?.count || 0,
      desc: 'Old snapshots and revision histories created when editing articles',
      badge: 'Safe'
    },
    {
      key: 'auto_drafts',
      title: 'Auto Drafts',
      count: breakdown.auto_drafts?.count || 0,
      desc: 'Abandoned auto-save states from incomplete editor sessions',
      badge: 'Safe'
    },
    {
      key: 'trash_posts',
      title: 'Trashed Posts & Media',
      count: breakdown.trash_posts?.count || 0,
      desc: 'Deleted posts, pages, and media files remaining in the trash bin',
      badge: 'Trash'
    },
    {
      key: 'spam_comments',
      title: 'Spam Comments',
      count: breakdown.spam_comments?.count || 0,
      desc: 'Unapproved spam comments flagged by spam filters',
      badge: 'Spam'
    },
    {
      key: 'trash_comments',
      title: 'Trashed Comments',
      count: breakdown.trash_comments?.count || 0,
      desc: 'Deleted comments sitting in the comment trash',
      badge: 'Trash'
    },
    {
      key: 'expired_transients',
      title: 'Expired Transients',
      count: breakdown.expired_transients?.count || 0,
      desc: 'Outdated temporary API caches & cron timers stored in wp_options',
      badge: 'Cache'
    },
    {
      key: 'orphaned_metadata',
      title: 'Orphaned Metadata',
      count: (breakdown.orphaned_postmeta?.count || 0) + (breakdown.orphaned_commentmeta?.count || 0) + (breakdown.orphaned_term_relationships?.count || 0),
      desc: 'Ghost postmeta, commentmeta, and term relations with missing parents',
      badge: 'Orphan'
    },
    {
      key: 'optimize_tables',
      title: 'Table Defragmentation (OPTIMIZE TABLE)',
      count: dbStatus?.tables_with_overhead || 0,
      countLabel: 'tables with overhead',
      desc: 'Reclaim unused fragmented disk space across InnoDB and MyISAM tables',
      badge: 'Performance'
    }
  ]

  const anySelected = Object.values(selectedTargets).some(Boolean)

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh', background: '#F6F8F7', color: '#10201E' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          background: toastMsg.isError ? '#FEF2F2' : '#F0FDF4',
          color: toastMsg.isError ? '#DC2626' : '#15803D',
          border: `1px solid ${toastMsg.isError ? '#FCA5A5' : '#86EFAC'}`,
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* STANDARDIZED EXECUTIVE BULK HEADER WITH IDENTICAL DOMAIN SCOPE CARD */}
      <BulkHeader
        title="Database Hygiene & Table Defragmentation"
        subtitle="Purge post revisions, transients, abandoned drafts, and defragment fragmented tables across your WordPress fleet."
        icon={Database}
        activeBadge="Database Hygiene"
      />

      {/* METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '10px'
      }}>
        {/* Card 1: Total DB Size */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(11,37,34,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total DB Size</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={13} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', lineHeight: '1.1', letterSpacing: '-0.03em', color: '#0B2522' }}>
              {loading ? '...' : `${dbStatus?.total_size_mb || 0} MB`}
            </span>
            <span style={{ fontSize: '11px', color: '#60716B', whiteSpace: 'nowrap' }}>
              {dbStatus?.tables_count || 0} tables indexed
            </span>
          </div>
        </div>

        {/* Card 2: Reclaimable Overhead */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(11,37,34,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table Overhead</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={13} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', lineHeight: '1.1', letterSpacing: '-0.03em', color: '#D97706' }}>
              {loading ? '...' : `${dbStatus?.total_overhead_mb || 0} MB`}
            </span>
            <span style={{ fontSize: '11px', color: '#60716B', whiteSpace: 'nowrap' }}>
              {dbStatus?.tables_with_overhead || 0} fragmented
            </span>
          </div>
        </div>

        {/* Card 3: Total Cleanable Junk Records */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(11,37,34,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleanable Junk</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={13} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', lineHeight: '1.1', letterSpacing: '-0.03em', color: '#0B2522' }}>
              {loading ? '...' : `${dbStatus?.cleanable_records_total || 0}`}
            </span>
            <span style={{ fontSize: '11px', color: '#60716B', whiteSpace: 'nowrap' }}>
              Revisions, spam, transients
            </span>
          </div>
        </div>

        {/* Card 4: Health Score */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #D9E1DC',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(11,37,34,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database Health</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={13} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', lineHeight: '1.1', letterSpacing: '-0.03em', color: '#10B981' }}>
              {loading ? '...' : `${dbStatus?.health_score || 100}%`}
            </span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {dbStatus?.health_score >= 90 ? 'Optimized & Pristine' : 'Optimization Due'}
            </span>
          </div>
        </div>
      </div>

      {/* OPTIMIZATION RESULT BANNER */}
      {optResult && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#15803D" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803D' }}>
                {optResult.message}
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '1px' }}>
                Completed in {optResult.duration_ms} ms • Reclaimed {optResult.reclaimed_mb} MB disk space
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#166534' }}>
              Purged: {optResult.total_rows_deleted} rows
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#166534' }}>
              Defragged: {optResult.tables_optimized} tables
            </span>
          </div>
        </div>
      )}

      {/* ZERO-RISK SAFETY GUARANTEE CALLOUT (Slim Inline Badge) */}
      <div style={{
        background: '#FAFBF9',
        borderRadius: '8px',
        border: '1px solid #D9E1DC',
        padding: '7px 12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11.5px',
        color: '#60716B'
      }}>
        <ShieldCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#0B2522' }}>Zero-Risk Non-Destructive Policy:</strong> Optimization strictly cleans expendable temporary data. Active blog posts, published pages, user accounts, and WooCommerce orders are never touched.
        </div>
      </div>

      {/* CLEANUP TARGETS GRID & ACTION CARD (Ultra-Compact Low-Profile) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #D9E1DC',
        padding: '12px 14px',
        boxShadow: '0 1px 4px rgba(11, 37, 34, 0.02)',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          borderBottom: '1px solid #F0F4F2',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0B2522', margin: 0 }}>
              Granular Database Hygiene Targets
            </h3>
            <span style={{ fontSize: '11px', color: '#60716B' }}>
              (Select areas to cleanse and defragment)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleSelectAll(true)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#059669',
                background: '#ECFDF5',
                border: 'none',
                borderRadius: '5px',
                padding: '4px 9px',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#60716B',
                background: '#F6F8F7',
                border: '1px solid #D9E1DC',
                borderRadius: '5px',
                padding: '4px 9px',
                cursor: 'pointer'
              }}
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* TARGET ITEMS LIST - High Density 4-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '6px',
          marginBottom: '10px'
        }}>
          {targetItems.map((item) => {
            const isChecked = !!selectedTargets[item.key]
            return (
              <div
                key={item.key}
                onClick={() => handleToggleTarget(item.key)}
                title={item.desc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: isChecked ? '1px solid #10B981' : '1px solid #E5EBE8',
                  background: isChecked ? '#F9FDFB' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  {/* Custom Compact Checkbox */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: isChecked ? '2px solid #10B981' : '2px solid #C0CBC5',
                    background: isChecked ? '#10B981' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0
                  }}>
                    {isChecked && <Check size={11} strokeWidth={3.5} />}
                  </div>

                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0B2522', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>

                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: item.count > 0 ? '#FEF3C7' : '#ECFDF5',
                  color: item.count > 0 ? '#92400E' : '#059669',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {item.count} {item.countLabel || 'items'}
                </span>
              </div>
            )
          })}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #F0F4F2',
          paddingTop: '8px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontSize: '12px', color: '#60716B' }}>
            Scope: <strong style={{ color: '#0B2522' }}>{selectedSiteId === 'all' ? 'All Connected Sites' : (currentSite?.domain || 'Target Site')}</strong> • <strong style={{ color: '#059669' }}>{Object.values(selectedTargets).filter(Boolean).length} of {targetItems.length} active</strong>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={optimizing || !anySelected || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: optimizing || !anySelected ? '#A7F3D0' : '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: optimizing || !anySelected ? 'not-allowed' : 'pointer',
              boxShadow: optimizing || !anySelected ? 'none' : '0 4px 14px rgba(5, 150, 105, 0.25)',
              transition: 'background 0.2s ease'
            }}
          >
            <Sparkles size={16} style={{ animation: optimizing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{optimizing ? 'Optimizing Database Tables...' : (selectedSiteId === 'all' ? 'Optimize All Connected Sites' : 'Clean & Optimize Database')}</span>
          </button>
        </div>
      </div>

      {/* TOP TABLES OVERVIEW TABLE */}
      {dbStatus?.table_details && dbStatus.table_details.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #D9E1DC',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(11, 37, 34, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0B2522', margin: 0 }}>
                Indexed Database Tables &amp; Physical Footprint
              </h4>
              <p style={{ fontSize: '12px', color: '#60716B', margin: '3px 0 0' }}>
                Storage space and fragmentation status across origin MySQL tables
              </p>
            </div>
            <span style={{ fontSize: '12px', color: '#60716B', fontWeight: 600 }}>
              Showing {dbStatus.table_details.length} tables
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5EBE8', color: '#60716B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '10px 14px' }}>Table Name</th>
                  <th style={{ padding: '10px 14px' }}>Engine</th>
                  <th style={{ padding: '10px 14px' }}>Rows Count</th>
                  <th style={{ padding: '10px 14px' }}>Data Size</th>
                  <th style={{ padding: '10px 14px' }}>Fragmented Overhead</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dbStatus.table_details.map((tbl, i) => (
                  <tr key={tbl.name || i} style={{ borderBottom: '1px solid #F0F4F2' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0B2522', fontFamily: 'monospace' }}>
                      {tbl.name}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#60716B' }}>
                      {tbl.engine}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#0B2522', fontWeight: 600 }}>
                      {tbl.rows.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#0B2522', fontWeight: 700 }}>
                      {tbl.size_mb} MB
                    </td>
                    <td style={{ padding: '12px 14px', color: tbl.overhead_mb > 0 ? '#D97706' : '#60716B', fontWeight: tbl.overhead_mb > 0 ? 800 : 500 }}>
                      {tbl.overhead_mb > 0 ? `${tbl.overhead_mb} MB` : '0 MB (Clean)'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: tbl.overhead_mb > 0 ? '#FEF3C7' : '#ECFDF5',
                        color: tbl.overhead_mb > 0 ? '#92400E' : '#059669'
                      }}>
                        {tbl.overhead_mb > 0 ? 'Fragmented' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
