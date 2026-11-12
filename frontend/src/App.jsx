import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { ScrollToTop } from './components/RouteTransitions'

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
const AdminSupport = lazy(() => import('./pages/AdminSupport'))
const AdminInspector = lazy(() => import('./pages/AdminInspector'))
const UserSupport = lazy(() => import('./pages/UserSupport'))
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
const UserLogs = lazy(() => import('./pages/UserLogs'))
const UserSettings = lazy(() => import('./pages/UserSettings'))
const UserPricing = lazy(() => import('./pages/UserPricing'))
const UserBlacklist = lazy(() => import('./pages/UserBlacklist'))
const UserBulkManagement = lazy(() => import('./pages/UserBulkManagement'))
const BulkMonitoring = lazy(() => import('./pages/bulk/BulkMonitoring'))
const BulkUptime = lazy(() => import('./pages/bulk/BulkUptime'))
const BulkPerformance = lazy(() => import('./pages/bulk/BulkPerformance'))
const BulkBrokenLinks = lazy(() => import('./pages/bulk/BulkBrokenLinks'))
const BulkPlugins = lazy(() => import('./pages/bulk/BulkPlugins'))
const BulkThemes = lazy(() => import('./pages/bulk/BulkThemes'))
const BulkCore = lazy(() => import('./pages/bulk/BulkCore'))
const BulkBackup = lazy(() => import('./pages/bulk/BulkBackup'))
const BulkScanner = lazy(() => import('./pages/bulk/BulkScanner'))
const BulkHardening = lazy(() => import('./pages/bulk/BulkHardening'))
const BulkLoginGateway = lazy(() => import('./pages/bulk/BulkLoginGateway'))
const BulkPostHack = lazy(() => import('./pages/bulk/BulkPostHack'))
const BulkBreachIntelligence = lazy(() => import('./pages/bulk/BulkBreachIntelligence'))
const BulkSafeUpdates = lazy(() => import('./pages/bulk/BulkSafeUpdates'))
const BulkDatabase = lazy(() => import('./pages/bulk/BulkDatabase'))
const BulkBlacklist = lazy(() => import('./pages/bulk/BulkBlacklist'))
const BulkSiteHealth = lazy(() => import('./pages/bulk/BulkSiteHealth'))
const BulkActivity = lazy(() => import('./pages/bulk/BulkActivity'))
const UserTeam = lazy(() => import('./pages/UserTeam'))
const UserAlerts = lazy(() => import('./pages/UserAlerts'))
const UserReports = lazy(() => import('./pages/UserReports'))
const UserTools = lazy(() => import('./pages/UserTools'))
const SecurityPortScanner = lazy(() => import('./pages/security/SecurityPortScanner'))
const DDoSDashboard = lazy(() => import('./pages/DDoSDashboard'))
const AttackLearning = lazy(() => import('./pages/AttackLearning'))
const Docs = lazy(() => import('./pages/Docs'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'))
const SessionsPage = lazy(() => import('./pages/auth/Sessions'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const UserOnboarding = lazy(() => import('./pages/auth/UserOnboarding'))

import api from './api/api'
import userStore from './utils/userStore'
import adminStore from './utils/adminStore'

function LegacyToolsRedirect() {
  const [searchParams] = useSearchParams()
  const ip = searchParams.get('ip')
  if (ip) {
    return <Navigate to={`/user/security/threat-intelligence?ip=${encodeURIComponent(ip)}`} replace />
  }
  return <Navigate to="/user/security/threat-intelligence" replace />
}

function PageFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7F6F1',
      color: '#10201E',
      gap: '14px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2.5px solid rgba(16, 32, 30, 0.08)',
        borderTopColor: '#E8792F',
        animation: 'spin 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }} />
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#60716B'
      }}>
        Loading
      </span>
    </div>
  )
}

function isUserOnboarded(u) {
  if (!u) return false;
  if (u.role === 'super_admin' || u.is_admin) return true;
  // Once onboarded, ALWAYS enter dashboard - even if all connected sites are later deleted
  return Boolean(u.onboarded);
}

