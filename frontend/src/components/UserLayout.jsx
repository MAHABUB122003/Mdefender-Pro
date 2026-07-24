import { useState } from 'react'
import UserSidebar from './UserSidebar'
import UserHeader from './UserHeader'

export default function UserLayout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />
      <UserSidebar isOpen={sidebarOpen} />
      <div className="main-content">
        <UserHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={onLogout} />
        {children}
      </div>
    </>
  )
}
