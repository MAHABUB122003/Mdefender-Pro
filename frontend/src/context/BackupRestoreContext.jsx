import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HardDrive,
  Minus,
  Maximize2,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import api from '../api/api'

const BackupRestoreContext = createContext(null)

export function BackupRestoreProvider({ children }) {
  const [activeJob, setActiveJob] = useState(null)
  const isJobRunningRef = useRef(false)

  // Start Backup Job in background
  const startBackup = useCallback(async ({ siteId, siteName, type = 'full', components, note = '', onSuccess, onError }) => {
    if (isJobRunningRef.current) {
      alert('A disaster recovery operation is already running in the background. Please wait for it to complete.')
      return
    }

    const jobId = `job_backup_${Date.now()}`
    const displaySite = siteName || 'WordPress Origin'

    const initialJob = {
      id: jobId,
      operation: 'backup',
      siteId,
      siteName: displaySite,
      backupType: type,
      status: 'running',
      progressMessage: `Packaging database dump and compressing files for ${displaySite}...`,
      startedAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
      isMinimized: false
    }

    isJobRunningRef.current = true
    setActiveJob(initialJob)

    try {
      const selectedComponents = components || (
        type === 'database' ? ['db'] :
        (type === 'files' ? ['plugins', 'themes', 'uploads', 'core', 'wp_config'] :
        ['db', 'plugins', 'themes', 'uploads', 'core', 'wp_config'])
      )

      const res = await api.createWebsiteBackup(siteId, {
        type,
        components: selectedComponents,
        note: note.trim() || `Manual ${type.toUpperCase()} Snapshot`
      })

      const resultData = res?.data || {}
      const success = resultData.success !== false

      setActiveJob(prev => prev ? {
        ...prev,
        status: success ? 'completed' : 'error',
        progressMessage: success
          ? (resultData.message || `Disaster Recovery Snapshot created successfully!`)
          : (resultData.message || 'Backup failed on origin server.'),
        completedAt: Date.now(),
        result: resultData,
        filename: resultData.filename || resultData.backup?.filename || 'archive.zip',
        size: resultData.size || resultData.backup?.size || 'Compressed'
      } : null)

      // Broadcast event so any open backup list refreshes automatically
      window.dispatchEvent(new CustomEvent('mdefender:backup_completed', { detail: resultData }))

      if (success && onSuccess) onSuccess(resultData)
      if (!success && onError) onError(new Error(resultData.message || 'Backup error'))

    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Server error while generating snapshot'
      setActiveJob(prev => prev ? {
        ...prev,
        status: 'error',
        progressMessage: errMsg,
        error: errMsg,
        completedAt: Date.now()
      } : null)

      window.dispatchEvent(new CustomEvent('mdefender:backup_completed', { detail: { success: false, error: errMsg } }))
      if (onError) onError(err)
    } finally {
      isJobRunningRef.current = false
    }
  }, [])

  // Start Fleet-Wide Concurrent Backup in background
  const startFleetBackup = useCallback(async ({ sites = [], type = 'full', components, note = '', onSuccess, onError }) => {
    if (isJobRunningRef.current) {
      alert('A disaster recovery operation is already running in the background. Please wait for it to complete.')
      return
    }

    if (!sites || sites.length === 0) {
      if (onError) onError(new Error('No fleet sites available for backup.'))
      return
    }

    const jobId = `job_fleet_backup_${Date.now()}`
    const initialJob = {
      id: jobId,
      operation: 'backup',
      siteId: 'all',
      siteName: `Global Fleet (${sites.length} Sites)`,
      backupType: type,
      status: 'running',
      progressMessage: `Packaging disaster recovery snapshots across ${sites.length} WordPress origins...`,
      startedAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
      isMinimized: false
    }

    isJobRunningRef.current = true
    setActiveJob(initialJob)

    try {
      const selectedComponents = components || (
        type === 'database' ? ['db'] :
        (type === 'files' ? ['plugins', 'themes', 'uploads', 'core', 'wp_config'] :
        ['db', 'plugins', 'themes', 'uploads', 'core', 'wp_config'])
      )
      const noteStr = note.trim() || `Fleet ${type.toUpperCase()} Snapshot`

      const settled = await Promise.allSettled(sites.map(async s => {
        const sid = s.id || s._id
        return api.createWebsiteBackup(sid, {
          type,
          components: selectedComponents,
          note: noteStr
        })
      }))

      const successful = settled.filter(r => r.status === 'fulfilled' && r.value?.data?.success !== false)
      const isSuccess = successful.length > 0
      const msg = `Fleet backup complete: ${successful.length} of ${sites.length} websites successfully archived.`

      setActiveJob(prev => prev ? {
        ...prev,
        status: isSuccess ? 'completed' : 'error',
        progressMessage: msg,
        completedAt: Date.now(),
        result: { success: isSuccess, count: successful.length, total: sites.length },
        filename: `${sites.length}_sites_fleet.zip`,
        size: 'Multi-Site Fleet'
      } : null)

      window.dispatchEvent(new CustomEvent('mdefender:backup_completed', { detail: { fleet: true, count: successful.length } }))
      if (isSuccess && onSuccess) onSuccess({ message: msg, count: successful.length })
      if (!isSuccess && onError) onError(new Error('Failed to create fleet backups'))
    } catch (err) {
      const errMsg = err?.message || 'Error generating fleet snapshots'
      setActiveJob(prev => prev ? {
        ...prev,
        status: 'error',
        progressMessage: errMsg,
        error: errMsg,
        completedAt: Date.now()
      } : null)
      window.dispatchEvent(new CustomEvent('mdefender:backup_completed', { detail: { success: false, error: errMsg } }))
      if (onError) onError(err)
    } finally {
      isJobRunningRef.current = false
    }
  }, [])

  // Start Restore Job in background
  const startRestore = useCallback(async ({ siteId, siteName, filename, onSuccess, onError }) => {
    if (isJobRunningRef.current) {
      alert('Another disaster recovery task is currently in progress. Please wait for it to finish.')
      return
    }

    const jobId = `job_restore_${Date.now()}`
    const displaySite = siteName || 'WordPress Origin'

    const initialJob = {
      id: jobId,
      operation: 'restore',
      siteId,
      siteName: displaySite,
      filename,
      status: 'running',
      progressMessage: `Restoring ${displaySite} from snapshot "${filename}"... Reconstituting database tables and WordPress files...`,
      startedAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
      isMinimized: false
    }

    isJobRunningRef.current = true
    setActiveJob(initialJob)

    try {
      const res = await api.restoreWebsiteBackup(siteId, filename)
      const resultData = res?.data || {}
      const success = resultData.success !== false

      setActiveJob(prev => prev ? {
        ...prev,
        status: success ? 'completed' : 'error',
        progressMessage: success
          ? (resultData.message || `Disaster Recovery Complete! Website restored from ${filename}`)
          : (resultData.message || 'Restoration failed on origin server.'),
        completedAt: Date.now(),
        result: resultData
      } : null)

      window.dispatchEvent(new CustomEvent('mdefender:restore_completed', { detail: resultData }))

      if (success && onSuccess) onSuccess(resultData)
      if (!success && onError) onError(new Error(resultData.message || 'Restore error'))

    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Restoration encountered an issue.'
      setActiveJob(prev => prev ? {
        ...prev,
        status: 'error',
        progressMessage: errMsg,
        error: errMsg,
        completedAt: Date.now()
      } : null)

      window.dispatchEvent(new CustomEvent('mdefender:restore_completed', { detail: { success: false, error: errMsg } }))
      if (onError) onError(err)
    } finally {
      isJobRunningRef.current = false
    }
  }, [])

  // Toggle Minimized state
  const toggleMinimize = useCallback(() => {
    setActiveJob(prev => prev ? { ...prev, isMinimized: !prev.isMinimized } : null)
  }, [])

  // Dismiss / Close job card
  const dismissJob = useCallback(() => {
    setActiveJob(null)
    isJobRunningRef.current = false
  }, [])

  return (
    <BackupRestoreContext.Provider
      value={{
        activeJob,
        isJobRunning: !!activeJob && activeJob.status === 'running',
        startBackup,
        startFleetBackup,
        startRestore,
        toggleMinimize,
        dismissJob
      }}
    >
      {children}
    </BackupRestoreContext.Provider>
  )
}

