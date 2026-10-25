import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import UserHeader from './UserHeader'

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
        window.requestIdleCallback(prefetchRoutes)
      } else {
        setTimeout(prefetchRoutes, 300)
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
        {children || <Outlet />}
      </div>
    </>
  )
}
