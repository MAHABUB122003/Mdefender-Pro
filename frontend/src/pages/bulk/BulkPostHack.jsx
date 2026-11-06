import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Key,
  LogOut,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Activity,
  Server,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Info
} from 'lucide-react'
import BulkHeader, { EmptyFleetState } from './BulkHeader'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkPostHack() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite, fetchFleet } = useBulkFleet()

  const isAllTarget = !selectedSiteId || selectedSiteId === 'all'
  const activeTargetSite = useMemo(() => {
    if (isAllTarget) return activeWebsite || wpWebsites[0] || {}
    return wpWebsites.find(w => (w.id || w._id) === selectedSiteId) || activeWebsite || wpWebsites[0] || {}
  }, [selectedSiteId, isAllTarget, activeWebsite, wpWebsites])

  const targetSiteId = isAllTarget ? (wpWebsites[0]?.id || wpWebsites[0]?._id || '') : (activeTargetSite.id || activeTargetSite._id || '')

  // State
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [statusData, setStatusData] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { action, title, description, dangerLevel, payload }
  const [passwordResetScope, setPasswordResetScope] = useState('admins')

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Fetch status of the target website
  const loadStatus = useCallback(async () => {
    if (!targetSiteId) return
    setLoadingStatus(true)
    try {
      const res = await api.getPostHackStatus(targetSiteId)
      const data = res?.data?.status || res?.status || res?.data || {}
      setStatusData(data)
    } catch (err) {
      console.error('Failed to load post-hack status:', err)
      setStatusData({
        success: false,
        lockdown_active: false,
        salts_last_regenerated: 'Unknown',
        active_sessions_count: 0,
        total_admins: 0,
        admins: []
      })
    } finally {
      setLoadingStatus(false)
    }
  }, [targetSiteId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Execute Action
  const handleExecuteAction = async (action, payload = {}) => {
    setActionInProgress(action)
    setConfirmModal(null)
    try {
      const siteIdToUse = isAllTarget ? 'all' : targetSiteId
      const res = await api.executePostHackAction(siteIdToUse, action, payload)
      const resultObj = res?.data || res
      const isSuccess = resultObj?.results?.every(r => r.success !== false) ?? (resultObj?.status === 'success' || resultObj?.success)

      if (isSuccess) {
        showToast(resultObj?.results?.[0]?.result?.message || `Successfully executed ${action.replace('_', ' ')}.`)
      } else {
        showToast(resultObj?.results?.[0]?.result?.message || 'Action executed with some warnings.', true)
      }
      await loadStatus()
    } catch (err) {
      console.error(`Post-hack action [${action}] failed:`, err)
      showToast(err?.message || `Action ${action} encountered an error.`, true)
    } finally {
      setActionInProgress(null)
    }
  }

  // Modals for high-risk actions
  const promptTerminateSessions = () => {
    setConfirmModal({
      action: 'terminate_sessions',
      title: 'Sever All Active User Sessions?',
      description: 'This will instantly invalidate all active authentication session tokens across all WordPress user accounts on all devices. Intruders or attackers currently inside wp-admin will be ejected immediately.',
      badgeText: 'Instant Kickout',
      dangerLevel: 'high',
      confirmBtnText: 'Terminate All Sessions Now',
      payload: {}
    })
  }

  const promptRegenerateSalts = () => {
    setConfirmModal({
      action: 'regen_salts',
      title: 'Regenerate WordPress Security Keys & Salts?',
      description: 'This will replace the 8 cryptographic authentication salts in wp-config.php with brand new 64-character high-entropy keys. An automatic backup snapshot of wp-config.php will be saved before writing.',
      badgeText: 'Cryptographic Reset',
      dangerLevel: 'medium',
      confirmBtnText: 'Regenerate Security Salts',
      payload: {}
    })
  }

  const promptForcePasswordReset = () => {
    setConfirmModal({
      action: 'force_password_reset',
      title: `Mandate Password Reset (${passwordResetScope === 'admins' ? 'Administrators' : 'All Accounts'})?`,
      description: `All ${passwordResetScope === 'admins' ? 'administrator' : 'registered user'} accounts will be flagged. Users will be strictly required to set and verify a new secure password on their next login attempt.`,
      badgeText: 'Credentials Policy',
      dangerLevel: 'low',
      confirmBtnText: 'Enforce Password Reset',
      payload: { scope: passwordResetScope }
    })
  }

  const promptToggleLockdown = (newStatus) => {
    setConfirmModal({
      action: 'toggle_lockdown',
      title: newStatus ? 'Activate Emergency Maintenance Lockdown?' : 'Deactivate Emergency Lockdown?',
      description: newStatus
        ? 'Public visitors will receive an HTTP 503 Maintenance response. Only authenticated administrators will be granted access while investigation and malware cleanup take place.'
        : 'Emergency containment will be lifted. Standard public access to the website will be immediately restored.',
      badgeText: newStatus ? 'Containment Shield' : 'Restore Public Access',
      dangerLevel: newStatus ? 'high' : 'low',
      confirmBtnText: newStatus ? 'Enable Emergency Lockdown' : 'Restore Normal Access',
      payload: { enable: newStatus }
    })
  }

  if (!hasWebsites) {
    return (
      <div style={{ padding: '32px 36px', minHeight: '100vh', background: '#F6F8F7' }}>
        <BulkHeader
          title="Incident Response & Post-Hack Recovery"
          subtitle="Enterprise emergency response toolkit for compromised website containment."
          icon={LifeBuoy}
          activeBadge="Emergency Response"
        />
        <EmptyFleetState />
      </div>
    )
  }

  const isLockdownActive = Boolean(statusData?.lockdown_active)
  const activeSessionsCount = statusData?.active_sessions_count ?? 0
  const totalAdminsCount = statusData?.total_admins ?? (statusData?.admins?.length || 0)
  const saltsRegenTime = statusData?.salts_last_regenerated || 'Not rotated yet'

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F7', color: '#10201E', paddingBottom: '60px' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '10px',
            background: toastMsg.isError ? '#DC2626' : '#0B2522',
            color: '#FFFFFF',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            fontSize: '13.5px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMsg.isError ? <AlertTriangle size={18} color="#FFFFFF" /> : <CheckCircle2 size={18} color="#10B981" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: confirmModal.dangerLevel === 'high' ? '#FEF2F2' : '#FFF7ED',
                  border: `1px solid ${confirmModal.dangerLevel === 'high' ? '#FECACA' : '#FFEDD5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldAlert size={22} color={confirmModal.dangerLevel === 'high' ? '#DC2626' : '#EA580C'} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: confirmModal.dangerLevel === 'high' ? '#DC2626' : '#EA580C'
                  }}
                >
                  {confirmModal.badgeText}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {confirmModal.title}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#475569', margin: '0 0 24px' }}>
              {confirmModal.description}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress !== null}
                onClick={() => handleExecuteAction(confirmModal.action, confirmModal.payload)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: confirmModal.dangerLevel === 'high' ? '#DC2626' : '#E8792F',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {actionInProgress && <RefreshCw size={14} className="animate-spin" />}
                {confirmModal.confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bulk Header */}
      <BulkHeader
        title="Incident Response & Post-Hack Recovery"
        subtitle="Enterprise incident response toolkit to contain compromised WordPress instances, evict intruders, and restore integrity."
        icon={LifeBuoy}
        activeBadge="Emergency Response"
      />

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 32px' }}>
        
        {/* Posture Status Strip */}
        <div
          style={{
            background: isLockdownActive ? '#FEF2F2' : '#FFFFFF',
            border: `1px solid ${isLockdownActive ? '#FECACA' : '#E2E8F0'}`,
            borderRadius: '14px',
            padding: '22px 28px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: isLockdownActive ? '#DC2626' : '#ECFDF5',
                border: `1px solid ${isLockdownActive ? '#B91C1C' : '#A7F3D0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isLockdownActive ? <Lock size={24} color="#FFFFFF" /> : <ShieldCheck size={26} color="#059669" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {isLockdownActive ? 'Website In Containment Lockdown' : 'Website In Normal Operation'}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: isLockdownActive ? '#FEE2E2' : '#ECFDF5',
                    color: isLockdownActive ? '#DC2626' : '#059669',
                    border: `1px solid ${isLockdownActive ? '#FECACA' : '#A7F3D0'}`
                  }}
                >
                  {isLockdownActive ? '503 Shield Active' : 'Normal Traffic Allowed'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                Target Site: <strong style={{ color: '#0F172A' }}>{activeTargetSite.domain || activeTargetSite.url || 'All Connected Sites'}</strong>
                {isAllTarget && ' (Fleet Operations)'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Active Sessions
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: activeSessionsCount > 3 ? '#DC2626' : '#0F172A' }}>
                {loadingStatus ? '...' : activeSessionsCount}
              </div>
            </div>
            <div style={{ width: '1px', height: '36px', background: '#E2E8F0' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Security Salts
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                {loadingStatus ? '...' : (saltsRegenTime.length > 19 ? saltsRegenTime.slice(0, 19) : saltsRegenTime)}
              </div>
            </div>
            <button
              type="button"
              onClick={loadStatus}
              disabled={loadingStatus}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '9px 14px',
                borderRadius: '8px',
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
            >
              <RefreshCw size={14} className={loadingStatus ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Emergency Response Action Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          {/* Card 1: Session Kickout */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={20} color="#DC2626" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Hacker Kickout</h4>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Global Session Invalidation</span>
                </div>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 20px' }}>
                Instantly disconnects and invalidates active authentication tokens across all user accounts. Intruders or rogue sessions are instantly ejected from WordPress.
              </p>
            </div>
            <button
              type="button"
              disabled={actionInProgress !== null}
              onClick={promptTerminateSessions}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
            >
              {actionInProgress === 'terminate_sessions' ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
              Invalidate All Active Sessions
            </button>
          </div>

          {/* Card 2: Security Salts Regenerator */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Key size={20} color="#EA580C" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Rotate Security Salts</h4>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>wp-config.php Cryptographic Keys</span>
                </div>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 20px' }}>
                Re-encrypts all authentication tokens with fresh official 64-character salts. An automatic backup snapshot of wp-config.php is created before writing.
              </p>
            </div>
            <button
              type="button"
              disabled={actionInProgress !== null}
              onClick={promptRegenerateSalts}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid #FED7AA',
                background: '#FFF7ED',
                color: '#EA580C',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFEDD5'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFF7ED'}
            >
              {actionInProgress === 'regen_salts' ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
              Regenerate Security Salts
            </button>
          </div>

          {/* Card 3: Mandate Password Reset */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#FFFBEB',
                    border: '1px solid #FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldAlert size={20} color="#D97706" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Force Password Reset</h4>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Credentials Invalidation</span>
                </div>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 14px' }}>
                Mandates that accounts must immediately choose a new password on their next login session, blocking attacker credential reuse.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setPasswordResetScope('admins')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: `1px solid ${passwordResetScope === 'admins' ? '#D97706' : '#E2E8F0'}`,
                    background: passwordResetScope === 'admins' ? '#FEF3C7' : '#F8FAFC',
                    color: passwordResetScope === 'admins' ? '#92400E' : '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Admins Only
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordResetScope('all')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: `1px solid ${passwordResetScope === 'all' ? '#D97706' : '#E2E8F0'}`,
                    background: passwordResetScope === 'all' ? '#FEF3C7' : '#F8FAFC',
                    color: passwordResetScope === 'all' ? '#92400E' : '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  All Users
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={actionInProgress !== null}
              onClick={promptForcePasswordReset}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid #FDE68A',
                background: '#FFFBEB',
                color: '#D97706',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
            >
              {actionInProgress === 'force_password_reset' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              Mandate Password Reset
            </button>
          </div>

          {/* Card 4: Emergency Maintenance Lockdown */}
          <div
            style={{
              background: isLockdownActive ? '#FEF2F2' : '#FFFFFF',
              border: `1px solid ${isLockdownActive ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: '14px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isLockdownActive ? '#FEE2E2' : '#ECFDF5',
                    border: `1px solid ${isLockdownActive ? '#FECACA' : '#A7F3D0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isLockdownActive ? <Lock size={20} color="#DC2626" /> : <Unlock size={20} color="#059669" />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Emergency Lockdown</h4>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>503 Incident Response Isolation</span>
                </div>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 20px' }}>
                {isLockdownActive
                  ? 'Lockdown is currently ACTIVE. Public traffic receives 503 maintenance mode. Only administrators can access the website.'
                  : 'Temporarily closes website to the public with HTTP 503 while allowing administrators to inspect and clean malware.'}
              </p>
            </div>
            <button
              type="button"
              disabled={actionInProgress !== null}
              onClick={() => promptToggleLockdown(!isLockdownActive)}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                border: `1px solid ${isLockdownActive ? '#A7F3D0' : '#FECACA'}`,
                background: isLockdownActive ? '#ECFDF5' : '#FEF2F2',
                color: isLockdownActive ? '#059669' : '#DC2626',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = isLockdownActive ? '#D1FAE5' : '#FEE2E2'}
              onMouseLeave={e => e.currentTarget.style.background = isLockdownActive ? '#ECFDF5' : '#FEF2F2'}
            >
              {actionInProgress === 'toggle_lockdown' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : isLockdownActive ? (
                <Unlock size={14} />
              ) : (
                <Lock size={14} />
              )}
              {isLockdownActive ? 'Deactivate Lockdown (Open Site)' : 'Activate Emergency Lockdown'}
            </button>
          </div>

        </div>

        {/* Administrator Security Audit Table */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div
            style={{
              padding: '18px 28px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Users size={18} color="#EA580C" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Administrator Security Audit &amp; Active Device Roster
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Audits privilege exposure, predictable usernames, and active sessions across all administrator accounts.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '4px 12px',
                borderRadius: '6px'
              }}
            >
              {totalAdminsCount} Monitored Admins
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 28px', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administrator</th>
                  <th style={{ padding: '12px 20px', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Rating</th>
                  <th style={{ padding: '12px 20px', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2FA Status</th>
                  <th style={{ padding: '12px 20px', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Sessions</th>
                  <th style={{ padding: '12px 20px', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Flags</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(statusData?.admins) && statusData.admins.length > 0 ? (
                  statusData.admins.map((adm, idx) => {
                    const isHighRisk = adm.risk_level === 'High'
                    const isMedRisk = adm.risk_level === 'Medium'
                    return (
                      <tr
                        key={adm.ID || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                      >
                        <td style={{ padding: '14px 28px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{adm.user_login}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{adm.user_email}</div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: isHighRisk ? '#FEF2F2' : isMedRisk ? '#FFFBEB' : '#ECFDF5',
                              color: isHighRisk ? '#DC2626' : isMedRisk ? '#D97706' : '#059669',
                              border: `1px solid ${isHighRisk ? '#FECACA' : isMedRisk ? '#FDE68A' : '#A7F3D0'}`
                            }}
                          >
                            {adm.risk_level || 'Low'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {adm.has_2fa ? (
                              <>
                                <CheckCircle2 size={16} color="#059669" />
                                <span style={{ color: '#059669', fontWeight: 700 }}>Enforced</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={16} color="#D97706" />
                                <span style={{ color: '#D97706', fontWeight: 600 }}>Disabled</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          <strong style={{ color: '#0F172A' }}>{adm.active_sessions || 0}</strong> active device(s)
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {Array.isArray(adm.warnings) && adm.warnings.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {adm.warnings.map((w, wIdx) => (
                                <span
                                  key={wIdx}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#B91C1C',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>✓ Hardened Baseline</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px 28px', textAlign: 'center', color: '#64748B' }}>
                      {loadingStatus ? 'Loading administrator security audit...' : 'No administrator accounts discovered.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breach Intelligence Quick Banner */}
        <div
          style={{
            marginTop: '20px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D9488'
              }}
            >
              <Key size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                Proactive Credential Protection: Have I Been Pwned (HIBP)
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Test any password against 14.5+ billion leaked credentials with zero-exposure k-Anonymity in Security Center.
              </div>
            </div>
          </div>

          <Link
            to="/user/security/breach-intelligence"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#0D9488',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(13,148,136,0.2)'
            }}
          >
            <span>Open Breach Intelligence</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  )
}