export function useBackupRestore() {
  const context = useContext(BackupRestoreContext)
  if (!context) {
    throw new Error('useBackupRestore must be used within a BackupRestoreProvider')
  }
  return context
}

// ---------------------------------------------------------------------------
// Global Non-Blocking Floating Background Task Tracker
// ---------------------------------------------------------------------------
function GlobalBackupTracker({ job, onToggleMinimize, onDismiss }) {
  if (!job) return null

  const isRunning = job.status === 'running'
  const isCompleted = job.status === 'completed'
  const isError = job.status === 'error'
  const isBackup = job.operation === 'backup'

  // Minimized Pill Floating Widget
  if (job.isMinimized) {
    return (
      <div
        onClick={onToggleMinimize}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: '#0B2522',
          color: '#ffffff',
          borderRadius: '50px',
          padding: '10px 18px',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '13px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          animation: 'fadeInUp 0.25s ease-out'
        }}
        title="Click to expand task progress"
      >
        {isRunning && (
          <RefreshCw
            size={14}
            color="#34D399"
            style={{ animation: 'spin 1.2s linear infinite' }}
          />
        )}
        {isCompleted && <CheckCircle2 size={15} color="#34D399" />}
        {isError && <AlertTriangle size={15} color="#F87171" />}

        <span>
          {isBackup ? 'Backup' : 'Restore'}: <strong>{job.siteName}</strong>
        </span>

        <span style={{
          fontSize: '11px',
          padding: '2px 7px',
          borderRadius: '20px',
          background: isRunning ? 'rgba(52, 211, 153, 0.2)' : (isCompleted ? '#059669' : '#DC2626'),
          color: isRunning ? '#34D399' : '#ffffff',
          fontWeight: '700'
        }}>
          {isRunning ? 'Running in Background...' : (isCompleted ? 'Finished' : 'Failed')}
        </span>

        <Maximize2 size={13} color="#94A3B8" style={{ marginLeft: '4px' }} />
      </div>
    )
  }

  // Expanded Floating Enterprise Card
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '390px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 99999,
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 30px -10px rgba(11, 37, 34, 0.25), 0 8px 12px -4px rgba(0,0,0,0.08)',
        border: `1px solid ${isError ? '#FECACA' : (isCompleted ? '#BBF7D0' : '#E2E8F0')}`,
        overflow: 'hidden',
        animation: 'fadeInUp 0.25s ease-out'
      }}
    >
      {/* Top Accent Strip */}
      <div style={{
        height: '4px',
        width: '100%',
        background: isError ? '#DC2626' : (isCompleted ? '#10B981' : 'linear-gradient(90deg, #10B981 0%, #2A8B68 50%, #0B2522 100%)'),
        backgroundSize: '200% 100%',
        animation: isRunning ? 'shimmerBar 2s ease infinite' : 'none'
      }} />

      {/* Card Header */}
      <div style={{
        padding: '12px 16px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: isError ? '#FEE2E2' : (isCompleted ? '#D1FAE5' : '#E0F2FE'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isRunning && <RefreshCw size={14} color="#0284C7" style={{ animation: 'spin 1.2s linear infinite' }} />}
            {isCompleted && <CheckCircle2 size={16} color="#059669" />}
            {isError && <AlertTriangle size={15} color="#DC2626" />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                {isBackup ? 'Disaster Recovery Backup' : 'Disaster Recovery Restore'}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                background: isRunning ? '#E0F2FE' : (isCompleted ? '#ECFDF5' : '#FEF2F2'),
                color: isRunning ? '#0284C7' : (isCompleted ? '#059669' : '#DC2626')
              }}>
                {isRunning ? 'ACTIVE' : (isCompleted ? 'SUCCESS' : 'FAILED')}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
              Target: <strong>{job.siteName}</strong>
            </div>
          </div>
        </div>

        {/* Header Controls: Minimize & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onToggleMinimize}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Minimize to background pill"
          >
            <Minus size={14} />
          </button>
          {!isRunning && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close notification"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '12.5px',
          color: isError ? '#DC2626' : (isCompleted ? '#065F46' : '#334155'),
          lineHeight: '1.45'
        }}>
          {job.progressMessage}
        </p>

        {/* If Completed, show archive info */}
        {isCompleted && job.filename && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '10px',
            fontSize: '11.5px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <HardDrive size={13} color="#15803D" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {job.filename}
              </span>
            </div>
            {job.size && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', flexShrink: 0 }}>
                {job.size}
              </span>
            )}
          </div>
        )}

        {/* Background Non-blocking reassurance note */}
        {isRunning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#059669',
            background: '#F0FDF4',
            padding: '6px 10px',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <ShieldCheck size={13} color="#059669" style={{ flexShrink: 0 }} />
            <span>Running safely in background. You can freely navigate to plugins, themes, or other tabs!</span>
          </div>
        )}

        {/* Action button row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          {isRunning ? (
            <button
              onClick={onToggleMinimize}
              style={{
                background: '#0B2522',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Minimize to Background</span>
              <Minus size={12} />
            </button>
          ) : (
            <button
              onClick={onDismiss}
              style={{
                background: isCompleted ? '#059669' : '#0F172A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done & Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

