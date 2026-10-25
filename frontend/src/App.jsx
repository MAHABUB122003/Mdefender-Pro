import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Instant critical path (Landing page stays eager for instant first-paint)
import Landing from './pages/Landing'

// Code-split lazy loaded pages for instant sub-100ms bundle delivery
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Logs = lazy(() => import('./pages/Logs'))
const Rules = lazy(() => import('./pages/Rules'))
const Clients = lazy(() => import('./pages/Clients'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminPricing = lazy(() => import('./pages/AdminPricing'))
const Blacklist = lazy(() => import('./pages/Blacklist'))
const Settings = lazy(() => import('./pages/Settings'))
const Connect = lazy(() => import('./pages/Connect'))
const BlockPage = lazy(() => import('./pages/BlockPage'))
const Layout = lazy(() => import('./components/Layout'))
const UserLayout = lazy(() => import('./components/UserLayout'))
const About = lazy(() => import('./pages/About'))
const Solutions = lazy(() => import('./pages/Solutions'))
const SolutionDetail = lazy(() => import('./pages/SolutionDetail'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Blog = lazy(() => import('./pages/Blog'))
const Register = lazy(() => import('./pages/Register'))
const UserLogin = lazy(() => import('./pages/UserLogin'))
const UserDashboard = lazy(() => import('./pages/UserDashboard'))
const UserWebsites = lazy(() => import('./pages/UserWebsites'))
const UserDomains = lazy(() => import('./pages/UserDomains'))
const UserLogs = lazy(() => import('./pages/UserLogs'))
const UserRules = lazy(() => import('./pages/UserRules'))
const UserSettings = lazy(() => import('./pages/UserSettings'))
const UserPricing = lazy(() => import('./pages/UserPricing'))
const UserConnect = lazy(() => import('./pages/UserConnect'))
const UserBlacklist = lazy(() => import('./pages/UserBlacklist'))
const UserBulkManagement = lazy(() => import('./pages/UserBulkManagement'))
const BulkMonitoring = lazy(() => import('./pages/bulk/BulkMonitoring'))
const BulkPlugins = lazy(() => import('./pages/bulk/BulkPlugins'))
const BulkThemes = lazy(() => import('./pages/bulk/BulkThemes'))
const BulkCore = lazy(() => import('./pages/bulk/BulkCore'))
const BulkBackup = lazy(() => import('./pages/bulk/BulkBackup'))
const BulkScanner = lazy(() => import('./pages/bulk/BulkScanner'))
const BulkHardening = lazy(() => import('./pages/bulk/BulkHardening'))
const BulkSafeUpdates = lazy(() => import('./pages/bulk/BulkSafeUpdates'))
const BulkSiteHealth = lazy(() => import('./pages/bulk/BulkSiteHealth'))
const BulkActivity = lazy(() => import('./pages/bulk/BulkActivity'))
const UserTeam = lazy(() => import('./pages/UserTeam'))
const UserAlerts = lazy(() => import('./pages/UserAlerts'))
const UserTools = lazy(() => import('./pages/UserTools'))
const DDoSDashboard = lazy(() => import('./pages/DDoSDashboard'))
const AttackLearning = lazy(() => import('./pages/AttackLearning'))
const Docs = lazy(() => import('./pages/Docs'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'))
const SessionsPage = lazy(() => import('./pages/auth/Sessions'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))

import api from './api/api'
import userStore from './utils/userStore'
import adminStore from './utils/adminStore'

function PageFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#070b14',
      color: '#38bdf8'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid rgba(56, 189, 248, 0.15)',
        borderTopColor: '#38bdf8',
        animation: 'spin 0.6s linear infinite'
      }} />
    </div>
  )
}

function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const cached = userStore.get('admin_profile') || userStore.get('profile')
      return (cached && cached.role === 'super_admin') ? cached : null
    } catch { return null }
  })
  const [userState, setUserState] = useState(() => {
    try {
      return userStore.get('profile') || null
    } catch { return null }
  })
  const [authChecking, setAuthChecking] = useState(() => {
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('mdefender_access')
      const hasProfile = !!userStore.get('profile') || !!userStore.get('admin_profile')
      return hasToken && !hasProfile
    } catch { return false }
  })

  useEffect(() => {
    const hasToken = typeof localStorage !== 'undefined' && (
      localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_refresh')
    )
    if (!hasToken) {
      setAuthChecking(false)
      return
    }

    api.getMe().then(data => {
      const user = data.user
      if (user.role === 'super_admin') {
        setAdminUser(user)
        userStore.set('admin_profile', user)
        adminStore.prefetchAdminData(api)
      }
      setUserState(user)
      userStore.set('profile', user)
      if (user.plan) localStorage.setItem('mdefender_user_plan', user.plan)
      if (user.name) localStorage.setItem('mdefender_user_name', user.name)
      userStore.prefetchUserData(api)
    }).catch(() => {
      setAdminUser(null)
      setUserState(null)
      userStore.remove('profile')
      userStore.remove('admin_profile')
    }).finally(() => {
      setAuthChecking(false)
    })
  }, [])

  const adminLogout = useCallback(async () => {
    try { await api.logout() } catch {}
    setAdminUser(null)
    adminStore.clear()
    window.location.href = '/admin/login'
  }, [])

  const userLogout = useCallback(async () => {
    try { await api.logout() } catch {}
    setUserState(null)
    userStore.clear()
    window.location.href = '/user/login'
  }, [])

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/solutions/:slug" element={<SolutionDetail />} />
        <Route path="/products" element={<ProductDetail />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/about" element={<Solutions />} />
        <Route path="/industries" element={<Navigate to="/solutions" replace />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<Blog />} />
        <Route path="/threat-intelligence" element={<Blog />} />
        <Route path="/threat-intelligence/:id" element={<Blog />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/blocked" element={<BlockPage />} />

        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        <Route path="/register" element={
          userState ? <Navigate to={window.location.search?.includes('plan=') ? `/user/pricing${window.location.search}` : "/user/dashboard"} replace /> : <Register />
        } />
        <Route path="/user/login" element={
          userState ? <Navigate to={window.location.search?.includes('plan=') ? `/user/pricing${window.location.search}` : "/user/dashboard"} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
        } />
        <Route path="/login" element={
          userState ? <Navigate to={window.location.search?.includes('plan=') ? `/user/pricing${window.location.search}` : "/user/dashboard"} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
        } />

        {/* Persistent User Layout with 0ms Instant Page Switching */}
        <Route path="/user" element={
          authChecking ? <PageFallback /> : (userState ? <UserLayout onLogout={userLogout} /> : <Navigate to="/user/login" replace />)
        }>
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="logs" element={<UserLogs />} />
          <Route path="rules" element={<UserRules />} />
          <Route path="domains" element={<UserDomains />} />
          <Route path="websites" element={<UserWebsites />} />
          <Route path="bulk-management" element={<Navigate to="/user/bulk/monitoring" replace />} />
          <Route path="bulk" element={<Navigate to="/user/bulk/monitoring" replace />} />
          <Route path="bulk/monitoring" element={<BulkMonitoring />} />
          <Route path="bulk/plugins" element={<BulkPlugins />} />
          <Route path="bulk/themes" element={<BulkThemes />} />
          <Route path="bulk/core" element={<BulkCore />} />
          <Route path="bulk/backup" element={<BulkBackup />} />
          <Route path="bulk/scanner" element={<BulkScanner />} />
          <Route path="bulk/hardening" element={<BulkHardening />} />
          <Route path="bulk/safe-updates" element={<BulkSafeUpdates />} />
          <Route path="bulk/site-health" element={<BulkSiteHealth />} />
          <Route path="bulk/activity" element={<BulkActivity />} />
          <Route path="bulk/tools" element={<UserTools isBulk={true} />} />
          <Route path="team" element={<UserTeam />} />
          <Route path="alerts" element={<UserAlerts />} />
          <Route path="tools" element={<Navigate to="/user/bulk/tools" replace />} />
          <Route path="connect" element={<UserConnect />} />
          <Route path="pricing" element={<UserPricing />} />
          <Route path="plans" element={<Navigate to="/user/pricing" replace />} />
          <Route path="blacklist" element={<UserBlacklist />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="sessions" element={<SessionsPage />} />
        </Route>

        {/* Persistent Super Admin Layout with 0ms Instant Page Switching */}
        <Route path="/admin/login" element={
          adminUser ? <Navigate to="/admin/dashboard" replace /> : <Login onLoginSuccess={(u) => setAdminUser(u)} />
        } />

        <Route path="/admin" element={
          authChecking ? <PageFallback /> : (adminUser ? <Layout onLogout={adminLogout} /> : <Navigate to="/admin/login" replace />)
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="clients" element={<Clients />} />
          <Route path="websites" element={<Clients />} />
          <Route path="logs" element={<Logs />} />
          <Route path="rules" element={<Rules />} />
          <Route path="blacklist" element={<Blacklist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="learning" element={<AttackLearning />} />
          <Route path="ddos" element={<DDoSDashboard />} />
        </Route>

        <Route path="/connect" element={
          adminUser ? <Layout onLogout={adminLogout}><Connect /></Layout> : <Navigate to="/admin/login" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
