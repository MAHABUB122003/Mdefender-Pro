import { useState, useEffect, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import UserHeader from './UserHeader'
import userStore from '../utils/userStore'
import { BackupRestoreProvider } from '../context/BackupRestoreContext'
import { MalwareScanProvider } from '../context/MalwareScanContext'

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

export default function UserLayout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Strict Onboarding Route Guard: Only un-onboarded accounts are redirected to onboarding
  useEffect(() => {
    const cachedProfile = userStore.get('profile')
    if (cachedProfile && cachedProfile.role !== 'super_admin' && !cachedProfile.is_admin) {
      if (!cachedProfile.onboarded) {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [location.pathname, navigate])

  // Auto-close sidebar on mobile/tablet whenever the route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

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
      } catch {}
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
          <Suspense fallback={<InnerContentFallback />}>
            <div key={location.pathname} className="dashboard-page-enter">
              {children || <Outlet />}
            </div>
          </Suspense>
        </div>
      </MalwareScanProvider>
    </BackupRestoreProvider>
  )
}