function getPostLoginTarget(u) {
  if (!u) return '/user/login';
  if (u.role === 'super_admin' || u.is_admin) return '/admin';
  const search = typeof window !== 'undefined' ? window.location.search || '' : '';
  if (search.includes('plan=')) return `/user/pricing${search}`;
  return isUserOnboarded(u) ? '/user/dashboard' : '/onboarding';
}

function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!(
        localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_refresh')
      )
      if (!hasToken) return null
      const cached = userStore.get('admin_profile') || userStore.get('profile')
      return (cached && cached.role === 'super_admin') ? cached : null
    } catch { return null }
  })
  const [userState, setUserState] = useState(() => {
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!(
        localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_refresh')
      )
      if (!hasToken) return null
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
    const handleStorageUpdate = () => {
      try {
        const p = userStore.get('profile');
        if (p) setUserState(prev => ({ ...(prev || {}), ...p }));
      } catch {}
    };
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('mdefender_user_update', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('mdefender_user_update', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    // Intercept Support Impersonation URL Parameter
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search)
        const impToken = urlParams.get('impersonate_token') || urlParams.get('impersonation_token')
        const impUser = urlParams.get('user')
        if (impToken) {
          localStorage.setItem('mdefender_access', impToken)
          localStorage.setItem('mdefender_is_impersonating', 'true')
          if (impUser) localStorage.setItem('mdefender_impersonated_user', impUser)
          
          urlParams.delete('impersonate_token')
          urlParams.delete('impersonation_token')
          urlParams.delete('user')
          const cleanQuery = urlParams.toString()
          const newUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '')
          window.history.replaceState({}, '', newUrl)
        }
      }
    } catch (e) {
      console.warn('Impersonation token check error:', e)
    }

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
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('mdefender_') || k.startsWith('mdef_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    window.location.href = '/user/login'
  }, [])

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public & Auth Pages */}
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
          <Route path="/onboarding" element={
            authChecking ? <PageFallback /> : (
              !userState ? <Navigate to="/user/login" replace /> : (
                isUserOnboarded(userState) ? <Navigate to="/user/dashboard" replace /> : <UserOnboarding />
              )
            )
          } />
          <Route path="/user/onboarding" element={
            authChecking ? <PageFallback /> : (
              !userState ? <Navigate to="/user/login" replace /> : (
                isUserOnboarded(userState) ? <Navigate to="/user/dashboard" replace /> : <UserOnboarding />
              )
            )
          } />

          <Route path="/register" element={
            userState ? <Navigate to={getPostLoginTarget(userState)} replace /> : <Register />
          } />
          <Route path="/user/login" element={
            userState ? <Navigate to={getPostLoginTarget(userState)} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
          } />
          <Route path="/login" element={
            userState ? <Navigate to={getPostLoginTarget(userState)} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
          } />

          {/* Persistent User Layout with Strict Zero-Trust Onboarding Route Guard */}
        <Route path="/user" element={
          authChecking ? <PageFallback /> : (
            !userState ? <Navigate to="/user/login" replace /> : (
              !isUserOnboarded(userState) ? <Navigate to="/onboarding" replace /> : <UserLayout onLogout={userLogout} />
            )
          )
        }>
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="logs" element={<UserLogs />} />
          <Route path="rules" element={<Navigate to="/user/dashboard" replace />} />
          <Route path="domains" element={<Navigate to="/user/websites" replace />} />
          <Route path="websites" element={<UserWebsites />} />
          <Route path="bulk-management" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="bulk" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="bulk/monitoring" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="monitoring" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="monitoring/uptime" element={<BulkUptime />} />
          <Route path="monitoring/performance" element={<BulkPerformance />} />
          <Route path="monitoring/broken-links" element={<BulkBrokenLinks />} />
          <Route path="monitoring/blacklist" element={<BulkBlacklist />} />
          <Route path="security/bot-shield" element={<UserTools activeMode="bot_shield" isBulk={true} />} />
          <Route path="security/bot-defense" element={<UserTools activeMode="bot_shield" isBulk={true} />} />
          <Route path="security/login-gateway" element={<BulkLoginGateway />} />
          <Route path="security/rate-limits" element={<UserTools activeMode="rate_limits" isBulk={true} />} />
          <Route path="security/2fa" element={<UserTools activeMode="twofactor" isBulk={true} />} />
          <Route path="security/post-hack" element={<BulkPostHack />} />
          <Route path="security/incident-response" element={<BulkPostHack />} />
          <Route path="bulk/posthack" element={<BulkPostHack />} />
          <Route path="security/threat-intelligence" element={<UserTools activeMode="whois" isBulk={true} />} />
          <Route path="security/port-scanner" element={<SecurityPortScanner />} />
          <Route path="security/breach-intelligence" element={<BulkBreachIntelligence />} />
          <Route path="security/hibp" element={<BulkBreachIntelligence />} />
          <Route path="security/pwned" element={<BulkBreachIntelligence />} />
          <Route path="bulk/breach-intelligence" element={<BulkBreachIntelligence />} />
          <Route path="bulk/plugins" element={<BulkPlugins />} />
          <Route path="bulk/themes" element={<BulkThemes />} />
          <Route path="bulk/core" element={<BulkCore />} />
          <Route path="bulk/backup" element={<BulkBackup />} />
          <Route path="backup" element={<BulkBackup />} />
          <Route path="backups" element={<BulkBackup />} />
          <Route path="bulk/backups" element={<BulkBackup />} />
          <Route path="bulk/scanner" element={<BulkScanner />} />
          <Route path="bulk/hardening" element={<BulkHardening />} />
          <Route path="bulk/safe-updates" element={<Navigate to="/user/bulk/plugins" replace />} />
          <Route path="safe-updates" element={<Navigate to="/user/bulk/plugins" replace />} />
          <Route path="bulk/database" element={<BulkDatabase />} />
          <Route path="database" element={<Navigate to="/user/bulk/database" replace />} />
          <Route path="bulk/environment" element={<Navigate to="/user/bulk/hardening?tab=environment" replace />} />
          <Route path="environment" element={<Navigate to="/user/bulk/hardening?tab=environment" replace />} />
          <Route path="bulk/site-health" element={<BulkSiteHealth />} />
          <Route path="bulk/activity" element={<BulkActivity />} />
          <Route path="activity" element={<Navigate to="/user/bulk/activity" replace />} />
          <Route path="activity-logs" element={<Navigate to="/user/bulk/activity" replace />} />
          <Route path="audit-logs" element={<Navigate to="/user/bulk/activity" replace />} />
          <Route path="bulk/tools" element={<LegacyToolsRedirect />} />
          <Route path="team" element={<UserTeam />} />
          <Route path="alerts" element={<UserAlerts />} />
          <Route path="reports" element={<UserReports />} />
          <Route path="tools" element={<LegacyToolsRedirect />} />
          <Route path="connect" element={<Navigate to="/user/websites" replace />} />
          <Route path="pricing" element={<UserPricing />} />
          <Route path="plans" element={<Navigate to="/user/pricing" replace />} />
          <Route path="blacklist" element={<UserBlacklist activeMode="ip" />} />
          <Route path="access/ip-blocklist" element={<UserBlacklist activeMode="ip" />} />
          <Route path="access/ip-allowlist" element={<UserBlacklist activeMode="whitelist" />} />
          <Route path="access/country-blocking" element={<UserBlacklist activeMode="country" />} />
          <Route path="security/2fa" element={<Navigate to="/user/settings?tab=mfa" replace />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="sessions" element={<Navigate to="/user/settings?tab=sessions" replace />} />
          <Route path="support" element={<UserSupport />} />
          <Route path="helpdesk" element={<Navigate to="/user/support" replace />} />
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
          <Route path="support" element={<AdminSupport />} />
          <Route path="support/inquiries" element={<AdminSupport />} />
          <Route path="support/inspector" element={<AdminInspector />} />
        </Route>

        <Route path="/connect" element={
          adminUser ? <Layout onLogout={adminLogout}><Connect /></Layout> : <Navigate to="/admin/login" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </>
  )
}

export default App
