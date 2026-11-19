import React, { useState, useEffect, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import UserHeader from './UserHeader'
import TrialPaywallModal from './TrialPaywallModal'
import userStore from '../utils/userStore'
import { BackupRestoreProvider } from '../context/BackupRestoreContext'
import { MalwareScanProvider } from '../context/MalwareScanContext'

class ContentErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    const msg = String(error?.message || error || '').toLowerCase()
    const isChunkError = (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('importing a module script failed') ||
      msg.includes('dynamically imported module')
    )
    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload()
      return { hasError: false, error: null }
    }
    return { hasError: true, error }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location?.pathname !== this.props.location?.pathname && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      const errText = this.state.error?.message || String(this.state.error || '')
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '20px'
          }}>
            ⚠️
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#10201E', marginBottom: '8px' }}>
            Section Temporarily Unavailable
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
            This view encountered an issue while loading. You can refresh this view or navigate to another page using the sidebar.
          </p>
          {errText && (
            <details style={{ marginBottom: '16px', textAlign: 'left', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', color: '#64748B', border: '1px solid #E2E8F0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Diagnostic Details</summary>
              <pre style={{ marginTop: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>{errText}</pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#0B2522',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Refresh View
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #CBD8CF',
                color: '#10201E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function InnerContentFallback() {
  return (
    <div style={{
      padding: '40px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '360px',
      color: '#E8792F'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid rgba(232, 121, 47, 0.15)',
        borderTopColor: '#E8792F',
        animation: 'spin 0.5s linear infinite'
      }} />
    </div>
  )
}

class SilentErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err) {
    console.warn('Silent boundary caught error:', err)
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

export default function UserLayout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Strict Onboarding & Expired Trial Route Guard:
  useEffect(() => {
    const cachedProfile = userStore.get('profile')
    if (cachedProfile && cachedProfile.role !== 'super_admin' && !cachedProfile.is_admin) {
      if (!cachedProfile.onboarded) {
        navigate('/onboarding', { replace: true })
        return
      }
    }
  }, [location.pathname, navigate])

  // Auto-close sidebar on mobile/tablet whenever the route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // Idle prefetch all user dashboard page chunks so sidebar navigation is 100% instant on first click
  useEffect(() => {
    const prefetchRoutes = () => {
      try {
        import('../pages/UserDashboard')
        import('../pages/UserLogs')
        import('../pages/UserWebsites')
        import('../pages/UserBulkManagement')
        import('../pages/bulk/BulkMonitoring')
        import('../pages/bulk/BulkUptime')
        import('../pages/bulk/BulkPerformance')
        import('../pages/bulk/BulkBrokenLinks')
        import('../pages/bulk/BulkScanner')
        import('../pages/bulk/BulkHardening')
        import('../pages/bulk/BulkSafeUpdates')
        import('../pages/bulk/BulkBackup')
        import('../pages/bulk/BulkPlugins')
        import('../pages/bulk/BulkThemes')
        import('../pages/bulk/BulkCore')
        import('../pages/bulk/BulkActivity')
        import('../pages/UserTeam')
        import('../pages/UserAlerts')
        import('../pages/UserTools')
        import('../pages/UserPricing')
        import('../pages/UserBlacklist')
        import('../pages/UserSettings')
      } catch { }
    }

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prefetchRoutes, { timeout: 1500 })
      } else {
        setTimeout(prefetchRoutes, 200)
      }
    }
  }, [])

  const isImpersonating = typeof localStorage !== 'undefined' && localStorage.getItem('mdefender_is_impersonating') === 'true'
  const impersonatedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_impersonated_user') : ''

  const handleExitImpersonation = () => {
    try {
      localStorage.removeItem('mdefender_is_impersonating')
      localStorage.removeItem('mdefender_impersonated_user')
      if (window.opener) {
        window.close()
      } else {
        window.location.href = '/admin/users'
      }
    } catch {
      window.location.href = '/admin/users'
    }
  }

  return (
    <BackupRestoreProvider>
      <MalwareScanProvider>
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          style={{
            display: sidebarOpen ? 'block' : 'none',
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            zIndex: 999
          }}
        />
        <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content">
          {isImpersonating && (
            <div style={{
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              padding: '9px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#92400e',
              fontWeight: '600',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
                <span>Super Admin Support Impersonation: Viewing workspace of <strong>{impersonatedUser || 'Customer'}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleExitImpersonation}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Exit Impersonation
              </button>
            </div>
          )}
          <UserHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} onLogout={onLogout} />
          <SilentErrorBoundary>
            <TrialPaywallModal />
          </SilentErrorBoundary>
          <ContentErrorBoundary location={location}>
            <Suspense fallback={<InnerContentFallback />}>
              {children || <Outlet />}
            </Suspense>
          </ContentErrorBoundary>
        </div>
      </MalwareScanProvider>
    </BackupRestoreProvider>
  )
}
