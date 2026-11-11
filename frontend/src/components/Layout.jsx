import { useState, useEffect, Suspense, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function AdminInnerContentFallback() {
  return (
    <div style={{
      padding: '48px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      color: '#2563eb'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid rgba(37, 99, 235, 0.15)',
          borderTopColor: '#2563eb',
          animation: 'spin 0.6s linear infinite'
        }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          Loading Enterprise Workspace...
        </span>
      </div>
    </div>
  )
}

export default function Layout({ children, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('mdefender_admin_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('mdefender_admin_sidebar_collapsed', String(next))
      } catch { }
      return next
    })
  }, [])

  // Keyboard shortcut: Press "[" to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '[' || (e.ctrlKey && e.key.toLowerCase() === 'b')) && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCollapse])

  return (
    <div className={`admin-app-root ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      <div
        className={`admin-sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        isOpen={mobileOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="admin-main-viewport">
        <Header
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          onToggleSidebar={() => setMobileOpen(prev => !prev)}
          onLogout={onLogout}
        />

        <main className="admin-content-canvas">
          <Suspense fallback={<AdminInnerContentFallback />}>
            {children || <Outlet />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
