import { useState, useEffect, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import UserHeader from './UserHeader'

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
        import('../pages/UserRules')
        import('../pages/UserWebsites')
        import('../pages/UserBulkManagement')
        import('../pages/bulk/BulkMonitoring')
        import('../pages/bulk/BulkSiteHealth')
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
        import('../pages/UserDomains')
        import('../pages/UserTools')
        import('../pages/UserConnect')
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

  return (
    <>
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
        <UserHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} onLogout={onLogout} />
        <Suspense fallback={<InnerContentFallback />}>
          <div key={location.pathname} className="dashboard-page-enter">
            {children || <Outlet />}
          </div>
        </Suspense>
      </div>
    </>
  )
}
