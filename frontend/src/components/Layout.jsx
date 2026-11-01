import { useState, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function AdminInnerContentFallback() {
  return (
    <div style={{
      padding: '40px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '360px',
      color: '#3b82f6'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid rgba(59, 130, 246, 0.15)',
        borderTopColor: '#3b82f6',
        animation: 'spin 0.5s linear infinite'
      }} />
    </div>
  )
}

export default function Layout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className="main-content">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={onLogout} />
        <Suspense fallback={<AdminInnerContentFallback />}>
          {children || <Outlet />}
        </Suspense>
      </div>
    </>
  )
}
