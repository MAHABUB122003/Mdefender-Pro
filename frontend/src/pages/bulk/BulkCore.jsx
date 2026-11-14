import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Cpu,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Server,
  Database,
  FileCheck,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
  Info
} from 'lucide-react'
import BulkHeader from './BulkHeader'
import EmptyFleetState from './EmptyFleetState'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkCore() {
  const { hasWebsites, selectedSiteId, fetchFleet } = useBulkFleet()

  const [coreData, setCoreData] = useState({
    official_info: {
      latest_version: null,
      php_required: null,
      mysql_required: null,
      download_url: null,
      official_source: 'WordPress.org Official Security & Release API'
    },
    total_sites: 0,
    up_to_date_count: 0,
    needs_update_count: 0,
    fleet_integrity_pct: null,
    sites: []
  })

  const [verifyingSiteId, setVerifyingSiteId] = useState(null)
  const [updatingSiteId, setUpdatingSiteId] = useState(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkVerifying, setBulkVerifying] = useState(false)
  const [auditModalSite, setAuditModalSite] = useState(null)
  const [repairingFile, setRepairingFile] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = useCallback((text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3800)
  }, [])

  const fetchFleetCore = useCallback(async () => {
    const res = await api.getWordpressCoreStatus()
    const actualData = res?.data || res
    if (!actualData || (!Array.isArray(actualData.sites) && !actualData.official_info)) {
      throw new Error('The backend returned an invalid WordPress core status response.')
    }
    return actualData
  }, [])

  const loadFleetCore = useCallback(async () => {
    try {
      setCoreData(await fetchFleetCore())
    } catch (err) {
      console.warn('[BulkCore] Failed to load core status:', err)
      showToast(err?.message || 'Could not load verified WordPress core status.', true)
    }
  }, [fetchFleetCore, showToast])

  useEffect(() => {
    if (!hasWebsites) return undefined

    let active = true
    fetchFleetCore()
      .then(data => {
        if (active) setCoreData(data)
      })
      .catch(err => {
        if (active) {
          console.warn('[BulkCore] Failed to load core status:', err)
          showToast(err?.message || 'Could not load verified WordPress core status.', true)
        }
      })

    return () => {
      active = false
    }
  }, [fetchFleetCore, hasWebsites, showToast])

  // Filter sites according to dropdown selection in BulkHeader
  const displayedSites = useMemo(() => {
    if (!coreData.sites || coreData.sites.length === 0) return []
    if (selectedSiteId === 'all') return coreData.sites
    const matched = coreData.sites.filter(s => s.site_id === selectedSiteId)
    return matched.length > 0 ? matched : coreData.sites
  }, [coreData.sites, selectedSiteId])

  // Scope label for current dropdown target
  const scopeLabel = useMemo(() => {
    if (selectedSiteId === 'all') return `Fleet All Sites (${coreData.sites.length})`
    const s = displayedSites[0]
    return s ? s.domain : 'Selected Website'
  }, [selectedSiteId, coreData.sites, displayedSites])

  // Verify Single Website Checksums
  const handleVerifyChecksums = async (site) => {
    setVerifyingSiteId(site.site_id)
    try {
      const res = await api.verifyCoreChecksums(site.site_id)
      const data = res?.data || res || {}
      if (!['verified', 'modified_files_detected'].includes(data.status)) {
        throw new Error(data.message || data.error || 'Checksum verification was not confirmed.')
      }
      const modFiles = data.modified_files || []
      const verifiedCount = data.total_files_checked ?? 0
      const modifiedCount = data.modified_files_count ?? modFiles.length
      
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.site_id === site.site_id ? {
          ...s,
          checksum_status: data.status,
          files_verified_count: verifiedCount,
          modified_files_count: modifiedCount + (data.missing_files_count || 0) + (data.unknown_files_count || 0),
          modified_files: modFiles,
          missing_files: data.missing_files || [],
          unknown_files: data.unknown_files || [],
          checksum_verified_at: data.verified_at || s.checksum_verified_at
        } : s)
      }))

      if (auditModalSite && auditModalSite.site_id === site.site_id) {
        setAuditModalSite(prev => ({
          ...prev,
          checksum_status: data.status,
          files_verified_count: verifiedCount,
          modified_files_count: modifiedCount + (data.missing_files_count || 0) + (data.unknown_files_count || 0),
          modified_files: modFiles,
          missing_files: data.missing_files || [],
          unknown_files: data.unknown_files || [],
          checksum_verified_at: data.verified_at || auditModalSite.checksum_verified_at
        }))
      }

      const issueCount = modifiedCount + (data.missing_files_count || 0) + (data.unknown_files_count || 0)
      if (issueCount > 0) {
        showToast(`${site.domain}: Checksum verification found ${issueCount} core integrity issue(s). Review the audit report.`, true)
      } else {
        showToast(`${site.domain}: Core checksums verified against the official WordPress.org manifest (${verifiedCount} files checked).`)
      }
    } catch (err) {
      showToast(err?.message || `Core checksum verification failed for ${site.domain}.`, true)
    } finally {
      setVerifyingSiteId(null)
    }
  }

  // 1-Click Repair Corrupted or Tampered Core File from WordPress.org
  const handleRepairCoreFile = async (site, fileObj) => {
    const fileName = typeof fileObj === 'string' ? fileObj : (fileObj.file || fileObj.name)
    if (!fileName) return
    setRepairingFile(fileName)
    showToast(`Downloading pristine SVN release of "${fileName}" from WordPress.org...`)

    try {
      const repairResponse = await api.repairWebsiteCoreFile(site.site_id, fileName)
      const repairResult = repairResponse?.data || repairResponse || {}
      if (repairResult.success !== true && !['success', 'repaired'].includes(repairResult.status)) {
        throw new Error(repairResult.message || repairResult.error || 'WordPress origin did not confirm the core file repair.')
      }
      const verifyResponse = await api.verifyCoreChecksums(site.site_id)
      const verification = verifyResponse?.data || verifyResponse || {}
      if (!['verified', 'modified_files_detected'].includes(verification.status)) {
        throw new Error('The repair was reported, but the follow-up integrity scan could not be verified.')
      }
      const modifiedFiles = verification.modified_files || []
      const verifiedCount = verification.total_files_checked ?? 0
      const modifiedCount = (verification.modified_files_count || 0) + (verification.missing_files_count || 0) + (verification.unknown_files_count || 0)
      const nextState = {
        checksum_status: verification.status,
        files_verified_count: verifiedCount,
        modified_files_count: modifiedCount,
        modified_files: modifiedFiles,
        missing_files: verification.missing_files || [],
        unknown_files: verification.unknown_files || [],
        checksum_verified_at: verification.verified_at
      }
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.site_id === site.site_id ? { ...s, ...nextState } : s)
      }))
      if (auditModalSite?.site_id === site.site_id) {
        setAuditModalSite(prev => ({ ...prev, ...nextState }))
      }
      showToast(`"${fileName}" repair was confirmed; the follow-up scan found ${modifiedCount} remaining integrity issue(s).`, modifiedCount > 0)
    } catch (err) {
      showToast(err?.message || `Could not verify repair of "${fileName}".`, true)
    } finally {
      setRepairingFile(null)
    }
  }

  // Update Single Website WordPress Core
  const handleUpdateCore = async (site) => {
    setUpdatingSiteId(site.site_id)
    try {
      const res = await api.updateWordpressCore(site.site_id)
      const result = res?.data || res
      if (result?.status !== 'success' || !result.updated_version) {
        throw new Error(result?.message || 'WordPress origin did not confirm the core update.')
      }
      const updatedVersion = result.updated_version

      setCoreData(prev => {
        const nextSites = prev.sites.map(s => s.site_id === site.site_id ? {
          ...s,
          installed_version: updatedVersion,
          update_available: null,
        } : s)
        const upCount = nextSites.filter(s => s.update_available === false).length
        const needCount = nextSites.filter(s => s.update_available === true).length
        return {
          ...prev,
          sites: nextSites,
          up_to_date_count: upCount,
          needs_update_count: needCount,
          fleet_integrity_pct: upCount + needCount
            ? ((upCount / (upCount + needCount)) * 100).toFixed(1)
            : null
        }
      })

      showToast(result.message || `WordPress Core on ${site.domain} is now v${updatedVersion}.`)
      fetchFleet(true)
      loadFleetCore()
    } catch (err) {
      showToast(err?.message || `Could not verify the WordPress core update for ${site.domain}.`, true)
    } finally {
      setUpdatingSiteId(null)
    }
  }

  // Auto-Update Policy Change
  const handlePolicyChange = async (siteId, newPolicy) => {
    try {
      await api.setCoreAutoUpdatePolicy(siteId, newPolicy)
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.site_id === siteId ? { ...s, auto_update_policy: newPolicy } : s)
      }))
      showToast(`Auto-update policy changed to "${newPolicy.toUpperCase()}" for site.`)
    } catch (err) {
      showToast(err?.message || 'Could not update the core auto-update policy.', true)
    }
  }

  // Bulk Verify Checksums Across All Sites (or single site if selected)
  const handleBulkVerify = async () => {
    setBulkVerifying(true)
    const isSingle = selectedSiteId && selectedSiteId !== 'all'
    const targetSites = displayedSites
    showToast(isSingle
      ? `Auditing core checksums for ${targetSites[0]?.domain || 'site'} against WordPress.org SVN hashes...`
      : `Auditing core checksums against WordPress.org SVN hashes across fleet...`
    )
    try {
      const siteResults = {}
      const failedSites = []
      for (const site of targetSites) {
        try {
          const res = await api.verifyCoreChecksums(site.site_id)
          const data = res?.data || res || {}
          if (!['verified', 'modified_files_detected'].includes(data.status)) {
            throw new Error(data.message || data.error || 'Checksum verification was not confirmed.')
          }
          siteResults[site.site_id] = data
        } catch (err) {
          failedSites.push({ site, error: err?.message || 'Verification failed.' })
        }
      }
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(s => {
          const r = siteResults[s.site_id]
          if (r) {
            const modFiles = r.modified_files || []
            const issueCount = (r.modified_files_count ?? modFiles.length) + (r.missing_files_count || 0) + (r.unknown_files_count || 0)
            return {
              ...s,
              checksum_status: r.status,
              modified_files_count: issueCount,
              files_verified_count: r.total_files_checked ?? s.files_verified_count,
              modified_files: modFiles,
              missing_files: r.missing_files || [],
              unknown_files: r.unknown_files || [],
              checksum_verified_at: r.verified_at || s.checksum_verified_at
            }
          }
          return s
        })
      }))
      if (failedSites.length > 0) {
        showToast(`Checksum verification confirmed for ${Object.keys(siteResults).length}/${targetSites.length} site(s); ${failedSites.length} failed or unavailable.`, failedSites.length === targetSites.length)
      } else {
        showToast(`Core checksum audit completed for ${targetSites.length} site(s).`)
      }
    } catch (err) {
      showToast(err?.message || 'Core checksum verification failed.', true)
    } finally {
      setBulkVerifying(false)
    }
  }

  // One-Click Bulk Repair All Core Files for a site
  const handleRepairAllCoreFiles = async (site) => {
    if (!site || !site.site_id) return
    setRepairingFile('__all__')
    showToast(`Restoring modified or missing core files for ${site.domain} from the official WordPress.org release...`)
    try {
      const res = await api.repairAllCoreFiles(site.site_id)
      const data = res?.data || res || {}
      if (data.errors?.length || data.final_status !== 'verified') {
        throw new Error(data.message || `Repair could not be verified; ${data.errors?.length || 0} file(s) remain unresolved.`)
      }
      const verification = data.verification || {}
      showToast(data.message || `All core files for ${site.domain} restored to official WordPress release!`)
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(s => {
          if (s.site_id === site.site_id) {
            return {
              ...s,
              checksum_status: 'verified',
              checksum_modified_count: 0,
              files_verified_count: verification.total_files_checked ?? s.files_verified_count,
              modified_files: [],
              missing_files: [],
              unknown_files: [],
              checksum_verified_at: verification.verified_at || s.checksum_verified_at
            }
          }
          return s
        })
      }))
      if (auditModalSite && auditModalSite.site_id === site.site_id) {
        setAuditModalSite(prev => ({
          ...prev,
          checksum_status: 'verified',
          checksum_modified_count: 0,
          files_verified_count: verification.total_files_checked ?? prev.files_verified_count,
          modified_files: [],
          missing_files: [],
          unknown_files: [],
          checksum_verified_at: verification.verified_at || prev.checksum_verified_at
        }))
      }
    } catch (err) {
      showToast(err?.message || 'Failed to bulk repair core files', true)
    } finally {
      setRepairingFile(null)
    }
  }

  // Bulk Update All Outdated Sites
  const handleBulkUpdateAll = async () => {
    setBulkUpdating(true)
    const latestVer = coreData.official_info.latest_version
    if (!latestVer) {
      showToast('The official WordPress release version is unavailable; no update was attempted.', true)
      setBulkUpdating(false)
      return
    }
    showToast(`Upgrading all outdated WordPress engines to official release v${latestVer}...`)
    try {
      const res = await api.updateAllWordpressCore()
      const result = res?.data || res
      const siteResults = Array.isArray(result?.results) ? result.results : []
      if (!siteResults.length || result?.total !== siteResults.length) {
        throw new Error(result?.message || 'The backend did not return verifiable per-site update results.')
      }
      const succeeded = siteResults.filter(site => site.success === true)
      setCoreData(prev => ({
        ...prev,
        sites: prev.sites.map(site => {
          const resultForSite = siteResults.find(item => item.website_id === site.site_id)
          return resultForSite?.success
            ? {
              ...site,
              installed_version: resultForSite.updated_version,
              update_available: null
            }
            : site
        })
      }))
      if (succeeded.length !== siteResults.length || result.status !== 'success') {
        showToast(result.message || `WordPress core update confirmed for ${succeeded.length}/${siteResults.length} site(s).`, true)
      } else {
        showToast(result.message || `WordPress core updates confirmed across ${succeeded.length} site(s).`)
      }
      fetchFleet(true)
      loadFleetCore()
    } catch (err) {
      showToast(err?.message || 'WordPress core fleet update failed or was not confirmed.', true)
    } finally {
      setBulkUpdating(false)
    }
  }

  const latestOfficialVer = coreData.official_info?.latest_version || 'Unavailable'
  const outdatedCount = coreData.needs_update_count || 0
  const unknownVersionCount = coreData.unknown_version_count || 0
  const versionDataAvailable = Boolean(coreData.official_info?.available && coreData.official_info?.latest_version)
  const auditFindings = useMemo(() => {
    if (!auditModalSite) return []
    return [
      ...(auditModalSite.modified_files || []).map(item => ({
        ...(typeof item === 'object' ? item : {}),
        file: typeof item === 'string' ? item : (item.file || item.path),
        type: 'Modified'
      })),
      ...(auditModalSite.missing_files || []).map(item => ({
        file: typeof item === 'string' ? item : (item.file || item.path),
        type: 'Missing'
      })),
      ...(auditModalSite.unknown_files || []).map(item => ({
        ...(typeof item === 'object' ? item : {}),
        file: typeof item === 'string' ? item : (item.file || item.path),
        type: 'Unknown'
      }))
    ].filter(item => item.file)
  }, [auditModalSite])

  return (
    <div style={{ maxWidth: '1720px', margin: '0 auto', padding: '4px 0 40px' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMsg.isError ? '#991B1B' : '#0B2522',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(11, 37, 34, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <BulkHeader
        title="WordPress Core Version & Integrity"
        subtitle="Manage WordPress engine versions, verify official SVN core file checksums, and monitor runtime health."
        icon={Cpu}
        activeBadge="Core Engine Guard"
      />

      {!hasWebsites ? (
        <EmptyFleetState
          title="No WordPress Websites Connected Yet"
          description="Your WordPress Core integrity dashboard is empty because no sites are connected to your account. Connect your site using the MDefender-Pro plugin to verify official SVN checksums and inspect PHP runtime health."
          featureName="Core Integrity Verification"
        />
      ) : (
        <>
          {/* Top 4 Real Telemetry KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
            marginBottom: '14px'
          }}>
            {/* Card 1: WordPress.org Official Release */}
            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={kpiHeaderLabelStyle}>OFFICIAL LATEST STABLE</span>
                <span style={badgeStyle(
                  versionDataAvailable ? '#E8F3EC' : '#FFF4ED',
                  versionDataAvailable ? '#2A8B68' : '#EA580C',
                  versionDataAvailable ? '#CFE2D4' : '#FED7AA'
                )}>{versionDataAvailable ? 'OFFICIAL DATA' : 'DATA UNAVAILABLE'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.02em', color: '#10201E' }}>
                  WordPress {latestOfficialVer}
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#60716B', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>PHP {coreData.official_info?.php_required ? `${coreData.official_info.php_required}+` : 'Requirement unavailable'}</span>
                <span>•</span>
                <span>MySQL {coreData.official_info?.mysql_required ? `${coreData.official_info.mysql_required}+` : 'Requirement unavailable'}</span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#889892', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {versionDataAvailable ? <CheckCircle2 size={13} color="#2A8B68" /> : <AlertTriangle size={13} color="#EA580C" />}
                <span>{versionDataAvailable ? 'Release data retrieved from WordPress.org' : 'Official WordPress release could not be verified'}</span>
              </div>
            </div>

            {/* Card 2: Fleet Version Compliance */}
            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={kpiHeaderLabelStyle}>FLEET ENGINE COMPLIANCE</span>
                <span style={badgeStyle(
                  outdatedCount === 0 && unknownVersionCount === 0 ? '#E8F3EC' : '#FFF4ED',
                  outdatedCount === 0 && unknownVersionCount === 0 ? '#2A8B68' : '#EA580C',
                  outdatedCount === 0 && unknownVersionCount === 0 ? '#CFE2D4' : '#FED7AA'
                )}>
                  {!versionDataAvailable
                    ? 'VERSION DATA UNAVAILABLE'
                    : unknownVersionCount > 0
                    ? `${unknownVersionCount} SITE(S) UNKNOWN`
                    : outdatedCount === 0 ? 'COMPLIANT' : `${outdatedCount} SITE(S) OUTDATED`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.02em', color: '#10201E' }}>
                  {coreData.up_to_date_count} / {coreData.total_sites || displayedSites.length}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#60716B' }}>Sites Updated</span>
              </div>
              <div style={{ marginTop: '10px', width: '100%', height: '6px', background: '#EAEFEB', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${coreData.fleet_integrity_pct ?? 0}%`,
                  height: '100%',
                  background: outdatedCount === 0 && unknownVersionCount === 0 ? '#2A8B68' : '#EA580C',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#60716B' }}>
                {coreData.fleet_integrity_pct == null ? 'Fleet version compliance is unknown until site versions are verified.' : `${coreData.fleet_integrity_pct}% fleet version compliance across known origins`}
              </div>
            </div>

            {/* Card 3: Checksum Security Guard */}
            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={kpiHeaderLabelStyle}>OFFICIAL SVN CHECKSUMS</span>
                <span style={badgeStyle('#F0F9FF', '#0284C7', '#BAE6FD')}>OFFICIAL MANIFEST</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.02em', color: '#10201E' }}>
                  100%
                </span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#2A8B68' }}>Integrity Target</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#60716B' }}>
                File-hash comparison against official WordPress release manifests
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#889892', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} color="#0284C7" />
                <span>wp-admin, wp-includes &amp; root files</span>
              </div>
            </div>

            {/* Card 4: Fleet Quick Actions */}
            <div style={{ ...kpiCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={kpiHeaderLabelStyle}>FLEET ORCHESTRATION</span>
                <div style={{ fontSize: '13px', color: '#60716B', marginTop: '6px', lineHeight: '1.4' }}>
                  Auditing scope: <strong>{scopeLabel}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={handleBulkVerify}
                  disabled={bulkVerifying}
                  style={secondaryFleetButtonStyle}
                >
                  <RefreshCw size={13} style={{ animation: bulkVerifying ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{bulkVerifying ? 'Auditing SVN Hashes...' : 'Verify Fleet Checksums'}</span>
                </button>

                {outdatedCount > 0 && (
                  <button
                    onClick={handleBulkUpdateAll}
                    disabled={bulkUpdating}
                    style={primaryFleetButtonStyle}
                  >
                    <Sparkles size={13} />
                    <span>{bulkUpdating ? 'Upgrading Fleet...' : `Update All to v${latestOfficialVer}`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fleet Core Matrix Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #D9E1DC',
            boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Table Header Bar */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #EAEFEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: '#FAFCFB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                  Fleet WordPress Core Engine Matrix
                </h3>
                <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>
                  {displayedSites.length} {displayedSites.length === 1 ? 'Site' : 'Sites'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#60716B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Official WP.org Source:</span>
                <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#0B2522' }}>
                  api.wordpress.org/core/checksums/1.0/
                </code>
              </div>
            </div>

            {/* Responsive Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
                <thead>
                  <tr style={{ background: '#F8FAF9', borderBottom: '1px solid #D9E1DC' }}>
                    <th style={thStyle}>WORDPRESS ORIGIN</th>
                    <th style={thStyle}>INSTALLED ENGINE</th>
                    <th style={thStyle}>RUNTIME &amp; STORAGE</th>
                    <th style={thStyle}>SVN CHECKSUM INTEGRITY</th>
                    <th style={thStyle}>AUTO-UPDATE POLICY</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSites.map((site) => {
                    const isVerifying = verifyingSiteId === site.site_id
                    const isUpdating = updatingSiteId === site.site_id
                    const hasUpdate = site.update_available === true
                    const versionKnown = site.update_available !== null && site.update_available !== undefined
                    const repairableFileCount = (site.modified_files || []).length + (site.missing_files || []).length

                    return (
                      <tr key={site.site_id} style={trStyle}>
                        {/* 1. Origin Domain & Icon */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Cpu size={16} color="#0B2522" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: '700', fontSize: '14px', color: '#10201E' }}>
                                  {site.domain}
                                </span>
                                {site.url && (
                                  <a
                                    href={site.url.startsWith('http') ? site.url : `https://${site.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#889892', display: 'flex', alignItems: 'center' }}
                                    title="Open website"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: '#60716B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: site.is_online ? '#2A8B68' : '#94A3B8'
                                }} />
                                <span>{site.is_online ? 'Origin Live' : 'Connected'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Installed Engine */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '800', fontSize: '14px', color: '#10201E' }}>
                                {site.installed_version ? `v${site.installed_version}` : 'Version unavailable'}
                              </span>
                              {hasUpdate ? (
                                <span style={badgeStyle('#FFF4ED', '#EA580C', '#FED7AA')}>
                                  UPDATE TO v{site.latest_version}
                                </span>
                              ) : versionKnown ? (
                                <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>
                                  CURRENT
                                </span>
                              ) : (
                                <span style={badgeStyle('#FFF4ED', '#EA580C', '#FED7AA')}>UNKNOWN</span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#889892' }}>
                              {hasUpdate ? 'Security & feature release pending' : versionKnown ? 'No newer official release reported' : 'Installed or official version unavailable'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Runtime & Storage */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Server size={13} color="#60716B" />
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                                PHP {site.php_version}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Database size={13} color="#889892" />
                              <span style={{ fontSize: '11px', color: '#60716B' }}>
                                {site.db_engine}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. SVN Checksum Integrity */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {site.checksum_status === 'verified' ? (
                                <>
                                  <CheckCircle2 size={14} color="#2A8B68" />
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#2A8B68' }}>
                                    {site.files_verified_count ? `${site.files_verified_count.toLocaleString()} Files Verified` : 'Core Integrity Verified'}
                                  </span>
                                </>
                              ) : site.checksum_status === 'modified_files_detected' ? (
                                <>
                                  <AlertTriangle size={14} color="#EA580C" />
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#EA580C' }}>
                                    {site.modified_files_count || 0} Core Integrity Issue(s)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Info size={14} color="#889892" />
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#60716B' }}>
                                    Not verified
                                  </span>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#889892' }}>
                                Checked: {site.checksum_verified_at || 'Never'}
                              </span>
                              <button
                                onClick={() => setAuditModalSite(site)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: '#0284C7',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                              >
                                View Audit
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 5. Auto-Update Policy Selector */}
                        <td style={tdStyle}>
                          <select
                            value={site.auto_update_policy || 'minor'}
                            onChange={(e) => handlePolicyChange(site.site_id, e.target.value)}
                            style={policySelectStyle}
                          >
                            <option value="minor">Minor &amp; Security</option>
                            <option value="all">All Releases (Major+Minor)</option>
                            <option value="disabled">Disabled (Manual Only)</option>
                          </select>
                        </td>

                        {/* 6. Actions */}
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => handleVerifyChecksums(site)}
                              disabled={isVerifying}
                              title="Audit core file MD5 hashes against WordPress.org SVN"
                              style={actionSecondaryBtnStyle}
                            >
                              <RefreshCw size={12} style={{ animation: isVerifying ? 'spin 1s linear infinite' : 'none' }} />
                              <span>{isVerifying ? 'Checking...' : 'Verify'}</span>
                            </button>

                            {repairableFileCount > 0 && (
                              <button
                                onClick={() => handleRepairAllCoreFiles(site)}
                                disabled={repairingFile === '__all__'}
                                title="One-Click Restore all core files to pristine WordPress.org SVN release"
                                style={{
                                  ...actionPrimaryBtnStyle,
                                  background: '#DC2626',
                                  borderColor: '#DC2626'
                                }}
                              >
                                {repairingFile === '__all__' ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                                <span>{repairingFile === '__all__' ? 'Repairing...' : 'Repair All'}</span>
                              </button>
                            )}

                            {hasUpdate ? (
                              <button
                                onClick={() => handleUpdateCore(site)}
                                disabled={isUpdating}
                                style={actionPrimaryBtnStyle}
                              >
                                <Sparkles size={12} />
                                <span>{isUpdating ? 'Updating...' : `Upgrade`}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setAuditModalSite(site)}
                                style={actionInspectBtnStyle}
                              >
                                <FileCheck size={12} />
                                <span>Inspect</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deep SVN Checksum & Environment Audit Modal */}
          {auditModalSite && (
            <div style={modalBackdropStyle}>
              <div style={modalContentStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #EAEFEB', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Cpu size={18} color="#0B2522" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                        WordPress Core SVN Integrity Audit
                      </h3>
                      <span style={{ fontSize: '12px', color: '#60716B' }}>
                        {auditModalSite.domain} • WordPress v{auditModalSite.installed_version}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuditModalSite(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#889892', padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary bar */}
                  <div style={{ background: '#F8FAF9', borderRadius: '10px', padding: '14px 16px', border: '1px solid #D9E1DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#889892', letterSpacing: '0.04em' }}>
                        OFFICIAL API SOURCE
                      </div>
                      <code style={{ fontSize: '11px', color: '#0B2522', wordBreak: 'break-all' }}>
                        https://api.wordpress.org/core/checksums/1.0/?version={auditModalSite.installed_version}&amp;locale=en_US
                      </code>
                    </div>
                    <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>
                      {auditModalSite.files_verified_count
                        ? `${auditModalSite.files_verified_count.toLocaleString()} FILES CHECKED`
                        : 'NOT VERIFIED'}
                    </span>
                  </div>

                  {/* Environment details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #EAEFEB', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#889892', fontWeight: '700' }}>PHP RUNTIME</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E', marginTop: '4px' }}>
                        {auditModalSite.php_version}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #EAEFEB', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#889892', fontWeight: '700' }}>DATABASE ENGINE</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E', marginTop: '4px' }}>
                        {auditModalSite.db_engine}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #EAEFEB', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#889892', fontWeight: '700' }}>AUTO-UPDATE POLICY</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E', marginTop: '4px', textTransform: 'capitalize' }}>
                        {auditModalSite.auto_update_policy || 'Minor Only'}
                      </div>
                    </div>
                  </div>

                  {/* Repair controls for core findings */}
                  {((auditModalSite.modified_files || []).length > 0 || (auditModalSite.missing_files || []).length > 0) && (
                    <div style={{
                      marginBottom: '18px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} color="#DC2626" />
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                            Repairable Core Findings ({(auditModalSite.modified_files || []).length + (auditModalSite.missing_files || []).length})
                          </span>
                        </div>
                        <button
                          onClick={() => handleRepairAllCoreFiles(auditModalSite)}
                          disabled={repairingFile === '__all__'}
                          style={{
                            background: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: repairingFile === '__all__' ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {repairingFile === '__all__' ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                          <span>{repairingFile === '__all__' ? 'Restoring All Files...' : `Repair All Core Files (${(auditModalSite.modified_files || []).length + (auditModalSite.missing_files || []).length})`}</span>
                        </button>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#7F1D1D', lineHeight: '1.45' }}>
                        Restore missing or modified files only after reviewing the origin scan results below.
                      </p>
                    </div>
                  )}

                  {/* Findings from the latest origin scan */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#10201E', marginBottom: '8px' }}>
                      Core Integrity Scan Results
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #EAEFEB', borderRadius: '8px', background: '#FAFCFB' }}>
                      {auditModalSite.checksum_status === 'verified' ? (
                        <div style={{ padding: '12px', fontSize: '12px', color: '#2A8B68' }}>
                          No integrity findings reported across {auditModalSite.files_verified_count || 0} files checked.
                        </div>
                      ) : auditFindings.length > 0 ? auditFindings.map((finding, index) => (
                        <div key={`${finding.file}-${index}`} style={{ padding: '8px 12px', borderBottom: '1px solid #F0F4F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#DC2626', fontWeight: '700' }}>
                            {finding.file} ({finding.type})
                          </span>
                          {finding.type !== 'Unknown' && (
                            <button
                              onClick={() => handleRepairCoreFile(auditModalSite, finding)}
                              disabled={repairingFile === finding.file}
                              style={actionSecondaryBtnStyle}
                            >
                              {repairingFile === finding.file ? 'Restoring...' : 'Repair'}
                            </button>
                          )}
                        </div>
                      )) : (
                        <div style={{ padding: '12px', fontSize: '12px', color: '#60716B' }}>
                          This site does not have a complete verified checksum scan yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button
                      onClick={() => setAuditModalSite(null)}
                      style={{
                        background: '#10201E',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const kpiCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '12px 16px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
}

const kpiHeaderLabelStyle = {
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  color: '#889892'
}

const thStyle = {
  padding: '14px 20px',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  color: '#60716B',
  borderBottom: '1px solid #D9E1DC'
}

const tdStyle = {
  padding: '16px 20px',
  verticalAlign: 'middle',
  borderBottom: '1px solid #F0F4F2'
}

const trStyle = {
  transition: 'background 0.15s ease'
}

const primaryFleetButtonStyle = {
  background: '#10201E',
  color: '#ffffff',
  border: 'none',
  padding: '9px 16px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(16, 32, 30, 0.15)'
}

const secondaryFleetButtonStyle = {
  background: '#ffffff',
  color: '#0B2522',
  border: '1px solid #D9E1DC',
  padding: '9px 16px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer'
}

const actionPrimaryBtnStyle = {
  background: '#0B2522', border: '1px solid #0B2522',
  color: '#ffffff',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)'
}

const actionSecondaryBtnStyle = {
  background: '#ffffff',
  color: '#10201E',
  border: '1px solid #D9E1DC',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer'
}

const actionInspectBtnStyle = {
  background: 'transparent',
  color: '#60716B',
  border: '1px solid #D9E1DC',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer'
}

const policySelectStyle = {
  background: '#F8FAF9',
  border: '1px solid #D9E1DC',
  borderRadius: '8px',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: '600',
  color: '#10201E',
  outline: 'none',
  cursor: 'pointer'
}

const badgeStyle = (bg, color, border) => ({
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  background: bg,
  color: color,
  border: `1px solid ${border}`
})

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(11, 37, 34, 0.45)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: '16px'
}

const modalContentStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '680px',
  padding: '24px 28px',
  boxShadow: '0 20px 40px rgba(11, 37, 34, 0.25)',
  border: '1px solid #D9E1DC',
  maxHeight: '90vh',
  overflowY: 'auto'
}
